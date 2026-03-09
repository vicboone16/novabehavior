import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, LayoutGrid } from 'lucide-react';
import { toast } from 'sonner';

const db = supabase as any;

interface GraphGroup {
  id: string;
  group_name: string;
  design_type: string;
  description: string | null;
  created_at: string;
}

export function ResearchGraphGroupsSection() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<GraphGroup[]>([]);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [designType, setDesignType] = useState('multiple_baseline');

  const load = async () => {
    const { data } = await db
      .from('research_graph_groups')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    setGroups(data || []);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!name.trim()) return;
    const { error } = await db.from('research_graph_groups').insert({
      group_name: name.trim(),
      description: desc.trim() || null,
      design_type: designType,
      created_by: user?.id,
    });
    if (error) toast.error('Failed to create');
    else { toast.success('Group created'); setName(''); setDesc(''); await load(); }
  };

  const remove = async (id: string) => {
    await db.from('research_graph_groups').delete().eq('id', id);
    await load();
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <LayoutGrid className="w-4 h-4" /> Research Graph Groups
        </CardTitle>
        <CardDescription className="text-xs">Organize targets and behaviors into experimental design structures</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Input placeholder="Group name" value={name} onChange={e => setName(e.target.value)} className="flex-1 min-w-[200px]" />
          <Select value={designType} onValueChange={setDesignType}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="multiple_baseline">Multiple Baseline</SelectItem>
              <SelectItem value="changing_criterion">Changing Criterion</SelectItem>
              <SelectItem value="reversal">Reversal (ABAB)</SelectItem>
              <SelectItem value="alternating_treatments">Alternating Treatments</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={create} disabled={!name.trim()} className="gap-1">
            <Plus className="w-3.5 h-3.5" /> Create
          </Button>
        </div>
        <Textarea placeholder="Description (optional)" rows={2} value={desc} onChange={e => setDesc(e.target.value)} />

        <div className="space-y-1 max-h-80 overflow-y-auto">
          {groups.map(g => (
            <div key={g.id} className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-md">
              <span className="text-sm font-medium flex-1">{g.group_name}</span>
              <Badge variant="outline" className="text-[10px]">{g.design_type.replace(/_/g, ' ')}</Badge>
              {g.description && <span className="text-xs text-muted-foreground max-w-40 truncate">{g.description}</span>}
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(g.id)}>
                <Trash2 className="w-3.5 h-3.5 text-destructive" />
              </Button>
            </div>
          ))}
          {groups.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No groups yet</p>}
        </div>
      </CardContent>
    </Card>
  );
}
