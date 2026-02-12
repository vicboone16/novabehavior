import { useState, useMemo } from 'react';
import { ArrowLeft, Save, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useCurriculumItems, useDomains } from '@/hooks/useCurriculum';
import type { StudentAssessment, MilestoneScore, CurriculumItem } from '@/types/curriculum';

interface VBMAPPEESAGridProps {
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

export interface EmbeddedEESAGridProps {
  curriculumSystemId: string;
  scores: Record<string, MilestoneScore>;
  onScoreChange: (itemId: string, score: number) => void;
}

/** Embedded EESA grid - no header, parent manages state */
export function EmbeddedEESAGrid({ curriculumSystemId, scores, onScoreChange }: EmbeddedEESAGridProps) {
  const { items, loading } = useCurriculumItems(curriculumSystemId);
  const [activeGroup, setActiveGroup] = useState('1');

  const groupedItems = useMemo(() => {
    const groups: Record<string, CurriculumItem[]> = {};
    items.forEach(item => {
      const domainName = item.domain?.name || 'Unknown';
      const match = domainName.match(/Group (\d+)/);
      const groupNum = match ? match[1] : '0';
      if (!groups[groupNum]) groups[groupNum] = [];
      groups[groupNum].push(item);
    });
    Object.values(groups).forEach(g => g.sort((a, b) => a.display_order - b.display_order));
    return groups;
  }, [items]);

  const groupNumbers = useMemo(() =>
    Object.keys(groupedItems).sort((a, b) => parseInt(a) - parseInt(b)),
    [groupedItems]
  );

  const getGroupScore = (groupNum: string) => {
    const groupItems = groupedItems[groupNum] || [];
    return groupItems.reduce((sum, item) => sum + (scores[item.id]?.score || 0), 0);
  };

  const totalScore = useMemo(() => {
    return items.reduce((sum, item) => sum + (scores[item.id]?.score || 0), 0);
  }, [scores, items]);

  const handleToggle = (itemId: string) => {
    const current = scores[itemId]?.score || 0;
    onScoreChange(itemId, current === 1 ? 0 : 1);
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground">Loading EESA...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <span>EESA Total: {totalScore} / 100</span>
      </div>

      <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
        {groupNumbers.map(g => (
          <Card key={g} className={`p-2 cursor-pointer transition-colors ${activeGroup === g ? 'border-primary bg-primary/5' : ''}`}
            onClick={() => setActiveGroup(g)}>
            <div className="text-center">
              <div className="text-xs text-muted-foreground">G{g}</div>
              <div className="text-lg font-bold">{getGroupScore(g)}<span className="text-xs font-normal text-muted-foreground">/10</span></div>
            </div>
          </Card>
        ))}
      </div>

      <Tabs value={activeGroup} onValueChange={setActiveGroup}>
        <TabsList className="flex-wrap h-auto">
          {groupNumbers.map(g => (
            <TabsTrigger key={g} value={g}>Group {g}</TabsTrigger>
          ))}
        </TabsList>

        {groupNumbers.map(g => (
          <TabsContent key={g} value={g} className="mt-4">
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Group {g}</span>
                  <Badge variant="outline">{getGroupScore(g)} / 10</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {(groupedItems[g] || []).map(item => {
                    const isPass = scores[item.id]?.score === 1;
                    return (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                          isPass ? 'bg-emerald-50 border-emerald-200' : 'bg-muted/30 border-border'
                        }`}
                        onClick={() => handleToggle(item.id)}
                      >
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="text-xs shrink-0">{item.code}</Badge>
                          <span className="text-sm">{item.title}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch checked={isPass} onCheckedChange={() => handleToggle(item.id)} />
                          <span className={`text-sm font-medium w-8 ${isPass ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                            {isPass ? '1' : '0'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

/** Standalone EESA grid */
export function VBMAPPEESAGrid({ studentId, studentName, assessment, onBack, onSave }: VBMAPPEESAGridProps) {
  const { items } = useCurriculumItems(assessment.curriculum_system_id);
  const [scores, setScores] = useState<Record<string, MilestoneScore>>(
    (assessment.results_json || {}) as Record<string, MilestoneScore>
  );
  const [saving, setSaving] = useState(false);

  const totalScore = useMemo(() => {
    return items.reduce((sum, item) => sum + (scores[item.id]?.score || 0), 0);
  }, [scores, items]);

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
      domainScoresRecord['Total'] = totalScore;
      await onSave(scores, domainScoresRecord, finalize ? 'final' : 'draft');
      toast.success(finalize ? 'EESA finalized' : 'EESA saved');
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
            <h3 className="font-semibold text-lg">VB-MAPP EESA</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{studentName}</span>
              <span>•</span>
              <Badge variant={assessment.status === 'final' ? 'default' : 'secondary'}>
                {assessment.status === 'final' ? 'Finalized' : 'Draft'}
              </Badge>
              <span>•</span>
              <span className="font-medium">Total: {totalScore} / 100</span>
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
      <EmbeddedEESAGrid
        curriculumSystemId={assessment.curriculum_system_id}
        scores={scores}
        onScoreChange={handleScoreChange}
      />
    </div>
  );
}
