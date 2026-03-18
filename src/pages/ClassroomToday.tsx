import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useClassroomTodayDrilldown, type LiveEventItem } from '@/hooks/useClassroomToday';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ArrowLeft, Activity, Users, Target, Clock, AlertTriangle,
  Loader2, RefreshCw, Zap, BarChart3, Radio, Shield, AlertOctagon,
  Stethoscope, Star, Gift, Siren, UserCheck
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

const EVENT_STYLES: Record<string, { bg: string; icon: React.ReactNode }> = {
  frequency: { bg: 'bg-blue-500/15 text-blue-700 dark:text-blue-400', icon: <Activity className="w-3 h-3" /> },
  abc: { bg: 'bg-orange-500/15 text-orange-700 dark:text-orange-400', icon: <AlertTriangle className="w-3 h-3" /> },
  data_event: { bg: 'bg-purple-500/15 text-purple-700 dark:text-purple-400', icon: <BarChart3 className="w-3 h-3" /> },
  data_point: { bg: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400', icon: <Target className="w-3 h-3" /> },
  session: { bg: 'bg-primary/15 text-primary', icon: <Radio className="w-3 h-3" /> },
  clinical_session: { bg: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-400', icon: <Stethoscope className="w-3 h-3" /> },
  signal: { bg: 'bg-destructive/15 text-destructive', icon: <Zap className="w-3 h-3" /> },
  incident: { bg: 'bg-red-500/15 text-red-700 dark:text-red-400', icon: <AlertOctagon className="w-3 h-3" /> },
  points: { bg: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400', icon: <Star className="w-3 h-3" /> },
  reward: { bg: 'bg-pink-500/15 text-pink-700 dark:text-pink-400', icon: <Gift className="w-3 h-3" /> },
  mayday: { bg: 'bg-red-600/20 text-red-700 dark:text-red-400', icon: <Siren className="w-3 h-3" /> },
  presence: { bg: 'bg-teal-500/15 text-teal-700 dark:text-teal-400', icon: <UserCheck className="w-3 h-3" /> },
};

function EventTypeBadge({ type }: { type: LiveEventItem['type'] }) {
  const style = EVENT_STYLES[type] || { bg: 'bg-muted', icon: null };
  return (
    <Badge className={`${style.bg} text-[10px] font-medium gap-1`}>
      {style.icon}
      {type.replace(/_/g, ' ')}
    </Badge>
  );
}

const ALL_TYPES = ['frequency', 'abc', 'data_event', 'session', 'clinical_session', 'signal', 'incident', 'points', 'reward', 'mayday', 'presence'] as const;

export default function ClassroomToday() {
  const { classroomId } = useParams<{ classroomId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('from') || '/intelligence';

  const [classroomName, setClassroomName] = useState('Classroom');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const streamRef = useRef<HTMLDivElement>(null);

  const { snapshot, students, events, flags, loading, refresh } = useClassroomTodayDrilldown(classroomId || null);

  useEffect(() => {
    if (!classroomId) return;
    supabase.from('classrooms').select('name').eq('id', classroomId).maybeSingle().then(({ data }) => {
      if (data) setClassroomName(data.name);
    });
  }, [classroomId]);

  // Auto-scroll to top when new events arrive
  const prevCount = useRef(0);
  useEffect(() => {
    if (autoScroll && events.length > prevCount.current && streamRef.current) {
      streamRef.current.scrollTop = 0;
    }
    prevCount.current = events.length;
  }, [events.length, autoScroll]);

  const filteredEvents = typeFilter === 'all' ? events : events.filter(e => e.type === typeFilter);

  if (loading && events.length === 0) {
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
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              Live — auto-refreshes every 20s — {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} className="gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Now
        </Button>
      </div>

      {/* Today Snapshot KPIs */}
      {snapshot && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-10 gap-3">
          <SnapshotCard icon={<Activity className="w-4 h-4" />} label="Behavior Events" value={snapshot.totalBehaviorEvents} />
          <SnapshotCard icon={<BarChart3 className="w-4 h-4" />} label="Engagement" value={snapshot.engagementPct != null ? `${snapshot.engagementPct}%` : '—'} />
          <SnapshotCard icon={<Target className="w-4 h-4" />} label="Prompts Done" value={`${snapshot.completedPrompts}/${snapshot.expectedPrompts}`} sub={
            <Progress value={promptPct} className="h-1.5 mt-1" />
          } />
          <SnapshotCard icon={<Clock className="w-4 h-4" />} label="Snoozed" value={snapshot.snoozedPrompts} />
          <SnapshotCard icon={<Radio className="w-4 h-4" />} label="Active Probes" value={snapshot.activeProbes} />
          <SnapshotCard icon={<Target className="w-4 h-4" />} label="Finished Probes" value={snapshot.finishedProbes} />
          <SnapshotCard icon={<Star className="w-4 h-4" />} label="Points Awarded" value={snapshot.pointsAwardedToday} />
          <SnapshotCard icon={<Gift className="w-4 h-4" />} label="Points Redeemed" value={snapshot.pointsRedeemedToday} />
          <SnapshotCard icon={<Siren className="w-4 h-4" />} label="Mayday Alerts" value={snapshot.maydayEventsToday} />
          <SnapshotCard icon={<UserCheck className="w-4 h-4" />} label="Staff Present" value={snapshot.staffPresent} />
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
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              Live Event Stream ({filteredEvents.length})
            </h2>
            <div className="flex items-center gap-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-7 text-xs w-[140px]">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {ALL_TYPES.map(t => (
                    <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant={autoScroll ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 text-[11px]"
                onClick={() => setAutoScroll(!autoScroll)}
              >
                {autoScroll ? 'Auto-scroll ON' : 'Auto-scroll OFF'}
              </Button>
            </div>
          </div>

          {filteredEvents.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Radio className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No events recorded today</p>
                <p className="text-xs text-muted-foreground mt-1">Events will appear here as they happen in the classroom</p>
              </CardContent>
            </Card>
          ) : (
            <div ref={streamRef} className="space-y-1 max-h-[600px] overflow-y-auto pr-1">
              {filteredEvents.map(ev => (
                <div
                  key={`${ev.type}-${ev.id}`}
                  className={`flex items-start gap-3 p-2.5 rounded-md border transition-colors ${
                    ev.type === 'signal' || ev.type === 'incident'
                      ? 'border-destructive/20 bg-destructive/5 hover:bg-destructive/10'
                      : 'border-border/50 hover:bg-muted/20'
                  }`}
                >
                  <EventTypeBadge type={ev.type} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{ev.label}</span>
                      {ev.severity && (
                        <Badge variant="outline" className="text-[9px] px-1 py-0">{ev.severity}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">{ev.student_name}</span>
                      {ev.detail && <span className="text-xs text-muted-foreground truncate">· {ev.detail}</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[11px] font-mono text-foreground block">
                      {format(new Date(ev.occurred_at), 'h:mm:ss a')}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(ev.occurred_at), { addSuffix: true })}
                    </span>
                  </div>
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
