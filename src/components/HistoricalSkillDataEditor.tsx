import { useState, useMemo } from 'react';
import { 
  Plus, Calendar, Edit2, Trash2, Target, Clock, 
  Check, X, ChevronDown, ChevronUp, Save, RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import { Separator } from '@/components/ui/separator';
import { ConfirmDialog } from '@/components/ui/alert-dialog-confirm';
import { useDataStore } from '@/store/dataStore';
import { 
  SkillTarget, 
  DTTSession, 
  DTTTrial, 
  PromptLevel,
  ErrorType,
  PROMPT_LEVEL_LABELS,
  PROMPT_LEVEL_ORDER,
  ERROR_TYPE_LABELS,
} from '@/types/behavior';
import { format, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface HistoricalSkillDataEditorProps {
  studentId: string;
  studentName: string;
}

export function HistoricalSkillDataEditor({ studentId, studentName }: HistoricalSkillDataEditorProps) {
  const { toast } = useToast();
  const { 
    students, 
    addHistoricalDTTSession, 
    updateDTTSession, 
    deleteDTTSession 
  } = useDataStore();
  
  const student = students.find(s => s.id === studentId);
  const skillTargets = student?.skillTargets || [];
  const dttSessions = student?.dttSessions || [];

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editSession, setEditSession] = useState<DTTSession | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [expandedTargets, setExpandedTargets] = useState<Set<string>>(new Set());

  // Form state
  const [selectedTargetId, setSelectedTargetId] = useState<string>('');
  const [sessionDate, setSessionDate] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [sessionNotes, setSessionNotes] = useState('');
  const [trials, setTrials] = useState<DTTTrial[]>([]);

  // Trial entry state
  const [showTrialEntry, setShowTrialEntry] = useState(false);

  const resetForm = () => {
    setSelectedTargetId('');
    setSessionDate(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
    setSessionNotes('');
    setTrials([]);
    setEditSession(null);
    setShowAddDialog(false);
    setShowTrialEntry(false);
  };

  const openEditDialog = (session: DTTSession) => {
    setEditSession(session);
    setSelectedTargetId(session.skillTargetId);
    setSessionDate(format(new Date(session.date), "yyyy-MM-dd'T'HH:mm"));
    setSessionNotes(session.notes || '');
    setTrials(session.trials.map(t => ({
      ...t,
      timestamp: new Date(t.timestamp),
    })));
    setShowAddDialog(true);
  };

  const addTrial = (isCorrect: boolean, promptLevel: PromptLevel, errorType?: ErrorType) => {
    const trial: DTTTrial = {
      id: crypto.randomUUID(),
      timestamp: parseISO(sessionDate),
      isCorrect,
      promptLevel,
      errorType: isCorrect ? undefined : errorType,
    };
    setTrials(prev => [...prev, trial]);
  };

  const removeTrial = (trialId: string) => {
    setTrials(prev => prev.filter(t => t.id !== trialId));
  };

  const calculateStats = (trialList: DTTTrial[]) => {
    if (trialList.length === 0) return { percentCorrect: 0, percentIndependent: 0 };
    const correct = trialList.filter(t => t.isCorrect).length;
    const independent = trialList.filter(t => t.isCorrect && t.promptLevel === 'independent').length;
    return {
      percentCorrect: Math.round((correct / trialList.length) * 100),
      percentIndependent: Math.round((independent / trialList.length) * 100),
    };
  };

  const handleSave = () => {
    if (!selectedTargetId || trials.length === 0) {
      toast({
        title: 'Missing data',
        description: 'Please select a target and add at least one trial.',
        variant: 'destructive',
      });
      return;
    }

    const stats = calculateStats(trials);
    const sessionData: Omit<DTTSession, 'id'> = {
      skillTargetId: selectedTargetId,
      studentId,
      date: parseISO(sessionDate),
      trials,
      percentCorrect: stats.percentCorrect,
      percentIndependent: stats.percentIndependent,
      notes: sessionNotes || undefined,
    };

    if (editSession) {
      updateDTTSession(studentId, editSession.id, sessionData);
      toast({
        title: 'Session updated',
        description: `Updated session with ${trials.length} trials`,
      });
    } else {
      addHistoricalDTTSession(studentId, sessionData);
      toast({
        title: 'Historical session added',
        description: `Added session with ${trials.length} trials at ${stats.percentCorrect}% correct`,
      });
    }

    resetForm();
  };

  const handleDelete = () => {
    if (deleteConfirm) {
      deleteDTTSession(studentId, deleteConfirm);
      setDeleteConfirm(null);
      toast({
        title: 'Session deleted',
        description: 'The DTT session has been removed',
      });
    }
  };

  const toggleTarget = (targetId: string) => {
    setExpandedTargets(prev => {
      const next = new Set(prev);
      if (next.has(targetId)) {
        next.delete(targetId);
      } else {
        next.add(targetId);
      }
      return next;
    });
  };

  // Group sessions by target
  const sessionsByTarget = useMemo(() => {
    const grouped: Record<string, DTTSession[]> = {};
    dttSessions.forEach(session => {
      if (!grouped[session.skillTargetId]) {
        grouped[session.skillTargetId] = [];
      }
      grouped[session.skillTargetId].push(session);
    });
    // Sort sessions within each group by date
    Object.values(grouped).forEach(sessions => {
      sessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });
    return grouped;
  }, [dttSessions]);

  const currentStats = calculateStats(trials);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                Historical Skill Acquisition Data
              </CardTitle>
              <CardDescription>
                Add, edit, or delete past DTT sessions for {studentName}
              </CardDescription>
            </div>
            <Button onClick={() => setShowAddDialog(true)} disabled={skillTargets.length === 0}>
              <Plus className="w-4 h-4 mr-2" />
              Add Historical Session
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {skillTargets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No skill targets defined</p>
              <p className="text-xs mt-1">Add skill targets first to record DTT sessions</p>
            </div>
          ) : (
            <div className="space-y-3">
              {skillTargets.map(target => {
                const sessions = sessionsByTarget[target.id] || [];
                const isExpanded = expandedTargets.has(target.id);

                return (
                  <Collapsible
                    key={target.id}
                    open={isExpanded}
                    onOpenChange={() => toggleTarget(target.id)}
                  >
                    <div className="border rounded-lg overflow-hidden">
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between p-3 hover:bg-muted/50 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <Target className="w-4 h-4 text-primary" />
                            <span className="font-medium">{target.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {sessions.length} sessions
                            </Badge>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <Separator />
                        <div className="p-3 bg-muted/30 space-y-2">
                          {sessions.length === 0 ? (
                            <div className="text-center py-4 text-muted-foreground text-sm">
                              No sessions recorded for this target
                            </div>
                          ) : (
                            sessions.map(session => (
                              <div
                                key={session.id}
                                className="flex items-center justify-between p-2 bg-background rounded border text-sm"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-1 text-muted-foreground">
                                    <Calendar className="w-3 h-3" />
                                    <span className="text-xs">
                                      {format(new Date(session.date), 'MMM d, yyyy h:mm a')}
                                    </span>
                                  </div>
                                  <Badge variant="outline" className="text-xs">
                                    {session.trials.length} trials
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-2">
                                    <Progress value={session.percentCorrect} className="w-16 h-2" />
                                    <span className="text-xs font-medium w-10">
                                      {session.percentCorrect}%
                                    </span>
                                  </div>
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={() => openEditDialog(session)}
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-destructive hover:text-destructive"
                                      onClick={() => setDeleteConfirm(session.id)}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Session Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editSession ? 'Edit DTT Session' : 'Add Historical DTT Session'}
            </DialogTitle>
            <DialogDescription>
              Record trial-by-trial data for a past session
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Target Selection */}
            <div className="space-y-2">
              <Label>Skill Target *</Label>
              <Select 
                value={selectedTargetId} 
                onValueChange={setSelectedTargetId}
                disabled={!!editSession}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a skill target" />
                </SelectTrigger>
                <SelectContent>
                  {skillTargets.map(target => (
                    <SelectItem key={target.id} value={target.id}>
                      {target.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date/Time */}
            <div className="space-y-2">
              <Label>Session Date & Time *</Label>
              <Input
                type="datetime-local"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
              />
            </div>

            {/* Current Stats */}
            {trials.length > 0 && (
              <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Session Stats</span>
                  <span className="font-medium">
                    {trials.filter(t => t.isCorrect).length}/{trials.length} correct ({currentStats.percentCorrect}%)
                  </span>
                </div>
                <Progress value={currentStats.percentCorrect} className="h-2" />
                <div className="flex gap-2 text-xs">
                  <Badge variant="outline" className="bg-primary/10">
                    {currentStats.percentIndependent}% independent
                  </Badge>
                </div>
              </div>
            )}

            {/* Trial List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Trials ({trials.length})</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTrialEntry(true)}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add Trial
                </Button>
              </div>

              {trials.length > 0 && (
                <div className="max-h-48 overflow-y-auto space-y-1 border rounded-lg p-2">
                  {trials.map((trial, idx) => (
                    <div
                      key={trial.id}
                      className={`flex items-center justify-between p-2 rounded text-xs ${
                        trial.isCorrect ? 'bg-primary/10' : 'bg-destructive/10'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium w-6">#{idx + 1}</span>
                        <Badge variant={trial.isCorrect ? 'default' : 'destructive'} className="text-xs">
                          {trial.isCorrect ? 'Correct' : 'Incorrect'}
                        </Badge>
                        <span className="text-muted-foreground">
                          {PROMPT_LEVEL_LABELS[trial.promptLevel]}
                        </span>
                        {trial.errorType && (
                          <span className="text-destructive">
                            ({ERROR_TYPE_LABELS[trial.errorType]})
                          </span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => removeTrial(trial.id)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {trials.length === 0 && (
                <div className="text-center py-4 text-muted-foreground text-sm border rounded-lg">
                  No trials added yet. Click "Add Trial" to record data.
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Session Notes</Label>
              <Textarea
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                placeholder="Optional notes about this session..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!selectedTargetId || trials.length === 0}>
              <Save className="w-4 h-4 mr-2" />
              {editSession ? 'Update Session' : 'Save Session'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Trial Entry Dialog */}
      <TrialEntryDialog
        open={showTrialEntry}
        onOpenChange={setShowTrialEntry}
        onAddTrial={addTrial}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title="Delete DTT Session"
        description="Are you sure you want to delete this session? All trial data will be permanently removed."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        variant="destructive"
      />
    </>
  );
}

// Separate component for trial entry to keep state isolated
function TrialEntryDialog({
  open,
  onOpenChange,
  onAddTrial,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddTrial: (isCorrect: boolean, promptLevel: PromptLevel, errorType?: ErrorType) => void;
}) {
  const [promptLevel, setPromptLevel] = useState<PromptLevel>('verbal');
  const [errorType, setErrorType] = useState<ErrorType>('incorrect');

  const handleCorrect = () => {
    onAddTrial(true, promptLevel);
  };

  const handleIncorrect = () => {
    onAddTrial(false, promptLevel, errorType);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Trial</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Prompt Level</Label>
            <Select value={promptLevel} onValueChange={(v) => setPromptLevel(v as PromptLevel)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROMPT_LEVEL_ORDER.map(level => (
                  <SelectItem key={level} value={level}>
                    {PROMPT_LEVEL_LABELS[level]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Error Type (if incorrect)</Label>
            <Select value={errorType} onValueChange={(v) => setErrorType(v as ErrorType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(ERROR_TYPE_LABELS) as [ErrorType, string][]).map(([type, label]) => (
                  <SelectItem key={type} value={type}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              size="lg"
              className="h-14 bg-primary hover:bg-primary/90"
              onClick={handleCorrect}
            >
              <Check className="w-5 h-5 mr-2" />
              Correct
            </Button>
            <Button
              size="lg"
              variant="destructive"
              className="h-14"
              onClick={handleIncorrect}
            >
              <X className="w-5 h-5 mr-2" />
              Incorrect
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done Adding Trials
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
