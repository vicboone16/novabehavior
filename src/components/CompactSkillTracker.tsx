import { useState, useMemo } from 'react';
import { 
  Target, Check, X, ChevronDown, ChevronUp, 
  RotateCcw, Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  SkillTarget, 
  DTTTrial, 
  DTTSession,
  PromptLevel, 
  PROMPT_LEVEL_LABELS,
  PROMPT_LEVEL_ORDER,
} from '@/types/behavior';
import { useToast } from '@/hooks/use-toast';

interface CompactSkillTrackerProps {
  studentId: string;
  skillTarget: SkillTarget;
  studentColor: string;
  sessions: DTTSession[];
  activeTargetIds: string[];
  onToggleActive: (targetId: string) => void;
  onAddTrial: (skillTargetId: string, trial: Omit<DTTTrial, 'id'>) => void;
  onSaveSession: (session: Omit<DTTSession, 'id'>) => void;
}

export function CompactSkillTracker({
  studentId,
  skillTarget,
  studentColor,
  sessions,
  activeTargetIds,
  onToggleActive,
  onAddTrial,
  onSaveSession,
}: CompactSkillTrackerProps) {
  const { toast } = useToast();
  const [currentTrials, setCurrentTrials] = useState<DTTTrial[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<PromptLevel>('verbal');

  const isActive = activeTargetIds.includes(skillTarget.id);

  // Calculate current session stats
  const sessionStats = useMemo(() => {
    if (currentTrials.length === 0) {
      return { correct: 0, total: 0, percentCorrect: 0 };
    }
    const correct = currentTrials.filter(t => t.isCorrect).length;
    return {
      correct,
      total: currentTrials.length,
      percentCorrect: Math.round((correct / currentTrials.length) * 100),
    };
  }, [currentTrials]);

  const handleCorrectTrial = () => {
    const trial: DTTTrial = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      isCorrect: true,
      promptLevel: selectedPrompt,
    };
    setCurrentTrials(prev => [...prev, trial]);
    onAddTrial(skillTarget.id, trial);
  };

  const handleIncorrectTrial = () => {
    const trial: DTTTrial = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      isCorrect: false,
      promptLevel: selectedPrompt,
      errorType: 'incorrect',
    };
    setCurrentTrials(prev => [...prev, trial]);
    onAddTrial(skillTarget.id, trial);
  };

  const handleUndoLastTrial = () => {
    if (currentTrials.length === 0) return;
    setCurrentTrials(prev => prev.slice(0, -1));
  };

  const handleSaveSession = () => {
    if (currentTrials.length === 0) return;

    const percentIndependent = Math.round(
      (currentTrials.filter(t => t.promptLevel === 'independent' && t.isCorrect).length / 
       currentTrials.length) * 100
    );

    const session: Omit<DTTSession, 'id'> = {
      skillTargetId: skillTarget.id,
      studentId,
      date: new Date(),
      trials: currentTrials,
      percentCorrect: sessionStats.percentCorrect,
      percentIndependent,
    };

    onSaveSession(session);
    setCurrentTrials([]);
    toast({
      title: 'Session saved',
      description: `${currentTrials.length} trials at ${sessionStats.percentCorrect}%`,
    });
  };

  const getStatusColor = () => {
    switch (skillTarget.status) {
      case 'baseline': return 'bg-slate-500';
      case 'acquisition': return 'bg-blue-500';
      case 'maintenance': return 'bg-green-500';
      case 'generalization': return 'bg-purple-500';
      case 'mastered': return 'bg-emerald-600';
      default: return 'bg-gray-500';
    }
  };

  if (!isActive) {
    return (
      <div 
        className="flex items-center justify-between p-2 rounded-md border border-dashed bg-muted/30 opacity-60 cursor-pointer hover:opacity-100 transition-opacity"
        onClick={() => onToggleActive(skillTarget.id)}
      >
        <div className="flex items-center gap-2">
          <Target className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs truncate">{skillTarget.name}</span>
        </div>
        <Badge variant="outline" className="text-[9px]">inactive</Badge>
      </div>
    );
  }

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div className="border rounded-lg overflow-hidden bg-card">
        <CollapsibleTrigger asChild>
          <div 
            className="flex items-center justify-between p-2 cursor-pointer hover:bg-muted/50"
            style={{ borderLeftWidth: 3, borderLeftColor: studentColor }}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Target className="w-3 h-3 shrink-0" style={{ color: studentColor }} />
              <span className="text-xs font-medium truncate">{skillTarget.name}</span>
              <Badge className={`${getStatusColor()} text-white text-[9px] px-1`}>
                {skillTarget.status.slice(0, 3)}
              </Badge>
            </div>
            <div className="flex items-center gap-1">
              {currentTrials.length > 0 && (
                <Badge variant="secondary" className="text-[9px]">
                  {sessionStats.correct}/{sessionStats.total}
                </Badge>
              )}
              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="p-2 border-t space-y-2">
            {/* Current session stats */}
            {currentTrials.length > 0 && (
              <div className="space-y-1">
                <Progress value={sessionStats.percentCorrect} className="h-1.5" />
                <p className="text-[10px] text-muted-foreground text-center">
                  {sessionStats.percentCorrect}% correct
                </p>
              </div>
            )}

            {/* Prompt selector */}
            <Select value={selectedPrompt} onValueChange={(v) => setSelectedPrompt(v as PromptLevel)}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROMPT_LEVEL_ORDER.map(level => (
                  <SelectItem key={level} value={level} className="text-xs">
                    {PROMPT_LEVEL_LABELS[level]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Trial buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                className="h-10 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleCorrectTrial}
              >
                <Check className="w-4 h-4 mr-1" />
                +
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="h-10"
                onClick={handleIncorrectTrial}
              >
                <X className="w-4 h-4 mr-1" />
                −
              </Button>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] px-2"
                onClick={handleUndoLastTrial}
                disabled={currentTrials.length === 0}
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Undo
              </Button>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] px-2"
                  onClick={() => onToggleActive(skillTarget.id)}
                >
                  Hide
                </Button>
                <Button
                  size="sm"
                  className="h-6 text-[10px] px-2"
                  onClick={handleSaveSession}
                  disabled={currentTrials.length === 0}
                  style={{ backgroundColor: studentColor }}
                >
                  Save
                </Button>
              </div>
            </div>

            {/* Recent trials mini view */}
            {currentTrials.length > 0 && (
              <div className="flex flex-wrap gap-0.5">
                {currentTrials.slice(-8).map((trial) => (
                  <div
                    key={trial.id}
                    className={`w-4 h-4 rounded text-[8px] flex items-center justify-center font-medium ${
                      trial.isCorrect 
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' 
                        : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                    }`}
                  >
                    {trial.isCorrect ? '+' : '-'}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
