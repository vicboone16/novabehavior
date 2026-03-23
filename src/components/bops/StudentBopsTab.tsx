import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Loader2, Play, Pause, RefreshCw, BarChart3, Zap, ChevronDown, Shield, Brain, Target, Layers } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useStudentBopsDashboard, useToggleBops, useRunCfi, useGenerateRecommendations, useAcceptAndActivate, useActivateProgramming, useDeactivateProgramming, useSetDayStateAndPlan } from '@/hooks/useBopsEngine';
import { useStudentBopsPrograms } from '@/hooks/useBopsData';
import { useNavigate } from 'react-router-dom';

const dayStateColors: Record<string, string> = {
  red: 'bg-red-500 text-white',
  yellow: 'bg-yellow-400 text-black',
  green: 'bg-green-500 text-white',
};

const fitBandColors: Record<string, string> = {
  high: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  moderate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  low: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

export function StudentBopsTab({ studentId }: { studentId: string }) {
  const { data: dash, isLoading } = useStudentBopsDashboard(studentId);
  const { data: programs } = useStudentBopsPrograms(studentId);
  const toggleBops = useToggleBops();
  const runCfi = useRunCfi();
  const genRecs = useGenerateRecommendations();
  const acceptActivate = useAcceptAndActivate();
  const activateProg = useActivateProgramming();
  const deactivateProg = useDeactivateProgramming();
  const setDayState = useSetDayStateAndPlan();
  const [selectedState, setSelectedState] = useState<string>('yellow');
  const navigate = useNavigate();

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>;

  const d = dash || {} as any;
  const sessionId = d.latest_scored_session_id;

  const redPrograms = programs?.filter(p => p.day_state === 'red') || [];
  const yellowPrograms = programs?.filter(p => p.day_state === 'yellow') || [];
  const greenPrograms = programs?.filter(p => p.day_state === 'green') || [];

  return (
    <div className="space-y-4">
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
              <Switch checked={!!d.bops_enabled} onCheckedChange={c => toggleBops.mutate({ studentId, enable: c })} />
            </div>
            <StatusBadge label="Assessment" value={d.bops_assessment_status} />
            <StatusBadge label="Profile" value={d.bops_profile_saved ? 'Saved' : 'Pending'} variant={d.bops_profile_saved} />
            <StatusBadge label="Programming" value={d.bops_programming_active ? 'Active' : d.bops_programming_available ? 'Available' : 'Locked'} variant={d.bops_programming_active} />
            {d.assessment_date && <span className="text-xs text-muted-foreground">Last scored: {d.assessment_date}</span>}
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

      {/* Section 3: Placement */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="w-4 h-4" /> Placement Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-center">
            <KV label="Best Fit" value={d.best_fit_model_name || 'Not run'} />
            {d.best_fit_score && <KV label="Score" value={Number(d.best_fit_score).toFixed(2)} />}
            {d.best_fit_band && <Badge className={`${fitBandColors[d.best_fit_band]} text-xs`}>{d.best_fit_band}</Badge>}
            {sessionId && (
              <Button size="sm" variant="outline" onClick={() => runCfi.mutate({ sessionId })} disabled={runCfi.isPending}>
                <BarChart3 className="w-3.5 h-3.5 mr-1" /> Run CFI
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Section 4: Assessment Controls */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => navigate(`/bops-engine`)}>
              Open Full Assessment
            </Button>
            {sessionId && (
              <>
                <Button size="sm" variant="outline" onClick={() => genRecs.mutate({ studentId, sessionId })} disabled={genRecs.isPending}>
                  <Zap className="w-3.5 h-3.5 mr-1" /> Generate Recommendations
                </Button>
                <Button size="sm" onClick={() => acceptActivate.mutate({ studentId, sessionId })} disabled={acceptActivate.isPending}>
                  <Play className="w-3.5 h-3.5 mr-1" /> Accept + Activate
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Section 5: Programs Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="w-4 h-4" /> Program Bank
          </CardTitle>
          <CardDescription>
            {d.accepted_programs_total || 0} total · {d.accepted_programs_active || 0} active
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-3">
            <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 text-xs">Red: {d.red_programs || 0}</Badge>
            <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 text-xs">Yellow: {d.yellow_programs || 0}</Badge>
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-xs">Green: {d.green_programs || 0}</Badge>
          </div>
          {[{ label: 'Red', programs: redPrograms, color: 'border-red-300' },
            { label: 'Yellow', programs: yellowPrograms, color: 'border-yellow-300' },
            { label: 'Green', programs: greenPrograms, color: 'border-green-300' }
          ].map(group => group.programs.length > 0 && (
            <Collapsible key={group.label} defaultOpen={false}>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium py-1 hover:text-primary w-full">
                <ChevronDown className="w-3.5 h-3.5" /> {group.label} Programs ({group.programs.length})
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-1 pl-5 mt-1">
                  {group.programs.map((p: any) => (
                    <div key={p.id} className={`text-xs border-l-2 ${group.color} pl-2 py-1`}>
                      <span className="font-medium">{p.program_name}</span>
                      {p.teacher_friendly_summary && <span className="text-muted-foreground ml-1">— {p.teacher_friendly_summary}</span>}
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </CardContent>
      </Card>

      {/* Section 6: Nova Plan */}
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
          <div className="flex gap-2 mt-2">
            <Select value={selectedState} onValueChange={setSelectedState}>
              <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="red">Red</SelectItem>
                <SelectItem value="yellow">Yellow</SelectItem>
                <SelectItem value="green">Green</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" onClick={() => setDayState.mutate({ studentId, dayState: selectedState })} disabled={setDayState.isPending}>
              Generate Plan
            </Button>
            {d.bops_programming_active ? (
              <Button size="sm" variant="outline" onClick={() => deactivateProg.mutate({ studentId })}>
                <Pause className="w-3.5 h-3.5 mr-1" /> Pause
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => activateProg.mutate({ studentId })}>
                <Play className="w-3.5 h-3.5 mr-1" /> Activate
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Section 7: Beacon Snapshot */}
      {(d.beacon_day_state || d.beacon_teacher_summary) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Beacon Snapshot</CardTitle>
            <CardDescription>Teacher/Implementation view — does not override clinical data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-3 items-center">
              {d.beacon_day_state && <Badge className={`${dayStateColors[d.beacon_day_state]} text-xs`}>{d.beacon_day_state}</Badge>}
              {d.beacon_state_date && <span className="text-xs text-muted-foreground">{d.beacon_state_date}</span>}
            </div>
            {d.beacon_teacher_summary && (
              <div className="text-xs bg-muted/50 rounded p-2">{d.beacon_teacher_summary}</div>
            )}
            {d.beacon_targets && Array.isArray(d.beacon_targets) && d.beacon_targets.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {d.beacon_targets.map((t: string, i: number) => <Badge key={i} variant="outline" className="text-xs">{t}</Badge>)}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Section 8: MTSS Snapshot */}
      {d.latest_mtss_tier && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">MTSS Snapshot</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              <KV label="Tier" value={d.latest_mtss_tier} />
              <KV label="Status" value={d.latest_mtss_status} />
              <KV label="Primary Goal" value={d.latest_mtss_primary_goal} />
              <KV label="Interventions" value={d.latest_mtss_intervention_count} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
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
