import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useClassroomTodayDrilldown, type LiveEventItem } from '@/hooks/useClassroomToday';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft, Activity, Users, Target, Clock, AlertTriangle,
  Loader2, RefreshCw, Zap, BarChart3, Radio
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

function EventTypeBadge({ type }: { type: LiveEventItem['type'] }) {
  const styles: Record<string, string> = {
    frequency: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
    abc: 'bg-orange-500/15 text-orange-700 dark:text-orange-400',
    data_event: 'bg-purple-500/15 text-purple-700 dark:text-purple-400',
    data_point: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
    session: 'bg-primary/15 text-primary',
  };
  return <Badge className={`${styles[type] || 'bg-muted'} text-[10px] font-medium`}>{type.replace('_', ' ')}</Badge>;
}

export default function ClassroomToday() {
  const { classroomId } = useParams<{ classroomId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('from') || '/intelligence';

  const [classroomName, setClassroomName] = useState('Classroom');

  const { snapshot, students, events, flags, loading, refresh } = useClassroomTodayDrilldown(classroomId || null);

  useEffect(() => {
    if (!classroomId) return;
    supabase.from('classrooms').select('name').eq('id', classroomId).maybeSingle().then(({ data }) => {
      if (data) setClassroomName(data.name);
    });
  }, [classroomId]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const promptPct = snapshot && snapshot.expectedPrompts > 0
    ? Math.round((snapshot.completedPrompts / snapshot.expectedPrompts) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(returnTo)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{classroomName}</h1>
            <p className="text-sm text-muted-foreground">
              Classroom Today — {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} className="gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      {/* Today Snapshot KPIs */}
      {snapshot && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <SnapshotCard icon={<Activity className="w-4 h-4" />} label="Behavior Events" value={snapshot.totalBehaviorEvents} />
          <SnapshotCard icon={<BarChart3 className="w-4 h-4" />} label="Engagement" value={snapshot.engagementPct != null ? `${snapshot.engagementPct}%` : '—'} />
          <SnapshotCard icon={<Target className="w-4 h-4" />} label="Prompts Done" value={`${snapshot.completedPrompts}/${snapshot.expectedPrompts}`} sub={
            <Progress value={promptPct} className="h-1.5 mt-1" />
          } />
          <SnapshotCard icon={<Clock className="w-4 h-4" />} label="Snoozed" value={snapshot.snoozedPrompts} />
          <SnapshotCard icon={<Radio className="w-4 h-4" />} label="Active Probes" value={snapshot.activeProbes} />
          <SnapshotCard icon={<Target className="w-4 h-4" />} label="Finished Probes" value={snapshot.finishedProbes} />
        </div>
      )}

      {/* Flags */}
      {flags.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {flags.map(f => (
            <Card key={f.type} className={f.type === 'reliability' ? 'border-destructive/30' : 'border-orange-500/20'}>
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-2 mb-1">
                  {f.type === 'reliability' ? <AlertTriangle className="w-4 h-4 text-destructive" /> : <Zap className="w-4 h-4 text-orange-500" />}
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{f.label}</span>
                </div>
                <p className="text-sm font-semibold text-foreground">{f.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Student Cards */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Students ({students.length})
          </h2>
          {students.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No students in this classroom</CardContent></Card>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {students.map(s => (
                <Card key={s.student_id} className="hover:bg-muted/30 transition-colors">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-medium text-sm">{s.student_name}</span>
                      {s.behaviorCountToday > 0 && (
                        <Badge variant="secondary" className="text-xs font-mono">{s.behaviorCountToday} events</Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {s.lastEngagementResponse && <span>Engagement: <strong className="text-foreground">{s.lastEngagementResponse}</strong></span>}
                      {s.probeActivity > 0 && <span>Probes: <strong className="text-foreground">{s.probeActivity}</strong></span>}
                      {s.topTrigger && <span>Trigger: <strong className="text-foreground">{s.topTrigger}</strong></span>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Live Event Stream */}
        <div className="lg:col-span-3 space-y-3">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-500 animate-pulse" />
            Live Event Stream ({events.length})
          </h2>
          {events.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No events recorded today</CardContent></Card>
          ) : (
            <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
              {events.map(ev => (
                <div key={ev.id} className="flex items-start gap-3 p-2.5 rounded-md border border-border/50 hover:bg-muted/20 transition-colors">
                  <EventTypeBadge type={ev.type} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{ev.label}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">{ev.student_name}</span>
                      {ev.detail && <span className="text-xs text-muted-foreground">· {ev.detail}</span>}
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">
                    {formatDistanceToNow(new Date(ev.occurred_at), { addSuffix: true })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SnapshotCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string | number; sub?: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="py-3 px-4">
        <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
          {icon}
          <span className="text-xs">{label}</span>
        </div>
        <p className="text-xl font-bold text-foreground">{value}</p>
        {sub}
      </CardContent>
    </Card>
  );
}
