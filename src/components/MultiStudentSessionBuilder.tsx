import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useDataStore } from '@/store/dataStore';
import { useToast } from '@/hooks/use-toast';
import type { DataCollectionMethod } from '@/types/behavior';
import { Users, Settings2, ChevronDown, ChevronRight } from 'lucide-react';

const METHODS: { value: DataCollectionMethod; label: string }[] = [
  { value: 'frequency', label: 'Frequency' },
  { value: 'duration', label: 'Duration' },
  { value: 'interval', label: 'Interval' },
  { value: 'abc', label: 'ABC' },
  { value: 'latency', label: 'Latency' },
];

type IntervalType = 'whole' | 'partial' | 'momentary';
type FrequencyMode = 'occurrence' | 'bouts';
type DurationMode = 'cumulative' | 'per_episode';

interface BehaviorConfig {
  methods: DataCollectionMethod[];
  interval: { type: IntervalType; samplingSec: number; intervalSec: number; totalMin: number; sync: boolean };
  frequency: { mode: FrequencyMode; minIrtSec: number };
  duration: { mode: DurationMode; autoStopSec: number };
}

const defaultConfig = (): BehaviorConfig => ({
  methods: ['frequency'],
  interval: { type: 'momentary', samplingSec: 30, intervalSec: 30, totalMin: 15, sync: true },
  frequency: { mode: 'occurrence', minIrtSec: 0 },
  duration: { mode: 'cumulative', autoStopSec: 0 },
});

const key = (sid: string, bid: string) => `${sid}::${bid}`;

export function MultiStudentSessionBuilder() {
  const { toast } = useToast();
  const students = useDataStore((s) => s.students);
  const selectStudent = useDataStore((s) => s.toggleStudentSelection);
  const selectedStudentIds = useDataStore((s) => s.selectedStudentIds);
  const addBehaviorWithMethods = useDataStore((s) => s.addBehaviorWithMethods);
  const updateBehaviorMethods = useDataStore((s) => s.updateBehaviorMethods);

  const [open, setOpen] = useState(false);
  const [chosenStudents, setChosenStudents] = useState<string[]>([]);
  const [chosenBehaviors, setChosenBehaviors] = useState<Record<string, string[]>>({}); // sid -> behaviorId[]
  const [configs, setConfigs] = useState<Record<string, BehaviorConfig>>({}); // sid::bid -> config
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const activeStudents = useMemo(() => students.filter((s) => !s.isArchived), [students]);

  const toggleStudent = (sid: string) => {
    setChosenStudents((prev) => (prev.includes(sid) ? prev.filter((x) => x !== sid) : [...prev, sid]));
    setExpanded((p) => ({ ...p, [sid]: true }));
  };

  const toggleBehavior = (sid: string, bid: string) => {
    setChosenBehaviors((prev) => {
      const cur = prev[sid] || [];
      const next = cur.includes(bid) ? cur.filter((x) => x !== bid) : [...cur, bid];
      return { ...prev, [sid]: next };
    });
    const k = key(sid, bid);
    setConfigs((prev) => (prev[k] ? prev : { ...prev, [k]: defaultConfig() }));
  };

  const updateConfig = (sid: string, bid: string, updater: (c: BehaviorConfig) => BehaviorConfig) => {
    const k = key(sid, bid);
    setConfigs((prev) => ({ ...prev, [k]: updater(prev[k] || defaultConfig()) }));
  };

  const totalPairs = chosenStudents.reduce((acc, sid) => acc + (chosenBehaviors[sid]?.length || 0), 0);

  const handleStart = () => {
    if (chosenStudents.length === 0 || totalPairs === 0) return;

    // Persist per-behavior method config + select students for the active workspace
    chosenStudents.forEach((sid) => {
      if (!selectedStudentIds.includes(sid)) selectStudent(sid);
      const student = students.find((s) => s.id === sid);
      (chosenBehaviors[sid] || []).forEach((bid) => {
        const cfg = configs[key(sid, bid)] || defaultConfig();
        const existing = student?.behaviors.find((b) => b.id === bid);
        if (existing) {
          updateBehaviorMethods(sid, bid, cfg.methods);
        } else {
          // Fallback: shouldn't normally hit (ids come from student.behaviors)
          addBehaviorWithMethods(sid, 'New Behavior', cfg.methods);
        }
      });
    });

    // Stash builder configs in localStorage so trackers can pick up overrides
    try {
      localStorage.setItem('multiStudentSessionConfig', JSON.stringify({ at: Date.now(), configs }));
    } catch {}

    toast({
      title: 'Session started',
      description: `${chosenStudents.length} student(s), ${totalPairs} behavior(s) configured.`,
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 shrink-0">
          <Users className="w-4 h-4" />
          <span className="hidden sm:inline">Multi-Student Session</span>
          <span className="sm:hidden">Multi</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>New Multi-Student Session</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Stage 1 */}
          <section className="space-y-2">
            <Label className="text-sm font-semibold">1. Select Students</Label>
            <div className="border rounded-lg p-2 max-h-48 overflow-y-auto">
              {activeStudents.length === 0 ? (
                <p className="text-sm text-muted-foreground p-2">No active students.</p>
              ) : (
                activeStudents.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer">
                    <Checkbox
                      checked={chosenStudents.includes(s.id)}
                      onCheckedChange={() => toggleStudent(s.id)}
                    />
                    <span className="text-sm">{s.displayName || s.name}</span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {s.behaviors.length} behavior(s)
                    </span>
                  </label>
                ))
              )}
            </div>
          </section>

          {/* Stage 2 + 3: per student */}
          {chosenStudents.length > 0 && (
            <section className="space-y-2">
              <Label className="text-sm font-semibold">2. Choose Behaviors & Configure</Label>
              <div className="space-y-3">
                {chosenStudents.map((sid) => {
                  const student = students.find((s) => s.id === sid);
                  if (!student) return null;
                  const isOpen = expanded[sid] !== false;
                  return (
                    <div key={sid} className="border rounded-lg">
                      <button
                        type="button"
                        className="w-full flex items-center gap-2 p-3 text-left hover:bg-muted/30"
                        onClick={() => setExpanded((p) => ({ ...p, [sid]: !isOpen }))}
                      >
                        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        <span className="font-medium text-sm">{student.displayName || student.name}</span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {(chosenBehaviors[sid] || []).length}/{student.behaviors.length} selected
                        </span>
                      </button>
                      {isOpen && (
                        <div className="p-3 pt-0 space-y-2">
                          {student.behaviors.length === 0 ? (
                            <p className="text-xs text-muted-foreground py-2">
                              No behaviors. Use Manage Behaviors to add some first.
                            </p>
                          ) : (
                            student.behaviors.filter((b) => !b.isArchived).map((b) => {
                              const isChosen = (chosenBehaviors[sid] || []).includes(b.id);
                              const cfg = configs[key(sid, b.id)] || defaultConfig();
                              return (
                                <div key={b.id} className="border rounded-md">
                                  <label className="flex items-center gap-2 p-2 cursor-pointer">
                                    <Checkbox
                                      checked={isChosen}
                                      onCheckedChange={() => toggleBehavior(sid, b.id)}
                                    />
                                    <span className="text-sm flex-1">{b.name}</span>
                                    {isChosen && <Settings2 className="w-3 h-3 text-muted-foreground" />}
                                  </label>
                                  {isChosen && (
                                    <div className="px-3 pb-3 space-y-3 border-t bg-muted/20">
                                      {/* Methods */}
                                      <div className="pt-3">
                                        <Label className="text-xs">Methods</Label>
                                        <div className="flex flex-wrap gap-2 mt-1">
                                          {METHODS.map((m) => (
                                            <label key={m.value} className="flex items-center gap-1 text-xs cursor-pointer">
                                              <Checkbox
                                                checked={cfg.methods.includes(m.value)}
                                                onCheckedChange={() =>
                                                  updateConfig(sid, b.id, (c) => ({
                                                    ...c,
                                                    methods: c.methods.includes(m.value)
                                                      ? c.methods.filter((x) => x !== m.value)
                                                      : [...c.methods, m.value],
                                                  }))
                                                }
                                              />
                                              {m.label}
                                            </label>
                                          ))}
                                        </div>
                                      </div>

                                      {/* Interval config */}
                                      {cfg.methods.includes('interval') && (
                                        <div className="grid grid-cols-2 gap-2 p-2 bg-background rounded border">
                                          <div className="col-span-2 text-xs font-semibold text-muted-foreground">Interval</div>
                                          <div>
                                            <Label className="text-xs">Type</Label>
                                            <Select
                                              value={cfg.interval.type}
                                              onValueChange={(v: IntervalType) =>
                                                updateConfig(sid, b.id, (c) => ({ ...c, interval: { ...c.interval, type: v } }))
                                              }
                                            >
                                              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="whole">Whole</SelectItem>
                                                <SelectItem value="partial">Partial</SelectItem>
                                                <SelectItem value="momentary">Momentary</SelectItem>
                                              </SelectContent>
                                            </Select>
                                          </div>
                                          <div>
                                            <Label className="text-xs">Sampling (sec)</Label>
                                            <Input
                                              type="number"
                                              className="h-8"
                                              value={cfg.interval.samplingSec}
                                              onChange={(e) =>
                                                updateConfig(sid, b.id, (c) => ({
                                                  ...c,
                                                  interval: { ...c.interval, samplingSec: Number(e.target.value) },
                                                }))
                                              }
                                            />
                                          </div>
                                          <div>
                                            <Label className="text-xs">Interval (sec)</Label>
                                            <Input
                                              type="number"
                                              className="h-8"
                                              value={cfg.interval.intervalSec}
                                              onChange={(e) =>
                                                updateConfig(sid, b.id, (c) => ({
                                                  ...c,
                                                  interval: { ...c.interval, intervalSec: Number(e.target.value) },
                                                }))
                                              }
                                            />
                                          </div>
                                          <div>
                                            <Label className="text-xs">Total (min)</Label>
                                            <Input
                                              type="number"
                                              className="h-8"
                                              value={cfg.interval.totalMin}
                                              onChange={(e) =>
                                                updateConfig(sid, b.id, (c) => ({
                                                  ...c,
                                                  interval: { ...c.interval, totalMin: Number(e.target.value) },
                                                }))
                                              }
                                            />
                                          </div>
                                          <div className="col-span-2 flex items-center justify-between">
                                            <Label className="text-xs">Sync with other students</Label>
                                            <Switch
                                              checked={cfg.interval.sync}
                                              onCheckedChange={(v) =>
                                                updateConfig(sid, b.id, (c) => ({ ...c, interval: { ...c.interval, sync: v } }))
                                              }
                                            />
                                          </div>
                                        </div>
                                      )}

                                      {/* Frequency config */}
                                      {cfg.methods.includes('frequency') && (
                                        <div className="grid grid-cols-2 gap-2 p-2 bg-background rounded border">
                                          <div className="col-span-2 text-xs font-semibold text-muted-foreground">Frequency</div>
                                          <div>
                                            <Label className="text-xs">Count rule</Label>
                                            <Select
                                              value={cfg.frequency.mode}
                                              onValueChange={(v: FrequencyMode) =>
                                                updateConfig(sid, b.id, (c) => ({ ...c, frequency: { ...c.frequency, mode: v } }))
                                              }
                                            >
                                              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="occurrence">Per occurrence</SelectItem>
                                                <SelectItem value="bouts">Bouts (IRT)</SelectItem>
                                              </SelectContent>
                                            </Select>
                                          </div>
                                          {cfg.frequency.mode === 'bouts' && (
                                            <div>
                                              <Label className="text-xs">Min IRT (sec)</Label>
                                              <Input
                                                type="number"
                                                className="h-8"
                                                value={cfg.frequency.minIrtSec}
                                                onChange={(e) =>
                                                  updateConfig(sid, b.id, (c) => ({
                                                    ...c,
                                                    frequency: { ...c.frequency, minIrtSec: Number(e.target.value) },
                                                  }))
                                                }
                                              />
                                            </div>
                                          )}
                                        </div>
                                      )}

                                      {/* Duration config */}
                                      {cfg.methods.includes('duration') && (
                                        <div className="grid grid-cols-2 gap-2 p-2 bg-background rounded border">
                                          <div className="col-span-2 text-xs font-semibold text-muted-foreground">Duration</div>
                                          <div>
                                            <Label className="text-xs">Stopwatch</Label>
                                            <Select
                                              value={cfg.duration.mode}
                                              onValueChange={(v: DurationMode) =>
                                                updateConfig(sid, b.id, (c) => ({ ...c, duration: { ...c.duration, mode: v } }))
                                              }
                                            >
                                              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="cumulative">Cumulative</SelectItem>
                                                <SelectItem value="per_episode">Per episode</SelectItem>
                                              </SelectContent>
                                            </Select>
                                          </div>
                                          <div>
                                            <Label className="text-xs">Auto-stop (sec, 0=off)</Label>
                                            <Input
                                              type="number"
                                              className="h-8"
                                              value={cfg.duration.autoStopSec}
                                              onChange={(e) =>
                                                updateConfig(sid, b.id, (c) => ({
                                                  ...c,
                                                  duration: { ...c.duration, autoStopSec: Number(e.target.value) },
                                                }))
                                              }
                                            />
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        <div className="flex justify-between items-center pt-3 border-t">
          <span className="text-xs text-muted-foreground">
            {chosenStudents.length} student(s) · {totalPairs} behavior(s)
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleStart} disabled={totalPairs === 0}>
              Start Session
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
