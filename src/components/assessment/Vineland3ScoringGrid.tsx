import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowLeft, Save, CheckCircle2, Calculator, BarChart3,
  FileText, Target, History, AlertCircle, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  useVineland3,
  type Vineland3Assessment,
  type Vineland3Domain,
  type Vineland3Item,
  type Vineland3ItemScore,
  type Vineland3RawScore,
  type Vineland3DerivedScore,
  type Vineland3PairwiseComparison,
  type Vineland3ScoringStatus,
} from '@/hooks/useVineland3';
import { Vineland3Report } from './Vineland3Report';
import { Vineland3GoalMapping } from './Vineland3GoalMapping';
import { format } from 'date-fns';

interface Vineland3ScoringGridProps {
  assessment: Vineland3Assessment;
  studentName: string;
  studentDob?: string;
  domains: Vineland3Domain[];
  items: Vineland3Item[];
  studentId: string;
  onBack: () => void;
}

export function Vineland3ScoringGrid({
  assessment, studentName, studentDob, domains, items, studentId, onBack,
}: Vineland3ScoringGridProps) {
  const {
    loadItemScores, saveItemScore, calculateRawScores,
    calculateDerivedScores, scoreFullAssessment, updateAssessmentStatus,
  } = useVineland3(studentId, studentDob);

  const [activeTab, setActiveTab] = useState('items');
  const [activeDomainIdx, setActiveDomainIdx] = useState(0);
  const [scores, setScores] = useState<Record<string, Vineland3ItemScore>>({});
  const [rawScores, setRawScores] = useState<Vineland3RawScore[]>([]);
  const [derivedScores, setDerivedScores] = useState<Vineland3DerivedScore[]>([]);
  const [pairwiseComparisons, setPairwiseComparisons] = useState<Vineland3PairwiseComparison[]>([]);
  const [scoringStatus, setScoringStatus] = useState<Vineland3ScoringStatus | null>(null);
  const [derivedStatus, setDerivedStatus] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);

  const isLocked = assessment.status === 'locked';
  const scorableDomains = useMemo(() => domains.filter(d => d.domain_key !== 'maladaptive_behavior'), [domains]);
  const activeDomain = scorableDomains[activeDomainIdx] || scorableDomains[0];

  // Derived score helpers
  const subdomainScores = useMemo(() => derivedScores.filter(d => d.score_level === 'subdomain'), [derivedScores]);
  const domainScores = useMemo(() => derivedScores.filter(d => d.score_level === 'domain'), [derivedScores]);
  const compositeScore = useMemo(() => derivedScores.find(d => d.score_level === 'composite'), [derivedScores]);

  useEffect(() => {
    loadItemScores(assessment.id).then(s => { setScores(s); setLoading(false); });
  }, [assessment.id]);

  const handleScoreChange = useCallback(async (
    item: Vineland3Item,
    domain: Vineland3Domain,
    subdomain: { id: string; subdomain_key: string; subdomain_name: string; display_order: number; domain_id: string },
    score: number | null
  ) => {
    if (isLocked) return;
    setScores(prev => ({
      ...prev,
      [item.id]: {
        ...prev[item.id],
        id: prev[item.id]?.id || '',
        student_assessment_id: assessment.id,
        item_id: item.id,
        entered_score: score,
        response_note: prev[item.id]?.response_note || null,
      },
    }));

    try {
      await saveItemScore(assessment.id, item, domain, subdomain, score);
    } catch {
      toast.error('Failed to save score');
    }
  }, [assessment.id, isLocked, saveItemScore]);

  const handleScoreFullAssessment = async () => {
    setCalculating(true);
    try {
      const result = await scoreFullAssessment(assessment.id);
      setRawScores(result.rawScores);
      setDerivedScores(result.derivedScores);
      setPairwiseComparisons(result.pairwise);
      setScoringStatus(result.scoringStatus);
      setDerivedStatus(result.status);
      toast.success('Full assessment scored');
      setActiveTab('derived');
    } catch (err) {
      console.error('Scoring failed:', err);
      toast.error('Scoring failed — check scoring diagnostics');
    } finally {
      setCalculating(false);
    }
  };

  const handleCalculate = async () => {
    setCalculating(true);
    try {
      const raws = await calculateRawScores(assessment.id);
      setRawScores(raws);
      const result = await calculateDerivedScores(assessment.id);
      setDerivedScores(result.scores);
      setDerivedStatus(result.status);
      toast.success('Scores calculated');
      setActiveTab('raw');
    } catch {
      toast.error('Calculation failed');
    } finally {
      setCalculating(false);
    }
  };

  const handleStatusChange = async (status: string) => {
    try {
      await updateAssessmentStatus(assessment.id, status);
      toast.success(`Assessment marked as ${status}`);
    } catch {
      toast.error('Failed to update status');
    }
  };

  const totalItems = items.filter(i => {
    const dom = domains.find(d => d.id === i.domain_id);
    return dom && dom.domain_key !== 'maladaptive_behavior';
  }).length;
  const scoredItems = Object.values(scores).filter(s => s.entered_score != null).length;
  const progress = totalItems > 0 ? Math.round((scoredItems / totalItems) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const adaptiveLevelColor = (level: string | null) => {
    if (!level) return 'secondary';
    const l = level.toLowerCase();
    if (l.includes('high')) return 'default';
    if (l === 'adequate') return 'default';
    if (l.includes('moderately low')) return 'secondary';
    if (l === 'low') return 'destructive';
    return 'secondary';
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <div>
            <h3 className="font-semibold text-sm">Vineland-3 — {studentName}</h3>
            <p className="text-xs text-muted-foreground">
              {format(new Date(assessment.administration_date), 'MMM d, yyyy')}
              {assessment.chronological_age_display && ` • Age: ${assessment.chronological_age_display}`}
              {assessment.respondent_name && ` • Respondent: ${assessment.respondent_name}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">{progress}% scored</Badge>
          {!isLocked && (
            <>
              <Button size="sm" variant="outline" onClick={handleCalculate} disabled={calculating}>
                <Calculator className="w-4 h-4 mr-1" />
                {calculating ? 'Calculating...' : 'Calculate'}
              </Button>
              {assessment.status !== 'completed' && (
                <Button size="sm" onClick={() => handleStatusChange('completed')}>
                  <CheckCircle2 className="w-4 h-4 mr-1" /> Complete
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="items" className="text-xs gap-1">
            <FileText className="w-3 h-3" /> Item Entry
          </TabsTrigger>
          <TabsTrigger value="raw" className="text-xs gap-1">
            <Calculator className="w-3 h-3" /> Raw Scores
          </TabsTrigger>
          <TabsTrigger value="derived" className="text-xs gap-1">
            <BarChart3 className="w-3 h-3" /> Derived Scores
          </TabsTrigger>
          <TabsTrigger value="report" className="text-xs gap-1">
            <FileText className="w-3 h-3" /> Report
          </TabsTrigger>
          <TabsTrigger value="goals" className="text-xs gap-1">
            <Target className="w-3 h-3" /> Goal Mapping
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs gap-1">
            <History className="w-3 h-3" /> History
          </TabsTrigger>
        </TabsList>

        {/* Item Entry Tab */}
        <TabsContent value="items" className="space-y-3">
          <div className="flex gap-1 overflow-x-auto pb-1">
            {scorableDomains.map((d, idx) => {
              const domainItems = items.filter(i => i.domain_id === d.id);
              const domainScored = domainItems.filter(i => scores[i.id]?.entered_score != null).length;
              return (
                <Button
                  key={d.id}
                  variant={idx === activeDomainIdx ? 'default' : 'outline'}
                  size="sm"
                  className="text-xs whitespace-nowrap"
                  onClick={() => setActiveDomainIdx(idx)}
                >
                  {d.domain_name}
                  <Badge variant="secondary" className="ml-1 text-[10px]">
                    {domainScored}/{domainItems.length}
                  </Badge>
                </Button>
              );
            })}
          </div>

          {activeDomain && activeDomain.subdomains.map(sub => {
            const subItems = items
              .filter(i => i.subdomain_id === sub.id)
              .sort((a, b) => a.display_order - b.display_order);

            if (subItems.length === 0) return null;

            return (
              <Card key={sub.id}>
                <CardHeader className="py-2 px-4">
                  <CardTitle className="text-sm">{sub.subdomain_name}</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                  <div className="space-y-1">
                    {subItems.map(item => {
                      const currentScore = scores[item.id]?.entered_score;
                      return (
                        <div key={item.id} className="flex items-center gap-2 py-1 border-b border-border/50 last:border-0">
                          <span className="text-xs text-muted-foreground w-16 shrink-0 font-mono">
                            {item.item_code}
                          </span>
                          <span className="text-xs flex-1 truncate">{item.display_label}</span>
                          <div className="flex gap-1">
                            {[0, 1, 2].map(val => (
                              <Button
                                key={val}
                                variant={currentScore === val ? 'default' : 'outline'}
                                size="sm"
                                className="w-8 h-7 text-xs p-0"
                                disabled={isLocked}
                                onClick={() => handleScoreChange(item, activeDomain, sub, currentScore === val ? null : val)}
                              >
                                {val}
                              </Button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* Raw Scores Tab */}
        <TabsContent value="raw" className="space-y-3">
          {rawScores.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Calculator className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  Click "Calculate" to compute raw scores from entered items.
                </p>
              </CardContent>
            </Card>
          ) : (
            scorableDomains.map(domain => {
              const domainRaws = rawScores.filter(r => r.domain_key === domain.domain_key);
              if (domainRaws.length === 0) return null;
              return (
                <Card key={domain.id}>
                  <CardHeader className="py-2 px-4">
                    <CardTitle className="text-sm">{domain.domain_name}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-3">
                    <div className="space-y-2">
                      {domainRaws.map(raw => {
                        const sub = domain.subdomains.find(s => s.subdomain_key === raw.subdomain_key);
                        return (
                          <div key={raw.subdomain_key} className="flex items-center justify-between py-1 border-b border-border/50 last:border-0">
                            <span className="text-sm">{sub?.subdomain_name || raw.subdomain_key}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-muted-foreground">
                                {raw.items_scored} scored, {raw.items_missing} missing
                              </span>
                              <Badge variant={raw.completion_status === 'complete' ? 'default' : 'secondary'}>
                                {raw.raw_score ?? '—'}
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* Derived Scores Tab */}
        <TabsContent value="derived" className="space-y-3">
          {derivedStatus === 'lookup_missing' && (
            <Card className="border-destructive/30 bg-accent/50">
              <CardContent className="py-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Norm tables not yet populated</p>
                  <p className="text-xs text-muted-foreground">
                    Derived scores require norm lookup data. An administrator can import norm tables to enable v-scale, standard scores, and percentile calculations.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {derivedScores.length > 0 ? (
            <div className="space-y-3">
              {/* Composite (ABC) */}
              {compositeScore && (
                <Card className="border-primary/30">
                  <CardHeader className="py-2 px-4">
                    <CardTitle className="text-sm">Adaptive Behavior Composite</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold">{compositeScore.standard_score ?? '—'}</span>
                        <div className="text-xs text-muted-foreground">
                          <div>Standard Score</div>
                          <div>Mean=100, SD=15</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        {compositeScore.percentile != null && (
                          <Badge variant="secondary">{compositeScore.percentile}%ile</Badge>
                        )}
                        {compositeScore.adaptive_level && (
                          <Badge variant={adaptiveLevelColor(compositeScore.adaptive_level)}>
                            {compositeScore.adaptive_level}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Domain Scores */}
              {domainScores.length > 0 && (
                <Card>
                  <CardHeader className="py-2 px-4">
                    <CardTitle className="text-sm">Domain Standard Scores</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-3">
                    <div className="space-y-2">
                      {domainScores.map((ds) => {
                        const dom = scorableDomains.find(d => d.domain_key === ds.domain_key);
                        return (
                          <div key={ds.domain_key} className="flex items-center justify-between py-1 border-b border-border/50 last:border-0">
                            <span className="text-sm font-medium">{dom?.domain_name || ds.domain_key}</span>
                            <div className="flex items-center gap-2 text-xs">
                              <Badge variant="outline">v-sum={ds.v_scale_score}</Badge>
                              <Badge>SS={ds.standard_score}</Badge>
                              {ds.percentile != null && <Badge variant="secondary">{ds.percentile}%ile</Badge>}
                              {ds.adaptive_level && (
                                <Badge variant={adaptiveLevelColor(ds.adaptive_level)}>
                                  {ds.adaptive_level}
                                </Badge>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Subdomain v-Scale Scores */}
              {subdomainScores.length > 0 && (
                <Card>
                  <CardHeader className="py-2 px-4">
                    <CardTitle className="text-sm">Subdomain v-Scale Scores</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-3">
                    <div className="space-y-2">
                      {subdomainScores.map((ds) => {
                        const dom = scorableDomains.find(d => d.domain_key === ds.domain_key);
                        const sub = dom?.subdomains.find(s => s.subdomain_key === ds.subdomain_key);
                        return (
                          <div key={`${ds.domain_key}-${ds.subdomain_key}`} className="flex items-center justify-between py-1 border-b border-border/50 last:border-0">
                            <div>
                              <span className="text-sm">{sub?.subdomain_name || ds.subdomain_key}</span>
                              <span className="text-xs text-muted-foreground ml-2">({dom?.domain_name})</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <Badge variant="outline">raw={ds.raw_score}</Badge>
                              <Badge>v={ds.v_scale_score}</Badge>
                              {ds.age_equivalent && <span className="text-muted-foreground">AE: {ds.age_equivalent}</span>}
                              {ds.gsv != null && <span className="text-muted-foreground">GSV: {ds.gsv}</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : derivedStatus !== 'lookup_missing' && (
            <Card>
              <CardContent className="py-8 text-center">
                <BarChart3 className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Calculate scores first to view derived results.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Report Tab */}
        <TabsContent value="report" className="space-y-3">
          <Vineland3Report
            assessment={assessment}
            studentName={studentName}
            studentDob={studentDob}
            domains={domains}
            derivedScores={derivedScores}
          />
        </TabsContent>

        {/* Goal Mapping Tab */}
        <TabsContent value="goals" className="space-y-3">
          <Vineland3GoalMapping
            assessmentId={assessment.id}
            domains={domains}
            derivedScores={derivedScores}
          />
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-3">
          <Card>
            <CardContent className="py-8 text-center">
              <History className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm font-medium mb-1">Longitudinal History</p>
              <p className="text-xs text-muted-foreground">
                Prior Vineland-3 administrations and trend data will appear here once multiple assessments exist.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
