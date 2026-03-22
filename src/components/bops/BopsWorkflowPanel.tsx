import { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  useStudentBopsConfig,
  useStudentBopsScores,
  useStudentBopsResolution,
  useBopsSuggestedPrograms,
  useStudentProgramBank,
  useBopsPlanCandidates,
  useBeaconSharedPlan,
  useAcceptSuggestedProgram,
  useAcceptAllPrograms,
  useAcceptByDayState,
  useAcceptAndActivate,
  useActivateProgramming,
  useDeactivateProgramming,
  useGenerateBopsPlan,
  useSetPreferredDefault,
  useDisableStudentProgram,
  useEnableStudentProgram,
  useDuplicateStudentProgram,
  useDeleteStudentProgram,
} from '@/hooks/useBopsWorkflow';
import { useStudentDailyPlan } from '@/hooks/useBopsData';
import {
  Loader2, ChevronDown, AlertTriangle, Sun, Leaf, Zap, CheckCircle,
  Star, Copy, Trash2, Power, Pause, Eye, Edit2, Shield, ToggleLeft
} from 'lucide-react';

interface Props {
  studentId: string;
}

export function BopsWorkflowPanel({ studentId }: Props) {
  const [tab, setTab] = useState('profile');

  const { data: config, isLoading: configLoading } = useStudentBopsConfig(studentId);
  const { data: scores } = useStudentBopsScores(studentId);
  const { data: resolution } = useStudentBopsResolution(studentId);

  if (configLoading) return <Loader2 className="animate-spin mx-auto mt-8" />;

  const hasProfile = config?.bops_profile_saved;
  const programmingAvailable = config?.bops_programming_available;
  const programmingActive = config?.bops_programming_active;

  return (
    <div className="space-y-4">
      {/* Status Bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant={hasProfile ? 'default' : 'secondary'} className="gap-1">
          {hasProfile ? <CheckCircle className="w-3 h-3" /> : null}
          Profile {hasProfile ? 'Saved' : 'Pending'}
        </Badge>
        <Badge variant={programmingAvailable ? 'default' : 'secondary'} className="gap-1">
          Programming {programmingAvailable ? 'Available' : 'Unavailable'}
        </Badge>
        <Badge variant={programmingActive ? 'default' : 'outline'} className="gap-1">
          {programmingActive ? <Power className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
          {programmingActive ? 'Active' : 'Inactive'}
        </Badge>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="profile">Profile Summary</TabsTrigger>
          <TabsTrigger value="suggested">Suggested Programs</TabsTrigger>
          <TabsTrigger value="bank">Student Bank</TabsTrigger>
          <TabsTrigger value="candidates">Plan Candidates</TabsTrigger>
          <TabsTrigger value="activate">Activate</TabsTrigger>
          <TabsTrigger value="dayplan" disabled={!programmingActive}>Day Plan</TabsTrigger>
          <TabsTrigger value="beacon" disabled={!programmingActive}>Beacon Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileSummary scores={scores} resolution={resolution} config={config} />
        </TabsContent>
        <TabsContent value="suggested">
          <SuggestedPrograms studentId={studentId} config={config} />
        </TabsContent>
        <TabsContent value="bank">
          <StudentProgramBank studentId={studentId} />
        </TabsContent>
        <TabsContent value="candidates">
          <PlanCandidates studentId={studentId} />
        </TabsContent>
        <TabsContent value="activate">
          <ActivateSection studentId={studentId} config={config} />
        </TabsContent>
        <TabsContent value="dayplan">
          <DayStatePlan studentId={studentId} />
        </TabsContent>
        <TabsContent value="beacon">
          <BeaconPreview studentId={studentId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ─── Section 1: Profile Summary ─── */
function ProfileSummary({ scores, resolution, config }: { scores: any; resolution: any; config: any }) {
  if (!scores && !resolution) {
    return (
      <Card><CardContent className="py-8 text-center text-muted-foreground">
        No BOPS scores found. Complete the assessment first.
      </CardContent></Card>
    );
  }

  const r = resolution;
  const s = scores;

  const archetypes = [
    { label: 'Primary', value: r?.primary_archetype || s?.calculated_primary },
    { label: 'Secondary', value: r?.secondary_archetype || s?.calculated_secondary },
    r?.tertiary_archetype && { label: 'Tertiary', value: r.tertiary_archetype },
    r?.quaternary_archetype && { label: '4th', value: r.quaternary_archetype },
    r?.quinary_archetype && { label: '5th', value: r.quinary_archetype },
  ].filter(Boolean) as { label: string; value: string }[];

  const drivers = Array.isArray(r?.supporting_drivers) ? r.supporting_drivers : [];

  return (
    <div className="space-y-4">
      {/* Constellation */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="p-4 rounded-lg bg-muted/50 border">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Clinical Name</p>
            <p className="text-lg font-semibold mt-1">{r?.clinical_name || s?.calculated_clinical_name || '—'}</p>
            <p className="text-sm text-muted-foreground">{r?.training_name || s?.calculated_training_name || ''}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            {archetypes.map(a => (
              <div key={a.label} className="p-3 rounded-lg border min-w-[120px]">
                <p className="text-xs text-muted-foreground">{a.label}</p>
                <p className="font-semibold text-primary capitalize">{a.value}</p>
              </div>
            ))}
            <div className="p-3 rounded-lg border min-w-[120px]">
              <p className="text-xs text-muted-foreground">Classification</p>
              <p className="font-semibold capitalize">{r?.classification_type || s?.calculated_profile_type || '—'}</p>
            </div>
          </div>

          {drivers.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Supporting Drivers</p>
              <div className="flex flex-wrap gap-1.5">
                {drivers.map((d: string) => <Badge key={d} variant="outline">{d}</Badge>)}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scores & Indices */}
      {s && (
        <Card>
          <CardHeader><CardTitle className="text-base">Scores & Indices</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
              {[
                { label: 'Storm Score', value: s.storm_score },
                { label: 'Escalation', value: s.escalation_index },
                { label: 'Hidden Need', value: s.hidden_need_index },
                { label: 'Sensory Load', value: s.sensory_load_index },
                { label: 'Power Conflict', value: s.power_conflict_index },
                { label: 'Social Complexity', value: s.social_complexity_index },
                { label: 'Recovery Burden', value: s.recovery_burden_index },
              ].map(idx => (
                <div key={idx.label} className="p-3 rounded-lg border text-center">
                  <p className="text-xs text-muted-foreground">{idx.label}</p>
                  <p className="text-xl font-bold">{idx.value != null ? `${(Number(idx.value) * 100).toFixed(0)}%` : '—'}</p>
                  {idx.value != null && <Progress value={Number(idx.value) * 100} className="h-1.5 mt-1" />}
                </div>
              ))}
            </div>

            {/* Domain scores */}
            <div className="space-y-2">
              {[
                { key: 'threat_score', label: 'Threat' },
                { key: 'withdrawal_score', label: 'Withdrawal' },
                { key: 'sensory_score', label: 'Sensory' },
                { key: 'emotion_score', label: 'Emotion' },
                { key: 'impulse_score', label: 'Impulse' },
                { key: 'autonomy_score', label: 'Autonomy' },
                { key: 'authority_score', label: 'Authority' },
                { key: 'rigidity_score', label: 'Rigidity' },
                { key: 'social_score', label: 'Social' },
                { key: 'context_score', label: 'Context' },
              ].filter(d => s[d.key] != null)
                .sort((a, b) => Number(s[b.key]) - Number(s[a.key]))
                .map(d => {
                  const v = Number(s[d.key]);
                  return (
                    <div key={d.key} className="flex items-center gap-3">
                      <span className="text-sm font-medium w-24 shrink-0">{d.label}</span>
                      <div className="flex-1"><Progress value={v * 100} className="h-3" /></div>
                      <span className="text-sm font-mono w-12 text-right">{(v * 100).toFixed(0)}%</span>
                      {v >= 0.7 && <Badge variant="destructive" className="text-xs">High</Badge>}
                      {v >= 0.5 && v < 0.7 && <Badge variant="secondary" className="text-xs">Mod</Badge>}
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ─── Section 2: Suggested Programs ─── */
function SuggestedPrograms({ studentId, config }: { studentId: string; config: any }) {
  const { data: programs, isLoading } = useBopsSuggestedPrograms(studentId);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const acceptOne = useAcceptSuggestedProgram();
  const acceptAll = useAcceptAllPrograms();

  if (isLoading) return <Loader2 className="animate-spin mx-auto mt-8" />;
  if (!programs?.length) {
    return <Card><CardContent className="py-8 text-center text-muted-foreground">No suggested programs available. Complete a BOPS assessment first.</CardContent></Card>;
  }

  const toggleSelect = (key: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const handleAcceptSelected = async () => {
    for (const key of selected) {
      await acceptOne.mutateAsync({ studentId, programKey: key });
    }
    setSelected(new Set());
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{programs.length} programs recommended</p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={selected.size === 0 || acceptOne.isPending} onClick={handleAcceptSelected}>
            Accept Selected ({selected.size})
          </Button>
          <Button size="sm" disabled={acceptAll.isPending} onClick={() => acceptAll.mutate({ studentId, sessionId: config?.active_bops_session_id || '' })}>
            {acceptAll.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
            Accept All
          </Button>
        </div>
      </div>

      <ScrollArea className="h-[600px]">
        <div className="space-y-3">
          {programs.map((p: any) => (
            <ProgramRecommendationCard
              key={p.program_key}
              program={p}
              selected={selected.has(p.program_key)}
              onToggle={() => toggleSelect(p.program_key)}
              onAccept={() => acceptOne.mutate({ studentId, programKey: p.program_key })}
              accepting={acceptOne.isPending}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function ProgramRecommendationCard({ program: p, selected, onToggle, onAccept, accepting }: {
  program: any; selected: boolean; onToggle: () => void; onAccept: () => void; accepting: boolean;
}) {
  const stateColors: Record<string, string> = {
    red: 'border-red-300 bg-red-50/50', yellow: 'border-yellow-300 bg-yellow-50/50', green: 'border-green-300 bg-green-50/50',
  };
  const targets = Array.isArray(p.target_options) ? p.target_options.slice(0, 3) : [];
  const antecedents = Array.isArray(p.antecedent_strategies) ? p.antecedent_strategies.slice(0, 3) : [];
  const reactives = Array.isArray(p.reactive_strategies) ? p.reactive_strategies.slice(0, 3) : [];

  return (
    <Collapsible>
      <div className={`rounded-lg border p-3 ${stateColors[p.day_state] || ''}`}>
        <div className="flex items-center gap-3">
          <Checkbox checked={selected} onCheckedChange={onToggle} />
          <CollapsibleTrigger className="flex-1 text-left">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">{p.program_name}</p>
                <p className="text-xs text-muted-foreground">{p.problem_area} • {p.source_type}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs capitalize">{p.day_state}</Badge>
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </CollapsibleTrigger>
          <Button size="sm" variant="outline" onClick={onAccept} disabled={accepting}>Accept</Button>
        </div>

        <CollapsibleContent>
          <div className="mt-3 pt-3 border-t space-y-3 text-sm">
            <p className="text-xs text-muted-foreground italic">{p.recommendation_reason}</p>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Goal</p>
              <p>{p.goal_title}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Teacher Summary</p>
              <p className="text-xs">{p.teacher_friendly_summary}</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Targets</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {targets.map((t: string, i: number) => <Badge key={i} variant="outline" className="text-xs">{t}</Badge>)}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Antecedents</p>
                <ul className="text-xs list-disc list-inside mt-1">
                  {antecedents.map((a: string, i: number) => <li key={i}>{a}</li>)}
                </ul>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Reactives</p>
                <ul className="text-xs list-disc list-inside mt-1">
                  {reactives.map((r: string, i: number) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            </div>
            {p.reinforcement_plan && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">Reinforcement</p>
                <p className="text-xs">{p.reinforcement_plan}</p>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

/* ─── Section 3: Student Program Bank ─── */
function StudentProgramBank({ studentId }: { studentId: string }) {
  const { data: programs, isLoading } = useStudentProgramBank(studentId);
  const [editProgram, setEditProgram] = useState<any>(null);
  const setDefault = useSetPreferredDefault();
  const disableProg = useDisableStudentProgram();
  const enableProg = useEnableStudentProgram();
  const duplicateProg = useDuplicateStudentProgram();
  const deleteProg = useDeleteStudentProgram();

  if (isLoading) return <Loader2 className="animate-spin mx-auto mt-8" />;
  if (!programs?.length) {
    return <Card><CardContent className="py-8 text-center text-muted-foreground">No accepted programs yet. Accept programs from Suggested Programs first.</CardContent></Card>;
  }

  const grouped: Record<string, Record<string, any[]>> = {};
  programs.forEach(p => {
    const ds = p.day_state || 'other';
    const pa = p.problem_area || 'general';
    if (!grouped[ds]) grouped[ds] = {};
    if (!grouped[ds][pa]) grouped[ds][pa] = [];
    grouped[ds][pa].push(p);
  });

  const stateOrder = ['red', 'yellow', 'green', 'other'];
  const stateLabels: Record<string, string> = { red: '🔴 Red — Regulation', yellow: '🟡 Yellow — Supported', green: '🟢 Green — Skill Building' };

  return (
    <div className="space-y-4">
      <ScrollArea className="h-[600px]">
        <div className="space-y-6">
          {stateOrder.filter(s => grouped[s]).map(state => (
            <div key={state}>
              <p className="font-semibold text-sm mb-2">{stateLabels[state] || state}</p>
              {Object.entries(grouped[state]).map(([area, progs]) => (
                <div key={area} className="mb-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1 capitalize">{area}</p>
                  <div className="space-y-2">
                    {progs.map(p => (
                      <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{p.program_name}</p>
                            {p.is_student_modified && <Badge variant="secondary" className="text-xs">Modified</Badge>}
                            {p.is_preferred_default && <Badge className="text-xs gap-1"><Star className="w-3 h-3" />Default</Badge>}
                            {!p.active && <Badge variant="destructive" className="text-xs">Disabled</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{p.goal_title}</p>
                          <p className="text-xs text-muted-foreground">{p.teacher_friendly_summary}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditProgram(p)}><Edit2 className="w-3.5 h-3.5" /></Button>
                          {p.active ? (
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => disableProg.mutate(p.id)}><ToggleLeft className="w-3.5 h-3.5" /></Button>
                          ) : (
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => enableProg.mutate(p.id)}><Power className="w-3.5 h-3.5" /></Button>
                          )}
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setDefault.mutate(p.id)}><Star className="w-3.5 h-3.5" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => duplicateProg.mutate(p.id)}><Copy className="w-3.5 h-3.5" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteProg.mutate(p.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </ScrollArea>

      {editProgram && <EditProgramModal program={editProgram} onClose={() => setEditProgram(null)} />}
    </div>
  );
}

/* ─── Section 4: Edit Modal ─── */
function EditProgramModal({ program, onClose }: { program: any; onClose: () => void }) {
  const [goalTitle, setGoalTitle] = useState(program.goal_title || '');
  const [goalDesc, setGoalDesc] = useState(program.goal_description || '');
  const [targets, setTargets] = useState(JSON.stringify(program.target_options || [], null, 2));
  const [benchmarks, setBenchmarks] = useState(JSON.stringify(program.benchmark_ladder || [], null, 2));
  const [mastery, setMastery] = useState(program.mastery_criteria || '');
  const [antecedents, setAntecedents] = useState(JSON.stringify(program.antecedent_strategies || [], null, 2));
  const [teaching, setTeaching] = useState(JSON.stringify(program.teaching_strategies || [], null, 2));
  const [reactives, setReactives] = useState(JSON.stringify(program.reactive_strategies || [], null, 2));
  const [reinforcement, setReinforcement] = useState(program.reinforcement_plan || '');
  const [teacherSummary, setTeacherSummary] = useState(program.teacher_friendly_summary || '');
  const [clinicianSummary, setClinicianSummary] = useState(program.clinician_summary || '');

  const qc = useQueryClient();
  const updateProg = useMutation({
    mutationFn: async ({ programId, updates }: { programId: string; updates: Record<string, any> }) => {
      const { error } = await supabase.rpc('update_student_bops_program', {
        p_program_id: programId,
        ...updates,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bops-student-bank'] });
      toast.success('Program updated');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleSave = () => {
    try {
      updateProg.mutate({
        programId: program.id,
        updates: {
          p_goal_title: goalTitle,
          p_goal_description: goalDesc,
          p_target_options: JSON.parse(targets),
          p_benchmark_ladder: JSON.parse(benchmarks),
          p_mastery_criteria: mastery,
          p_antecedent_strategies: JSON.parse(antecedents),
          p_teaching_strategies: JSON.parse(teaching),
          p_reactive_strategies: JSON.parse(reactives),
          p_reinforcement_plan: reinforcement,
          p_teacher_friendly_summary: teacherSummary,
          p_clinician_summary: clinicianSummary,
        },
      }, { onSuccess: onClose });
    } catch {
      toast.error('Invalid JSON in one of the fields');
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit: {program.program_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Goal Title</Label>
              <Input value={goalTitle} onChange={e => setGoalTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Mastery Criteria</Label>
              <Input value={mastery} onChange={e => setMastery(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Goal Description</Label>
            <Textarea value={goalDesc} onChange={e => setGoalDesc(e.target.value)} className="h-16" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Target Options (JSON)</Label>
              <Textarea value={targets} onChange={e => setTargets(e.target.value)} className="h-24 font-mono text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Benchmark Ladder (JSON)</Label>
              <Textarea value={benchmarks} onChange={e => setBenchmarks(e.target.value)} className="h-24 font-mono text-xs" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Antecedent Strategies (JSON)</Label>
              <Textarea value={antecedents} onChange={e => setAntecedents(e.target.value)} className="h-24 font-mono text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Teaching Strategies (JSON)</Label>
              <Textarea value={teaching} onChange={e => setTeaching(e.target.value)} className="h-24 font-mono text-xs" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Reactive Strategies (JSON)</Label>
              <Textarea value={reactives} onChange={e => setReactives(e.target.value)} className="h-24 font-mono text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Reinforcement Plan</Label>
              <Textarea value={reinforcement} onChange={e => setReinforcement(e.target.value)} className="h-24" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Teacher-Friendly Summary</Label>
              <Textarea value={teacherSummary} onChange={e => setTeacherSummary(e.target.value)} className="h-20" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Clinician Summary</Label>
              <Textarea value={clinicianSummary} onChange={e => setClinicianSummary(e.target.value)} className="h-20" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={updateProg.isPending}>
            {updateProg.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Section 5: Plan Candidates ─── */
function PlanCandidates({ studentId }: { studentId: string }) {
  const { data: candidates, isLoading } = useBopsPlanCandidates(studentId);

  if (isLoading) return <Loader2 className="animate-spin mx-auto mt-8" />;
  if (!candidates?.length) {
    return <Card><CardContent className="py-8 text-center text-muted-foreground">No plan candidates. Accept programs into the Student Bank first.</CardContent></Card>;
  }

  const byState: Record<string, any[]> = {};
  candidates.forEach(c => {
    const ds = c.day_state || 'other';
    if (!byState[ds]) byState[ds] = [];
    byState[ds].push(c);
  });

  const stateConfig: Record<string, { label: string; cls: string }> = {
    red: { label: '🔴 Red — Regulation', cls: 'border-red-200 bg-red-50/50' },
    yellow: { label: '🟡 Yellow — Supported', cls: 'border-yellow-200 bg-yellow-50/50' },
    green: { label: '🟢 Green — Skill Building', cls: 'border-green-200 bg-green-50/50' },
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">These programs will be used when generating a daily plan. Preferred defaults take priority.</p>
      {['red', 'yellow', 'green'].map(state => {
        const items = byState[state];
        if (!items?.length) return null;
        const cfg = stateConfig[state];
        const hasDefaults = items.some(i => i.is_preferred_default);
        return (
          <Card key={state} className={cfg.cls}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{cfg.label}</CardTitle>
                {hasDefaults && <Badge className="text-xs gap-1"><Star className="w-3 h-3" />Using Preferred Defaults</Badge>}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {items.map((c, i) => (
                  <div key={i} className={`flex items-center justify-between p-2 rounded border bg-background/80 ${!c.active ? 'opacity-50' : ''}`}>
                    <div>
                      <p className="text-sm font-medium">{c.program_name}</p>
                      <p className="text-xs text-muted-foreground">{c.problem_area} • {c.goal_title}</p>
                    </div>
                    <div className="flex gap-1">
                      {c.is_preferred_default && <Badge className="text-xs"><Star className="w-3 h-3" /></Badge>}
                      {c.is_student_modified && <Badge variant="secondary" className="text-xs">Modified</Badge>}
                      {!c.active && <Badge variant="destructive" className="text-xs">Disabled</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

/* ─── Section 6: Activate ─── */
function ActivateSection({ studentId, config }: { studentId: string; config: any }) {
  const { data: bank } = useStudentProgramBank(studentId);
  const activate = useActivateProgramming();
  const deactivate = useDeactivateProgramming();

  const hasPrograms = bank && bank.length > 0;
  const isActive = config?.bops_programming_active;
  const isAvailable = config?.bops_programming_available;

  return (
    <Card>
      <CardContent className="py-8 text-center space-y-4">
        {!isAvailable && (
          <div className="text-muted-foreground">
            <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Programming is not yet available. Complete a BOPS assessment and score it first.</p>
          </div>
        )}

        {isAvailable && !isActive && (
          <>
            {!hasPrograms && (
              <div className="p-4 rounded-lg border border-yellow-300 bg-yellow-50 text-yellow-800 text-sm">
                <AlertTriangle className="w-5 h-5 mx-auto mb-1" />
                No accepted student-specific programs exist yet. Accept programs from Suggested Programs first.
              </div>
            )}
            <Button size="lg" className="gap-2" disabled={!hasPrograms || activate.isPending} onClick={() => activate.mutate(studentId)}>
              {activate.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />}
              Activate Programming
            </Button>
          </>
        )}

        {isActive && (
          <>
            <div className="p-4 rounded-lg border border-green-300 bg-green-50 text-green-800">
              <CheckCircle className="w-6 h-6 mx-auto mb-1" />
              <p className="font-semibold">Programming is Active</p>
              <p className="text-sm mt-1">Day State selector and Daily Plan generator are now available.</p>
            </div>
            <Button variant="outline" className="gap-2" onClick={() => deactivate.mutate(studentId)} disabled={deactivate.isPending}>
              {deactivate.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pause className="w-4 h-4" />}
              Pause Programming
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Section 7: Day State + Plan ─── */
function DayStatePlan({ studentId }: { studentId: string }) {
  const today = new Date().toISOString().split('T')[0];
  const [dayState, setDayState] = useState<string>('yellow');
  const [notes, setNotes] = useState('');
  const generatePlan = useGenerateBopsPlan();
  const { data: dailyPlan, isLoading: planLoading } = useStudentDailyPlan(studentId, today);

  const stateButtons = [
    { value: 'red', label: 'Red', desc: 'Regulation / Safety', icon: AlertTriangle, cls: 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100' },
    { value: 'yellow', label: 'Yellow', desc: 'Supported Learning', icon: Sun, cls: 'border-yellow-300 bg-yellow-50 text-yellow-700 hover:bg-yellow-100' },
    { value: 'green', label: 'Green', desc: 'Skill Building', icon: Leaf, cls: 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100' },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Day State — {today}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {stateButtons.map(s => {
              const Icon = s.icon;
              return (
                <button key={s.value} onClick={() => setDayState(s.value)}
                  className={`p-4 rounded-lg border-2 text-center transition-all ${s.cls} ${dayState === s.value ? 'ring-2 ring-offset-2 ring-primary' : 'opacity-70'}`}>
                  <Icon className="w-6 h-6 mx-auto mb-1" />
                  <p className="font-bold">{s.label}</p>
                  <p className="text-xs">{s.desc}</p>
                </button>
              );
            })}
          </div>
          <Textarea placeholder="Notes (optional)..." value={notes} onChange={e => setNotes(e.target.value)} className="h-16" />
          <Button className="w-full gap-2" onClick={() => generatePlan.mutate({ studentId, dayState, selectedBy: 'clinician', notes })} disabled={generatePlan.isPending}>
            {generatePlan.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Generate Today's Plan
          </Button>
        </CardContent>
      </Card>

      {planLoading ? <Loader2 className="animate-spin mx-auto" /> : dailyPlan && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Today's Plan</CardTitle>
              <Badge variant={dailyPlan.day_state === 'red' ? 'destructive' : dailyPlan.day_state === 'yellow' ? 'secondary' : 'default'}>
                {dailyPlan.day_state?.toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Active Targets</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {(Array.isArray(dailyPlan.active_targets) ? dailyPlan.active_targets : []).map((t: string, i: number) => (
                  <Badge key={i} variant="outline">{t}</Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Benchmark Level</p>
              <p>{dailyPlan.benchmark_level}</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg border bg-muted/30">
                <p className="text-xs font-medium text-primary">Antecedent Plan</p>
                <p className="text-xs mt-1">{dailyPlan.antecedent_plan}</p>
              </div>
              <div className="p-3 rounded-lg border bg-muted/30">
                <p className="text-xs font-medium text-destructive">Reactive Plan</p>
                <p className="text-xs mt-1">{dailyPlan.reactive_plan}</p>
              </div>
              <div className="p-3 rounded-lg border bg-muted/30">
                <p className="text-xs font-medium text-primary">Reinforcement</p>
                <p className="text-xs mt-1">{dailyPlan.reinforcement_plan}</p>
              </div>
            </div>
            <div className="p-3 rounded-lg border bg-muted/30">
              <p className="text-xs font-medium text-muted-foreground mb-1">Clinician View</p>
              <p className="text-xs whitespace-pre-line">{dailyPlan.clinician_summary_view}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ─── Section 8: Beacon Preview ─── */
function BeaconPreview({ studentId }: { studentId: string }) {
  const { data: shared, isLoading } = useBeaconSharedPlan(studentId);
  const { data: dailyPlan } = useStudentDailyPlan(studentId);

  if (isLoading) return <Loader2 className="animate-spin mx-auto mt-8" />;

  // Use beacon_shared_plans if available, fall back to daily plan teacher view
  const source = shared || dailyPlan;
  if (!source) {
    return <Card><CardContent className="py-8 text-center text-muted-foreground">No published plan for today. Generate a daily plan first.</CardContent></Card>;
  }

  const programs = shared ? (Array.isArray(shared.programs) ? shared.programs : []) : [];
  const targets = shared ? (Array.isArray(shared.targets) ? shared.targets : []) : (Array.isArray(dailyPlan?.active_targets) ? dailyPlan.active_targets : []);
  const antecedents = shared ? (Array.isArray(shared.antecedents) ? shared.antecedents : []) : [];
  const reactives = shared ? (Array.isArray(shared.reactives) ? shared.reactives : []) : [];
  const reinforcement = shared?.reinforcement || dailyPlan?.reinforcement_plan || '';
  const ds = shared?.day_state || dailyPlan?.day_state || '';

  const stateStyle: Record<string, string> = {
    red: 'border-red-300 bg-red-50', yellow: 'border-yellow-300 bg-yellow-50', green: 'border-green-300 bg-green-50',
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-base">Beacon Teacher View</CardTitle>
          </div>
          <Badge variant="outline" className="capitalize">{ds}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">This is what the teacher sees in Beacon — simplified, no clinical jargon.</p>
      </CardHeader>
      <CardContent>
        <div className={`rounded-lg border-2 p-4 space-y-4 ${stateStyle[ds] || ''}`}>
          {programs.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1">Today's Programs</p>
              <div className="flex flex-wrap gap-1.5">
                {programs.map((p: any, i: number) => <Badge key={i} variant="outline">{typeof p === 'string' ? p : p.name || p.program_name}</Badge>)}
              </div>
            </div>
          )}
          {targets.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1">Targets</p>
              <div className="flex flex-wrap gap-1.5">
                {targets.map((t: any, i: number) => <Badge key={i}>{typeof t === 'string' ? t : t.name}</Badge>)}
              </div>
            </div>
          )}
          {antecedents.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1">Before Behavior (Antecedents)</p>
              <ul className="text-sm list-disc list-inside">
                {antecedents.map((a: any, i: number) => <li key={i}>{typeof a === 'string' ? a : a.text}</li>)}
              </ul>
            </div>
          )}
          {reactives.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1">During Behavior (Reactives)</p>
              <ul className="text-sm list-disc list-inside">
                {reactives.map((r: any, i: number) => <li key={i}>{typeof r === 'string' ? r : r.text}</li>)}
              </ul>
            </div>
          )}
          {reinforcement && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1">Reinforcement</p>
              <p className="text-sm">{reinforcement}</p>
            </div>
          )}
          {!shared && dailyPlan?.teacher_summary_view && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1">Teacher Summary</p>
              <p className="text-sm whitespace-pre-line">{dailyPlan.teacher_summary_view}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
