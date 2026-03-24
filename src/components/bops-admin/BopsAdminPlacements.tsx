import { useState } from 'react';
import { useBopsPlacements, useBopsCfiModels, useAcceptBestFit, useResetPlacement, useOverridePlacement } from '@/hooks/useBopsAdmin';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, CheckCircle, RotateCcw, Edit } from 'lucide-react';

export function BopsAdminPlacements() {
  const { data: placements, isLoading } = useBopsPlacements();
  const { data: models } = useBopsCfiModels();
  const acceptFit = useAcceptBestFit();
  const resetPlace = useResetPlacement();
  const overridePlace = useOverridePlacement();

  const [overrideDialog, setOverrideDialog] = useState<{ studentId: string } | null>(null);
  const [selectedModel, setSelectedModel] = useState('');

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  const bandColor = (band: string | null) => {
    if (!band) return 'secondary';
    const b = band.toLowerCase();
    if (b.includes('green') || b.includes('high')) return 'default' as const;
    if (b.includes('yellow') || b.includes('moderate')) return 'secondary' as const;
    return 'destructive' as const;
  };

  // Group by student_id, pick best fit (rank 1)
  const studentMap = new Map<string, any>();
  (placements || []).forEach((p: any) => {
    if (!studentMap.has(p.student_id) || p.recommended_rank < studentMap.get(p.student_id).recommended_rank) {
      studentMap.set(p.student_id, p);
    }
  });
  const rows = Array.from(studentMap.values());

  return (
    <div className="space-y-4">
      <div className="rounded-md border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Best Fit Model</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Band</TableHead>
              <TableHead>Rank</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((p: any) => (
              <TableRow key={p.student_id}>
                <TableCell className="font-mono text-xs">{p.student_id?.slice(0, 8)}</TableCell>
                <TableCell className="text-sm">{p.model_name || p.model_key || '—'}</TableCell>
                <TableCell>{p.fit_score != null ? Number(p.fit_score).toFixed(2) : '—'}</TableCell>
                <TableCell>{p.fit_band ? <Badge variant={bandColor(p.fit_band)}>{p.fit_band}</Badge> : '—'}</TableCell>
                <TableCell>{p.recommended_rank ?? '—'}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-7 text-xs" disabled={acceptFit.isPending}
                      onClick={() => acceptFit.mutate({ p_student: p.student_id, p_selected_by: 'admin' })}>
                      <CheckCircle className="w-3 h-3 mr-1" /> Accept
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" disabled={resetPlace.isPending}
                      onClick={() => resetPlace.mutate({ p_student: p.student_id, p_selected_by: 'admin' })}>
                      <RotateCcw className="w-3 h-3 mr-1" /> Reset
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs"
                      onClick={() => { setOverrideDialog({ studentId: p.student_id }); setSelectedModel(''); }}>
                      <Edit className="w-3 h-3 mr-1" /> Override
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No placement data.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!overrideDialog} onOpenChange={() => setOverrideDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Override Placement</DialogTitle></DialogHeader>
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger><SelectValue placeholder="Select classroom model" /></SelectTrigger>
            <SelectContent>
              {(models || []).map((m: any) => (
                <SelectItem key={m.model_key} value={m.model_key}>{m.model_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOverrideDialog(null)}>Cancel</Button>
            <Button disabled={!selectedModel || overridePlace.isPending} onClick={() => {
              if (overrideDialog) {
                overridePlace.mutate({ p_student: overrideDialog.studentId, p_model_key: selectedModel, p_selected_by: 'admin' });
                setOverrideDialog(null);
              }
            }}>
              {overridePlace.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Confirm Override
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
