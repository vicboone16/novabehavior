import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Download, ArrowLeft, Plus, Edit2, Check, X } from 'lucide-react';
import { useIEPAtAGlance, type IEPGlanceGoal } from '@/hooks/useIEPAtAGlance';
import { format, differenceInYears } from 'date-fns';

interface Props {
  studentId: string;
  onBack?: () => void;
}

const SERVICE_BADGES = ['Speech/language', 'OT', 'PT', 'Counseling', 'ABA/BCBA', 'APE', 'Vision', 'Nursing'];
const SAFETY_FLAGS = ['Elopement risk', 'Aggression', 'Self-injury (SIB)', 'PBSP in place', 'BIP in place', 'Crisis plan'];
const COMM_SYSTEMS = ['Verbal', 'AAC device', 'PECS', 'Sign/gesture', 'Low-tech board'];
const TESTING_ACCOMMODATIONS = ['Extended time (1.5×)', 'Extended time (2×)', 'Separate setting', 'Read aloud', 'Scribe', 'Calculator', 'Breaks as needed'];

function getAge(dob: string | null): string {
  if (!dob) return '';
  try { return `${differenceInYears(new Date(), new Date(dob))}yr`; } catch { return ''; }
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  try { return format(new Date(d), 'MM/dd/yyyy'); } catch { return '—'; }
}

function getGoalProgressPct(goal: IEPGlanceGoal): number {
  if (goal.status === 'mastered') return 100;
  if (goal.status === 'draft') return 5;
  if (goal.narrative_summary?.toLowerCase().includes('making progress')) return 60;
  if (goal.narrative_summary?.toLowerCase().includes('insufficient')) return 25;
  if (goal.last_progress_update) return 40;
  return 10;
}

function getProgressLabel(goal: IEPGlanceGoal): string {
  if (goal.status === 'mastered') return 'Mastered';
  if (goal.status === 'draft') return 'New goal';
  if (goal.narrative_summary?.toLowerCase().includes('making progress')) return 'Making progress';
  if (goal.narrative_summary?.toLowerCase().includes('insufficient')) return 'Insufficient progress';
  if (goal.last_progress_update) return `Last reviewed ${fmtDate(goal.last_progress_update)}`;
  return 'New goal';
}

export function IEPAtAGlance({ studentId, onBack }: Props) {
  const { student, goals, supports, services, evals, loading } = useIEPAtAGlance(studentId);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedFlags, setSelectedFlags] = useState<string[]>([]);
  const [selectedComm, setSelectedComm] = useState<string[]>([]);
  const [selectedAccomm, setSelectedAccomm] = useState<string[]>([]);
  const [lreSetting, setLreSetting] = useState('');
  const [supplementaryAids, setSupplementaryAids] = useState('');
  const [instructionalMods, setInstructionalMods] = useState('');
  const [healthNotes, setHealthNotes] = useState('');
  const [strengths, setStrengths] = useState('');
  const [staffNotes, setStaffNotes] = useState('');
  const [teamMembers, setTeamMembers] = useState<Record<string, string>>({});
  const [progressDates, setProgressDates] = useState<Record<string, string>>({});

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!student) {
    return <div className="text-center py-12 text-muted-foreground">No student data found</div>;
  }

  const name = student.display_name || `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'Unknown';
  const dob = student.dob || student.date_of_birth;
  const age = getAge(dob);
  const activeGoals = goals.filter(g => g.status === 'active' || g.status === 'draft');
  const accommodations = supports.filter(s => s.item_type === 'accommodation');
  const modifications = supports.filter(s => s.item_type === 'modification');

  // Auto-populate services from data
  const dataServices = services.map(s => s.service_line);
  const allServices = [...new Set([...selectedServices, ...dataServices])];

  const toggleItem = (list: string[], setList: (v: string[]) => void, item: string) => {
    setList(list.includes(item) ? list.filter(i => i !== item) : [...list, item]);
  };

  const handleDownload = () => {
    // Build a simple text-based export for now
    const lines = [
      `IEP AT A GLANCE — ${name}`,
      `DOB: ${fmtDate(dob)} · ${age}   Grade: ${student.grade || '—'}   Disability: ${student.diagnosis_cluster || '—'}`,
      `IEP Date: ${fmtDate(student.iep_date)}   Next Review: ${fmtDate(student.next_iep_review_date)}`,
      `School: ${student.school_name || '—'}`,
      '',
      '=== ANNUAL GOALS ===',
      ...activeGoals.map((g, i) => [
        `Goal ${i + 1} — ${g.goal_area} (${g.responsible_provider_role || 'Assign'})`,
        g.goal_text,
        `Baseline: ${g.baseline_summary || '—'}   Target: ${g.target_criteria || '—'}   Method: ${g.measurement_type}`,
        `Progress: ${getProgressLabel(g)}`,
        '',
      ]).flat(),
      '=== ACCOMMODATIONS ===',
      ...accommodations.map(a => `• ${a.custom_title || '—'}`),
      ...selectedAccomm.map(a => `• ${a}`),
      '',
      '=== SERVICES ===',
      ...allServices.map(s => `• ${s}`),
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `IEP_At_A_Glance_${name.replace(/\s+/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ScrollArea className="h-[calc(100vh-120px)]">
      <div className="max-w-4xl mx-auto space-y-4 p-4">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
          )}
          <Button size="sm" onClick={handleDownload} className="gap-1 ml-auto">
            <Download className="w-4 h-4" /> Download
          </Button>
        </div>

        {/* STUDENT HEADER */}
        <Card className="border-border">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">IEP At a Glance</p>
                <h1 className="text-xl font-bold text-foreground">{name}</h1>
              </div>
              <div className="flex gap-2">
                {student.iep_date && <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Active IEP</Badge>}
                {student.primary_setting === 'school' && <Badge className="bg-blue-100 text-blue-700 border-blue-200">ESY eligible</Badge>}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs uppercase text-muted-foreground font-medium">DOB / Age</p>
                <p className="font-medium">{fmtDate(dob)} · {age}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground font-medium">Grade</p>
                <p className="font-medium">{student.grade || '—'}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground font-medium">Disability Category</p>
                <p className="font-medium">{student.diagnosis_cluster || '—'}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs uppercase text-muted-foreground font-medium">IEP Date (Annual)</p>
                <p className="font-medium">{fmtDate(student.iep_date)}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground font-medium">Next Review</p>
                <p className="font-medium">{fmtDate(student.next_iep_review_date)}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground font-medium">Triennial / Re-eval Due</p>
                <Input
                  type="date"
                  className="h-7 text-sm mt-0.5"
                  value={progressDates.triennial || ''}
                  onChange={e => setProgressDates(p => ({ ...p, triennial: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs uppercase text-muted-foreground font-medium">Case Manager</p>
                <Input className="h-7 text-sm mt-0.5" placeholder="Enter name" value={teamMembers.caseManager || ''} onChange={e => setTeamMembers(p => ({ ...p, caseManager: e.target.value }))} />
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground font-medium">BCBA</p>
                <Input className="h-7 text-sm mt-0.5" placeholder="Enter name" value={teamMembers.bcba || ''} onChange={e => setTeamMembers(p => ({ ...p, bcba: e.target.value }))} />
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground font-medium">School / Placement</p>
                <p className="font-medium">{student.school_name || '—'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PLACEMENT & SERVICES + ALERTS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Placement & Services */}
          <Card>
            <CardContent className="p-5 space-y-3">
              <SectionHeader color="bg-blue-500" title="Placement & Services" />
              <div>
                <p className="text-xs uppercase text-muted-foreground font-medium">LRE / Setting</p>
                <Input className="h-7 text-sm mt-0.5" placeholder="e.g. SDC · 80% sped, 20% gen ed" value={lreSetting} onChange={e => setLreSetting(e.target.value)} />
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground font-medium mb-1.5">Related Services</p>
                <div className="flex flex-wrap gap-1.5">
                  {SERVICE_BADGES.map(s => (
                    <Badge
                      key={s}
                      variant={allServices.includes(s) ? 'default' : 'outline'}
                      className="cursor-pointer text-xs"
                      onClick={() => toggleItem(selectedServices, setSelectedServices, s)}
                    >
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground font-medium">Supplementary Aids / Supports</p>
                <Textarea className="text-sm mt-0.5 min-h-[60px]" placeholder="e.g. preferred seating, visual schedule, 1:1 aide during instruction…" value={supplementaryAids} onChange={e => setSupplementaryAids(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          {/* Alerts & Considerations */}
          <Card>
            <CardContent className="p-5 space-y-3">
              <SectionHeader color="bg-amber-500" title="Alerts & Considerations" />
              <div>
                <p className="text-xs uppercase text-muted-foreground font-medium">Health / Medical</p>
                <Textarea className="text-sm mt-0.5 min-h-[50px]" placeholder="Allergies, seizure protocol, medications, feeding plan…" value={healthNotes} onChange={e => setHealthNotes(e.target.value)} />
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground font-medium mb-1.5">Behavioral / Safety Flags</p>
                <div className="flex flex-wrap gap-1.5">
                  {SAFETY_FLAGS.map(f => (
                    <Badge
                      key={f}
                      variant={selectedFlags.includes(f) ? 'default' : 'outline'}
                      className="cursor-pointer text-xs"
                      onClick={() => toggleItem(selectedFlags, setSelectedFlags, f)}
                    >
                      {f}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground font-medium mb-1.5">Communication System</p>
                <div className="flex flex-wrap gap-1.5">
                  {COMM_SYSTEMS.map(c => (
                    <Badge
                      key={c}
                      variant={selectedComm.includes(c) ? 'default' : 'outline'}
                      className="cursor-pointer text-xs"
                      onClick={() => toggleItem(selectedComm, setSelectedComm, c)}
                    >
                      {c}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ANNUAL GOALS */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <SectionHeader color="bg-emerald-500" title="Annual Goals" />
            {activeGoals.length > 0 ? activeGoals.map((goal, i) => (
              <GoalCard key={goal.id} goal={goal} index={i + 1} />
            )) : (
              <p className="text-sm text-muted-foreground py-4 text-center">No active IEP goals. Add goals from the IEP Goals manager.</p>
            )}
            {/* Placeholder for adding more */}
            <div className="border border-dashed border-border rounded-lg p-4 text-sm text-muted-foreground">
              <p className="font-medium">Goal {activeGoals.length + 1} — Add area</p>
              <p className="text-xs">Click to add goal text…</p>
              <div className="grid grid-cols-4 gap-4 mt-2 text-xs uppercase text-muted-foreground">
                <span>Baseline</span><span>Target</span><span>Current</span><span>Method</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ACCOMMODATIONS & KEY DATES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-5 space-y-3">
              <SectionHeader color="bg-amber-500" title="Accommodations & Modifications" />
              <div>
                <p className="text-xs uppercase text-muted-foreground font-medium mb-1.5">Testing Accommodations</p>
                <div className="flex flex-wrap gap-1.5">
                  {TESTING_ACCOMMODATIONS.map(a => (
                    <Badge
                      key={a}
                      variant={selectedAccomm.includes(a) ? 'default' : 'outline'}
                      className="cursor-pointer text-xs"
                      onClick={() => toggleItem(selectedAccomm, setSelectedAccomm, a)}
                    >
                      {a}
                    </Badge>
                  ))}
                </div>
              </div>
              {accommodations.length > 0 && (
                <div>
                  <p className="text-xs uppercase text-muted-foreground font-medium mb-1">From Student Profile</p>
                  <div className="flex flex-wrap gap-1.5">
                    {accommodations.map(a => (
                      <Badge key={a.id} variant="secondary" className="text-xs">{a.custom_title}</Badge>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs uppercase text-muted-foreground font-medium">Instructional Modifications</p>
                <Textarea className="text-sm mt-0.5 min-h-[60px]" placeholder="e.g. reduced workload, modified curriculum level, visual supports…" value={instructionalMods} onChange={e => setInstructionalMods(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 space-y-3">
              <SectionHeader color="bg-red-500" title="Key Dates & Team" />
              <div className="grid grid-cols-3 gap-3 text-sm">
                {['IEP Annual', 'Progress Report 1', 'Progress Report 2', 'Progress Report 3', 'Progress Report 4', 'Transition Plan Due'].map(label => (
                  <div key={label}>
                    <p className="text-[10px] uppercase text-muted-foreground font-medium">{label}</p>
                    <Input
                      type="date"
                      className="h-7 text-xs mt-0.5"
                      value={progressDates[label] || (label === 'IEP Annual' ? student.iep_date || '' : '')}
                      onChange={e => setProgressDates(p => ({ ...p, [label]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
              <Separator />
              <div className="space-y-2 text-sm">
                <p className="text-xs uppercase text-muted-foreground font-medium">IEP Team</p>
                {['General Ed Teacher', 'Sped Teacher', 'Speech Therapist', 'OT', 'Parent / Guardian'].map(role => (
                  <div key={role} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-32 shrink-0">{role}</span>
                    <Input className="h-7 text-xs flex-1" placeholder="Enter name" value={teamMembers[role] || ''} onChange={e => setTeamMembers(p => ({ ...p, [role]: e.target.value }))} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* STRENGTHS & NOTES */}
        <Card>
          <CardContent className="p-5 space-y-3">
            <SectionHeader color="bg-blue-500" title="Strengths, Preferences & Additional Notes" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs uppercase text-muted-foreground font-medium">Strengths & Motivators</p>
                <Textarea className="text-sm mt-0.5 min-h-[70px]" placeholder="What this student is good at, what motivates them, reinforcers that work…" value={strengths} onChange={e => setStrengths(e.target.value)} />
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground font-medium">Staff Notes / Things to Know</p>
                <Textarea className="text-sm mt-0.5 min-h-[70px]" placeholder="Triggers, sensory needs, transition warnings, end-of-day routine…" value={staffNotes} onChange={e => setStaffNotes(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}

function SectionHeader({ color, title }: { color: string; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
      <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">{title}</h3>
    </div>
  );
}

function GoalCard({ goal, index }: { goal: IEPGlanceGoal; index: number }) {
  const pct = getGoalProgressPct(goal);
  const label = getProgressLabel(goal);

  return (
    <div className="border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <p className="font-semibold text-sm">Goal {index} — {goal.goal_area}</p>
        {goal.responsible_provider_role && (
          <Badge variant="outline" className="text-xs">{goal.responsible_provider_role}</Badge>
        )}
      </div>
      <p className="text-sm text-muted-foreground">{goal.goal_text}</p>
      <div className="grid grid-cols-4 gap-4 text-xs">
        <div>
          <p className="uppercase text-muted-foreground font-medium">Baseline</p>
          <p className="font-medium mt-0.5">{goal.baseline_summary || '—'}</p>
        </div>
        <div>
          <p className="uppercase text-muted-foreground font-medium">Target</p>
          <p className="font-medium mt-0.5">{goal.target_criteria || '—'}</p>
        </div>
        <div>
          <p className="uppercase text-muted-foreground font-medium">Current</p>
          <p className="font-medium mt-0.5">—</p>
        </div>
        <div>
          <p className="uppercase text-muted-foreground font-medium">Method</p>
          <p className="font-medium mt-0.5">{goal.measurement_type || '—'}</p>
        </div>
      </div>
      <div>
        <p className="text-xs uppercase text-muted-foreground font-medium mb-1">Progress</p>
        <Progress value={pct} className="h-2" />
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
      </div>
    </div>
  );
}
