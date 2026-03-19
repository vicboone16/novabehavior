/**
 * CoachMark — first-run overlay with a focused tooltip pointing to a feature.
 */

import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CoachMarkProps {
  id: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
}

const DISMISSED_KEY = 'nova-coach-marks-dismissed';

function getDismissed(): string[] {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]');
  } catch {
    return [];
  }
}

export function CoachMark({ id, title, description, actionLabel = 'Show Me', onAction, onDismiss }: CoachMarkProps) {
  const [visible, setVisible] = useState(() => !getDismissed().includes(id));

  if (!visible) return null;

  const dismiss = () => {
    const dismissed = getDismissed();
    dismissed.push(id);
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(dismissed));
    setVisible(false);
    onDismiss?.();
  };

  return (
    <div className="relative bg-demo text-demo-foreground rounded-xl p-4 shadow-md animate-fade-in max-w-xs">
      <button
        onClick={dismiss}
        className="absolute top-2 right-2 text-demo-foreground/60 hover:text-demo-foreground transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
      <h4 className="text-sm font-semibold mb-1">{title}</h4>
      <p className="text-xs opacity-80 leading-relaxed">{description}</p>
      <div className="flex items-center gap-2 mt-3">
        {onAction && (
          <Button
            size="sm"
            variant="secondary"
            className="h-7 text-xs"
            onClick={() => { onAction(); dismiss(); }}
          >
            {actionLabel}
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs text-demo-foreground/70 hover:text-demo-foreground"
          onClick={dismiss}
        >
          Dismiss
        </Button>
      </div>
    </div>
  );
}
