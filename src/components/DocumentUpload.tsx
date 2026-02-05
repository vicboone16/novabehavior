import { useState, useCallback } from 'react';
import { 
  Upload, FileText, FileCheck, Trash2, Check, X, Eye, Loader2, 
  AlertCircle, Plus, ChevronDown, ChevronUp, Download 
} from 'lucide-react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  DocumentType, 
  DOCUMENT_TYPE_LABELS, 
  ExtractedDocumentData,
  ExtractedBackgroundInfo,
  StudentDocument,
  StudentBackgroundInfo 
} from '@/types/behavior';
import { BackgroundImportPreview } from './BackgroundImportPreview';

interface DocumentUploadProps {
  studentId: string;
  documents: StudentDocument[];
  existingBackgroundInfo?: StudentBackgroundInfo;
  onUploadComplete: (doc: Omit<StudentDocument, 'id'>) => void;
  onDeleteDocument: (id: string) => void;
  onAddExtractedBehavior?: (name: string, definition: string) => void;
  onAddExtractedAntecedent?: (value: string) => void;
  onAddExtractedConsequence?: (value: string) => void;
  onImportBackgroundInfo?: (backgroundInfo: Partial<StudentBackgroundInfo>) => void;
}

export function DocumentUpload({
  studentId,
  documents,
  existingBackgroundInfo,
  onUploadComplete,
  onDeleteDocument,
  onAddExtractedBehavior,
  onAddExtractedAntecedent,
  onAddExtractedConsequence,
  onImportBackgroundInfo,
}: DocumentUploadProps) {
  const { user } = useAuth();
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedType, setSelectedType] = useState<DocumentType>('other');
  const [customType, setCustomType] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedDocumentData | null>(null);
  const [showExtractedData, setShowExtractedData] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [showBackgroundImportPreview, setShowBackgroundImportPreview] = useState(false);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);

  // Download document handler
  const handleDownload = async (doc: StudentDocument) => {
    if (!doc.filePath) {
      toast.error('No file path available for download');
      return;
    }

    setIsDownloading(doc.id);
    try {
      // Try to download from student-documents bucket first
      const { data, error } = await supabase.storage
        .from('student-documents')
        .download(doc.filePath);

      if (error) {
        // Fall back to trying the path without the documents prefix
        const simplePath = doc.filePath.replace('documents/', '');
        const { data: data2, error: error2 } = await supabase.storage
          .from('student-documents')
          .download(simplePath);

        if (error2) {
          console.error('Download error:', error, error2);
          toast.error('Failed to download file');
          return;
        }
        
        // Create download link
        const url = URL.createObjectURL(data2);
        const link = document.createElement('a');
        link.href = url;
        link.download = doc.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success('File downloaded');
        return;
      }

      // Create download link
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('File downloaded');
    } catch (err) {
      console.error('Download failed:', err);
      toast.error('Failed to download file');
    } finally {
      setIsDownloading(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  // Helper to sync document to student_files table for profile view
  const syncToStudentFiles = async (filePath: string, fileName: string, fileType: string, fileSize: number, description: string) => {
    if (!user) return;
    
    try {
      // Check if already exists to avoid duplicates
      const { data: existing } = await supabase
        .from('student_files')
        .select('id')
        .eq('student_id', studentId)
        .eq('file_path', filePath)
        .maybeSingle();

      if (!existing) {
        await supabase.from('student_files').insert({
          user_id: user.id,
          student_id: studentId,
          file_name: fileName,
          file_path: filePath,
          file_type: fileType,
          file_size: fileSize,
          description: description,
        });
      }
    } catch (err) {
      console.error('Failed to sync to student_files:', err);
      // Don't fail the upload if sync fails
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    
    try {
      // Create document record
      const docData: Omit<StudentDocument, 'id'> = {
        studentId,
        type: selectedType,
        customType: selectedType === 'other' ? customType : undefined,
        fileName: selectedFile.name,
        filePath: `documents/${studentId}/${Date.now()}-${selectedFile.name}`,
        uploadedAt: new Date(),
        isProcessed: false,
      };

      // Document description for student_files sync
      const docDescription = selectedType === 'other' 
        ? customType || 'Document' 
        : DOCUMENT_TYPE_LABELS[selectedType];

      // Determine if we should attempt AI extraction
      const shouldExtract = selectedType !== 'other';
      
      if (shouldExtract) {
        setIsExtracting(true);
        
        try {
          // Check if it's a PDF file - needs special handling
          const isPdf = selectedFile.type === 'application/pdf' || selectedFile.name.toLowerCase().endsWith('.pdf');
          
          let documentText = '';
          
          if (isPdf) {
            // For PDFs, upload to storage and use edge function with file processing
            const filePath = `${studentId}/${Date.now()}-${selectedFile.name}`;
            
            // Upload file to storage
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('student-documents')
              .upload(filePath, selectedFile, {
                contentType: selectedFile.type,
                upsert: false,
              });

            if (uploadError) {
              console.error('Storage upload error:', uploadError);
              // Fall back to reading as text (won't work for PDFs but better than nothing)
              documentText = await selectedFile.text();
            } else {
              // Sync to student_files for profile view
              await syncToStudentFiles(filePath, selectedFile.name, selectedFile.type, selectedFile.size, docDescription);
              
              // Create a signed URL for secure access (expires in 1 hour)
              const { data: signedUrlData, error: signedUrlError } = await supabase.storage
                .from('student-documents')
                .createSignedUrl(filePath, 3600); // 1 hour expiry

              if (signedUrlError) {
                console.error('Failed to create signed URL:', signedUrlError);
                toast.error('Could not access uploaded file securely.');
                setIsExtracting(false);
                setIsUploading(false);
                return;
              }

              // Call edge function with signed URL for PDF processing
              const { data, error } = await supabase.functions.invoke('extract-document', {
                body: {
                  documentType: selectedType,
                  fileUrl: signedUrlData.signedUrl,
                  fileName: selectedFile.name,
                }
              });

              if (error) {
                console.error('Extraction error:', error);
                toast.error('Could not extract data from PDF. Please try a text-based document.');
              } else if (data?.extractedData) {
                docData.extractedData = data.extractedData;
                docData.isProcessed = true;
                docData.filePath = filePath;
                setExtractedData(data.extractedData);
                setShowExtractedData(true);
                toast.success('Document analyzed successfully');
                
                // Check for low-confidence student name
                if (data.extractedData.student?.confidence && data.extractedData.student.confidence < 0.9) {
                  toast.warning(`Student name confidence is low (${Math.round(data.extractedData.student.confidence * 100)}%). Please verify: "${data.extractedData.student.name || 'Unknown'}"`);
                }
              } else if (data?.error) {
                toast.error(data.error);
              }
              
              setIsExtracting(false);
              onUploadComplete(docData);
              setIsUploading(false);
              
              if (!showExtractedData) {
                resetForm();
              }
              return;
            }
          } else {
            // For text-based files, read as text
            documentText = await selectedFile.text();
          }
          
          // Process text-based documents
          if (documentText.length > 0) {
            const { data, error } = await supabase.functions.invoke('extract-document', {
              body: {
                documentType: selectedType,
                documentText: documentText.substring(0, 100000), // Limit text length
              }
            });

            if (error) {
              console.error('Extraction error:', error);
              toast.error('Could not extract data from document');
            } else if (data?.extractedData) {
              docData.extractedData = data.extractedData;
              docData.isProcessed = true;
              setExtractedData(data.extractedData);
              setShowExtractedData(true);
              toast.success('Document analyzed successfully');
              
              // Check for low-confidence student name  
              if (data.extractedData.student?.confidence && data.extractedData.student.confidence < 0.9) {
                toast.warning(`Student name confidence is low (${Math.round(data.extractedData.student.confidence * 100)}%). Please verify: "${data.extractedData.student.name || 'Unknown'}"`);
              }
            } else if (data?.error) {
              toast.error(data.error);
            }
          }
        } catch (err) {
          console.error('Extraction failed:', err);
          toast.error('Document analysis failed');
        }
        
        setIsExtracting(false);
      } else {
        // For non-extractable documents, still upload to storage
        const filePath = `${studentId}/${Date.now()}-${selectedFile.name}`;
        
        const { error: uploadError } = await supabase.storage
          .from('student-documents')
          .upload(filePath, selectedFile, {
            contentType: selectedFile.type,
            upsert: false,
          });

        if (!uploadError) {
          docData.filePath = filePath;
          // Sync to student_files
          await syncToStudentFiles(filePath, selectedFile.name, selectedFile.type, selectedFile.size, docDescription);
        }
      }

      onUploadComplete(docData);
      setIsUploading(false);
      
      if (!showExtractedData) {
        resetForm();
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload failed');
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setSelectedType('other');
    setCustomType('');
    setExtractedData(null);
    setShowExtractedData(false);
    setShowUploadDialog(false);
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleAddItem = (type: string, item: any) => {
    switch (type) {
      case 'behavior':
        if (onAddExtractedBehavior) {
          onAddExtractedBehavior(item.name, item.definition);
          toast.success(`Added behavior: ${item.name}`);
        }
        break;
      case 'antecedent':
        if (onAddExtractedAntecedent) {
          onAddExtractedAntecedent(item.value);
          toast.success('Added antecedent');
        }
        break;
      case 'consequence':
        if (onAddExtractedConsequence) {
          onAddExtractedConsequence(item.value);
          toast.success('Added consequence');
        }
        break;
    }
  };

  const renderExtractedSection = (
    title: string,
    items: any[] | undefined,
    type: string,
    renderItem: (item: any) => string
  ) => {
    if (!items || items.length === 0) return null;

    return (
      <Collapsible
        open={expandedSections[type]}
        onOpenChange={() => toggleSection(type)}
      >
        <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-secondary/50 rounded">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{title}</span>
            <Badge variant="secondary" className="text-xs">{items.length}</Badge>
          </div>
          {expandedSections[type] ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 pl-2 pt-2">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="flex items-start justify-between p-2 bg-secondary/30 rounded text-sm"
            >
              <span className="flex-1 mr-2">{renderItem(item)}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7"
                onClick={() => handleAddItem(type, item)}
              >
                <Plus className="w-3 h-3 mr-1" />
                Add
              </Button>
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Documents
            </CardTitle>
            <Button size="sm" onClick={() => setShowUploadDialog(true)}>
              <Upload className="w-4 h-4 mr-1" />
              Upload
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No documents uploaded. Upload FBAs, BIPs, IEPs, or other reports.
            </p>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <FileCheck className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">{doc.fileName}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {doc.type === 'other' ? doc.customType : DOCUMENT_TYPE_LABELS[doc.type]}
                        </Badge>
                        {doc.isProcessed && (
                          <Badge variant="secondary" className="text-xs">
                            <Check className="w-2 h-2 mr-1" />
                            Analyzed
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {/* Download button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDownload(doc)}
                      disabled={isDownloading === doc.id}
                      title="Download file"
                    >
                      {isDownloading === doc.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                    </Button>
                    {doc.extractedData && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setExtractedData(doc.extractedData!);
                          setShowExtractedData(true);
                        }}
                        title="View extracted data"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => onDeleteDocument(doc.id)}
                      title="Delete document"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Document Type <span className="text-destructive">*</span></Label>
              <Select value={selectedType} onValueChange={(v) => setSelectedType(v as DocumentType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select document type..." />
                </SelectTrigger>
                <SelectContent>
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    Primary Assessment Documents
                  </div>
                  <SelectItem value="fba">{DOCUMENT_TYPE_LABELS['fba']}</SelectItem>
                  <SelectItem value="bip">{DOCUMENT_TYPE_LABELS['bip']}</SelectItem>
                  <SelectItem value="iep">{DOCUMENT_TYPE_LABELS['iep']}</SelectItem>
                  
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground border-t mt-1 pt-2">
                    Evaluation Reports
                  </div>
                  <SelectItem value="psycho-ed">{DOCUMENT_TYPE_LABELS['psycho-ed']}</SelectItem>
                  <SelectItem value="medical">{DOCUMENT_TYPE_LABELS['medical']}</SelectItem>
                  
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground border-t mt-1 pt-2">
                    Interviews & Observations
                  </div>
                  <SelectItem value="teacher-interview">{DOCUMENT_TYPE_LABELS['teacher-interview']}</SelectItem>
                  <SelectItem value="parent-interview">{DOCUMENT_TYPE_LABELS['parent-interview']}</SelectItem>
                  <SelectItem value="observation-notes">{DOCUMENT_TYPE_LABELS['observation-notes']}</SelectItem>
                  
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground border-t mt-1 pt-2">
                    Other Documents
                  </div>
                  <SelectItem value="intake">{DOCUMENT_TYPE_LABELS['intake']}</SelectItem>
                  <SelectItem value="progress-report">{DOCUMENT_TYPE_LABELS['progress-report']}</SelectItem>
                  <SelectItem value="other">{DOCUMENT_TYPE_LABELS['other']}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {selectedType === 'fba' || selectedType === 'bip' || selectedType === 'iep' 
                  ? '✨ AI will automatically extract key information from this document type.'
                  : selectedType === 'other'
                  ? 'Specify the document type below for better organization.'
                  : 'Document will be stored for reference. Select FBA, BIP, or IEP for automatic extraction.'}
              </p>
            </div>

            {selectedType === 'other' && (
              <div className="space-y-2">
                <Label>Custom Document Type <span className="text-destructive">*</span></Label>
                <Input
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value)}
                  placeholder="e.g., Psychiatric Evaluation, Speech Assessment, OT Report..."
                />
                <p className="text-xs text-muted-foreground">
                  Examples: Psychiatric Evaluation, Speech/Language Assessment, OT/PT Report, 
                  Previous School Records, Crisis Plan, Safety Plan, etc.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Select File</Label>
              <Input
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleFileSelect}
              />
              {selectedFile && (
                <p className="text-sm text-muted-foreground">
                  Selected: {selectedFile.name}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpload} 
              disabled={!selectedFile || isUploading || isExtracting}
            >
              {isUploading || isExtracting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isExtracting ? 'Analyzing...' : 'Uploading...'}
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extracted Data Review Dialog */}
      <Dialog open={showExtractedData} onOpenChange={setShowExtractedData}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Extracted Information</DialogTitle>
          </DialogHeader>

          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-3">
              {extractedData?.targetBehaviors && (
                renderExtractedSection(
                  'Target Behaviors',
                  extractedData.targetBehaviors,
                  'behavior',
                  (item) => `${item.name}: ${item.definition}`
                )
              )}

              {extractedData?.antecedents && (
                renderExtractedSection(
                  'Antecedents',
                  extractedData.antecedents,
                  'antecedent',
                  (item) => item.value
                )
              )}

              {extractedData?.consequences && (
                renderExtractedSection(
                  'Consequences',
                  extractedData.consequences,
                  'consequence',
                  (item) => item.value
                )
              )}

              {extractedData?.hypothesizedFunctions && (
                renderExtractedSection(
                  'Hypothesized Functions',
                  extractedData.hypothesizedFunctions,
                  'function',
                  (item) => item.value
                )
              )}

              {extractedData?.settingEvents && (
                renderExtractedSection(
                  'Setting Events',
                  extractedData.settingEvents,
                  'setting',
                  (item) => item.value
                )
              )}

              {extractedData?.replacementBehaviors && (
                renderExtractedSection(
                  'Replacement Behaviors',
                  extractedData.replacementBehaviors,
                  'replacement',
                  (item) => `${item.name}${item.definition ? `: ${item.definition}` : ''}`
                )
              )}

              {extractedData?.preventativeStrategies && (
                renderExtractedSection(
                  'Preventative Strategies',
                  extractedData.preventativeStrategies,
                  'preventative',
                  (item) => item.value
                )
              )}

              {extractedData?.teachingStrategies && (
                renderExtractedSection(
                  'Teaching Strategies',
                  extractedData.teachingStrategies,
                  'teaching',
                  (item) => item.value
                )
              )}

              {extractedData?.goals && (
                renderExtractedSection(
                  'Goals',
                  extractedData.goals,
                  'goal',
                  (item) => `[${item.type}] ${item.text}`
                )
              )}

              {extractedData?.accommodations && (
                renderExtractedSection(
                  'Accommodations',
                  extractedData.accommodations,
                  'accommodation',
                  (item) => item.value
                )
              )}

              {extractedData?.serviceMinutes && (
                renderExtractedSection(
                  'Service Minutes',
                  extractedData.serviceMinutes,
                  'service',
                  (item) => `${item.service}: ${item.minutes} minutes`
                )
              )}

              {/* Background Information Section */}
              {extractedData?.backgroundInfo && Object.values(extractedData.backgroundInfo).some(v => v) && (
                <Collapsible
                  open={expandedSections['backgroundInfo']}
                  onOpenChange={() => toggleSection('backgroundInfo')}
                >
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-secondary/50 rounded">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">Background Information</span>
                      <Badge variant="secondary" className="text-xs bg-primary/20 text-primary">
                        Auto-extracted
                      </Badge>
                    </div>
                    {expandedSections['backgroundInfo'] ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-3 pl-2 pt-2">
                    <div className="space-y-2 text-sm">
                      {extractedData.backgroundInfo.referralReason && (
                        <div className="p-2 bg-secondary/30 rounded">
                          <span className="font-medium">Referral Reason:</span> {extractedData.backgroundInfo.referralReason}
                        </div>
                      )}
                      {extractedData.backgroundInfo.referralSource && (
                        <div className="p-2 bg-secondary/30 rounded">
                          <span className="font-medium">Referral Source:</span> {extractedData.backgroundInfo.referralSource}
                        </div>
                      )}
                      {extractedData.backgroundInfo.presentingConcerns && (
                        <div className="p-2 bg-secondary/30 rounded">
                          <span className="font-medium">Presenting Concerns:</span> {extractedData.backgroundInfo.presentingConcerns}
                        </div>
                      )}
                      {extractedData.backgroundInfo.educationalHistory && (
                        <div className="p-2 bg-secondary/30 rounded">
                          <span className="font-medium">Educational History:</span> {extractedData.backgroundInfo.educationalHistory}
                        </div>
                      )}
                      {extractedData.backgroundInfo.diagnoses && (
                        <div className="p-2 bg-secondary/30 rounded">
                          <span className="font-medium">Diagnoses:</span> {extractedData.backgroundInfo.diagnoses}
                        </div>
                      )}
                      {extractedData.backgroundInfo.medicalInfo && (
                        <div className="p-2 bg-secondary/30 rounded">
                          <span className="font-medium">Medical Info:</span> {extractedData.backgroundInfo.medicalInfo}
                        </div>
                      )}
                      {extractedData.backgroundInfo.previousBIPs && (
                        <div className="p-2 bg-secondary/30 rounded">
                          <span className="font-medium">Previous BIPs:</span> {extractedData.backgroundInfo.previousBIPs}
                        </div>
                      )}
                      {extractedData.backgroundInfo.strategiesTried && (
                        <div className="p-2 bg-secondary/30 rounded">
                          <span className="font-medium">Strategies Tried:</span> {extractedData.backgroundInfo.strategiesTried}
                        </div>
                      )}
                      {extractedData.backgroundInfo.whatWorked && (
                        <div className="p-2 bg-secondary/30 rounded">
                          <span className="font-medium">What Worked:</span> {extractedData.backgroundInfo.whatWorked}
                        </div>
                      )}
                      {extractedData.backgroundInfo.whatDidntWork && (
                        <div className="p-2 bg-secondary/30 rounded">
                          <span className="font-medium">What Didn't Work:</span> {extractedData.backgroundInfo.whatDidntWork}
                        </div>
                      )}
                      {extractedData.backgroundInfo.homeEnvironment && (
                        <div className="p-2 bg-secondary/30 rounded">
                          <span className="font-medium">Home Environment:</span> {extractedData.backgroundInfo.homeEnvironment}
                        </div>
                      )}
                      {extractedData.backgroundInfo.familyStructure && (
                        <div className="p-2 bg-secondary/30 rounded">
                          <span className="font-medium">Family Structure:</span> {extractedData.backgroundInfo.familyStructure}
                        </div>
                      )}
                      {extractedData.backgroundInfo.culturalConsiderations && (
                        <div className="p-2 bg-secondary/30 rounded">
                          <span className="font-medium">Cultural Considerations:</span> {extractedData.backgroundInfo.culturalConsiderations}
                        </div>
                      )}
                      {extractedData.backgroundInfo.behaviorsOfConcernSummary && (
                        <div className="p-2 bg-secondary/30 rounded">
                          <span className="font-medium">Behaviors of Concern:</span> {extractedData.backgroundInfo.behaviorsOfConcernSummary}
                        </div>
                      )}
                    </div>
                    
                    {onImportBackgroundInfo && (
                      <Button
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => setShowBackgroundImportPreview(true)}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Review & Import to Student Profile
                      </Button>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button onClick={() => setShowExtractedData(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Background Import Preview Dialog */}
      {extractedData?.backgroundInfo && onImportBackgroundInfo && (
        <BackgroundImportPreview
          open={showBackgroundImportPreview}
          onOpenChange={setShowBackgroundImportPreview}
          extractedData={extractedData.backgroundInfo}
          existingData={existingBackgroundInfo}
          onImport={onImportBackgroundInfo}
        />
      )}
    </>
  );
}
