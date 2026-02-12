import { useState, useMemo } from 'react';
import { ArrowLeft, Save, CheckCircle2, AlertTriangle, Calendar, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { format } from 'date-fns';
import type { StudentAssessment, MilestoneScore } from '@/types/curriculum';
import { AFLS_MODULES, AFLS_SCORE_OPTIONS, type AFLSModule } from '@/data/afls-items';
import { ABLLS_R_DOMAINS, type ABLLSRDomain } from '@/data/ablls-r-items';

type AssessmentType = 'afls' | 'ablls-r' | 'afls-ss-elem' | 'afls-ss-hs';

interface GenericItem {
  id: string;
  code: string;
  name: string;
  maxScore: number;
  group: string; // skill area or domain name
  groupCode: string;
  module?: string; // for AFLS modules
}

interface GenericAssessmentGridProps {
  studentId: string;
  studentName: string;
  assessment: StudentAssessment;
  assessmentType: AssessmentType;
  systemName: string;
  onBack: () => void;
  onSave: (
    results: Record<string, MilestoneScore>,
    domainScores: Record<string, number>,
    status: 'draft' | 'final'
  ) => Promise<void>;
}

function buildAFLSItems(modules?: AFLSModule[]): GenericItem[] {
  const items: GenericItem[] = [];
  const mods = modules || AFLS_MODULES;
  for (const mod of mods) {
    for (const area of mod.skillAreas) {
      for (let i = 1; i <= area.itemCount; i++) {
        const paddedNum = i.toString().padStart(2, '0');
        items.push({
          id: `afls_${mod.id}_${area.code}${paddedNum}`,
          code: `${area.code}${i}`,
          name: `${area.name} - Item ${i}`,
          maxScore: 4,
          group: area.name,
          groupCode: area.code,
          module: mod.name,
        });
      }
    }
  }
  return items;
}

function buildABLLSItems(): GenericItem[] {
  const items: GenericItem[] = [];
  for (const domain of ABLLS_R_DOMAINS) {
    for (const item of domain.items) {
      items.push({
        id: item.id,
        code: item.code,
        name: item.name,
        maxScore: item.maxScore,
        group: domain.name,
        groupCode: domain.code,
      });
    }
  }
  return items;
}

function getScoreOptions(maxScore: number): number[] {
  const options: number[] = [];
  for (let i = 0; i <= maxScore; i++) {
    options.push(i);
  }
  return options;
}

function getScoreColor(score: number, maxScore: number): string {
  if (score === 0) return 'bg-destructive/20 text-destructive border-destructive/40';
  if (score === maxScore) return 'bg-emerald-100 text-emerald-700 border-emerald-300';
  return 'bg-amber-100 text-amber-700 border-amber-300';
}

// AFLS Social Skills items for elementary
function buildAFLSSocialSkillsItems(variant: 'elementary' | 'high_school'): GenericItem[] {
  // Use School Skills module SS area as the base
  const ssModule = AFLS_MODULES.find(m => m.id === 'ss');
  if (!ssModule) return [];
  
  const ssArea = ssModule.skillAreas.find(a => a.code === 'SS');
  if (!ssArea) return [];
  
  const prefix = variant === 'elementary' ? 'afls_ss_elem' : 'afls_ss_hs';
  const items: GenericItem[] = [];
  
  for (let i = 1; i <= ssArea.itemCount; i++) {
    const paddedNum = i.toString().padStart(2, '0');
    items.push({
      id: `${prefix}_SS${paddedNum}`,
      code: `SS${i}`,
      name: `Social Skills - Item ${i}`,
      maxScore: 4,
      group: 'Social Skills',
      groupCode: 'SS',
    });
  }
  
  return items;
}

export function GenericAssessmentGrid({
  studentId,
  studentName,
  assessment,
  assessmentType,
  systemName,
  onBack,
  onSave,
}: GenericAssessmentGridProps) {
  const [scores, setScores] = useState<Record<string, MilestoneScore>>(
    (assessment.results_json || {}) as Record<string, MilestoneScore>
  );
  const [saving, setSaving] = useState(false);

  const allItems = useMemo(() => {
    switch (assessmentType) {
      case 'afls': return buildAFLSItems();
      case 'ablls-r': return buildABLLSItems();
      case 'afls-ss-elem': return buildAFLSSocialSkillsItems('elementary');
      case 'afls-ss-hs': return buildAFLSSocialSkillsItems('high_school');
      default: return [];
    }
  }, [assessmentType]);

  // Group items by module (for AFLS) or by group
  const groupedItems = useMemo(() => {
    const grouped = new Map<string, Map<string, GenericItem[]>>();

    allItems.forEach(item => {
      const topLevel = item.module || 'All';
      const subGroup = item.group;

      if (!grouped.has(topLevel)) grouped.set(topLevel, new Map());
      const subMap = grouped.get(topLevel)!;
      if (!subMap.has(subGroup)) subMap.set(subGroup, []);
      subMap.get(subGroup)!.push(item);
    });

    return grouped;
  }, [allItems]);

  const modules = useMemo(() => Array.from(groupedItems.keys()), [groupedItems]);
  const [activeModule, setActiveModule] = useState(modules[0] || '');

  const completionStats = useMemo(() => {
    const scoredCount = Object.values(scores).filter(s => s.score !== undefined && s.score !== null).length;
    const pct = allItems.length > 0 ? Math.round((scoredCount / allItems.length) * 100) : 0;
    return { scored: scoredCount, total: allItems.length, pct };
  }, [scores, allItems]);

  const domainScores = useMemo(() => {
    const result: Record<string, { total: number; possible: number }> = {};
    allItems.forEach(item => {
      if (!result[item.group]) result[item.group] = { total: 0, possible: 0 };
      result[item.group].possible += item.maxScore;
      const score = scores[item.id]?.score;
      if (score !== undefined && score !== null) {
        result[item.group].total += score;
      }
    });
    return result;
  }, [allItems, scores]);

  const handleScoreChange = (itemId: string, score: number) => {
    setScores(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], score, date_scored: new Date().toISOString() },
    }));
  };

  const handleClearScore = (itemId: string) => {
    setScores(prev => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  };

  const handleClearGroup = (groupName: string) => {
    const items = allItems.filter(i => i.group === groupName);
    setScores(prev => {
      const next = { ...prev };
      items.forEach(i => delete next[i.id]);
      return next;
    });
    toast.success(`Cleared ${items.length} items in ${groupName}`);
  };

  const handleSave = async (finalize: boolean) => {
    setSaving(true);
    try {
      const domainScoresRecord: Record<string, number> = {};
      Object.entries(domainScores).forEach(([group, { total, possible }]) => {
        domainScoresRecord[group] = possible > 0 ? Math.round((total / possible) * 100) : 0;
      });
      await onSave(scores, domainScoresRecord, finalize ? 'final' : 'draft');
      toast.success(finalize ? 'Assessment finalized' : 'Assessment saved');
      if (finalize) onBack();
    } catch {
      toast.error('Failed to save assessment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h3 className="font-semibold text-lg">{systemName}</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{studentName}</span>
              <span>•</span>
              <Badge variant={assessment.status === 'final' ? 'default' : 'secondary'}>
                {assessment.status === 'final' ? 'Finalized' : 'Draft'}
              </Badge>
              <span>•</span>
              <Calendar className="w-3 h-3" />
              <span>{format(new Date(assessment.date_administered), 'MMM d, yyyy')}</span>
              <span>•</span>
              <span className={completionStats.pct < 90 ? 'text-amber-600' : ''}>
                {completionStats.pct}% complete
              </span>
              {completionStats.pct < 90 && <AlertTriangle className="w-3 h-3 text-amber-500" />}
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

      {/* Progress */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Assessment Progress</span>
          <span>{completionStats.scored} / {completionStats.total} items scored</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${completionStats.pct >= 90 ? 'bg-emerald-500' : 'bg-amber-400'}`}
            style={{ width: `${completionStats.pct}%` }}
          />
        </div>
      </div>

      {/* Domain Score Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
        {Object.entries(domainScores).slice(0, 12).map(([group, { total, possible }]) => (
          <Card key={group} className="p-3">
            <div className="text-xs text-muted-foreground truncate">{group}</div>
            <div className="text-lg font-bold">
              {total} <span className="text-sm font-normal text-muted-foreground">/ {possible}</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Module / Group Tabs */}
      {modules.length > 1 ? (
        <Tabs value={activeModule} onValueChange={setActiveModule}>
          <TabsList className="flex-wrap h-auto">
            {modules.map(mod => (
              <TabsTrigger key={mod} value={mod} className="text-xs">{mod}</TabsTrigger>
            ))}
          </TabsList>
          {modules.map(mod => (
            <TabsContent key={mod} value={mod} className="mt-4">
              <SkillAreaCards
                groups={groupedItems.get(mod)!}
                scores={scores}
                onScoreChange={handleScoreChange}
                onClearScore={handleClearScore}
                onClearGroup={handleClearGroup}
              />
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <SkillAreaCards
          groups={groupedItems.get(modules[0] || 'All') || new Map()}
          scores={scores}
          onScoreChange={handleScoreChange}
          onClearScore={handleClearScore}
          onClearGroup={handleClearGroup}
        />
      )}
    </div>
  );
}

interface SkillAreaCardsProps {
  groups: Map<string, GenericItem[]>;
  scores: Record<string, MilestoneScore>;
  onScoreChange: (itemId: string, score: number) => void;
  onClearScore: (itemId: string) => void;
  onClearGroup: (groupName: string) => void;
}

function SkillAreaCards({ groups, scores, onScoreChange, onClearScore, onClearGroup }: SkillAreaCardsProps) {
  return (
    <div className="space-y-6">
      {Array.from(groups.entries()).map(([groupName, items]) => {
        const scoredCount = items.filter(i => scores[i.id]?.score !== undefined && scores[i.id]?.score !== null).length;
        const masteredCount = items.filter(i => scores[i.id]?.score === i.maxScore).length;

        return (
          <Card key={groupName}>
            <CardHeader className="py-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span>{groupName}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {masteredCount} / {items.length} mastered
                  </Badge>
                  <Badge variant="secondary">
                    {scoredCount} scored
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 text-xs">
                        <RotateCcw className="w-3 h-3 mr-1" />Clear
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => onClearGroup(groupName)} className="text-destructive">
                        Clear all scores in {groupName}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {items.map(item => {
                  const currentScore = scores[item.id]?.score;
                  const isScored = currentScore !== undefined && currentScore !== null;
                  const scoreOptions = getScoreOptions(item.maxScore);

                  return (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                        isScored ? 'bg-muted/30' : 'hover:bg-muted/20'
                      }`}
                    >
                      <div className="w-14 text-xs font-mono text-muted-foreground">{item.code}</div>
                      <div className="flex-1 text-sm truncate">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-default">{item.name}</span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            {item.name} (Max: {item.maxScore})
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="flex items-center gap-1">
                        {scoreOptions.map(opt => (
                          <button
                            key={opt}
                            onClick={() => onScoreChange(item.id, opt)}
                            className={`w-8 h-8 rounded-md text-xs font-medium border transition-colors ${
                              currentScore === opt
                                ? getScoreColor(opt, item.maxScore)
                                : 'bg-background hover:bg-muted border-border'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                        {isScored && (
                          <button
                            onClick={() => onClearScore(item.id)}
                            className="w-8 h-8 rounded-md text-xs text-muted-foreground hover:bg-muted border border-transparent hover:border-border"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
