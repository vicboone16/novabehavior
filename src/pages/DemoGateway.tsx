/**
 * Demo Gateway — the polished front door to the demo ecosystem.
 * Route: /demo
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, GraduationCap, ArrowRight, Play, BookOpen,
  CreditCard, School, Heart, AlertTriangle, Activity,
  BarChart3, Globe, FlaskConical, UserCheck, Briefcase,
  MessageCircle, HelpCircle, FileText, Shield, Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useDemoMode } from '@/contexts/DemoModeContext';

const QUICK_STARTS = [
  { label: 'Understand a Learner', desc: 'Daniel Foster — full clinical history', icon: Users, path: '/demo-center', tab: 'learners' },
  { label: 'Teacher → Clinical Flow', desc: 'Mason Rivera — school-based FBA', icon: School, path: '/demo-center', tab: 'workflows' },
  { label: 'Parent → Training Flow', desc: 'Ava Thompson — caregiver data driving notes', icon: Heart, path: '/demo-center', tab: 'workflows' },
  { label: 'Assessment System', desc: 'Lila Johnson — sent, completed, pending', icon: BarChart3, path: '/demo-center', tab: 'clinical' },
  { label: 'Billing Comparison', desc: 'Multi-payer view across learners', icon: CreditCard, path: '/demo-center', tab: 'payers' },
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

export default function DemoGateway() {
  const navigate = useNavigate();
  const { enterDemoMode, isDemoMode } = useDemoMode();

  useEffect(() => {
    if (!isDemoMode) enterDemoMode();
  }, [isDemoMode, enterDemoMode]);

  const goToTab = (tab: string) => {
    navigate('/demo-center');
    // Use sessionStorage to pass tab selection
    sessionStorage.setItem('demo-center-tab', tab);
  };

  return (
    <div className="space-y-8">
      {/* ── Sticky Demo Banner ── */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-amber-600" />
          <span className="text-sm font-medium text-amber-900">
            You are in Demo Mode — all data shown is simulated.
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-amber-700 border-amber-300 hover:bg-amber-100"
          onClick={() => {
            navigate('/');
          }}
        >
          Exit Demo
        </Button>
      </div>

      {/* ── Hero ── */}
      <div className="text-center space-y-3 pt-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-100 mb-2">
          <FlaskConical className="w-8 h-8 text-amber-700" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Explore the System</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Navigate real workflows across clinical, school, caregiver, and billing systems.
          All data is simulated — explore freely.
        </p>
      </div>

      {/* ── 4 Core Cards ── */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Card 1: Explore by Learner */}
        <Card className="group hover:border-primary/50 transition-all hover:shadow-md cursor-pointer" onClick={() => goToTab('learners')}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Explore by Learner</CardTitle>
                <CardDescription className="text-xs">See real client scenarios with full history and data</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button size="sm" className="gap-1 mt-1">
              View Learners <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </CardContent>
        </Card>

        {/* Card 2: Explore by Role */}
        <Card className="group hover:border-primary/50 transition-all hover:shadow-md">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Explore by Role</CardTitle>
                <CardDescription className="text-xs">Experience the platform as different personas</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {ROLE_BUTTONS.map(r => (
                <Button key={r.label} variant="outline" size="sm" className="gap-1 text-xs" onClick={() => goToTab('roles')}>
                  <r.icon className="w-3.5 h-3.5" /> {r.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Explore by Workflow */}
        <Card className="group hover:border-primary/50 transition-all hover:shadow-md">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Play className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Explore by Workflow</CardTitle>
                <CardDescription className="text-xs">Follow key processes from start to finish</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {WORKFLOW_BUTTONS.map(w => (
                <Button key={w.label} variant="outline" size="sm" className="gap-1 text-xs" onClick={() => goToTab('workflows')}>
                  <w.icon className="w-3.5 h-3.5" /> {w.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Training & Help */}
        <Card className="group hover:border-primary/50 transition-all hover:shadow-md">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Training & Help</CardTitle>
                <CardDescription className="text-xs">Learn how to use the system step-by-step</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => navigate('/training-academy')}>
                <GraduationCap className="w-3.5 h-3.5" /> Training Academy
              </Button>
              <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => navigate('/help-center')}>
                <HelpCircle className="w-3.5 h-3.5" /> Help Center
              </Button>
              <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => navigate('/demo-center')}>
                <FileText className="w-3.5 h-3.5" /> Feature Glossary
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Quick Start Paths ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h2 className="text-lg font-semibold">Start Here</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {QUICK_STARTS.map(qs => (
            <Card
              key={qs.label}
              className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-sm"
              onClick={() => goToTab(qs.tab)}
            >
              <CardContent className="py-4 flex flex-col gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <qs.icon className="w-4 h-4 text-primary" />
                </div>
                <p className="text-sm font-medium leading-tight">{qs.label}</p>
                <p className="text-xs text-muted-foreground">{qs.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* ── Footer ── */}
      <Separator />
      <p className="text-xs text-muted-foreground text-center pb-4">
        Demo data resets regularly. No real client information is used.
      </p>

      {/* ── Floating Ask Nova Button ── */}
      <Button
        className="fixed bottom-6 right-6 z-40 shadow-lg gap-2 rounded-full px-5 h-12"
        onClick={() => navigate('/ask-nova')}
      >
        <MessageCircle className="w-5 h-5" />
        Ask Nova
      </Button>
    </div>
  );
}
