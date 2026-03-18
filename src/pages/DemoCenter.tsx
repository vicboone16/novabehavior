/**
 * Demo Center — Entry point for the master demo tenant ecosystem.
 * Explore by role, learner, workflow, or payer type.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, GraduationCap, FileText, CreditCard, Shield, Play, BookOpen, FlaskConical, UserCheck, Briefcase, School, Heart, BarChart3, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const DEMO_BADGE = () => (
  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 text-[10px] font-bold">
    DEMO
  </Badge>
);

const DEMO_STAFF = [
  { name: 'Victoria Lane, BCBA', role: 'Clinical Director', icon: UserCheck },
  { name: 'Marcus Hill, BCBA', role: 'School-Based Consultant', icon: School },
  { name: 'Elena Ruiz', role: 'Midlevel Supervisor', icon: Users },
  { name: 'Jasmine Carter, RBT', role: 'Behavior Technician', icon: Heart },
  { name: 'Natalie Chen', role: 'Billing Specialist', icon: CreditCard },
  { name: 'Priya Singh', role: 'Scheduler / Operations', icon: Briefcase },
  { name: 'Jordan Alvarez', role: 'Teacher User', icon: GraduationCap },
  { name: 'Alicia Romero', role: 'Parent User', icon: Heart },
];

const DEMO_LEARNERS = [
  { name: 'Mason Rivera', age: 8, setting: 'School', payer: 'School Contract', purpose: 'Teacher app, school consult, FBA/BIP, IEP support' },
  { name: 'Ava Thompson', age: 5, setting: 'Clinic + Home', payer: 'Insurance', purpose: 'Direct sessions, parent training, SOAP notes' },
  { name: 'Elijah Brooks', age: 6, setting: 'Home-based', payer: 'Regional Center', purpose: 'Parent app, caregiver input, utilization' },
  { name: 'Chloe Patel', age: 9, setting: 'Clinic consult', payer: 'Private Pay', purpose: 'Invoices, coaching, simpler workflow' },
  { name: 'Noah Greene', age: 7, setting: 'School + Home', payer: 'Insurance', purpose: 'Expiring auth, alerts, cross-app concerns' },
  { name: 'Isabella Martinez', age: 10, setting: 'Clinic + School', payer: 'Insurance', purpose: 'Overdue docs, compliance, blocked billing' },
  { name: 'Jayden Kim', age: 11, setting: 'School', payer: 'School Contract', purpose: 'FBA-heavy, teacher+parent interviews, BIP' },
  { name: 'Lila Johnson', age: 4, setting: 'Early intervention', payer: 'Insurance', purpose: 'Assessment dashboard showcase' },
  { name: 'Daniel Foster', age: 13, setting: 'Multi-setting', payer: 'Insurance + School', purpose: 'Long-term complex, trend-rich' },
  { name: 'Sophia Evans', age: 12, setting: 'Former clinic/home', payer: 'Private Pay (closed)', purpose: 'Discharged/archived case' },
];

const WORKFLOW_SHORTCUTS = [
  { label: 'School-Based Learner with FBA', icon: School, desc: 'Mason Rivera → teacher data → FBA workflow' },
  { label: 'Insurance Billing Lifecycle', icon: CreditCard, desc: 'Ava Thompson → auth → claims → units' },
  { label: 'Expiring Authorization Alert', icon: AlertTriangle, desc: 'Noah Greene → warnings → renewal' },
  { label: 'Parent App Data → Training', icon: Heart, desc: 'Elijah Brooks → caregiver logs → parent training' },
  { label: 'Assessment Dashboard', icon: BarChart3, desc: 'Lila Johnson → sent/completed/pending forms' },
  { label: 'Overdue Documentation', icon: FileText, desc: 'Isabella Martinez → missing notes → blocked billing' },
];

export default function DemoCenter() {
  const [tab, setTab] = useState('overview');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
          <FlaskConical className="w-6 h-6 text-amber-700" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Demo Center</h1>
            <DEMO_BADGE />
          </div>
          <p className="text-sm text-muted-foreground">
            Nova Behavioral Collaborative — a fully lived-in demo ecosystem
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.open('/help-center', '_self')}>
          <BookOpen className="w-4 h-4 mr-1" /> Help Center
        </Button>
      </div>

      {/* Agency Info Banner */}
      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-900">This is a demo workspace</p>
              <p className="text-xs text-amber-700 mt-0.5">
                All data is fake and isolated from live tenants. School, clinic, home, and multi-payer workflows are represented.
                Records are clearly labeled DEMO throughout.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex flex-wrap h-auto p-1 gap-1">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="roles" className="text-xs">By Role</TabsTrigger>
          <TabsTrigger value="learners" className="text-xs">By Learner</TabsTrigger>
          <TabsTrigger value="workflows" className="text-xs">By Workflow</TabsTrigger>
          <TabsTrigger value="payers" className="text-xs">By Payer</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setTab('roles')}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" /> Explore by Role
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Supervisor, billing, school, admin, RBT, or caregiver views</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setTab('learners')}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-primary" /> Explore by Learner
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">10 distinct learner scenarios across settings and payers</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setTab('workflows')}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Play className="w-4 h-4 text-primary" /> Explore by Workflow
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Guided shortcuts into specific demo scenarios</p>
              </CardContent>
            </Card>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card><CardContent className="pt-4 pb-3"><div className="text-2xl font-bold">10</div><p className="text-xs text-muted-foreground">Demo Learners</p></CardContent></Card>
            <Card><CardContent className="pt-4 pb-3"><div className="text-2xl font-bold">8</div><p className="text-xs text-muted-foreground">Demo Staff</p></CardContent></Card>
            <Card><CardContent className="pt-4 pb-3"><div className="text-2xl font-bold">4</div><p className="text-xs text-muted-foreground">Payer Types</p></CardContent></Card>
            <Card><CardContent className="pt-4 pb-3"><div className="text-2xl font-bold">3</div><p className="text-xs text-muted-foreground">Connected Apps</p></CardContent></Card>
          </div>
        </TabsContent>

        <TabsContent value="roles" className="mt-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {DEMO_STAFF.map(staff => (
              <Card key={staff.name} className="hover:border-primary/50 transition-colors cursor-pointer">
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <staff.icon className="w-4 h-4 text-primary" />
                    </div>
                    <DEMO_BADGE />
                  </div>
                  <p className="text-sm font-medium">{staff.name}</p>
                  <p className="text-xs text-muted-foreground">{staff.role}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="learners" className="mt-4">
          <div className="space-y-2">
            {DEMO_LEARNERS.map((learner, i) => (
              <Card key={learner.name} className="hover:border-primary/50 transition-colors cursor-pointer">
                <CardContent className="py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{learner.name}</span>
                      <DEMO_BADGE />
                      <Badge variant="outline" className="text-[10px]">{learner.payer}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Age {learner.age} · {learner.setting} · {learner.purpose}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
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
              { label: 'Insurance', desc: 'Ava Thompson, Noah Greene, Isabella Martinez, Lila Johnson, Daniel Foster', icon: CreditCard },
              { label: 'Regional Center', desc: 'Elijah Brooks — home-based services, utilization tracking', icon: FileText },
              { label: 'Private Pay', desc: 'Chloe Patel, Sophia Evans — invoices, payments, simpler auths', icon: Briefcase },
              { label: 'School Contracts', desc: 'Mason Rivera, Jayden Kim — district billing, consult totals', icon: School },
            ].map(p => (
              <Card key={p.label} className="hover:border-primary/50 transition-colors cursor-pointer">
                <CardContent className="py-4 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <p.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{p.label}</p>
                      <DEMO_BADGE />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{p.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
