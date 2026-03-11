import { useState } from 'react';
import { format } from 'date-fns';
import { Plus, Clock, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useDataStore } from '@/store/dataStore';
import { toast } from '@/hooks/use-toast';

interface AddTimelineEntryButtonProps {
  studentId: string;
  studentName: string;
  compact?: boolean;
}

export function AddTimelineEntryButton({ studentId, studentName, compact }: AddTimelineEntryButtonProps) {
  const { user } = useAuth();
  const { currentSessionId } = useDataStore();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState('');
  const [entryDate, setEntryDate] = useState<Date>(new Date());
  const [entryTime, setEntryTime] = useState(format(new Date(), 'HH:mm'));
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim() || !user) return;
    setSubmitting(true);

    try {
      // Combine date and time
      const [hours, minutes] = entryTime.split(':').map(Number);
      const entryTimestamp = new Date(entryDate);
      entryTimestamp.setHours(hours, minutes, 0, 0);

      const { error } = await supabase.from('student_timeline_entries').insert({
        student_id: studentId,
        user_id: user.id,
        session_id: currentSessionId,
        entry_time: entryTimestamp.toISOString(),
        content: content.trim(),
        entry_type: 'note',
      });

      if (error) throw error;

      toast({ title: 'Timeline entry added', description: `Entry added for ${studentName}` });
      setContent('');
      setEntryDate(new Date());
      setEntryTime(format(new Date(), 'HH:mm'));
      setOpen(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size={compact ? 'sm' : 'default'}
        onClick={() => setOpen(true)}
        className="gap-1.5"
      >
        <Plus className="w-3.5 h-3.5" />
        {!compact && 'Add Timeline Note'}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Add Timeline Entry — {studentName}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Date picker */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !entryDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {entryDate ? format(entryDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={entryDate}
                    onSelect={(d) => d && setEntryDate(d)}
                    initialFocus
                    className={cn('p-3 pointer-events-auto')}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Time picker */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Time</Label>
              <Input
                type="time"
                value={entryTime}
                onChange={(e) => setEntryTime(e.target.value)}
              />
            </div>

            {/* Content */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Note</Label>
              <Textarea
                placeholder="What happened? Add observations, context, or events..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[100px] resize-none"
              />
            </div>

            {currentSessionId && (
              <p className="text-xs text-muted-foreground">
                This entry will be linked to the current active session.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting || !content.trim()}>
              <Send className="w-4 h-4 mr-1" />
              Add Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
