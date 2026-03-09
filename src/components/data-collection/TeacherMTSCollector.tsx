import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Clock, Play, Square, Check, X, Plus, Eye, Volume2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTeacherMTS } from '@/hooks/useTeacherMTS';

interface TeacherMTSCollectorProps {
  studentId: string;
  studentName?: string;
}

export function TeacherMTSCollector({ studentId, studentName }: TeacherMTSCollectorProps) {
  const {
    definitions, activeSession, intervals, sessionHistory,
    loading, presentCount, observedPercent,
    loadDefinitions, createDefinition, startSession,
    recordInterval, endSession, loadSessionHistory,
  } = useTeacherMTS(studentId);

  const [selectedDefId, setSelectedDefId] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newBehavior, setNewBehavior] = useState('');
  const [newInterval, setNewInterval] = useState('60');
  const [newDuration, setNewDuration] = useState('15');
  const [newType, setNewType] = useState('momentary');
  const [countdown, setCountdown] = useState(0);
  const [waitingForResponse, setWaitingForResponse] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    loadDefinitions();
    loadSessionHistory();
  }, [loadDefinitions, loadSessionHistory]);

  const selectedDef = definitions.find(d => d.id === selectedDefId);

  const playTone = useCallback(() => {
    try {
      if (!audioRef.current) audioRef.current = new AudioContext();
      const ctx = audioRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.value = 0.3;
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {
      // Audio not available
    }
  }, []);

  // Countdown timer
  useEffect(() => {
    if (!activeSession || waitingForResponse) return;
    const sec = selectedDef?.interval_seconds || 60;
    setCountdown(sec);

    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          playTone();
          setWaitingForResponse(true);
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeSession, waitingForResponse, selectedDef, playTone]);

  const handleRecord = async (present: boolean) => {
    await recordInterval(present);
    setWaitingForResponse(false);

    if (activeSession && intervals.length + 1 >= (activeSession.expected_intervals || 0)) {
      await endSession();
      toast.success('Observation complete!');
      loadSessionHistory();
    }
  };

  const handleStart = async () => {
    if (!selectedDefId) return;
    const session = await startSession(selectedDefId);
    if (session) {
      toast.success('Session started — observe at each prompt');
      setWaitingForResponse(false);
    }
  };

  const handleEnd = async () => {
    await endSession();
    toast.info('Session ended');
    loadSessionHistory();
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createDefinition({
      definition_name: newName.trim(),
      behavior_name: newBehavior.trim() || null,
      interval_type: newType,
      interval_seconds: parseInt(newInterval) || 60,
      observation_duration_minutes: parseInt(newDuration) || 15,
    });
    setShowCreate(false);
    setNewName('');
    setNewBehavior('');
    toast.success('Definition created');
  };

  const progress = activeSession?.expected_intervals
    ? Math.round((intervals.length / activeSession.expected_intervals) * 100)
    : 0;

  return (
    <div className="space-y-4">
      {activeSession ? (
        /* ── Active session ── */
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary animate-pulse" />
                  {selectedDef?.interval_type === 'momentary' ? 'MTS' : selectedDef?.interval_type === 'whole' ? 'Whole Interval' : 'Partial Interval'} — Active
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  {selectedDef?.definition_name} · {selectedDef?.behavior_name || 'Behavior'}
                </CardDescription>
              </div>
              <Button variant="destructive" size="sm" className="h-7 text-xs gap-1" onClick={handleEnd}>
                <Square className="w-3 h-3" /> Stop
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{intervals.length} / {activeSession.expected_intervals} intervals</span>
                <span>{observedPercent}% present</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {waitingForResponse ? (
              <div className="text-center space-y-3 py-6">
                <Volume2 className="w-8 h-8 text-primary mx-auto animate-bounce" />
                <p className="text-sm font-semibold">Look now — is the behavior happening?</p>
                <div className="flex justify-center gap-6">
                  <Button
                    size="lg"
                    className="gap-2 px-10 h-14 text-lg bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => handleRecord(true)}
                  >
                    <Check className="w-6 h-6" /> Yes
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="gap-2 px-10 h-14 text-lg border-destructive/50 text-destructive hover:bg-destructive/10"
                    onClick={() => handleRecord(false)}
                  >
                    <X className="w-6 h-6" /> No
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-5xl font-mono font-bold text-foreground">{countdown}</p>
                <p className="text-xs text-muted-foreground mt-2">seconds until next observation</p>
              </div>
            )}

            {/* Interval results strip */}
            <div className="flex flex-wrap gap-1">
              {intervals.map((iv, i) => (
                <div
                  key={iv.id}
                  className={`w-7 h-7 rounded-md text-[11px] flex items-center justify-center font-semibold ${
                    iv.observed_present
                      ? 'bg-emerald-500/20 text-emerald-700 border border-emerald-500/30'
                      : 'bg-destructive/10 text-destructive border border-destructive/20'
                  }`}
                  title={iv.observed_present ? 'Present' : 'Absent'}
                >
                  {iv.observed_present ? '✓' : '✗'}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        /* ── Setup view ── */
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Interval Recording
            </CardTitle>
            <CardDescription className="text-xs">
              Whole interval · Partial interval · Momentary time sampling
              {studentName && ` — ${studentName}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Select Target / Behavior</Label>
              <div className="flex gap-2">
                <Select value={selectedDefId} onValueChange={setSelectedDefId}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Choose..." />
                  </SelectTrigger>
                  <SelectContent>
                    {definitions.map(d => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.definition_name} — {d.interval_type} ({d.interval_seconds}s / {d.observation_duration_minutes}min)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Dialog open={showCreate} onOpenChange={setShowCreate}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 text-xs gap-1 shrink-0">
                      <Plus className="w-3 h-3" /> New
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-sm">
                    <DialogHeader>
                      <DialogTitle className="text-base">New Interval Definition</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Name *</Label>
                        <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g., On-task during math" className="h-8 text-xs" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Behavior</Label>
                        <Input value={newBehavior} onChange={e => setNewBehavior(e.target.value)} placeholder="e.g., On-task" className="h-8 text-xs" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Interval Type</Label>
                        <Select value={newType} onValueChange={setNewType}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="whole">Whole Interval</SelectItem>
                            <SelectItem value="partial">Partial Interval</SelectItem>
                            <SelectItem value="momentary">Momentary Time Sampling</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Interval Length</Label>
                          <Select value={newInterval} onValueChange={setNewInterval}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="10">10 sec</SelectItem>
                              <SelectItem value="15">15 sec</SelectItem>
                              <SelectItem value="30">30 sec</SelectItem>
                              <SelectItem value="60">1 min</SelectItem>
                              <SelectItem value="120">2 min</SelectItem>
                              <SelectItem value="300">5 min</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Observation Duration</Label>
                          <Select value={newDuration} onValueChange={setNewDuration}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="5">5 min</SelectItem>
                              <SelectItem value="10">10 min</SelectItem>
                              <SelectItem value="15">15 min</SelectItem>
                              <SelectItem value="20">20 min</SelectItem>
                              <SelectItem value="30">30 min</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <Button size="sm" className="w-full text-xs" onClick={handleCreate}>Create</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {selectedDef && (
              <div className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium">{selectedDef.definition_name}</p>
                  <Badge variant="secondary" className="text-[10px] capitalize">{selectedDef.interval_type}</Badge>
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>⏱ Every {selectedDef.interval_seconds}s</span>
                  <span>🕐 {selectedDef.observation_duration_minutes} min total</span>
                  <span>📊 {Math.floor((selectedDef.observation_duration_minutes * 60) / selectedDef.interval_seconds)} intervals</span>
                </div>
                {selectedDef.interval_type === 'momentary' && (
                  <p className="text-[10px] text-muted-foreground italic">
                    Momentary: observe only at the moment each interval ends
                  </p>
                )}
                <Button size="sm" className="w-full gap-1 text-xs mt-1" onClick={handleStart}>
                  <Play className="w-3 h-3" /> Start Session
                </Button>
              </div>
            )}

            {/* History */}
            {sessionHistory.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-border/50">
                <p className="text-xs font-medium text-muted-foreground">Recent Sessions</p>
                {sessionHistory.slice(0, 5).map(s => (
                  <div key={s.session_id} className="flex items-center justify-between px-2 py-1.5 rounded border border-border/30 bg-card text-xs">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] capitalize">{s.interval_type}</Badge>
                      <span className="text-muted-foreground">
                        {s.started_at ? new Date(s.started_at).toLocaleDateString() : '—'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>{s.observed_present}/{s.intervals_completed}</span>
                      <Badge variant="secondary" className="text-[10px]">
                        {s.observed_percent}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
