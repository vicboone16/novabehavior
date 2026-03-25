import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Lightbulb, Loader2, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const db = supabase as any;

const INSIGHT_TYPES = [
  { value: 'win', label: '🏆 Win', placeholder: 'What went well today?' },
  { value: 'pattern', label: '📈 Pattern', placeholder: 'What pattern are you noticing?' },
  { value: 'concern', label: '⚠️ Concern', placeholder: 'What should the family know?' },
  { value: 'note', label: '📝 Teacher Note', placeholder: 'Share an update with the family.' },
];

interface Props {
  studentId: string;
  studentName: string;
  threadId?: string;
  onCreated?: () => void;
  children?: React.ReactNode;
}

export function ParentInsightModal({ studentId, studentName, threadId, onCreated, children }: Props) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState('win');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const firstName = studentName.split(' ')[0] || 'Student';
  const typeConfig = INSIGHT_TYPES.find(t => t.value === type) || INSIGHT_TYPES[0];

  async function handleCreate() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      // Create insight
      const today = new Date().toISOString().split('T')[0];
      const { error: insightError } = await db.from('parent_insights').insert({
        student_id: studentId,
        insight_date: today,
        insight_type: type,
        headline: title.trim(),
        behavior_summary: [],
        what_this_means: description.trim() || null,
        what_you_can_do: [],
        points_earned: 0,
        points_redeemed: 0,
        status: 'draft',
      });
      if (insightError) throw insightError;

      // Optionally inject as a thread message
      if (threadId) {
        const { data: { user } } = await supabase.auth.getUser();
        await db.from('parent_link_messages').insert({
          thread_id: threadId,
          student_id: studentId,
          agency_id: null,
          sender_type: 'teacher',
          sender_user_id: user?.id || null,
          sender_label: 'Teacher',
          body: `📋 ${typeConfig.label}: ${title.trim()}${description ? `\n${description.trim()}` : ''}`,
          message_type: 'insight',
          is_read: true,
        });
      }

      toast({ title: 'Insight created', description: `${typeConfig.label} shared for ${firstName}.` });
      setOpen(false);
      setTitle('');
      setDescription('');
      onCreated?.();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button size="sm" variant="outline" className="gap-1 text-xs">
            <Lightbulb className="w-3 h-3" />
            Create Insight
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="w-4 h-4 text-primary" />
            Create Parent Insight for {firstName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INSIGHT_TYPES.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            placeholder={typeConfig.placeholder}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-sm"
          />

          <Textarea
            placeholder="Additional details (optional)..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="text-sm"
          />

          <Button onClick={handleCreate} disabled={saving || !title.trim()} className="w-full gap-1.5">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Create & Share
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
