import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { v4 as uuid } from 'uuid';
import {
  Plus, Pencil, Trash2, X, Check, Save, Clock,
  AlertTriangle, ChevronDown, ChevronUp,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Checkbox } from '@/components/ui/checkbox';
import { useDataStore } from '@/store/dataStore';
import {
  Session, ABCEntry, FrequencyEntry, DurationEntry,
  BehaviorFunction, FUNCTION_OPTIONS, Behavior,
} from '@/types/behavior';
import { toast } from '@/hooks/use-toast';
import { ConfirmDialog } from '@/components/ui/alert-dialog-confirm';

interface ObservationEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: Session;
  studentId: string;
}

// Common antecedents and consequences for quick selection
const COMMON_ANTECEDENTS = [
  'Demand/task presented',
  'Attention removed',
  'No attention from adults',
  'Transition/change in activity',
  'Told "no"/denied access',
  'Absence of desired activity',
  'Peer interaction',
  'Alone/unstructured time',
];

const COMMON_CONSEQUENCES = [
  'Redirected',
  'Verbal reprimand',
  'Attention provided',
  'Demand removed/escaped',
  'Desired item/activity provided',
  'Desired item/activity not provided',
  'Ignored',
  'Physical guidance',
  'Teacher did not provide attention',
];

export function ObservationEditor({ open, onOpenChange, session, studentId }: ObservationEditorProps) {
  const {
    students, abcEntries, frequencyEntries, durationEntries,
    updateSession, updateABCEntry, deleteABCEntry,
    addABCEntry, deleteFrequencyEntry, deleteDurationEntry,
    updateFrequencyEntry,
  } = useDataStore();

  const student = students.find(s => s.id === studentId);
  const behaviors = student?.behaviors || [];

  // Session metadata editing
  const [editDate, setEditDate] = useState(
    format(new Date(session.date), "yyyy-MM-dd'T'HH:mm")
  );
  const [editDuration, setEditDuration] = useState(String(session.sessionLengthMinutes));
  const [editNotes, setEditNotes] = useState(session.notes || '');

  // Current tab
  const [activeTab, setActiveTab] = useState('abc');

  // ABC editing
  const [editingAbcId, setEditingAbcId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; type: string; label: string } | null>(null);

  // New ABC entry form
  const [showNewAbc, setShowNewAbc] = useState(false);
  const [newAbcBehaviorId, setNewAbcBehaviorId] = useState('');
  const [newAbcAntecedents, setNewAbcAntecedents] = useState<string[]>([]);
  const [newAbcConsequences, setNewAbcConsequences] = useState<string[]>([]);
  const [newAbcFunctions, setNewAbcFunctions] = useState<BehaviorFunction[]>([]);
  const [newAbcCustomAnt, setNewAbcCustomAnt] = useState('');
  const [newAbcCustomCon, setNewAbcCustomCon] = useState('');
  const [newAbcFreqCount, setNewAbcFreqCount] = useState(1);
  const [newAbcHasDuration, setNewAbcHasDuration] = useState(false);
  const [newAbcDurationMin, setNewAbcDurationMin] = useState(0);

  // New frequency entry form
  const [showNewFreq, setShowNewFreq] = useState(false);
  const [newFreqBehaviorId, setNewFreqBehaviorId] = useState('');
  const [newFreqCount, setNewFreqCount] = useState(1);

  // New duration entry form
  const [showNewDur, setShowNewDur] = useState(false);
  const [newDurBehaviorId, setNewDurBehaviorId] = useState('');
  const [newDurSeconds, setNewDurSeconds] = useState(0);
  const [newDurMinutes, setNewDurMinutes] = useState(0);

  // Function editing for existing ABC
  const [editFunctions, setEditFunctions] = useState<Record<string, BehaviorFunction[]>>({});

  // Get current session data (merged global + inline)
  const sessionAbcEntries = useMemo(() => {
    const globalAbc = abcEntries.filter(e => e.studentId === studentId && e.sessionId === session.id);
    const inlineAbc = session.abcEntries?.filter(e => e.studentId === studentId) || [];
    const seen = new Set<string>();
    return [...globalAbc, ...inlineAbc].filter(e => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    });
  }, [abcEntries, session, studentId]);

  const sessionFreqEntries = useMemo(() => {
    const global = frequencyEntries.filter(e => e.studentId === studentId && e.sessionId === session.id);
    const inline = session.frequencyEntries?.filter(e => e.studentId === studentId) || [];
    const seen = new Set<string>();
    return [...global, ...inline].filter(e => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    });
  }, [frequencyEntries, session, studentId]);

  const sessionDurEntries = useMemo(() => {
    const global = durationEntries.filter(e => e.studentId === studentId && e.sessionId === session.id);
    const inline = session.durationEntries?.filter(e => e.studentId === studentId) || [];
    const seen = new Set<string>();
    return [...global, ...inline].filter(e => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    });
  }, [durationEntries, session, studentId]);

  const getBehaviorName = (behaviorId: string) => {
    return behaviors.find(b => b.id === behaviorId)?.name || 'Unknown';
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  };

  // Save session metadata
  const handleSaveMetadata = () => {
    updateSession(session.id, {
      date: new Date(editDate),
      sessionLengthMinutes: parseInt(editDuration) || 0,
      notes: editNotes,
    });
    toast({ title: 'Observation details updated' });
  };

  // Toggle function on an existing ABC entry
  const toggleAbcFunction = (entryId: string, fn: BehaviorFunction) => {
    const current = editFunctions[entryId] ||
      sessionAbcEntries.find(e => e.id === entryId)?.functions || [];
    const updated = current.includes(fn)
      ? current.filter(f => f !== fn)
      : [...current, fn];
    setEditFunctions(prev => ({ ...prev, [entryId]: updated }));
  };

  const saveAbcFunctions = (entryId: string) => {
    const fns = editFunctions[entryId];
    if (fns !== undefined) {
      updateABCEntry(entryId, { functions: fns.length > 0 ? fns : undefined });
      setEditFunctions(prev => {
        const next = { ...prev };
        delete next[entryId];
        return next;
      });
      setEditingAbcId(null);
      toast({ title: 'Functions updated' });
    }
  };

  // Add new ABC entry to this observation
  const handleAddAbc = () => {
    if (!newAbcBehaviorId) {
      toast({ title: 'Select a behavior', variant: 'destructive' });
      return;
    }
    const behaviorName = getBehaviorName(newAbcBehaviorId);
    const antecedent = [...newAbcAntecedents, ...(newAbcCustomAnt ? [newAbcCustomAnt] : [])];
    const consequence = [...newAbcConsequences, ...(newAbcCustomCon ? [newAbcCustomCon] : [])];

    addABCEntry({
      studentId,
      behaviorId: newAbcBehaviorId,
      antecedent: antecedent[0] || '',
      antecedents: antecedent.length > 1 ? antecedent : undefined,
      behavior: behaviorName,
      consequence: consequence[0] || '',
      consequences: consequence.length > 1 ? consequence : undefined,
      functions: newAbcFunctions.length > 0 ? newAbcFunctions : undefined,
      frequencyCount: newAbcFreqCount,
      hasDuration: newAbcHasDuration,
      durationMinutes: newAbcHasDuration ? newAbcDurationMin : undefined,
      sessionId: session.id,
    });

    // Reset form
    setNewAbcBehaviorId('');
    setNewAbcAntecedents([]);
    setNewAbcConsequences([]);
    setNewAbcFunctions([]);
    setNewAbcCustomAnt('');
    setNewAbcCustomCon('');
    setNewAbcFreqCount(1);
    setNewAbcHasDuration(false);
    setNewAbcDurationMin(0);
    setShowNewAbc(false);
    toast({ title: 'ABC entry added to observation' });
  };

  // Add new frequency entry
  const handleAddFreq = () => {
    if (!newFreqBehaviorId) {
      toast({ title: 'Select a behavior', variant: 'destructive' });
      return;
    }
    const { addFrequencyFromABC } = useDataStore.getState();
    // Use the store's internal method with a manual entry approach
    const entry: FrequencyEntry = {
      id: uuid(),
      studentId,
      behaviorId: newFreqBehaviorId,
      count: newFreqCount,
      timestamp: new Date(editDate),
      sessionId: session.id,
    };
    // Push directly to the store
    useDataStore.setState(state => ({
      frequencyEntries: [...state.frequencyEntries, entry],
    }));
    setNewFreqBehaviorId('');
    setNewFreqCount(1);
    setShowNewFreq(false);
    toast({ title: 'Frequency entry added to observation' });
  };

  // Add new duration entry
  const handleAddDur = () => {
    if (!newDurBehaviorId) {
      toast({ title: 'Select a behavior', variant: 'destructive' });
      return;
    }
    const totalSeconds = (newDurMinutes * 60) + newDurSeconds;
    const entry: DurationEntry = {
      id: uuid(),
      studentId,
      behaviorId: newDurBehaviorId,
      duration: totalSeconds,
      startTime: new Date(editDate),
      sessionId: session.id,
    };
    useDataStore.setState(state => ({
      durationEntries: [...state.durationEntries, entry],
    }));
    setNewDurBehaviorId('');
    setNewDurMinutes(0);
    setNewDurSeconds(0);
    setShowNewDur(false);
    toast({ title: 'Duration entry added to observation' });
  };

  const handleDeleteEntry = () => {
    if (!deleteConfirm) return;
    const { id, type } = deleteConfirm;
    if (type === 'abc') deleteABCEntry(id);
    else if (type === 'frequency') deleteFrequencyEntry(id);
    else if (type === 'duration') deleteDurationEntry(id);
    setDeleteConfirm(null);
    toast({ title: 'Entry deleted' });
  };

  const toggleAntecedent = (ant: string) => {
    setNewAbcAntecedents(prev =>
      prev.includes(ant) ? prev.filter(a => a !== ant) : [...prev, ant]
    );
  };

  const toggleConsequence = (con: string) => {
    setNewAbcConsequences(prev =>
      prev.includes(con) ? prev.filter(c => c !== con) : [...prev, con]
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-4 h-4" />
              Edit Observation — {format(new Date(session.date), 'MMM d, yyyy')}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-2">
            <div className="space-y-4 pb-4">
              {/* ── Session Metadata ── */}
              <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                <h4 className="text-sm font-medium flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Observation Details
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Date & Time</Label>
                    <Input
                      type="datetime-local"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Duration (minutes)</Label>
                    <Input
                      type="number"
                      value={editDuration}
                      onChange={(e) => setEditDuration(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Notes</Label>
                  <Textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="text-xs min-h-[50px]"
                    placeholder="Observation notes..."
                  />
                </div>
                <Button size="sm" onClick={handleSaveMetadata} className="h-7 text-xs gap-1">
                  <Save className="w-3 h-3" /> Save Details
                </Button>
              </div>

              <Separator />

              {/* ── Data Entries ── */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full">
                  <TabsTrigger value="abc" className="flex-1 text-xs">
                    ABC ({sessionAbcEntries.length})
                  </TabsTrigger>
                  <TabsTrigger value="frequency" className="flex-1 text-xs">
                    Freq ({sessionFreqEntries.length})
                  </TabsTrigger>
                  <TabsTrigger value="duration" className="flex-1 text-xs">
                    Dur ({sessionDurEntries.length})
                  </TabsTrigger>
                </TabsList>

                {/* ══ ABC TAB ══ */}
                <TabsContent value="abc" className="space-y-2 mt-2">
                  {sessionAbcEntries.length === 0 && !showNewAbc && (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No ABC entries in this observation
                    </p>
                  )}

                  {sessionAbcEntries.map(entry => {
                    const isEditing = editingAbcId === entry.id;
                    const currentFunctions = editFunctions[entry.id] ?? entry.functions ?? [];

                    return (
                      <div key={entry.id} className="p-3 bg-background border rounded-lg space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 text-xs space-y-1">
                            <p>
                              <span className="font-medium text-muted-foreground">A:</span>{' '}
                              {entry.antecedents?.join('; ') || entry.antecedent}
                            </p>
                            <p>
                              <span className="font-medium text-muted-foreground">B:</span>{' '}
                              {entry.behavior}
                              {entry.frequencyCount > 1 && ` (×${entry.frequencyCount})`}
                            </p>
                            <p>
                              <span className="font-medium text-muted-foreground">C:</span>{' '}
                              {entry.consequences?.join('; ') || entry.consequence}
                            </p>
                            <p className="text-muted-foreground">
                              {format(new Date(entry.timestamp), 'h:mm a')}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm" variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => {
                                if (isEditing) {
                                  setEditingAbcId(null);
                                } else {
                                  setEditingAbcId(entry.id);
                                  if (!editFunctions[entry.id]) {
                                    setEditFunctions(prev => ({
                                      ...prev,
                                      [entry.id]: entry.functions || [],
                                    }));
                                  }
                                }
                              }}
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm" variant="ghost"
                              className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                              onClick={() => setDeleteConfirm({
                                id: entry.id, type: 'abc',
                                label: `ABC: ${entry.behavior}`,
                              })}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>

                        {/* Function tags display */}
                        <div className="flex flex-wrap gap-1">
                          {(isEditing ? currentFunctions : (entry.functions || [])).map(fn => (
                            <Badge key={fn} variant="secondary" className="text-xs capitalize">
                              {FUNCTION_OPTIONS.find(f => f.value === fn)?.label || fn}
                            </Badge>
                          ))}
                          {!isEditing && (!entry.functions || entry.functions.length === 0) && (
                            <span className="text-xs text-amber-600 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              No functions tagged
                            </span>
                          )}
                        </div>

                        {/* Function editor */}
                        {isEditing && (
                          <div className="space-y-2 pt-1 border-t">
                            <p className="text-xs font-medium">Tag Functions:</p>
                            <div className="flex flex-wrap gap-1">
                              {FUNCTION_OPTIONS.map(fn => (
                                <Button
                                  key={fn.value}
                                  size="sm"
                                  variant={currentFunctions.includes(fn.value) ? 'default' : 'outline'}
                                  className="h-6 text-xs px-2"
                                  onClick={() => toggleAbcFunction(entry.id, fn.value)}
                                >
                                  {fn.label}
                                </Button>
                              ))}
                            </div>
                            <Button
                              size="sm" className="h-7 text-xs gap-1"
                              onClick={() => saveAbcFunctions(entry.id)}
                            >
                              <Check className="w-3 h-3" /> Save Functions
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* New ABC Entry Form */}
                  {showNewAbc ? (
                    <div className="p-3 border-2 border-dashed border-primary/30 rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-medium">New ABC Entry</h4>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0"
                          onClick={() => setShowNewAbc(false)}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>

                      {/* Behavior selection */}
                      <div>
                        <Label className="text-xs">Behavior</Label>
                        <Select value={newAbcBehaviorId} onValueChange={setNewAbcBehaviorId}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Select behavior..." />
                          </SelectTrigger>
                          <SelectContent>
                            {behaviors.map(b => (
                              <SelectItem key={b.id} value={b.id} className="text-xs">
                                {b.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Antecedents */}
                      <div>
                        <Label className="text-xs">Antecedents</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {COMMON_ANTECEDENTS.map(ant => (
                            <Button
                              key={ant} size="sm"
                              variant={newAbcAntecedents.includes(ant) ? 'default' : 'outline'}
                              className="h-6 text-xs px-2"
                              onClick={() => toggleAntecedent(ant)}
                            >
                              {ant}
                            </Button>
                          ))}
                        </div>
                        <Input
                          placeholder="Custom antecedent..."
                          value={newAbcCustomAnt}
                          onChange={(e) => setNewAbcCustomAnt(e.target.value)}
                          className="h-7 text-xs mt-1"
                        />
                      </div>

                      {/* Consequences */}
                      <div>
                        <Label className="text-xs">Consequences</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {COMMON_CONSEQUENCES.map(con => (
                            <Button
                              key={con} size="sm"
                              variant={newAbcConsequences.includes(con) ? 'default' : 'outline'}
                              className="h-6 text-xs px-2"
                              onClick={() => toggleConsequence(con)}
                            >
                              {con}
                            </Button>
                          ))}
                        </div>
                        <Input
                          placeholder="Custom consequence..."
                          value={newAbcCustomCon}
                          onChange={(e) => setNewAbcCustomCon(e.target.value)}
                          className="h-7 text-xs mt-1"
                        />
                      </div>

                      {/* Functions */}
                      <div>
                        <Label className="text-xs">Functions</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {FUNCTION_OPTIONS.map(fn => (
                            <Button
                              key={fn.value} size="sm"
                              variant={newAbcFunctions.includes(fn.value) ? 'default' : 'outline'}
                              className="h-6 text-xs px-2"
                              onClick={() => setNewAbcFunctions(prev =>
                                prev.includes(fn.value) ? prev.filter(f => f !== fn.value) : [...prev, fn.value]
                              )}
                            >
                              {fn.label}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Frequency count */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Frequency Count</Label>
                          <Input type="number" min={1} value={newAbcFreqCount}
                            onChange={(e) => setNewAbcFreqCount(parseInt(e.target.value) || 1)}
                            className="h-7 text-xs" />
                        </div>
                        <div className="flex items-end gap-2">
                          <div className="flex items-center gap-1">
                            <Checkbox
                              checked={newAbcHasDuration}
                              onCheckedChange={(c) => setNewAbcHasDuration(!!c)}
                            />
                            <Label className="text-xs">Has duration</Label>
                          </div>
                          {newAbcHasDuration && (
                            <Input type="number" min={0} value={newAbcDurationMin}
                              onChange={(e) => setNewAbcDurationMin(parseFloat(e.target.value) || 0)}
                              className="h-7 text-xs w-20" placeholder="min" />
                          )}
                        </div>
                      </div>

                      <Button size="sm" className="w-full h-8 text-xs gap-1" onClick={handleAddAbc}>
                        <Plus className="w-3 h-3" /> Add ABC Entry
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline" size="sm"
                      className="w-full h-8 text-xs gap-1 border-dashed"
                      onClick={() => setShowNewAbc(true)}
                    >
                      <Plus className="w-3 h-3" /> Add ABC Entry
                    </Button>
                  )}
                </TabsContent>

                {/* ══ FREQUENCY TAB ══ */}
                <TabsContent value="frequency" className="space-y-2 mt-2">
                  {sessionFreqEntries.length === 0 && !showNewFreq && (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No frequency entries in this observation
                    </p>
                  )}

                  {sessionFreqEntries.map(entry => (
                    <div key={entry.id} className="flex items-center justify-between p-2 bg-background border rounded">
                      <div className="text-xs">
                        <span className="font-medium">{getBehaviorName(entry.behaviorId)}</span>
                        <span className="text-muted-foreground ml-2">Count: {entry.count}</span>
                        <span className="text-muted-foreground ml-2">
                          {format(new Date(entry.timestamp), 'h:mm a')}
                        </span>
                      </div>
                      <Button
                        size="sm" variant="ghost"
                        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                        onClick={() => setDeleteConfirm({
                          id: entry.id, type: 'frequency',
                          label: `${getBehaviorName(entry.behaviorId)}: ${entry.count}`,
                        })}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}

                  {showNewFreq ? (
                    <div className="p-3 border-2 border-dashed border-primary/30 rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-medium">New Frequency Entry</h4>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0"
                          onClick={() => setShowNewFreq(false)}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Behavior</Label>
                          <Select value={newFreqBehaviorId} onValueChange={setNewFreqBehaviorId}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                            <SelectContent>
                              {behaviors.map(b => (
                                <SelectItem key={b.id} value={b.id} className="text-xs">
                                  {b.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Count</Label>
                          <Input type="number" min={1} value={newFreqCount}
                            onChange={(e) => setNewFreqCount(parseInt(e.target.value) || 1)}
                            className="h-8 text-xs" />
                        </div>
                      </div>
                      <Button size="sm" className="w-full h-8 text-xs gap-1" onClick={handleAddFreq}>
                        <Plus className="w-3 h-3" /> Add Frequency Entry
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline" size="sm"
                      className="w-full h-8 text-xs gap-1 border-dashed"
                      onClick={() => setShowNewFreq(true)}
                    >
                      <Plus className="w-3 h-3" /> Add Frequency Entry
                    </Button>
                  )}
                </TabsContent>

                {/* ══ DURATION TAB ══ */}
                <TabsContent value="duration" className="space-y-2 mt-2">
                  {sessionDurEntries.length === 0 && !showNewDur && (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No duration entries in this observation
                    </p>
                  )}

                  {sessionDurEntries.map(entry => (
                    <div key={entry.id} className="flex items-center justify-between p-2 bg-background border rounded">
                      <div className="text-xs">
                        <span className="font-medium">{getBehaviorName(entry.behaviorId)}</span>
                        <span className="text-muted-foreground ml-2">{formatDuration(entry.duration)}</span>
                        <span className="text-muted-foreground ml-2">
                          {format(new Date(entry.startTime), 'h:mm a')}
                        </span>
                      </div>
                      <Button
                        size="sm" variant="ghost"
                        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                        onClick={() => setDeleteConfirm({
                          id: entry.id, type: 'duration',
                          label: `${getBehaviorName(entry.behaviorId)}: ${formatDuration(entry.duration)}`,
                        })}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}

                  {showNewDur ? (
                    <div className="p-3 border-2 border-dashed border-primary/30 rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-medium">New Duration Entry</h4>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0"
                          onClick={() => setShowNewDur(false)}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                      <div>
                        <Label className="text-xs">Behavior</Label>
                        <Select value={newDurBehaviorId} onValueChange={setNewDurBehaviorId}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            {behaviors.map(b => (
                              <SelectItem key={b.id} value={b.id} className="text-xs">
                                {b.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Minutes</Label>
                          <Input type="number" min={0} value={newDurMinutes}
                            onChange={(e) => setNewDurMinutes(parseInt(e.target.value) || 0)}
                            className="h-8 text-xs" />
                        </div>
                        <div>
                          <Label className="text-xs">Seconds</Label>
                          <Input type="number" min={0} max={59} value={newDurSeconds}
                            onChange={(e) => setNewDurSeconds(parseInt(e.target.value) || 0)}
                            className="h-8 text-xs" />
                        </div>
                      </div>
                      <Button size="sm" className="w-full h-8 text-xs gap-1" onClick={handleAddDur}>
                        <Plus className="w-3 h-3" /> Add Duration Entry
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline" size="sm"
                      className="w-full h-8 text-xs gap-1 border-dashed"
                      onClick={() => setShowNewDur(true)}
                    >
                      <Plus className="w-3 h-3" /> Add Duration Entry
                    </Button>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>

          <DialogFooter className="pt-2 border-t">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title="Delete Entry?"
        description={`Delete "${deleteConfirm?.label}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDeleteEntry}
      />
    </>
  );
}
