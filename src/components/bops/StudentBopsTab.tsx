import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Loader2, Play, Pause, RefreshCw, BarChart3, Zap, ChevronDown, Shield, Brain, Target, Layers, Check, Copy, Trash2, Star, Power } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  useStudentBopsDashboard, useToggleBops, useRunCfi, useGenerateRecommendations,
  useAcceptAndActivate, useActivateProgramming, useDeactivateProgramming,
  useSetDayStateAndPlan, useScoreAssessment, useFinalizeAndUnlock,
  useAcceptSuggestedProgram, useAcceptByDayState,
  useDisableProgram, useEnableProgram, useDuplicateProgram, useDeleteProgram,
  useSetPreferredDefault, useStudentSuggestedPrograms, useStudentAcceptedPrograms,
  useStudentCfiSummary, useStudentBeaconDashboard,
} from '@/hooks/useBopsEngine';
import { useStudentBopsPrograms } from '@/hooks/useBopsData';
import { BopsProgramsSection } from '@/components/programming/BopsProgramsSection';
import { useNavigate } from 'react-router-dom';
import { ManualBopsScoreEntry } from '@/components/bops/ManualBopsScoreEntry';
import { BopsReportWorkspace } from '@/components/bops/BopsReportWorkspace';
import { BopsSessionHistory } from '@/components/bops/BopsSessionHistory';
import { useGenerateBopsReport, useGenerateBopsReportForSession, useBopsReports } from '@/hooks/useBopsReports';

const dayStateColors: Record<string, string> = {
  red: 'bg-red-500 text-white',
  yellow: 'bg-yellow-400 text-black',
  green: 'bg-green-500 text-white',
  blue: 'bg-blue-500 text-white',
};

const fitBandColors: Record<string, string> = {
  high: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  moderate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  low: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

export function StudentBopsTab({ studentId }: { studentId: string }) {
  const { data: dash, isLoading } = useStudentBopsDashboard(studentId);
  const { data: programs } = useStudentBopsPrograms(studentId);
  const { data: suggested } = useStudentSuggestedPrograms(studentId);
  const { data: accepted } = useStudentAcceptedPrograms(studentId);
  const { data: cfiModels } = useStudentCfiSummary(studentId);
  const { data: beacon } = useStudentBeaconDashboard(studentId);

  const toggleBops = useToggleBops();
  const runCfi = useRunCfi();
  const genRecs = useGenerateRecommendations();
  const acceptActivate = useAcceptAndActivate();
  const activateProg = useActivateProgramming();
  const deactivateProg = useDeactivateProgramming();
  const setDayState = useSetDayStateAndPlan();
  const scoreAssessment = useScoreAssessment();
  const finalizeUnlock = useFinalizeAndUnlock();
  const acceptOne = useAcceptSuggestedProgram();
  const acceptByDay = useAcceptByDayState();
  const disableProg = useDisableProgram();
  const enableProg = useEnableProgram();
  const duplicateProg = useDuplicateProgram();
  const deleteProg = useDeleteProgram();
  const setDefault = useSetPreferredDefault();

  const [selectedState, setSelectedState] = useState<string>('yellow');
  const [planNotes, setPlanNotes] = useState('');
  const [activeSection, setActiveSection] = useState<string>('programs');
  const navigate = useNavigate();
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const generateReport = useGenerateBopsReport();
  const generateForSession = useGenerateBopsReportForSession();
  const { data: reports } = useBopsReports(studentId);

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>;

  const d = dash || {} as any;
  const sessionId = d.latest_scored_session_id;

  return (
    <>
    <ScrollArea className="h-[calc(100vh-200px)]">
      <div className="space-y-4 pr-4">
        {/* Section 1: Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-4 h-4" /> BOPS Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">BOPS</span>
                <Switch
                  checked={!!d.bops_enabled}
                  disabled={toggleBops.isPending}
                  onCheckedChange={c => toggleBops.mutate({ studentId, enable: c })}
                />
              </div>
              <StatusBadge label="Assessment" value={d.bops_assessment_status} />
              <StatusBadge label="Profile" value={d.bops_profile_saved ? 'Saved' : 'Pending'} variant={d.bops_profile_saved} />
              <StatusBadge label="Programming" value={d.bops_programming_active ? 'Active' : d.bops_programming_available ? 'Available' : 'Locked'} variant={d.bops_programming_active} />
              {d.assessment_date && <span className="text-xs text-muted-foreground">Last scored: {d.assessment_date}</span>}
            </div>
            <div className="flex gap-2 mt-3">
              <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setShowManualEntry(true)}>
                <Brain className="w-3 h-3" /> Enter Scores Manually
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1 text-xs"
                disabled={generateReport.isPending}
                onClick={() => generateReport.mutate({ studentId }, { onSuccess: (id) => setActiveReportId(id) })}
              >
                {generateReport.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <BarChart3 className="w-3 h-3" />}
                Generate Report
              </Button>
              {reports && reports.length > 0 && (
                <Button size="sm" variant="ghost" className="gap-1 text-xs" onClick={() => setActiveReportId(reports[0].id)}>
                  Open Latest Report
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Profile Summary */}
        {d.calculated_training_name && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="w-4 h-4" /> Profile Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <KV label="Training Name" value={d.calculated_training_name} />
                <KV label="Clinical Name" value={d.calculated_clinical_name} />
                <KV label="Classification" value={d.calculated_profile_type} />
                <KV label="Primary" value={d.primary_archetype} />
                <KV label="Secondary" value={d.secondary_archetype} />
                <KV label="Tertiary" value={d.tertiary_archetype} />
                {d.quaternary_archetype && <KV label="4th" value={d.quaternary_archetype} />}
                {d.quinary_archetype && <KV label="5th" value={d.quinary_archetype} />}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
                <IndexChip label="Storm" value={d.storm_score} />
                <IndexChip label="Escalation" value={d.escalation_index} />
                <IndexChip label="Hidden Need" value={d.hidden_need_index} />
                <IndexChip label="Sensory" value={d.sensory_load_index} />
                <IndexChip label="Power" value={d.power_conflict_index} />
                <IndexChip label="Social" value={d.social_complexity_index} />
                <IndexChip label="Recovery" value={d.recovery_burden_index} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Section 3: Placement Intelligence */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-4 h-4" /> Placement Intelligence
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-4 items-center">
              <KV label="Best Fit" value={d.best_fit_model_name || 'Not run'} />
              {d.best_fit_score != null && <KV label="Score" value={Number(d.best_fit_score).toFixed(2)} />}
              {d.best_fit_band && <Badge className={`${fitBandColors[d.best_fit_band]} text-xs`}>{d.best_fit_band}</Badge>}
            </div>
            {cfiModels && cfiModels.length > 0 && (
              <div className="space-y-1 mt-2">
                <span className="text-xs font-medium text-muted-foreground">All CFI Models:</span>
                {cfiModels.map((m: any, i: number) => (
                  <div key={i} className="flex justify-between text-xs bg-muted/50 rounded px-2 py-1">
                    <span>{m.model_name}</span>
                    <span className="font-medium">{Number(m.cfi_score || 0).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
            {sessionId && (
              <Button size="sm" variant="outline" disabled={runCfi.isPending}
                onClick={() => runCfi.mutate({ studentId, sessionId })}>
                {runCfi.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <BarChart3 className="w-3.5 h-3.5 mr-1" />}
                Run CFI
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Section 4: Assessment Controls */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => navigate('/bops')}>
                Open Full Assessment
              </Button>
              {sessionId && (
                <>
                  <Button size="sm" variant="outline" disabled={scoreAssessment.isPending}
                    onClick={() => scoreAssessment.mutate({ studentId, sessionId })}>
                    {scoreAssessment.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />}
                    Re-score
                  </Button>
                  <Button size="sm" variant="outline" disabled={finalizeUnlock.isPending}
                    onClick={() => finalizeUnlock.mutate({ studentId, sessionId })}>
                    {finalizeUnlock.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Power className="w-3.5 h-3.5 mr-1" />}
                    Finalize + Unlock
                  </Button>
                  <Button size="sm" variant="outline" disabled={genRecs.isPending}
                    onClick={() => genRecs.mutate({ studentId, sessionId })}>
                    {genRecs.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Zap className="w-3.5 h-3.5 mr-1" />}
                    Generate Recommendations
                  </Button>
                  <Button size="sm" disabled={acceptActivate.isPending}
                    onClick={() => acceptActivate.mutate({ studentId, sessionId })}>
                    {acceptActivate.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Play className="w-3.5 h-3.5 mr-1" />}
                    Accept + Activate
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Section 5: Suggested Programs */}
        {suggested && suggested.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Suggested Programs</CardTitle>
              <CardDescription>{suggested.length} recommendation{suggested.length !== 1 ? 's' : ''}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex gap-2 mb-2">
                {sessionId && (
                  <>
                    <Button size="sm" variant="outline" disabled={acceptByDay.isPending}
                      onClick={() => acceptByDay.mutate({ studentId, sessionId })}>
                      <Check className="w-3.5 h-3.5 mr-1" /> Accept All by Day State
                    </Button>
                    <Button size="sm" variant="outline" disabled={genRecs.isPending}
                      onClick={() => genRecs.mutate({ studentId, sessionId })}>
                      <RefreshCw className="w-3.5 h-3.5 mr-1" /> Regenerate
                    </Button>
                  </>
                )}
              </div>
              {suggested.map((s: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-xs border rounded px-2 py-1.5">
                  <div className="flex items-center gap-2">
                    <Badge className={`${dayStateColors[s.day_state] || 'bg-muted'} text-xs`}>{s.day_state}</Badge>
                    <span className="font-medium">{s.program_name || s.source_program_key}</span>
                  </div>
                  <Button size="sm" variant="ghost" className="h-6 text-xs" disabled={acceptOne.isPending}
                    onClick={() => acceptOne.mutate({ studentId, programKey: s.source_program_key || s.program_key })}>
                    <Check className="w-3 h-3 mr-1" /> Accept
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Section 6: BOPS Programs — Full expandable cards with allocation */}
        <BopsProgramsSection studentId={studentId} />

        {/* Section 7: Nova Plan */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Current Nova Plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-3 items-center">
              {d.current_day_state && <Badge className={`${dayStateColors[d.current_day_state]} text-xs`}>{d.current_day_state}</Badge>}
              {d.current_plan_date && <span className="text-xs text-muted-foreground">{d.current_plan_date}</span>}
              {d.benchmark_level && <KV label="Benchmark" value={d.benchmark_level} />}
            </div>
            {d.teacher_summary_view && (
              <div className="text-xs bg-muted/50 rounded p-2">
                <span className="font-medium">Teacher View:</span> {d.teacher_summary_view}
              </div>
            )}
            <div className="flex flex-wrap gap-2 mt-2">
              <Select value={selectedState} onValueChange={setSelectedState}>
                <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="red">Red</SelectItem>
                  <SelectItem value="yellow">Yellow</SelectItem>
                  <SelectItem value="green">Green</SelectItem>
                  <SelectItem value="blue">Blue</SelectItem>
                </SelectContent>
              </Select>
              <Textarea placeholder="Plan notes (optional)..." value={planNotes} onChange={e => setPlanNotes(e.target.value)}
                className="text-xs h-8 min-h-[2rem] flex-1 min-w-[150px]" />
              <Button size="sm" disabled={setDayState.isPending}
                onClick={() => { setDayState.mutate({ studentId, dayState: selectedState, notes: planNotes }); setPlanNotes(''); }}>
                {setDayState.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : null}
                Generate Plan
              </Button>
            </div>
            <div className="flex gap-2 mt-1">
              {d.bops_programming_active ? (
                <Button size="sm" variant="outline" disabled={deactivateProg.isPending}
                  onClick={() => deactivateProg.mutate({ studentId })}>
                  <Pause className="w-3.5 h-3.5 mr-1" /> Pause Programming
                </Button>
              ) : (
                <Button size="sm" variant="outline" disabled={activateProg.isPending}
                  onClick={() => activateProg.mutate({ studentId })}>
                  <Play className="w-3.5 h-3.5 mr-1" /> Activate Programming
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Section 8: Beacon Snapshot */}
        {(beacon || d.beacon_day_state || d.beacon_teacher_summary) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Beacon Snapshot</CardTitle>
              <CardDescription>Teacher/Implementation view — does not override clinical data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex gap-3 items-center">
                {(beacon?.day_state || d.beacon_day_state) && (
                  <Badge className={`${dayStateColors[beacon?.day_state || d.beacon_day_state]} text-xs`}>
                    {beacon?.day_state || d.beacon_day_state}
                  </Badge>
                )}
                {(beacon?.state_date || d.beacon_state_date) && (
                  <span className="text-xs text-muted-foreground">{beacon?.state_date || d.beacon_state_date}</span>
                )}
              </div>
              {(beacon?.teacher_summary || d.beacon_teacher_summary) && (
                <div className="text-xs bg-muted/50 rounded p-2">{beacon?.teacher_summary || d.beacon_teacher_summary}</div>
              )}
              {beacon?.targets && Array.isArray(beacon.targets) && beacon.targets.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {beacon.targets.map((t: string, i: number) => <Badge key={i} variant="outline" className="text-xs">{t}</Badge>)}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Section 9: Session History */}
        <BopsSessionHistory
          studentId={studentId}
          onGenerateReport={(sessionId) => {
            generateReport.mutate(
              { studentId },
              { onSuccess: (id) => setActiveReportId(id) },
            );
          }}
        />

        {/* Section 10: MTSS Snapshot */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">MTSS Snapshot</CardTitle>
          </CardHeader>
          <CardContent>
            {d.latest_mtss_tier ? (
              <div className="grid grid-cols-2 gap-2">
                <KV label="Tier" value={d.latest_mtss_tier} />
                <KV label="Status" value={d.latest_mtss_status} />
                <KV label="Primary Goal" value={d.latest_mtss_primary_goal} />
                <KV label="Interventions" value={d.latest_mtss_intervention_count} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No MTSS plan yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </ScrollArea>

    <ManualBopsScoreEntry studentId={studentId} open={showManualEntry} onOpenChange={setShowManualEntry} />

    {activeReportId && (
      <Dialog open onOpenChange={o => !o && setActiveReportId(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
          <div className="p-4 flex-1 min-h-0 overflow-auto">
            <BopsReportWorkspace
              reportId={activeReportId}
              studentId={studentId}
              studentName={d.student_name || 'Student'}
              onBack={() => setActiveReportId(null)}
            />
          </div>
        </DialogContent>
      </Dialog>
    )}
  </>
  );
}

function StatusBadge({ label, value, variant }: { label: string; value?: string; variant?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-muted-foreground">{label}:</span>
      <Badge variant={variant ? 'default' : 'secondary'} className="text-xs">
        {(value || 'unknown').replace(/_/g, ' ')}
      </Badge>
    </div>
  );
}

function KV({ label, value }: { label: string; value: any }) {
  return (
    <div className="text-sm">
      <span className="text-muted-foreground">{label}: </span>
      <span className="font-medium">{value ?? '—'}</span>
    </div>
  );
}

function IndexChip({ label, value }: { label: string; value: any }) {
  const n = typeof value === 'number' ? value : parseFloat(value);
  const color = isNaN(n) ? 'bg-muted text-muted-foreground' : n >= 0.7 ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' : n >= 0.4 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
  return (
    <div className={`rounded px-2 py-1 text-xs text-center ${color}`}>
      <div className="font-medium">{label}</div>
      <div>{isNaN(n) ? '—' : n.toFixed(2)}</div>
    </div>
  );
}
