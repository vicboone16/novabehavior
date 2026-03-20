import { useState } from 'react';
import { Plus, MessageSquare, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useDataStore } from '@/store/dataStore';
import { toast } from 'sonner';

interface IEPCommsLogProps {
  caseData: any[];
  onRefresh: () => void;
}

export function IEPCommsLog({ caseData, onRefresh }: IEPCommsLogProps) {
  const { user } = useAuth();
  const { students } = useDataStore();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [entryType, setEntryType] = useState<'communication' | 'meeting_notes'>('communication');
  const [newEntry, setNewEntry] = useState({
    student_id: '',
    contact_type: 'email',
    contact_with: '',
    subject: '',
    notes: '',
    follow_up_needed: false,
    follow_up_date: '',
    meeting_date: '',
    meeting_type: 'annual',
    attendees: '',
    action_items: '',
  });

  const handleAdd = async () => {
    if (!user || !newEntry.student_id) return;
    try {
      const data = entryType === 'communication'
        ? {
            contact_type: newEntry.contact_type,
            contact_with: newEntry.contact_with,
            subject: newEntry.subject,
            notes: newEntry.notes,
            follow_up_needed: newEntry.follow_up_needed,
            follow_up_date: newEntry.follow_up_date || null,
          }
        : {
            meeting_date: newEntry.meeting_date,
            meeting_type: newEntry.meeting_type,
            attendees: newEntry.attendees,
            notes: newEntry.notes,
            action_items: newEntry.action_items,
          };

      const { error } = await supabase.from('iep_case_data').insert({
        student_id: newEntry.student_id,
        data_type: entryType,
        created_by: user.id,
        data,
      } as any);
      if (error) throw error;
      toast.success(entryType === 'communication' ? 'Communication logged' : 'Meeting notes saved');
      setShowAddDialog(false);
      onRefresh();
    } catch (err: any) {
      toast.error('Failed to save: ' + err.message);
    }
  };

  const comms = caseData.filter(c => c.data_type === 'communication');
  const meetings = caseData.filter(c => c.data_type === 'meeting_notes');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="w-4 h-4" /> Add Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New Entry</DialogTitle>
            </DialogHeader>
            <Tabs value={entryType} onValueChange={v => setEntryType(v as any)}>
              <TabsList className="w-full">
                <TabsTrigger value="communication" className="flex-1">Communication</TabsTrigger>
                <TabsTrigger value="meeting_notes" className="flex-1">Meeting Notes</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="space-y-4 mt-2">
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

              {entryType === 'communication' ? (
                <>
                  <div>
                    <Label>Contact Type</Label>
                    <Select value={newEntry.contact_type} onValueChange={v => setNewEntry(p => ({ ...p, contact_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="phone">Phone</SelectItem>
                        <SelectItem value="in_person">In Person</SelectItem>
                        <SelectItem value="text">Text</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Contact With</Label>
                    <Input value={newEntry.contact_with} onChange={e => setNewEntry(p => ({ ...p, contact_with: e.target.value }))} placeholder="Parent name, teacher, etc." />
                  </div>
                  <div>
                    <Label>Subject</Label>
                    <Input value={newEntry.subject} onChange={e => setNewEntry(p => ({ ...p, subject: e.target.value }))} />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <Label>Meeting Date</Label>
                    <Input type="date" value={newEntry.meeting_date} onChange={e => setNewEntry(p => ({ ...p, meeting_date: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Meeting Type</Label>
                    <Select value={newEntry.meeting_type} onValueChange={v => setNewEntry(p => ({ ...p, meeting_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="annual">Annual Review</SelectItem>
                        <SelectItem value="triennial">Triennial</SelectItem>
                        <SelectItem value="amendment">Amendment</SelectItem>
                        <SelectItem value="initial">Initial</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Attendees</Label>
                    <Textarea value={newEntry.attendees} onChange={e => setNewEntry(p => ({ ...p, attendees: e.target.value }))} rows={2} placeholder="Names and roles" />
                  </div>
                  <div>
                    <Label>Action Items</Label>
                    <Textarea value={newEntry.action_items} onChange={e => setNewEntry(p => ({ ...p, action_items: e.target.value }))} rows={2} />
                  </div>
                </>
              )}

              <div>
                <Label>Notes</Label>
                <Textarea value={newEntry.notes} onChange={e => setNewEntry(p => ({ ...p, notes: e.target.value }))} rows={3} />
              </div>
              <Button onClick={handleAdd} className="w-full">Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="comms">
        <TabsList>
          <TabsTrigger value="comms" className="gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" /> Communications ({comms.length})
          </TabsTrigger>
          <TabsTrigger value="meetings" className="gap-1.5">
            <Calendar className="w-3.5 h-3.5" /> Meetings ({meetings.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="comms" className="mt-3">
          {comms.length === 0 ? (
            <Card><CardContent className="py-6 text-center text-sm text-muted-foreground">No communications logged yet</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {comms.map((c: any) => {
                const student = students.find(s => s.id === c.student_id);
                return (
                  <Card key={c.id}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{student?.name} — {c.data?.subject || 'No subject'}</p>
                          <p className="text-xs text-muted-foreground">
                            {c.data?.contact_type} with {c.data?.contact_with} · {new Date(c.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs shrink-0">{c.data?.contact_type}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
        <TabsContent value="meetings" className="mt-3">
          {meetings.length === 0 ? (
            <Card><CardContent className="py-6 text-center text-sm text-muted-foreground">No meetings logged yet</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {meetings.map((m: any) => {
                const student = students.find(s => s.id === m.student_id);
                const isUpcoming = m.data?.meeting_date && new Date(m.data.meeting_date) > new Date();
                return (
                  <Card key={m.id}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{student?.name} — {m.data?.meeting_type || 'Meeting'}</p>
                          <p className="text-xs text-muted-foreground">
                            {m.data?.meeting_date ? new Date(m.data.meeting_date).toLocaleDateString() : 'No date'}
                          </p>
                        </div>
                        <Badge variant={isUpcoming ? 'default' : 'secondary'} className="text-xs shrink-0">
                          {isUpcoming ? 'Upcoming' : 'Past'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
