import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, GitBranchPlus, Calendar } from 'lucide-react';
import { useGraphPhaseMarkers, PHASE_LABEL_PRESETS } from '@/hooks/useGraphPhaseMarkers';

interface PhaseMarkerManagerProps {
  studentId: string;
  targetId?: string;
  onMarkersChanged?: () => void;
}

export function PhaseMarkerManager({ studentId, targetId, onMarkersChanged }: PhaseMarkerManagerProps) {
  const { markers, loading, loadMarkers, addMarker, deleteMarker } = useGraphPhaseMarkers(studentId, targetId);
  const [showAdd, setShowAdd] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [customLabel, setCustomLabel] = useState(false);

  useEffect(() => { loadMarkers(); }, [loadMarkers]);

  const handleAdd = async () => {
    if (!newDate || !newLabel) return;
    const result = await addMarker({
      marker_date: newDate,
      phase_label: newLabel,
      notes: newNotes || undefined,
      target_id: targetId,
      graph_scope: targetId ? 'target' : 'student',
    });
    if (result) {
      setShowAdd(false);
      setNewDate('');
      setNewLabel('');
      setNewNotes('');
      setCustomLabel(false);
      onMarkersChanged?.();
    }
  };

  const handleDelete = async (id: string) => {
    await deleteMarker(id);
    onMarkersChanged?.();
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <GitBranchPlus className="w-4 h-4 text-primary" />
            Phase Change Lines
          </CardTitle>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setShowAdd(true)}>
            <Plus className="w-3 h-3" /> Add Phase Line
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {markers.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            No phase change lines added yet
          </p>
        ) : (
          <div className="space-y-1.5">
            {markers.map(m => (
              <div key={m.id} className="flex items-center gap-2 px-2 py-1.5 rounded border border-border/50 bg-card hover:bg-muted/30 transition-colors">
                <Calendar className="w-3 h-3 text-muted-foreground shrink-0" />
                <span className="text-[10px] text-muted-foreground w-20 shrink-0">{m.marker_date}</span>
                <Badge variant="secondary" className="text-[10px]">{m.phase_label}</Badge>
                {m.notes && <span className="text-[10px] text-muted-foreground truncate flex-1">{m.notes}</span>}
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0" onClick={() => handleDelete(m.id)}>
                  <Trash2 className="w-3 h-3 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-sm">Add Phase Change Line</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-xs">Date</Label>
                <Input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Phase Label</Label>
                {!customLabel ? (
                  <div className="space-y-2 mt-1">
                    <Select value={newLabel} onValueChange={setNewLabel}>
                      <SelectTrigger><SelectValue placeholder="Select phase label" /></SelectTrigger>
                      <SelectContent>
                        {PHASE_LABEL_PRESETS.map(p => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="sm" className="text-xs h-6" onClick={() => { setCustomLabel(true); setNewLabel(''); }}>
                      Use custom label
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2 mt-1">
                    <Input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="Enter custom label" />
                    <Button variant="ghost" size="sm" className="text-xs h-6" onClick={() => { setCustomLabel(false); setNewLabel(''); }}>
                      Use preset label
                    </Button>
                  </div>
                )}
              </div>
              <div>
                <Label className="text-xs">Notes (optional)</Label>
                <Textarea value={newNotes} onChange={e => setNewNotes(e.target.value)} rows={2} className="mt-1 text-sm" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button size="sm" onClick={handleAdd} disabled={!newDate || !newLabel}>Add Phase Line</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
