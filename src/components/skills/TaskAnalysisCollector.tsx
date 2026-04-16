/**
 * TaskAnalysisCollector
 * 
 * Step-by-step data collection for task analysis programs.
 * Loads steps from `task_analysis_steps`, lets user score each step
 * as independent/prompted/incorrect, records to `task_analysis_step_data`.
 */

import { useState, useEffect } from 'react';
import {
  Check,
  X,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  ListChecks,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { usePromptLevels } from '@/hooks/useSkillPrograms';
import type { SkillTarget, SkillProgram, TaskAnalysisStep } from '@/types/skillPrograms';

interface StepResult {
  stepId: string;
  outcome: 'independent' | 'prompted' | 'incorrect' | 'no_response';
  promptLevelId: string | null;
}

interface TaskAnalysisCollectorProps {
  target: SkillTarget;
  program: SkillProgram;
  sessionId: string | null;
  onRecordStep?: (stepId: string, outcome: string, promptLevelId: string | null) => Promise<void>;
  onComplete?: (results: StepResult[]) => void;
}

export function TaskAnalysisCollector({
  target,
  program,
  sessionId,
  onRecordStep,
  onComplete,
}: TaskAnalysisCollectorProps) {
  const promptLevels = usePromptLevels();
  const [steps, setSteps] = useState<TaskAnalysisStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<Map<string, StepResult>>(new Map());
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [selectedPromptId, setSelectedPromptId] = useState('');
  const [showAllSteps, setShowAllSteps] = useState(false);

  useEffect(() => {
    if (promptLevels.length > 0 && !selectedPromptId) {
      const indep = promptLevels.find(pl => pl.abbreviation === 'I');
      setSelectedPromptId(indep?.id || promptLevels[promptLevels.length - 1]?.id || '');
    }
  }, [promptLevels, selectedPromptId]);

  useEffect(() => {
    const fetchSteps = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('task_analysis_steps')
        .select('*')
        .eq('target_id', target.id)
        .order('step_number');

      if (!error && data) {
        setSteps(data as unknown as TaskAnalysisStep[]);
      }
      setLoading(false);
    };
    fetchSteps();
  }, [target.id]);

  const totalSteps = steps.length;
  const completedSteps = results.size;
  const correctSteps = Array.from(results.values()).filter(
    r => r.outcome === 'independent'
  ).length;
  const percentCorrect = totalSteps > 0 ? Math.round((correctSteps / totalSteps) * 100) : 0;

  const handleScore = async (outcome: 'independent' | 'prompted' | 'incorrect' | 'no_response') => {
    const step = steps[currentStepIndex];
    if (!step) return;

    const result: StepResult = {
      stepId: step.id,
      outcome,
      promptLevelId: outcome === 'prompted' ? selectedPromptId : null,
    };

    if (onRecordStep) {
      await onRecordStep(step.id, outcome, result.promptLevelId);
    }

    setResults(prev => {
      const next = new Map(prev);
      next.set(step.id, result);
      return next;
    });

    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      const allResults = Array.from(results.values());
      allResults.push(result);
      onComplete?.(allResults);
    }
  };

  const handleUndoStep = () => {
    if (currentStepIndex > 0) {
      const prevStep = steps[currentStepIndex - 1];
      setResults(prev => {
        const next = new Map(prev);
        next.delete(prevStep.id);
        return next;
      });
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const getResultBadge = (stepId: string) => {
    const r = results.get(stepId);
    if (!r) return null;
    const colorMap: Record<string, string> = {
      independent: 'bg-emerald-500 text-white',
      prompted: 'bg-amber-500 text-white',
      incorrect: 'bg-red-500 text-white',
      no_response: 'bg-gray-500 text-white',
    };
    const labelMap: Record<string, string> = {
      independent: 'I',
      prompted: 'P',
      incorrect: '—',
      no_response: 'NR',
    };
    return (
      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${colorMap[r.outcome]}`}>
        {labelMap[r.outcome]}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        Loading task analysis steps...
      </div>
    );
  }

  if (steps.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <ListChecks className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="font-medium">No task analysis steps defined for this target.</p>
        <p className="text-sm">Add steps in the Programming tab first.</p>
      </div>
    );
  }

  const currentStep = steps[currentStepIndex];
  const allDone = completedSteps >= totalSteps;

  return (
    <div className="space-y-4">
      {/* Progress header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">Task Analysis</span>
          <Badge variant="outline" className="text-xs">
            Step {Math.min(currentStepIndex + 1, totalSteps)} of {totalSteps}
          </Badge>
        </div>
        <Progress value={(completedSteps / totalSteps) * 100} className="w-24 h-2" />
        <span className="text-sm font-bold" style={{
          color: percentCorrect >= 80 ? 'hsl(var(--chart-2))' : percentCorrect >= 50 ? 'hsl(var(--chart-4))' : 'hsl(var(--destructive))',
        }}>
          {completedSteps > 0 ? `${percentCorrect}%` : '—'}
        </span>
      </div>

      <div className="border-t border-border" />

      {/* Current step */}
      {!allDone && currentStep && (
        <Card>
          <CardContent className="pt-4 space-y-4">
            <div className="flex items-start gap-3">
              <Badge variant="secondary" className="text-xs shrink-0">
                Step {currentStep.step_number}
              </Badge>
              <span className="font-medium">{currentStep.step_label}</span>
            </div>

            {currentStep.step_notes && (
              <p className="text-sm text-muted-foreground ml-14">{currentStep.step_notes}</p>
            )}

            {/* Prompt selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Prompt:</span>
              <Select value={selectedPromptId} onValueChange={setSelectedPromptId}>
                <SelectTrigger className="w-48 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {promptLevels.map(pl => (
                    <SelectItem key={pl.id} value={pl.id}>
                      {pl.name} ({pl.abbreviation})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Score buttons */}
            <div className="grid grid-cols-4 gap-2">
              <Button
                className="h-12 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => handleScore('independent')}
              >
                <Check className="h-5 w-5 mr-1" />
                Indep
              </Button>
              <Button
                className="h-12 text-sm font-bold bg-amber-500 hover:bg-amber-600 text-white"
                onClick={() => handleScore('prompted')}
              >
                <HelpCircle className="h-5 w-5 mr-1" />
                Prompt
              </Button>
              <Button
                className="h-12 text-sm font-bold bg-red-600 hover:bg-red-700 text-white"
                onClick={() => handleScore('incorrect')}
              >
                <X className="h-5 w-5 mr-1" />
                Incor
              </Button>
              <Button
                variant="outline"
                className="h-12 text-sm font-bold"
                onClick={() => handleScore('no_response')}
              >
                NR
              </Button>
            </div>

            {/* Undo */}
            <Button variant="ghost" size="sm" onClick={handleUndoStep} disabled={currentStepIndex === 0}>
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Undo Previous Step
            </Button>
          </CardContent>
        </Card>
      )}

      {/* All done summary */}
      {allDone && (
        <Card>
          <CardContent className="pt-4 text-center">
            <Check className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
            <p className="font-medium">All {totalSteps} steps scored</p>
            <p className="text-lg font-bold mt-1" style={{
              color: percentCorrect >= 80 ? 'hsl(var(--chart-2))' : percentCorrect >= 50 ? 'hsl(var(--chart-4))' : 'hsl(var(--destructive))',
            }}>
              {correctSteps}/{totalSteps} independent ({percentCorrect}%)
            </p>
          </CardContent>
        </Card>
      )}

      {/* Step overview (collapsible) */}
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start text-xs"
        onClick={() => setShowAllSteps(!showAllSteps)}
      >
        {showAllSteps ? <ChevronDown className="h-3.5 w-3.5 mr-1" /> : <ChevronRight className="h-3.5 w-3.5 mr-1" />}
        View all steps
      </Button>

      {showAllSteps && (
        <div className="space-y-1 ml-2">
          {steps.map((step, i) => (
            <div key={step.id} className={`flex items-center gap-2 text-sm py-1 ${i === currentStepIndex && !allDone ? 'font-bold text-primary' : 'text-muted-foreground'}`}>
              <span className="w-6 text-right">{step.step_number}.</span>
              <span className="flex-1">{step.step_label}</span>
              {getResultBadge(step.id)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
