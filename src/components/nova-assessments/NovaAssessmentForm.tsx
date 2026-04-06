import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Brain, Eye, Users, Shield, Zap, Heart, AlertTriangle,
  CheckCircle2, Save, BarChart3, FileText, ChevronDown, ChevronRight,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  useNovaAssessmentDomains,
  useNovaAssessmentItems,
  useNovaAssessmentSession,
  useNovaSessionRatings,
  useNovaSessionResults,
  useSaveNovaRatings,
  useAutoScoreNovaSession,
  useFinalizeNovaSession,
  useUpdateNovaSession,
  useNovaAbrseRecommendations,
  NovaAssessmentDomain,
  NovaAssessmentItem,
  NovaAssessmentResult,
} from '@/hooks/useNovaAssessments';

interface Props {
  sessionId: string;
  assessmentCode: string;
  assessmentName: string;
  assessmentId: string;
  studentName: string;
  scaleMin?: number;
  scaleMax?: number;
  scaleLabels?: Record<number, string>;
  onViewReport?: () => void;
  onBack?: () => void;
}

const DEFAULT_SCALE_LABELS: Record<number, string> = {
  0: 'Not Observed',
  1: 'Rarely',
  2: 'Sometimes',
  3: 'Frequently',
};

const DOMAIN_ICONS: Record<string, any> = {
  D1: Zap,
  D2: Eye,
  D3: Brain,
  D4: Shield,
  D5: Heart,
  MASKER: Eye,
  EXTERNALIZER: AlertTriangle,
  INTERNALIZER: Heart,
  DEMAND_AVOIDANT_ARCH: Shield,
  SENSORY: Zap,
  CONTROLLED_PERFORMER: CheckCircle2,
  DYSREGULATED: AlertTriangle,
};

export function NovaAssessmentForm({
  sessionId,
  assessmentCode,
  assessmentName,
  assessmentId,
  studentName,
  scaleMin = 0,
  scaleMax = 3,
  scaleLabels,
  onViewReport,
  onBack,
}: Props) {
  const labels = scaleLabels || DEFAULT_SCALE_LABELS;
  const { data: domains } = useNovaAssessmentDomains(assessmentId);
  const { data: items } = useNovaAssessmentItems(assessmentId);
  const { data: session } = useNovaAssessmentSession(sessionId);
  const { data: existingRatings } = useNovaSessionRatings(sessionId);
  const { data: results } = useNovaSessionResults(sessionId);
  const saveRatings = useSaveNovaRatings();
  const autoScore = useAutoScoreNovaSession();
  const finalizeSession = useFinalizeNovaSession();
  const updateSession = useUpdateNovaSession();
  const { data: abrseRecs } = useNovaAbrseRecommendations(
    assessmentCode === 'ABRSE' ? sessionId : undefined
  );

  // Local state for ratings
  const [localRatings, setLocalRatings] = useState<Record<string, number>>({});
  const [localComments, setLocalComments] = useState<Record<string, string>>({});
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());
  const [raterName, setRaterName] = useState('');
  const [raterRole, setRaterRole] = useState('');
  const [settingName, setSettingName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Initialize from existing ratings
  useEffect(() => {
    if (existingRatings && existingRatings.length > 0) {
      const ratings: Record<string, number> = {};
      const comments: Record<string, string> = {};
      existingRatings.forEach(r => {
        ratings[r.item_id] = r.raw_score;
        if (r.comments) comments[r.item_id] = r.comments;
      });
      setLocalRatings(ratings);
      setLocalComments(comments);
    }
  }, [existingRatings]);

  // Initialize session metadata
  useEffect(() => {
    if (session) {
      setRaterName(session.rater_name || '');
      setRaterRole(session.rater_role || '');
      setSettingName(session.setting_name || '');
    }
  }, [session]);

  // Expand all domains by default
  useEffect(() => {
    if (domains && expandedDomains.size === 0) {
      setExpandedDomains(new Set(domains.map(d => d.id)));
    }
  }, [domains]);

  // Items grouped by domain
  const itemsByDomain = useMemo(() => {
    if (!items || !domains) return new Map<string, NovaAssessmentItem[]>();
    const map = new Map<string, NovaAssessmentItem[]>();
    domains.forEach(d => map.set(d.id, []));
    items.forEach(item => {
      const list = map.get(item.domain_id) || [];
      list.push(item);
      map.set(item.domain_id, list);
    });
    return map;
  }, [items, domains]);

  // Completion stats
  const totalItems = items?.length || 0;
  const completedItems = Object.keys(localRatings).length;
  const completionPct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  // Domain averages from local ratings
  const domainAverages = useMemo(() => {
    if (!domains || !items) return new Map<string, number>();
    const map = new Map<string, number>();
    domains.forEach(d => {
      const domainItems = itemsByDomain.get(d.id) || [];
      const scored = domainItems.filter(i => localRatings[i.id] !== undefined);
      if (scored.length === 0) return;
      const sum = scored.reduce((acc, i) => acc + (localRatings[i.id] || 0), 0);
      map.set(d.id, Math.round((sum / scored.length) * 100) / 100);
    });
    return map;
  }, [domains, items, localRatings, itemsByDomain]);

  const handleRatingChange = useCallback((itemId: string, score: number) => {
    setLocalRatings(prev => ({ ...prev, [itemId]: score }));
  }, []);

  const handleSaveDraft = useCallback(async () => {
    setIsSaving(true);
    try {
      const ratings = Object.entries(localRatings).map(([itemId, rawScore]) => ({
        itemId,
        rawScore,
        comments: localComments[itemId],
      }));
      if (ratings.length > 0) {
        await saveRatings.mutateAsync({ sessionId, ratings });
      }
      if (raterName || raterRole || settingName) {
        await updateSession.mutateAsync({
          sessionId,
          updates: {
            rater_name: raterName || null,
            rater_role: raterRole || null,
            setting_name: settingName || null,
          } as any,
        });
      }
      toast.success('Draft saved');
    } catch (err: any) {
      toast.error('Save failed: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  }, [localRatings, localComments, sessionId, raterName, raterRole, settingName, saveRatings, updateSession]);

  const handleAutoScore = useCallback(async () => {
    await handleSaveDraft();
    await autoScore.mutateAsync(sessionId);
  }, [handleSaveDraft, autoScore, sessionId]);

  const handleFinalize = useCallback(async () => {
    if (completionPct < 100) {
      toast.warning('Please complete all items before finalizing');
      return;
    }
    await handleSaveDraft();
    await autoScore.mutateAsync(sessionId);
    await finalizeSession.mutateAsync({
      sessionId,
      studentId: session?.student_id || '',
    });
  }, [completionPct, handleSaveDraft, autoScore, sessionId, finalizeSession, session]);

  const toggleDomain = (domainId: string) => {
    setExpandedDomains(prev => {
      const next = new Set(prev);
      if (next.has(domainId)) next.delete(domainId);
      else next.add(domainId);
      return next;
    });
  };

  // Get profile results
  const profileResults = useMemo(() => {
    if (!results) return [];
    return results.filter(r => r.result_scope === 'profile' || r.result_scope === 'archetype');
  }, [results]);

  const flagResults = useMemo(() => {
    if (!results) return [];
    return results.filter(r => r.result_scope === 'flag');
  }, [results]);

  const demandStyle = useMemo(() => {
    if (!results) return null;
    return results.find(r => r.result_scope === 'demand_style');
  }, [results]);

  const isFinalized = session?.status === 'final';

  return (
    <div className="grid lg:grid-cols-4 gap-4">
      {/* Main Form Area */}
      <div className="lg:col-span-3 space-y-4">
        {/* Header */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Brain className="w-5 h-5 text-primary" />
                  {assessmentName}
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  {studentName} • {session?.administration_date || 'Today'}
                  {isFinalized && <Badge variant="default" className="ml-2 text-xs">Finalized</Badge>}
                </CardDescription>
              </div>
              <div className="flex gap-2 flex-wrap">
                {onBack && (
                  <Button variant="outline" size="sm" onClick={onBack}>
                    ← Back
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveDraft}
                  disabled={isSaving || isFinalized}
                >
                  {isSaving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />}
                  Save Draft
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleAutoScore}
                  disabled={autoScore.isPending || completedItems === 0}
                >
                  {autoScore.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <BarChart3 className="w-3 h-3 mr-1" />}
                  Auto Score
                </Button>
                <Button
                  size="sm"
                  onClick={handleFinalize}
                  disabled={finalizeSession.isPending || isFinalized || completionPct < 100}
                >
                  {finalizeSession.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
                  Finalize
                </Button>
                {onViewReport && (
                  <Button variant="outline" size="sm" onClick={onViewReport}>
                    <FileText className="w-3 h-3 mr-1" />
                    View Report
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Rater Name</Label>
                <Input
                  value={raterName}
                  onChange={e => setRaterName(e.target.value)}
                  placeholder="Name"
                  className="h-8 text-xs"
                  disabled={isFinalized}
                />
              </div>
              <div>
                <Label className="text-xs">Role</Label>
                <Select value={raterRole} onValueChange={setRaterRole} disabled={isFinalized}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Role" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bcba">BCBA</SelectItem>
                    <SelectItem value="teacher">Teacher</SelectItem>
                    <SelectItem value="parent">Parent</SelectItem>
                    <SelectItem value="rbt">RBT</SelectItem>
                    <SelectItem value="clinician">Clinician</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Setting</Label>
                <Select value={settingName} onValueChange={setSettingName} disabled={isFinalized}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Setting" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="School">School</SelectItem>
                    <SelectItem value="Home">Home</SelectItem>
                    <SelectItem value="Clinic">Clinic</SelectItem>
                    <SelectItem value="Community">Community</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Domain Sections */}
        <ScrollArea className="h-[calc(100vh-340px)]">
          <div className="space-y-3 pr-4">
            {(domains || []).map(domain => {
              const domainItems = itemsByDomain.get(domain.id) || [];
              const completedInDomain = domainItems.filter(i => localRatings[i.id] !== undefined).length;
              const avg = domainAverages.get(domain.id);
              const isExpanded = expandedDomains.has(domain.id);
              const DomainIcon = DOMAIN_ICONS[domain.code] || Brain;

              return (
                <Collapsible key={domain.id} open={isExpanded} onOpenChange={() => toggleDomain(domain.id)}>
                  <Card>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="pb-2 cursor-pointer hover:bg-muted/30 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            <DomainIcon className="w-4 h-4 text-primary" />
                            <CardTitle className="text-sm">{domain.name}</CardTitle>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={completedInDomain === domainItems.length ? 'default' : 'secondary'} className="text-xs">
                              {completedInDomain}/{domainItems.length}
                            </Badge>
                            {avg !== undefined && (
                              <Badge variant="outline" className="text-xs font-mono">
                                Avg: {avg.toFixed(2)}
                              </Badge>
                            )}
                          </div>
                        </div>
                        {domain.description && (
                          <CardDescription className="text-xs pl-10">{domain.description}</CardDescription>
                        )}
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0 space-y-2">
                        {domainItems.map(item => {
                          const currentScore = localRatings[item.id];
                          return (
                            <div
                              key={item.id}
                              className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                                currentScore !== undefined ? 'bg-primary/5 border-primary/20' : 'hover:bg-muted/30'
                              }`}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-mono text-muted-foreground">{item.item_code}</span>
                                  {item.reverse_scored && (
                                    <Badge variant="outline" className="text-[10px] px-1">R</Badge>
                                  )}
                                </div>
                                <p className="text-sm">{item.item_text}</p>
                              </div>
                              <div className="flex gap-1 flex-shrink-0">
                                {Array.from({ length: scaleMax - scaleMin + 1 }, (_, i) => scaleMin + i).map(score => (
                                  <button
                                    key={score}
                                    onClick={() => !isFinalized && handleRatingChange(item.id, score)}
                                    disabled={isFinalized}
                                    className={`w-9 h-9 rounded-md text-xs font-medium border transition-all ${
                                      currentScore === score
                                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                        : 'bg-background hover:bg-muted border-border'
                                    } ${isFinalized ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                                    title={labels[score] || String(score)}
                                  >
                                    {score}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Sidebar */}
      <div className="space-y-4">
        {/* Completion */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Completion</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>{completedItems}/{totalItems} items</span>
                <span>{completionPct}%</span>
              </div>
              <Progress value={completionPct} className="h-2" />
            </div>
            {completionPct < 100 && (
              <p className="text-[10px] text-muted-foreground">
                {totalItems - completedItems} items remaining
              </p>
            )}
          </CardContent>
        </Card>

        {/* Domain Scores */}
        {domainAverages.size > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Domain Scores</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(domains || []).map(d => {
                const avg = domainAverages.get(d.id);
                if (avg === undefined) return null;
                const pct = (avg / scaleMax) * 100;
                return (
                  <div key={d.id} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="truncate">{d.name}</span>
                      <span className="font-mono">{avg.toFixed(2)}</span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Profile Preview */}
        {profileResults.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                {assessmentCode === 'NAP' ? 'Archetype' : 'Profile'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {profileResults.map(r => (
                <div key={r.id} className="flex items-center gap-2">
                  <Badge
                    variant={r.is_primary ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {r.is_primary ? 'Primary' : 'Secondary'}
                  </Badge>
                  <span className="text-xs font-medium">{r.result_label}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* EFDP Demand Style */}
        {demandStyle && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Demand Style</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="outline" className="text-xs">{demandStyle.result_label}</Badge>
              {demandStyle.result_json && (
                <div className="mt-2 space-y-1">
                  {Object.entries(demandStyle.result_json as Record<string, number>).map(([k, v]) => (
                    v !== null && (
                      <div key={k} className="flex justify-between text-[10px]">
                        <span className="capitalize">{k.replace(/_/g, ' ')}</span>
                        <span className="font-mono">{(v as number)?.toFixed?.(2) ?? v}</span>
                      </div>
                    )
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Flags */}
        {flagResults.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-destructive" />
                Flags
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {flagResults.map(f => (
                <Badge key={f.id} variant="destructive" className="text-xs mr-1 mb-1">
                  {f.result_label}
                </Badge>
              ))}
            </CardContent>
          </Card>
        )}

        {/* ABRSE Replacement Targets */}
        {abrseRecs && abrseRecs.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Replacement Targets</CardTitle>
              <CardDescription className="text-[10px]">Low-scoring items with suggested interventions</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {abrseRecs.filter(r => r.target_code).map((rec, i) => (
                    <div key={i} className="p-2 bg-muted/50 rounded-lg text-xs space-y-1">
                      <p className="font-medium">{rec.target_label}</p>
                      <p className="text-muted-foreground">{rec.replacement_behavior}</p>
                      <Badge variant="outline" className="text-[10px]">{rec.behavior_function}</Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Scale Legend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">Scale</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {Object.entries(labels).map(([score, label]) => (
              <div key={score} className="flex items-center gap-2 text-xs">
                <span className="w-5 h-5 rounded bg-muted flex items-center justify-center font-mono text-[10px]">
                  {score}
                </span>
                <span className="text-muted-foreground">{label}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
