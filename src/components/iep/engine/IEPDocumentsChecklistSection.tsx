import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Plus, Users, ClipboardCheck, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const db = supabase as any;

interface Props {
  checklistItems: any[];
  attendees: any[];
  meetingSessionId: string;
  onToggleChecklist: (itemId: string, isComplete: boolean) => void;
  onAddAttendee: (name: string, role: string) => void;
}

export function IEPDocumentsChecklistSection({ checklistItems, attendees, meetingSessionId, onToggleChecklist, onAddAttendee }: Props) {
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('');

  const handleAddAttendee = () => {
    if (!newName.trim()) return;
    onAddAttendee(newName.trim(), newRole.trim() || 'other');
    setNewName('');
    setNewRole('');
  };

  const removeAttendee = async (id: string) => {
    await db.from('iep_meeting_attendees').delete().eq('id', id);
    toast.success('Attendee removed');
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Checklist */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold flex items-center gap-2">
            <ClipboardCheck className="w-3.5 h-3.5" /> Meeting Checklist
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {checklistItems.length === 0 ? (
            <p className="text-[10px] text-muted-foreground text-center py-3">No checklist items. Seed defaults to get started.</p>
          ) : (
            checklistItems.map(item => (
              <div key={item.id} className="flex items-center gap-2">
                <Checkbox
                  checked={item.is_complete}
                  onCheckedChange={(checked) => onToggleChecklist(item.id, !!checked)}
                  className="h-3.5 w-3.5"
                />
                <span className={`text-xs ${item.is_complete ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                  {item.item_label}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Attendees */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold flex items-center gap-2">
            <Users className="w-3.5 h-3.5" /> Attendees
            <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{attendees.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {attendees.map(a => (
            <div key={a.id} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-medium truncate">{a.attendee_name}</span>
                {a.attendee_role && (
                  <Badge variant="outline" className="text-[9px] px-1 py-0">{a.attendee_role}</Badge>
                )}
              </div>
              <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-destructive" onClick={() => removeAttendee(a.id)}>
                <Trash2 className="w-2.5 h-2.5" />
              </Button>
            </div>
          ))}
          <div className="flex gap-2 mt-2">
            <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Name" className="h-7 text-xs flex-1" />
            <Input value={newRole} onChange={e => setNewRole(e.target.value)} placeholder="Role" className="h-7 text-xs w-24" />
            <Button size="sm" className="h-7 text-xs px-2" onClick={handleAddAttendee} disabled={!newName.trim()}>
              <Plus className="w-3 h-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
