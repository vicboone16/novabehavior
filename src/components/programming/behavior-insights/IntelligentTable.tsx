import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus, AlertTriangle, Edit2, Check, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useDataStore } from '@/store/dataStore';
import { CanonicalStatusBadge } from '@/components/programming/CanonicalStatusBadge';
import type { BehaviorSummaryRow } from './types';
import type { DataCollectionMethod } from '@/types/behavior';

const METHOD_LABELS: Record<string, string> = {
  frequency: 'Frequency',
  duration: 'Duration',
  interval: 'Interval',
  abc: 'ABC',
  latency: 'Latency',
};

const ALL_METHODS: DataCollectionMethod[] = ['frequency', 'duration', 'interval', 'abc', 'latency'];

interface IntelligentTableProps {
  rows: BehaviorSummaryRow[];
  studentId?: string;
}

const FLAG_CONFIG: Record<string, { icon: React.ElementType; label: string; variant: 'destructive' | 'secondary' | 'default' }> = {
  spike: { icon: AlertTriangle, label: 'Spike', variant: 'destructive' },
  increasing: { icon: TrendingUp, label: 'Increasing', variant: 'destructive' },
  decreasing: { icon: TrendingDown, label: 'Decreasing', variant: 'default' },
  stable: { icon: Minus, label: 'Stable', variant: 'secondary' },
  priority: { icon: AlertTriangle, label: 'Priority', variant: 'destructive' },
};

export function IntelligentTable({ rows, studentId }: IntelligentTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<'totalCount' | 'pctOfTotal' | 'avgPerDay' | 'trendPct'>('totalCount');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDef, setEditDef] = useState('');
  const [editMethods, setEditMethods] = useState<DataCollectionMethod[]>([]);

  const students = useDataStore(s => s.students);
  const updateBehaviorDefinition = useDataStore(s => s.updateBehaviorDefinition);
  const updateBehaviorMethods = useDataStore(s => s.updateBehaviorMethods);

  const student = studentId ? students.find(s => s.id === studentId) : null;

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

  const startEdit = (behaviorId: string) => {
    const behavior = student?.behaviors.find(b => b.id === behaviorId);
    if (!behavior) return;
    setEditingId(behaviorId);
    setEditName(behavior.name);
    setEditDef(behavior.operationalDefinition || '');
    setEditMethods(behavior.methods || [behavior.type]);
  };

  const saveEdit = () => {
    if (!editingId || !studentId) return;
    updateBehaviorDefinition(studentId, editingId, editDef);
    if (editMethods.length > 0) {
      updateBehaviorMethods(studentId, editingId, editMethods);
    }
    setEditingId(null);
  };

  const cancelEdit = () => setEditingId(null);

  const toggleMethod = (method: DataCollectionMethod) => {
    setEditMethods(prev =>
      prev.includes(method) ? prev.filter(m => m !== method) : [...prev, method]
    );
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
            const behavior = student?.behaviors.find(b => b.id === row.behaviorId);
            const isEditing = editingId === row.behaviorId;

            return (
              <React.Fragment key={row.behaviorId}>
                <TableRow className="hover:bg-muted/40 cursor-pointer" onClick={() => setExpandedId(expanded ? null : row.behaviorId)}>
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
                  <TableCell onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setExpandedId(expanded ? null : row.behaviorId)}>
                      {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </Button>
                  </TableCell>
                </TableRow>
                {expanded && (
                  <TableRow key={`${row.behaviorId}-detail`}>
                    <TableCell colSpan={10} className="bg-muted/20 p-4">
                      <div className="space-y-3">
                        {/* Row 1: Core metrics */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                          <div className="bg-background rounded-lg p-2.5 border">
                            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Total Count</p>
                            <p className="text-sm font-bold text-foreground mt-0.5">{row.totalCount}</p>
                          </div>
                          <div className="bg-background rounded-lg p-2.5 border">
                            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Peak Day</p>
                            <p className="text-sm font-bold text-foreground mt-0.5">{row.peakDay ? fmtDate(row.peakDay) : 'N/A'}</p>
                          </div>
                          <div className="bg-background rounded-lg p-2.5 border">
                            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Avg per Day</p>
                            <p className="text-sm font-bold text-foreground mt-0.5">{row.avgPerDay}</p>
                          </div>
                          <div className="bg-background rounded-lg p-2.5 border">
                            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Trend</p>
                            <p className={`text-sm font-bold mt-0.5 ${row.trendPct !== null ? (row.trendPct > 0 ? 'text-destructive' : row.trendPct < 0 ? 'text-green-600' : 'text-foreground') : 'text-muted-foreground'}`}>
                              {row.trendPct !== null ? `${row.trendPct > 0 ? '+' : ''}${row.trendPct}%` : '—'}
                            </p>
                            <p className="text-[10px] text-muted-foreground">vs prior period</p>
                          </div>
                        </div>

                        {/* Row 2: Operational Definition + Measurement Types */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          <div className="bg-background rounded-lg p-2.5 border">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Operational Definition</p>
                              {behavior && !isEditing && studentId && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5"
                                  onClick={(e) => { e.stopPropagation(); startEdit(row.behaviorId); }}
                                >
                                  <Edit2 className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                            {isEditing ? (
                              <div className="space-y-2" onClick={e => e.stopPropagation()}>
                                <Textarea
                                  value={editDef}
                                  onChange={e => setEditDef(e.target.value)}
                                  rows={3}
                                  className="text-xs"
                                  placeholder="Operational definition..."
                                />
                                <div className="flex gap-1">
                                  <Button size="sm" className="h-6 text-xs gap-1" onClick={saveEdit}>
                                    <Check className="w-3 h-3" /> Save
                                  </Button>
                                  <Button size="sm" variant="outline" className="h-6 text-xs gap-1" onClick={cancelEdit}>
                                    <X className="w-3 h-3" /> Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs text-foreground leading-relaxed">
                                {behavior?.operationalDefinition || 'No definition set'}
                              </p>
                            )}
                          </div>

                          <div className="bg-background rounded-lg p-2.5 border">
                            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-1.5">Measurement Types</p>
                            {isEditing ? (
                              <div className="flex flex-wrap gap-2" onClick={e => e.stopPropagation()}>
                                {ALL_METHODS.map(method => (
                                  <label key={method} className="flex items-center gap-1.5 cursor-pointer">
                                    <Checkbox
                                      checked={editMethods.includes(method)}
                                      onCheckedChange={() => toggleMethod(method)}
                                    />
                                    <span className="text-xs">{METHOD_LABELS[method]}</span>
                                  </label>
                                ))}
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {(behavior?.methods || [behavior?.type].filter(Boolean)).map(method => (
                                  <Badge key={method} variant="secondary" className="text-[10px]">
                                    {METHOD_LABELS[method as string] || method}
                                  </Badge>
                                ))}
                                {(!behavior?.methods || behavior.methods.length === 0) && !behavior?.type && (
                                  <span className="text-xs text-muted-foreground">None configured</span>
                                )}
                              </div>
                            )}

                            {/* Status badge if applicable */}
                            {behavior && (
                              <div className="mt-2">
                                <CanonicalStatusBadge
                                  status={behavior.isMastered ? 'archived' : behavior.isArchived ? 'archived' : 'active'}
                                  originalId={behavior.id}
                                  effectiveId={behavior.baseBehaviorId || behavior.id}
                                  size="sm"
                                />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Row 3: Context */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                          <div className="bg-background rounded-lg p-2.5 border">
                            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-1.5">Time of Day Pattern</p>
                            <div className="flex gap-1">
                              {['AM', 'Mid', 'PM'].map((label, i) => {
                                const intensity = i === 0 ? 0.3 : i === 1 ? 0.7 : 0.5;
                                return (
                                  <div key={label} className="flex-1 text-center">
                                    <div 
                                      className="h-4 rounded-sm mb-0.5" 
                                      style={{ backgroundColor: `hsl(var(--primary) / ${intensity})` }}
                                    />
                                    <span className="text-[9px] text-muted-foreground">{label}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          <div className="bg-background rounded-lg p-2.5 border">
                            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-1.5">Sessions Ratio</p>
                            <p className="text-xs text-foreground">{row.avgPerSession} avg per session</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{row.pctOfTotal}% of all incidents</p>
                          </div>
                          <div className="bg-background rounded-lg p-2.5 border">
                            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-1.5">Clinical Note</p>
                            <p className="text-xs text-foreground leading-relaxed">
                              {row.clinicalFlag === 'spike' ? 'Significant spike detected — immediate review recommended' :
                               row.clinicalFlag === 'increasing' ? 'Upward trend — monitor closely and adjust supports' :
                               row.clinicalFlag === 'decreasing' ? 'Positive trend — continue current interventions' :
                               row.clinicalFlag === 'stable' ? 'Stable pattern — assess if current level is acceptable' :
                               'Insufficient data for clinical interpretation'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
