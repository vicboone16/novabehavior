import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Clock, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { StaffAvailability } from '@/types/staffProfile';
import { DAYS_OF_WEEK } from '@/types/staffProfile';

interface StaffAvailabilityTabProps {
  userId: string;
  availability: StaffAvailability[];
  refetch: () => void;
}

export function StaffAvailabilityTab({ userId, availability, refetch }: StaffAvailabilityTabProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    day_of_week: 'monday' as StaffAvailability['day_of_week'],
    start_time: '09:00',
    end_time: '17:00',
    notes: '',
  });

  const handleAdd = async () => {
    if (formData.start_time >= formData.end_time) {
      toast.error('End time must be after start time');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('staff_availability').insert({
        staff_user_id: userId,
        day_of_week: formData.day_of_week,
        start_time: formData.start_time,
        end_time: formData.end_time,
        notes: formData.notes || null,
        is_active: true,
      });

      if (error) throw error;

      toast.success('Availability slot added');
      setDialogOpen(false);
      setFormData({
        day_of_week: 'monday',
        start_time: '09:00',
        end_time: '17:00',
        notes: '',
      });
      refetch();
    } catch (error) {
      console.error('Error adding availability:', error);
      toast.error('Failed to add availability');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from('staff_availability')
        .update({ is_active: !currentActive })
        .eq('id', id);

      if (error) throw error;
      refetch();
    } catch (error) {
      console.error('Error updating availability:', error);
      toast.error('Failed to update availability');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('staff_availability')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Availability slot removed');
      refetch();
    } catch (error) {
      console.error('Error deleting availability:', error);
      toast.error('Failed to delete availability');
    }
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Group by day for visual schedule
  const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const groupedByDay = dayOrder.map(day => ({
    day,
    slots: availability.filter(a => a.day_of_week === day).sort((a, b) => a.start_time.localeCompare(b.start_time))
  }));

  return (
    <div className="space-y-6 mt-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Weekly Availability
          </CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Slot
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Availability Slot</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label>Day of Week</Label>
                  <Select
                    value={formData.day_of_week}
                    onValueChange={(value) => setFormData(prev => ({ 
                      ...prev, 
                      day_of_week: value as StaffAvailability['day_of_week'] 
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS_OF_WEEK.map(day => (
                        <SelectItem key={day.value} value={day.value}>
                          {day.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Start Time</Label>
                    <Input
                      type="time"
                      value={formData.start_time}
                      onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>End Time</Label>
                    <Input
                      type="time"
                      value={formData.end_time}
                      onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                    />
                  </div>
                </div>
                
                <div>
                  <Label>Notes (optional)</Label>
                  <Input
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="e.g., Telehealth only"
                  />
                </div>
                
                <Button onClick={handleAdd} disabled={saving} className="w-full">
                  {saving ? 'Adding...' : 'Add Availability'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {/* Visual Week View */}
          <div className="space-y-4 mb-8">
            {groupedByDay.map(({ day, slots }) => (
              <div key={day} className="flex items-start gap-4">
                <div className="w-24 font-medium capitalize text-sm pt-2">{day}</div>
                <div className="flex-1">
                  {slots.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {slots.map(slot => (
                        <div
                          key={slot.id}
                          className={`px-3 py-2 rounded-lg text-sm ${
                            slot.is_active
                              ? 'bg-primary/10 text-primary border border-primary/20'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                          {slot.notes && (
                            <span className="ml-2 text-xs opacity-70">({slot.notes})</span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-2 text-sm text-muted-foreground">Not available</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Table View */}
          {availability.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Day</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {availability.map(slot => (
                  <TableRow key={slot.id}>
                    <TableCell className="font-medium capitalize">{slot.day_of_week}</TableCell>
                    <TableCell>{formatTime(slot.start_time)}</TableCell>
                    <TableCell>{formatTime(slot.end_time)}</TableCell>
                    <TableCell>{slot.notes || '—'}</TableCell>
                    <TableCell>
                      <Switch
                        checked={slot.is_active}
                        onCheckedChange={() => handleToggleActive(slot.id, slot.is_active)}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(slot.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
