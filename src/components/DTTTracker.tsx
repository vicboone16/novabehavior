import { useState, useMemo } from 'react';
import { 
  Plus, Minus, Check, X, RotateCcw, ChevronDown, ChevronUp, 
  Target, TrendingUp, Clock, FileText, Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  SkillTarget, 
  DTTTrial, 
  DTTSession,
  PromptLevel, 
  ErrorType,
  PROMPT_LEVEL_LABELS,
  PROMPT_LEVEL_ORDER,
  ERROR_TYPE_LABELS,
} from '@/types/behavior';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface DTTTrackerProps {
  studentId: string;
  skillTarget: SkillTarget;
  studentColor: string;
  sessions: DTTSession[];
  customPromptLevels?: string[];
  onAddTrial: (skillTargetId: string, trial: Omit<DTTTrial, 'id'>) => void;
  onSaveSession: (session: Omit<DTTSession, 'id'>) => void;
  onUpdateTarget: (targetId: string, updates: Partial<SkillTarget>) => void;
}

export function DTTTracker({
  studentId,
  skillTarget,
  studentColor,
  sessions,
  customPromptLevels = [],
  onAddTrial,
  onSaveSession,
  onUpdateTarget,
}: DTTTrackerProps) {
  const { toast } = useToast();
  
  // Current session trials
  const [currentTrials, setCurrentTrials] = useState<DTTTrial[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [sessionNotes, setSessionNotes] = useState('');
  
  // Trial entry state
  const [selectedPrompt, setSelectedPrompt] = useState<PromptLevel | string>('verbal');
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [pendingErrorType, setPendingErrorType] = useState<ErrorType | null>(null);
  const [trialNotes, setTrialNotes] = useState('');

  // Combine default and custom prompt levels
  const allPromptLevels = useMemo(() => {
    const levels: { value: string; label: string }[] = PROMPT_LEVEL_ORDER.map(level => ({
      value: level,
      label: PROMPT_LEVEL_LABELS[level],
    }));
    
    // Add custom levels after verbal but before independent
    if (customPromptLevels.length > 0) {
      const insertIndex = levels.findIndex(l => l.value === 'independent');
      customPromptLevels.forEach((custom, idx) => {
        levels.splice(insertIndex + idx, 0, { value: `custom_${custom}`, label: custom });
      });
    }
    
    return levels;
  }, [customPromptLevels]);

  // Calculate current session stats
  const sessionStats = useMemo(() => {
    if (currentTrials.length === 0) {
      return { correct: 0, incorrect: 0, total: 0, percentCorrect: 0, percentIndependent: 0 };
    }
    
    const correct = currentTrials.filter(t => t.isCorrect).length;
    const independent = currentTrials.filter(t => t.promptLevel === 'independent' && t.isCorrect).length;
    
    return {
      correct,
      incorrect: currentTrials.length - correct,
      total: currentTrials.length,
      percentCorrect: Math.round((correct / currentTrials.length) * 100),
      percentIndependent: Math.round((independent / currentTrials.length) * 100),
    };
  }, [currentTrials]);

  // Get recent sessions stats
  const recentStats = useMemo(() => {
    const targetSessions = sessions.filter(s => s.skillTargetId === skillTarget.id);
    if (targetSessions.length === 0) return null;
    
    const last3 = targetSessions.slice(-3);
    const avgPercent = Math.round(last3.reduce((sum, s) => sum + s.percentCorrect, 0) / last3.length);
    
    return {
      totalSessions: targetSessions.length,
      lastSession: targetSessions[targetSessions.length - 1],
      avgLast3: avgPercent,
    };
  }, [sessions, skillTarget.id]);

  const handleCorrectTrial = () => {
    const trial: DTTTrial = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      isCorrect: true,
      promptLevel: selectedPrompt as PromptLevel,
      notes: trialNotes || undefined,
    };
    
    setCurrentTrials(prev => [...prev, trial]);
    onAddTrial(skillTarget.id, trial);
    setTrialNotes('');
    
    // Quick feedback
    toast({
      title: '✓ Correct',
      description: `${PROMPT_LEVEL_LABELS[selectedPrompt as PromptLevel] || selectedPrompt}`,
    });
  };

  const handleIncorrectTrial = () => {
    setShowErrorDialog(true);
  };

  const confirmIncorrectTrial = () => {
    const trial: DTTTrial = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      isCorrect: false,
      promptLevel: selectedPrompt as PromptLevel,
      errorType: pendingErrorType || 'incorrect',
      notes: trialNotes || undefined,
    };
    
    setCurrentTrials(prev => [...prev, trial]);
    onAddTrial(skillTarget.id, trial);
    setTrialNotes('');
    setShowErrorDialog(false);
    setPendingErrorType(null);
    
    toast({
      title: '✗ Incorrect',
      description: ERROR_TYPE_LABELS[pendingErrorType || 'incorrect'],
      variant: 'destructive',
    });
  };

  const handleUndoLastTrial = () => {
    if (currentTrials.length === 0) return;
    setCurrentTrials(prev => prev.slice(0, -1));
  };

  const handleSaveSession = () => {
    if (currentTrials.length === 0) {
      toast({
        title: 'No trials to save',
        description: 'Record at least one trial before saving.',
        variant: 'destructive',
      });
      return;
    }

    const session: Omit<DTTSession, 'id'> = {
      skillTargetId: skillTarget.id,
      studentId,
      date: new Date(),
      trials: currentTrials,
      percentCorrect: sessionStats.percentCorrect,
      percentIndependent: sessionStats.percentIndependent,
      notes: sessionNotes || undefined,
    };

    onSaveSession(session);
    setCurrentTrials([]);
    setSessionNotes('');
    
    toast({
      title: 'Session saved',
      description: `${currentTrials.length} trials recorded at ${sessionStats.percentCorrect}% correct`,
    });

    // Check mastery criteria
    checkMasteryCriteria();
  };

  const checkMasteryCriteria = () => {
    if (!skillTarget.masteryCriteria) return;

    const targetSessions = [...sessions.filter(s => s.skillTargetId === skillTarget.id)];
    // Add current session stats for checking
    targetSessions.push({
      id: 'temp',
      skillTargetId: skillTarget.id,
      studentId,
      date: new Date(),
      trials: currentTrials,
      percentCorrect: sessionStats.percentCorrect,
      percentIndependent: sessionStats.percentIndependent,
    });

    const criteria = skillTarget.masteryCriteria;
    let isMastered = false;

    if (criteria.type === 'percent_correct' && criteria.percentCorrect) {
      // Check if last N sessions meet criteria
      const checkCount = criteria.consecutiveSessions || 3;
      const recentSessions = targetSessions.slice(-checkCount);
      
      if (recentSessions.length >= checkCount) {
        isMastered = recentSessions.every(s => s.percentCorrect >= (criteria.percentCorrect || 80));
      }
    } else if (criteria.type === 'consecutive_sessions' && criteria.consecutiveSessions) {
      const recentSessions = targetSessions.slice(-criteria.consecutiveSessions);
      const threshold = criteria.percentCorrect || 80;
      
      if (recentSessions.length >= criteria.consecutiveSessions) {
        isMastered = recentSessions.every(s => s.percentCorrect >= threshold);
      }
    }

    if (isMastered && skillTarget.status !== 'mastered') {
      toast({
        title: '🎉 Mastery Achieved!',
        description: `${skillTarget.name} has met mastery criteria!`,
      });
      onUpdateTarget(skillTarget.id, { status: 'mastered', masteredDate: new Date() });
    }
  };

  const getStatusBadge = () => {
    const statusColors: Record<string, string> = {
      baseline: 'bg-slate-500',
      acquisition: 'bg-blue-500',
      maintenance: 'bg-green-500',
      generalization: 'bg-purple-500',
      mastered: 'bg-emerald-600',
    };

    return (
      <Badge className={`${statusColors[skillTarget.status] || 'bg-gray-500'} text-white`}>
        {skillTarget.status.charAt(0).toUpperCase() + skillTarget.status.slice(1)}
      </Badge>
    );
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader 
        className="py-3 px-4 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4" style={{ color: studentColor }} />
            <CardTitle className="text-base">{skillTarget.name}</CardTitle>
            {getStatusBadge()}
          </div>
          <div className="flex items-center gap-2">
            {currentTrials.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {currentTrials.length} trials
              </Badge>
            )}
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </div>
        
        {/* Mini stats when collapsed */}
        {!isExpanded && recentStats && (
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <span>{recentStats.totalSessions} sessions</span>
            <span>Last: {recentStats.lastSession.percentCorrect}%</span>
            <span>Avg (3): {recentStats.avgLast3}%</span>
          </div>
        )}
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0 pb-4 px-4 space-y-4">
          {/* Current session stats */}
          {currentTrials.length > 0 && (
            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Current Session</span>
                <span className="font-medium">
                  {sessionStats.correct}/{sessionStats.total} ({sessionStats.percentCorrect}%)
                </span>
              </div>
              <Progress value={sessionStats.percentCorrect} className="h-2" />
              <div className="flex gap-2 text-xs">
                <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
                  {sessionStats.correct} correct
                </Badge>
                <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                  {sessionStats.incorrect} incorrect
                </Badge>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                  {sessionStats.percentIndependent}% independent
                </Badge>
              </div>
            </div>
          )}

          {/* Prompt level selector */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Prompt Level</Label>
            <Select value={selectedPrompt} onValueChange={setSelectedPrompt}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allPromptLevels.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Trial buttons - large touch targets */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              size="lg"
              className="h-16 text-lg font-semibold bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600"
              onClick={handleCorrectTrial}
            >
              <Check className="w-6 h-6 mr-2" />
              Correct
            </Button>
            <Button
              size="lg"
              variant="destructive"
              className="h-16 text-lg font-semibold"
              onClick={handleIncorrectTrial}
            >
              <X className="w-6 h-6 mr-2" />
              Incorrect
            </Button>
          </div>

          {/* Quick actions */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleUndoLastTrial}
              disabled={currentTrials.length === 0}
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Undo
            </Button>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(true)}
              >
                <Settings className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                onClick={handleSaveSession}
                disabled={currentTrials.length === 0}
                style={{ backgroundColor: studentColor }}
              >
                Save Session
              </Button>
            </div>
          </div>

          {/* Recent trials mini view */}
          {currentTrials.length > 0 && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Recent Trials</Label>
              <div className="flex flex-wrap gap-1">
                {currentTrials.slice(-10).map((trial, idx) => (
                  <div
                    key={trial.id}
                    className={`w-6 h-6 rounded flex items-center justify-center text-xs font-medium ${
                      trial.isCorrect 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}
                    title={`${trial.isCorrect ? 'Correct' : 'Incorrect'} - ${
                      PROMPT_LEVEL_LABELS[trial.promptLevel] || trial.promptLevel
                    }`}
                  >
                    {trial.isCorrect ? '+' : '-'}
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Historical data summary */}
          {recentStats && (
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-3 h-3" />
                <span>
                  {recentStats.totalSessions} total sessions | 
                  Last: {recentStats.lastSession.percentCorrect}% | 
                  Avg (3): {recentStats.avgLast3}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-3 h-3" />
                <span>
                  Last session: {format(new Date(recentStats.lastSession.date), 'MMM d, h:mm a')}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      )}

      {/* Error Type Dialog */}
      <Dialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Error Type</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            {(Object.entries(ERROR_TYPE_LABELS) as [ErrorType, string][]).map(([type, label]) => (
              <Button
                key={type}
                variant={pendingErrorType === type ? 'default' : 'outline'}
                className="h-12"
                onClick={() => setPendingErrorType(type)}
              >
                {label}
              </Button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowErrorDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmIncorrectTrial}
              disabled={!pendingErrorType}
            >
              Record Error
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Skill Target Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Session Notes</Label>
              <Textarea
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                placeholder="Add notes for this session..."
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Status</Label>
              <Select 
                value={skillTarget.status} 
                onValueChange={(value) => onUpdateTarget(skillTarget.id, { status: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baseline">Baseline</SelectItem>
                  <SelectItem value="acquisition">Acquisition</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="generalization">Generalization</SelectItem>
                  <SelectItem value="mastered">Mastered</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {skillTarget.operationalDefinition && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Definition</Label>
                <p className="text-sm bg-muted/50 p-2 rounded">
                  {skillTarget.operationalDefinition}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowSettings(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
