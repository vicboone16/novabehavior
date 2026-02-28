import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Info, ChevronDown, ChevronUp, CheckCircle2, XCircle, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useBehaviorLab } from '@/hooks/useBehaviorLab';
import { useAuth } from '@/contexts/AuthContext';
import { useAgencyContext } from '@/hooks/useAgencyContext';
import type { BehaviorLabGame, GameQuestion, GameOption } from '@/types/behaviorLab';
import { DIFFICULTY_COLORS } from '@/types/behaviorLab';

export default function BehaviorLabPlayer() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentAgency } = useAgencyContext();
  const { getGameById, saveAttempt } = useBehaviorLab();

  const [game, setGame] = useState<BehaviorLabGame | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [answers, setAnswers] = useState<{ questionId: string; optionId: string; correct: boolean }[]>([]);
  const [completed, setCompleted] = useState(false);
  const [showAbaTerms, setShowAbaTerms] = useState(false);
  const [expandedHelper, setExpandedHelper] = useState<string | null>(null);
  const [startedAt] = useState(new Date().toISOString());
  const [streakCount, setStreakCount] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);

  useEffect(() => {
    if (!gameId) return;
    (async () => {
      const g = await getGameById(gameId);
      setGame(g);
      setLoading(false);
    })();
  }, [gameId, getGameById]);

  const questions = game?.content?.questions || [];
  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const progress = totalQuestions > 0 ? ((currentIndex + (showFeedback ? 1 : 0)) / totalQuestions) * 100 : 0;

  const handleSelect = (optionId: string) => {
    if (showFeedback) return;
    setSelectedOptionId(optionId);
  };

  const handleSubmit = () => {
    if (!selectedOptionId || !currentQuestion) return;
    const option = currentQuestion.options.find(o => o.id === selectedOptionId);
    const correct = option?.is_correct || false;

    const newStreak = correct ? currentStreak + 1 : 0;
    setCurrentStreak(newStreak);
    if (newStreak > streakCount) setStreakCount(newStreak);

    setAnswers(prev => [...prev, { questionId: currentQuestion.question_id, optionId: selectedOptionId, correct }]);
    setShowFeedback(true);
  };

  const handleNext = useCallback(async () => {
    if (currentIndex + 1 < totalQuestions) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOptionId(null);
      setShowFeedback(false);
      setExpandedHelper(null);
    } else {
      // Complete
      setCompleted(true);
      const correctCount = [...answers].filter(a => a.correct).length + (showFeedback ? 0 : 0);
      const score = totalQuestions > 0 ? Math.round((answers.filter(a => a.correct).length / totalQuestions) * 100) : 0;
      const xp = Math.round(score * 0.5 + streakCount * 2);

      const mistakesSummary: Record<string, number> = {};
      for (const a of answers) {
        if (!a.correct) {
          const q = questions.find(q => q.question_id === a.questionId);
          const type = q?.question_type || 'unknown';
          mistakesSummary[type] = (mistakesSummary[type] || 0) + 1;
        }
      }

      if (user && game) {
        await saveAttempt({
          game_id: game.game_id,
          coach_user_id: user.id,
          agency_id: currentAgency?.id || null,
          learner_id: null,
          difficulty: game.difficulty,
          score_percent: score,
          xp_earned: xp,
          streak_count: streakCount,
          skill_tags: game.skill_tags,
          mistakes_summary: Object.keys(mistakesSummary).length > 0 ? mistakesSummary : null,
          started_at: startedAt,
          completed_at: new Date().toISOString(),
        });
      }
    }
  }, [currentIndex, totalQuestions, answers, questions, user, game, saveAttempt, currentAgency, streakCount, startedAt, showFeedback]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading activity…</div>
      </div>
    );
  }

  if (!game || questions.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">This activity has no questions yet.</p>
        <Button variant="outline" onClick={() => navigate('/academy/lab')}>Back to Lab</Button>
      </div>
    );
  }

  if (completed) {
    const score = totalQuestions > 0 ? Math.round((answers.filter(a => a.correct).length / totalQuestions) * 100) : 0;
    const xp = Math.round(score * 0.5 + streakCount * 2);

    return (
      <div className="min-h-screen bg-background">
        <header className="bg-card border-b border-border">
          <div className="container py-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/academy/lab')} className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Back to Lab
            </Button>
          </div>
        </header>
        <main className="container py-12 max-w-lg mx-auto">
          <Card className="shadow-card">
            <CardContent className="p-8 text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Zap className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">Activity Complete</h2>
                <p className="text-muted-foreground mt-1">{game.title}</p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-muted/50 rounded-xl p-4">
                  <div className="text-2xl font-bold text-foreground">{score}%</div>
                  <div className="text-xs text-muted-foreground">Score</div>
                </div>
                <div className="bg-muted/50 rounded-xl p-4">
                  <div className="text-2xl font-bold text-foreground">{answers.filter(a => a.correct).length}/{totalQuestions}</div>
                  <div className="text-xs text-muted-foreground">Correct</div>
                </div>
                <div className="bg-muted/50 rounded-xl p-4">
                  <div className="text-2xl font-bold text-secondary">+{xp}</div>
                  <div className="text-xs text-muted-foreground">XP</div>
                </div>
              </div>
              {streakCount >= 3 && (
                <p className="text-sm text-primary font-medium">🔥 Best streak: {streakCount} in a row</p>
              )}
              <div className="flex gap-3 justify-center pt-2">
                <Button variant="outline" onClick={() => navigate('/academy/lab')}>Back to Lab</Button>
                <Button onClick={() => {
                  setCurrentIndex(0);
                  setSelectedOptionId(null);
                  setShowFeedback(false);
                  setAnswers([]);
                  setCompleted(false);
                  setCurrentStreak(0);
                  setStreakCount(0);
                }}>Try Again</Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const selectedOption = currentQuestion.options.find(o => o.id === selectedOptionId);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-20">
        <div className="container py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/academy/lab')}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-sm font-display font-semibold text-foreground">{game.title}</h1>
                <p className="text-xs text-muted-foreground">
                  Question {currentIndex + 1} of {totalQuestions}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Label htmlFor="aba-toggle" className="text-xs text-muted-foreground cursor-pointer">ABA Terms</Label>
                <Switch id="aba-toggle" checked={showAbaTerms} onCheckedChange={setShowAbaTerms} />
              </div>
              <Badge className={DIFFICULTY_COLORS[game.difficulty] || ''} variant="outline">
                {game.difficulty}
              </Badge>
            </div>
          </div>
          <Progress value={progress} className="mt-3 h-1.5" />
        </div>
      </header>

      <main className="container py-6 max-w-2xl mx-auto">
        {/* Scenario */}
        {game.content.scenarios?.[0] && (
          <Card className="mb-6 border-primary/10 bg-primary/[0.02]">
            <CardContent className="p-5">
              <p className="text-xs font-medium text-primary mb-1 uppercase tracking-wider">Scenario</p>
              <p className="text-foreground leading-relaxed">
                {!showAbaTerms && game.content.scenarios[0].lay_language
                  ? game.content.scenarios[0].lay_language
                  : game.content.scenarios[0].scenario_text}
              </p>
              {game.content.scenarios[0].scenario_context && (
                <p className="text-sm text-muted-foreground mt-2 italic">{game.content.scenarios[0].scenario_context}</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Question */}
        <div className="mb-6">
          <h2 className="font-display text-lg font-semibold text-foreground mb-1">
            {!showAbaTerms && currentQuestion.lay_prompt
              ? currentQuestion.lay_prompt
              : currentQuestion.prompt}
          </h2>
          {showAbaTerms && currentQuestion.aba_term_note && (
            <p className="text-xs text-muted-foreground bg-muted/50 inline-block px-2 py-1 rounded mt-1">
              📖 {currentQuestion.aba_term_note}
            </p>
          )}
        </div>

        {/* Options */}
        <div className="space-y-3 mb-6">
          {currentQuestion.options.map(option => {
            const isSelected = selectedOptionId === option.id;
            const showResult = showFeedback && isSelected;
            const isCorrectOption = option.is_correct;

            let borderClass = 'border-border hover:border-primary/40';
            if (isSelected && !showFeedback) borderClass = 'border-primary ring-2 ring-primary/20';
            if (showFeedback && isCorrectOption) borderClass = 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10';
            if (showResult && !isCorrectOption) borderClass = 'border-rose-400 bg-rose-50/50 dark:bg-rose-900/10';

            return (
              <div key={option.id}>
                <Card
                  className={`cursor-pointer transition-all duration-200 ${borderClass} ${showFeedback && !isSelected && !isCorrectOption ? 'opacity-50' : ''}`}
                  onClick={() => handleSelect(option.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors ${
                        isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30'
                      }`}>
                        {isSelected && <div className="w-2 h-2 rounded-full bg-primary-foreground" />}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-foreground text-sm">
                          {!showAbaTerms && option.lay_label ? option.lay_label : option.label}
                        </p>

                        {/* Micro-example / helper */}
                        <Collapsible open={expandedHelper === option.id} onOpenChange={(open) => setExpandedHelper(open ? option.id : null)}>
                          <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-1 transition-colors">
                            <Info className="w-3 h-3" />
                            <span>Example</span>
                            {expandedHelper === option.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <p className="text-xs text-muted-foreground mt-1.5 pl-4 border-l-2 border-muted">
                              {option.description}
                            </p>
                          </CollapsibleContent>
                        </Collapsible>

                        {/* Feedback after submit */}
                        {showFeedback && (isSelected || isCorrectOption) && (
                          <div className="mt-3 space-y-2">
                            {isSelected && (
                              <div className={`flex items-start gap-2 text-sm ${isCorrectOption ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                {isCorrectOption
                                  ? <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                  : <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                                <p>{!showAbaTerms && option.lay_feedback ? option.lay_feedback : option.feedback}</p>
                              </div>
                            )}

                            {/* Function match info */}
                            {option.function_match && (showResult || (showFeedback && isCorrectOption)) && (
                              <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium text-foreground">Primary Function:</span>
                                  <Badge variant="outline" className="text-[10px]">{option.function_match.primary}</Badge>
                                  <span className="text-[10px] text-muted-foreground">{option.function_match.confidence}% confidence</span>
                                </div>
                                {option.function_match.secondary && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-foreground">Secondary:</span>
                                    <Badge variant="outline" className="text-[10px]">{option.function_match.secondary}</Badge>
                                    <span className="text-[10px] text-muted-foreground">{option.function_match.secondary_confidence || 0}% confidence</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>

        {/* Explanation after feedback */}
        {showFeedback && (
          <Card className="mb-6 border-accent/20 bg-accent/[0.03] animate-fade-in">
            <CardContent className="p-5">
              <p className="text-xs font-medium text-accent mb-1 uppercase tracking-wider">Explanation</p>
              <p className="text-sm text-foreground leading-relaxed">
                {!showAbaTerms && currentQuestion.lay_explanation
                  ? currentQuestion.lay_explanation
                  : currentQuestion.explanation}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Action buttons */}
        <div className="flex justify-end gap-3">
          {!showFeedback ? (
            <Button onClick={handleSubmit} disabled={!selectedOptionId} className="gap-2">
              Check Answer
            </Button>
          ) : (
            <Button onClick={handleNext} className="gap-2">
              {currentIndex + 1 < totalQuestions ? (
                <>Next <ChevronRight className="w-4 h-4" /></>
              ) : (
                'Finish'
              )}
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
