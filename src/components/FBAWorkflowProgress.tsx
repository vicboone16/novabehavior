import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { 
  FileText, BookOpen, Users, Eye, BarChart3, Brain, CheckCircle2, 
  ArrowRight, ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Student } from '@/types/behavior';

// FBA Workflow Steps (duplicated from AssessmentDashboard for now)
const FBA_WORKFLOW_STEPS = [
  { id: 'referral', label: 'Referral & Consent', icon: FileText },
  { id: 'records', label: 'Records Review', icon: BookOpen },
  { id: 'indirect', label: 'Indirect Assessment', icon: Users },
  { id: 'direct', label: 'Direct Observation', icon: Eye },
  { id: 'analysis', label: 'Data Analysis', icon: BarChart3 },
  { id: 'hypothesis', label: 'Hypothesis Statement', icon: Brain },
  { id: 'report', label: 'Report Generation', icon: FileText },
];

interface FBAWorkflowProgressProps {
  student: Student;
}

export function FBAWorkflowProgress({ student }: FBAWorkflowProgressProps) {
  const navigate = useNavigate();

  const workflowProgress = useMemo(() => {
    const progress = student.fbaWorkflowProgress;
    if (!progress) {
      return {
        completedSteps: new Set<number>(),
        currentStep: 0,
        percentage: 0,
        updatedAt: null,
      };
    }
    
    const completedSet = new Set(progress.completedSteps);
    return {
      completedSteps: completedSet,
      currentStep: progress.currentStep,
      percentage: Math.round((completedSet.size / FBA_WORKFLOW_STEPS.length) * 100),
      updatedAt: progress.updatedAt ? new Date(progress.updatedAt) : null,
    };
  }, [student.fbaWorkflowProgress]);

  const handleNavigateToAssessment = () => {
    // Navigate to assessment dashboard - it will auto-select this student
    navigate('/assessment');
  };

  const hasStartedWorkflow = workflowProgress.completedSteps.size > 0;
  const isComplete = workflowProgress.percentage === 100;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" />
            FBA Workflow Progress
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleNavigateToAssessment}
            className="gap-1"
          >
            <ExternalLink className="w-3 h-3" />
            Open in Assessment
          </Button>
        </div>
        {workflowProgress.updatedAt && (
          <CardDescription className="text-xs">
            Last updated: {format(workflowProgress.updatedAt, 'MMM d, yyyy h:mm a')}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Overall Progress</span>
            <span className="font-medium">{workflowProgress.percentage}%</span>
          </div>
          <Progress value={workflowProgress.percentage} className="h-2" />
        </div>

        {/* Workflow Steps */}
        <div className="space-y-1">
          {FBA_WORKFLOW_STEPS.map((step, index) => {
            const isCompleted = workflowProgress.completedSteps.has(index);
            const isCurrent = workflowProgress.currentStep === index;
            const StepIcon = step.icon;

            return (
              <div
                key={step.id}
                className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                  isCompleted 
                    ? 'bg-primary/10' 
                    : isCurrent 
                      ? 'bg-muted' 
                      : 'opacity-60'
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  isCompleted 
                    ? 'bg-primary text-primary-foreground' 
                    : isCurrent
                      ? 'bg-muted-foreground/20 text-foreground'
                      : 'bg-muted text-muted-foreground'
                }`}>
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <span className="text-xs font-medium">{index + 1}</span>
                  )}
                </div>
                <div className="flex-1 flex items-center gap-2">
                  <StepIcon className={`w-4 h-4 ${isCompleted ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={`text-sm ${isCompleted ? 'font-medium' : ''}`}>
                    {step.label}
                  </span>
                </div>
                {isCompleted && (
                  <Badge variant="secondary" className="text-xs">Done</Badge>
                )}
                {isCurrent && !isCompleted && (
                  <Badge variant="outline" className="text-xs">Current</Badge>
                )}
              </div>
            );
          })}
        </div>

        {/* Status Message */}
        {!hasStartedWorkflow && (
          <div className="p-3 bg-muted/50 rounded-lg text-center">
            <p className="text-sm text-muted-foreground">
              No FBA workflow started yet
            </p>
            <Button 
              variant="link" 
              size="sm" 
              onClick={handleNavigateToAssessment}
              className="mt-1"
            >
              Start FBA Assessment
              <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        )}

        {isComplete && (
          <div className="p-3 bg-primary/10 rounded-lg text-center border border-primary/20">
            <CheckCircle2 className="w-5 h-5 mx-auto mb-1 text-primary" />
            <p className="text-sm font-medium text-primary">
              FBA Workflow Complete!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
