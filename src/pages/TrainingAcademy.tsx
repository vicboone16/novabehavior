/**
 * Training Academy — Role-based training modules linked to demo tenant scenarios.
 */

import { useState } from 'react';
import { GraduationCap, BookOpen, CheckCircle2, Circle, Clock, Users, CreditCard, School, Heart, Shield, Briefcase, Play, ChevronRight, Target, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';

interface TrainingModule {
  id: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  lessons: { title: string; demoPath?: string }[];
  demoLearners: string[];
  status: 'not_started' | 'in_progress' | 'completed';
  learningObjective: string;
}

interface TrainingTrack {
  id: string;
  label: string;
  icon: any;
  audience: string;
  modules: TrainingModule[];
}

const TRAINING_TRACKS: TrainingTrack[] = [
  {
    id: 'supervisor', label: 'Supervisor / BCBA', icon: Users,
    audience: 'BCBAs, Clinical Directors, Supervisors',
    modules: [
      {
        id: 'sup-nav', title: 'Core Navigation & Demo Overview',
        description: 'Learn the app layout, dashboard, and demo workspace navigation',
        learningObjective: 'Navigate the platform confidently and understand the demo tenant structure',
        estimatedMinutes: 10,
        lessons: [
          { title: 'App layout tour', demoPath: '/dashboard' },
          { title: 'Dashboard widgets overview' },
          { title: 'Demo tenant structure and learners', demoPath: '/demo-center' },
          { title: 'Role-specific views and filtering' },
        ],
        demoLearners: ['All learners'], status: 'not_started',
      },
      {
        id: 'sup-profile', title: 'Learner Profile & Data Review',
        description: 'Navigate learner charts, view clinical history, and review cross-app data',
        learningObjective: 'Access and interpret learner profiles with data from multiple apps',
        estimatedMinutes: 15,
        lessons: [
          { title: 'Profile overview and tabs' },
          { title: 'Clinical history review' },
          { title: 'Behavior trends and data visualization' },
          { title: 'Cross-app data sources (teacher + parent)' },
        ],
        demoLearners: ['Daniel Foster', 'Ava Thompson'], status: 'not_started',
      },
      {
        id: 'sup-notes', title: 'Clinical Documentation Workflows',
        description: 'Create, review, and approve session, narrative, and supervision notes',
        learningObjective: 'Complete the full note lifecycle from creation through supervisor approval',
        estimatedMinutes: 20,
        lessons: [
          { title: 'Session note creation and data entry' },
          { title: 'Narrative notes and clinical summaries' },
          { title: 'Supervision note workflow' },
          { title: 'Review and approval queue' },
          { title: 'AI-generated draft review' },
        ],
        demoLearners: ['Ava Thompson', 'Isabella Martinez'], status: 'not_started',
      },
      {
        id: 'sup-assess', title: 'Assessment Dashboard & Review',
        description: 'Send, track, and review assessments across teacher and caregiver sources',
        learningObjective: 'Manage the full assessment lifecycle and interpret results',
        estimatedMinutes: 15,
        lessons: [
          { title: 'Assessment dashboard overview' },
          { title: 'Sending assessments to teachers/caregivers' },
          { title: 'Reviewing completed forms and scores' },
          { title: 'Generating and reviewing recommendations' },
        ],
        demoLearners: ['Lila Johnson', 'Mason Rivera'], status: 'not_started',
      },
      {
        id: 'sup-fba', title: 'FBA/BIP Workflows',
        description: 'Full functional behavior assessment from referral to BIP recommendations',
        learningObjective: 'Complete an FBA workflow using multi-source data including teacher and caregiver interviews',
        estimatedMinutes: 25,
        lessons: [
          { title: 'FBA referral and record review' },
          { title: 'Teacher and caregiver interviews' },
          { title: 'ABC data collection and analysis' },
          { title: 'Function hypothesis generation' },
          { title: 'Recommendations and BIP linkage' },
        ],
        demoLearners: ['Jayden Kim', 'Mason Rivera'], status: 'not_started',
      },
      {
        id: 'sup-crossapp', title: 'Cross-App Data Integration',
        description: 'Review and use teacher app and Behavior Decoded data in clinical workflows',
        learningObjective: 'Trace data from external apps into clinical decisions',
        estimatedMinutes: 15,
        lessons: [
          { title: 'Teacher Data Hub and source labels' },
          { title: 'Caregiver summaries from Behavior Decoded' },
          { title: 'Using caregiver data in parent training' },
          { title: 'Teacher data in FBA and school consults' },
        ],
        demoLearners: ['Mason Rivera', 'Elijah Brooks', 'Noah Greene'], status: 'not_started',
      },
      {
        id: 'sup-alerts', title: 'Alerts, Tasks & Oversight',
        description: 'Manage clinical and operational alerts, tasks, and compliance',
        learningObjective: 'Identify and resolve alerts, manage task queues',
        estimatedMinutes: 10,
        lessons: [
          { title: 'Alert types and severity' },
          { title: 'Task management and assignment' },
          { title: 'Overdue documentation tracking' },
          { title: 'Authorization expiration warnings' },
        ],
        demoLearners: ['Noah Greene', 'Isabella Martinez'], status: 'not_started',
      },
      {
        id: 'sup-billing', title: 'Billing Awareness for Supervisors',
        description: 'Understand how clinical documentation impacts billing',
        learningObjective: 'Recognize documentation blockers and auth impacts on revenue',
        estimatedMinutes: 10,
        lessons: [
          { title: 'How notes affect billing' },
          { title: 'Authorization impact on services' },
          { title: 'Documentation blockers and denied claims' },
        ],
        demoLearners: ['Noah Greene', 'Isabella Martinez', 'Ava Thompson'], status: 'not_started',
      },
    ],
  },
  {
    id: 'billing', label: 'Billing', icon: CreditCard,
    audience: 'Billing Specialists, Admin',
    modules: [
      {
        id: 'bill-dash', title: 'Billing Dashboard Overview',
        description: 'Navigate the billing dashboard and understand key metrics',
        learningObjective: 'Read and interpret billing dashboard data across payer types',
        estimatedMinutes: 10,
        lessons: [
          { title: 'Dashboard layout and filters' },
          { title: 'Payer type indicators' },
          { title: 'Status colors and quick actions' },
        ],
        demoLearners: ['All payer types'], status: 'not_started',
      },
      {
        id: 'bill-payers', title: 'Payer Type Comparison',
        description: 'Compare insurance, regional center, private pay, and school contract workflows side by side',
        learningObjective: 'Identify and manage the four payer workflow differences',
        estimatedMinutes: 20,
        lessons: [
          { title: 'Insurance authorizations and unit tracking' },
          { title: 'Regional center allocations and utilization' },
          { title: 'Private pay invoicing and payments' },
          { title: 'School contract billing and summaries' },
        ],
        demoLearners: ['Ava Thompson', 'Elijah Brooks', 'Chloe Patel', 'Mason Rivera'], status: 'not_started',
      },
      {
        id: 'bill-claims', title: 'Claims, Denials & Blockers',
        description: 'Handle the claims lifecycle including denials and documentation blockers',
        learningObjective: 'Resolve denied claims and documentation-related billing blockers',
        estimatedMinutes: 15,
        lessons: [
          { title: 'Claim submission workflow' },
          { title: 'Denied claims — reasons and resolution' },
          { title: 'Documentation blockers' },
          { title: 'Working with supervisors on missing notes' },
        ],
        demoLearners: ['Noah Greene', 'Isabella Martinez'], status: 'not_started',
      },
      {
        id: 'bill-auth', title: 'Authorization Management',
        description: 'Track, renew, and manage service authorizations',
        learningObjective: 'Proactively manage authorization lifecycles across payers',
        estimatedMinutes: 15,
        lessons: [
          { title: 'Auth periods and unit calculations' },
          { title: 'Expiration alerts and renewal workflow' },
          { title: 'Unit exhaustion handling' },
        ],
        demoLearners: ['Ava Thompson', 'Noah Greene'], status: 'not_started',
      },
    ],
  },
  {
    id: 'school', label: 'School Support', icon: School,
    audience: 'School-Based BCBAs, Consultants',
    modules: [
      {
        id: 'sch-learners', title: 'School Learner Workflows',
        description: 'Manage school-based caseloads with teacher collaboration',
        learningObjective: 'Navigate school caseload, review teacher data, and create consult notes',
        estimatedMinutes: 15,
        lessons: [
          { title: 'School caseload view' },
          { title: 'Teacher summaries and review' },
          { title: 'Classroom observation documentation' },
          { title: 'School consult note creation' },
        ],
        demoLearners: ['Mason Rivera', 'Jayden Kim'], status: 'not_started',
      },
      {
        id: 'sch-fba', title: 'FBA in School Contexts',
        description: 'Run FBA workflows using school-specific data sources including teacher interviews',
        learningObjective: 'Complete a school-based FBA using teacher app data and classroom observations',
        estimatedMinutes: 20,
        lessons: [
          { title: 'School FBA referral process' },
          { title: 'Teacher interviews from Teacher App' },
          { title: 'Classroom observation data' },
          { title: 'IEP support context' },
          { title: 'School-specific recommendations' },
        ],
        demoLearners: ['Jayden Kim', 'Mason Rivera'], status: 'not_started',
      },
    ],
  },
  {
    id: 'parent', label: 'Caregiver Support', icon: Heart,
    audience: 'Staff managing caregiver workflows',
    modules: [
      {
        id: 'par-decoded', title: 'Behavior Decoded Overview',
        description: 'How caregiver data flows from Behavior Decoded into clinical workflows',
        learningObjective: 'Trace caregiver input from home logs to clinical use in Core',
        estimatedMinutes: 10,
        lessons: [
          { title: 'Caregiver data flow architecture' },
          { title: 'Home behavior logs and summaries' },
          { title: 'Concern tracking over time' },
          { title: 'Recommendation feedback loop' },
        ],
        demoLearners: ['Ava Thompson', 'Elijah Brooks', 'Chloe Patel'], status: 'not_started',
      },
      {
        id: 'par-training', title: 'Parent Training Conversion',
        description: 'Convert caregiver observations into parent training plans and notes',
        learningObjective: 'Use Behavior Decoded data to create effective parent training sessions',
        estimatedMinutes: 15,
        lessons: [
          { title: 'Reviewing caregiver summaries' },
          { title: 'Selecting training focus from patterns' },
          { title: 'Parent training note creation' },
          { title: 'Tracking training progress' },
        ],
        demoLearners: ['Ava Thompson', 'Elijah Brooks'], status: 'not_started',
      },
    ],
  },
  {
    id: 'rbt', label: 'RBT', icon: Briefcase,
    audience: 'Behavior Technicians',
    modules: [
      {
        id: 'rbt-basics', title: 'Assigned Learner Workflows',
        description: 'Navigate assigned learners, sessions, data entry, and task management',
        learningObjective: 'Complete a typical RBT session workflow from data entry to note submission',
        estimatedMinutes: 15,
        lessons: [
          { title: 'My caseload and assigned learners' },
          { title: 'Session data entry' },
          { title: 'Notes due and submission' },
          { title: 'Task management' },
          { title: 'Progress review basics' },
        ],
        demoLearners: ['Ava Thompson', 'Elijah Brooks'], status: 'not_started',
      },
      {
        id: 'rbt-escalation', title: 'Escalation & Follow-up',
        description: 'When and how to escalate concerns and follow up on supervisor feedback',
        learningObjective: 'Appropriately escalate concerns and respond to supervisor notes',
        estimatedMinutes: 10,
        lessons: [
          { title: 'Identifying escalation triggers' },
          { title: 'Documenting concerns' },
          { title: 'Following up on supervisor feedback' },
        ],
        demoLearners: ['Noah Greene'], status: 'not_started',
      },
    ],
  },
  {
    id: 'admin', label: 'Admin / Operations', icon: Shield,
    audience: 'Administrators, Operations Coordinators',
    modules: [
      {
        id: 'adm-overview', title: 'Admin Dashboard & Settings',
        description: 'Manage users, permissions, compliance, and organizational settings',
        learningObjective: 'Configure and manage the organizational environment',
        estimatedMinutes: 15,
        lessons: [
          { title: 'User management and permissions' },
          { title: 'Agency settings configuration' },
          { title: 'Compliance alerts and documentation tracking' },
          { title: 'Operational metrics and reporting' },
        ],
        demoLearners: ['All staff'], status: 'not_started',
      },
      {
        id: 'adm-scheduling', title: 'Scheduling & Staffing',
        description: 'Manage staff assignments, scheduling, and documentation compliance',
        learningObjective: 'Coordinate staffing changes and track documentation compliance',
        estimatedMinutes: 10,
        lessons: [
          { title: 'Staff roster and assignments' },
          { title: 'Schedule management' },
          { title: 'Missing documentation alerts' },
        ],
        demoLearners: ['All staff'], status: 'not_started',
      },
    ],
  },
];

export default function TrainingAcademy() {
  const [selectedTrack, setSelectedTrack] = useState('supervisor');
  const [expandedModule, setExpandedModule] = useState<string | null>(null);

  const activeTrack = TRAINING_TRACKS.find(t => t.id === selectedTrack)!;
  const totalModules = activeTrack.modules.length;
  const completedModules = activeTrack.modules.filter(m => m.status === 'completed').length;
  const progressPct = totalModules > 0 ? (completedModules / totalModules) * 100 : 0;
  const totalMinutes = activeTrack.modules.reduce((sum, m) => sum + m.estimatedMinutes, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <GraduationCap className="w-6 h-6 text-primary" />
          Training Academy
        </h1>
        <p className="text-sm text-muted-foreground">Role-based training modules connected to demo learner scenarios</p>
      </div>

      <Tabs value={selectedTrack} onValueChange={setSelectedTrack}>
        <TabsList className="flex flex-wrap h-auto p-1 gap-1">
          {TRAINING_TRACKS.map(track => (
            <TabsTrigger key={track.id} value={track.id} className="text-xs gap-1">
              <track.icon className="w-3 h-3" />
              {track.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-base font-semibold flex items-center gap-2">
                <activeTrack.icon className="w-4 h-4 text-primary" />
                {activeTrack.label} Track
              </h2>
              <p className="text-xs text-muted-foreground">{activeTrack.audience} · ~{totalMinutes} min total</p>
            </div>
            <Badge variant="outline" className="text-xs">{completedModules}/{totalModules} completed</Badge>
          </div>
          <Progress value={progressPct} className="h-2" />
        </CardContent>
      </Card>

      <div className="space-y-3">
        {activeTrack.modules.map((mod, idx) => {
          const isExpanded = expandedModule === mod.id;
          const StatusIcon = mod.status === 'completed' ? CheckCircle2 : mod.status === 'in_progress' ? Play : Circle;
          const statusColor = mod.status === 'completed' ? 'text-green-500' : mod.status === 'in_progress' ? 'text-blue-500' : 'text-muted-foreground';

          return (
            <Card key={mod.id} className={`transition-colors ${isExpanded ? 'border-primary/50' : ''}`}>
              <button className="w-full text-left" onClick={() => setExpandedModule(isExpanded ? null : mod.id)}>
                <CardContent className="py-4 flex items-start gap-3">
                  <div className="flex items-center gap-2 shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-muted-foreground w-5">{idx + 1}</span>
                    <StatusIcon className={`w-4 h-4 ${statusColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{mod.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{mod.description}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {mod.estimatedMinutes} min
                      </span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <BookOpen className="w-3 h-3" /> {mod.lessons.length} lessons
                      </span>
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </CardContent>
              </button>
              {isExpanded && (
                <div className="px-6 pb-4 border-t pt-3 space-y-3">
                  <div className="flex items-start gap-2 bg-muted/30 rounded-lg p-2.5">
                    <Target className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                    <p className="text-xs text-muted-foreground"><strong>Objective:</strong> {mod.learningObjective}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground mb-1.5">LESSONS</h4>
                    <div className="space-y-1.5">
                      {mod.lessons.map((lesson, li) => (
                        <div key={li} className="flex items-center gap-2 text-sm">
                          <Circle className="w-3 h-3 text-muted-foreground shrink-0" />
                          <span>{lesson.title}</span>
                          {lesson.demoPath && (
                            <Badge variant="outline" className="text-[9px] ml-auto">Demo link</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground mb-1.5">DEMO LEARNERS</h4>
                    <div className="flex flex-wrap gap-1">
                      {mod.demoLearners.map(name => (
                        <Badge key={name} variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">{name}</Badge>
                      ))}
                    </div>
                  </div>
                  <Button size="sm" className="mt-2">
                    <Play className="w-3 h-3 mr-1" /> Start Module
                  </Button>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
