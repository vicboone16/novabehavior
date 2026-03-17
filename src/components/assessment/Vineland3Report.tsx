import { useState, useCallback } from 'react';
import {
  FileText, Loader2, Download, Edit3, Lock, CheckCircle2,
  ChevronDown, ChevronUp, Printer
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import type {
  Vineland3Assessment,
  Vineland3Domain,
  Vineland3DerivedScore,
} from '@/hooks/useVineland3';

interface Vineland3ReportProps {
  assessment: Vineland3Assessment;
  studentName: string;
  studentDob?: string;
  domains: Vineland3Domain[];
  derivedScores: Vineland3DerivedScore[];
  onLock?: () => void;
}

interface ReportNarratives {
  overall_summary: string;
  communication_narrative: string;
  daily_living_skills_narrative: string;
  socialization_narrative: string;
  motor_skills_narrative: string | null;
  strengths_weaknesses: string;
  recommendations: string[];
}

interface ReportData {
  narratives: ReportNarratives;
  generated_at: string;
  is_locked: boolean;
}

const DOMAIN_ORDER = ['communication', 'daily_living_skills', 'socialization', 'motor_skills'];
const DOMAIN_LABELS: Record<string, string> = {
  communication: 'Communication',
  daily_living_skills: 'Daily Living Skills',
  socialization: 'Socialization',
  motor_skills: 'Motor Skills',
};

export function Vineland3Report({
  assessment, studentName, studentDob, domains, derivedScores, onLock,
}: Vineland3ReportProps) {
  const [report, setReport] = useState<ReportData | null>(null);
  const [generating, setGenerating] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    examinee: true, summary: true, scores: true, subdomains: true,
    pairwise: true, narratives: true, recommendations: true,
  });

  const compositeScore = derivedScores.find(d => d.score_level === 'composite');
  const domainScores = derivedScores.filter(d => d.score_level === 'domain');
  const subdomainScores = derivedScores.filter(d => d.score_level === 'subdomain');

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const SectionHeader = ({ id, title }: { id: string; title: string }) => (
    <button
      onClick={() => toggleSection(id)}
      className="flex items-center justify-between w-full py-2 text-left"
    >
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {expandedSections[id] ? (
        <ChevronUp className="w-4 h-4 text-muted-foreground" />
      ) : (
        <ChevronDown className="w-4 h-4 text-muted-foreground" />
      )}
    </button>
  );

  const generateReport = useCallback(async () => {
    if (!compositeScore && domainScores.length === 0) {
      toast.error('Calculate derived scores first');
      return;
    }

    setGenerating(true);
    try {
      const payload = {
        student_name: studentName,
        gender: '',
        birth_date: studentDob || '',
        age_display: assessment.chronological_age_display || '',
        test_date: assessment.administration_date,
        respondent_name: assessment.respondent_name || undefined,
        respondent_relationship: assessment.respondent_relationship || undefined,
        examiner_name: assessment.assessor_name || undefined,
        form_name: assessment.form_key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        abc_standard_score: compositeScore?.standard_score ?? null,
        abc_percentile: compositeScore?.percentile ?? null,
        abc_adaptive_level: compositeScore?.adaptive_level ?? null,
        domain_scores: domainScores.map(ds => {
          const dom = domains.find(d => d.domain_key === ds.domain_key);
          return {
            domain_key: ds.domain_key,
            domain_name: dom?.domain_name || ds.domain_key,
            standard_score: ds.standard_score,
            percentile: ds.percentile,
            adaptive_level: ds.adaptive_level,
            v_scale_sum: ds.v_scale_score,
          };
        }),
        subdomain_scores: subdomainScores.map(ss => {
          const dom = domains.find(d => d.domain_key === ss.domain_key);
          const sub = dom?.subdomains.find(s => s.subdomain_key === ss.subdomain_key);
          return {
            domain_key: ss.domain_key,
            domain_name: dom?.domain_name || ss.domain_key,
            subdomain_key: ss.subdomain_key,
            subdomain_name: sub?.subdomain_name || ss.subdomain_key,
            raw_score: ss.raw_score,
            v_scale_score: ss.v_scale_score,
            age_equivalent: ss.age_equivalent,
            gsv: ss.gsv,
          };
        }),
      };

      const { data, error } = await supabase.functions.invoke('generate-vineland-report', {
        body: payload,
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Generation failed');

      setReport({
        narratives: data.narratives,
        generated_at: new Date().toISOString(),
        is_locked: false,
      });
      toast.success('Report generated');
    } catch (err) {
      console.error('Report generation error:', err);
      toast.error('Failed to generate report');
    } finally {
      setGenerating(false);
    }
  }, [assessment, studentName, studentDob, compositeScore, domainScores, subdomainScores, domains]);

  const updateNarrative = (key: keyof ReportNarratives, value: string) => {
    if (!report) return;
    setReport(prev => prev ? {
      ...prev,
      narratives: { ...prev.narratives, [key]: value },
    } : null);
  };

  const lockReport = () => {
    if (!report) return;
    setReport(prev => prev ? { ...prev, is_locked: true } : null);
    setEditingSection(null);
    onLock?.();
    toast.success('Report locked as final version');
  };

  const handlePrint = () => window.print();

  // Compute pairwise comparisons
  const domainPairwise = (() => {
    const pairs: Array<{ a: string; b: string; scoreA: number; scoreB: number; diff: number; significant: boolean }> = [];
    const sorted = DOMAIN_ORDER.filter(dk => domainScores.some(d => d.domain_key === dk));
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const scoreA = domainScores.find(d => d.domain_key === sorted[i])?.standard_score;
        const scoreB = domainScores.find(d => d.domain_key === sorted[j])?.standard_score;
        if (scoreA != null && scoreB != null) {
          const diff = scoreA - scoreB;
          pairs.push({
            a: DOMAIN_LABELS[sorted[i]] || sorted[i],
            b: DOMAIN_LABELS[sorted[j]] || sorted[j],
            scoreA, scoreB, diff,
            significant: Math.abs(diff) >= 15, // 1 SD
          });
        }
      }
    }
    return pairs;
  })();

  // Mean v-scale for strength/weakness
  const meanVScale = (() => {
    const vals = subdomainScores.filter(s => s.v_scale_score != null).map(s => s.v_scale_score!);
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 15;
  })();

  const adaptiveLevelColor = (level: string | null) => {
    if (!level) return 'secondary';
    const l = level.toLowerCase();
    if (l.includes('high')) return 'default' as const;
    if (l === 'adequate') return 'default' as const;
    if (l.includes('moderately low')) return 'secondary' as const;
    if (l === 'low') return 'destructive' as const;
    return 'secondary' as const;
  };

  const EditableText = ({ value, sectionKey, onSave }: {
    value: string; sectionKey: string; onSave: (v: string) => void;
  }) => {
    if (report?.is_locked) {
      return <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{value}</p>;
    }
    if (editingSection === sectionKey) {
      return (
        <div className="space-y-2">
          <Textarea
            value={value}
            onChange={e => onSave(e.target.value)}
            className="min-h-[120px] text-sm"
          />
          <Button size="sm" variant="outline" onClick={() => setEditingSection(null)}>
            <CheckCircle2 className="w-3 h-3 mr-1" /> Done
          </Button>
        </div>
      );
    }
    return (
      <div className="group relative">
        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{value}</p>
        <Button
          size="sm" variant="ghost"
          className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => setEditingSection(sectionKey)}
        >
          <Edit3 className="w-3 h-3" />
        </Button>
      </div>
    );
  };

  // No scores yet
  if (derivedScores.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <FileText className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm font-medium mb-1">Report Generation</p>
          <p className="text-xs text-muted-foreground">
            Complete scoring and calculate derived scores to generate a clinical report.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Not yet generated
  if (!report) {
    return (
      <Card>
        <CardContent className="py-8 text-center space-y-4">
          <FileText className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
          <div>
            <p className="text-sm font-medium mb-1">Generate Vineland-3 Report</p>
            <p className="text-xs text-muted-foreground mb-4">
              AI will generate clinical narrative sections based on the scored data. You can edit all text before finalizing.
            </p>
          </div>
          <Button onClick={generateReport} disabled={generating}>
            {generating ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
            ) : (
              <><FileText className="w-4 h-4 mr-2" /> Generate Report</>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 print:space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-2">
          {report.is_locked ? (
            <Badge variant="secondary"><Lock className="w-3 h-3 mr-1" /> Final</Badge>
          ) : (
            <Badge variant="outline">Draft</Badge>
          )}
          <span className="text-xs text-muted-foreground">
            Generated {format(new Date(report.generated_at), 'MMM d, yyyy h:mm a')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!report.is_locked && (
            <Button size="sm" variant="outline" onClick={lockReport}>
              <Lock className="w-3 h-3 mr-1" /> Lock Final
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={handlePrint}>
            <Printer className="w-3 h-3 mr-1" /> Print
          </Button>
          <Button size="sm" variant="outline" onClick={generateReport} disabled={generating || report.is_locked}>
            <FileText className="w-3 h-3 mr-1" /> Regenerate
          </Button>
        </div>
      </div>

      {/* Section 1: Examinee Information */}
      <Card>
        <CardHeader className="py-2 px-4">
          <SectionHeader id="examinee" title="1. Examinee / Test Information" />
        </CardHeader>
        {expandedSections.examinee && (
          <CardContent className="px-4 pb-3">
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Name:</span><span className="font-medium">{studentName}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Birth Date:</span><span>{studentDob ? format(new Date(studentDob), 'MM/dd/yyyy') : '—'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Age:</span><span>{assessment.chronological_age_display || '—'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Test Date:</span><span>{format(new Date(assessment.administration_date), 'MM/dd/yyyy')}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Respondent:</span><span>{assessment.respondent_name || '—'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Relationship:</span><span>{assessment.respondent_relationship || '—'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Examiner:</span><span>{assessment.assessor_name || '—'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Form:</span><span>{assessment.form_key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span></div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Section 2: Overall Summary */}
      <Card>
        <CardHeader className="py-2 px-4">
          <SectionHeader id="summary" title="2. Overall Summary" />
        </CardHeader>
        {expandedSections.summary && (
          <CardContent className="px-4 pb-3">
            <EditableText
              value={report.narratives.overall_summary}
              sectionKey="overall_summary"
              onSave={v => updateNarrative('overall_summary', v)}
            />
          </CardContent>
        )}
      </Card>

      {/* Section 3: Score Summary Profile */}
      <Card>
        <CardHeader className="py-2 px-4">
          <SectionHeader id="scores" title="3. Score Summary Profile" />
        </CardHeader>
        {expandedSections.scores && (
          <CardContent className="px-4 pb-3">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-1 font-medium">Scale</th>
                    <th className="text-center py-1 font-medium">Standard Score</th>
                    <th className="text-center py-1 font-medium">90% CI</th>
                    <th className="text-center py-1 font-medium">Percentile</th>
                    <th className="text-center py-1 font-medium">Adaptive Level</th>
                    <th className="text-center py-1 font-medium">S/W</th>
                  </tr>
                </thead>
                <tbody>
                  {compositeScore && (
                    <tr className="border-b border-border bg-accent/30 font-medium">
                      <td className="py-1.5">Adaptive Behavior Composite</td>
                      <td className="text-center">{compositeScore.standard_score ?? '—'}</td>
                      <td className="text-center">
                        {compositeScore.standard_score != null
                          ? `${compositeScore.standard_score - 5}–${compositeScore.standard_score + 5}`
                          : '—'}
                      </td>
                      <td className="text-center">{compositeScore.percentile ?? '—'}</td>
                      <td className="text-center">
                        {compositeScore.adaptive_level && (
                          <Badge variant={adaptiveLevelColor(compositeScore.adaptive_level)} className="text-[10px]">
                            {compositeScore.adaptive_level}
                          </Badge>
                        )}
                      </td>
                      <td className="text-center">—</td>
                    </tr>
                  )}
                  {DOMAIN_ORDER.map(dk => {
                    const ds = domainScores.find(d => d.domain_key === dk);
                    if (!ds) return null;
                    const meanSS = compositeScore?.standard_score;
                    const diff = ds.standard_score != null && meanSS != null ? ds.standard_score - meanSS : null;
                    const sw = diff != null ? (diff >= 15 ? 'S' : diff <= -15 ? 'W' : '—') : '—';
                    return (
                      <tr key={dk} className="border-b border-border/50">
                        <td className="py-1.5">{DOMAIN_LABELS[dk] || dk}</td>
                        <td className="text-center">{ds.standard_score ?? '—'}</td>
                        <td className="text-center">
                          {ds.standard_score != null
                            ? `${ds.standard_score - 5}–${ds.standard_score + 5}`
                            : '—'}
                        </td>
                        <td className="text-center">{ds.percentile ?? '—'}</td>
                        <td className="text-center">
                          {ds.adaptive_level && (
                            <Badge variant={adaptiveLevelColor(ds.adaptive_level)} className="text-[10px]">
                              {ds.adaptive_level}
                            </Badge>
                          )}
                        </td>
                        <td className="text-center font-medium">
                          {sw === 'S' ? <span className="text-green-600">S</span> : sw === 'W' ? <span className="text-destructive">W</span> : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Section 4: Subdomain Score Summary */}
      <Card>
        <CardHeader className="py-2 px-4">
          <SectionHeader id="subdomains" title="4. Subdomain Score Summary" />
        </CardHeader>
        {expandedSections.subdomains && (
          <CardContent className="px-4 pb-3">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-1 font-medium">Subdomain</th>
                    <th className="text-center py-1 font-medium">Raw</th>
                    <th className="text-center py-1 font-medium">v-Scale</th>
                    <th className="text-center py-1 font-medium">AE</th>
                    <th className="text-center py-1 font-medium">GSV</th>
                    <th className="text-center py-1 font-medium">vS−Mean</th>
                    <th className="text-center py-1 font-medium">S/W</th>
                  </tr>
                </thead>
                <tbody>
                  {DOMAIN_ORDER.map(dk => {
                    const domSubs = subdomainScores.filter(s => s.domain_key === dk);
                    if (domSubs.length === 0) return null;
                    return [
                      <tr key={`hdr-${dk}`} className="bg-accent/30">
                        <td colSpan={7} className="py-1 font-medium">{DOMAIN_LABELS[dk]}</td>
                      </tr>,
                      ...domSubs.map(ss => {
                        const dom = domains.find(d => d.domain_key === ss.domain_key);
                        const sub = dom?.subdomains.find(s => s.subdomain_key === ss.subdomain_key);
                        const diff = ss.v_scale_score != null ? ss.v_scale_score - meanVScale : null;
                        const sw = diff != null ? (diff >= 3 ? 'S' : diff <= -3 ? 'W' : '—') : '—';
                        return (
                          <tr key={`${ss.domain_key}-${ss.subdomain_key}`} className="border-b border-border/50">
                            <td className="py-1 pl-4">{sub?.subdomain_name || ss.subdomain_key}</td>
                            <td className="text-center">{ss.raw_score ?? '—'}</td>
                            <td className="text-center">{ss.v_scale_score ?? '—'}</td>
                            <td className="text-center">{ss.age_equivalent || '—'}</td>
                            <td className="text-center">{ss.gsv ?? '—'}</td>
                            <td className="text-center">{diff != null ? (diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1)) : '—'}</td>
                            <td className="text-center font-medium">
                              {sw === 'S' ? <span className="text-green-600">S</span> : sw === 'W' ? <span className="text-destructive">W</span> : '—'}
                            </td>
                          </tr>
                        );
                      }),
                    ];
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Section 5: Pairwise Comparisons */}
      <Card>
        <CardHeader className="py-2 px-4">
          <SectionHeader id="pairwise" title="5. Pairwise Difference Comparisons" />
        </CardHeader>
        {expandedSections.pairwise && (
          <CardContent className="px-4 pb-3">
            {domainPairwise.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-1 font-medium">Comparison</th>
                      <th className="text-center py-1 font-medium">Score 1</th>
                      <th className="text-center py-1 font-medium">Score 2</th>
                      <th className="text-center py-1 font-medium">Difference</th>
                      <th className="text-center py-1 font-medium">Significant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {domainPairwise.map((p, i) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="py-1">{p.a} vs {p.b}</td>
                        <td className="text-center">{p.scoreA}</td>
                        <td className="text-center">{p.scoreB}</td>
                        <td className="text-center font-medium">{p.diff > 0 ? `+${p.diff}` : p.diff}</td>
                        <td className="text-center">
                          {p.significant ? (
                            <Badge variant="destructive" className="text-[10px]">Yes</Badge>
                          ) : (
                            <span className="text-muted-foreground">No</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Insufficient domain scores for pairwise comparisons.</p>
            )}
          </CardContent>
        )}
      </Card>

      {/* Section 6: Domain Narratives */}
      <Card>
        <CardHeader className="py-2 px-4">
          <SectionHeader id="narratives" title="6. Domain Interpretation" />
        </CardHeader>
        {expandedSections.narratives && (
          <CardContent className="px-4 pb-3 space-y-4">
            {[
              { key: 'communication_narrative' as const, label: 'Communication' },
              { key: 'daily_living_skills_narrative' as const, label: 'Daily Living Skills' },
              { key: 'socialization_narrative' as const, label: 'Socialization' },
              { key: 'motor_skills_narrative' as const, label: 'Motor Skills' },
            ].map(({ key, label }) => {
              const text = report.narratives[key];
              if (!text) return null;
              return (
                <div key={key}>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">{label}</h4>
                  <EditableText value={text} sectionKey={key} onSave={v => updateNarrative(key, v)} />
                  <Separator className="mt-3" />
                </div>
              );
            })}

            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Strengths & Weaknesses</h4>
              <EditableText
                value={report.narratives.strengths_weaknesses}
                sectionKey="strengths_weaknesses"
                onSave={v => updateNarrative('strengths_weaknesses', v)}
              />
            </div>
          </CardContent>
        )}
      </Card>

      {/* Section 7: Recommendations */}
      <Card>
        <CardHeader className="py-2 px-4">
          <SectionHeader id="recommendations" title="7. Recommendations" />
        </CardHeader>
        {expandedSections.recommendations && (
          <CardContent className="px-4 pb-3">
            {report.narratives.recommendations?.length > 0 ? (
              <ol className="list-decimal list-inside space-y-1">
                {report.narratives.recommendations.map((rec, i) => (
                  <li key={i} className="text-sm text-foreground">{rec}</li>
                ))}
              </ol>
            ) : (
              <p className="text-xs text-muted-foreground">No recommendations generated.</p>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
