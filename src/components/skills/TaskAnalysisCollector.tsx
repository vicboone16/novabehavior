import { useState, useEffect } from 'react';
import { Check, X, ListChecks } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { usePromptLevels } from '@/hooks/useSkillPrograms';
import type { TaskAnalysisStep } from '@/types/skillPrograms';

interface TaskAnalysisCollectorProps {
  targetId: string;
  sessionId: string;
  taStepResults: Record<string, { outcome: string; promptLevelId: string | null }>;
  onRecordStep: (targetId: string, stepId: string, outcome: string, promptLevelId: string | null) => Promise<void>;
}

export function TaskAnalysisCollector({ targetId, sessionId, taStepResults, onRecordStep }: TaskAnalysisCollectorProps) {
  const [steps, setSteps] = useState<TaskAnalysisStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPromptId, setSelectedPromptId] = useState('');
  const promptLevels = usePromptLevels();

  useEffect(() => {
    (async () => {
      const { data, error } = await (supabase as any)
        .from('task_analysis_steps')
        .select('*')
        .eq('target_id', targetId)
        .order('step_number', { ascending: true });
      if (!error && data) setSteps(data);
      setLoading(false);
    })();
  }, [targetId]);

  useEffect(() => {
    if (promptLevels.length > 0 && !selectedPromptId) {
      const indep = promptLevels.find(pl => pl.abbreviation === 'I');
      setSelectedPromptId(indep?.id || promptLevels[0]?.id || '');
    }
  }, [promptLevels, selectedPromptId]);

  if (loading) return <p className="text-xs text-muted-foreground p-2">Loading steps…</p>;

  if (steps.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-4 text-center text-sm text-muted-foreground">
          <ListChecks className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
          No task analysis steps defined for this target. Add steps in the target settings first.
        </CardContent>
      </Card>
    );
  }

  const completedCount = Object.keys(taStepResults).length;
  const correctCount = Object.values(taStepResults).filter(r => r.outcome === 'correct' || r.outcome === 'independent').length;
  const pct = completedCount > 0 ? Math.round((correctCount / completedCount) * 100) : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <ListChecks className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium">Task Analysis Steps</span>
        <Badge variant="outline" className="text-[10px]">
          {completedCount}/{steps.length} scored
        </Badge>
        {completedCount > 0 && (
          <Badge className={`text-[10px] ${pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-destructive'} text-white`}>
            {pct}%
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-muted-foreground">Prompt:</span>
        <Select value={selectedPromptId} onValueChange={setSelectedPromptId}>
          <SelectTrigger className="h-7 text-xs w-auto min-w-[120px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {promptLevels.map(pl => (
              <SelectItem key={pl.id} value={pl.id}>{pl.name} ({pl.abbreviation})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        {steps.map((step) => {
          const result = taStepResults[step.id];
          const isScored = !!result;

          return (
            <div
              key={step.id}
              className={`flex items-center gap-2 p-2 rounded border text-sm ${
                isScored
                  ? result.outcome === 'correct' || result.outcome === 'independent'
                    ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200'
                    : 'bg-red-50 dark:bg-red-950/20 border-red-200'
                  : 'bg-background border-border'
              }`}
            >
              <span className="text-xs font-mono text-muted-foreground w-6 shrink-0 text-center">
                {step.step_number}
              </span>
              <span className="flex-1 text-xs truncate">{step.step_label}</span>
              {isScored ? (
                <Badge className={`text-[10px] ${
                  result.outcome === 'correct' || result.outcome === 'independent'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-destructive text-white'
                }`}>
                  {result.outcome === 'correct' || result.outcome === 'independent' ? '✓' : '✗'}
                </Badge>
              ) : (
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 w-6 p-0 border-emerald-300 text-emerald-600 hover:bg-emerald-50"
                    onClick={() => onRecordStep(targetId, step.id, 'correct', selectedPromptId || null)}
                  >
                    <Check className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 w-6 p-0 border-red-300 text-red-600 hover:bg-red-50"
                    onClick={() => onRecordStep(targetId, step.id, 'incorrect', selectedPromptId || null)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
