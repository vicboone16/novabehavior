/**
 * DemoProgressWidget — small gamified progress tracker for demo exploration.
 */

import { Trophy, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface ProgressItem {
  key: string;
  label: string;
  completed: boolean;
}

interface DemoProgressWidgetProps {
  items: ProgressItem[];
  className?: string;
}

export function DemoProgressWidget({ items, className }: DemoProgressWidgetProps) {
  const completed = items.filter(i => i.completed).length;
  const pct = items.length > 0 ? (completed / items.length) * 100 : 0;

  return (
    <Card className={`border-demo-banner-border bg-demo-surface ${className || ''}`}>
      <CardContent className="py-4">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-4 h-4 text-demo-accent" />
          <span className="text-sm font-semibold text-foreground">
            {completed} of {items.length} explored
          </span>
        </div>
        <Progress value={pct} className="h-2 mb-3" />
        <div className="space-y-1.5">
          {items.map(item => (
            <div key={item.key} className="flex items-center gap-2 text-xs">
              <CheckCircle2
                className={`w-3.5 h-3.5 shrink-0 ${
                  item.completed ? 'text-success' : 'text-muted-foreground/40'
                }`}
              />
              <span className={item.completed ? 'text-foreground' : 'text-muted-foreground'}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
