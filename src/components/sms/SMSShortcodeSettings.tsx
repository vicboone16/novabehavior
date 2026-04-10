import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface Shortcode {
  id: string;
  code: string;
  label: string | null;
  behavior_id: string;
  student_id: string | null;
  behaviors: { name: string } | null;
  students: { first_name: string; last_name: string } | null;
}

interface BehaviorOpt { id: string; name: string }

interface StudentOpt { id: string; firstName: string; lastName: string }

export function SMSShortcodeSettings() {
  const { user } = useAuth();
  const [students, setStudents] = useState<StudentOpt[]>([]);
  const [codes, setCodes] = useState<Shortcode[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCode, setNewCode] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newBehaviorId, setNewBehaviorId] = useState('');
  const [newStudentId, setNewStudentId] = useState('__global__');
  const [behaviorOpts, setBehaviorOpts] = useState<BehaviorOpt[]>([]);
  const [adding, setAdding] = useState(false);

  async function load() {
    setLoading(true);
    const [codesRes, studentsRes] = await Promise.all([
      (supabase as any)
        .from('sms_behavior_shortcodes')
        .select('id, code, label, behavior_id, student_id, behaviors(name), students(first_name, last_name)')
        .order('code'),
      supabase.from('students').select('id, first_name, last_name')
        .eq('is_archived', false).order('first_name'),
    ]);
    setCodes((codesRes.data ?? []) as Shortcode[]);
    setStudents(
      (studentsRes.data ?? []).map((s: any) => ({
        id: s.id,
        firstName: s.first_name ?? '',
        lastName: s.last_name ?? '',
      }))
    );
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  useEffect(() => {
    const sid = newStudentId === '__global__' ? null : newStudentId;
    if (sid) {
      supabase.from('student_behavior_map')
        .select('behavior_entry_id, behaviors(id, name)')
        .eq('student_id', sid).eq('active', true)
        .then(({ data }) => {
          const opts: BehaviorOpt[] = (data ?? [])
            .map((r: any) => r.behaviors ? { id: r.behaviors.id, name: r.behaviors.name } : null)
            .filter(Boolean) as BehaviorOpt[];
          opts.sort((a, b) => a.name.localeCompare(b.name));
          setBehaviorOpts(opts);
        });
    } else {
      supabase.from('behaviors').select('id, name').order('name')
        .then(({ data }) => setBehaviorOpts((data ?? []) as BehaviorOpt[]));
    }
    setNewBehaviorId('');
  }, [newStudentId]);

  async function handleAdd() {
    if (!newCode.trim() || !newBehaviorId) { toast.error('Code and behavior are required.'); return; }
    setAdding(true);
    const sid = newStudentId === '__global__' ? null : newStudentId;
    const { error } = await supabase.from('sms_behavior_shortcodes').insert({
      code: newCode.trim().toUpperCase(),
      label: newLabel.trim() || null,
      behavior_id: newBehaviorId,
      student_id: sid,
      created_by: user?.id,
    });
    if (error) {
      toast.error(error.message.includes('unique') ? 'That code already exists for this scope.' : error.message);
    } else {
      toast.success('Shortcode added.');
      setNewCode(''); setNewLabel(''); setNewBehaviorId(''); setNewStudentId('__global__');
      load();
    }
    setAdding(false);
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('sms_behavior_shortcodes').delete().eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Deleted.'); load(); }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold">Behavior Shortcodes</h2>
        <p className="text-xs text-muted-foreground">
          Map codes like "PA" to behaviors. Student-specific codes override global ones.
        </p>
      </div>

      <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
        <p className="text-xs font-medium">Add Shortcode</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground">Code (e.g. PA)</label>
            <Input value={newCode} onChange={e => setNewCode(e.target.value.toUpperCase())}
              placeholder="PA" maxLength={10} className="h-8 text-xs font-mono" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground">Display Label (optional)</label>
            <Input value={newLabel} onChange={e => setNewLabel(e.target.value)}
              placeholder="Physical Aggression" className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground">Student scope</label>
            <Select value={newStudentId} onValueChange={setNewStudentId}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__global__" className="text-xs">Global (all students)</SelectItem>
                {students.map(s => (
                  <SelectItem key={s.id} value={s.id} className="text-xs">{s.firstName} {s.lastName}</SelectItem>
                ))}

              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground">Behavior</label>
            <Select value={newBehaviorId} onValueChange={setNewBehaviorId}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                {behaviorOpts.map(b => (
                  <SelectItem key={b.id} value={b.id} className="text-xs">{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button size="sm" className="h-7 text-xs gap-1 w-full" onClick={handleAdd} disabled={adding}>
          <Plus className="w-3 h-3" /> Add Shortcode
        </Button>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground py-4 text-center">Loading…</p>
      ) : codes.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">No shortcodes yet.</p>
      ) : (
        <div className="border rounded-md overflow-hidden text-xs">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Code</th>
                <th className="text-left px-3 py-2 font-medium">Behavior</th>
                <th className="text-left px-3 py-2 font-medium">Student</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {codes.map((c, i) => (
                <tr key={c.id} className={i % 2 === 0 ? '' : 'bg-muted/20'}>
                  <td className="px-3 py-2 font-mono font-semibold">{c.code}</td>
                  <td className="px-3 py-2">{c.label || c.behaviors?.name || '—'}</td>
                  <td className="px-3 py-2">
                    {c.student_id
                      ? `${c.students?.first_name ?? ''} ${c.students?.last_name ?? ''}`.trim() || '—'
                      : <Badge variant="secondary" className="text-[10px]">Global</Badge>}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(c.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
