import { useState } from 'react';
import { Plus, FileText, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useDataStore } from '@/store/dataStore';
import { toast } from 'sonner';

interface IEPCasePlannerProps {
  caseData: any[];
  onRefresh: () => void;
}

export function IEPCasePlanner({ caseData, onRefresh }: IEPCasePlannerProps) {
  const { user } = useAuth();
  const { students } = useDataStore();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newCase, setNewCase] = useState({
    student_id: '',
    priority: 'medium',
    notes: '',
    due_date: '',
  });

  const handleAddCase = async () => {
    if (!user || !newCase.student_id) return;
    try {
      const { error } = await supabase.from('iep_case_data').insert({
        student_id: newCase.student_id,
        data_type: 'case_plan',
        created_by: user.id,
        data: {
          priority: newCase.priority,
          notes: newCase.notes,
          due_date: newCase.due_date,
          status: 'active',
        },
      } as any);
      if (error) throw error;
      toast.success('Case plan added');
      setShowAddDialog(false);
      setNewCase({ student_id: '', priority: 'medium', notes: '', due_date: '' });
      onRefresh();
    } catch (err: any) {
      toast.error('Failed to add case plan: ' + err.message);
    }
  };

  const filteredCases = caseData.filter(c => {
    if (!searchQuery) return true;
    const student = students.find(s => s.id === c.student_id);
    return student?.name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'medium': return 'bg-amber-500/10 text-amber-700 border-amber-500/20';
      case 'low': return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search cases..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="w-4 h-4" /> Add Case
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Case Plan</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Student</Label>
                <Select value={newCase.student_id} onValueChange={v => setNewCase(p => ({ ...p, student_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                  <SelectContent>
                    {students.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={newCase.priority} onValueChange={v => setNewCase(p => ({ ...p, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Due Date</Label>
                <Input type="date" value={newCase.due_date} onChange={e => setNewCase(p => ({ ...p, due_date: e.target.value }))} />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={newCase.notes} onChange={e => setNewCase(p => ({ ...p, notes: e.target.value }))} rows={3} />
              </div>
              <Button onClick={handleAddCase} className="w-full">Add Case Plan</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {filteredCases.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <FileText className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No case plans yet</p>
            <p className="text-xs text-muted-foreground mt-1">Add a case plan to start tracking IEP progress</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredCases.map((caseItem: any) => {
            const student = students.find(s => s.id === caseItem.student_id);
            const priority = caseItem.data?.priority || 'medium';
            return (
              <Card key={caseItem.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-xs font-semibold text-primary">
                          {student?.name?.charAt(0) || '?'}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{student?.name || 'Unknown Student'}</p>
                        {caseItem.data?.notes && (
                          <p className="text-xs text-muted-foreground truncate">{caseItem.data.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {caseItem.data?.due_date && (
                        <span className="text-xs text-muted-foreground">
                          Due: {new Date(caseItem.data.due_date).toLocaleDateString()}
                        </span>
                      )}
                      <Badge variant="outline" className={getPriorityColor(priority)}>
                        {priority}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
