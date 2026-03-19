import { Users, GraduationCap, FileText, CreditCard, Play, UserCheck, Briefcase, School, Heart, BarChart3, AlertTriangle, Activity, Globe, Trophy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DEMO_BADGE } from './DemoCenterHeader';
import { DemoWalkthroughs } from './DemoWalkthroughs';
import { DemoOnboarding } from './DemoOnboarding';
import { DemoEcosystemViewer } from './DemoEcosystemViewer';
import { DemoDashboardPanel } from './DemoDashboardPanel';
import { DemoClinicalViewer } from './DemoClinicalViewer';
import type { DemoLearner, DemoStaff } from '@/pages/DemoCenter';

const ICON_MAP: Record<string, any> = {
  supervisor: UserCheck, school_consultant: School, midlevel: Users,
  rbt: Heart, billing: CreditCard, operations: Briefcase,
  teacher: GraduationCap, caregiver: Heart,
};

const WORKFLOW_SHORTCUTS = [
  { label: 'School-Based Learner with FBA', icon: School, desc: 'Mason Rivera → teacher data → FBA workflow', learner: 'Mason Rivera' },
  { label: 'Insurance Billing Lifecycle', icon: CreditCard, desc: 'Ava Thompson → auth → claims → units', learner: 'Ava Thompson' },
  { label: 'Expiring Authorization Alert', icon: AlertTriangle, desc: 'Noah Greene → warnings → renewal', learner: 'Noah Greene' },
  { label: 'Parent App Data → Training', icon: Heart, desc: 'Elijah Brooks → caregiver logs → parent training', learner: 'Elijah Brooks' },
  { label: 'Assessment Dashboard', icon: BarChart3, desc: 'Lila Johnson → sent/completed/pending forms', learner: 'Lila Johnson' },
  { label: 'Overdue Documentation', icon: FileText, desc: 'Isabella Martinez → missing notes → blocked billing', learner: 'Isabella Martinez' },
  { label: 'Full FBA Case + BIP', icon: Activity, desc: 'Jayden Kim → interviews + ABC → recommendations', learner: 'Jayden Kim' },
  { label: 'Cross-App Complex Case', icon: Globe, desc: 'Daniel Foster → months of teacher + parent + clinic data', learner: 'Daniel Foster' },
];

interface EcosystemData {
  crossAppInputs: any[];
  sessionNotes: any[];
  assessments: any[];
  billingRecords: any[];
  fbaBips: any[];
  alerts: any[];
  metrics: any[];
  loading: boolean;
}

interface Props {
  tab: string;
  setTab: (t: string) => void;
  learners: DemoLearner[];
  staff: DemoStaff[];
  loading: boolean;
  ecosystem: EcosystemData;
}

export function DemoCenterTabs({ tab, setTab, learners, staff, loading, ecosystem }: Props) {
  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="flex flex-wrap h-auto p-1 gap-1">
        <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
        <TabsTrigger value="dashboard" className="text-xs gap-1"><BarChart3 className="w-3 h-3" /> Dashboard</TabsTrigger>
        <TabsTrigger value="ecosystem" className="text-xs gap-1"><Globe className="w-3 h-3" /> Cross-App</TabsTrigger>
        <TabsTrigger value="clinical" className="text-xs gap-1"><Activity className="w-3 h-3" /> Clinical</TabsTrigger>
        <TabsTrigger value="roles" className="text-xs">By Role</TabsTrigger>
        <TabsTrigger value="learners" className="text-xs">By Learner</TabsTrigger>
        <TabsTrigger value="workflows" className="text-xs">By Workflow</TabsTrigger>
        <TabsTrigger value="payers" className="text-xs">By Payer</TabsTrigger>
        <TabsTrigger value="walkthroughs" className="text-xs">Walkthroughs</TabsTrigger>
        <TabsTrigger value="progress" className="text-xs gap-1"><Trophy className="w-3 h-3" /> Progress</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-4 mt-4">
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { label: 'Cross-App Ecosystem', desc: `${ecosystem.crossAppInputs.length} inputs from teacher apps, parent apps, and clinician entries`, icon: Globe, tab: 'ecosystem' },
            { label: 'Live Dashboard', desc: `${ecosystem.metrics.length} metrics · ${ecosystem.alerts.filter((a: any) => a.status === 'active').length} active alerts`, icon: BarChart3, tab: 'dashboard' },
            { label: 'Clinical Records', desc: `${ecosystem.sessionNotes.length} notes · ${ecosystem.assessments.length} assessments · ${ecosystem.fbaBips.length} FBA/BIPs`, icon: Activity, tab: 'clinical' },
            { label: 'Explore by Role', desc: `${staff.length} staff personas across supervisor, billing, school, RBT, and more`, icon: Users, tab: 'roles' },
            { label: 'Explore by Learner', desc: `${learners.length} distinct learner scenarios across settings and payers`, icon: GraduationCap, tab: 'learners' },
            { label: 'Guided Walkthroughs', desc: `Flexible scenario-based explorations of key workflows`, icon: Play, tab: 'walkthroughs' },
          ].map(c => (
            <Card key={c.label} className="cursor-pointer hover:border-primary transition-colors" onClick={() => setTab(c.tab)}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <c.icon className="w-4 h-4 text-primary" /> {c.label}
                </CardTitle>
              </CardHeader>
              <CardContent><p className="text-xs text-muted-foreground">{c.desc}</p></CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {[
            { val: learners.length, label: 'Demo Learners' },
            { val: staff.length, label: 'Demo Staff' },
            { val: ecosystem.crossAppInputs.length, label: 'Cross-App Inputs' },
            { val: ecosystem.sessionNotes.length, label: 'Session Notes' },
            { val: ecosystem.billingRecords.length, label: 'Billing Records' },
            { val: ecosystem.alerts.filter((a: any) => a.status === 'active').length, label: 'Active Alerts' },
          ].map(s => (
            <Card key={s.label}><CardContent className="pt-4 pb-3"><div className="text-2xl font-bold">{s.val}</div><p className="text-xs text-muted-foreground">{s.label}</p></CardContent></Card>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="dashboard" className="mt-4">
        <DemoDashboardPanel metrics={ecosystem.metrics} alerts={ecosystem.alerts} />
      </TabsContent>

      <TabsContent value="ecosystem" className="mt-4">
        <DemoEcosystemViewer inputs={ecosystem.crossAppInputs} learners={learners} />
      </TabsContent>

      <TabsContent value="clinical" className="mt-4">
        <DemoClinicalViewer
          sessionNotes={ecosystem.sessionNotes}
          assessments={ecosystem.assessments}
          fbaBips={ecosystem.fbaBips}
          billingRecords={ecosystem.billingRecords}
          learners={learners}
          staff={staff}
        />
      </TabsContent>

      {/* ── Existing tabs preserved ────────────────────────── */}

      <TabsContent value="roles" className="mt-4">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {staff.map(s => {
            const Icon = ICON_MAP[s.persona_type] || Users;
            const useCases = s.profile_data?.use_cases as string[] | undefined;
            return (
              <Card key={s.id} className="hover:border-primary/50 transition-colors cursor-pointer">
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <DEMO_BADGE />
                    {s.credential && <Badge variant="secondary" className="text-[10px]">{s.credential}</Badge>}
                  </div>
                  <p className="text-sm font-medium">{s.display_name}</p>
                  <p className="text-xs text-muted-foreground">{s.role_label}</p>
                  {useCases && useCases.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {useCases.slice(0, 3).map(u => (
                        <Badge key={u} variant="outline" className="text-[9px]">{u}</Badge>
                      ))}
                      {useCases.length > 3 && <Badge variant="outline" className="text-[9px]">+{useCases.length - 3}</Badge>}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </TabsContent>

      <TabsContent value="learners" className="mt-4">
        <div className="space-y-2">
          {learners.map((l, i) => {
            const sd = l.scenario_data || {};
            const alerts = sd.core_data?.alerts as string[] | undefined;
            const trainingPurpose = sd.training_purpose as string[] | undefined;
            return (
              <Card key={l.id} className="hover:border-primary/50 transition-colors cursor-pointer">
                <CardContent className="py-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{l.learner_name}</span>
                        <DEMO_BADGE />
                        <Badge variant="outline" className="text-[10px]">{l.funding_source}</Badge>
                        {l.grade && <Badge variant="secondary" className="text-[10px]">Grade {l.grade}</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Age {l.age} · {l.setting} · {l.diagnosis}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        BCBA: {l.assigned_bcba} {l.assigned_rbt ? `· RBT: ${l.assigned_rbt}` : ''} · Caregiver: {l.caregiver_name}
                      </p>
                      {alerts && alerts.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {alerts.map(a => (
                            <Badge key={a} variant="destructive" className="text-[9px]">
                              <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />{a}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {trainingPurpose && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {trainingPurpose.map(t => (
                            <Badge key={t} variant="outline" className="text-[9px] bg-accent text-accent-foreground">{t}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </TabsContent>

      <TabsContent value="workflows" className="mt-4">
        <div className="grid sm:grid-cols-2 gap-3">
          {WORKFLOW_SHORTCUTS.map(wf => (
            <Card key={wf.label} className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardContent className="py-4 flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <wf.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{wf.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{wf.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="payers" className="mt-4">
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { label: 'Insurance', desc: learners.filter(l => l.funding_source.toLowerCase().includes('insurance')).map(l => l.learner_name).join(', '), icon: CreditCard, color: 'text-primary' },
            { label: 'Regional Center', desc: learners.filter(l => l.funding_source.toLowerCase().includes('regional')).map(l => l.learner_name).join(', '), icon: FileText, color: 'text-primary' },
            { label: 'Private Pay', desc: learners.filter(l => l.funding_source.toLowerCase().includes('private')).map(l => l.learner_name).join(', '), icon: Briefcase, color: 'text-primary' },
            { label: 'School Contracts', desc: learners.filter(l => l.funding_source.toLowerCase().includes('school')).map(l => l.learner_name).join(', '), icon: School, color: 'text-primary' },
          ].map(p => (
            <Card key={p.label} className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardContent className="py-4 flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <p.icon className={`w-5 h-5 ${p.color}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{p.label}</span>
                    <DEMO_BADGE />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{p.desc || 'No learners'}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="walkthroughs" className="mt-4">
        <DemoWalkthroughs />
      </TabsContent>

      <TabsContent value="progress" className="mt-4">
        <DemoOnboarding />
      </TabsContent>
    </Tabs>
  );
}
