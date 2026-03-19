import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, FileText, ArrowRight, Clock, CheckCircle, Send, PenTool, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { FormInstance } from '@/hooks/useIntakeFormsEngine';

interface Props {
  instances: FormInstance[];
  title: string;
  emptyMessage: string;
  onOpen: (id: string) => void;
  isLoading: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: any }> = {
  draft: { label: 'Draft', variant: 'outline', icon: Clock },
  in_progress: { label: 'In Progress', variant: 'secondary', icon: Clock },
  sent: { label: 'Sent', variant: 'default', icon: Send },
  parent_opened: { label: 'Opened', variant: 'secondary', icon: User },
  parent_partially_completed: { label: 'Partial', variant: 'secondary', icon: User },
  submitted: { label: 'Submitted', variant: 'default', icon: CheckCircle },
  staff_review: { label: 'Review', variant: 'destructive', icon: FileText },
  finalized: { label: 'Finalized', variant: 'default', icon: CheckCircle },
  archived: { label: 'Archived', variant: 'outline', icon: FileText },
};

export function IntakeInstancesList({ instances, title, emptyMessage, onOpen, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground">{title}</h3>

      {instances.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          </CardContent>
        </Card>
      ) : (
        instances.map(instance => {
          const config = STATUS_CONFIG[instance.status] || STATUS_CONFIG.draft;
          const StatusIcon = config.icon;
          const templateName = (instance as any).form_templates?.name || instance.title_override || 'Untitled Form';
          const sigCount = (instance.form_signatures || []).length;

          return (
            <Card
              key={instance.id}
              className="hover:shadow-sm transition-shadow cursor-pointer"
              onClick={() => onOpen(instance.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{templateName}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {instance.respondent_name && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {instance.respondent_name}
                          </span>
                        )}
                        {instance.completion_mode && (
                          <Badge variant="outline" className="text-[10px] h-4 px-1">
                            {instance.completion_mode}
                          </Badge>
                        )}
                        {instance.last_saved_at && (
                          <span>Saved {formatDistanceToNow(new Date(instance.last_saved_at), { addSuffix: true })}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {sigCount > 0 && (
                      <Badge variant="secondary" className="text-xs gap-1">
                        <PenTool className="h-3 w-3" />
                        {sigCount}
                      </Badge>
                    )}
                    <Badge variant={config.variant} className="text-xs gap-1">
                      <StatusIcon className="h-3 w-3" />
                      {config.label}
                    </Badge>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
