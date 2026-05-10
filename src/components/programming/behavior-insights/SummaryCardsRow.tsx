import { Activity, TrendingUp, TrendingDown, Calendar, Clock, BarChart3, AlertTriangle, Target, Hash, Timer } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { format, parseISO } from 'date-fns';
import type { BehaviorSummaryRow } from './types';

interface SummaryCardsRowProps {
  totalIncidents: number;
  topBehavior: BehaviorSummaryRow | null;
  biggestIncrease: BehaviorSummaryRow | null;
  biggestDecrease: BehaviorSummaryRow | null;
  peakDay: string;
  peakCount: number;
  completeness: number;
  daysWithData?: number;
  lastRecorded: string | null;
  priorityConcern: BehaviorSummaryRow | null;
  behaviorCount?: number;
  avgPerDay?: number;
  avgPerSession?: number;
  abcEntries?: number;
  intervalOccurrence?: string;
}

function KPICard({ icon: Icon, label, value, subtext, color }: {
  icon: React.ElementType; label: string; value: string | number; subtext?: string; color?: string;
}) {
  return (
    <Card className="min-w-0">
      <CardContent className="py-2.5 px-3">
        <div className="flex items-center gap-1.5 text-muted-foreground mb-0.5">
          <Icon className={`w-3.5 h-3.5 ${color || ''}`} />
          <span className="text-[10px] truncate">{label}</span>
        </div>
        <p className="text-lg font-bold text-foreground leading-tight truncate">{value}</p>
        {subtext && <p className="text-[10px] text-muted-foreground truncate">{subtext}</p>}
      </CardContent>
    </Card>
  );
}

export function SummaryCardsRow(props: SummaryCardsRowProps) {
  const fmtDate = (d: string) => {
    try { return format(parseISO(d), 'M/d'); } catch { return d; }
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
      {props.behaviorCount !== undefined && (
        <KPICard icon={Activity} label="Behaviors" value={props.behaviorCount} color="text-primary" />
      )}
      <KPICard icon={Target} label="Total Incidents" value={props.totalIncidents} color="text-primary" />
      {props.abcEntries !== undefined && (
        <KPICard icon={Hash} label="ABC Entries" value={props.abcEntries} color="text-purple-500" />
      )}
      {props.intervalOccurrence !== undefined && (
        <KPICard icon={Timer} label="Interval Occ." value={props.intervalOccurrence} color="text-amber-500" />
      )}
      {props.avgPerDay !== undefined && (
        <KPICard icon={BarChart3} label="Avg/Day" value={props.avgPerDay} color="text-blue-500" />
      )}
      {props.avgPerSession !== undefined && (
        <KPICard icon={BarChart3} label="Avg/Session" value={props.avgPerSession} color="text-cyan-500" />
      )}
      <KPICard
        icon={Calendar}
        label="Peak Day"
        value={props.peakDay ? fmtDate(props.peakDay) : '—'}
        subtext={props.peakCount ? `${props.peakCount} incidents` : undefined}
      />
      <KPICard
        icon={Clock}
        label="Last Recorded"
        value={props.lastRecorded ? fmtDate(props.lastRecorded) : '—'}
      />
    </div>
  );
}
