import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, Database, MessageSquare, ClipboardList, 
  Download, HelpCircle, Layers, Eye, CheckCircle2,
  AlertTriangle, RefreshCw
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

// Match status colors using semantic tokens
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

const MEASUREMENT_ICONS: Record<string, string> = {
  frequency: '🔢',
  duration: '⏱️',
  latency: '⏳',
  interval: '📊',
  trial_based: '🎯',
  abc: '🔄',
  rate: '📈',
  narrative_only: '📝',
};

function StructuredDataSummary({ data }: { data: any }) {
  const behaviors = data.behaviors || [];
  if (!behaviors.length) return null;

  const warningCount = behaviors.filter((b: any) =>
    b.quality?.needs_review || b.target_match?.match_status === 'ambiguous_match_review_needed'
  ).length;

  return (
    <div className="mt-2 p-2.5 rounded-lg bg-muted/40 border border-border/50 space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Extracted Items ({behaviors.length})
        </p>
        {warningCount > 0 && (
          <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-amber-300 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />
            {warningCount} need review
          </Badge>
        )}
      </div>

      {/* Session metadata */}
      {(data.session_date || data.setting) && (
        <div className="flex gap-2 text-[10px] text-muted-foreground pb-1 border-b border-border/30">
          {data.session_date && <span>📅 {data.session_date}</span>}
          {data.session_start && data.session_end && <span>🕐 {data.session_start}–{data.session_end}</span>}
          {data.session_duration_minutes && <span>⏱️ {data.session_duration_minutes}min</span>}
          {data.setting && <span>📍 {data.setting}</span>}
        </div>
      )}

      {behaviors.map((item: any, i: number) => (
        <div key={i} className="flex items-center gap-1.5 flex-wrap text-xs">
          <span className="text-[10px]">
            {MEASUREMENT_ICONS[item.measurement?.measurement_type] || '•'}
          </span>
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
            <span className="text-muted-foreground">{Math.round(item.measurement.duration_seconds)}s</span>
          )}
          {item.measurement?.latency_seconds != null && (
            <span className="text-muted-foreground">latency: {item.measurement.latency_seconds}s</span>
          )}
          {item.measurement?.percent_value != null && (
            <span className="text-muted-foreground">{item.measurement.percent_value}%</span>
          )}
          {item.measurement?.rate_per_minute != null && (
            <span className="text-muted-foreground">{item.measurement.rate_per_minute}/min</span>
          )}
          {item.prompting?.prompt_level && (
            <Badge variant="secondary" className="text-[9px] px-1 py-0">{item.prompting.prompt_level}</Badge>
          )}
          {item.context?.antecedent && (
            <span className="text-[10px] text-muted-foreground italic">A: {item.context.antecedent.slice(0, 30)}</span>
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
          {item.quality?.is_inferred && (
            <Badge variant="outline" className="text-[9px] px-1 py-0 border-amber-200 text-amber-600">inferred</Badge>
          )}
        </div>
      ))}

      {/* Suggested new targets */}
      {data.suggested_new_targets?.length > 0 && (
        <div className="pt-1 border-t border-border/30">
          <p className="text-[10px] font-semibold text-orange-600 dark:text-orange-400">
            Suggested new targets:
          </p>
          {data.suggested_new_targets.map((t: any, i: number) => (
            <p key={i} className="text-[10px] text-muted-foreground">
              + {t.proposed_name} ({t.proposed_type}) — "{t.source_phrase}"
            </p>
          ))}
        </div>
      )}

      {/* Caregiver updates */}
      {data.caregiver_updates?.length > 0 && (
        <div className="pt-1 border-t border-border/30">
          <p className="text-[10px] text-muted-foreground">
            👨‍👩‍👧 Caregiver: {data.caregiver_updates.map((u: any) => u.summary || u.raw_text).join('; ')}
          </p>
        </div>
      )}

      {/* Graph updates indicator */}
      {data.graph_updates?.length > 0 && (
        <div className="pt-1 border-t border-border/30 flex items-center gap-1 text-[10px] text-muted-foreground">
          <RefreshCw className="w-2.5 h-2.5" />
          {data.graph_updates.length} graph(s) will update after save
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
