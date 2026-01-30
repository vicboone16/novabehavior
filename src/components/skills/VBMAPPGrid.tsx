import { useState, useMemo } from 'react';
import { ArrowLeft, Save, FileText, CheckCircle2, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { useCurriculumItems, useDomains, useTargetActions } from '@/hooks/useCurriculum';
import type { StudentAssessment, MilestoneScore, CurriculumItem } from '@/types/curriculum';

interface VBMAPPGridProps {
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

const SCORE_OPTIONS = [
  { value: 0, label: '0', color: 'bg-red-100 hover:bg-red-200 text-red-700 border-red-300' },
  { value: 0.5, label: '½', color: 'bg-yellow-100 hover:bg-yellow-200 text-yellow-700 border-yellow-300' },
  { value: 1, label: '1', color: 'bg-green-100 hover:bg-green-200 text-green-700 border-green-300' },
];

export function VBMAPPGrid({ studentId, studentName, assessment, onBack, onSave }: VBMAPPGridProps) {
  const { domains } = useDomains();
  const { items: allItems, loading } = useCurriculumItems(assessment.curriculum_system_id);
  const { addTarget } = useTargetActions(studentId);

  const [scores, setScores] = useState<Record<string, MilestoneScore>>(
    (assessment.results_json || {}) as Record<string, MilestoneScore>
  );
  const [saving, setSaving] = useState(false);
  const [activeLevel, setActiveLevel] = useState('Level 1');

  // Group items by domain and level
  const itemsByDomainAndLevel = useMemo(() => {
    const grouped = new Map<string, Map<string, CurriculumItem[]>>();
    
    allItems.forEach(item => {
      const domainName = item.domain?.name || 'Other';
      const level = item.level || 'Unknown';
      
      if (!grouped.has(domainName)) {
        grouped.set(domainName, new Map());
      }
      
      const domainMap = grouped.get(domainName)!;
      if (!domainMap.has(level)) {
        domainMap.set(level, []);
      }
      
      domainMap.get(level)!.push(item);
    });

    // Sort items within each group
    grouped.forEach(domainMap => {
      domainMap.forEach(items => {
        items.sort((a, b) => a.display_order - b.display_order);
      });
    });

    return grouped;
  }, [allItems]);

  // Get unique levels
  const levels = useMemo(() => {
    const levelSet = new Set<string>();
    allItems.forEach(item => {
      if (item.level) levelSet.add(item.level);
    });
    return Array.from(levelSet).sort();
  }, [allItems]);

  // Calculate domain scores
  const domainScores = useMemo(() => {
    const scores_by_domain: Record<string, { total: number; possible: number }> = {};
    
    allItems.forEach(item => {
      const domainName = item.domain?.name || 'Other';
      if (!scores_by_domain[domainName]) {
        scores_by_domain[domainName] = { total: 0, possible: 0 };
      }
      
      scores_by_domain[domainName].possible += 1;
      const score = scores[item.id]?.score;
      if (score !== undefined) {
        scores_by_domain[domainName].total += score;
      }
    });

    return scores_by_domain;
  }, [allItems, scores]);

  const handleScoreChange = (itemId: string, score: number) => {
    setScores(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        score,
        date_scored: new Date().toISOString(),
      },
    }));
  };

  const handleSave = async (finalize: boolean) => {
    setSaving(true);
    try {
      const domainScoresRecord: Record<string, number> = {};
      Object.entries(domainScores).forEach(([domain, { total, possible }]) => {
        domainScoresRecord[domain] = possible > 0 ? Math.round((total / possible) * 100) : 0;
      });

      await onSave(scores, domainScoresRecord, finalize ? 'final' : 'draft');
      toast.success(finalize ? 'Assessment finalized' : 'Assessment saved');
      
      if (finalize) {
        onBack();
      }
    } catch (error) {
      toast.error('Failed to save assessment');
    } finally {
      setSaving(false);
    }
  };

  const handleAddAsTarget = async (item: CurriculumItem) => {
    await addTarget({
      title: item.title,
      description: item.description,
      mastery_criteria: item.mastery_criteria,
      domain_id: item.domain_id,
      source_type: 'curriculum',
      source_id: item.id,
      linked_prerequisite_ids: item.prerequisites,
    });
  };

  const getScoreColor = (itemId: string) => {
    const score = scores[itemId]?.score;
    if (score === undefined) return 'bg-muted/30';
    if (score === 0) return 'bg-red-50';
    if (score === 0.5) return 'bg-yellow-50';
    return 'bg-green-50';
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading VB-MAPP milestones...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h3 className="font-semibold text-lg">VB-MAPP Milestones Assessment</h3>
            <p className="text-sm text-muted-foreground">
              {studentName} • {assessment.status === 'final' ? 'Final' : 'Draft'}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleSave(false)} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            Save Draft
          </Button>
          <Button onClick={() => handleSave(true)} disabled={saving}>
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Finalize
          </Button>
        </div>
      </div>

      {/* Domain Score Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
        {Object.entries(domainScores).slice(0, 6).map(([domain, { total, possible }]) => (
          <Card key={domain} className="p-3">
            <div className="text-xs text-muted-foreground truncate">{domain}</div>
            <div className="text-lg font-bold">
              {total.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">/ {possible}</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Level Tabs */}
      <Tabs value={activeLevel} onValueChange={setActiveLevel}>
        <TabsList>
          {levels.map(level => (
            <TabsTrigger key={level} value={level}>{level}</TabsTrigger>
          ))}
        </TabsList>

        {levels.map(level => (
          <TabsContent key={level} value={level} className="mt-4">
            <div className="space-y-6">
              {Array.from(itemsByDomainAndLevel.entries()).map(([domainName, levelMap]) => {
                const items = levelMap.get(level) || [];
                if (items.length === 0) return null;

                return (
                  <Card key={domainName}>
                    <CardHeader className="py-3">
                      <CardTitle className="text-base flex items-center justify-between">
                        <span>{domainName}</span>
                        <Badge variant="outline">
                          {items.filter(i => scores[i.id]?.score === 1).length} / {items.length} mastered
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        {items.map(item => (
                          <div 
                            key={item.id}
                            className={`flex items-center justify-between gap-3 p-2 rounded-lg ${getScoreColor(item.id)}`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs shrink-0">
                                  {item.code}
                                </Badge>
                                <span className="text-sm font-medium truncate">{item.title}</span>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <HelpCircle className="w-3 h-3 text-muted-foreground" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-sm">
                                    <p className="text-sm">{item.description}</p>
                                    {item.mastery_criteria && (
                                      <p className="text-xs text-muted-foreground mt-1">
                                        <strong>Mastery:</strong> {item.mastery_criteria}
                                      </p>
                                    )}
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {/* Score buttons */}
                              <div className="flex gap-1">
                                {SCORE_OPTIONS.map(option => (
                                  <Button
                                    key={option.value}
                                    variant="outline"
                                    size="sm"
                                    className={`w-8 h-8 p-0 ${
                                      scores[item.id]?.score === option.value 
                                        ? option.color + ' ring-2 ring-offset-1' 
                                        : 'hover:' + option.color.split(' ')[0]
                                    }`}
                                    onClick={() => handleScoreChange(item.id, option.value)}
                                  >
                                    {option.label}
                                  </Button>
                                ))}
                              </div>

                              {/* Add as target */}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => handleAddAsTarget(item)}
                                  >
                                    <FileText className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Add as Target</TooltipContent>
                              </Tooltip>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
