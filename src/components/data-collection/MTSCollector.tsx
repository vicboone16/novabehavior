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
import { useMTS, type MTSDefinition } from '@/hooks/useMTS';

interface MTSCollectorProps {
  studentId: string;
  studentName?: string;
  isTeacher?: boolean;
}

export function MTSCollector({ studentId, studentName, isTeacher = false }: MTSCollectorProps) {
  const {
    definitions, activeSession, intervals, loading,
    loadDefinitions, createDefinition, startSession,
    recordInterval, endSession, loadSessionHistory, sessions,
  } = useMTS(studentId);

  const [selectedDefId, setSelectedDefId] = useState<string>('');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newBehavior, setNewBehavior] = useState('');
  const [newInterval, setNewInterval] = useState('60');
  const [newDuration, setNewDuration] = useState('15');
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

  // Timer countdown
  useEffect(() => {
    if (!activeSession || waitingForResponse) return;
    const intervalSec = selectedDef?.interval_seconds || 60;
    setCountdown(intervalSec);

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

    // Check if session is complete
    if (activeSession && intervals.length + 1 >= activeSession.expected_intervals) {
      await endSession();
      toast.success('MTS session complete!');
      loadSessionHistory();
    }
  };

  const handleStart = async () => {
    if (!selectedDefId) return;
    const session = await startSession(selectedDefId);
    if (session) {
      toast.success('MTS session started');
      setWaitingForResponse(false);
    }
  };

  const handleEnd = async () => {
    await endSession();
    toast.info('Session ended early');
    loadSessionHistory();
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createDefinition({
      definition_name: newName.trim(),
      behavior_name: newBehavior.trim() || null,
      interval_seconds: parseInt(newInterval) || 60,
      observation_duration_minutes: parseInt(newDuration) || 15,
      audience: isTeacher ? 'teacher' : 'all',
    });
    setShowCreate(false);
    setNewName('');
    setNewBehavior('');
    toast.success('MTS definition created');
  };

  const progress = activeSession
    ? Math.round((intervals.length / activeSession.expected_intervals) * 100)
    : 0;
  const presentCount = intervals.filter(i => i.observed_present).length;
  const observedPct = intervals.length > 0
    ? Math.round((presentCount / intervals.length) * 100)
    : 0;

  return (
    <div className="space-y-4">
      {/* Active session view */}
      {activeSession ? (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  MTS Session Active
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  {selectedDef?.definition_name} — {selectedDef?.behavior_name || 'Behavior'}
                </CardDescription>
              </div>
              <Button variant="destructive" size="sm" className="h-7 text-xs gap-1" onClick={handleEnd}>
                <Square className="w-3 h-3" /> End
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Progress */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{intervals.length} / {activeSession.expected_intervals} intervals</span>
                <span>{observedPct}% observed</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {/* Countdown or response prompt */}
            {waitingForResponse ? (
              <div className="text-center space-y-3 py-4">
                <div className="flex items-center justify-center gap-2">
                  <Volume2 className="w-5 h-5 text-primary animate-pulse" />
                  <p className="text-sm font-medium">Is the behavior occurring?</p>
                </div>
                <div className="flex justify-center gap-4">
                  <Button
                    size="lg"
                    className="gap-2 px-8 bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => handleRecord(true)}
                  >
                    <Check className="w-5 h-5" /> Present
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="gap-2 px-8 border-destructive/50 text-destructive hover:bg-destructive/10"
                    onClick={() => handleRecord(false)}
                  >
                    <X className="w-5 h-5" /> Absent
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-3xl font-mono font-bold text-foreground">{countdown}s</p>
                <p className="text-xs text-muted-foreground mt-1">until next interval</p>
              </div>
            )}

            {/* Live interval strip */}
            <div className="flex flex-wrap gap-1">
              {intervals.map((iv, i) => (
                <div
                  key={iv.id}
                  className={`w-6 h-6 rounded text-[10px] flex items-center justify-center font-medium ${
                    iv.observed_present
                      ? 'bg-emerald-500/20 text-emerald-700 border border-emerald-500/30'
                      : 'bg-destructive/10 text-destructive border border-destructive/20'
                  }`}
                >
                  {i + 1}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Setup view */
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Momentary Time Sampling
            </CardTitle>
            <CardDescription className="text-xs">
              {isTeacher ? 'Quick classroom observation tool' : 'Systematic interval observation'}
              {studentName && ` — ${studentName}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Select MTS Target</Label>
              <div className="flex gap-2">
                <Select value={selectedDefId} onValueChange={setSelectedDefId}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Choose a target..." />
                  </SelectTrigger>
                  <SelectContent>
                    {definitions.map(d => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.definition_name} ({d.interval_seconds}s / {d.observation_duration_minutes}min)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Dialog open={showCreate} onOpenChange={setShowCreate}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                      <Plus className="w-3 h-3" /> New
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-sm">
                    <DialogHeader>
                      <DialogTitle className="text-base">New MTS Definition</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Definition Name *</Label>
                        <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g., On-task behavior" className="h-8 text-xs" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Behavior Name</Label>
                        <Input value={newBehavior} onChange={e => setNewBehavior(e.target.value)} placeholder="e.g., On-task" className="h-8 text-xs" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Interval (seconds)</Label>
                          <Select value={newInterval} onValueChange={setNewInterval}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="10">10s</SelectItem>
                              <SelectItem value="15">15s</SelectItem>
                              <SelectItem value="30">30s</SelectItem>
                              <SelectItem value="60">60s</SelectItem>
                              <SelectItem value="120">2 min</SelectItem>
                              <SelectItem value="300">5 min</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Duration (minutes)</Label>
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
                      <Button size="sm" className="w-full text-xs" onClick={handleCreate}>Create Definition</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {selectedDef && (
              <div className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium">{selectedDef.definition_name}</p>
                  <Badge variant="outline" className="text-[10px]">{selectedDef.behavior_name || 'Behavior'}</Badge>
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>⏱ {selectedDef.interval_seconds}s intervals</span>
                  <span>🕐 {selectedDef.observation_duration_minutes} min observation</span>
                  <span>📊 {Math.floor((selectedDef.observation_duration_minutes * 60) / selectedDef.interval_seconds)} intervals</span>
                </div>
                <Button size="sm" className="w-full gap-1 text-xs mt-1" onClick={handleStart}>
                  <Play className="w-3 h-3" /> Start MTS Session
                </Button>
              </div>
            )}

            {/* Session history */}
            {sessions.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-border/50">
                <p className="text-xs font-medium text-muted-foreground">Recent Sessions</p>
                {sessions.slice(0, 5).map(s => (
                  <div key={s.session_id} className="flex items-center justify-between px-2 py-1.5 rounded border border-border/30 bg-card">
                    <div className="flex items-center gap-2">
                      <span className="text-xs">{s.definition_name}</span>
                      <span className="text-[10px] text-muted-foreground">{s.session_date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px]">
                        {s.observed_percent}% observed
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {s.present_count}/{s.completed_intervals}
                      </span>
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
