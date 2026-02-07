import { useState, useMemo } from 'react';
import {
  ArrowLeft, Save, CheckCircle2, AlertTriangle, Calendar,
  RotateCcw, X, BarChart3, HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { InternalTrackerReport } from './InternalTrackerReport';
import type { TrackerType } from './InternalTrackerEntry';
import type { MilestoneScore } from '@/types/curriculum';

// AFLS data
import { AFLS_MODULES, AFLS_SCORE_OPTIONS, getAFLSModuleItems, getSkillAreaName, type AFLSItem } from '@/data/afls-items';
// ABLLS-R data
import { ABLLS_R_DOMAINS, type ABLLSRItem } from '@/data/ablls-r-items';

// --- Generic item abstraction ---
interface TrackerItem {
  id: string;
  code: string;
  name: string;
  maxScore: number;
  groupKey: string;   // skill area code (AFLS) or domain code (ABLLS-R)
  groupName: string;
}

interface TrackerSection {
  key: string;
  label: string;
  items: TrackerItem[];
}

interface TrackerTab {
  key: string;
  label: string;
  sections: TrackerSection[];
}

interface InternalTrackerGridProps {
  trackerType: TrackerType;
  studentId: string;
  studentName: string;
  assessmentId: string;
  dateAdministered: string;
  status: 'draft' | 'final';
  initialScores: Record<string, MilestoneScore>;
  allAssessments: {
    id: string;
    date_administered: string;
    results_json: Record<string, MilestoneScore>;
  }[];
  onBack: () => void;
  onSave: (
    results: Record<string, MilestoneScore>,
    domainScores: Record<string, number>,
    status: 'draft' | 'final'
  ) => Promise<void>;
}

const DATE_COLORS = [
  { bg: 'bg-blue-500', ring: 'ring-blue-500' },
  { bg: 'bg-purple-500', ring: 'ring-purple-500' },
  { bg: 'bg-orange-500', ring: 'ring-orange-500' },
  { bg: 'bg-teal-500', ring: 'ring-teal-500' },
];

function getScoreColor(score: number, maxScore: number): string {
  if (score === 0) return 'bg-destructive/20 hover:bg-destructive/30 text-destructive border-destructive/40';
  const ratio = score / maxScore;
  if (ratio <= 0.25) return 'bg-red-100 hover:bg-red-200 text-red-700 border-red-300';
  if (ratio <= 0.5) return 'bg-amber-100 hover:bg-amber-200 text-amber-700 border-amber-300';
  if (ratio <= 0.75) return 'bg-sky-100 hover:bg-sky-200 text-sky-700 border-sky-300';
  return 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700 border-emerald-300';
}

function getRowBg(score: number | undefined | null, maxScore: number): string {
  if (score === undefined || score === null) return 'bg-muted/50';
  if (score === 0) return 'bg-destructive/5';
  const ratio = score / maxScore;
  if (ratio <= 0.5) return 'bg-amber-50/50';
  if (ratio <= 0.75) return 'bg-sky-50/50';
  return 'bg-emerald-50/50';
}

// Build tab/section/item structure per tracker type
function buildTrackerTabs(trackerType: TrackerType): TrackerTab[] {
  if (trackerType === 'afls') {
    return AFLS_MODULES.map(mod => ({
      key: mod.id,
      label: mod.name,
      sections: mod.skillAreas.map(area => ({
        key: `${mod.id}_${area.code}`,
        label: `${area.code} – ${area.name}`,
        items: getAFLSModuleItems(mod.id)
          .filter(it => it.skillAreaCode === area.code)
          .map(it => ({
            id: it.id,
            code: it.code,
            name: `${area.name} – Item ${it.itemNumber}`,
            maxScore: it.maxScore,
            groupKey: area.code,
            groupName: area.name,
          })),
      })),
    }));
  }
  // ABLLS-R: single "tab" per domain
  return [{
    key: 'all',
    label: 'All Domains',
    sections: ABLLS_R_DOMAINS.map(domain => ({
      key: domain.code,
      label: domain.fullName,
      items: domain.items.map(it => ({
        id: it.id,
        code: it.code,
        name: it.name,
        maxScore: it.maxScore,
        groupKey: domain.code,
        groupName: domain.name,
      })),
    })),
  }];
}

function getAllTrackerItems(trackerType: TrackerType): TrackerItem[] {
  const tabs = buildTrackerTabs(trackerType);
  return tabs.flatMap(t => t.sections.flatMap(s => s.items));
}

export function InternalTrackerGrid({
  trackerType, studentId, studentName, assessmentId,
  dateAdministered, status, initialScores, allAssessments,
  onBack, onSave,
}: InternalTrackerGridProps) {
  const tabs = useMemo(() => buildTrackerTabs(trackerType), [trackerType]);
  const allItems = useMemo(() => getAllTrackerItems(trackerType), [trackerType]);
  const label = trackerType === 'afls' ? 'AFLS' : 'ABLLS-R';

  const [scores, setScores] = useState<Record<string, MilestoneScore>>(initialScores);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState(tabs[0]?.key || '');
  const [activeView, setActiveView] = useState<'grid' | 'report'>('grid');
  const [showHistorical, setShowHistorical] = useState(true);
  const [showIncompleteWarning, setShowIncompleteWarning] = useState(false);
  const [clearConfirm, setClearConfirm] = useState<{ sectionKey: string; label: string } | null>(null);

  // Historical overlays
  const historicalScores = useMemo(() => {
    return allAssessments
      .filter(a => a.id !== assessmentId)
      .sort((a, b) => new Date(b.date_administered).getTime() - new Date(a.date_administered).getTime())
      .map((a, idx) => ({
        scores: a.results_json,
        date: a.date_administered,
        color: DATE_COLORS[Math.min(idx, DATE_COLORS.length - 1)],
      }));
  }, [allAssessments, assessmentId]);

  // Completion stats
  const scoredCount = useMemo(() =>
    Object.values(scores).filter(s => s.score !== undefined && s.score !== null).length,
    [scores]
  );
  const completionPct = allItems.length > 0 ? Math.round((scoredCount / allItems.length) * 100) : 0;

  // Domain mastery: SUM(scores) / SUM(max_possible) for each group
  const domainMastery = useMemo(() => {
    const map: Record<string, { total: number; max: number; scored: number; count: number }> = {};
    allItems.forEach(item => {
      if (!map[item.groupKey]) map[item.groupKey] = { total: 0, max: 0, scored: 0, count: 0 };
      map[item.groupKey].count++;
      const s = scores[item.id];
      if (s?.score !== undefined && s.score !== null) {
        map[item.groupKey].total += s.score;
        map[item.groupKey].max += item.maxScore;
        map[item.groupKey].scored++;
      }
    });
    return map;
  }, [allItems, scores]);

  const handleScoreChange = (itemId: string, score: number) => {
    setScores(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], score, date_scored: new Date().toISOString() },
    }));
  };

  const handleClearScore = (itemId: string) => {
    setScores(prev => { const next = { ...prev }; delete next[itemId]; return next; });
    toast.success('Score cleared');
  };

  const handleClearSection = (sectionKey: string) => {
    const tab = tabs.find(t => t.sections.some(s => s.key === sectionKey));
    const section = tab?.sections.find(s => s.key === sectionKey);
    if (!section) return;
    setScores(prev => {
      const next = { ...prev };
      section.items.forEach(item => delete next[item.id]);
      return next;
    });
    toast.success(`Cleared ${section.items.length} items in ${section.label}`);
    setClearConfirm(null);
  };

  const handleSave = async (finalize: boolean) => {
    if (finalize && completionPct < 90) {
      setShowIncompleteWarning(true);
      return;
    }
    await performSave(finalize);
  };

  const performSave = async (finalize: boolean) => {
    setSaving(true);
    try {
      const domainScoresRecord: Record<string, number> = {};
      Object.entries(domainMastery).forEach(([key, { total, max }]) => {
        domainScoresRecord[key] = max > 0 ? Math.round((total / max) * 100) : 0;
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

  const getHistoricalIndicators = (itemId: string) => {
    if (!showHistorical) return [];
    return historicalScores
      .filter(h => h.scores[itemId]?.score !== undefined && h.scores[itemId]?.score !== null)
      .map(h => ({ score: h.scores[itemId].score, date: h.date, color: h.color }));
  };

  // Score options for a given max score
  const getScoreButtons = (maxScore: number): number[] => {
    const arr: number[] = [];
    for (let i = 0; i <= maxScore; i++) arr.push(i);
    return arr;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="w-4 h-4" /></Button>
          <div>
            <h3 className="font-semibold text-lg">{label} Assessment</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{studentName}</span>
              <span>•</span>
              <Badge variant={status === 'final' ? 'default' : 'secondary'}>
                {status === 'final' ? 'Finalized' : 'Draft'}
              </Badge>
              <span>•</span>
              <Calendar className="w-3 h-3" />
              <span>{format(new Date(dateAdministered), 'MMM d, yyyy')}</span>
              <span>•</span>
              <span className={completionPct < 90 ? 'text-amber-600' : ''}>
                {completionPct}% complete
              </span>
              {completionPct < 90 && <AlertTriangle className="w-3 h-3 text-amber-500" />}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex border rounded-lg overflow-hidden">
            <Button variant={activeView === 'grid' ? 'default' : 'ghost'} size="sm" className="rounded-none" onClick={() => setActiveView('grid')}>
              Grid
            </Button>
            <Button variant={activeView === 'report' ? 'default' : 'ghost'} size="sm" className="rounded-none" onClick={() => setActiveView('report')}>
              <BarChart3 className="w-4 h-4 mr-1" />Report
            </Button>
          </div>
          <Button variant="outline" onClick={() => handleSave(false)} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />Save
          </Button>
          <Button onClick={() => handleSave(true)} disabled={saving}>
            <CheckCircle2 className="w-4 h-4 mr-2" />Finalize
          </Button>
        </div>
      </div>

      {/* Report View */}
      {activeView === 'report' && (
        <InternalTrackerReport
          trackerType={trackerType}
          scores={scores}
          studentName={studentName}
          dateAdministered={dateAdministered}
          status={status}
        />
      )}

      {/* Grid View */}
      {activeView === 'grid' && (
        <>
          {/* Historical overlay toggle */}
          {historicalScores.length > 0 && (
            <Card className="bg-muted/30">
              <CardContent className="py-3">
                <div className="flex items-center gap-4">
                  <Switch id="hist-overlay" checked={showHistorical} onCheckedChange={setShowHistorical} />
                  <Label htmlFor="hist-overlay" className="text-sm font-medium">Show historical scores</Label>
                  {showHistorical && (
                    <div className="flex items-center gap-3 ml-auto">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-3 h-3 rounded-full ${DATE_COLORS[0].bg}`} />
                        <span className="text-xs">Current</span>
                      </div>
                      {historicalScores.slice(0, 3).map((h, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <div className={`w-3 h-3 rounded-full ${h.color.bg}`} />
                          <span className="text-xs">{format(new Date(h.date), 'M/d/yy')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Progress */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Assessment Progress</span>
              <span>{scoredCount} / {allItems.length} items scored</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${completionPct >= 90 ? 'bg-emerald-500' : 'bg-amber-400'}`}
                style={{ width: `${completionPct}%` }}
              />
            </div>
          </div>

          {/* Domain mastery summary */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {Object.entries(domainMastery).slice(0, 12).map(([key, { total, max, scored }]) => (
              <Card key={key} className="p-2">
                <div className="text-[10px] text-muted-foreground truncate">{key}</div>
                <div className="text-sm font-bold">
                  {max > 0 ? Math.round((total / max) * 100) : 0}%
                </div>
                <div className="text-[10px] text-muted-foreground">{scored} scored</div>
              </Card>
            ))}
          </div>

          {/* Module / Domain tabs */}
          {trackerType === 'afls' ? (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="flex flex-wrap h-auto gap-1">
                {tabs.map(tab => (
                  <TabsTrigger key={tab.key} value={tab.key} className="text-xs">
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              {tabs.map(tab => (
                <TabsContent key={tab.key} value={tab.key} className="mt-4 space-y-6">
                  {renderSections(tab.sections)}
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            // ABLLS-R: single scrollable list of domain sections
            <div className="space-y-6">
              {tabs[0]?.sections && renderSections(tabs[0].sections)}
            </div>
          )}
        </>
      )}

      {/* Incomplete warning */}
      <AlertDialog open={showIncompleteWarning} onOpenChange={setShowIncompleteWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />Incomplete Assessment
            </AlertDialogTitle>
            <AlertDialogDescription>
              This assessment is only {completionPct}% complete. Finalize anyway?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Editing</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setShowIncompleteWarning(false); performSave(true); }}>
              Finalize Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear section confirm */}
      <AlertDialog open={!!clearConfirm} onOpenChange={() => setClearConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Scores?</AlertDialogTitle>
            <AlertDialogDescription>
              Reset all scored items in <strong>{clearConfirm?.label}</strong> to "Not Scored".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => clearConfirm && handleClearSection(clearConfirm.sectionKey)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Clear All Scores
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  function renderSections(sections: TrackerSection[]) {
    return sections.map(section => {
      const sectionScored = section.items.filter(i => scores[i.id]?.score !== undefined && scores[i.id]?.score !== null).length;
      const sectionMastered = section.items.filter(i => scores[i.id]?.score === i.maxScore).length;

      return (
        <Card key={section.key}>
          <CardHeader className="py-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span>{section.label}</span>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{sectionMastered}/{section.items.length} max</Badge>
                <Badge variant="secondary">{sectionScored} scored</Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 text-xs">
                      <RotateCcw className="w-3 h-3 mr-1" />Clear
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem
                      onClick={() => setClearConfirm({ sectionKey: section.key, label: section.label })}
                      className="text-destructive"
                    >
                      Clear all {sectionScored} scored items
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-1.5">
              {section.items.map(item => {
                const s = scores[item.id];
                const isScored = s?.score !== undefined && s?.score !== null;
                const historicals = getHistoricalIndicators(item.id);
                const scoreButtons = getScoreButtons(item.maxScore);

                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between gap-2 p-2 rounded-lg ${getRowBg(s?.score, item.maxScore)}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs shrink-0">{item.code}</Badge>
                        <span className="text-sm truncate">{item.name}</span>
                        {item.maxScore !== 4 && (
                          <Tooltip>
                            <TooltipTrigger><HelpCircle className="w-3 h-3 text-muted-foreground" /></TooltipTrigger>
                            <TooltipContent>Max score: {item.maxScore}</TooltipContent>
                          </Tooltip>
                        )}
                        {historicals.length > 0 && (
                          <div className="flex items-center gap-0.5 ml-1">
                            {historicals.map((h, i) => (
                              <Tooltip key={i}>
                                <TooltipTrigger>
                                  <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white ${h.color.bg}`}>
                                    {h.score}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Score: {h.score} on {format(new Date(h.date), 'MMM d, yyyy')}
                                </TooltipContent>
                              </Tooltip>
                            ))}
                          </div>
                        )}
                        {!isScored && (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground bg-muted/50">Not scored</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {scoreButtons.map(val => (
                        <Button
                          key={val}
                          variant="outline"
                          size="sm"
                          className={`w-7 h-7 p-0 text-xs ${
                            s?.score === val
                              ? getScoreColor(val, item.maxScore) + ` ring-2 ring-offset-1 ${DATE_COLORS[0].ring}`
                              : ''
                          }`}
                          onClick={() => handleScoreChange(item.id, val)}
                        >
                          {val}
                        </Button>
                      ))}
                      {isScored && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => handleClearScore(item.id)}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Clear (set to Not Scored)</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      );
    });
  }
}
