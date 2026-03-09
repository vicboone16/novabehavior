import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Tag } from 'lucide-react';
import { toast } from 'sonner';

const db = supabase as any;

const PHASE_PRESETS = ['Baseline', 'Intervention', 'Maintenance', 'Generalization', 'Prompt Fading', 'Reversal', 'Follow-Up'];

interface PhaseMarker {
  id: string;
  client_id: string | null;
  graph_group_id: string | null;
  phase_label: string;
  marker_date: string | null;
  session_number: number | null;
  notes: string | null;
  created_at: string;
}

export function PhaseMarkersSection() {
  const { user } = useAuth();
  const [markers, setMarkers] = useState<PhaseMarker[]>([]);
  const [label, setLabel] = useState('');
  const [markerDate, setMarkerDate] = useState('');
  const [sessionNum, setSessionNum] = useState('');

  const loadMarkers = async () => {
    const { data } = await db
      .from('graph_phase_markers')
      .select('*')
      .order('marker_date', { ascending: true })
      .limit(100);
    setMarkers(data || []);
  };

  useEffect(() => { loadMarkers(); }, []);

  const addMarker = async () => {
    if (!label.trim()) return;
    const { error } = await db.from('graph_phase_markers').insert({
      phase_label: label.trim(),
      marker_date: markerDate || null,
      session_number: sessionNum ? parseInt(sessionNum) : null,
      created_by: user?.id,
    });
    if (error) toast.error('Failed to add marker');
    else { toast.success('Phase marker added'); setLabel(''); setMarkerDate(''); setSessionNum(''); await loadMarkers(); }
  };

  const deleteMarker = async (id: string) => {
    await db.from('graph_phase_markers').delete().eq('id', id);
    await loadMarkers();
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Tag className="w-4 h-4" /> Phase Markers
        </CardTitle>
        <CardDescription className="text-xs">
          Add phase change lines by date or session number
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Select value={label} onValueChange={setLabel}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Phase label" />
            </SelectTrigger>
            <SelectContent>
              {PHASE_PRESETS.map(p => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="date" value={markerDate} onChange={e => setMarkerDate(e.target.value)} className="w-44" placeholder="Date" />
          <Input type="number" value={sessionNum} onChange={e => setSessionNum(e.target.value)} className="w-28" placeholder="Session #" />
          <Button size="sm" onClick={addMarker} disabled={!label.trim()} className="gap-1">
            <Plus className="w-3.5 h-3.5" /> Add Marker
          </Button>
        </div>

        <div className="space-y-1 max-h-80 overflow-y-auto">
          {markers.map(m => (
            <div key={m.id} className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-md">
              <Badge className="text-[10px]">{m.phase_label}</Badge>
              {m.marker_date && <span className="text-xs text-muted-foreground">{m.marker_date}</span>}
              {m.session_number != null && <span className="text-xs text-muted-foreground">Session #{m.session_number}</span>}
              <span className="flex-1" />
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteMarker(m.id)}>
                <Trash2 className="w-3.5 h-3.5 text-destructive" />
              </Button>
            </div>
          ))}
          {markers.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No phase markers</p>}
        </div>
      </CardContent>
    </Card>
  );
}
