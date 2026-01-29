import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { 
  FileText, 
  Save, 
  Send,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useSessionNotes } from '@/hooks/useSessionNotes';
import {
  EnhancedSessionNote,
  NoteTemplate,
  NoteTemplateField,
  NOTE_TYPE_LABELS,
  SERVICE_SETTING_LABELS,
  INTERVENTION_OPTIONS,
  ASSESSMENT_TOOLS,
  FUNCTION_OPTIONS,
  BST_COMPONENTS,
  CLINICAL_FOCUS_OPTIONS,
} from '@/types/sessionNotes';
import { toast } from '@/hooks/use-toast';

interface NoteEditorDialogProps {
  note: EnhancedSessionNote;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: NoteTemplate[];
  onSaved: () => void;
}

export function NoteEditorDialog({
  note,
  open,
  onOpenChange,
  templates,
  onSaved,
}: NoteEditorDialogProps) {
  const { updateNote, submitNote } = useSessionNotes(note.student_id);
  const [saving, setSaving] = useState(false);
  const [content, setContent] = useState<Record<string, unknown>>(note.note_content || {});
  const [editReason, setEditReason] = useState('');
  const [showEditReason, setShowEditReason] = useState(false);

  const template = templates.find(t => t.note_type === note.note_type);

  useEffect(() => {
    if (open) {
      setContent(note.note_content || {});
      setEditReason('');
      setShowEditReason(note.status !== 'draft');
    }
  }, [open, note]);

  const handleSave = async (submit = false) => {
    if (showEditReason && !editReason.trim()) {
      toast({
        title: 'Edit Reason Required',
        description: 'Please provide a reason for editing this note.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      await updateNote(note.id, { note_content: content }, editReason || undefined);
      
      if (submit) {
        await submitNote(note.id);
        toast({ title: 'Note Submitted', description: 'Note has been submitted for review.' });
      } else {
        toast({ title: 'Note Saved', description: 'Your changes have been saved.' });
      }
      
      onSaved();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving note:', error);
    } finally {
      setSaving(false);
    }
  };

  const updateField = (fieldId: string, value: unknown) => {
    setContent(prev => ({ ...prev, [fieldId]: value }));
  };

  const getOptionsForField = (field: NoteTemplateField): string[] => {
    // Return predefined options based on field ID
    switch (field.id) {
      case 'interventions':
        return INTERVENTION_OPTIONS;
      case 'tools_used':
        return ASSESSMENT_TOOLS;
      case 'hypothesized_functions':
        return FUNCTION_OPTIONS;
      case 'content_delivered':
        return BST_COMPONENTS;
      case 'clinical_focus':
        return CLINICAL_FOCUS_OPTIONS;
      default:
        return field.options || [];
    }
  };

  const renderField = (field: NoteTemplateField) => {
    const value = content[field.id];
    const options = getOptionsForField(field);

    switch (field.type) {
      case 'text':
        return (
          <div key={field.id}>
            <Label htmlFor={field.id}>{field.label}</Label>
            <Input
              id={field.id}
              value={(value as string) || ''}
              onChange={(e) => updateField(field.id, e.target.value)}
              placeholder={field.hint}
              className="mt-1"
            />
            {field.hint && (
              <p className="text-xs text-muted-foreground mt-1">{field.hint}</p>
            )}
          </div>
        );

      case 'textarea':
        return (
          <div key={field.id}>
            <Label htmlFor={field.id}>{field.label}</Label>
            <Textarea
              id={field.id}
              value={(value as string) || ''}
              onChange={(e) => updateField(field.id, e.target.value)}
              placeholder={field.hint}
              className="mt-1 min-h-[80px]"
            />
            {field.hint && (
              <p className="text-xs text-muted-foreground mt-1">{field.hint}</p>
            )}
          </div>
        );

      case 'select':
        return (
          <div key={field.id}>
            <Label>{field.label}</Label>
            <Select
              value={(value as string) || ''}
              onValueChange={(v) => updateField(field.id, v)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {options.map(opt => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'multiselect':
        const selectedValues = (value as string[]) || [];
        return (
          <div key={field.id}>
            <Label>{field.label}</Label>
            <div className="mt-2 space-y-2 max-h-[150px] overflow-y-auto border rounded-md p-2">
              {options.map(opt => (
                <div key={opt} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${field.id}-${opt}`}
                    checked={selectedValues.includes(opt)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        updateField(field.id, [...selectedValues, opt]);
                      } else {
                        updateField(field.id, selectedValues.filter(v => v !== opt));
                      }
                    }}
                  />
                  <label
                    htmlFor={`${field.id}-${opt}`}
                    className="text-sm cursor-pointer"
                  >
                    {opt}
                  </label>
                </div>
              ))}
            </div>
            {selectedValues.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {selectedValues.map(v => (
                  <Badge key={v} variant="secondary" className="text-xs">
                    {v}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        );

      case 'number':
        return (
          <div key={field.id}>
            <Label htmlFor={field.id}>{field.label}</Label>
            <Input
              id={field.id}
              type="number"
              value={(value as number) || ''}
              onChange={(e) => updateField(field.id, e.target.value ? Number(e.target.value) : '')}
              placeholder={field.hint}
              className="mt-1 w-32"
            />
          </div>
        );

      case 'auto':
        // Auto fields show the pulled data as read-only
        const autoValue = note.pulled_data_snapshot 
          ? generateAutoFieldValue(field.id, note.pulled_data_snapshot)
          : 'No data available';
        return (
          <div key={field.id}>
            <Label>{field.label}</Label>
            <div className="mt-1 p-3 bg-muted/50 rounded-md text-sm">
              {autoValue}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              <RefreshCw className="w-3 h-3 inline mr-1" />
              Auto-populated from session data
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  const generateAutoFieldValue = (fieldId: string, snapshot: any): string => {
    switch (fieldId) {
      case 'programs_run':
      case 'skill_summary':
        if (snapshot.skills?.length > 0) {
          return snapshot.skills.map((s: any) => 
            `${s.targetName}: ${s.trialsCompleted} trials, ${s.percentCorrect}% correct`
          ).join('\n');
        }
        return 'No skill data recorded this session.';

      case 'behavior_summary':
      case 'behaviors_observed':
        if (snapshot.behaviors?.length > 0) {
          return snapshot.behaviors.map((b: any) => {
            const parts: string[] = [];
            if (b.frequencyCount > 0) parts.push(`${b.frequencyCount} occurrences`);
            if (b.durationSeconds > 0) {
              const mins = Math.floor(b.durationSeconds / 60);
              const secs = b.durationSeconds % 60;
              parts.push(`${mins}m ${secs}s total duration`);
            }
            if (b.intervalPercentage > 0) parts.push(`${b.intervalPercentage}% of intervals`);
            return parts.length > 0 ? `${b.behaviorName}: ${parts.join(', ')}` : null;
          }).filter(Boolean).join('\n') || 'No behavior data recorded this session.';
        }
        return 'No behavior data recorded this session.';

      case 'data_collected':
        const parts: string[] = [];
        if (snapshot.behaviors?.length > 0) {
          parts.push('Behaviors: ' + snapshot.behaviors.map((b: any) => b.behaviorName).join(', '));
        }
        if (snapshot.skills?.length > 0) {
          parts.push('Skills: ' + snapshot.skills.map((s: any) => s.targetName).join(', '));
        }
        return parts.join('\n') || 'No data recorded.';

      default:
        return 'Data available';
    }
  };

  // Get default fields if no template
  const getDefaultFields = (): NoteTemplateField[] => {
    switch (note.note_type) {
      case 'therapist':
        return [
          { id: 'session_objective', label: 'Session Objective', type: 'text' },
          { id: 'behaviors_observed', label: 'Behaviors Observed', type: 'auto' },
          { id: 'interventions', label: 'Interventions Used', type: 'multiselect', options: INTERVENTION_OPTIONS },
          { id: 'student_response', label: 'Student Response', type: 'textarea' },
          { id: 'session_narrative', label: 'Session Narrative', type: 'textarea', hint: 'Summarize participation, engagement, transitions, barriers, and response to intervention' },
          { id: 'next_session_plan', label: 'Next Session Plan', type: 'textarea' },
        ];
      case 'clinical':
        return [
          { id: 'clinical_focus', label: 'Clinical Focus', type: 'multiselect', options: CLINICAL_FOCUS_OPTIONS },
          { id: 'data_review', label: 'Data Review Summary', type: 'textarea', hint: 'Trends, patterns, mastery progress' },
          { id: 'clinical_decisions', label: 'Clinical Decisions Made', type: 'textarea' },
          { id: 'staff_training', label: 'Training / Feedback Provided', type: 'textarea' },
          { id: 'follow_up', label: 'Plan / Follow-Up', type: 'textarea' },
        ];
      case 'assessment':
        return [
          { id: 'assessment_type', label: 'Assessment Type', type: 'select', options: ['Intake interview', 'Direct observation', 'Record review', 'Rating scale', 'Combined'] },
          { id: 'tools_used', label: 'Tools Used', type: 'multiselect', options: ASSESSMENT_TOOLS },
          { id: 'context', label: 'Context & Reason', type: 'textarea' },
          { id: 'findings', label: 'Summary of Findings', type: 'textarea' },
          { id: 'hypothesized_functions', label: 'Hypothesized Functions', type: 'multiselect', options: FUNCTION_OPTIONS },
          { id: 'recommendations', label: 'Recommendations', type: 'textarea' },
        ];
      case 'parent_training':
        return [
          { id: 'training_goals', label: 'Training Goals', type: 'textarea' },
          { id: 'content_delivered', label: 'Content Delivered', type: 'multiselect', options: BST_COMPONENTS },
          { id: 'caregiver_performance', label: 'Caregiver Performance', type: 'textarea' },
          { id: 'fidelity_percentage', label: 'Fidelity Estimate (%)', type: 'number' },
          { id: 'home_practice', label: 'Home Practice Plan', type: 'textarea' },
        ];
      default:
        return [
          { id: 'notes', label: 'Notes', type: 'textarea' },
        ];
    }
  };

  const fields = template?.template_fields || getDefaultFields();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Edit {NOTE_TYPE_LABELS[note.note_type]}
          </DialogTitle>
          <DialogDescription>
            {format(new Date(note.start_time), 'EEEE, MMMM d, yyyy')} • 
            {SERVICE_SETTING_LABELS[note.service_setting]}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-4">
            {/* Session Data Summary if available */}
            {note.pulled_data_snapshot && (
              <Card className="border-dashed">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <RefreshCw className="w-4 h-4" />
                    Session Data Linked
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge variant="outline">
                      {note.pulled_data_snapshot.behaviors?.length || 0} behaviors
                    </Badge>
                    <Badge variant="outline">
                      {note.pulled_data_snapshot.skills?.length || 0} skills
                    </Badge>
                    <Badge variant="outline">
                      {note.pulled_data_snapshot.sessionTiming?.durationMinutes || 0} min
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Template Fields */}
            {fields.map(field => renderField(field))}

            {/* Edit Reason (for non-draft notes) */}
            {showEditReason && (
              <>
                <Separator />
                <div className="bg-warning/10 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-warning mt-0.5" />
                    <div className="flex-1">
                      <Label className="text-warning">Reason for Edit</Label>
                      <p className="text-xs text-muted-foreground mb-2">
                        This note has already been submitted. Please provide a reason for your changes.
                      </p>
                      <Textarea
                        value={editReason}
                        onChange={(e) => setEditReason(e.target.value)}
                        placeholder="Describe the changes being made..."
                        className="min-h-[60px]"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="flex-row justify-between border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handleSave(false)}
              disabled={saving}
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Draft'}
            </Button>
            {note.status === 'draft' && (
              <Button
                onClick={() => handleSave(true)}
                disabled={saving}
              >
                <Send className="w-4 h-4 mr-2" />
                Submit
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
