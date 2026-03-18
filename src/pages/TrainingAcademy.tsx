/**
 * Training Academy — Role-based training modules linked to demo tenant scenarios.
 */

import { useState } from 'react';
import { GraduationCap, BookOpen, CheckCircle2, Circle, Clock, Users, CreditCard, School, Heart, Shield, Briefcase, Play, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';

interface TrainingTrack {
  id: string;
  label: string;
  icon: any;
  audience: string;
  modules: TrainingModule[];
}

interface TrainingModule {
  id: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  lessons: string[];
  demoLearners: string[];
  status: 'not_started' | 'in_progress' | 'completed';
}

const TRAINING_TRACKS: TrainingTrack[] = [
  {
    id: 'supervisor',
    label: 'Supervisor / BCBA',
    icon: Users,
    audience: 'BCBAs, Clinical Directors, Supervisors',
    modules: [
      {
        id: 'sup-nav',
        title: 'Core Navigation & Demo Overview',
        description: 'Learn the app layout, dashboard, and demo workspace navigation',
        estimatedMinutes: 10,
        lessons: ['App layout tour', 'Dashboard widgets', 'Demo tenant overview', 'Role-specific views'],
        demoLearners: ['All learners'],
        status: 'not_started',
      },
      {
        id: 'sup-profile',
        title: 'Learner Profile & Data Review',
        description: 'Navigate learner charts, view clinical history, and review data',
        estimatedMinutes: 15,
        lessons: ['Profile overview', 'Clinical tabs', 'Behavior trends', 'Assessment history'],
        demoLearners: ['Daniel Foster', 'Ava Thompson'],
        status: 'not_started',
      },
      {
        id: 'sup-notes',
        title: 'Session, Narrative & Supervision Notes',
        description: 'Create, review, and approve clinical documentation',
        estimatedMinutes: 20,
        lessons: ['Session note workflow', 'Narrative notes', 'Supervision notes', 'Review/approval queue', 'AI-generated drafts'],
        demoLearners: ['Ava Thompson', 'Isabella Martinez'],
        status: 'not_started',
      },
      {
        id: 'sup-assess',
        title: 'Assessment Dashboard & Review',
        description: 'Send, track, and review assessments across sources',
        estimatedMinutes: 15,
        lessons: ['Assessment dashboard', 'Send assessments', 'Review teacher/caregiver forms', 'Score summaries', 'Recommendations'],
        demoLearners: ['Lila Johnson', 'Mason Rivera'],
        status: 'not_started',
      },
      {
        id: 'sup-fba',
        title: 'FBA/BIP Workflows',
        description: 'Full functional behavior assessment workflow from referral to BIP',
        estimatedMinutes: 25,
        lessons: ['FBA referral', 'Record review', 'Teacher/caregiver interviews', 'ABC data', 'Function hypothesis', 'Recommendations', 'BIP linkage'],
        demoLearners: ['Jayden Kim', 'Mason Rivera'],
        status: 'not_started',
      },
      {
        id: 'sup-teacher-parent',
        title: 'Teacher & Caregiver Data Integration',
        description: 'Review external inputs from teacher and parent apps',
        estimatedMinutes: 15,
        lessons: ['Teacher Data Hub', 'Caregiver summaries', 'Cross-app data sources', 'Data in FBA/assessments'],
        demoLearners: ['Mason Rivera', 'Elijah Brooks', 'Noah Greene'],
        status: 'not_started',
      },
      {
        id: 'sup-alerts',
        title: 'Alerts, Tasks & Oversight',
        description: 'Manage tasks, alerts, and compliance monitoring',
        estimatedMinutes: 10,
        lessons: ['Alert types', 'Task management', 'Overdue documentation', 'Auth warnings'],
        demoLearners: ['Noah Greene', 'Isabella Martinez'],
        status: 'not_started',
      },
    ],
  },
  {
    id: 'billing',
    label: 'Billing',
    icon: CreditCard,
    audience: 'Billing Specialists, Admin',
    modules: [
      {
        id: 'bill-dash',
        title: 'Billing Dashboard Overview',
        description: 'Navigate the billing dashboard and understand key metrics',
        estimatedMinutes: 10,
        lessons: ['Dashboard layout', 'Payer filters', 'Status indicators', 'Quick actions'],
        demoLearners: ['All payer types'],
        status: 'not_started',
      },
      {
        id: 'bill-payers',
        title: 'Understanding Payer Types',
        description: 'Compare insurance, regional center, private pay, and school contracts',
        estimatedMinutes: 15,
        lessons: ['Insurance auths', 'Regional center allocations', 'Private pay invoices', 'School contracts'],
        demoLearners: ['Ava Thompson', 'Elijah Brooks', 'Chloe Patel', 'Mason Rivera'],
        status: 'not_started',
      },
      {
        id: 'bill-claims',
        title: 'Claims, Denials & Blockers',
        description: 'Handle claims lifecycle including denials and documentation blockers',
        estimatedMinutes: 15,
        lessons: ['Claim submission', 'Denied claims', 'Documentation blockers', 'Resolving issues'],
        demoLearners: ['Noah Greene', 'Isabella Martinez'],
        status: 'not_started',
      },
    ],
  },
  {
    id: 'school',
    label: 'School / Teacher Support',
    icon: School,
    audience: 'School-Based BCBAs, Consultants',
    modules: [
      {
        id: 'sch-learners',
        title: 'School Learner Workflows',
        description: 'Manage school-based learners and teacher collaboration',
        estimatedMinutes: 15,
        lessons: ['School caseload', 'Teacher summaries', 'Classroom observations', 'Consult notes'],
        demoLearners: ['Mason Rivera', 'Jayden Kim'],
        status: 'not_started',
      },
      {
        id: 'sch-fba',
        title: 'FBA Support in School Contexts',
        description: 'Run FBA workflows with school-specific data sources',
        estimatedMinutes: 20,
        lessons: ['School FBA referral', 'Teacher interviews', 'Classroom observation', 'IEP support context'],
        demoLearners: ['Jayden Kim', 'Mason Rivera'],
        status: 'not_started',
      },
    ],
  },
  {
    id: 'parent',
    label: 'Caregiver Support',
    icon: Heart,
    audience: 'Staff managing caregiver workflows',
    modules: [
      {
        id: 'par-decoded',
        title: 'Behavior Decoded Overview',
        description: 'Understand how caregiver data flows into the clinical system',
        estimatedMinutes: 10,
        lessons: ['Caregiver data flow', 'Home behavior logs', 'Concern tracking', 'Recommendation feedback'],
        demoLearners: ['Ava Thompson', 'Elijah Brooks', 'Chloe Patel'],
        status: 'not_started',
      },
      {
        id: 'par-training',
        title: 'Parent Training Conversion',
        description: 'Use caregiver data in parent training workflows',
        estimatedMinutes: 15,
        lessons: ['Caregiver summaries review', 'Training focus selection', 'Parent training notes', 'Progress tracking'],
        demoLearners: ['Ava Thompson', 'Elijah Brooks'],
        status: 'not_started',
      },
    ],
  },
  {
    id: 'rbt',
    label: 'RBT',
    icon: Briefcase,
    audience: 'Behavior Technicians',
    modules: [
      {
        id: 'rbt-basics',
        title: 'Assigned Learner Workflows',
        description: 'Navigate assigned learners, sessions, and data entry',
        estimatedMinutes: 15,
        lessons: ['My caseload', 'Session data entry', 'Notes due', 'Task management', 'Progress review'],
        demoLearners: ['Ava Thompson', 'Elijah Brooks'],
        status: 'not_started',
      },
    ],
  },
  {
    id: 'admin',
    label: 'Admin / Operations',
    icon: Shield,
    audience: 'Administrators, Operations Coordinators',
    modules: [
      {
        id: 'adm-overview',
        title: 'Admin Dashboard & Settings',
        description: 'Manage users, permissions, and organizational settings',
        estimatedMinutes: 15,
        lessons: ['User management', 'Permissions', 'Agency settings', 'Compliance alerts', 'Operational metrics'],
        demoLearners: ['All staff'],
        status: 'not_started',
      },
    ],
  },
];

export default function TrainingAcademy() {
  const [selectedTrack, setSelectedTrack] = useState<string>('supervisor');
  const [expandedModule, setExpandedModule] = useState<string | null>(null);

  const activeTrack = TRAINING_TRACKS.find(t => t.id === selectedTrack)!;
  const totalModules = activeTrack.modules.length;
  const completedModules = activeTrack.modules.filter(m => m.status === 'completed').length;
  const progressPct = totalModules > 0 ? (completedModules / totalModules) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <GraduationCap className="w-6 h-6 text-primary" />
          Training Academy
        </h1>
        <p className="text-sm text-muted-foreground">
          Role-based training modules connected to demo learner scenarios
        </p>
      </div>

      {/* Track Selector */}
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

      {/* Track Overview */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-base font-semibold flex items-center gap-2">
                <activeTrack.icon className="w-4 h-4 text-primary" />
                {activeTrack.label} Track
              </h2>
              <p className="text-xs text-muted-foreground">{activeTrack.audience}</p>
            </div>
            <Badge variant="outline" className="text-xs">
              {completedModules}/{totalModules} completed
            </Badge>
          </div>
          <Progress value={progressPct} className="h-2" />
        </CardContent>
      </Card>

      {/* Modules */}
      <div className="space-y-3">
        {activeTrack.modules.map((mod, idx) => {
          const isExpanded = expandedModule === mod.id;
          const StatusIcon = mod.status === 'completed' ? CheckCircle2 : mod.status === 'in_progress' ? Play : Circle;
          const statusColor = mod.status === 'completed' ? 'text-green-500' : mod.status === 'in_progress' ? 'text-blue-500' : 'text-muted-foreground';

          return (
            <Card key={mod.id} className={`transition-colors ${isExpanded ? 'border-primary/50' : ''}`}>
              <button
                className="w-full text-left"
                onClick={() => setExpandedModule(isExpanded ? null : mod.id)}
              >
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
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground mb-1">LESSONS</h4>
                    <div className="space-y-1">
                      {mod.lessons.map((lesson, li) => (
                        <div key={li} className="flex items-center gap-2 text-sm">
                          <Circle className="w-3 h-3 text-muted-foreground" />
                          {lesson}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground mb-1">DEMO LEARNERS</h4>
                    <div className="flex flex-wrap gap-1">
                      {mod.demoLearners.map(name => (
                        <Badge key={name} variant="outline" className="text-[10px]">{name}</Badge>
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
