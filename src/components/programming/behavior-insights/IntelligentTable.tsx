import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { BehaviorSummaryRow } from './types';

interface IntelligentTableProps {
  rows: BehaviorSummaryRow[];
}

const FLAG_CONFIG: Record<string, { icon: React.ElementType; label: string; variant: 'destructive' | 'secondary' | 'default' }> = {
  spike: { icon: AlertTriangle, label: 'Spike', variant: 'destructive' },
  increasing: { icon: TrendingUp, label: 'Increasing', variant: 'destructive' },
  decreasing: { icon: TrendingDown, label: 'Decreasing', variant: 'default' },
  stable: { icon: Minus, label: 'Stable', variant: 'secondary' },
};

export function IntelligentTable({ rows }: IntelligentTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<'totalCount' | 'pctOfTotal' | 'avgPerDay' | 'trendPct'>('totalCount');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const sorted = [...rows].sort((a, b) => {
    const av = a[sortKey] ?? 0;
    const bv = b[sortKey] ?? 0;
    return sortDir === 'desc' ? (bv as number) - (av as number) : (av as number) - (bv as number);
  });

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const fmtDate = (d: string) => {
    try { return format(parseISO(d), 'M/d/yy'); } catch { return d; }
  };

  if (rows.length === 0) return null;

  return (
    <div className="rounded-md border overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Behavior</TableHead>
            <TableHead className="text-xs cursor-pointer" onClick={() => toggleSort('totalCount')}>
              Total {sortKey === 'totalCount' && (sortDir === 'desc' ? '↓' : '↑')}
            </TableHead>
            <TableHead className="text-xs cursor-pointer" onClick={() => toggleSort('pctOfTotal')}>
              % {sortKey === 'pctOfTotal' && (sortDir === 'desc' ? '↓' : '↑')}
            </TableHead>
            <TableHead className="text-xs cursor-pointer" onClick={() => toggleSort('avgPerDay')}>
              Avg/Day {sortKey === 'avgPerDay' && (sortDir === 'desc' ? '↓' : '↑')}
            </TableHead>
            <TableHead className="text-xs">Avg/Session</TableHead>
            <TableHead className="text-xs">Peak Day</TableHead>
            <TableHead className="text-xs">Last</TableHead>
            <TableHead className="text-xs cursor-pointer" onClick={() => toggleSort('trendPct')}>
              Trend {sortKey === 'trendPct' && (sortDir === 'desc' ? '↓' : '↑')}
            </TableHead>
            <TableHead className="text-xs">Flag</TableHead>
            <TableHead className="w-8" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map(row => {
            const expanded = expandedId === row.behaviorId;
            const flag = row.clinicalFlag ? FLAG_CONFIG[row.clinicalFlag] : null;
            return (
              <>
                <TableRow key={row.behaviorId} className="hover:bg-muted/40">
                  <TableCell className="text-xs font-medium max-w-[140px] truncate">{row.behaviorName}</TableCell>
                  <TableCell className="text-xs font-semibold">{row.totalCount}</TableCell>
                  <TableCell className="text-xs">{row.pctOfTotal}%</TableCell>
                  <TableCell className="text-xs">{row.avgPerDay}</TableCell>
                  <TableCell className="text-xs">{row.avgPerSession}</TableCell>
                  <TableCell className="text-xs">{row.peakDay ? fmtDate(row.peakDay) : '—'}</TableCell>
                  <TableCell className="text-xs">{row.lastOccurrence ? fmtDate(row.lastOccurrence) : '—'}</TableCell>
                  <TableCell className="text-xs">
                    {row.trendPct !== null ? (
                      <span className={row.trendPct > 0 ? 'text-destructive' : row.trendPct < 0 ? 'text-green-600' : ''}>
                        {row.trendPct > 0 ? '+' : ''}{row.trendPct}%
                      </span>
                    ) : '—'}
                  </TableCell>
                  <TableCell>
                    {flag && (
                      <Badge variant={flag.variant} className="text-[10px] gap-0.5">
                        <flag.icon className="w-3 h-3" /> {flag.label}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setExpandedId(expanded ? null : row.behaviorId)}>
                      {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </Button>
                  </TableCell>
                </TableRow>
                {expanded && (
                  <TableRow key={`${row.behaviorId}-detail`}>
                    <TableCell colSpan={10} className="bg-muted/20 p-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        <div>
                          <p className="text-muted-foreground">Total Count</p>
                          <p className="font-semibold">{row.totalCount} incidents</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Peak Day</p>
                          <p className="font-semibold">{row.peakDay ? fmtDate(row.peakDay) : 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Avg per Day</p>
                          <p className="font-semibold">{row.avgPerDay}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Trend</p>
                          <p className="font-semibold">{row.trendPct !== null ? `${row.trendPct > 0 ? '+' : ''}${row.trendPct}% vs prior` : 'Insufficient data'}</p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
