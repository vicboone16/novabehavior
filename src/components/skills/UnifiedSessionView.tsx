/**
 * UnifiedSessionView
 * 
 * Displays a complete session showing BOTH behavior data AND skill acquisition
 * data together, with tabs to filter between them.
 */

import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import {
  BarChart3,
  Activity,
  Target,
  Clock,
  Calendar,
  Download,
  ChevronDown,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';

interface SessionMeta {
  id: string;
  name: string;
  startTime: string;
  endTime: string | null;
  status: string;
  notes: string | null;
  userId: string;
  studentId: string | null;
}

interface BehaviorDataRow {
  id: string;
  behaviorId: string;
  behaviorName: string;
  frequency: number | null;
  durationSeconds: number | null;
  latencySeconds: number | null;
  dataState: string;
  notes: string | null;
}

interface TargetTrialRow {
  id: string;
  targetId: string;
  targetName: string;
  programName: string;
  programMethod: string;
  trialIndex: number;
  outcome: string;
  promptLevelId: string | null;
  promptLevelName: string;
  promptSuccess: boolean;
  recordedAt: string;
  sessionType: string;
  notes: string | null;
}

interface TargetSummary {
  targetId: string;
  targetName: string;
  programName: string;
  method: string;
  total: number;
  correct: number;
  independent: number;
  percentCorrect: number;
  percentIndependent: number;
}

interface UnifiedSessionViewProps {
  studentId: string;
  sessionId?: string;
  mode?: 'unified' | 'behavior_only' | 'skill_only';
}

export function UnifiedSessionView({
  studentId,
  sessionId,
  mode: initialMode = 'unified',
}: UnifiedSessionViewProps) {
  const [sessions, setSessions] = useState<SessionMeta[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState(sessionId || '');
  const [behaviorData, setBehaviorData] = useState<BehaviorDataRow[]>([]);
  const [trialData, setTrialData] = useState<TargetTrialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(initialMode === 'behavior_only' ? 'behavior' : initialMode === 'skill_only' ? 'skill' : 'all');
  const [expandedTargets, setExpandedTargets] = useState<Set<string>>(new Set());

  // Fetch available sessions
  useEffect(() => {
    const fetchSessions = async () => {
      const { data } = await supabase
        .from('sessions')
        .select('id, name, start_time, end_time, status, notes, user_id, student_id')
        .or(`student_id.eq.${studentId},student_ids.cs.{${studentId}}`)
        .order('start_time', { ascending: false })
        .limit(50);

      if (data) {
        setSessions(data.map((s: any) => ({
          id: s.id,
          name: s.name,
          startTime: s.start_time,
          endTime: s.end_time,
          status: s.status || 'completed',
          notes: s.notes,
          userId: s.user_id,
          studentId: s.student_id,
        })));

        if (!selectedSessionId && data.length > 0) {
          setSelectedSessionId(data[0].id);
        }
      }
    };
    fetchSessions();
  }, [studentId]);

  // Fetch data for selected session
  useEffect(() => {
    if (!selectedSessionId) { setLoading(false); return; }

    const fetchSessionData = async () => {
      setLoading(true);

      const { data: bRows } = await supabase
        .from('behavior_session_data')
        .select('*, behaviors(name)')
        .eq('session_id', selectedSessionId)
        .eq('student_id', studentId);

      if (bRows) {
        setBehaviorData(bRows.map((r: any) => ({
          id: r.id,
          behaviorId: r.behavior_id,
          behaviorName: (r.behaviors as any)?.name || 'Unknown',
          frequency: r.frequency,
          durationSeconds: r.duration_seconds,
          latencySeconds: r.latency_seconds,
          dataState: r.data_state,
          notes: r.notes,
        })));
      }

      const { data: tRows } = await supabase
        .from('target_trials')
        .select('*, skill_targets(name, program_id, skill_programs(name, method)), prompt_levels(name)')
        .eq('session_id', selectedSessionId)
        .order('recorded_at');

      if (tRows) {
        setTrialData(tRows.map((r: any) => ({
          id: r.id,
          targetId: r.target_id,
          targetName: (r.skill_targets as any)?.name || 'Unknown',
          programName: (r.skill_targets as any)?.skill_programs?.name || 'Unknown',
          programMethod: (r.skill_targets as any)?.skill_programs?.method || 'unknown',
          trialIndex: r.trial_index,
          outcome: r.outcome,
          promptLevelId: r.prompt_level_id,
          promptLevelName: (r.prompt_levels as any)?.name || '—',
          promptSuccess: r.prompt_success || false,
          recordedAt: r.recorded_at,
          sessionType: r.session_type,
          notes: r.notes,
        })));
      }

      setLoading(false);
    };

    fetchSessionData();
  }, [selectedSessionId, studentId]);

  const targetSummaries = useMemo(() => {
    const map = new Map<string, TargetSummary>();
    for (const t of trialData) {
      if (!map.has(t.targetId)) {
        map.set(t.targetId, {
          targetId: t.targetId,
          targetName: t.targetName,
          programName: t.programName,
          method: t.programMethod,
          total: 0,
          correct: 0,
          independent: 0,
          percentCorrect: 0,
          percentIndependent: 0,
        });
      }
      const s = map.get(t.targetId)!;
      s.total++;
      if (t.outcome === 'correct') s.correct++;
      if (t.promptSuccess) s.independent++;
    }
    for (const s of map.values()) {
      s.percentCorrect = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
      s.percentIndependent = s.total > 0 ? Math.round((s.independent / s.total) * 100) : 0;
    }
    return Array.from(map.values());
  }, [trialData]);

  const selectedSession = sessions.find(s => s.id === selectedSessionId);
  const hasBehavior = behaviorData.length > 0;
  const hasSkill = trialData.length > 0;

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const toggleTargetExpanded = (id: string) => {
    setExpandedTargets(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exportCSV = () => {
    const rows: string[] = ['Type,Name,Metric,Value,Details,Time'];
    
    for (const b of behaviorData) {
      if (b.frequency !== null) {
        rows.push(`Behavior,${b.behaviorName},Frequency,${b.frequency},,`);
      }
      if (b.durationSeconds !== null) {
        rows.push(`Behavior,${b.behaviorName},Duration,${b.durationSeconds}s,,`);
      }
    }
    
    for (const t of trialData) {
      rows.push(`Skill,${t.targetName},${t.outcome},Trial ${t.trialIndex + 1},Prompt: ${t.promptLevelName},${t.recordedAt}`);
    }
    
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session_${selectedSessionId?.slice(0, 8)}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderBehaviorSection = () => (
    <div className="space-y-2">
      {behaviorData.map(b => (
        <div key={b.id} className="flex items-center gap-3 p-2 rounded-md bg-muted/30">
          <Activity className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{b.behaviorName}</p>
            <div className="flex gap-3 text-xs text-muted-foreground">
              {b.frequency !== null && (
                <span>Frequency: <strong>{b.frequency}</strong></span>
              )}
              {b.durationSeconds !== null && (
                <span>Duration: <strong>{formatDuration(b.durationSeconds)}</strong></span>
              )}
              {b.latencySeconds !== null && (
                <span>Latency: <strong>{formatDuration(b.latencySeconds)}</strong></span>
              )}
            </div>
          </div>
          <Badge variant="outline" className="text-[10px]">
            {b.dataState}
          </Badge>
        </div>
      ))}
    </div>
  );

  const renderSkillSection = () => (
    <div className="space-y-2">
      {targetSummaries.map(ts => {
        const isExpanded = expandedTargets.has(ts.targetId);
        const trials = trialData.filter(t => t.targetId === ts.targetId);
        return (
          <Collapsible key={ts.targetId} open={isExpanded} onOpenChange={() => toggleTargetExpanded(ts.targetId)}>
            <div className="rounded-md border">
              <CollapsibleTrigger className="w-full flex items-center gap-3 p-2 hover:bg-muted/30">
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <Target className="h-4 w-4 text-primary" />
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium truncate">{ts.targetName}</p>
                  <p className="text-xs text-muted-foreground">{ts.programName}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold" style={{
                    color: ts.percentCorrect >= 80 ? 'hsl(var(--chart-2))' : ts.percentCorrect >= 50 ? 'hsl(var(--chart-4))' : 'hsl(var(--destructive))',
                  }}>
                    {ts.correct}/{ts.total}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({ts.percentCorrect}%)
                  </span>
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="p-3 border-t space-y-3">
                  <div className="flex items-center gap-2">
                    <Progress value={ts.percentIndependent} className="h-2 flex-1" />
                    <span className="text-xs text-muted-foreground">
                      {ts.percentIndependent}% independent
                    </span>
                  </div>

                  {/* Trial tape */}
                  <div className="flex gap-1 flex-wrap">
                    {trials.map(t => (
                      <span
                        key={t.id}
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${
                          t.outcome === 'correct' ? 'bg-emerald-500' : t.outcome === 'no_response' ? 'bg-gray-400' : 'bg-red-500'
                        }`}
                      >
                        {t.outcome === 'correct' ? '+' : t.outcome === 'no_response' ? '–' : '−'}
                      </span>
                    ))}
                  </div>

                  {/* Detailed trial table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="text-left py-1 px-2">#</th>
                          <th className="text-left py-1 px-2">Outcome</th>
                          <th className="text-left py-1 px-2">Prompt</th>
                          <th className="text-left py-1 px-2">Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trials.map(t => (
                          <tr key={t.id} className="border-b border-border/50">
                            <td className="py-1 px-2">{t.trialIndex + 1}</td>
                            <td className="py-1 px-2">
                              <Badge variant={t.outcome === 'correct' ? 'default' : 'destructive'} className="text-[10px]">
                                {t.outcome}
                              </Badge>
                            </td>
                            <td className="py-1 px-2">{t.promptLevelName}</td>
                            <td className="py-1 px-2">{format(new Date(t.recordedAt), 'h:mm:ss a')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        );
      })}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers className="h-5 w-5 text-primary" />
              Session Data Review
            </CardTitle>
          </div>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-3.5 w-3.5 mr-1" />
            Export CSV
          </Button>
        </div>

        {/* Session picker */}
        <div className="flex items-center gap-2 mt-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
            <SelectTrigger className="flex-1 h-8 text-xs">
              <SelectValue placeholder="Select a session..." />
            </SelectTrigger>
            <SelectContent>
              {sessions.map(s => (
                <SelectItem key={s.id} value={s.id}>
                  {format(new Date(s.startTime), 'MMM d, yyyy h:mm a')} — {s.name}
                  {s.status === 'in_progress' && ' 🟢'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Session metadata */}
        {selectedSession && (
          <div className="flex items-center gap-3 mt-2 flex-wrap text-xs">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" />
              {format(new Date(selectedSession.startTime), 'h:mm a')}
              {selectedSession.endTime && ` – ${format(new Date(selectedSession.endTime), 'h:mm a')}`}
            </span>
            <Badge variant="outline" className="text-[10px]">
              {selectedSession.status}
            </Badge>
            {hasBehavior && <Badge variant="secondary" className="text-[10px]">Behavior Data</Badge>}
            {hasSkill && <Badge variant="secondary" className="text-[10px]">Skill Data</Badge>}
          </div>
        )}
      </CardHeader>

      <CardContent>
        {loading ? (
          <p className="text-center py-8 text-muted-foreground">Loading session data...</p>
        ) : !selectedSessionId ? (
          <p className="text-center py-8 text-muted-foreground">Select a session to view</p>
        ) : !hasBehavior && !hasSkill ? (
          <div className="text-center py-8 text-muted-foreground">
            <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
            No data recorded for this session
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">
                <Layers className="h-3.5 w-3.5 mr-1" />
                All Data
              </TabsTrigger>
              <TabsTrigger value="behavior">
                <Activity className="h-3.5 w-3.5 mr-1" />
                Behaviors {hasBehavior && `(${behaviorData.length})`}
              </TabsTrigger>
              <TabsTrigger value="skill">
                <Target className="h-3.5 w-3.5 mr-1" />
                Skills {hasSkill && `(${targetSummaries.length})`}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              {hasBehavior && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">Behavior Data</span>
                  </div>
                  {renderBehaviorSection()}
                </div>
              )}
              {hasBehavior && hasSkill && <Separator />}
              {hasSkill && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">Skill Acquisition Data</span>
                  </div>
                  {renderSkillSection()}
                </div>
              )}
            </TabsContent>

            <TabsContent value="behavior">
              {renderBehaviorSection()}
            </TabsContent>

            <TabsContent value="skill">
              {renderSkillSection()}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
