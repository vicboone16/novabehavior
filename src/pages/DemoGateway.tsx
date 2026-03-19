/**
 * Demo Gateway — polished front door to the demo ecosystem.
 * Route: /demo
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, GraduationCap, ArrowRight, Play, BookOpen,
  CreditCard, School, Heart, AlertTriangle, Activity,
  BarChart3, FlaskConical, UserCheck, Briefcase,
  HelpCircle, FileText, Shield, Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useDemoMode } from '@/contexts/DemoModeContext';
import { DemoSearch } from '@/components/demo-center/DemoSearch';
import { StatusBadge } from '@/components/demo-center/StatusBadge';
import { DemoProgressWidget } from '@/components/demo-center/DemoProgressWidget';
import { AskNovaButton } from '@/components/demo-center/AskNovaButton';

const QUICK_STARTS = [
  { label: 'Understand a Learner', desc: 'Daniel Foster — full clinical history', icon: Users, tab: 'learners' },
  { label: 'Teacher → Clinical Flow', desc: 'Mason Rivera — school-based FBA', icon: School, tab: 'workflows' },
  { label: 'Parent → Training Flow', desc: 'Ava Thompson — caregiver data driving notes', icon: Heart, tab: 'workflows' },
  { label: 'Assessment System', desc: 'Lila Johnson — sent, completed, pending', icon: BarChart3, tab: 'clinical' },
  { label: 'Billing Comparison', desc: 'Multi-payer view across learners', icon: CreditCard, tab: 'payers' },
];

const ROLE_BUTTONS = [
  { label: 'Supervisor', icon: UserCheck },
  { label: 'RBT', icon: Heart },
  { label: 'Billing', icon: CreditCard },
  { label: 'School', icon: School },
  { label: 'Admin', icon: Briefcase },
];

const WORKFLOW_BUTTONS = [
  { label: 'Assessment → FBA', icon: Activity },
  { label: 'Teacher → Clinical', icon: School },
  { label: 'Parent → Training', icon: Heart },
  { label: 'Billing Lifecycle', icon: CreditCard },
  { label: 'Alerts & Tasks', icon: AlertTriangle },
];

const PROGRESS_ITEMS = [
  { key: 'learner', label: 'Explored a learner', completed: false },
  { key: 'role', label: 'Viewed a role persona', completed: false },
  { key: 'workflow', label: 'Followed a workflow', completed: false },
  { key: 'clinical', label: 'Reviewed clinical records', completed: false },
  { key: 'billing', label: 'Explored billing', completed: false },
  { key: 'training', label: 'Started training', completed: false },
  { key: 'help', label: 'Visited help center', completed: false },
];

export default function DemoGateway() {
  const navigate = useNavigate();
  const { enterDemoMode, isDemoMode } = useDemoMode();
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!isDemoMode) enterDemoMode();
  }, [isDemoMode, enterDemoMode]);

  const goToTab = (tab: string) => {
    sessionStorage.setItem('demo-center-tab', tab);
    navigate('/demo-center');
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* ── Demo Banner ── */}
      <div className="bg-demo-banner border border-demo-banner-border rounded-2xl px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-demo-accent" />
          <span className="text-sm font-semibold text-demo-banner-foreground">
            You are in Demo Mode
          </span>
          <StatusBadge variant="demo">DEMO</StatusBadge>
          <span className="text-xs text-demo-banner-foreground/70 hidden sm:inline">
            — all data shown is simulated
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-demo-banner-border text-demo-banner-foreground hover:bg-demo-surface text-xs"
          onClick={() => navigate('/')}
        >
          Exit Demo
        </Button>
      </div>

      {/* ── Hero ── */}
      <div className="text-center space-y-3 pt-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-demo-surface mb-2">
          <FlaskConical className="w-8 h-8 text-demo-accent" />
        </div>
        <h1 className="text-3xl font-display font-bold tracking-tight text-foreground">
          Explore the System
        </h1>
        <p className="text-muted-foreground max-w-xl mx-auto text-sm">
          Navigate real workflows across clinical, school, caregiver, and billing systems.
        </p>
      </div>

      {/* ── Search ── */}
      <DemoSearch value={search} onChange={setSearch} className="max-w-lg mx-auto" />

      {/* ── Layout: Grid + Sidebar ── */}
      <div className="grid lg:grid-cols-[1fr_240px] gap-6">
        <div className="space-y-6">
          {/* ── 4 Core Cards ── */}
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Explore by Learner */}
            <Card className="group hover:border-demo-accent/40 transition-all hover:shadow-md cursor-pointer rounded-2xl" onClick={() => goToTab('learners')}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-demo-surface flex items-center justify-center">
                    <GraduationCap className="w-5 h-5 text-demo-accent" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Explore by Learner</CardTitle>
                    <CardDescription className="text-xs">See real client scenarios with full history</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button size="sm" className="gap-1 mt-1 bg-demo-accent hover:bg-demo-accent/90 text-demo-foreground rounded-xl">
                  View Learners <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </CardContent>
            </Card>

            {/* Explore by Role */}
            <Card className="group hover:border-demo-accent/40 transition-all hover:shadow-md rounded-2xl">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-demo-surface flex items-center justify-center">
                    <Users className="w-5 h-5 text-demo-accent" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Explore by Role</CardTitle>
                    <CardDescription className="text-xs">Experience as different personas</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {ROLE_BUTTONS.map(r => (
                    <Button key={r.label} variant="outline" size="sm" className="gap-1 text-xs rounded-xl" onClick={() => goToTab('roles')}>
                      <r.icon className="w-3.5 h-3.5" /> {r.label}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Explore by Workflow */}
            <Card className="group hover:border-demo-accent/40 transition-all hover:shadow-md rounded-2xl">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-demo-surface flex items-center justify-center">
                    <Play className="w-5 h-5 text-demo-accent" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Explore by Workflow</CardTitle>
                    <CardDescription className="text-xs">Follow key processes end-to-end</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {WORKFLOW_BUTTONS.map(w => (
                    <Button key={w.label} variant="outline" size="sm" className="gap-1 text-xs rounded-xl" onClick={() => goToTab('workflows')}>
                      <w.icon className="w-3.5 h-3.5" /> {w.label}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Training & Help */}
            <Card className="group hover:border-demo-accent/40 transition-all hover:shadow-md rounded-2xl">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-demo-surface flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-demo-accent" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Training & Help</CardTitle>
                    <CardDescription className="text-xs">Learn step-by-step</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" className="gap-1 text-xs rounded-xl" onClick={() => navigate('/training-academy')}>
                    <GraduationCap className="w-3.5 h-3.5" /> Training Academy
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1 text-xs rounded-xl" onClick={() => navigate('/help-center')}>
                    <HelpCircle className="w-3.5 h-3.5" /> Help Center
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1 text-xs rounded-xl" onClick={() => goToTab('overview')}>
                    <FileText className="w-3.5 h-3.5" /> Feature Glossary
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Quick Start Paths ── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-demo-accent" />
              <h2 className="text-lg font-display font-semibold">Start Here</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {QUICK_STARTS.map(qs => (
                <Card
                  key={qs.label}
                  className="cursor-pointer hover:border-demo-accent/40 transition-all hover:shadow-sm rounded-2xl"
                  onClick={() => goToTab(qs.tab)}
                >
                  <CardContent className="py-4 flex flex-col gap-2">
                    <div className="w-8 h-8 rounded-xl bg-demo-surface flex items-center justify-center">
                      <qs.icon className="w-4 h-4 text-demo-accent" />
                    </div>
                    <p className="text-sm font-medium leading-tight">{qs.label}</p>
                    <p className="text-xs text-muted-foreground">{qs.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right Rail: Progress ── */}
        <div className="hidden lg:block">
          <DemoProgressWidget items={PROGRESS_ITEMS} />
        </div>
      </div>

      {/* ── Footer ── */}
      <Separator />
      <p className="text-xs text-muted-foreground text-center pb-4">
        Demo data resets regularly. No real client information is used.
      </p>

      {/* ── Floating Ask Nova ── */}
      <AskNovaButton />
    </div>
  );
}
