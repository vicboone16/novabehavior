import { useState, useMemo } from 'react';
import { 
  ArrowLeft, Save, FileText, CheckCircle2, HelpCircle, 
  Upload, Printer, AlertTriangle, Calendar, RotateCcw, X, BarChart3, ExternalLink, FileDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useCurriculumItems, useDomains, useTargetActions } from '@/hooks/useCurriculum';
import { AssessmentUploadMapper } from './AssessmentUploadMapper';
import { PrintableAssessmentGrid } from './PrintableAssessmentGrid';
import { VBMAPPReport } from './VBMAPPReport';
import { EmbeddedBarriersGrid } from './VBMAPPBarriersGrid';
import { EmbeddedTransitionGrid } from './VBMAPPTransitionGrid';
import { EmbeddedEESAGrid } from './VBMAPPEESAGrid';
import type { StudentAssessment, MilestoneScore, CurriculumItem } from '@/types/curriculum';
import { AssessmentReportExport } from '@/components/assessment/AssessmentReportExport';
import { VBMAPPMasterGrid, type HistoricalEntry } from './VBMAPPMasterGrid';

// Known curriculum system IDs for subtests
const BARRIERS_SYSTEM_ID = 'a0b1c2d3-e4f5-4a6b-8c9d-100000000001';
const TRANSITION_SYSTEM_ID = 'a0b1c2d3-e4f5-4a6b-8c9d-200000000001';
const EESA_SYSTEM_ID = 'a0b1c2d3-e4f5-4a6b-8c9d-300000000001';

interface VBMAPPGridProps {
  studentId: string;
  studentName: string;
  assessment: StudentAssessment;
  allAssessments?: StudentAssessment[];
  onBack: () => void;
  onSave: (
    results: Record<string, MilestoneScore>,
    domainScores: Record<string, number>,
    status: 'draft' | 'final'
  ) => Promise<void>;
}

const SCORE_OPTIONS = [
  { value: 0, label: '0', description: 'Not demonstrated', color: 'bg-destructive/20 hover:bg-destructive/30 text-destructive border-destructive/40' },
  { value: 0.5, label: '½', description: 'Emerging', color: 'bg-amber-100 hover:bg-amber-200 text-amber-700 border-amber-300' },
  { value: 1, label: '1', description: 'Mastered', color: 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700 border-emerald-300' },
];

// Colors for different assessment dates
const DATE_COLORS = [
  { bg: 'bg-blue-500', text: 'text-blue-500', ring: 'ring-blue-500', label: 'Current', hex: '#3b82f6' },
  { bg: 'bg-purple-500', text: 'text-purple-500', ring: 'ring-purple-500', label: 'Previous 1', hex: '#a855f7' },
  { bg: 'bg-orange-500', text: 'text-orange-500', ring: 'ring-orange-500', label: 'Previous 2', hex: '#f97316' },
  { bg: 'bg-teal-500', text: 'text-teal-500', ring: 'ring-teal-500', label: 'Previous 3', hex: '#14b8a6' },
  { bg: 'bg-pink-500', text: 'text-pink-500', ring: 'ring-pink-500', label: 'Previous 4', hex: '#ec4899' },
];

export function VBMAPPGrid({ studentId, studentName, assessment, allAssessments = [], onBack, onSave }: VBMAPPGridProps) {
  const { domains } = useDomains();
  const { items: allItems, loading } = useCurriculumItems(assessment.curriculum_system_id);
  const { addTarget } = useTargetActions(studentId);

  const [scores, setScores] = useState<Record<string, MilestoneScore>>(
    (assessment.results_json || {}) as Record<string, MilestoneScore>
  );
  const [saving, setSaving] = useState(false);
  const [showUploadMapper, setShowUploadMapper] = useState(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [showIncompleteWarning, setShowIncompleteWarning] = useState(false);
  const [activeLevel, setActiveLevel] = useState('Level 1');
  const [showHistoricalOverlay, setShowHistoricalOverlay] = useState(true);
  const [activeView, setActiveView] = useState<'overview' | 'milestones' | 'grid' | 'charts' | 'recommendations' | 'goals' | 'export'>('overview');
  const [activeSubtest, setActiveSubtest] = useState<'milestones' | 'barriers' | 'transition' | 'eesa'>('milestones');
  const [clearDomainConfirm, setClearDomainConfirm] = useState<{ domain: string; level: string } | null>(null);
  const [showReportExport, setShowReportExport] = useState(false);

  // Build historical scores from other assessments
  const historicalScores = useMemo(() => {
    const otherAssessments = allAssessments
      .filter(a => a.id !== assessment.id)
      .sort((a, b) => new Date(b.date_administered).getTime() - new Date(a.date_administered).getTime());
    
    return otherAssessments.map((a, index) => ({
      assessment: a,
      scores: (a.results_json || {}) as Record<string, MilestoneScore>,
      color: DATE_COLORS[Math.min(index + 1, DATE_COLORS.length - 1)],
    }));
  }, [allAssessments, assessment.id]);

  // Historical entries formatted for the master grid (with hex colors)
  const masterGridHistoricalEntries: HistoricalEntry[] = useMemo(() => {
    return historicalScores.map((h) => ({
      assessment: h.assessment,
      scores: h.scores,
      hexColor: h.color.hex,
    }));
  }, [historicalScores]);

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

    grouped.forEach(domainMap => {
      domainMap.forEach(items => {
        items.sort((a, b) => a.display_order - b.display_order);
      });
    });

    return grouped;
  }, [allItems]);

  const levels = useMemo(() => {
    const levelSet = new Set<string>();
    allItems.forEach(item => {
      if (item.level) levelSet.add(item.level);
    });
    return Array.from(levelSet).sort();
  }, [allItems]);

  const domainScores = useMemo(() => {
    const scores_by_domain: Record<string, { total: number; possible: number }> = {};
    
    allItems.forEach(item => {
      const domainName = item.domain?.name || 'Other';
      if (!scores_by_domain[domainName]) {
        scores_by_domain[domainName] = { total: 0, possible: 0 };
      }
      
      scores_by_domain[domainName].possible += 1;
      const score = scores[item.id]?.score;
      if (score !== undefined && score !== null) {
        scores_by_domain[domainName].total += score;
      }
    });

    return scores_by_domain;
  }, [allItems, scores]);

  const completionPercentage = useMemo(() => {
    const scoredCount = Object.values(scores).filter(s => s.score !== undefined && s.score !== null).length;
    return allItems.length > 0 ? Math.round((scoredCount / allItems.length) * 100) : 0;
  }, [scores, allItems]);

  const isComplete = completionPercentage >= 90;

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

  const handleClearScore = (itemId: string) => {
    setScores(prev => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
    toast.success('Score cleared');
  };

  // Cycle score in master grid: undefined → 0.5 → 1 → undefined
  const handleCellCycleScore = (itemId: string, currentScore: number | undefined) => {
    if (currentScore === undefined || currentScore === null) {
      handleScoreChange(itemId, 0.5);
    } else if (currentScore === 0.5) {
      handleScoreChange(itemId, 1);
    } else if (currentScore === 1) {
      handleScoreChange(itemId, 0);
    } else {
      handleClearScore(itemId);
    }
  };

  const handleClearDomainRow = (domain: string, level: string) => {
    const domainMap = itemsByDomainAndLevel.get(domain);
    if (!domainMap) return;
    
    const items = domainMap.get(level) || [];
    
    setScores(prev => {
      const next = { ...prev };
      items.forEach(item => {
        delete next[item.id];
      });
      return next;
    });
    
    toast.success(`Cleared ${items.length} items in ${domain} (${level})`);
    setClearDomainConfirm(null);
  };

  const handleSave = async (finalize: boolean) => {
    if (finalize && !isComplete) {
      setShowIncompleteWarning(true);
      return;
    }
    await performSave(finalize);
  };

  const performSave = async (finalize: boolean) => {
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

  const getScoreDisplay = (itemId: string) => {
    const score = scores[itemId];
    if (!score || score.score === undefined || score.score === null) {
      return { label: 'Not assessed', color: 'bg-muted/50 text-muted-foreground', isScored: false };
    }
    if (score.score === 0) {
      return { label: '0 - Not demonstrated', color: 'bg-destructive/10', isScored: true };
    }
    if (score.score === 0.5) {
      return { label: '½ - Emerging', color: 'bg-amber-50', isScored: true };
    }
    return { label: '1 - Mastered', color: 'bg-emerald-50', isScored: true };
  };

  const getHistoricalIndicators = (itemId: string) => {
    if (!showHistoricalOverlay) return [];
    
    return historicalScores
      .filter(h => h.scores[itemId]?.score !== undefined && h.scores[itemId]?.score !== null)
      .map(h => ({
        score: h.scores[itemId].score,
        date: h.assessment.date_administered,
        color: h.color,
      }));
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
            <h3 className="font-semibold text-lg">VB-MAPP Assessment</h3>
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
              <span className={!isComplete ? 'text-amber-600' : ''}>
                {completionPercentage}% complete
              </span>
              {!isComplete && <AlertTriangle className="w-3 h-3 text-amber-500" />}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {/* View Toggle */}
          <div className="flex border rounded-lg overflow-hidden">
            <Button 
              variant={activeView === 'grid' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-none"
              onClick={() => setActiveView('grid')}
            >
              <BarChart3 className="w-4 h-4 mr-1" />
              Grid
            </Button>
            <Button 
              variant={activeView === 'milestones' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-none"
              onClick={() => setActiveView('milestones')}
            >
              List
            </Button>
            <Button 
              variant={activeView === 'report' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-none"
              onClick={() => setActiveView('report')}
            >
              Report
            </Button>
          </div>

          <Button variant="outline" onClick={() => setShowReportExport(true)}>
            <FileDown className="w-4 h-4 mr-2" />
            Generate Report
          </Button>
          <Button variant="outline" onClick={() => setShowPrintDialog(true)}>
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" onClick={() => setShowUploadMapper(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Upload
          </Button>
          <Button variant="outline" onClick={() => handleSave(false)} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
          <Button onClick={() => handleSave(true)} disabled={saving}>
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Finalize
          </Button>
        </div>
      </div>

      {/* Subtest Tabs */}
      <div className="flex border rounded-lg overflow-hidden w-fit">
        {(['milestones', 'barriers', 'transition', 'eesa'] as const).map(subtest => (
          <Button
            key={subtest}
            variant={activeSubtest === subtest ? 'default' : 'ghost'}
            size="sm"
            className="rounded-none capitalize"
            onClick={() => {
              setActiveSubtest(subtest);
              if (subtest !== 'milestones') setActiveView('milestones');
            }}
          >
            {subtest === 'eesa' ? 'EESA' : subtest.charAt(0).toUpperCase() + subtest.slice(1)}
          </Button>
        ))}
      </div>

      {/* Barriers Subtest */}
      {activeSubtest === 'barriers' && (
        <EmbeddedBarriersGrid
          curriculumSystemId={BARRIERS_SYSTEM_ID}
          scores={scores}
          onScoreChange={handleScoreChange}
        />
      )}

      {/* Transition Subtest */}
      {activeSubtest === 'transition' && (
        <EmbeddedTransitionGrid
          curriculumSystemId={TRANSITION_SYSTEM_ID}
          scores={scores}
          onScoreChange={handleScoreChange}
        />
      )}

      {/* EESA Subtest */}
      {activeSubtest === 'eesa' && (
        <EmbeddedEESAGrid
          curriculumSystemId={EESA_SYSTEM_ID}
          scores={scores}
          onScoreChange={handleScoreChange}
        />
      )}

      {/* Master Grid View (official VB-MAPP scoring form visual) */}
      {activeSubtest === 'milestones' && activeView === 'grid' && (
        <VBMAPPMasterGrid
          items={allItems}
          scores={scores}
          historicalEntries={masterGridHistoricalEntries}
          showHistorical={showHistoricalOverlay}
          onCellClick={handleCellCycleScore}
        />
      )}

      {/* Report View (only for milestones subtest) */}
      {activeSubtest === 'milestones' && activeView === 'report' && (
        <VBMAPPReport
          assessment={assessment}
          items={allItems}
          scores={scores}
          studentName={studentName}
          onAddGoals={(goals) => {
            goals.forEach(async (goal) => {
              await addTarget({
                title: goal.title,
                mastery_criteria: goal.masteryCriteria,
                data_collection_type: goal.measurement === 'percent correct' ? 'discrete_trial' : 'probe',
                source_type: 'custom',
              });
            });
          }}
        />
      )}

      {/* Milestones View */}
      {activeSubtest === 'milestones' && activeView === 'milestones' && (
        <>
          {/* Historical Overlay Toggle */}
          {historicalScores.length > 0 && (
            <Card className="bg-muted/30">
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        id="show-historical"
                        checked={showHistoricalOverlay}
                        onCheckedChange={setShowHistoricalOverlay}
                      />
                      <Label htmlFor="show-historical" className="text-sm font-medium">
                        Show historical scores
                      </Label>
                    </div>
                  </div>
                  
                  {showHistoricalOverlay && (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-3 h-3 rounded-full ${DATE_COLORS[0].bg}`} />
                        <span className="text-xs">Current ({format(new Date(assessment.date_administered), 'M/d/yy')})</span>
                      </div>
                      {historicalScores.slice(0, 3).map((h, i) => (
                        <div key={h.assessment.id} className="flex items-center gap-1.5">
                          <div className={`w-3 h-3 rounded-full ${h.color.bg}`} />
                          <span className="text-xs">{format(new Date(h.assessment.date_administered), 'M/d/yy')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Assessment Progress</span>
              <span>{Object.values(scores).filter(s => s.score !== undefined && s.score !== null).length} / {allItems.length} items scored</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all ${isComplete ? 'bg-emerald-500' : 'bg-amber-400'}`}
                style={{ width: `${completionPercentage}%` }}
              />
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

                    const masteredCount = items.filter(i => scores[i.id]?.score === 1).length;
                    const scoredCount = items.filter(i => scores[i.id]?.score !== undefined && scores[i.id]?.score !== null).length;

                    return (
                      <Card key={domainName}>
                        <CardHeader className="py-3">
                          <CardTitle className="text-base flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span>{domainName}</span>
                              {domainName.toLowerCase().includes('echoic') && (
                                <Button
                                  variant="link"
                                  size="sm"
                                  className="h-auto p-0 text-xs text-primary"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveSubtest('eesa');
                                  }}
                                >
                                  <ExternalLink className="w-3 h-3 mr-1" />
                                  See EESA subtest
                                </Button>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">
                                {masteredCount} / {items.length} mastered
                              </Badge>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-7 text-xs">
                                    <RotateCcw className="w-3 h-3 mr-1" />
                                    Clear Row
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                  <DropdownMenuItem
                                    onClick={() => setClearDomainConfirm({ domain: domainName, level })}
                                    className="text-destructive"
                                  >
                                    Clear all {scoredCount} scored items in {domainName}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="space-y-2">
                            {items.map(item => {
                              const scoreDisplay = getScoreDisplay(item.id);
                              const historicalIndicators = getHistoricalIndicators(item.id);
                              
                              return (
                                <div 
                                  key={item.id}
                                  className={`flex items-center justify-between gap-3 p-2 rounded-lg ${scoreDisplay.color}`}
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
                                      
                                      {/* Historical indicators */}
                                      {historicalIndicators.length > 0 && (
                                        <div className="flex items-center gap-1 ml-2">
                                          {historicalIndicators.map((h, i) => (
                                            <Tooltip key={i}>
                                              <TooltipTrigger>
                                                <div 
                                                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${h.color.bg}`}
                                                >
                                                  {h.score === 0.5 ? '½' : h.score}
                                                </div>
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                <p className="text-xs">
                                                  Score: {h.score} on {format(new Date(h.date), 'MMM d, yyyy')}
                                                </p>
                                              </TooltipContent>
                                            </Tooltip>
                                          ))}
                                        </div>
                                      )}
                                      
                                      {/* Not assessed indicator */}
                                      {!scoreDisplay.isScored && (
                                        <Badge variant="outline" className="text-xs text-muted-foreground bg-muted/50">
                                          Not assessed
                                        </Badge>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    {/* Score buttons */}
                                    <div className="flex gap-1">
                                      {SCORE_OPTIONS.map(option => (
                                        <Tooltip key={option.value}>
                                          <TooltipTrigger asChild>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              className={`w-8 h-8 p-0 ${
                                                scores[item.id]?.score === option.value 
                                                  ? option.color + ` ring-2 ring-offset-1 ${DATE_COLORS[0].ring}` 
                                                  : 'hover:' + option.color.split(' ')[0]
                                              }`}
                                              onClick={() => handleScoreChange(item.id, option.value)}
                                            >
                                              {option.label}
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>{option.description}</TooltipContent>
                                        </Tooltip>
                                      ))}
                                    </div>

                                    {/* Clear score button */}
                                    {scoreDisplay.isScored && (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                            onClick={() => handleClearScore(item.id)}
                                          >
                                            <X className="w-4 h-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Clear score (set to Not Assessed)</TooltipContent>
                                      </Tooltip>
                                    )}

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
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </>
      )}

      {/* Dialogs */}
      <AssessmentUploadMapper
        open={showUploadMapper}
        onOpenChange={setShowUploadMapper}
        curriculumSystemId={assessment.curriculum_system_id}
        existingScores={scores}
        onScoresExtracted={(newScores) => setScores(newScores)}
      />

      <PrintableAssessmentGrid
        open={showPrintDialog}
        onOpenChange={setShowPrintDialog}
        assessment={{ ...assessment, results_json: scores }}
        items={allItems}
        studentName={studentName}
        systemName="VB-MAPP"
      />

      <AlertDialog open={showIncompleteWarning} onOpenChange={setShowIncompleteWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Incomplete Assessment
            </AlertDialogTitle>
            <AlertDialogDescription>
              This assessment is only {completionPercentage}% complete. You can still finalize it, 
              but recommendations may be less accurate.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Editing</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setShowIncompleteWarning(false);
              performSave(true);
            }}>
              Finalize Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!clearDomainConfirm} onOpenChange={() => setClearDomainConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Domain Scores?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reset all scored items in <strong>{clearDomainConfirm?.domain}</strong> ({clearDomainConfirm?.level}) 
              back to "Not Assessed". This action can be undone by re-scoring items.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => clearDomainConfirm && handleClearDomainRow(clearDomainConfirm.domain, clearDomainConfirm.level)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Clear All Scores
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Assessment Report Export Modal */}
      <AssessmentReportExport
        open={showReportExport}
        onOpenChange={setShowReportExport}
        assessmentType="vbmapp"
        studentName={studentName}
        dateAdministered={assessment.date_administered}
        domainScores={Object.entries(domainScores).map(([domain, { total, possible }]) => ({
          domain,
          raw: total,
          max: possible,
          percent: possible > 0 ? Math.round((total / possible) * 100) : 0,
        }))}
        overallMastery={
          (() => {
            const totalPossible = Object.values(domainScores).reduce((s, d) => s + d.possible, 0);
            const totalScored = Object.values(domainScores).reduce((s, d) => s + d.total, 0);
            return totalPossible > 0 ? Math.round((totalScored / totalPossible) * 100) : 0;
          })()
        }
        strengths={Object.entries(domainScores)
          .filter(([, { total, possible }]) => possible > 0 && (total / possible) >= 0.7)
          .map(([d]) => d)}
        priorities={Object.entries(domainScores)
          .filter(([, { total, possible }]) => possible > 0 && (total / possible) < 0.5)
          .map(([d]) => d)}
      />
    </div>
  );
}