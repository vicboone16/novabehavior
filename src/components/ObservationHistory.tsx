import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Clock, Eye, ChevronDown, ChevronUp, FileText, Trash2, Pencil, Merge, Check, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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
import { useDataStore } from '@/store/dataStore';
import { ConfirmDialog } from '@/components/ui/alert-dialog-confirm';
import { Session } from '@/types/behavior';
import { toast } from '@/hooks/use-toast';

interface ObservationHistoryProps {
  studentId: string;
}

export function ObservationHistory({ studentId }: ObservationHistoryProps) {
  const { sessions, students, abcEntries, frequencyEntries, durationEntries, intervalEntries, deleteSession, updateSession, mergeSessions, deleteFrequencyEntry, deleteDurationEntry, deleteABCEntry } = useDataStore();
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editDuration, setEditDuration] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteEntryConfirm, setDeleteEntryConfirm] = useState<{ id: string; type: 'frequency' | 'duration' | 'abc' | 'interval'; label: string } | null>(null);
  const [mergeMode, setMergeMode] = useState(false);
  const [mergeSelected, setMergeSelected] = useState<string[]>([]);

  const student = students.find(s => s.id === studentId);

  const observationSessions = useMemo(() => {
    return sessions
      .filter(session => {
        if (!session.studentIds?.includes(studentId)) return false;
        // Filter out empty/false sessions - must have actual behavioral data
        // Check both global store entries AND inline session entries
        const hasAbcData = abcEntries.some(e => e.studentId === studentId && e.sessionId === session.id);
        const hasFreqData = frequencyEntries.some(e => e.studentId === studentId && e.sessionId === session.id)
          || (session.frequencyEntries?.some(e => e.studentId === studentId) ?? false);
        const hasDurData = durationEntries.some(e => e.studentId === studentId && e.sessionId === session.id)
          || (session.durationEntries?.some(e => e.studentId === studentId) ?? false);
        const hasIntData = intervalEntries.some(e => e.studentId === studentId && e.sessionId === session.id)
          || (session.intervalEntries?.some(e => e.studentId === studentId) ?? false);
        return hasAbcData || hasFreqData || hasDurData || hasIntData;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sessions, studentId, abcEntries, frequencyEntries, durationEntries, intervalEntries]);

  const getSessionData = (session: Session) => {
    const sessionFrequency = session.frequencyEntries?.filter(e => e.studentId === studentId) || [];
    const sessionABC = abcEntries.filter(e => 
      e.studentId === studentId && 
      e.sessionId === session.id
    );
    const sessionIntervals = session.intervalEntries?.filter(e => e.studentId === studentId) || [];
    const sessionDuration = session.durationEntries?.filter(e => e.studentId === studentId) || [];

    return {
      frequencyCount: sessionFrequency.reduce((sum, e) => sum + e.count, 0),
      abcCount: sessionABC.length,
      intervalCount: sessionIntervals.length,
      durationSeconds: sessionDuration.reduce((sum, e) => sum + e.duration, 0),
      frequencyEntries: sessionFrequency,
      abcEntries: sessionABC,
    };
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  };

  const handleStartEdit = (session: Session) => {
    setEditingSessionId(session.id);
    setEditDate(format(new Date(session.date), "yyyy-MM-dd'T'HH:mm"));
    setEditDuration(String(session.sessionLengthMinutes));
    setEditNotes(session.notes || '');
  };

  const handleSaveEdit = (sessionId: string) => {
    updateSession(sessionId, {
      date: new Date(editDate),
      sessionLengthMinutes: parseInt(editDuration) || 0,
      notes: editNotes,
    });
    setEditingSessionId(null);
    toast({ title: 'Observation updated' });
  };

  const handleDelete = (sessionId: string) => {
    deleteSession(sessionId);
    setDeleteConfirmId(null);
    toast({ title: 'Observation deleted' });
  };

  const handleMerge = () => {
    if (mergeSelected.length < 2) {
      toast({ title: 'Select at least 2 observations to merge', variant: 'destructive' });
      return;
    }
    mergeSessions(mergeSelected);
    setMergeMode(false);
    setMergeSelected([]);
    toast({ title: `Merged ${mergeSelected.length} observations into one` });
  };

  const toggleMergeSelect = (id: string) => {
    setMergeSelected(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  if (observationSessions.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <Eye className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-muted-foreground">No observation history</p>
          <p className="text-xs text-muted-foreground mt-1">
            Start an observation to begin collecting data
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Observation History
              <Badge variant="secondary">{observationSessions.length}</Badge>
            </CardTitle>
            <div className="flex items-center gap-1">
              {mergeMode ? (
                <>
                  <Button size="sm" variant="default" onClick={handleMerge} disabled={mergeSelected.length < 2} className="gap-1 h-7 text-xs">
                    <Merge className="w-3 h-3" /> Merge ({mergeSelected.length})
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setMergeMode(false); setMergeSelected([]); }} className="h-7 text-xs">
                    Cancel
                  </Button>
                </>
              ) : (
                observationSessions.length >= 2 && (
                  <Button size="sm" variant="outline" onClick={() => setMergeMode(true)} className="gap-1 h-7 text-xs">
                    <Merge className="w-3 h-3" /> Merge
                  </Button>
                )
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2">
              {observationSessions.slice(0, 20).map((session) => {
                const data = getSessionData(session);
                const isExpanded = expandedSessionId === session.id;
                const isEditing = editingSessionId === session.id;
                const sessionDate = new Date(session.date);

                return (
                  <Collapsible
                    key={session.id}
                    open={isExpanded}
                    onOpenChange={() => !mergeMode && setExpandedSessionId(isExpanded ? null : session.id)}
                  >
                    <div className="flex items-center gap-2">
                      {mergeMode && (
                        <Checkbox
                          checked={mergeSelected.includes(session.id)}
                          onCheckedChange={() => toggleMergeSelect(session.id)}
                        />
                      )}
                      <CollapsibleTrigger asChild>
                        <div className="flex-1 flex items-center justify-between p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted/80 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="p-1.5 rounded bg-background">
                              <Eye className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">
                                {format(sessionDate, 'MMM d, yyyy')}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(sessionDate, 'h:mm a')} • {session.sessionLengthMinutes}min session
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1">
                              {data.frequencyCount > 0 && (
                                <Badge variant="outline" className="text-xs">{data.frequencyCount} freq</Badge>
                              )}
                              {data.abcCount > 0 && (
                                <Badge variant="outline" className="text-xs">{data.abcCount} ABC</Badge>
                              )}
                              {data.intervalCount > 0 && (
                                <Badge variant="outline" className="text-xs">{data.intervalCount} int</Badge>
                              )}
                            </div>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </CollapsibleTrigger>
                    </div>
                    <CollapsibleContent className="px-3 pb-3">
                      <div className="mt-2 space-y-3 pl-10">
                        {/* Action buttons */}
                        <div className="flex gap-1">
                          {!isEditing ? (
                            <>
                              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => handleStartEdit(session)}>
                                <Pencil className="w-3 h-3" /> Edit
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-destructive hover:text-destructive" onClick={() => setDeleteConfirmId(session.id)}>
                                <Trash2 className="w-3 h-3" /> Delete
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button size="sm" variant="default" className="h-7 text-xs gap-1" onClick={() => handleSaveEdit(session.id)}>
                                <Check className="w-3 h-3" /> Save
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => setEditingSessionId(null)}>
                                <X className="w-3 h-3" /> Cancel
                              </Button>
                            </>
                          )}
                        </div>

                        {/* Edit form */}
                        {isEditing && (
                          <div className="space-y-2 p-3 bg-background rounded border">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-xs font-medium text-muted-foreground">Date & Time</label>
                                <Input
                                  type="datetime-local"
                                  value={editDate}
                                  onChange={(e) => setEditDate(e.target.value)}
                                  className="h-8 text-xs"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-medium text-muted-foreground">Duration (minutes)</label>
                                <Input
                                  type="number"
                                  value={editDuration}
                                  onChange={(e) => setEditDuration(e.target.value)}
                                  className="h-8 text-xs"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-muted-foreground">Notes</label>
                              <Textarea
                                value={editNotes}
                                onChange={(e) => setEditNotes(e.target.value)}
                                className="text-xs min-h-[60px]"
                                placeholder="Session notes..."
                              />
                            </div>
                          </div>
                        )}

                        {/* Data Summary */}
                        {!isEditing && (
                          <>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
                              <div className="p-2 bg-background rounded">
                                <p className="text-lg font-bold">{data.frequencyCount}</p>
                                <p className="text-xs text-muted-foreground">Frequency</p>
                              </div>
                              <div className="p-2 bg-background rounded">
                                <p className="text-lg font-bold">{data.abcCount}</p>
                                <p className="text-xs text-muted-foreground">ABC Entries</p>
                              </div>
                              <div className="p-2 bg-background rounded">
                                <p className="text-lg font-bold">{data.intervalCount}</p>
                                <p className="text-xs text-muted-foreground">Intervals</p>
                              </div>
                              <div className="p-2 bg-background rounded">
                                <p className="text-lg font-bold">{formatDuration(data.durationSeconds)}</p>
                                <p className="text-xs text-muted-foreground">Duration</p>
                              </div>
                            </div>

                            {/* Behavior breakdown */}
                            {data.frequencyEntries.length > 0 && (
                              <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">Behavior Breakdown</p>
                                <div className="flex flex-wrap gap-1">
                                  {data.frequencyEntries.map((entry, idx) => {
                                    const behavior = student?.behaviors.find(b => b.id === entry.behaviorId);
                                    return (
                                      <Badge key={idx} variant="secondary" className="text-xs gap-1 pr-1">
                                        {behavior?.name || 'Unknown'}: {entry.count}
                                        <button
                                          className="ml-1 rounded-full hover:bg-destructive/20 p-0.5"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setDeleteEntryConfirm({ id: entry.id, type: 'frequency', label: `${behavior?.name || 'Unknown'}: ${entry.count}` });
                                          }}
                                        >
                                          <X className="w-3 h-3 text-destructive" />
                                        </button>
                                      </Badge>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* ABC summary */}
                            {data.abcEntries.length > 0 && (
                              <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">ABC Entries</p>
                                <div className="text-xs text-muted-foreground space-y-1">
                                  {data.abcEntries.map((entry, idx) => (
                                    <div key={idx} className="flex items-start justify-between gap-1 bg-background p-2 rounded">
                                      <p className="truncate flex-1">
                                        A: {entry.antecedent} → B: {entry.behavior} → C: {entry.consequence}
                                      </p>
                                      <button
                                        className="shrink-0 rounded-full hover:bg-destructive/20 p-0.5"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setDeleteEntryConfirm({ id: entry.id, type: 'abc', label: `ABC: ${entry.behavior}` });
                                        }}
                                      >
                                        <X className="w-3 h-3 text-destructive" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Session notes */}
                            {session.notes && (
                              <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                  <FileText className="w-3 h-3" />
                                  Notes
                                </p>
                                <p className="text-xs text-muted-foreground bg-background p-2 rounded">
                                  {session.notes}
                                </p>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}

              {observationSessions.length > 20 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  + {observationSessions.length - 20} more observations
                </p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Delete session confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Observation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this observation and all associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete individual entry confirmation */}
      <ConfirmDialog
        open={!!deleteEntryConfirm}
        onOpenChange={(open) => !open && setDeleteEntryConfirm(null)}
        title="Delete Entry?"
        description={`Are you sure you want to delete "${deleteEntryConfirm?.label}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => {
          if (!deleteEntryConfirm) return;
          const { id, type } = deleteEntryConfirm;
          if (type === 'frequency') deleteFrequencyEntry(id);
          else if (type === 'duration') deleteDurationEntry(id);
          else if (type === 'abc') deleteABCEntry(id);
          setDeleteEntryConfirm(null);
          toast({ title: 'Entry deleted' });
        }}
      />
    </>
  );
}
