import { useState, useCallback } from 'react';
import { 
  Upload, FileText, FileCheck, Trash2, Check, X, Eye, Loader2, 
  AlertCircle, Plus, ChevronDown, ChevronUp 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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
  StudentDocument 
} from '@/types/behavior';

interface DocumentUploadProps {
  studentId: string;
  documents: StudentDocument[];
  onUploadComplete: (doc: Omit<StudentDocument, 'id'>) => void;
  onDeleteDocument: (id: string) => void;
  onAddExtractedBehavior?: (name: string, definition: string) => void;
  onAddExtractedAntecedent?: (value: string) => void;
  onAddExtractedConsequence?: (value: string) => void;
}

export function DocumentUpload({
  studentId,
  documents,
  onUploadComplete,
  onDeleteDocument,
  onAddExtractedBehavior,
  onAddExtractedAntecedent,
  onAddExtractedConsequence,
}: DocumentUploadProps) {
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedType, setSelectedType] = useState<DocumentType>('other');
  const [customType, setCustomType] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedDocumentData | null>(null);
  const [showExtractedData, setShowExtractedData] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    
    try {
      // For now, just simulate file processing
      // In production, you'd upload to storage and extract text from PDFs
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        const fileContent = event.target?.result as string;
        
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

        // If it's a known type, attempt AI extraction
        if (selectedType !== 'other' && fileContent.length > 0) {
          setIsExtracting(true);
          
          try {
            const { data, error } = await supabase.functions.invoke('extract-document', {
              body: {
                documentType: selectedType,
                documentText: fileContent.substring(0, 50000), // Limit text length
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
            }
          } catch (err) {
            console.error('Extraction failed:', err);
            toast.error('Document analysis failed');
          }
          
          setIsExtracting(false);
        }

        onUploadComplete(docData);
        setIsUploading(false);
        
        if (!showExtractedData) {
          resetForm();
        }
      };

      reader.onerror = () => {
        toast.error('Failed to read file');
        setIsUploading(false);
      };

      // Read as text for now (would need PDF parsing library for real PDFs)
      reader.readAsText(selectedFile);
      
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
                    {doc.extractedData && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setExtractedData(doc.extractedData!);
                          setShowExtractedData(true);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => onDeleteDocument(doc.id)}
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
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button onClick={() => setShowExtractedData(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
