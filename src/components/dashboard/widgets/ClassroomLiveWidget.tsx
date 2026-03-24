import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAgencyContext } from '@/hooks/useAgencyContext';
import { useSupervisorSignals } from '@/hooks/useSupervisorSignals';
import { useClassroomSummaries } from '@/hooks/useClassroomToday';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Radio, Activity, BarChart3, Eye, School, Star, Siren } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';

export function ClassroomLiveWidget() {
  const navigate = useNavigate();
  const { currentAgency } = useAgencyContext();
  const agencyId = currentAgency?.id || null;
  const { signals, loading: signalsLoading } = useSupervisorSignals(agencyId);
  const { classrooms, loading: classroomsLoading, refetch } = useClassroomSummaries(agencyId);

  // Realtime subscription for beacon points + mayday alerts
  useEffect(() => {
    const channel = supabase
      .channel('classroom-live-updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'beacon_points_ledger' }, () => { refetch?.(); })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mayday_alerts' }, () => { refetch?.(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff_presence_status' }, () => { refetch?.(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refetch]);

  if (loading) return <div className="flex justify-center p-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  const activeSignals = signals.filter(s => !s.resolved_at);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <Radio className="w-4 h-4 text-emerald-500" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
        </div>
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Live Feed</span>
        <Badge variant="secondary" className="text-xs ml-auto">{activeSignals.length} signals</Badge>
      </div>

      {/* Classroom Cards */}
      {classrooms.length > 0 ? (
        <div className="space-y-2">
          {classrooms.slice(0, 4).map(room => (
            <div key={room.id} className="p-2.5 rounded-md border border-border/50 hover:bg-muted/30 transition-colors">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <School className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="text-sm font-medium truncate">{room.name}</span>
                </div>
                {room.activeSignalCount > 0 && (
                  <Badge className="bg-orange-500/15 text-orange-600 dark:text-orange-400 text-[10px]">
                    {room.activeSignalCount} signal{room.activeSignalCount > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground mb-2">
                <span className="flex items-center gap-1"><Activity className="w-3 h-3" />{room.behaviorEventsToday} events</span>
                {room.engagementPctToday != null && (
                  <span className="flex items-center gap-1"><BarChart3 className="w-3 h-3" />{room.engagementPctToday}%</span>
                )}
                {(room as any).pointsAwardedToday > 0 && (
                  <span className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-500" />{(room as any).pointsAwardedToday} pts</span>
                )}
                {(room as any).maydayEventsToday > 0 && (
                  <span className="flex items-center gap-1 text-destructive"><Siren className="w-3 h-3" />{(room as any).maydayEventsToday} mayday</span>
                )}
                <span className="text-[10px] italic">{room.signalSummary}</span>
              </div>
              <div className="flex gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-[11px] gap-1 px-2"
                  onClick={() => navigate('/intelligence', { state: { tab: 'signals' } })}
                >
                  <Eye className="w-3 h-3" /> Signals
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="h-6 text-[11px] gap-1 px-2"
                  onClick={() => navigate(`/intelligence/classroom/${room.id}?from=/`)}
                >
                  <School className="w-3 h-3" /> Today
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : activeSignals.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No active classroom signals</p>
      ) : (
        /* Fallback: show raw signals if no classroom data */
        <div className="space-y-2">
          {activeSignals.slice(0, 6).map(signal => (
            <div key={signal.id} className="p-2 rounded-md border border-border/50 hover:bg-muted/30 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{signal.signal_type?.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{signal.message}</p>
                </div>
                <Badge className={`text-[10px] shrink-0 ${
                  signal.severity === 'critical' ? 'bg-destructive text-destructive-foreground' :
                  signal.severity === 'high' ? 'bg-orange-500 text-white' :
                  'bg-yellow-500 text-white'
                }`}>
                  {signal.severity}
                </Badge>
              </div>
              <span className="text-[10px] text-muted-foreground mt-1 block">
                {formatDistanceToNow(new Date(signal.created_at), { addSuffix: true })}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Global Actions */}
      <div className="flex gap-2 pt-1 border-t border-border/30">
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 h-7 text-xs gap-1"
          onClick={() => navigate('/intelligence', { state: { tab: 'signals' } })}
        >
          <Eye className="w-3 h-3" /> View All Signals
        </Button>
      </div>
    </div>
  );
}
