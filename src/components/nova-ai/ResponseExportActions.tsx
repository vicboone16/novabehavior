import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import {
  FileText, ClipboardList, BookOpen, Stethoscope, Save,
  Check, ExternalLink, Loader2, Copy
} from 'lucide-react';
import { toast } from 'sonner';

const db = supabase as any;

interface ResponseExportActionsProps {
  responseText: string;
  reasoningOutputId?: string | null;
  clientId?: string;
  sessionId?: string | null;
}

type ExportTarget = 'report' | 'fba' | 'reassessment' | 'session_note' | 'clinical_draft';

const EXPORT_TARGETS: { key: ExportTarget; label: string; icon: React.ReactNode; description: string }[] = [
  { key: 'report', label: 'Send to Report', icon: <FileText className="w-3.5 h-3.5" />, description: 'Add to report narrative section' },
  { key: 'fba', label: 'Send to FBA', icon: <ClipboardList className="w-3.5 h-3.5" />, description: 'Add to FBA summary or hypothesis' },
  { key: 'reassessment', label: 'Send to Reassessment', icon: <BookOpen className="w-3.5 h-3.5" />, description: 'Add to reassessment draft' },
  { key: 'session_note', label: 'Send to Session Note', icon: <Stethoscope className="w-3.5 h-3.5" />, description: 'Add to session note section' },
  { key: 'clinical_draft', label: 'Save to Clinical Drafts', icon: <Save className="w-3.5 h-3.5" />, description: 'Save as reusable clinical draft' },
];

const SECTION_OPTIONS: Record<ExportTarget, { value: string; label: string }[]> = {
  report: [
    { value: 'intervention_section', label: 'Intervention Section' },
    { value: 'progress_summary', label: 'Progress Summary' },
    { value: 'recommendations', label: 'Recommendations' },
    { value: 'caregiver_support_section', label: 'Caregiver Support' },
  ],
  fba: [
    { value: 'summary', label: 'FBA Summary' },
    { value: 'hypothesis', label: 'Hypothesis' },
    { value: 'recommendations', label: 'Recommendations' },
    { value: 'patterns', label: 'Behavior Patterns' },
  ],
  reassessment: [
    { value: 'progress_summary', label: 'Progress Summary' },
    { value: 'skill_summary', label: 'Skill Summary' },
    { value: 'behavior_summary', label: 'Behavior Summary' },
    { value: 'caregiver_summary', label: 'Caregiver Summary' },
  ],
  session_note: [
    { value: 'subjective', label: 'Subjective' },
    { value: 'objective', label: 'Objective' },
    { value: 'assessment', label: 'Assessment' },
    { value: 'plan', label: 'Plan' },
  ],
  clinical_draft: [],
};

export function ResponseExportActions({ responseText, reasoningOutputId, clientId, sessionId }: ResponseExportActionsProps) {
  const { user } = useAuth();
  const [activeExport, setActiveExport] = useState<ExportTarget | null>(null);
  const [sectionKey, setSectionKey] = useState('');
  const [draftTitle, setDraftTitle] = useState('');
  const [draftType, setDraftType] = useState('general');
  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(responseText);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = async () => {
    if (!user) return;
    setExporting(true);
    try {
      if (activeExport === 'clinical_draft') {
        await db.from('nova_ai_saved_clinical_drafts').insert({
          user_id: user.id,
          client_id: clientId || null,
          draft_title: draftTitle || 'Untitled Draft',
          draft_type: draftType,
          source_reasoning_output_id: reasoningOutputId || null,
          content: responseText,
          context_snapshot_json: {},
        });
        toast.success('Saved to Clinical Drafts');
      } else {
        await db.from('nova_ai_output_exports').insert({
          user_id: user.id,
          reasoning_output_id: reasoningOutputId || null,
          client_id: clientId || null,
          export_target_key: activeExport,
          destination_section_key: sectionKey || null,
          exported_text: responseText,
          context_snapshot_json: {},
        });
        toast.success(`Exported to ${EXPORT_TARGETS.find(t => t.key === activeExport)?.label}`);
      }
      setActiveExport(null);
      setSectionKey('');
      setDraftTitle('');
    } catch (e) {
      console.error(e);
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap gap-1.5 pt-3 border-t border-border/50">
        <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1" onClick={handleCopy}>
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied' : 'Copy'}
        </Button>
        {EXPORT_TARGETS.map(t => (
          <Button
            key={t.key}
            variant="outline"
            size="sm"
            className="h-7 text-[11px] gap-1"
            onClick={() => setActiveExport(t.key)}
          >
            {t.icon}
            {t.label}
          </Button>
        ))}
      </div>

      <Dialog open={!!activeExport} onOpenChange={(open) => { if (!open) setActiveExport(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">
              {activeExport === 'clinical_draft' ? 'Save to Clinical Drafts' : `Export to ${EXPORT_TARGETS.find(t => t.key === activeExport)?.label}`}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {activeExport === 'clinical_draft'
                ? 'Save this reasoning output as a reusable clinical draft.'
                : 'Choose where to send this reasoning output.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {activeExport === 'clinical_draft' ? (
              <>
                <div className="space-y-1">
                  <Label className="text-xs">Draft Title</Label>
                  <Input value={draftTitle} onChange={e => setDraftTitle(e.target.value)} placeholder="e.g. Behavior Summary - March 2026" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Draft Type</Label>
                  <Select value={draftType} onValueChange={setDraftType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="behavior_summary">Behavior Summary</SelectItem>
                      <SelectItem value="skill_summary">Skill Summary</SelectItem>
                      <SelectItem value="caregiver_summary">Caregiver Summary</SelectItem>
                      <SelectItem value="reassessment">Reassessment</SelectItem>
                      <SelectItem value="fba">FBA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : activeExport && SECTION_OPTIONS[activeExport]?.length > 0 ? (
              <div className="space-y-1">
                <Label className="text-xs">Destination Section</Label>
                <Select value={sectionKey} onValueChange={setSectionKey}>
                  <SelectTrigger><SelectValue placeholder="Select section" /></SelectTrigger>
                  <SelectContent>
                    {SECTION_OPTIONS[activeExport].map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="bg-muted/50 rounded-md p-2 max-h-32 overflow-y-auto">
              <p className="text-[10px] text-muted-foreground font-medium mb-1">Preview</p>
              <p className="text-xs text-foreground line-clamp-6">{responseText.slice(0, 500)}</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setActiveExport(null)}>Cancel</Button>
            <Button size="sm" onClick={handleExport} disabled={exporting}>
              {exporting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
              {activeExport === 'clinical_draft' ? 'Save Draft' : 'Export'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
