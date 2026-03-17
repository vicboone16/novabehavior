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
};

const TYPE_LABELS: Record<string, string> = {
  extract_structured_data: 'Structured Data',
  generate_soap_note: 'SOAP Note',
  generate_narrative_note: 'Narrative Note',
  generate_caregiver_note: 'Caregiver Note',
};

export function NovaAIConfirmDialog({ open, onOpenChange, action, destination, onConfirm }: NovaAIConfirmDialogProps) {
  if (!action) return null;

  const renderPreview = () => {
    const d = action.data;
    switch (action.type) {
      case 'extract_structured_data':
        return (
          <div className="space-y-1.5 text-xs">
            {d.session_date && <p><span className="font-medium">Date:</span> {d.session_date}</p>}
            {d.behaviors?.length > 0 && (
              <div>
                <span className="font-medium">Behaviors:</span>
                {d.behaviors.map((b: any, i: number) => (
                  <Badge key={i} variant="outline" className="ml-1 text-[10px]">
                    {b.name}: {b.value} ({b.measurement_type})
                  </Badge>
                ))}
              </div>
            )}
            {d.skills?.length > 0 && (
              <div>
                <span className="font-medium">Skills:</span>
                {d.skills.map((s: any, i: number) => (
                  <Badge key={i} variant="outline" className="ml-1 text-[10px]">
                    {s.name}: {s.trials_correct}/{s.trials_total}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        );
      case 'generate_soap_note':
        return (
          <div className="space-y-1 text-xs max-h-48 overflow-y-auto">
            {d.subjective && <p><span className="font-semibold">S:</span> {d.subjective.slice(0, 150)}...</p>}
            {d.objective && <p><span className="font-semibold">O:</span> {d.objective.slice(0, 150)}...</p>}
            {d.assessment && <p><span className="font-semibold">A:</span> {d.assessment.slice(0, 150)}...</p>}
            {d.plan && <p><span className="font-semibold">P:</span> {d.plan.slice(0, 150)}...</p>}
          </div>
        );
      case 'generate_narrative_note':
      case 'generate_caregiver_note':
        return <p className="text-xs max-h-48 overflow-y-auto">{d.content?.slice(0, 300)}...</p>;
      default:
        return null;
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            Save {TYPE_LABELS[action.type] || 'Data'}
            <Badge variant="secondary" className="text-[10px]">
              → {DESTINATION_LABELS[destination] || destination}
            </Badge>
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>
              <p className="mb-2">Review the AI-generated content before saving:</p>
              <div className="bg-muted/50 rounded-md p-3 border">
                {renderPreview()}
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Save as Draft
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
