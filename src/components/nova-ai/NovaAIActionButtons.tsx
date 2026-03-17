import { Button } from '@/components/ui/button';
import { 
  FileText, Database, MessageSquare, ClipboardList, 
  Download, HelpCircle, Layers 
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
      { label: 'Log Data + Write SOAP', destination: 'data_and_soap', icon: <Layers className="w-3.5 h-3.5" /> },
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

export function NovaAIActionButtons({ actions, onAction, disabled }: NovaAIActionButtonsProps) {
  if (!actions.length) return null;

  // Clarification actions are rendered differently
  const clarifications = actions.filter(a => a.type === 'request_clarification');
  const dataActions = actions.filter(a => a.type !== 'request_clarification');

  return (
    <div className="space-y-2 mt-2">
      {dataActions.map((action, i) => {
        const config = ACTION_CONFIGS[action.type];
        if (!config) return null;
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
          </div>
        );
      })}

      {clarifications.map((action, i) => (
        <div key={`clarify-${i}`} className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-2.5 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
            <HelpCircle className="w-3.5 h-3.5" />
            Nova AI needs clarification
          </div>
          {action.data.questions?.map((q: any, qi: number) => (
            <div key={qi} className="text-xs text-foreground">
              <p className="font-medium">{q.question}</p>
              {q.options?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {q.options.map((opt: string, oi: number) => (
                    <Button
                      key={oi}
                      variant="outline"
                      size="sm"
                      className="h-6 text-[11px] px-2"
                      onClick={() => onAction(action, `clarify:${q.question}:${opt}`)}
                      disabled={disabled}
                    >
                      {opt}
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
