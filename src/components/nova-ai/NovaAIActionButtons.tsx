import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, Database, MessageSquare, ClipboardList, 
  Download, HelpCircle, Layers, Eye, CheckCircle2
} from 'lucide-react';

export interface NovaAction {
  type: 'extract_structured_data' | 'generate_soap_note' | 'generate_narrative_note' | 'generate_caregiver_note' | 'request_clarification';
  data: any;
}

interface NovaAIActionButtonsProps {
  actions: NovaAction[];
  onAction: (action: NovaAction, destination: string) => void;
  disabled?: boolean;
}

const ACTION_CONFIGS: Record<string, { buttons: { label: string; destination: string; icon: React.ReactNode }[] }> = {
  extract_structured_data: {
    buttons: [
      { label: 'Log Structured Data', destination: 'session_data', icon: <Database className="w-3.5 h-3.5" /> },
      { label: 'Review Parsed Data', destination: 'review', icon: <Eye className="w-3.5 h-3.5" /> },
      { label: 'Log Data + Write Note', destination: 'data_and_soap', icon: <Layers className="w-3.5 h-3.5" /> },
    ],
  },
  generate_soap_note: {
    buttons: [
      { label: 'Save as Session Note', destination: 'session_notes', icon: <ClipboardList className="w-3.5 h-3.5" /> },
      { label: 'Save as Draft', destination: 'draft', icon: <Download className="w-3.5 h-3.5" /> },
    ],
  },
  generate_narrative_note: {
    buttons: [
      { label: 'Save as Narrative Note', destination: 'narrative_notes', icon: <FileText className="w-3.5 h-3.5" /> },
      { label: 'Save as Draft', destination: 'draft', icon: <Download className="w-3.5 h-3.5" /> },
    ],
  },
  generate_caregiver_note: {
    buttons: [
      { label: 'Save as Caregiver Note', destination: 'caregiver_notes', icon: <MessageSquare className="w-3.5 h-3.5" /> },
      { label: 'Save as Draft', destination: 'draft', icon: <Download className="w-3.5 h-3.5" /> },
    ],
  },
};

// Match status colors
const MATCH_STATUS_COLORS: Record<string, string> = {
  matched_existing_target: 'text-emerald-600 dark:text-emerald-400',
  matched_existing_target_via_alias: 'text-blue-600 dark:text-blue-400',
  ambiguous_match_review_needed: 'text-amber-600 dark:text-amber-400',
  no_match_new_target_suggested: 'text-orange-600 dark:text-orange-400',
};

const MATCH_STATUS_LABELS: Record<string, string> = {
  matched_existing_target: 'Matched',
  matched_existing_target_via_alias: 'Alias Match',
  ambiguous_match_review_needed: 'Review Needed',
  no_match_new_target_suggested: 'New Target',
};

function StructuredDataSummary({ data }: { data: any }) {
  const behaviors = data.behaviors || [];
  if (!behaviors.length) return null;

  return (
    <div className="mt-2 p-2.5 rounded-lg bg-muted/40 border border-border/50 space-y-1.5">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Extracted Items</p>
      {behaviors.map((item: any, i: number) => (
        <div key={i} className="flex items-center gap-1.5 flex-wrap text-xs">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {item.measurement?.measurement_type || item.item_type}
          </Badge>
          <span className="font-medium">{item.target_match?.target_name || item.raw_text}</span>
          {item.measurement?.frequency_count != null && (
            <span className="text-muted-foreground">× {item.measurement.frequency_count}</span>
          )}
          {item.measurement?.trial_correct != null && item.measurement?.trial_total != null && (
            <span className="text-muted-foreground">{item.measurement.trial_correct}/{item.measurement.trial_total}</span>
          )}
          {item.measurement?.duration_seconds != null && (
            <span className="text-muted-foreground">{item.measurement.duration_seconds}s</span>
          )}
          {item.measurement?.percent_value != null && (
            <span className="text-muted-foreground">{item.measurement.percent_value}%</span>
          )}
          {item.prompting?.prompt_level && (
            <Badge variant="secondary" className="text-[9px] px-1 py-0">{item.prompting.prompt_level}</Badge>
          )}
          {item.target_match?.match_status && (
            <span className={`text-[10px] ${MATCH_STATUS_COLORS[item.target_match.match_status] || 'text-muted-foreground'}`}>
              <CheckCircle2 className="w-3 h-3 inline mr-0.5" />
              {MATCH_STATUS_LABELS[item.target_match.match_status] || item.target_match.match_status}
            </span>
          )}
          {item.quality?.confidence != null && (
            <span className="text-[10px] text-muted-foreground">({Math.round(item.quality.confidence * 100)}%)</span>
          )}
        </div>
      ))}
      {data.caregiver_updates?.length > 0 && (
        <div className="pt-1 border-t border-border/30">
          <p className="text-[10px] text-muted-foreground">Caregiver updates: {data.caregiver_updates.map((u: any) => u.summary || u.raw_text).join('; ')}</p>
        </div>
      )}
    </div>
  );
}

export function NovaAIActionButtons({ actions, onAction, disabled }: NovaAIActionButtonsProps) {
  if (!actions.length) return null;

  const clarifications = actions.filter(a => a.type === 'request_clarification');
  const dataActions = actions.filter(a => a.type !== 'request_clarification');

  return (
    <div className="space-y-2 mt-2">
      {/* Structured data summary for extract actions */}
      {dataActions
        .filter(a => a.type === 'extract_structured_data')
        .map((action, i) => (
          <StructuredDataSummary key={`summary-${i}`} data={action.data} />
        ))}

      {/* Action buttons */}
      {dataActions.map((action, i) => {
        const config = ACTION_CONFIGS[action.type];
        if (!config) return null;

        // Add posting recommendation button if present
        const postingRec = action.data?.posting_recommendation;
        
        return (
          <div key={i} className="flex flex-wrap gap-1.5">
            {config.buttons.map((btn) => (
              <Button
                key={btn.destination}
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5 hover:bg-primary/5 hover:border-primary/30"
                onClick={() => onAction(action, btn.destination)}
                disabled={disabled}
              >
                {btn.icon}
                {btn.label}
              </Button>
            ))}
            {postingRec?.recommended_destination && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                onClick={() => onAction(action, postingRec.recommended_destination)}
                disabled={disabled}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Post to {postingRec.recommended_destination.replace(/_/g, ' ')}
              </Button>
            )}
          </div>
        );
      })}

      {/* Clarification questions */}
      {clarifications.map((action, i) => (
        <div key={`clarify-${i}`} className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-2.5 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
            <HelpCircle className="w-3.5 h-3.5" />
            Nova AI needs clarification
          </div>
          {action.data.questions?.map((q: any) => (
            <div key={q.question_id || q.question_text} className="text-xs text-foreground">
              <p className="font-medium">{q.question_text}</p>
              {q.options?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {q.options.map((opt: any, oi: number) => (
                    <Button
                      key={oi}
                      variant="outline"
                      size="sm"
                      className="h-6 text-[11px] px-2"
                      onClick={() => onAction(action, `clarify:${q.question_id || q.question_text}:${opt.label}`)}
                      disabled={disabled}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
