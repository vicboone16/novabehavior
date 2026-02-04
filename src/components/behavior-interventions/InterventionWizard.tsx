import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Search,
  ChevronRight,
  ChevronLeft,
  Target,
  Lightbulb,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  BookOpen,
  Zap,
  Clock,
  Plus,
} from 'lucide-react';
import {
  usePresentingProblems,
  useProblemObjectives,
  useObjectiveStrategies,
  useStudentBxPlan,
} from '@/hooks/useBehaviorInterventions';
import type {
  BxPresentingProblem,
  BxObjective,
  BxStrategy,
  StrategyPhase,
} from '@/types/behaviorIntervention';
import { BX_DOMAINS } from '@/types/behaviorIntervention';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface InterventionWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentName: string;
  /** If provided, starts with this problem selected */
  initialProblemId?: string;
}

type WizardStep = 'problem' | 'objective' | 'strategies' | 'confirm';

const PHASE_CONFIG: Record<StrategyPhase, { label: string; icon: React.ReactNode; color: string }> = {
  prevention: { label: 'Prevention', icon: <Clock className="w-3 h-3" />, color: 'bg-primary/10 text-primary' },
  teaching: { label: 'Teaching', icon: <Lightbulb className="w-3 h-3" />, color: 'bg-accent text-accent-foreground' },
  reinforcement: { label: 'Reinforcement', icon: <CheckCircle2 className="w-3 h-3" />, color: 'bg-secondary text-secondary-foreground' },
  maintenance: { label: 'Maintenance', icon: <Target className="w-3 h-3" />, color: 'bg-muted text-muted-foreground' },
  crisis: { label: 'Crisis', icon: <Zap className="w-3 h-3" />, color: 'bg-destructive/10 text-destructive' },
};

export function InterventionWizard({
  open,
  onOpenChange,
  studentId,
  studentName,
  initialProblemId,
}: InterventionWizardProps) {
  const [step, setStep] = useState<WizardStep>('problem');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);

  // Selection state
  const [selectedProblem, setSelectedProblem] = useState<BxPresentingProblem | null>(null);
  const [selectedObjective, setSelectedObjective] = useState<BxObjective | null>(null);
  const [selectedStrategies, setSelectedStrategies] = useState<Array<BxStrategy & { phase: string }>>([]);
  
  // Customization notes
  const [customNotes, setCustomNotes] = useState('');
  const [targetBehaviorLabel, setTargetBehaviorLabel] = useState('');

  // Data hooks
  const { problems, loading: loadingProblems } = usePresentingProblems(selectedDomain || undefined);
  const { objectives, loading: loadingObjectives } = useProblemObjectives(selectedProblem?.id);
  const { strategies, loading: loadingStrategies } = useObjectiveStrategies(selectedObjective?.id);
  const { addLink, refetch } = useStudentBxPlan(studentId);

  // Initialize with problem if provided
  useEffect(() => {
    if (initialProblemId && problems.length > 0) {
      const problem = problems.find(p => p.id === initialProblemId);
      if (problem) {
        setSelectedProblem(problem);
        setStep('objective');
      }
    }
  }, [initialProblemId, problems]);

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      setStep('problem');
      setSearchQuery('');
      setSelectedDomain(null);
      setSelectedProblem(null);
      setSelectedObjective(null);
      setSelectedStrategies([]);
      setCustomNotes('');
      setTargetBehaviorLabel('');
    }
  }, [open]);

  // Filter problems by search
  const filteredProblems = useMemo(() => {
    if (!searchQuery.trim()) return problems;
    const q = searchQuery.toLowerCase();
    return problems.filter(
      p =>
        p.title.toLowerCase().includes(q) ||
        p.problem_code.toLowerCase().includes(q) ||
        p.definition?.toLowerCase().includes(q) ||
        p.domain.toLowerCase().includes(q) ||
        p.examples?.some(ex => ex.toLowerCase().includes(q))
    );
  }, [problems, searchQuery]);

  // Group by domain
  const groupedProblems = useMemo(() => {
    return filteredProblems.reduce((acc, p) => {
      if (!acc[p.domain]) acc[p.domain] = [];
      acc[p.domain].push(p);
      return acc;
    }, {} as Record<string, BxPresentingProblem[]>);
  }, [filteredProblems]);

  // Group strategies by phase
  const strategiesByPhase = useMemo(() => {
    return strategies.reduce((acc, s) => {
      const phase = s.phase as StrategyPhase;
      if (!acc[phase]) acc[phase] = [];
      acc[phase].push(s);
      return acc;
    }, {} as Record<StrategyPhase, typeof strategies>);
  }, [strategies]);

  const toggleStrategy = (strategy: BxStrategy & { phase: string }) => {
    setSelectedStrategies(prev => {
      const exists = prev.find(s => s.id === strategy.id);
      if (exists) {
        return prev.filter(s => s.id !== strategy.id);
      }
      return [...prev, strategy];
    });
  };

  const handleNext = () => {
    if (step === 'problem' && selectedProblem) {
      setStep('objective');
    } else if (step === 'objective' && selectedObjective) {
      setStep('strategies');
    } else if (step === 'strategies') {
      setStep('confirm');
    }
  };

  const handleBack = () => {
    if (step === 'objective') {
      setStep('problem');
    } else if (step === 'strategies') {
      setStep('objective');
    } else if (step === 'confirm') {
      setStep('strategies');
    }
  };

  const handleSave = async () => {
    try {
      // Add the intervention link(s) to the student's plan
      // If strategies are selected, create a link for each; otherwise just link problem+objective
      if (selectedStrategies.length > 0) {
        for (const strategy of selectedStrategies) {
          await addLink({
            problem_id: selectedProblem?.id,
            objective_id: selectedObjective?.id,
            strategy_id: strategy.id,
            link_status: 'considering',
            target_behavior_label: targetBehaviorLabel || selectedProblem?.title,
            function_hypothesis: selectedProblem?.function_tags as any || [],
            notes: customNotes || `${strategy.strategy_name} from ${selectedObjective?.objective_title}`,
          });
        }
      } else if (selectedObjective) {
        await addLink({
          problem_id: selectedProblem?.id,
          objective_id: selectedObjective.id,
          link_status: 'considering',
          target_behavior_label: targetBehaviorLabel || selectedProblem?.title,
          function_hypothesis: selectedProblem?.function_tags as any || [],
          notes: customNotes || selectedObjective.objective_title,
        });
      } else if (selectedProblem) {
        await addLink({
          problem_id: selectedProblem.id,
          link_status: 'considering',
          target_behavior_label: targetBehaviorLabel || selectedProblem.title,
          function_hypothesis: selectedProblem.function_tags as any || [],
          notes: customNotes,
        });
      }

      toast.success('Intervention added to student plan');
      refetch();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving intervention:', error);
      toast.error('Failed to save intervention');
    }
  };

  const getDomainLabel = (domain: string) => {
    const d = BX_DOMAINS.find(bd => bd.domain === domain);
    return d?.labels.join(' / ') || domain;
  };

  const canProceed = () => {
    switch (step) {
      case 'problem': return !!selectedProblem;
      case 'objective': return true; // Optional
      case 'strategies': return true; // Optional
      case 'confirm': return true;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Add Intervention for {studentName}
          </DialogTitle>
          <DialogDescription>
            Search for a problem behavior, select objectives, and choose strategies
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 py-2">
          {(['problem', 'objective', 'strategies', 'confirm'] as WizardStep[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                  step === s
                    ? 'bg-primary text-primary-foreground'
                    : i < ['problem', 'objective', 'strategies', 'confirm'].indexOf(step)
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {i + 1}
              </div>
              <span className={cn(
                'text-sm capitalize hidden sm:inline',
                step === s ? 'font-medium' : 'text-muted-foreground'
              )}>
                {s}
              </span>
              {i < 3 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            </div>
          ))}
        </div>

        <Separator />

        {/* Step content */}
        <div className="flex-1 overflow-hidden">
          {/* Step 1: Select Problem */}
          {step === 'problem' && (
            <div className="h-full flex flex-col gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by problem name, code, or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  autoFocus
                />
              </div>

              {/* Domain filter */}
              <div className="flex flex-wrap gap-1">
                <Badge
                  variant={selectedDomain === null ? 'default' : 'outline'}
                  className="cursor-pointer text-xs"
                  onClick={() => setSelectedDomain(null)}
                >
                  All
                </Badge>
                {BX_DOMAINS.map((d) => (
                  <Badge
                    key={d.domain}
                    variant={selectedDomain === d.domain ? 'default' : 'outline'}
                    className="cursor-pointer text-xs"
                    onClick={() => setSelectedDomain(selectedDomain === d.domain ? null : d.domain)}
                  >
                    {d.labels[0]}
                  </Badge>
                ))}
              </div>

              <ScrollArea className="flex-1">
                {loadingProblems ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredProblems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No problems found matching your search.</p>
                  </div>
                ) : (
                  <div className="space-y-3 pr-4">
                    {Object.entries(groupedProblems).map(([domain, probs]) => (
                      <div key={domain}>
                        <h4 className="text-xs font-medium text-muted-foreground mb-2 sticky top-0 bg-background py-1">
                          {getDomainLabel(domain)} ({probs.length})
                        </h4>
                        <div className="space-y-1">
                          {probs.map((problem) => (
                            <div
                              key={problem.id}
                              className={cn(
                                'p-3 rounded-lg cursor-pointer transition-colors border',
                                selectedProblem?.id === problem.id
                                  ? 'bg-primary/10 border-primary'
                                  : 'bg-muted/30 border-transparent hover:bg-muted/50'
                              )}
                              onClick={() => setSelectedProblem(problem)}
                            >
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs font-mono">
                                  {problem.problem_code}
                                </Badge>
                                <span className="font-medium text-sm">{problem.title}</span>
                                <Badge variant="secondary" className="text-xs ml-auto capitalize">
                                  {problem.risk_level}
                                </Badge>
                              </div>
                              {problem.definition && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                  {problem.definition}
                                </p>
                              )}
                              {problem.function_tags && problem.function_tags.length > 0 && (
                                <div className="flex gap-1 mt-2">
                                  {problem.function_tags.map(tag => (
                                    <Badge key={tag} variant="outline" className="text-xs capitalize">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          )}

          {/* Step 2: Select Objective */}
          {step === 'objective' && (
            <div className="h-full flex flex-col gap-3">
              {selectedProblem && (
                <Card className="bg-muted/50">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs font-mono">
                        {selectedProblem.problem_code}
                      </Badge>
                      <span className="font-medium text-sm">{selectedProblem.title}</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              <ScrollArea className="flex-1">
                {loadingObjectives ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : objectives.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No objectives linked to this problem.</p>
                    <p className="text-xs mt-1">You can still add the problem directly to the student.</p>
                  </div>
                ) : (
                  <div className="space-y-2 pr-4">
                    <h4 className="text-xs font-medium text-muted-foreground">
                      Select an objective ({objectives.length} available)
                    </h4>
                    {objectives.map((obj) => (
                      <div
                        key={obj.id}
                        className={cn(
                          'p-3 rounded-lg cursor-pointer transition-colors border',
                          selectedObjective?.id === obj.id
                            ? 'bg-primary/10 border-primary'
                            : 'bg-muted/30 border-transparent hover:bg-muted/50'
                        )}
                        onClick={() => setSelectedObjective(obj)}
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs font-mono">
                            {obj.objective_code}
                          </Badge>
                          <span className="font-medium text-sm">{obj.objective_title}</span>
                        </div>
                        {obj.operational_definition && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {obj.operational_definition}
                          </p>
                        )}
                        {obj.mastery_criteria && (
                          <p className="text-xs mt-1">
                            <span className="font-medium">Mastery:</span>{' '}
                            <span className="text-muted-foreground">{obj.mastery_criteria}</span>
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          )}

          {/* Step 3: Select Strategies */}
          {step === 'strategies' && (
            <div className="h-full flex flex-col gap-3">
              {selectedObjective && (
                <Card className="bg-muted/50">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs font-mono">
                        {selectedObjective.objective_code}
                      </Badge>
                      <span className="font-medium text-sm">{selectedObjective.objective_title}</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              <ScrollArea className="flex-1">
                {loadingStrategies ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : strategies.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Lightbulb className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No strategies linked to this objective.</p>
                    <p className="text-xs mt-1">You can still add the objective without strategies.</p>
                  </div>
                ) : (
                  <div className="space-y-4 pr-4">
                    <h4 className="text-xs font-medium text-muted-foreground">
                      Select strategies to include ({selectedStrategies.length} selected)
                    </h4>
                    {(Object.keys(PHASE_CONFIG) as StrategyPhase[]).map(phase => {
                      const phaseStrategies = strategiesByPhase[phase];
                      if (!phaseStrategies || phaseStrategies.length === 0) return null;

                      const config = PHASE_CONFIG[phase];

                      return (
                        <div key={phase}>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={cn("text-xs", config.color)}>
                              {config.icon}
                              <span className="ml-1">{config.label}</span>
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {phaseStrategies.length} strateg{phaseStrategies.length === 1 ? 'y' : 'ies'}
                            </span>
                          </div>
                          <div className="space-y-2 ml-2">
                            {phaseStrategies.map(strategy => {
                              const isSelected = selectedStrategies.some(s => s.id === strategy.id);
                              return (
                                <div
                                  key={strategy.id}
                                  className={cn(
                                    'p-3 rounded-lg cursor-pointer transition-colors border',
                                    isSelected
                                      ? 'bg-primary/10 border-primary'
                                      : 'bg-muted/30 border-transparent hover:bg-muted/50'
                                  )}
                                  onClick={() => toggleStrategy(strategy)}
                                >
                                  <div className="flex items-start gap-2">
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={() => toggleStrategy(strategy)}
                                      className="mt-0.5"
                                    />
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-xs font-mono">
                                          {strategy.strategy_code}
                                        </Badge>
                                        <span className="font-medium text-sm">{strategy.strategy_name}</span>
                                        {strategy.requires_bcba && (
                                          <Badge variant="destructive" className="text-xs ml-auto">
                                            <AlertTriangle className="w-3 h-3 mr-1" />
                                            BCBA Required
                                          </Badge>
                                        )}
                                      </div>
                                      {strategy.implementation_steps && strategy.implementation_steps.length > 0 && (
                                        <ul className="mt-2 text-xs text-muted-foreground list-disc list-inside">
                                          {strategy.implementation_steps.slice(0, 2).map((step, i) => (
                                            <li key={i}>{step}</li>
                                          ))}
                                          {strategy.implementation_steps.length > 2 && (
                                            <li className="text-primary">+{strategy.implementation_steps.length - 2} more</li>
                                          )}
                                        </ul>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </div>
          )}

          {/* Step 4: Confirm & Customize */}
          {step === 'confirm' && (
            <ScrollArea className="h-full">
              <div className="space-y-4 pr-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {selectedProblem && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Problem</Label>
                        <p className="text-sm font-medium">{selectedProblem.title}</p>
                      </div>
                    )}
                    {selectedObjective && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Objective</Label>
                        <p className="text-sm font-medium">{selectedObjective.objective_title}</p>
                      </div>
                    )}
                    {selectedStrategies.length > 0 && (
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Strategies ({selectedStrategies.length})
                        </Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedStrategies.map(s => (
                            <Badge key={s.id} variant="secondary" className="text-xs">
                              {s.strategy_name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="space-y-3">
                  <div>
                    <Label className="text-sm">Target Behavior Label (optional)</Label>
                    <Input
                      placeholder={selectedProblem?.title || 'Enter a custom label...'}
                      value={targetBehaviorLabel}
                      onChange={(e) => setTargetBehaviorLabel(e.target.value)}
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Customize how this intervention appears on the student's plan
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm">Implementation Notes (optional)</Label>
                    <Textarea
                      placeholder="Add any customization notes, modifications, or considerations..."
                      value={customNotes}
                      onChange={(e) => setCustomNotes(e.target.value)}
                      rows={3}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
        </div>

        <Separator />

        {/* Navigation buttons */}
        <div className="flex justify-between pt-2">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={step === 'problem'}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {step === 'confirm' ? (
              <Button onClick={handleSave}>
                <Plus className="w-4 h-4 mr-1" />
                Add to Plan
              </Button>
            ) : (
              <Button onClick={handleNext} disabled={!canProceed()}>
                {step === 'objective' && !selectedObjective ? 'Skip' : 'Next'}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
