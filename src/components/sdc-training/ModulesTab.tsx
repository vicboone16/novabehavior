import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, BookOpen, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { SDCModule } from '@/hooks/useSDCTraining';

interface Props {
  modules: SDCModule[];
}

const statusColor: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  published: 'bg-success/10 text-success',
  active: 'bg-success/10 text-success',
  archived: 'bg-destructive/10 text-destructive',
};

export function ModulesTab({ modules }: Props) {
  const navigate = useNavigate();

  if (modules.length === 0) {
    return (
      <div className="text-center py-16">
        <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold text-foreground">No SDC Modules Yet</h3>
        <p className="text-muted-foreground mt-1">Training modules will appear here once created.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-foreground">SDC Training Modules</h2>
        <p className="text-sm text-muted-foreground">Click a module for full details</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {modules.map((mod) => (
          <Card
            key={mod.id}
            className="cursor-pointer hover:shadow-md transition-all hover:border-primary/30"
            onClick={() => navigate(`/sdc-training/module/${mod.id}`)}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
                  {mod.sort_order}
                </div>
                <Badge className={statusColor[mod.status] || statusColor.draft}>{mod.status}</Badge>
              </div>
              <h3 className="font-semibold text-foreground mb-1">{mod.title}</h3>
              {mod.training_objective && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{mod.training_objective}</p>
              )}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{mod.estimated_minutes} min</span>
                <span className="flex items-center gap-1"><Target className="w-3 h-3" />{mod.key_definitions?.length || 0} definitions</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
