import { useState } from 'react';
import { Plus, Clock, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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

interface IEPServiceTrackerProps {
  caseData: any[];
  onRefresh: () => void;
}

export function IEPServiceTracker({ caseData, onRefresh }: IEPServiceTrackerProps) {
  const { user } = useAuth();
  const { students } = useDataStore();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newEntry, setNewEntry] = useState({
    student_id: '',
    service_type: '',
    minutes_mandated: '',
    minutes_delivered: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const handleAdd = async () => {
    if (!user || !newEntry.student_id) return;
    try {
      const { error } = await supabase.from('iep_case_data').insert({
        student_id: newEntry.student_id,
        data_type: 'service_minutes',
        created_by: user.id,
        data: {
          service_type: newEntry.service_type,
          minutes_mandated: parseInt(newEntry.minutes_mandated) || 0,
          minutes_delivered: parseInt(newEntry.minutes_delivered) || 0,
          date: newEntry.date,
          notes: newEntry.notes,
        },
      } as any);
      if (error) throw error;
      toast.success('Service minutes logged');
      setShowAddDialog(false);
      setNewEntry({ student_id: '', service_type: '', minutes_mandated: '', minutes_delivered: '', date: new Date().toISOString().split('T')[0], notes: '' });
      onRefresh();
    } catch (err: any) {
      toast.error('Failed to log: ' + err.message);
    }
  };

  // Group by student
  const byStudent = caseData.reduce((acc: any, item: any) => {
    const sid = item.student_id;
    if (!acc[sid]) acc[sid] = [];
    acc[sid].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="w-4 h-4" /> Log Minutes
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log Service Minutes</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Student</Label>
                <Select value={newEntry.student_id} onValueChange={v => setNewEntry(p => ({ ...p, student_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                  <SelectContent>
                    {students.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Service Type</Label>
                <Select value={newEntry.service_type} onValueChange={v => setNewEntry(p => ({ ...p, service_type: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="direct_aba">Direct ABA</SelectItem>
                    <SelectItem value="consultation">Consultation</SelectItem>
                    <SelectItem value="supervision">Supervision</SelectItem>
                    <SelectItem value="assessment">Assessment</SelectItem>
                    <SelectItem value="parent_training">Parent Training</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Mandated (min)</Label>
                  <Input type="number" value={newEntry.minutes_mandated} onChange={e => setNewEntry(p => ({ ...p, minutes_mandated: e.target.value }))} />
                </div>
                <div>
                  <Label>Delivered (min)</Label>
                  <Input type="number" value={newEntry.minutes_delivered} onChange={e => setNewEntry(p => ({ ...p, minutes_delivered: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label>Date</Label>
                <Input type="date" value={newEntry.date} onChange={e => setNewEntry(p => ({ ...p, date: e.target.value }))} />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={newEntry.notes} onChange={e => setNewEntry(p => ({ ...p, notes: e.target.value }))} rows={2} />
              </div>
              <Button onClick={handleAdd} className="w-full">Log Service Minutes</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {Object.keys(byStudent).length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Clock className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No service minutes logged yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {Object.entries(byStudent).map(([studentId, entries]: [string, any]) => {
            const student = students.find(s => s.id === studentId);
            const totalMandated = entries.reduce((sum: number, e: any) => sum + (e.data?.minutes_mandated || 0), 0);
            const totalDelivered = entries.reduce((sum: number, e: any) => sum + (e.data?.minutes_delivered || 0), 0);
            const pct = totalMandated > 0 ? Math.round((totalDelivered / totalMandated) * 100) : 0;
            const isOver = pct >= 100;
            const isUnder = pct < 80;

            return (
              <Card key={studentId}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">{student?.name || 'Unknown'}</p>
                    <Badge variant="outline" className={isUnder ? 'text-destructive border-destructive/30' : isOver ? 'text-emerald-600 border-emerald-300' : ''}>
                      {pct}%
                    </Badge>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${isUnder ? 'bg-destructive' : isOver ? 'bg-emerald-500' : 'bg-primary'}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {totalDelivered} / {totalMandated} minutes delivered
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
