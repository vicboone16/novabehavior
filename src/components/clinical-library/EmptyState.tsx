import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface EmptyStateAction {
  label: string;
  onClick: () => void;
}

interface Props {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
}

export function EmptyState({ icon: Icon, title, description, action, secondaryAction }: Props) {
  return (
    <Card>
      <CardContent className="py-12 flex flex-col items-center justify-center text-center">
        <Icon className="w-12 h-12 text-muted-foreground/40 mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-md">{description}</p>
        {(action || secondaryAction) && (
          <div className="flex items-center gap-3 mt-4">
            {action && <Button onClick={action.onClick}>{action.label}</Button>}
            {secondaryAction && (
              <Button variant="ghost" onClick={secondaryAction.onClick}>
                {secondaryAction.label}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
