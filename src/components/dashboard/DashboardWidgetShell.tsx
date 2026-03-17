import { ReactNode } from 'react';
import { X, GripVertical } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface DashboardWidgetShellProps {
  title: string;
  icon?: ReactNode;
  onRemove?: () => void;
  children: ReactNode;
  className?: string;
}

export function DashboardWidgetShell({ title, icon, onRemove, children, className }: DashboardWidgetShellProps) {
  return (
    <Card className={`h-full flex flex-col overflow-hidden touch-manipulation ${className || ''}`}>
      <CardHeader className="py-2 px-3 flex-row items-center justify-between space-y-0 gap-2 border-b border-border/50 cursor-grab active:cursor-grabbing drag-handle">
        <div className="flex items-center gap-2 min-w-0">
          <GripVertical className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          {icon}
          <CardTitle className="text-sm font-semibold truncate">{title}</CardTitle>
        </div>
        {onRemove && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex-1 overflow-auto p-3 overscroll-contain">
        {children}
      </CardContent>
    </Card>
  );
}
