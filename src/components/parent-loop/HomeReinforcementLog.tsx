import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Home, Plus, Loader2, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const db = supabase as any;

const REINFORCEMENT_PRESETS = [
  'Verbal praise',
  'Extra screen time',
  'Special activity',
  'Sticker or small reward',
  'Choice of dinner',
  'Extra story at bedtime',
];

interface Props {
  studentId: string;
  agencyId: string;
  parentUserId?: string;
}

export function HomeReinforcementLog({ studentId, agencyId, parentUserId }: Props) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reinforcement, setReinforcement] = useState('');
  const [points, setPoints] = useState(1);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    db.from('home_reinforcement_log')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }: any) => { setLogs(data || []); setLoading(false); });
  }, [studentId]);

  async function handleAdd() {
    if (!reinforcement.trim()) return;
    setSaving(true);
    try {
      const { data, error } = await db.from('home_reinforcement_log').insert({
        student_id: studentId,
        agency_id: agencyId,
        reinforcement: reinforcement.trim(),
        points_equivalent: points,
        parent_user_id: parentUserId || null,
      }).select().single();
      if (error) throw error;
      setLogs([data, ...logs]);
      setReinforcement('');
      toast({ title: 'Logged!', description: 'Home reinforcement recorded.' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <Home className="w-4 h-4 text-emerald-500" />
          Home Reinforcement Log
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        <div className="flex gap-2">
          <Select value={reinforcement} onValueChange={setReinforcement}>
            <SelectTrigger className="flex-1 text-sm h-9">
              <SelectValue placeholder="What did you do at home?" />
            </SelectTrigger>
            <SelectContent>
              {REINFORCEMENT_PRESETS.map(p => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={handleAdd} disabled={saving || !reinforcement} className="gap-1">
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
            Log
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
        ) : logs.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-2">No home reinforcement logged yet.</p>
        ) : (
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {logs.map((l: any) => (
              <div key={l.id} className="flex items-center justify-between text-xs bg-muted/50 rounded px-2.5 py-1.5">
                <span className="text-foreground">{l.reinforcement}</span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Star className="w-3 h-3 text-yellow-500" />
                  {l.points_equivalent}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
