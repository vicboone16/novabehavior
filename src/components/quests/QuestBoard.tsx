import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { QuestCard } from './QuestCard';
import { Loader2, Plus, Scroll, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const db = supabase as any;

interface Props {
  studentId: string;
  agencyId: string;
  classroomId?: string;
  isTeacher?: boolean;
}

export function QuestBoard({ studentId, agencyId, classroomId, isTeacher }: Props) {
  const [quests, setQuests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('active');
  const [createOpen, setCreateOpen] = useState(false);
  const { toast } = useToast();

  // Form state
  const [form, setForm] = useState({ title: '', description: '', quest_type: 'daily', goal_value: 5, reward_points: 10 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    db.from('student_quests')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .then(({ data }: any) => { setQuests(data || []); setLoading(false); });
  }, [studentId]);

  const active = quests.filter(q => !q.is_completed);
  const completed = quests.filter(q => q.is_completed);

  async function handleCreate() {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await db.from('student_quests').insert({
        student_id: studentId,
        agency_id: agencyId,
        classroom_id: classroomId || null,
        quest_type: form.quest_type,
        title: form.title.trim(),
        description: form.description.trim() || null,
        goal_value: form.goal_value,
        progress_value: 0,
        reward_points: form.reward_points,
        reward_type: 'points',
        reward_payload: {},
        is_completed: false,
        start_date: today,
      }).select().single();
      if (error) throw error;
      setQuests([data, ...quests]);
      setCreateOpen(false);
      setForm({ title: '', description: '', quest_type: 'daily', goal_value: 5, reward_points: 10 });
      toast({ title: 'Quest created!' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-2">
          <Scroll className="w-4 h-4 text-primary" />
          Quests & Missions
        </CardTitle>
        {isTeacher && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                <Plus className="w-3 h-3" /> Assign Quest
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Quest</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Quest title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                <Textarea placeholder="Description (optional)" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} />
                <div className="grid grid-cols-3 gap-2">
                  <Select value={form.quest_type} onValueChange={v => setForm({ ...form, quest_type: v })}>
                    <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="challenge">Challenge</SelectItem>
                      <SelectItem value="social">Social</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input type="number" placeholder="Goal" value={form.goal_value} onChange={e => setForm({ ...form, goal_value: Number(e.target.value) })} min={1} />
                  <Input type="number" placeholder="Reward pts" value={form.reward_points} onChange={e => setForm({ ...form, reward_points: Number(e.target.value) })} min={1} />
                </div>
                <Button onClick={handleCreate} disabled={saving || !form.title.trim()} className="w-full">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Quest'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
        ) : quests.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Target className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No quests assigned yet.</p>
          </div>
        ) : (
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="mb-3">
              <TabsTrigger value="active" className="text-xs">Active ({active.length})</TabsTrigger>
              <TabsTrigger value="completed" className="text-xs">Completed ({completed.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="active" className="space-y-2">
              {active.map(q => <QuestCard key={q.id} quest={q} />)}
              {active.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">All quests completed!</p>}
            </TabsContent>
            <TabsContent value="completed" className="space-y-2">
              {completed.map(q => <QuestCard key={q.id} quest={q} />)}
              {completed.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">No completed quests yet.</p>}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
