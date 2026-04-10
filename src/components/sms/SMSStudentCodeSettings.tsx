import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useDataStore } from '@/store/dataStore';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface StudentCode {
  id: string;
  code: string;
  student_id: string;
  students: { first_name: string; last_name: string } | null;
}

export function SMSStudentCodeSettings() {
  const { user } = useAuth();
  const students = useDataStore(s => s.students);
  const [codes, setCodes] = useState<StudentCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCode, setNewCode] = useState('');
  const [newStudentId, setNewStudentId] = useState('');
  const [adding, setAdding] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await (supabase as any)
      .from('sms_student_codes')
      .select('id, code, student_id, students(first_name, last_name)')
      .order('code');
    setCodes((data ?? []) as StudentCode[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function handleAdd() {
    if (!newCode.trim() || !newStudentId) { toast.error('Code and student are required.'); return; }
    setAdding(true);
    const { error } = await supabase.from('sms_student_codes').insert({
      code: newCode.trim().toUpperCase(),
      student_id: newStudentId,
      created_by: user?.id,
    });
    if (error) {
      toast.error(error.message.includes('unique') ? 'That code is already taken.' : error.message);
    } else {
      toast.success('Student code added.');
      setNewCode(''); setNewStudentId('');
      load();
    }
    setAdding(false);
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('sms_student_codes').delete().eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Deleted.'); load(); }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold">Student Codes</h2>
        <p className="text-xs text-muted-foreground">
          Map short codes to students so staff can identify them in texts (e.g. "KALEL" → Kal-El).
        </p>
      </div>

      <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
        <p className="text-xs font-medium">Add Student Code</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground">Code (e.g. KALEL)</label>
            <Input value={newCode} onChange={e => setNewCode(e.target.value.toUpperCase())}
              placeholder="KALEL" maxLength={20} className="h-8 text-xs font-mono" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground">Student</label>
            <Select value={newStudentId} onValueChange={setNewStudentId}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select student…" /></SelectTrigger>
              <SelectContent>
                {students.map(s => (
                  <SelectItem key={s.id} value={s.id} className="text-xs">{s.firstName} {s.lastName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button size="sm" className="h-7 text-xs gap-1 w-full" onClick={handleAdd} disabled={adding}>
          <Plus className="w-3 h-3" /> Add Code
        </Button>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground py-4 text-center">Loading…</p>
      ) : codes.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">No student codes yet.</p>
      ) : (
        <div className="border rounded-md overflow-hidden text-xs">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Code</th>
                <th className="text-left px-3 py-2 font-medium">Student</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {codes.map((c, i) => (
                <tr key={c.id} className={i % 2 === 0 ? '' : 'bg-muted/20'}>
                  <td className="px-3 py-2 font-mono font-semibold">{c.code}</td>
                  <td className="px-3 py-2">
                    {`${c.students?.first_name ?? ''} ${c.students?.last_name ?? ''}`.trim() || '—'}
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
