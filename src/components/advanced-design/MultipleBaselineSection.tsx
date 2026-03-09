import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, GripVertical, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const db = supabase as any;

interface GraphGroup {
  id: string;
  group_name: string;
  design_type: string;
  description: string | null;
  baseline_unit: string | null;
  created_at: string;
}

interface GraphSeries {
  id: string;
  group_id: string;
  series_label: string;
  sort_order: number;
  baseline_start_index: number | null;
  target_id: string | null;
  behavior_id: string | null;
}

export function MultipleBaselineSection() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<GraphGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [series, setSeries] = useState<GraphSeries[]>([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newSeriesLabel, setNewSeriesLabel] = useState('');
  const [loading, setLoading] = useState(false);

  const loadGroups = async () => {
    const { data } = await db
      .from('research_graph_groups')
      .select('*')
      .eq('design_type', 'multiple_baseline')
      .order('created_at', { ascending: false });
    setGroups(data || []);
  };

  const loadSeries = async (groupId: string) => {
    const { data } = await db
      .from('research_graph_series')
      .select('*')
      .eq('group_id', groupId)
      .order('sort_order', { ascending: true });
    setSeries(data || []);
  };

  useEffect(() => { loadGroups(); }, []);
  useEffect(() => { if (selectedGroup) loadSeries(selectedGroup); }, [selectedGroup]);

  const createGroup = async () => {
    if (!newGroupName.trim()) return;
    setLoading(true);
    const { error } = await db.from('research_graph_groups').insert({
      group_name: newGroupName.trim(),
      description: newGroupDesc.trim() || null,
      design_type: 'multiple_baseline',
      created_by: user?.id,
    });
    if (error) { toast.error('Failed to create group'); }
    else { toast.success('Group created'); setNewGroupName(''); setNewGroupDesc(''); await loadGroups(); }
    setLoading(false);
  };

  const addSeries = async () => {
    if (!selectedGroup || !newSeriesLabel.trim()) return;
    const nextOrder = series.length + 1;
    const { error } = await db.from('research_graph_series').insert({
      group_id: selectedGroup,
      series_label: newSeriesLabel.trim(),
      sort_order: nextOrder,
      created_by: user?.id,
    });
    if (error) toast.error('Failed to add series');
    else { toast.success('Series added'); setNewSeriesLabel(''); await loadSeries(selectedGroup); }
  };

  const deleteSeries = async (id: string) => {
    await db.from('research_graph_series').delete().eq('id', id);
    if (selectedGroup) await loadSeries(selectedGroup);
  };

  const selectedGroupData = groups.find(g => g.id === selectedGroup);

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* Groups list */}
      <Card className="md:col-span-1">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Baseline Groups</CardTitle>
          <CardDescription className="text-xs">Create and select a multiple baseline design group</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Input placeholder="Group name" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} />
            <Textarea placeholder="Description (optional)" rows={2} value={newGroupDesc} onChange={e => setNewGroupDesc(e.target.value)} />
            <Button size="sm" onClick={createGroup} disabled={loading || !newGroupName.trim()} className="w-full gap-1">
              <Plus className="w-3.5 h-3.5" /> Create Group
            </Button>
          </div>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {groups.map(g => (
              <button
                key={g.id}
                onClick={() => setSelectedGroup(g.id)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                  selectedGroup === g.id ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'
                }`}
              >
                {g.group_name}
              </button>
            ))}
            {groups.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No groups yet</p>}
          </div>
        </CardContent>
      </Card>

      {/* Series management */}
      <Card className="md:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">
            {selectedGroupData ? selectedGroupData.group_name : 'Select a Group'}
          </CardTitle>
          {selectedGroupData?.description && (
            <CardDescription className="text-xs">{selectedGroupData.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {!selectedGroup ? (
            <p className="text-sm text-muted-foreground text-center py-8">Select or create a group to manage series</p>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input placeholder="Series label" value={newSeriesLabel} onChange={e => setNewSeriesLabel(e.target.value)} className="flex-1" />
                <Button size="sm" onClick={addSeries} disabled={!newSeriesLabel.trim()} className="gap-1">
                  <Plus className="w-3.5 h-3.5" /> Add
                </Button>
              </div>
              <div className="space-y-1">
                {series.map((s, i) => (
                  <div key={s.id} className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-md">
                    <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
                    <Badge variant="outline" className="text-[10px]">{i + 1}</Badge>
                    <span className="text-sm flex-1">{s.series_label}</span>
                    <span className="text-xs text-muted-foreground">
                      Baseline start: {s.baseline_start_index ?? 'Not set'}
                    </span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteSeries(s.id)}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
                {series.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No series added</p>}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
