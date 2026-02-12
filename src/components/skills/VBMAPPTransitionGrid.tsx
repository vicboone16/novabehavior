import { useState, useMemo } from 'react';
import { ArrowLeft, Save, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { useCurriculumItems } from '@/hooks/useCurriculum';
import type { StudentAssessment, MilestoneScore } from '@/types/curriculum';

interface VBMAPPTransitionGridProps {
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

export interface EmbeddedTransitionGridProps {
  curriculumSystemId: string;
  scores: Record<string, MilestoneScore>;
  onScoreChange: (itemId: string, score: number) => void;
}

const LEVEL_COLORS = [
  'bg-muted',
  'bg-sky-200',
  'bg-sky-300',
  'bg-sky-400',
  'bg-sky-500',
  'bg-sky-600',
];

/** Embedded transition grid - no header, parent manages state */
export function EmbeddedTransitionGrid({ curriculumSystemId, scores, onScoreChange }: EmbeddedTransitionGridProps) {
  const { items, loading } = useCurriculumItems(curriculumSystemId);

  const sortedItems = useMemo(() => [...items].sort((a, b) => a.display_order - b.display_order), [items]);

  if (loading) return <div className="text-center py-8 text-muted-foreground">Loading Transition Assessment...</div>;

  const rows = [sortedItems.slice(0, 6), sortedItems.slice(6, 12), sortedItems.slice(12, 18)];

  return (
    <div className="space-y-4">
      {rows.map((row, rowIdx) => (
        <div key={rowIdx} className="grid grid-cols-6 gap-3">
          {row.map(item => {
            const currentScore = scores[item.id]?.score ?? 0;
            return (
              <Card key={item.id} className="overflow-hidden">
                <CardContent className="p-3 space-y-2">
                  <div className="text-xs font-medium text-center truncate" title={item.title}>
                    {item.title}
                  </div>
                  <div className="flex flex-col-reverse gap-0.5 h-32">
                    {[1, 2, 3, 4, 5].map(level => (
                      <button
                        key={level}
                        className={`flex-1 rounded-sm transition-all border cursor-pointer flex items-center justify-center text-xs font-bold ${
                          currentScore >= level
                            ? `${LEVEL_COLORS[level]} text-white border-transparent`
                            : 'bg-muted/30 border-border hover:bg-muted/50 text-muted-foreground'
                        }`}
                        onClick={() => onScoreChange(item.id, currentScore === level ? level - 1 : level)}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                  <div className="text-center text-xs font-bold">
                    {currentScore > 0 ? currentScore : '—'}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/** Standalone transition grid */
export function VBMAPPTransitionGrid({ studentId, studentName, assessment, onBack, onSave }: VBMAPPTransitionGridProps) {
  const [scores, setScores] = useState<Record<string, MilestoneScore>>(
    (assessment.results_json || {}) as Record<string, MilestoneScore>
  );
  const [saving, setSaving] = useState(false);

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
      domainScoresRecord['Transition'] = totalScore;
      await onSave(scores, domainScoresRecord, finalize ? 'final' : 'draft');
      toast.success(finalize ? 'Transition assessment finalized' : 'Transition assessment saved');
      if (finalize) onBack();
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h3 className="font-semibold text-lg">VB-MAPP Transition Assessment</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{studentName}</span>
              <span>•</span>
              <Badge variant={assessment.status === 'final' ? 'default' : 'secondary'}>
                {assessment.status === 'final' ? 'Finalized' : 'Draft'}
              </Badge>
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
      <EmbeddedTransitionGrid
        curriculumSystemId={assessment.curriculum_system_id}
        scores={scores}
        onScoreChange={handleScoreChange}
      />
    </div>
  );
}
