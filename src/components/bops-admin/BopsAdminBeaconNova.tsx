import { useState } from 'react';
import { useBopsBeaconNovaState } from '@/hooks/useBopsAdmin';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';

export function BopsAdminBeaconNova() {
  const { data: rows, isLoading } = useBopsBeaconNovaState();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  const DayBadge = ({ state }: { state: string | null }) => {
    if (!state) return <span className="text-xs text-muted-foreground">—</span>;
    const colors: Record<string, string> = {
      green: 'bg-green-500/15 text-green-700 border-green-500/30',
      yellow: 'bg-yellow-500/15 text-yellow-700 border-yellow-500/30',
      red: 'bg-red-500/15 text-red-700 border-red-500/30',
    };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colors[state] || 'bg-muted'}`}>{state}</span>;
  };

  return (
    <div className="rounded-md border overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Profile</TableHead>
            <TableHead>Nova State</TableHead>
            <TableHead>Nova Date</TableHead>
            <TableHead>Beacon State</TableHead>
            <TableHead>Beacon Date</TableHead>
            <TableHead>Mismatch</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(rows || []).map((r: any) => {
            const mismatch = r.current_day_state && r.beacon_day_state && r.current_day_state !== r.beacon_day_state;
            const expanded = expandedId === r.student_id;
            return (
              <>
                <TableRow key={r.student_id} className={mismatch ? 'bg-yellow-500/5' : ''}>
                  <TableCell className="text-xs max-w-[160px] truncate">{r.calculated_training_name || r.student_id?.slice(0, 8)}</TableCell>
                  <TableCell><DayBadge state={r.current_day_state} /></TableCell>
                  <TableCell className="text-xs">{r.current_state_date || '—'}</TableCell>
                  <TableCell><DayBadge state={r.beacon_day_state} /></TableCell>
                  <TableCell className="text-xs">{r.beacon_state_date || '—'}</TableCell>
                  <TableCell>
                    {mismatch ? <Badge variant="destructive" className="text-xs gap-1"><AlertTriangle className="w-3 h-3" /> Mismatch</Badge> : '—'}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => setExpandedId(expanded ? null : r.student_id)}>
                      {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </TableCell>
                </TableRow>
                {expanded && (
                  <TableRow key={`${r.student_id}-detail`}>
                    <TableCell colSpan={7} className="bg-muted/30 p-4">
                      <div className="grid md:grid-cols-2 gap-4 text-xs">
                        <div className="space-y-2">
                          <p className="font-semibold text-sm">Nova Clinical View</p>
                          {r.teacher_summary_view && <div><span className="text-muted-foreground">Teacher Summary:</span> <p>{r.teacher_summary_view}</p></div>}
                          {r.clinician_summary_view && <div><span className="text-muted-foreground">Clinician Summary:</span> <p>{r.clinician_summary_view}</p></div>}
                        </div>
                        <div className="space-y-2">
                          <p className="font-semibold text-sm flex items-center gap-1">Beacon Teacher View <Badge variant="outline" className="text-[10px]">Beacon</Badge></p>
                          {r.beacon_teacher_summary && <div><span className="text-muted-foreground">Summary:</span> <p>{r.beacon_teacher_summary}</p></div>}
                          {r.beacon_targets && <div><span className="text-muted-foreground">Targets:</span> <p>{typeof r.beacon_targets === 'string' ? r.beacon_targets : JSON.stringify(r.beacon_targets)}</p></div>}
                          {r.beacon_antecedents && <div><span className="text-muted-foreground">Antecedents:</span> <p>{typeof r.beacon_antecedents === 'string' ? r.beacon_antecedents : JSON.stringify(r.beacon_antecedents)}</p></div>}
                          {r.beacon_reactives && <div><span className="text-muted-foreground">Reactives:</span> <p>{typeof r.beacon_reactives === 'string' ? r.beacon_reactives : JSON.stringify(r.beacon_reactives)}</p></div>}
                          {r.beacon_reinforcement && <div><span className="text-muted-foreground">Reinforcement:</span> <p>{typeof r.beacon_reinforcement === 'string' ? r.beacon_reinforcement : JSON.stringify(r.beacon_reinforcement)}</p></div>}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            );
          })}
          {(rows || []).length === 0 && (
            <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No BOPS-enabled students with state data.</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
