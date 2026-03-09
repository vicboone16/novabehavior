import { useState } from 'react';
import { FileText, Download, Loader2, Calendar, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useBCBAExport } from '@/hooks/useBCBAExport';
import { useSkillMasteryIntelligence } from '@/hooks/useSkillMasteryIntelligence';
import { useReplacementBehaviorIntelligence, getReplacementStatusColor } from '@/hooks/useReplacementBehaviorIntelligence';
import { useBehaviorEventIntelligence, formatTimeBlock, formatTrigger, formatFunction } from '@/hooks/useBehaviorEventIntelligence';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, subMonths } from 'date-fns';

type ExportType = 'session' | 'skill_mastery' | 'replacement' | 'clinical_review' | 'fba_support';

interface Props {
  agencyId: string | null;
}

export function BCBAExportCenter({ agencyId }: Props) {
  const [selectedStudent, setSelectedStudent] = useState('');
  const [exportType, setExportType] = useState<ExportType>('session');
  const [dateFrom, setDateFrom] = useState(() => format(subMonths(new Date(), 1), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [students, setStudents] = useState<Array<{ id: string; name: string }>>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);

  const { result: sessionExport, loading: sessionLoading, fetchExport } = useBCBAExport();
  const { targets: masteryTargets, loading: masteryLoading } = useSkillMasteryIntelligence(selectedStudent || null);
  const { summaries: replSummaries, loading: replLoading } = useReplacementBehaviorIntelligence(selectedStudent || null);
  const { intel: behaviorIntel, contextAlerts, topAntecedents, topConsequences, loading: bxLoading } = useBehaviorEventIntelligence(selectedStudent || null);

  // Load students on mount
  useState(() => {
    const load = async () => {
      if (!agencyId) return;
      setStudentsLoading(true);
      let query = supabase.from('students').select('id, first_name, last_name');
      if (agencyId !== 'all') {
        query = query.eq('agency_id', agencyId);
      }
      const { data } = await query.limit(200);
      if (data) {
        setStudents(data.map((s: any) => ({
          id: s.id,
          name: `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Unknown',
        })));
      }
      setStudentsLoading(false);
    };
    load();
  });

  const handleGenerate = async () => {
    if (!selectedStudent) {
      toast.error('Select a student first');
      return;
    }
    if (exportType === 'session') {
      await fetchExport(selectedStudent, dateFrom, dateTo);
    }
  };

  const handleCopyToClipboard = () => {
    let text = '';
    if (exportType === 'session' && sessionExport) {
      const header = 'Date\tBehavior\tType\tValue\tNotes';
      const rows = sessionExport.events.map(e => 
        `${e.session_date}\t${e.behavior || ''}\t${e.measurement_type || ''}\t${e.value_numeric ?? e.value_text ?? ''}\t${e.notes || ''}`
      );
      text = [header, ...rows].join('\n');
    } else if (exportType === 'skill_mastery') {
      const header = 'Target\tStatus\tAccuracy\tIndependent\tSessions at Criterion';
      const rows = masteryTargets.map(t =>
        `${t.target_title}\t${t.mastery_status || ''}\t${Math.round(t.current_accuracy ?? 0)}%\t${Math.round(t.current_prompt_independence ?? 0)}%\t${t.consecutive_sessions_at_criterion ?? 0}`
      );
      text = [header, ...rows].join('\n');
    } else if (exportType === 'replacement') {
      const header = 'Behavior\tStatus\tProblem Freq\tReplacement Freq\tRatio\tScore';
      const rows = replSummaries.map(s =>
        `${s.problem_behavior_name || ''}\t${s.replacement_status}\t${s.problem_behavior_count}\t${s.replacement_behavior_count}\t${s.replacement_to_problem_ratio ?? 'N/A'}\t${s.replacement_strength_score ?? 0}`
      );
      text = [header, ...rows].join('\n');
    } else if (exportType === 'fba_support' && behaviorIntel) {
      const lines: string[] = [
        '=== FBA Support Export ===',
        `Total ABC Events (90 days): ${behaviorIntel.total_abc_events}`,
        '',
        '--- Antecedent Patterns ---',
        ...topAntecedents.map(a => `  ${a.label}: ${a.count} events`),
        '',
        '--- Consequence Patterns ---',
        ...topConsequences.map(c => `  ${c.label}: ${c.count} events`),
        '',
        '--- Trigger Contexts ---',
        `  Transitions: ${behaviorIntel.transition_events}${behaviorIntel.transition_risk_flag ? ' ⚠️ HIGH RISK' : ''}`,
        `  Unstructured: ${behaviorIntel.unstructured_events}${behaviorIntel.unstructured_risk_flag ? ' ⚠️ HIGH RISK' : ''}`,
        `  Lunch/Recess: ${behaviorIntel.lunch_recess_events}${behaviorIntel.lunch_recess_risk_flag ? ' ⚠️ HIGH RISK' : ''}`,
        `  Demands: ${behaviorIntel.demand_events}`,
        `  Denial: ${behaviorIntel.denial_events}`,
        `  Low Attention: ${behaviorIntel.low_attention_events}`,
        '',
        '--- Time of Day Risk ---',
        `  Peak: ${behaviorIntel.peak_risk_time_block ? formatTimeBlock(behaviorIntel.peak_risk_time_block) : 'N/A'} (${behaviorIntel.peak_risk_time_block_count ?? 0} events)`,
        '',
        '--- Function Hypothesis ---',
        `  Escape: ${behaviorIntel.escape_function_count}${behaviorIntel.escape_pattern_flag ? ' ⚠️ PRIMARY' : ''}`,
        `  Attention: ${behaviorIntel.attention_function_count}${behaviorIntel.attention_pattern_flag ? ' ⚠️ PRIMARY' : ''}`,
        `  Tangible: ${behaviorIntel.tangible_function_count}`,
        `  Automatic: ${behaviorIntel.automatic_function_count}`,
        `  Primary: ${behaviorIntel.primary_function_hypothesis ? formatFunction(behaviorIntel.primary_function_hypothesis) : 'Undetermined'}`,
        '',
        '--- Context Alerts ---',
        ...contextAlerts.map(a => `  [${a.severity.toUpperCase()}] ${a.label}: ${a.detail}`),
      ];
      text = lines.join('\n');
    }
    if (text) {
      navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    }
  };

  const loading = sessionLoading || masteryLoading || replLoading || bxLoading;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4" />
            BCBA Export Center
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">Student</Label>
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger>
                  <User className="w-3 h-3 mr-1" />
                  <SelectValue placeholder="Select student" />
                </SelectTrigger>
                <SelectContent>
                  {students.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Export Type</Label>
              <Select value={exportType} onValueChange={v => setExportType(v as ExportType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="session">Session Data</SelectItem>
                  <SelectItem value="skill_mastery">Skill Mastery Summary</SelectItem>
                  <SelectItem value="replacement">Replacement Behavior</SelectItem>
                  <SelectItem value="fba_support">FBA Support Export</SelectItem>
                  <SelectItem value="clinical_review">Clinical Review</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {exportType === 'session' && (
              <>
                <div>
                  <Label className="text-xs">From</Label>
                  <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">To</Label>
                  <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                </div>
              </>
            )}
          </div>
          <div className="flex gap-2 mt-3">
            <Button onClick={handleGenerate} disabled={!selectedStudent || loading} size="sm">
              {loading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <FileText className="w-3 h-3 mr-1" />}
              Generate Preview
            </Button>
            <Button onClick={handleCopyToClipboard} variant="outline" size="sm" disabled={loading}>
              <Download className="w-3 h-3 mr-1" />
              Copy to Clipboard
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* FBA Support Preview */}
      {exportType === 'fba_support' && selectedStudent && !bxLoading && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">FBA Support Preview</CardTitle>
          </CardHeader>
          <CardContent>
            {!behaviorIntel || behaviorIntel.total_abc_events === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No ABC data available for FBA support.</p>
            ) : (
              <div className="space-y-3">
                {/* Antecedent patterns */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Top Antecedent Patterns</p>
                  {topAntecedents.map((a, i) => (
                    <div key={i} className="flex justify-between text-xs py-0.5">
                      <span className="text-foreground">{a.label}</span>
                      <Badge variant="outline" className="text-[10px]">{a.count}</Badge>
                    </div>
                  ))}
                </div>
                {/* Consequence patterns */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Top Consequence Patterns</p>
                  {topConsequences.map((c, i) => (
                    <div key={i} className="flex justify-between text-xs py-0.5">
                      <span className="text-foreground">{c.label}</span>
                      <Badge variant="outline" className="text-[10px]">{c.count}</Badge>
                    </div>
                  ))}
                </div>
                {/* Function hypothesis */}
                {behaviorIntel.primary_function_hypothesis && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Primary Function Hypothesis</p>
                    <Badge className="bg-primary text-primary-foreground text-xs">
                      {formatFunction(behaviorIntel.primary_function_hypothesis)}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground ml-2">({behaviorIntel.primary_function_count} events)</span>
                  </div>
                )}
                {/* Risk contexts */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">High-Risk Contexts</p>
                  <div className="grid grid-cols-3 gap-2">
                    {behaviorIntel.transition_risk_flag && (
                      <Badge variant="destructive" className="text-[10px] justify-center">Transitions ({behaviorIntel.transition_events})</Badge>
                    )}
                    {behaviorIntel.unstructured_risk_flag && (
                      <Badge variant="destructive" className="text-[10px] justify-center">Unstructured ({behaviorIntel.unstructured_events})</Badge>
                    )}
                    {behaviorIntel.lunch_recess_risk_flag && (
                      <Badge variant="destructive" className="text-[10px] justify-center">Lunch/Recess ({behaviorIntel.lunch_recess_events})</Badge>
                    )}
                    {behaviorIntel.escape_pattern_flag && (
                      <Badge variant="destructive" className="text-[10px] justify-center">Escape ({behaviorIntel.escape_function_count})</Badge>
                    )}
                    {behaviorIntel.attention_pattern_flag && (
                      <Badge variant="destructive" className="text-[10px] justify-center">Attention ({behaviorIntel.attention_function_count})</Badge>
                    )}
                  </div>
                </div>
                {/* Context alerts */}
                {contextAlerts.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Context Alerts</p>
                    {contextAlerts.map((a, i) => (
                      <div key={i} className="flex items-center gap-2 py-1">
                        <Badge className={`text-[10px] ${a.severity === 'high' ? 'bg-destructive text-destructive-foreground' : a.severity === 'moderate' ? 'bg-orange-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                          {a.severity}
                        </Badge>
                        <span className="text-xs text-foreground">{a.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Session Export Preview */}
      {exportType === 'session' && sessionExport && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Session Export Preview ({sessionExport.events.length} events)</CardTitle>
          </CardHeader>
          <CardContent>
            {sessionExport.events.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No events found for selected range.</p>
            ) : (
              <div className="max-h-96 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Behavior</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessionExport.events.slice(0, 50).map((e, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs font-mono">{e.session_date}</TableCell>
                        <TableCell className="text-xs">{e.behavior}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">{e.measurement_type}</Badge>
                        </TableCell>
                        <TableCell className="text-xs font-mono">{e.value_numeric ?? e.value_text ?? '—'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{e.notes || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {exportType === 'skill_mastery' && selectedStudent && !masteryLoading && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Skill Mastery Summary ({masteryTargets.length} targets)</CardTitle>
          </CardHeader>
          <CardContent>
            {masteryTargets.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No skill targets found.</p>
            ) : (
              <div className="max-h-96 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Target</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Accuracy</TableHead>
                      <TableHead className="text-center">Independent</TableHead>
                      <TableHead className="text-center">Sessions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {masteryTargets.map(t => (
                      <TableRow key={t.student_target_id}>
                        <TableCell className="text-xs font-medium">{t.target_title}</TableCell>
                        <TableCell>
                          <Badge className={`text-[10px] ${
                            t.mastery_status === 'mastered' ? 'bg-emerald-500 text-white' :
                            t.mastery_status === 'in_progress' ? 'bg-blue-500 text-white' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {t.mastery_status || 'not_started'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-xs font-mono">{Math.round(t.current_accuracy ?? 0)}%</TableCell>
                        <TableCell className="text-center text-xs font-mono">{Math.round(t.current_prompt_independence ?? 0)}%</TableCell>
                        <TableCell className="text-center text-xs font-mono">
                          {t.consecutive_sessions_at_criterion ?? 0}/{t.required_consecutive_sessions ?? 2}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {exportType === 'replacement' && selectedStudent && !replLoading && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Replacement Behavior Summary ({replSummaries.length} pairs)</CardTitle>
          </CardHeader>
          <CardContent>
            {replSummaries.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No replacement behavior data found.</p>
            ) : (
              <div className="max-h-96 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Behavior</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Problem</TableHead>
                      <TableHead className="text-center">Replacement</TableHead>
                      <TableHead className="text-center">Ratio</TableHead>
                      <TableHead className="text-center">Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {replSummaries.map(s => (
                      <TableRow key={s.plan_link_id}>
                        <TableCell className="text-xs font-medium">{s.problem_behavior_name || '—'}</TableCell>
                        <TableCell>
                          <Badge className={`${getReplacementStatusColor(s.replacement_status)} text-[10px]`}>
                            {s.replacement_status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-xs font-mono">{s.problem_behavior_count}</TableCell>
                        <TableCell className="text-center text-xs font-mono">{s.replacement_behavior_count}</TableCell>
                        <TableCell className="text-center text-xs font-mono">{s.replacement_to_problem_ratio ?? '—'}</TableCell>
                        <TableCell className="text-center text-xs font-mono">{s.replacement_strength_score ?? 0}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
