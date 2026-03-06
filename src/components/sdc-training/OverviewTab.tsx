import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BookOpen, CheckCircle2, Clock, Download, Eye, Layers, PlayCircle, ShieldCheck } from 'lucide-react';
import type { TrainingModuleContent, TrainingDownload, TrainingCertReq, TrainingCertProgress, TrainingAssignmentV2 } from '@/hooks/useSDCTraining';

interface Props {
  modules: TrainingModuleContent[];
  downloads: TrainingDownload[];
  certRequirements: TrainingCertReq[];
  certProgress: TrainingCertProgress[];
  assignments: TrainingAssignmentV2[];
  onNavigate: (tab: string) => void;
}

export function OverviewTab({ modules, downloads, certRequirements, certProgress, assignments, onNavigate }: Props) {
  const completedCount = certProgress.filter(p => ['completed', 'approved'].includes(p.status)).length;
  const totalReqs = certRequirements.length;
  const pct = totalReqs > 0 ? Math.round((completedCount / totalReqs) * 100) : 0;

  const assignedToMe = assignments.filter(a => a.status === 'assigned').length;
  const inProgressAssigned = assignments.filter(a => a.status === 'in_progress').length;
  const completedAssigned = assignments.filter(a => a.status === 'completed').length;
  const pendingObs = certProgress.filter(p => p.requirement_type === 'observation' && p.status !== 'completed' && p.status !== 'approved').length
    + certRequirements.filter(r => r.requirement_type === 'observation' && !certProgress.some(p => p.requirement_type === 'observation' && ['completed', 'approved'].includes(p.status))).length;

  const summaryCards = [
    { label: 'Assigned to Me', value: assignedToMe, icon: Layers, color: 'text-primary' },
    { label: 'In Progress', value: inProgressAssigned, icon: PlayCircle, color: 'text-info' },
    { label: 'Completed', value: completedAssigned, icon: CheckCircle2, color: 'text-success' },
    { label: 'Pending Observation', value: pendingObs > 0 ? pendingObs : 0, icon: Eye, color: 'text-warning' },
    { label: 'Downloads', value: downloads.length, icon: Download, color: 'text-accent' },
  ];

  return (
    <div className="space-y-6">
      {/* Program description */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-bold text-foreground mb-2">SDC Behavior Training Program</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            This training program prepares Social Development Class staff — teachers, aides, behavior staff, and supervisors — to understand behavior as communication, use data-driven decision making, apply evidence-based interventions, and support students through structured, compassionate practice. Complete all modules and certification requirements to earn SDC Behavior Training Certification.
          </p>
          {totalReqs > 0 && (
            <div className="mt-4 flex items-center gap-3">
              <Progress value={pct} className="flex-1 h-2.5" />
              <span className="text-sm font-medium text-muted-foreground">{pct}% certified</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary cards */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
        {summaryCards.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => {
              if (label === 'Downloads') onNavigate('downloads');
              else if (label === 'Pending Observation') onNavigate('certification');
              else onNavigate('modules');
            }}>
            <CardContent className="p-4 text-center">
              <Icon className={`w-6 h-6 mx-auto mb-2 ${color}`} />
              <p className="text-2xl font-bold text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick links to modules */}
      <div>
        <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-accent" /> Training Modules
        </h3>
        <div className="grid gap-2 md:grid-cols-2">
          {modules.map((mod, idx) => (
            <Card key={mod.module_key} className="cursor-pointer hover:shadow-sm transition-shadow"
              onClick={() => onNavigate('modules')}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{mod.title}</p>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {mod.estimated_minutes} min
                  </span>
                </div>
                <Badge variant="secondary" className="text-xs flex-shrink-0">{mod.status}</Badge>
              </CardContent>
            </Card>
          ))}
          {modules.length === 0 && (
            <p className="text-sm text-muted-foreground italic col-span-2">No modules available yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
