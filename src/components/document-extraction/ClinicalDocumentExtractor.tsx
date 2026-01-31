import { useState, useCallback } from 'react';
import { Upload, FileText, AlertTriangle, CheckCircle2, XCircle, Loader2, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useClinicalExtraction, useExtractionReview } from '@/hooks/useClinicalExtraction';
import { getConfidenceLevel, getConfidenceBadgeColor } from '@/lib/confidenceCalculator';
import type { DocumentExtractionResult, ProposedAction, DocumentType, FieldConfidenceEntry } from '@/types/documentExtraction';

// ============ Helper functions for client field handling ============

type ExtractedField = {
  value: unknown;
  confidence: number;
  source: { page: number; snippet: string };
  evidence_type: string;
};

function getClientFieldConfidence(field: unknown): number {
  if (typeof field === 'object' && field !== null && 'confidence' in field) {
    return (field as ExtractedField).confidence;
  }
  return 0.5;
}

function getClientFieldValue(field: unknown): string {
  if (typeof field === 'string') return field;
  if (typeof field === 'object' && field !== null && 'value' in field) {
    return String((field as ExtractedField).value);
  }
  return '';
}

function normalizeClientField(field: unknown): ExtractedField {
  if (typeof field === 'string') {
    return {
      value: field,
      confidence: 0.5,
      source: { page: 1, snippet: '' },
      evidence_type: 'inferred',
    };
  }
  if (typeof field === 'object' && field !== null && 'value' in field) {
    const f = field as Partial<ExtractedField>;
    return {
      value: f.value || '',
      confidence: f.confidence || 0.5,
      source: f.source || { page: 1, snippet: '' },
      evidence_type: f.evidence_type || 'inferred',
    };
  }
  return {
    value: '',
    confidence: 0,
    source: { page: 1, snippet: '' },
    evidence_type: 'weak',
  };
}

interface ClinicalDocumentExtractorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId?: string;
  studentName?: string;
  onExtractionComplete?: (result: DocumentExtractionResult) => void;
}

export function ClinicalDocumentExtractor({
  open,
  onOpenChange,
  studentId,
  studentName,
  onExtractionComplete,
}: ClinicalDocumentExtractorProps) {
  const [file, setFile] = useState<File | null>(null);
  const [documentText, setDocumentText] = useState('');
  const [documentTypeHint, setDocumentTypeHint] = useState<DocumentType | ''>('');
  const [step, setStep] = useState<'upload' | 'review' | 'confirm'>('upload');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['client', 'actions']));

  const { isExtracting, extractionResult, error, extractDocument, matchToStudent, clearResult } = useClinicalExtraction();
  const { decisions, approveAction, rejectAction, applyApprovedChanges, isApplying, resetReview } = useExtractionReview();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const maxSize = 20 * 1024 * 1024; // 20MB
    if (selectedFile.size > maxSize) {
      toast.error('File too large. Maximum size is 20MB.');
      return;
    }

    setFile(selectedFile);
  };

  const performExtraction = async () => {
    if (!file && !documentText.trim()) {
      toast.error('Please upload a file or paste document text');
      return;
    }

    let fileUrl: string | undefined;

    // Upload file to storage if provided
    if (file) {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Not authenticated');
        return;
      }

      const fileExt = file.name.split('.').pop();
      const filePath = `extraction-temp/${session.user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('student-documents')
        .upload(filePath, file);

      if (uploadError) {
        toast.error('Failed to upload file');
        return;
      }

      // Get signed URL
      const { data: urlData } = await supabase.storage
        .from('student-documents')
        .createSignedUrl(filePath, 3600);

      fileUrl = urlData?.signedUrl;
    }

    const result = await extractDocument({
      file_url: fileUrl,
      document_text: documentText || undefined,
      document_type_hint: documentTypeHint || undefined,
      student_id: studentId,
    });

    if (result.success && result.result) {
      setStep('review');
    }
  };

  const handleApplyChanges = async () => {
    if (!extractionResult || !studentId) return;

    const result = await applyApprovedChanges(extractionResult, studentId);
    
    if (result.success) {
      toast.success(`Applied ${result.applied} changes successfully`);
      onExtractionComplete?.(extractionResult);
      handleClose();
    } else {
      toast.error(`Applied ${result.applied} changes with ${result.errors.length} errors`);
    }
  };

  const handleClose = () => {
    setFile(null);
    setDocumentText('');
    setDocumentTypeHint('');
    setStep('upload');
    clearResult();
    resetReview();
    onOpenChange(false);
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Clinical Document Extraction
          </DialogTitle>
          <DialogDescription>
            Upload IEP, FBA, BIP, or assessment documents for AI-powered extraction with confidence scoring.
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-6">
            {/* Document Type Selection */}
            <div className="space-y-2">
              <Label>Document Type (optional)</Label>
              <Select value={documentTypeHint} onValueChange={(v) => setDocumentTypeHint(v as DocumentType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Auto-detect document type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IEP">IEP (Individualized Education Program)</SelectItem>
                  <SelectItem value="FBA">FBA (Functional Behavior Assessment)</SelectItem>
                  <SelectItem value="BIP">BIP (Behavior Intervention Plan)</SelectItem>
                  <SelectItem value="ASSESSMENT_REPORT">Assessment Report</SelectItem>
                  <SelectItem value="OTHER">Other Document</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label>Upload Document</Label>
              <div 
                className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => document.getElementById('clinical-file-upload')?.click()}
              >
                <input
                  id="clinical-file-upload"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.docx,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                {file ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileText className="w-4 h-4" />
                    <span className="font-medium">{file.name}</span>
                    <Badge variant="secondary">{(file.size / 1024).toFixed(0)} KB</Badge>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PDF, PNG, JPG, DOCX, or TXT (max 20MB)
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or paste text</span>
              </div>
            </div>

            {/* Manual Text Entry */}
            <div className="space-y-2">
              <Label>Paste Document Text</Label>
              <Textarea
                placeholder="Paste the document text here..."
                value={documentText}
                onChange={(e) => setDocumentText(e.target.value)}
                rows={6}
              />
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                {error}
              </div>
            )}

            <Button 
              onClick={performExtraction} 
              disabled={isExtracting || (!file && !documentText.trim())}
              className="w-full"
            >
              {isExtracting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Extracting...
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 mr-2" />
                  Extract Document
                </>
              )}
            </Button>
          </div>
        )}

        {step === 'review' && extractionResult && (
          <ExtractionReviewPanel
            result={extractionResult}
            studentName={studentName}
            expandedSections={expandedSections}
            toggleSection={toggleSection}
            decisions={decisions}
            onApprove={approveAction}
            onReject={rejectAction}
            onBack={() => setStep('upload')}
            onApply={handleApplyChanges}
            isApplying={isApplying}
            studentId={studentId}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

// ============ Review Panel ============

interface ExtractionReviewPanelProps {
  result: DocumentExtractionResult;
  studentName?: string;
  expandedSections: Set<string>;
  toggleSection: (section: string) => void;
  decisions: Map<string, { status: string }>;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onBack: () => void;
  onApply: () => void;
  isApplying: boolean;
  studentId?: string;
}

function ExtractionReviewPanel({
  result,
  studentName,
  expandedSections,
  toggleSection,
  decisions,
  onApprove,
  onReject,
  onBack,
  onApply,
  isApplying,
  studentId,
}: ExtractionReviewPanelProps) {
  const overallLevel = getConfidenceLevel(result.confidence.overall);
  const requiresReview = result.confidence.requires_review_reasons.length > 0;

  const approvedCount = Array.from(decisions.values()).filter(d => d.status === 'approved').length;
  const totalActions = result.proposed_actions.length;

  return (
    <div className="space-y-4">
      {/* Confidence Summary */}
      <Card className={requiresReview ? 'border-warning bg-warning/10' : 'border-primary bg-primary/5'}>
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {requiresReview ? (
                <AlertTriangle className="w-5 h-5 text-warning" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-primary" />
              )}
              <div>
                <CardTitle className="text-base">
                  Extraction {requiresReview ? 'Needs Review' : 'Ready'}
                </CardTitle>
                <CardDescription>
                  Document type: {result.document.detected_doc_type}
                </CardDescription>
              </div>
            </div>
            <ConfidenceBadge score={result.confidence.overall} />
          </div>
        </CardHeader>
        {result.confidence.warnings.length > 0 && (
          <CardContent className="pt-0 pb-3">
            <div className="text-xs space-y-1">
              {result.confidence.warnings.slice(0, 3).map((w, i) => (
                <div key={i} className="text-muted-foreground">⚠ {w}</div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      <ScrollArea className="h-[400px]">
        <div className="space-y-3 pr-4">
          {/* Client Identity Section */}
          <CollapsibleSection
            title="Client Identity"
            isOpen={expandedSections.has('client')}
            onToggle={() => toggleSection('client')}
            badge={
              <ConfidenceBadge 
                score={getClientFieldConfidence(result.entities.client.full_name)} 
                size="sm" 
              />
            }
          >
            <div className="grid grid-cols-2 gap-3 p-3">
              <ExtractedFieldDisplay
                label="Full Name"
                field={normalizeClientField(result.entities.client.full_name)}
                highlight={studentName && getClientFieldValue(result.entities.client.full_name) !== studentName}
              />
              {result.entities.client.dob && (
                <ExtractedFieldDisplay label="Date of Birth" field={normalizeClientField(result.entities.client.dob)} />
              )}
              {result.entities.client.grade && (
                <ExtractedFieldDisplay label="Grade" field={normalizeClientField(result.entities.client.grade)} />
              )}
              {result.entities.client.school && (
                <ExtractedFieldDisplay label="School" field={normalizeClientField(result.entities.client.school)} />
              )}
            </div>
            {studentName && getClientFieldValue(result.entities.client.full_name) !== studentName && (
              <div className="p-3 pt-0 text-xs text-muted-foreground bg-muted rounded-b">
                ⚠ Extracted name differs from current student: "{studentName}"
              </div>
            )}
          </CollapsibleSection>

          {/* Proposed Actions Section */}
          <CollapsibleSection
            title="Proposed Changes"
            isOpen={expandedSections.has('actions')}
            onToggle={() => toggleSection('actions')}
            badge={<Badge variant="secondary">{totalActions} items</Badge>}
          >
            <div className="space-y-2 p-3">
              {result.proposed_actions.map(action => (
                <ActionReviewCard
                  key={action.action_id}
                  action={action}
                  decision={decisions.get(action.action_id)}
                  onApprove={() => onApprove(action.action_id)}
                  onReject={() => onReject(action.action_id)}
                />
              ))}
              {result.proposed_actions.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No actionable items extracted from this document.
                </p>
              )}
            </div>
          </CollapsibleSection>

          {/* Background Info Section */}
          {result.background_info && Object.keys(result.background_info).length > 0 && (
            <CollapsibleSection
              title="Background Information"
              isOpen={expandedSections.has('background')}
              onToggle={() => toggleSection('background')}
            >
              <div className="p-3 space-y-2 text-sm">
                {Object.entries(result.background_info).map(([key, value]) => (
                  value && (
                    <div key={key}>
                      <span className="font-medium capitalize">{key.replace(/_/g, ' ')}:</span>{' '}
                      <span className="text-muted-foreground">{String(value)}</span>
                    </div>
                  )
                ))}
              </div>
            </CollapsibleSection>
          )}
        </div>
      </ScrollArea>

      {/* Actions */}
      <div className="flex gap-2 justify-between pt-2 border-t">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <div className="flex gap-2">
          {totalActions > 0 && (
            <Button
              variant="outline"
              onClick={() => result.proposed_actions.forEach(a => onApprove(a.action_id))}
            >
              Approve All
            </Button>
          )}
          <Button 
            onClick={onApply}
            disabled={isApplying || !studentId || approvedCount === 0}
          >
            {isApplying ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Applying...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Apply {approvedCount} Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============ Sub-components ============

function ConfidenceBadge({ score, size = 'md' }: { score: number; size?: 'sm' | 'md' }) {
  const level = getConfidenceLevel(score);
  const colorClass = getConfidenceBadgeColor(level);
  const percent = Math.round(score * 100);
  
  return (
    <Badge variant="outline" className={`${colorClass} ${size === 'sm' ? 'text-xs px-1.5 py-0' : ''}`}>
      {percent}% confidence
    </Badge>
  );
}

interface CollapsibleSectionProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  badge?: React.ReactNode;
  children: React.ReactNode;
}

function CollapsibleSection({ title, isOpen, onToggle, badge, children }: CollapsibleSectionProps) {
  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="py-2 px-3 cursor-pointer hover:bg-muted/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
              </div>
              {badge}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="p-0">{children}</CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

interface ExtractedFieldDisplayProps {
  label: string;
  field: { value: unknown; confidence: number; source: { page: number; snippet: string }; evidence_type: string };
  highlight?: boolean;
}

function ExtractedFieldDisplay({ label, field, highlight }: ExtractedFieldDisplayProps) {
  const level = getConfidenceLevel(field.confidence);
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`p-2 rounded border ${highlight ? 'border-yellow-300 bg-yellow-50' : 'border-border'}`}>
            <div className="text-xs text-muted-foreground mb-1">{label}</div>
            <div className="font-medium text-sm flex items-center gap-1">
              {String(field.value)}
              <span className={`w-2 h-2 rounded-full ${
                level === 'high' ? 'bg-green-500' :
                level === 'medium' ? 'bg-yellow-500' :
                level === 'low' ? 'bg-orange-500' : 'bg-red-500'
              }`} />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="text-xs space-y-1">
            <div><strong>Confidence:</strong> {Math.round(field.confidence * 100)}%</div>
            <div><strong>Source:</strong> Page {field.source.page}</div>
            <div><strong>Type:</strong> {field.evidence_type}</div>
            {field.source.snippet && (
              <div className="mt-1 p-1 bg-muted rounded text-xs italic">
                "{field.source.snippet.substring(0, 100)}..."
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface ActionReviewCardProps {
  action: ProposedAction;
  decision?: { status: string };
  onApprove: () => void;
  onReject: () => void;
}

function ActionReviewCard({ action, decision, onApprove, onReject }: ActionReviewCardProps) {
  const isApproved = decision?.status === 'approved';
  const isRejected = decision?.status === 'rejected';
  
  return (
    <div className={`p-3 rounded-lg border ${
      isApproved ? 'border-green-200 bg-green-50/50' :
      isRejected ? 'border-red-200 bg-red-50/50' :
      action.requires_review ? 'border-yellow-200 bg-yellow-50/50' : 'border-border'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-xs">
              {action.action_type.replace(/_/g, ' ')}
            </Badge>
            {action.requires_review && !decision && (
              <Badge variant="secondary" className="text-xs">
                Review Required
              </Badge>
            )}
          </div>
          <p className="text-sm">{action.summary}</p>
        </div>
        <div className="flex gap-1 shrink-0">
          <Button
            variant={isApproved ? "default" : "outline"}
            size="sm"
            onClick={onApprove}
            className="h-7 w-7 p-0"
          >
            <CheckCircle2 className="w-4 h-4" />
          </Button>
          <Button
            variant={isRejected ? "destructive" : "outline"}
            size="sm"
            onClick={onReject}
            className="h-7 w-7 p-0"
          >
            <XCircle className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ClinicalDocumentExtractor;
