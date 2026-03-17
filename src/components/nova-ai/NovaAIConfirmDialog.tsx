import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import type { NovaAction } from './NovaAIActionButtons';

interface NovaAIConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: NovaAction | null;
  destination: string;
  onConfirm: () => void;
}

const DESTINATION_LABELS: Record<string, string> = {
  session_data: 'Session Data (Graphs)',
  session_notes: 'Session Notes',
  narrative_notes: 'Narrative Notes',
  caregiver_notes: 'Caregiver Notes',
  draft: 'Drafts',
  data_and_soap: 'Session Data + SOAP Note',
  review: 'Review Only',
  client_timeline: 'Client Timeline',
};

const TYPE_LABELS: Record<string, string> = {
  extract_structured_data: 'Structured Data',
  generate_soap_note: 'SOAP Note',
  generate_narrative_note: 'Narrative Note',
  generate_caregiver_note: 'Caregiver Note',
};

const MATCH_STATUS_STYLES: Record<string, { color: string; label: string }> = {
  matched_existing_target: { color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400', label: '✓ Matched' },
  matched_existing_target_via_alias: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', label: '✓ Alias' },
  ambiguous_match_review_needed: { color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400', label: '⚠ Review' },
  no_match_new_target_suggested: { color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400', label: '+ New' },
};

export function NovaAIConfirmDialog({ open, onOpenChange, action, destination, onConfirm }: NovaAIConfirmDialogProps) {
  if (!action) return null;

  const renderPreview = () => {
    const d = action.data;
    switch (action.type) {
      case 'extract_structured_data': {
        const behaviors = d.behaviors || [];
        const warnings = behaviors.filter((b: any) => b.quality?.needs_review || b.target_match?.match_status === 'ambiguous_match_review_needed');
        return (
          <div className="space-y-2 text-xs">
            {d.session_date && <p><span className="font-medium">Date:</span> {d.session_date} {d.session_start && `${d.session_start}`}{d.session_end && ` – ${d.session_end}`}</p>}
            {d.setting && <p><span className="font-medium">Setting:</span> {d.setting}</p>}
            
            {behaviors.length > 0 && (
              <div className="space-y-1.5">
                <p className="font-semibold text-foreground">Items ({behaviors.length}):</p>
                {behaviors.map((item: any, i: number) => {
                  const matchStyle = MATCH_STATUS_STYLES[item.target_match?.match_status] || { color: 'bg-muted', label: '?' };
                  return (
                    <div key={i} className="flex items-start gap-2 p-1.5 rounded bg-muted/30 border border-border/30">
                      <div className="flex-1 space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium">{item.target_match?.target_name || item.raw_text}</span>
                          <Badge className={`text-[9px] px-1 py-0 ${matchStyle.color}`}>{matchStyle.label}</Badge>
                        </div>
                        <div className="flex gap-2 text-muted-foreground">
                          <span>{item.measurement?.measurement_type}</span>
                          {item.measurement?.frequency_count != null && <span>count: {item.measurement.frequency_count}</span>}
                          {item.measurement?.trial_correct != null && <span>{item.measurement.trial_correct}/{item.measurement.trial_total} ({item.measurement.percent_value}%)</span>}
                          {item.measurement?.duration_seconds != null && <span>{item.measurement.duration_seconds}s</span>}
                          {item.measurement?.latency_seconds != null && <span>latency: {item.measurement.latency_seconds}s</span>}
                          {item.measurement?.rate_per_minute != null && <span>rate: {item.measurement.rate_per_minute}/min</span>}
                          {item.prompting?.prompt_level && <span>prompt: {item.prompting.prompt_level}</span>}
                        </div>
                        {item.context?.antecedent && <p className="text-muted-foreground">A: {item.context.antecedent}</p>}
                        {item.context?.consequence && <p className="text-muted-foreground">C: {item.context.consequence}</p>}
                        <div className="flex gap-2">
                          {item.quality?.confidence != null && <span className="text-muted-foreground">confidence: {Math.round(item.quality.confidence * 100)}%</span>}
                          {item.quality?.is_inferred && <span className="text-amber-600">inferred</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {d.caregiver_updates?.length > 0 && (
              <div>
                <p className="font-semibold">Caregiver Updates:</p>
                {d.caregiver_updates.map((u: any, i: number) => (
                  <p key={i} className="text-muted-foreground">• {u.summary || u.raw_text}</p>
                ))}
              </div>
            )}

            {warnings.length > 0 && (
              <div className="flex items-start gap-1.5 p-1.5 rounded bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-amber-700 dark:text-amber-400">
                  {warnings.length} item(s) need review before saving
                </p>
              </div>
            )}
          </div>
        );
      }

      case 'generate_soap_note': {
        const content = d.content || d;
        const quality = d.quality;
        return (
          <div className="space-y-1.5 text-xs">
            {d.session_date && <p><span className="font-medium">Date:</span> {d.session_date}</p>}
            {d.session_duration_minutes && <p><span className="font-medium">Duration:</span> {d.session_duration_minutes} min</p>}
            {content.subjective && <p><span className="font-semibold">S:</span> {content.subjective.slice(0, 200)}{content.subjective.length > 200 ? '...' : ''}</p>}
            {content.objective && <p><span className="font-semibold">O:</span> {content.objective.slice(0, 200)}{content.objective.length > 200 ? '...' : ''}</p>}
            {content.assessment && <p><span className="font-semibold">A:</span> {content.assessment.slice(0, 200)}{content.assessment.length > 200 ? '...' : ''}</p>}
            {content.plan && <p><span className="font-semibold">P:</span> {content.plan.slice(0, 200)}{content.plan.length > 200 ? '...' : ''}</p>}
            {quality?.is_incomplete && (
              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-3 h-3" />
                <span>Note is incomplete — missing: {quality.missing_info?.join(', ')}</span>
              </div>
            )}
          </div>
        );
      }

      case 'generate_narrative_note':
      case 'generate_caregiver_note': {
        const content = d.content || d;
        const body = content.body || content.content || '';
        return (
          <div className="space-y-1 text-xs">
            {d.note_date && <p><span className="font-medium">Date:</span> {d.note_date}</p>}
            {d.tags?.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {d.tags.map((tag: string, i: number) => (
                  <Badge key={i} variant="secondary" className="text-[9px]">{tag}</Badge>
                ))}
              </div>
            )}
            <p>{body.slice(0, 400)}{body.length > 400 ? '...' : ''}</p>
          </div>
        );
      }

      default:
        return null;
    }
  };

  const isReviewOnly = destination === 'review';

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-base">
            {isReviewOnly ? 'Review' : 'Save'} {TYPE_LABELS[action.type] || 'Data'}
            {!isReviewOnly && (
              <Badge variant="secondary" className="text-[10px]">
                → {DESTINATION_LABELS[destination] || destination}
              </Badge>
            )}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>
              <p className="mb-2 text-sm">
                {isReviewOnly 
                  ? 'Review the AI-extracted data below:' 
                  : 'Review the AI-generated content before saving as draft:'}
              </p>
              <ScrollArea className="max-h-[50vh]">
                <div className="bg-muted/50 rounded-md p-3 border">
                  {renderPreview()}
                </div>
              </ScrollArea>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          {!isReviewOnly && (
            <AlertDialogAction onClick={onConfirm} className="gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Save as Draft
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
