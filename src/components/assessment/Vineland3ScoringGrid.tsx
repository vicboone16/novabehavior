import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowLeft, Save, CheckCircle2, Calculator, BarChart3,
  FileText, Target, History, AlertCircle, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  useVineland3,
  type Vineland3Assessment,
  type Vineland3Domain,
  type Vineland3Item,
  type Vineland3ItemScore,
  type Vineland3RawScore,
  type Vineland3DerivedScore,
} from '@/hooks/useVineland3';
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
    calculateDerivedScores, updateAssessmentStatus,
  } = useVineland3(studentId, studentDob);

  const [activeTab, setActiveTab] = useState('items');
  const [activeDomainIdx, setActiveDomainIdx] = useState(0);
  const [scores, setScores] = useState<Record<string, Vineland3ItemScore>>({});
  const [rawScores, setRawScores] = useState<Vineland3RawScore[]>([]);
  const [derivedScores, setDerivedScores] = useState<Vineland3DerivedScore[]>([]);
  const [derivedStatus, setDerivedStatus] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [calculating, setCalculating] = useState(false);

  const isLocked = assessment.status === 'locked';
  const activeDomain = domains.filter(d => d.domain_key !== 'maladaptive_behavior')[activeDomainIdx] || domains[0];
  const scorableDomains = useMemo(() => domains.filter(d => d.domain_key !== 'maladaptive_behavior'), [domains]);

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
    // Optimistic update
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

  // Count scored items
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
          {/* Domain selector */}
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

          {/* Items by subdomain */}
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
            <Card className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
              <CardContent className="py-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
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
            <Card>
              <CardContent className="py-3">
                <div className="space-y-2">
                  {derivedScores.map((ds, idx) => (
                    <div key={idx} className="flex items-center justify-between py-1 border-b border-border/50 last:border-0">
                      <div>
                        <span className="text-sm font-medium">{ds.subdomain_key || ds.domain_key || ds.composite_key}</span>
                        <span className="text-xs text-muted-foreground ml-2">({ds.score_level})</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        {ds.v_scale_score != null && <Badge variant="outline">v={ds.v_scale_score}</Badge>}
                        {ds.standard_score != null && <Badge>SS={ds.standard_score}</Badge>}
                        {ds.percentile != null && <Badge variant="secondary">{ds.percentile}%ile</Badge>}
                        {ds.adaptive_level && <span className="text-muted-foreground">{ds.adaptive_level}</span>}
                        {ds.age_equivalent && <span className="text-muted-foreground">AE: {ds.age_equivalent}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
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
          <Card>
            <CardContent className="py-8 text-center">
              <FileText className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm font-medium mb-1">Report Generation</p>
              <p className="text-xs text-muted-foreground mb-4">
                Complete scoring and calculate derived scores to generate a clinical report.
              </p>
              <Button variant="outline" disabled={rawScores.length === 0}>
                Generate Report
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Goal Mapping Tab */}
        <TabsContent value="goals" className="space-y-3">
          <Card>
            <CardContent className="py-8 text-center">
              <Target className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm font-medium mb-1">Goal Recommendations</p>
              <p className="text-xs text-muted-foreground">
                Score patterns will generate curriculum and programming recommendations based on adaptive behavior profiles.
              </p>
            </CardContent>
          </Card>
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
