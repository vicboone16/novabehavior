import { useState } from 'react';
import { useBopsAdminStudents, useRepairStudent, useRunCfi, useAcceptBestFit, useResetPlacement, useSyncTargets } from '@/hooks/useBopsAdmin';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Loader2, MoreHorizontal, Wrench, Calculator, CheckCircle, RotateCcw, Link } from 'lucide-react';

export function BopsAdminStudents() {
  const { data: students, isLoading } = useBopsAdminStudents();
  const repair = useRepairStudent();
  const runCfi = useRunCfi();
  const acceptFit = useAcceptBestFit();
  const resetPlace = useResetPlacement();
  const syncTargets = useSyncTargets();

  const [search, setSearch] = useState('');
  const [filterEnabled, setFilterEnabled] = useState<string>('all');
  const [filterBand, setFilterBand] = useState<string>('all');

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  const filtered = (students || []).filter((s: any) => {
    if (search && !s.student_name?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterEnabled === 'yes' && !s.bops_enabled) return false;
    if (filterEnabled === 'no' && s.bops_enabled) return false;
    if (filterBand !== 'all' && s.best_fit_band !== filterBand) return false;
    return true;
  });

  const bandColor = (band: string | null) => {
    if (!band) return 'secondary';
    if (band.toLowerCase().includes('green') || band.toLowerCase().includes('high')) return 'default';
    if (band.toLowerCase().includes('yellow') || band.toLowerCase().includes('moderate')) return 'secondary';
    return 'destructive';
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Input placeholder="Search students..." value={search} onChange={e => setSearch(e.target.value)} className="w-60" />
        <Select value={filterEnabled} onValueChange={setFilterEnabled}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Enabled" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="yes">Enabled</SelectItem>
            <SelectItem value="no">Disabled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterBand} onValueChange={setFilterBand}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Fit Band" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Bands</SelectItem>
            <SelectItem value="Green">Green</SelectItem>
            <SelectItem value="Yellow">Yellow</SelectItem>
            <SelectItem value="Red">Red</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Enabled</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Profile</TableHead>
              <TableHead>Fit Band</TableHead>
              <TableHead>Override</TableHead>
              <TableHead>Nova State</TableHead>
              <TableHead>Beacon State</TableHead>
              <TableHead className="text-right">Targets</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((s: any) => (
              <TableRow key={s.student_id}>
                <TableCell className="font-medium">{s.student_name || s.student_id?.slice(0, 8)}</TableCell>
                <TableCell><Badge variant={s.bops_enabled ? 'default' : 'secondary'}>{s.bops_enabled ? 'On' : 'Off'}</Badge></TableCell>
                <TableCell className="text-xs">{s.bops_assessment_status}</TableCell>
                <TableCell className="text-xs max-w-[160px] truncate">{s.calculated_training_name || '—'}</TableCell>
                <TableCell>{s.best_fit_band ? <Badge variant={bandColor(s.best_fit_band)}>{s.best_fit_band}</Badge> : '—'}</TableCell>
                <TableCell>{s.selected_cfi_override ? <Badge variant="destructive">Override</Badge> : '—'}</TableCell>
                <TableCell><DayStateBadge state={s.nova_day_state} /></TableCell>
                <TableCell><DayStateBadge state={s.beacon_day_state} /></TableCell>
                <TableCell className="text-right">{s.total_bops_targets}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem disabled={repair.isPending} onClick={() => repair.mutate({ p_student: s.student_id })}>
                        <Wrench className="w-3.5 h-3.5 mr-2" /> Repair Student
                      </DropdownMenuItem>
                      {s.latest_scored_session_id && (
                        <DropdownMenuItem disabled={runCfi.isPending} onClick={() => runCfi.mutate({ p_session_id: s.latest_scored_session_id })}>
                          <Calculator className="w-3.5 h-3.5 mr-2" /> Run CFI
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem disabled={acceptFit.isPending} onClick={() => acceptFit.mutate({ p_student: s.student_id, p_selected_by: 'admin' })}>
                        <CheckCircle className="w-3.5 h-3.5 mr-2" /> Accept Best Fit
                      </DropdownMenuItem>
                      <DropdownMenuItem disabled={resetPlace.isPending} onClick={() => resetPlace.mutate({ p_student: s.student_id, p_selected_by: 'admin' })}>
                        <RotateCcw className="w-3.5 h-3.5 mr-2" /> Reset Placement
                      </DropdownMenuItem>
                      <DropdownMenuItem disabled={syncTargets.isPending} onClick={() => syncTargets.mutate({ p_student: s.student_id })}>
                        <Link className="w-3.5 h-3.5 mr-2" /> Sync Targets
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-6">No students found.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function DayStateBadge({ state }: { state: string | null }) {
  if (!state) return <span className="text-xs text-muted-foreground">—</span>;
  const colors: Record<string, string> = {
    green: 'bg-green-500/15 text-green-700 border-green-500/30',
    yellow: 'bg-yellow-500/15 text-yellow-700 border-yellow-500/30',
    red: 'bg-red-500/15 text-red-700 border-red-500/30',
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colors[state] || 'bg-muted text-muted-foreground'}`}>{state}</span>;
}
