import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2, Sparkles } from 'lucide-react';

const QUICK_CHIPS = [
  'Great progress today!',
  'We noticed improvement.',
  'Please reinforce at home.',
  "Let's follow up on this.",
  'Thank you for your support!',
];

const TEMPLATES = [
  { label: '🏆 Win', body: 'Great day today — [Student] showed strong focus and followed directions more independently.' },
  { label: '📈 Pattern', body: 'We noticed [Student] does best when expectations are previewed first. Try doing the same at home!' },
  { label: '💪 Encouragement', body: 'Today was a little harder, but [Student] showed great recovery. We'll keep supporting that tomorrow.' },
  { label: '🏠 Home Tip', body: 'Please praise [Student] tonight for staying calm during transitions. A quick reward at home would be great!' },
];

interface Props {
  onSend: (body: string, messageType?: string) => Promise<void>;
  studentName: string;
  disabled?: boolean;
}

export function ParentMessageComposer({ onSend, studentName, disabled }: Props) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  const firstName = studentName.split(' ')[0] || 'Student';

  async function handleSend() {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await onSend(text.trim());
      setText('');
    } finally {
      setSending(false);
    }
  }

  function insertTemplate(template: string) {
    setText(template.replace(/\[Student\]/g, firstName));
    setShowTemplates(false);
  }

  function insertChip(chip: string) {
    setText(prev => prev ? `${prev} ${chip}` : chip);
  }

  return (
    <div className="border-t border-border bg-card p-3 space-y-2">
      {/* Quick chips */}
      <div className="flex gap-1.5 flex-wrap">
        {QUICK_CHIPS.map(chip => (
          <button
            key={chip}
            onClick={() => insertChip(chip)}
            className="text-[10px] px-2 py-1 rounded-full border border-border bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            {chip}
          </button>
        ))}
        <button
          onClick={() => setShowTemplates(!showTemplates)}
          className="text-[10px] px-2 py-1 rounded-full border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors flex items-center gap-1"
        >
          <Sparkles className="w-2.5 h-2.5" />
          Templates
        </button>
      </div>

      {/* Templates dropdown */}
      {showTemplates && (
        <div className="bg-muted/50 rounded-lg border border-border p-2 space-y-1.5">
          {TEMPLATES.map(t => (
            <button
              key={t.label}
              onClick={() => insertTemplate(t.body)}
              className="w-full text-left text-xs p-2 rounded hover:bg-muted transition-colors"
            >
              <span className="font-medium">{t.label}</span>
              <p className="text-muted-foreground mt-0.5 line-clamp-1">{t.body.replace(/\[Student\]/g, firstName)}</p>
            </button>
          ))}
        </div>
      )}

      {/* Composer */}
      <div className="flex gap-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Message ${firstName}'s family...`}
          rows={2}
          className="text-sm resize-none flex-1"
          disabled={disabled || sending}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={!text.trim() || sending || disabled}
          className="h-auto self-end"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}
