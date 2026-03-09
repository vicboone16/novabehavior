import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, ArrowUpRight } from 'lucide-react';
import { toast } from 'sonner';

const db = supabase as any;

interface CriterionStep {
  id: string;
  group_id: string | null;
  client_id: string | null;
  step_order: number;
  criterion_value: number;
  criterion_label: string | null;
  phase_label: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string | null;
}

interface GraphGroup {
  id: string;
  group_name: string;
  design_type: string;
}

export function ChangingCriterionSection() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<GraphGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [steps, setSteps] = useState<CriterionStep[]>([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newLabel, setNewLabel] = useState('');

  const loadGroups = async () => {
    const { data } = await db
      .from('research_graph_groups')
      .select('*')
      .eq('design_type', 'changing_criterion')
      .order('created_at', { ascending: false });
    setGroups(data || []);
  };

  const loadSteps = async (groupId: string) => {
    const { data } = await db
      .from('changing_criterion_steps')
      .select('*')
      .eq('group_id', groupId)
      .order('step_order', { ascending: true });
    setSteps(data || []);
  };

  useEffect(() => { loadGroups(); }, []);
  useEffect(() => { if (selectedGroup) loadSteps(selectedGroup); }, [selectedGroup]);

  const createGroup = async () => {
    if (!newGroupName.trim()) return;
    const { error } = await db.from('research_graph_groups').insert({
      group_name: newGroupName.trim(),
      design_type: 'changing_criterion',
      created_by: user?.id,
    });
    if (error) toast.error('Failed to create');
    else { toast.success('Created'); setNewGroupName(''); await loadGroups(); }
  };

  const addStep = async () => {
    if (!selectedGroup || !newValue) return;
    const nextOrder = steps.length + 1;
    const { error } = await db.from('changing_criterion_steps').insert({
      group_id: selectedGroup,
      step_order: nextOrder,
      criterion_value: parseFloat(newValue),
      criterion_label: newLabel.trim() || null,
      status: 'pending',
      created_by: user?.id,
    });
    if (error) toast.error('Failed to add step');
    else { toast.success('Step added'); setNewValue(''); setNewLabel(''); await loadSteps(selectedGroup); }
  };

  const deleteStep = async (id: string) => {
    await db.from('changing_criterion_steps').delete().eq('id', id);
    if (selectedGroup) await loadSteps(selectedGroup);
  };

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="md:col-span-1">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Criterion Designs</CardTitle>
          <CardDescription className="text-xs">Create changing criterion analysis groups</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input placeholder="Design name" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} className="flex-1" />
            <Button size="sm" onClick={createGroup} disabled={!newGroupName.trim()}>
              <Plus className="w-3.5 h-3.5" />
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
          </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <ArrowUpRight className="w-4 h-4" /> Criterion Steps
          </CardTitle>
          <CardDescription className="text-xs">Define the stair-step progression of criteria</CardDescription>
        </CardHeader>
        <CardContent>
          {!selectedGroup ? (
            <p className="text-sm text-muted-foreground text-center py-8">Select a design to manage steps</p>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input type="number" placeholder="Value" value={newValue} onChange={e => setNewValue(e.target.value)} className="w-24" />
                <Input placeholder="Label (optional)" value={newLabel} onChange={e => setNewLabel(e.target.value)} className="flex-1" />
                <Button size="sm" onClick={addStep} disabled={!newValue} className="gap-1">
                  <Plus className="w-3.5 h-3.5" /> Add
                </Button>
              </div>
              <div className="space-y-1">
                {steps.map((s, i) => (
                  <div key={s.id} className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-md">
                    <Badge variant="outline" className="text-[10px]">Step {i + 1}</Badge>
                    <span className="text-sm font-mono font-medium">{s.criterion_value}</span>
                    {s.criterion_label && <span className="text-xs text-muted-foreground">— {s.criterion_label}</span>}
                    <span className="flex-1" />
                    <Badge variant={s.status === 'met' ? 'default' : s.status === 'active' ? 'secondary' : 'outline'} className="text-[10px]">
                      {s.status || 'pending'}
                    </Badge>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteStep(s.id)}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
                {steps.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No steps defined</p>}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
