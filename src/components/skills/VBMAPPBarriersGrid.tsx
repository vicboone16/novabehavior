import { useState, useMemo } from 'react';
import { ArrowLeft, Save, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useCurriculumItems } from '@/hooks/useCurriculum';
import type { StudentAssessment, MilestoneScore } from '@/types/curriculum';

interface VBMAPPBarriersGridProps {
  studentId: string;
  studentName: string;
  assessment: StudentAssessment;
  onBack: () => void;
  onSave: (
    results: Record<string, MilestoneScore>,
    domainScores: Record<string, number>,
    status: 'draft' | 'final'
  ) => Promise<void>;
}

const SCORE_COLORS = [
  'bg-emerald-100 hover:bg-emerald-200 text-emerald-700 border-emerald-300',
  'bg-sky-100 hover:bg-sky-200 text-sky-700 border-sky-300',
  'bg-amber-100 hover:bg-amber-200 text-amber-700 border-amber-300',
  'bg-orange-100 hover:bg-orange-200 text-orange-700 border-orange-300',
  'bg-destructive/20 hover:bg-destructive/30 text-destructive border-destructive/40',
];

export function VBMAPPBarriersGrid({ studentId, studentName, assessment, onBack, onSave }: VBMAPPBarriersGridProps) {
  const { items, loading } = useCurriculumItems(assessment.curriculum_system_id);
  const [scores, setScores] = useState<Record<string, MilestoneScore>>(
    (assessment.results_json || {}) as Record<string, MilestoneScore>
  );
  const [saving, setSaving] = useState(false);

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => a.display_order - b.display_order);
  }, [items]);

  const scoredCount = useMemo(() => {
    return Object.values(scores).filter(s => s.score !== undefined && s.score !== null).length;
  }, [scores]);

  const handleScoreChange = (itemId: string, score: number) => {
    setScores(prev => ({
      ...prev,
      [itemId]: { score, date_scored: new Date().toISOString() },
    }));
  };

  const handleSave = async (finalize: boolean) => {
    setSaving(true);
    try {
      const domainScoresRecord: Record<string, number> = {};
      const totalScore = Object.values(scores).reduce((sum, s) => sum + (s.score || 0), 0);
      domainScoresRecord['Barriers'] = totalScore;
      await onSave(scores, domainScoresRecord, finalize ? 'final' : 'draft');
      toast.success(finalize ? 'Barriers assessment finalized' : 'Barriers assessment saved');
      if (finalize) onBack();
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // Parse score level descriptions from item description
  const getScoreLevels = (description: string | null) => {
    if (!description) return [];
    return description.split(' | ').map(part => {
      const match = part.match(/^(\d):\s*(.+)$/);
      return match ? { score: parseInt(match[1]), text: match[2] } : null;
    }).filter(Boolean) as { score: number; text: string }[];
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading Barriers Assessment...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h3 className="font-semibold text-lg">VB-MAPP Barriers Assessment</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{studentName}</span>
              <span>•</span>
              <Badge variant={assessment.status === 'final' ? 'default' : 'secondary'}>
                {assessment.status === 'final' ? 'Finalized' : 'Draft'}
              </Badge>
              <span>•</span>
              <span>{scoredCount} / {sortedItems.length} scored</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleSave(false)} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />Save
          </Button>
          <Button onClick={() => handleSave(true)} disabled={saving}>
            <CheckCircle2 className="w-4 h-4 mr-2" />Finalize
          </Button>
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="space-y-3 pr-4">
          {sortedItems.map(item => {
            const currentScore = scores[item.id]?.score;
            const scoreLevels = getScoreLevels(item.description);

            return (
              <Card key={item.id}>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Badge variant="outline" className="shrink-0">{item.code}</Badge>
                    <span>{item.title}</span>
                    {currentScore !== undefined && currentScore !== null && (
                      <Badge className={`ml-auto ${SCORE_COLORS[currentScore]}`}>
                        Score: {currentScore}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  <div className="flex gap-1.5">
                    {[0, 1, 2, 3, 4].map(score => (
                      <Button
                        key={score}
                        variant="outline"
                        size="sm"
                        className={`w-10 h-10 p-0 text-base font-bold ${
                          currentScore === score
                            ? SCORE_COLORS[score] + ' ring-2 ring-offset-1 ring-primary'
                            : ''
                        }`}
                        onClick={() => handleScoreChange(item.id, score)}
                      >
                        {score}
                      </Button>
                    ))}
                  </div>
                  {scoreLevels.length > 0 && (
                    <div className="text-xs text-muted-foreground space-y-0.5 mt-1">
                      {scoreLevels.map(level => (
                        <p key={level.score} className={currentScore === level.score ? 'font-medium text-foreground' : ''}>
                          <span className="font-bold">{level.score}:</span> {level.text}
                        </p>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
