import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ShieldCheck, CheckCircle2, Circle, Eye } from 'lucide-react';
import type { TrainingCertReq, TrainingCertProgress, TrainingModuleContent } from '@/hooks/useSDCTraining';

interface Props {
  certRequirements: TrainingCertReq[];
  certProgress: TrainingCertProgress[];
  modules: TrainingModuleContent[];
  isAdmin: boolean;
  onViewDetails: () => void;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  not_started: { label: 'Not Started', color: 'bg-muted text-muted-foreground' },
  in_progress: { label: 'In Progress', color: 'bg-info/10 text-info' },
  pending_observation: { label: 'Pending Observation', color: 'bg-warning/10 text-warning' },
  certified: { label: 'Certified', color: 'bg-success/10 text-success' },
  expired: { label: 'Expired', color: 'bg-destructive/10 text-destructive' },
};

export function CertificationTab({ certRequirements, certProgress, modules, isAdmin, onViewDetails }: Props) {
  const isReqComplete = (req: TrainingCertReq) =>
    certProgress.some(p =>
      p.module_key === req.module_key &&
      p.requirement_type === req.requirement_type &&
      ['completed', 'approved'].includes(p.status)
    );

  const completedCount = certRequirements.filter(r => isReqComplete(r)).length;
  const totalCount = certRequirements.length;
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const hasObsPending = certRequirements.some(r => r.requirement_type === 'observation' && !isReqComplete(r));
  const overallStatus = completedCount === 0 ? 'not_started'
    : completedCount === totalCount ? 'certified'
    : hasObsPending && completedCount >= totalCount - 1 ? 'pending_observation'
    : 'in_progress';
  const cfg = statusConfig[overallStatus];

  if (certRequirements.length === 0) {
    return (
      <div className="text-center py-16">
        <ShieldCheck className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold text-foreground">No Certification Requirements</h3>
        <p className="text-muted-foreground mt-1">Certification requirements will appear here once configured.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Certification Tracker</h2>
          <p className="text-sm text-muted-foreground">Track SDC training certification status</p>
        </div>
        <Button variant="outline" size="sm" onClick={onViewDetails}>
          <Eye className="w-4 h-4 mr-2" /> Full Tracker
        </Button>
      </div>

      {/* Summary */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-foreground">SDC Behavior Training Certification</h3>
            <Badge className={cfg.color}>{cfg.label}</Badge>
          </div>
          <div className="flex items-center gap-3 mb-2">
            <Progress value={pct} className="flex-1 h-2.5" />
            <span className="text-sm font-medium text-muted-foreground">{completedCount}/{totalCount}</span>
          </div>
        </CardContent>
      </Card>

      {/* Requirements */}
      <div className="space-y-2">
        {certRequirements.map(req => {
          const done = isReqComplete(req);
          const modTitle = req.module_key ? modules.find(m => m.module_key === req.module_key)?.title : null;
          return (
            <Card key={req.id}>
              <CardContent className="p-4 flex items-center gap-3">
                {done
                  ? <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
                  : <Circle className="w-5 h-5 text-muted-foreground flex-shrink-0" />}
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{req.title}</p>
                  {req.description && <p className="text-xs text-muted-foreground">{req.description}</p>}
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">{req.requirement_type}</Badge>
                    {modTitle && <span className="text-xs text-muted-foreground">{modTitle}</span>}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
