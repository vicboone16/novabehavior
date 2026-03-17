import { useState, useCallback, useMemo } from 'react';
import {
  FileText, Loader2, Lock, CheckCircle2,
  ChevronDown, ChevronUp, Printer, Edit3, Copy,
  BookOpen, ClipboardList, AlertTriangle, TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  report_type: 'domain_level' | 'comprehensive';
}

interface AutoWriterOutput {
  text: string;
  context: string;
  generated_at: string;
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
  const [reportType, setReportType] = useState<'domain_level' | 'comprehensive'>('comprehensive');
  const [autoWriterOutputs, setAutoWriterOutputs] = useState<AutoWriterOutput[]>([]);
  const [generatingContext, setGeneratingContext] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    examinee: true, summary: true, scores: true, subdomains: true,
    pairwise: true, narratives: true, recommendations: true,
  });

  const compositeScore = useMemo(() => derivedScores.find(d => d.score_level === 'composite'), [derivedScores]);
  const domainScores = useMemo(() => derivedScores.filter(d => d.score_level === 'domain'), [derivedScores]);
  const subdomainScores = useMemo(() => derivedScores.filter(d => d.score_level === 'subdomain'), [derivedScores]);

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const SectionHeader = ({ id, title }: { id: string; title: string }) => (
    <button onClick={() => toggleSection(id)} className="flex items-center justify-between w-full py-2 text-left">
      <h3 className="text-sm font-bold tracking-wide text-foreground uppercase">{title}</h3>
      {expandedSections[id] ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
    </button>
  );

  const buildPayload = (outputContext?: string) => ({
    report_type: reportType,
    output_context: outputContext || 'full_report',
    student_name: studentName,
    gender: '',
    birth_date: studentDob || '',
    age_display: assessment.chronological_age_display || '',
    test_date: assessment.administration_date,
    respondent_name: assessment.respondent_name || undefined,
    respondent_relationship: assessment.respondent_relationship || undefined,
    examiner_name: assessment.assessor_name || undefined,
    form_name: assessment.form_key.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
    abc_standard_score: compositeScore?.standard_score ?? null,
    abc_percentile: compositeScore?.percentile ?? null,
    abc_adaptive_level: compositeScore?.adaptive_level ?? null,
    domain_scores: domainScores.map(ds => {
      const dom = domains.find(d => d.domain_key === ds.domain_key);
      return { domain_key: ds.domain_key, domain_name: dom?.domain_name || ds.domain_key, standard_score: ds.standard_score, percentile: ds.percentile, adaptive_level: ds.adaptive_level, v_scale_sum: ds.v_scale_score };
    }),
    subdomain_scores: subdomainScores.map(ss => {
      const dom = domains.find(d => d.domain_key === ss.domain_key);
      const sub = dom?.subdomains.find(s => s.subdomain_key === ss.subdomain_key);
      return { domain_key: ss.domain_key, domain_name: dom?.domain_name || ss.domain_key, subdomain_key: ss.subdomain_key, subdomain_name: sub?.subdomain_name || ss.subdomain_key, raw_score: ss.raw_score, v_scale_score: ss.v_scale_score, age_equivalent: ss.age_equivalent, gsv: ss.gsv };
    }),
  });

  const generateReport = useCallback(async () => {
    if (!compositeScore && domainScores.length === 0) { toast.error('Calculate derived scores first'); return; }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-vineland-report', { body: buildPayload() });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Generation failed');
      setReport({ narratives: data.narratives, generated_at: new Date().toISOString(), is_locked: false, report_type: reportType });
      toast.success(`${reportType === 'comprehensive' ? 'Comprehensive' : 'Domain-Level'} report generated`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate report');
    } finally { setGenerating(false); }
  }, [assessment, studentName, studentDob, compositeScore, domainScores, subdomainScores, domains, reportType]);

  const generateAutoWriter = useCallback(async (context: string) => {
    setGeneratingContext(context);
    try {
      const { data, error } = await supabase.functions.invoke('generate-vineland-report', { body: buildPayload(context) });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Generation failed');
      const key = Object.keys(data.narratives)[0];
      const text = data.narratives[key] || '';
      setAutoWriterOutputs(prev => [...prev.filter(o => o.context !== context), { text, context, generated_at: new Date().toISOString() }]);
      toast.success('Clinical text generated');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate text');
    } finally { setGeneratingContext(null); }
  }, [assessment, studentName, studentDob, compositeScore, domainScores, subdomainScores, domains, reportType]);

  const updateNarrative = (key: keyof ReportNarratives, value: string) => {
    if (!report) return;
    setReport(prev => prev ? { ...prev, narratives: { ...prev.narratives, [key]: value } } : null);
  };

  const lockReport = () => {
    if (!report) return;
    setReport(prev => prev ? { ...prev, is_locked: true } : null);
    setEditingSection(null);
    onLock?.();
    toast.success('Report locked as final version');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  // Pairwise comparisons
  const domainPairwise = useMemo(() => {
    const pairs: Array<{ a: string; b: string; scoreA: number; scoreB: number; diff: number; significant: boolean }> = [];
    const sorted = DOMAIN_ORDER.filter(dk => domainScores.some(d => d.domain_key === dk));
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const scoreA = domainScores.find(d => d.domain_key === sorted[i])?.standard_score;
        const scoreB = domainScores.find(d => d.domain_key === sorted[j])?.standard_score;
        if (scoreA != null && scoreB != null) {
          const diff = scoreA - scoreB;
          pairs.push({ a: DOMAIN_LABELS[sorted[i]], b: DOMAIN_LABELS[sorted[j]], scoreA, scoreB, diff, significant: Math.abs(diff) >= 15 });
        }
      }
    }
    return pairs;
  }, [domainScores]);

  const meanVScale = useMemo(() => {
    const vals = subdomainScores.filter(s => s.v_scale_score != null).map(s => s.v_scale_score!);
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 15;
  }, [subdomainScores]);

  const adaptiveLevelColor = (level: string | null) => {
    if (!level) return 'secondary' as const;
    const l = level.toLowerCase();
    if (l.includes('high') || l === 'adequate') return 'default' as const;
    if (l.includes('moderately low')) return 'secondary' as const;
    if (l === 'low') return 'destructive' as const;
    return 'secondary' as const;
  };

  const EditableText = ({ value, sectionKey, onSave }: { value: string; sectionKey: string; onSave: (v: string) => void }) => {
    if (report?.is_locked) return <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{value}</p>;
    if (editingSection === sectionKey) {
      return (
        <div className="space-y-2">
          <Textarea value={value} onChange={e => onSave(e.target.value)} className="min-h-[120px] text-sm" />
          <Button size="sm" variant="outline" onClick={() => setEditingSection(null)}>
            <CheckCircle2 className="w-3 h-3 mr-1" /> Done
          </Button>
        </div>
      );
    }
    return (
      <div className="group relative">
        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{value}</p>
        <Button size="sm" variant="ghost" className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setEditingSection(sectionKey)}>
          <Edit3 className="w-3 h-3" />
        </Button>
      </div>
    );
  };

  // No scores
  if (derivedScores.length === 0) {
    return (
      <Card><CardContent className="py-8 text-center">
        <FileText className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
        <p className="text-sm font-medium mb-1">Report Generation</p>
        <p className="text-xs text-muted-foreground">Complete scoring and calculate derived scores to generate a clinical report.</p>
      </CardContent></Card>
    );
  }

  // Not yet generated
  if (!report) {
    return (
      <div className="space-y-4">
        {/* Report Type Selector */}
        <Card>
          <CardContent className="py-6 space-y-4">
            <div className="text-center">
              <FileText className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm font-medium mb-1">Generate Vineland-3 Report</p>
              <p className="text-xs text-muted-foreground mb-4">Select report type, then generate. AI will produce clinical narrative sections that you can edit before finalizing.</p>
            </div>
            <div className="flex gap-2 justify-center">
              <Button variant={reportType === 'domain_level' ? 'default' : 'outline'} size="sm" onClick={() => setReportType('domain_level')}>
                Domain-Level Report
              </Button>
              <Button variant={reportType === 'comprehensive' ? 'default' : 'outline'} size="sm" onClick={() => setReportType('comprehensive')}>
                Comprehensive Report
              </Button>
            </div>
            <div className="text-center">
              <Button onClick={generateReport} disabled={generating}>
                {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</> : <><FileText className="w-4 h-4 mr-2" /> Generate {reportType === 'comprehensive' ? 'Comprehensive' : 'Domain-Level'} Report</>}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Clinical Auto-Writer Quick Actions */}
        <Card>
          <CardHeader className="py-2 px-4">
            <CardTitle className="text-sm">Clinical Auto-Writer</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-xs text-muted-foreground mb-3">Generate standalone clinical text from Vineland results:</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { ctx: 'adaptive_summary', label: 'Adaptive Summary', icon: BookOpen },
                { ctx: 'iep_present_levels', label: 'IEP Present Levels', icon: ClipboardList },
                { ctx: 'fba_summary', label: 'FBA Summary', icon: AlertTriangle },
                { ctx: 'reassessment', label: 'Reassessment Narrative', icon: TrendingUp },
              ].map(({ ctx, label, icon: Icon }) => (
                <Button key={ctx} variant="outline" size="sm" className="text-xs justify-start" disabled={generatingContext === ctx}
                  onClick={() => generateAutoWriter(ctx)}>
                  {generatingContext === ctx ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Icon className="w-3 h-3 mr-1" />}
                  {label}
                </Button>
              ))}
            </div>
            {autoWriterOutputs.map(output => (
              <div key={output.context} className="mt-3 p-3 border border-border rounded-md">
                <div className="flex items-center justify-between mb-1">
                  <Badge variant="outline" className="text-[10px]">{output.context.replace(/_/g, ' ').toUpperCase()}</Badge>
                  <Button size="sm" variant="ghost" onClick={() => copyToClipboard(output.text)}>
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
                <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{output.text}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Report generated
  const isComprehensive = report.report_type === 'comprehensive';

  return (
    <div className="space-y-4 print:space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-2">
          {report.is_locked ? <Badge variant="secondary"><Lock className="w-3 h-3 mr-1" /> Final</Badge> : <Badge variant="outline">Draft</Badge>}
          <Badge variant="outline" className="text-[10px]">{isComprehensive ? 'Comprehensive' : 'Domain-Level'}</Badge>
          <span className="text-xs text-muted-foreground">{format(new Date(report.generated_at), 'MMM d, yyyy h:mm a')}</span>
        </div>
        <div className="flex items-center gap-2">
          {!report.is_locked && <Button size="sm" variant="outline" onClick={lockReport}><Lock className="w-3 h-3 mr-1" /> Lock Final</Button>}
          <Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="w-3 h-3 mr-1" /> Print</Button>
          <Button size="sm" variant="outline" onClick={generateReport} disabled={generating || report.is_locked}><FileText className="w-3 h-3 mr-1" /> Regenerate</Button>
        </div>
      </div>

      {/* EXAMINEE INFORMATION */}
      <Card>
        <CardHeader className="py-2 px-4"><SectionHeader id="examinee" title="EXAMINEE INFORMATION" /></CardHeader>
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
              <div className="flex justify-between"><span className="text-muted-foreground">Form:</span><span>{assessment.form_key.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}</span></div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* OVERVIEW */}
      <Card>
        <CardHeader className="py-2 px-4"><SectionHeader id="summary" title="OVERVIEW" /></CardHeader>
        {expandedSections.summary && (
          <CardContent className="px-4 pb-3">
            <EditableText value={report.narratives.overall_summary} sectionKey="overall_summary" onSave={v => updateNarrative('overall_summary', v)} />
          </CardContent>
        )}
      </Card>

      {/* ADAPTIVE BEHAVIOR COMPOSITE */}
      <Card>
        <CardHeader className="py-2 px-4"><SectionHeader id="scores" title="ADAPTIVE BEHAVIOR COMPOSITE" /></CardHeader>
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
                    {isComprehensive && <th className="text-center py-1 font-medium">S/W</th>}
                  </tr>
                </thead>
                <tbody>
                  {compositeScore && (
                    <tr className="border-b border-border bg-accent/30 font-medium">
                      <td className="py-1.5">Adaptive Behavior Composite</td>
                      <td className="text-center">{compositeScore.standard_score ?? '—'}</td>
                      <td className="text-center">{compositeScore.standard_score != null ? `${compositeScore.standard_score - 5}–${compositeScore.standard_score + 5}` : '—'}</td>
                      <td className="text-center">{compositeScore.percentile ?? '—'}</td>
                      <td className="text-center">{compositeScore.adaptive_level && <Badge variant={adaptiveLevelColor(compositeScore.adaptive_level)} className="text-[10px]">{compositeScore.adaptive_level}</Badge>}</td>
                      {isComprehensive && <td className="text-center">—</td>}
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
                        <td className="py-1.5">{DOMAIN_LABELS[dk]}</td>
                        <td className="text-center">{ds.standard_score ?? '—'}</td>
                        <td className="text-center">{ds.standard_score != null ? `${ds.standard_score - 5}–${ds.standard_score + 5}` : '—'}</td>
                        <td className="text-center">{ds.percentile ?? '—'}</td>
                        <td className="text-center">{ds.adaptive_level && <Badge variant={adaptiveLevelColor(ds.adaptive_level)} className="text-[10px]">{ds.adaptive_level}</Badge>}</td>
                        {isComprehensive && <td className="text-center font-medium">{sw === 'S' ? <span className="text-primary">S</span> : sw === 'W' ? <span className="text-destructive">W</span> : '—'}</td>}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        )}
      </Card>

      {/* SUBDOMAIN SCORE SUMMARY — Comprehensive only */}
      {isComprehensive && (
        <Card>
          <CardHeader className="py-2 px-4"><SectionHeader id="subdomains" title="SUBDOMAIN SCORE SUMMARY" /></CardHeader>
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
                        <tr key={`hdr-${dk}`} className="bg-accent/30"><td colSpan={7} className="py-1 font-bold uppercase tracking-wide text-[11px]">{DOMAIN_LABELS[dk]}</td></tr>,
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
                              <td className="text-center font-medium">{sw === 'S' ? <span className="text-primary">S</span> : sw === 'W' ? <span className="text-destructive">W</span> : '—'}</td>
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
      )}

      {/* PAIRWISE DIFFERENCE COMPARISONS — Comprehensive only */}
      {isComprehensive && (
        <Card>
          <CardHeader className="py-2 px-4"><SectionHeader id="pairwise" title="PAIRWISE DIFFERENCE COMPARISONS" /></CardHeader>
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
                          <td className="text-center">{p.significant ? <Badge variant="destructive" className="text-[10px]">Yes</Badge> : <span className="text-muted-foreground">No</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <p className="text-xs text-muted-foreground">Insufficient domain scores for pairwise comparisons.</p>}
            </CardContent>
          )}
        </Card>
      )}

      {/* DOMAIN INTERPRETATION */}
      <Card>
        <CardHeader className="py-2 px-4"><SectionHeader id="narratives" title={isComprehensive ? "INTERPRETATION" : "DOMAIN INTERPRETATION"} /></CardHeader>
        {expandedSections.narratives && (
          <CardContent className="px-4 pb-3 space-y-4">
            {[
              { key: 'communication_narrative' as const, label: 'COMMUNICATION' },
              { key: 'daily_living_skills_narrative' as const, label: 'DAILY LIVING SKILLS' },
              { key: 'socialization_narrative' as const, label: 'SOCIALIZATION' },
              { key: 'motor_skills_narrative' as const, label: 'MOTOR SKILLS' },
            ].map(({ key, label }) => {
              const text = report.narratives[key];
              if (!text) return null;
              return (
                <div key={key}>
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">{label}</h4>
                  <EditableText value={text} sectionKey={key} onSave={v => updateNarrative(key, v)} />
                  <Separator className="mt-3" />
                </div>
              );
            })}
            {isComprehensive && (
              <div>
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">STRENGTHS & WEAKNESSES</h4>
                <EditableText value={report.narratives.strengths_weaknesses} sectionKey="strengths_weaknesses" onSave={v => updateNarrative('strengths_weaknesses', v)} />
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* RECOMMENDATIONS */}
      <Card>
        <CardHeader className="py-2 px-4"><SectionHeader id="recommendations" title="RECOMMENDATIONS" /></CardHeader>
        {expandedSections.recommendations && (
          <CardContent className="px-4 pb-3">
            {report.narratives.recommendations?.length > 0 ? (
              <ol className="list-decimal list-inside space-y-1">
                {report.narratives.recommendations.map((rec, i) => <li key={i} className="text-sm text-foreground">{rec}</li>)}
              </ol>
            ) : <p className="text-xs text-muted-foreground">No recommendations generated.</p>}
          </CardContent>
        )}
      </Card>

      {/* Clinical Auto-Writer */}
      <Card className="print:hidden">
        <CardHeader className="py-2 px-4"><CardTitle className="text-sm">Clinical Auto-Writer</CardTitle></CardHeader>
        <CardContent className="px-4 pb-3">
          <p className="text-xs text-muted-foreground mb-3">Generate standalone clinical outputs from this assessment:</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { ctx: 'adaptive_summary', label: 'Adaptive Summary', icon: BookOpen },
              { ctx: 'iep_present_levels', label: 'IEP Present Levels', icon: ClipboardList },
              { ctx: 'fba_summary', label: 'FBA Summary', icon: AlertTriangle },
              { ctx: 'reassessment', label: 'Reassessment', icon: TrendingUp },
            ].map(({ ctx, label, icon: Icon }) => (
              <Button key={ctx} variant="outline" size="sm" className="text-xs justify-start" disabled={generatingContext === ctx} onClick={() => generateAutoWriter(ctx)}>
                {generatingContext === ctx ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Icon className="w-3 h-3 mr-1" />}
                {label}
              </Button>
            ))}
          </div>
          {autoWriterOutputs.map(output => (
            <div key={output.context} className="mt-3 p-3 border border-border rounded-md">
              <div className="flex items-center justify-between mb-1">
                <Badge variant="outline" className="text-[10px]">{output.context.replace(/_/g, ' ').toUpperCase()}</Badge>
                <Button size="sm" variant="ghost" onClick={() => copyToClipboard(output.text)}><Copy className="w-3 h-3" /></Button>
              </div>
              <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{output.text}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
