import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ShieldCheck, CheckCircle2, Circle, User } from 'lucide-react';
import { useSDCTraining } from '@/hooks/useSDCTraining';
import { useAuth } from '@/contexts/AuthContext';

const statusConfig: Record<string, { label: string; color: string }> = {
  not_started: { label: 'Not Started', color: 'bg-muted text-muted-foreground' },
  in_progress: { label: 'In Progress', color: 'bg-info/10 text-info' },
  pending_observation: { label: 'Pending Observation', color: 'bg-warning/10 text-warning' },
  certified: { label: 'Certified', color: 'bg-success/10 text-success' },
  completed: { label: 'Completed', color: 'bg-success/10 text-success' },
  approved: { label: 'Approved', color: 'bg-success/10 text-success' },
  expired: { label: 'Expired', color: 'bg-destructive/10 text-destructive' },
};

export default function SDCCertificationTracker() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    certRequirements, certProgress, trainingModules,
    isLoading, isAdmin, fetchAll, completeTrainingRequirement,
  } = useSDCTraining();

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const isReqComplete = (req: typeof certRequirements[0]) => {
    return certProgress.some(p =>
      p.module_key === req.module_key &&
      p.requirement_type === req.requirement_type &&
      ['completed', 'approved'].includes(p.status)
    );
  };

  const completedCount = certRequirements.filter(r => isReqComplete(r)).length;
  const totalCount = certRequirements.length;
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const overallStatus = completedCount === 0 ? 'not_started'
    : completedCount === totalCount ? 'certified'
    : 'in_progress';
  const cfg = statusConfig[overallStatus];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Button variant="ghost" size="sm" onClick={() => navigate('/sdc-training')} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Team Trainings
          </Button>
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-accent" />
            <h1 className="text-2xl font-bold text-foreground">SDC Certification Tracker</h1>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Summary Card */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold text-foreground">Team Training Certification</h2>
              </div>
              <Badge className={cfg.color}>{cfg.label}</Badge>
            </div>
            <div className="flex items-center gap-3 mb-2">
              <Progress value={pct} className="flex-1 h-2.5" />
              <span className="text-sm font-medium text-muted-foreground">{completedCount}/{totalCount}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Complete all requirements to earn Team Training certification.
            </p>
          </CardContent>
        </Card>

        {/* Requirements List */}
        <h3 className="font-semibold text-foreground">Requirements</h3>
        {certRequirements.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No certification requirements defined yet.</p>
        ) : (
          <div className="space-y-2">
            {certRequirements.map((req) => {
              const done = isReqComplete(req);
              const moduleTitle = req.module_key
                ? trainingModules.find(m => m.module_key === req.module_key)?.title
                : null;
              return (
                <Card key={req.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {done
                        ? <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
                        : <Circle className="w-5 h-5 text-muted-foreground flex-shrink-0" />}
                      <div>
                        <p className="text-sm font-medium text-foreground">{req.title}</p>
                        {req.description && (
                          <p className="text-xs text-muted-foreground">{req.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">{req.requirement_type}</Badge>
                          {moduleTitle && (
                            <span className="text-xs text-muted-foreground">Module: {moduleTitle}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {!done && isAdmin && req.module_key && (
                      <Button size="sm" variant="outline"
                        onClick={() => completeTrainingRequirement(req.module_key!, req.requirement_type)}>
                        Mark Complete
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
