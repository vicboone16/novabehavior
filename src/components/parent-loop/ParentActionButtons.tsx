import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Heart, HelpCircle, Eye, Send, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const db = supabase as any;

const QUICK_ACTIONS = [
  { type: 'praise', label: 'Praise at Home', icon: Heart, color: 'text-pink-500' },
  { type: 'home_followup', label: 'We noticed this too', icon: Eye, color: 'text-blue-500' },
  { type: 'question', label: 'Ask a Question', icon: HelpCircle, color: 'text-amber-500' },
] as const;

interface Props {
  studentId: string;
  agencyId: string;
  insightId?: string;
  parentUserId?: string;
  onActionSent?: () => void;
}

export function ParentActionButtons({ studentId, agencyId, insightId, parentUserId, onActionSent }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  async function handleSend(actionType: string) {
    setSending(true);
    try {
      const { error } = await db.from('parent_actions').insert({
        student_id: studentId,
        agency_id: agencyId,
        action_type: actionType,
        message: message || null,
        related_insight_id: insightId || null,
        parent_user_id: parentUserId || null,
      });
      if (error) throw error;
      toast({ title: 'Sent!', description: actionType === 'praise' ? 'Your encouragement means a lot!' : 'Your response has been shared.' });
      setSelected(null);
      setMessage('');
      onActionSent?.();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {QUICK_ACTIONS.map((a) => (
          <Button
            key={a.type}
            variant={selected === a.type ? 'default' : 'outline'}
            size="sm"
            className="flex flex-col h-auto py-3 gap-1.5 text-xs"
            onClick={() => {
              if (a.type === 'praise') {
                handleSend('praise');
              } else {
                setSelected(selected === a.type ? null : a.type);
              }
            }}
            disabled={sending}
          >
            {sending && selected === a.type ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <a.icon className={`w-4 h-4 ${a.color}`} />
            )}
            {a.label}
          </Button>
        ))}
      </div>

      {selected && (
        <div className="space-y-2">
          <Textarea
            placeholder={selected === 'question' ? 'What would you like to ask?' : 'Add a note (optional)...'}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={2}
            className="text-sm"
          />
          <Button size="sm" onClick={() => handleSend(selected)} disabled={sending} className="gap-1.5">
            {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
            Send
          </Button>
        </div>
      )}
    </div>
  );
}
