import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { SUPERVISION_ACTIVITIES } from '@/types/supervision';

interface SupervisionLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function SupervisionLogDialog({ open, onOpenChange, onSuccess }: SupervisionLogDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [supervisees, setSupervisees] = useState<{ id: string; name: string }[]>([]);
  
  const [formData, setFormData] = useState({
    supervisee_user_id: '',
    supervision_type: 'direct',
    supervision_date: new Date().toISOString().split('T')[0],
    start_time: '09:00',
    end_time: '10:00',
    activities: [] as string[],
    notes: '',
  });

  useEffect(() => {
    if (open) {
      fetchSupervisees();
    }
  }, [open]);

  const fetchSupervisees = async () => {
    try {
      // Fetch staff profiles that could be supervisees
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, first_name, last_name')
        .eq('is_approved', true);

      if (error) throw error;

      setSupervisees(
        data?.map(p => ({
          id: p.user_id,
          name: p.display_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown',
        })).filter(p => p.id !== user?.id) || []
      );
    } catch (error) {
      console.error('Error fetching supervisees:', error);
    }
  };

  const calculateDuration = () => {
    const [startH, startM] = formData.start_time.split(':').map(Number);
    const [endH, endM] = formData.end_time.split(':').map(Number);
    return (endH * 60 + endM) - (startH * 60 + startM);
  };

  const handleSubmit = async () => {
    if (!user?.id || !formData.supervisee_user_id) {
      toast.error('Please select a supervisee');
      return;
    }

    const duration = calculateDuration();
    if (duration <= 0) {
      toast.error('End time must be after start time');
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.from('supervision_logs').insert({
        supervisor_user_id: user.id,
        supervisee_user_id: formData.supervisee_user_id,
        supervision_type: formData.supervision_type,
        supervision_date: formData.supervision_date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        duration_minutes: duration,
        activities: formData.activities,
        notes: formData.notes || null,
        status: 'pending',
      });

      if (error) throw error;

      toast.success('Supervision logged successfully');
      onSuccess();
    } catch (error) {
      console.error('Error logging supervision:', error);
      toast.error('Failed to log supervision');
    } finally {
      setLoading(false);
    }
  };

  const toggleActivity = (activity: string) => {
    setFormData(prev => ({
      ...prev,
      activities: prev.activities.includes(activity)
        ? prev.activities.filter(a => a !== activity)
        : [...prev.activities, activity],
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Log Supervision Session</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Supervisee</Label>
            <Select
              value={formData.supervisee_user_id}
              onValueChange={(value) => setFormData({ ...formData, supervisee_user_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select supervisee" />
              </SelectTrigger>
              <SelectContent>
                {supervisees.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Supervision Type</Label>
            <Select
              value={formData.supervision_type}
              onValueChange={(value) => setFormData({ ...formData, supervision_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="direct">Direct Observation</SelectItem>
                <SelectItem value="indirect">Indirect Supervision</SelectItem>
                <SelectItem value="group">Group Supervision</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Date</Label>
            <Input
              type="date"
              value={formData.supervision_date}
              onChange={(e) => setFormData({ ...formData, supervision_date: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Time</Label>
              <Input
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>End Time</Label>
              <Input
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Activities</Label>
            <div className="grid grid-cols-2 gap-2">
              {SUPERVISION_ACTIVITIES.map((activity) => (
                <div key={activity} className="flex items-center gap-2">
                  <Checkbox
                    id={activity}
                    checked={formData.activities.includes(activity)}
                    onCheckedChange={() => toggleActivity(activity)}
                  />
                  <Label htmlFor={activity} className="text-sm font-normal cursor-pointer">
                    {activity}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes about the supervision session..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Saving...' : 'Log Supervision'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
