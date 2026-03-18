/**
 * Guided but flexible demo walkthroughs — scenario-based, not rigid step-by-step.
 */

import { useState } from 'react';
import { Play, ChevronRight, Lightbulb, ArrowRight, Eye, Users, School, Heart, BarChart3, Search, CreditCard, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DEMO_BADGE } from './DemoCenterHeader';

interface Walkthrough {
  id: string;
  title: string;
  goal: string;
  learners: string[];
  icon: any;
  steps: string[];
  insight: string;
  tryNext: string[];
}

const WALKTHROUGHS: Walkthrough[] = [
  {
    id: 'supervisor-overview',
    title: 'Understand a Learner from Top to Bottom',
    goal: 'See a fully lived-in case with months of clinical, school, and caregiver data',
    learners: ['Daniel Foster'],
    icon: Eye,
    steps: [
      'Open learner profile',
      'Scroll through notes history',
      'Check caregiver + teacher inputs',
      'View supervision notes',
      'Look at trends and historical data',
    ],
    insight: 'Everything in the system connects back to the learner.',
    tryNext: ['View billing for this learner', 'Compare with a newer learner (Lila Johnson)'],
  },
  {
    id: 'teacher-flow',
    title: 'From Classroom Concern to Clinical Action',
    goal: 'Show how teacher app data flows into core and becomes clinical decisions',
    learners: ['Mason Rivera'],
    icon: School,
    steps: [
      'Open teacher summaries',
      'Review classroom concerns',
      'Open related consult note',
      'View recommendations',
    ],
    insight: 'Teacher input directly shapes intervention planning.',
    tryNext: ['View FBA details', 'Compare caregiver input'],
  },
  {
    id: 'parent-training',
    title: 'Turning Home Data into Parent Training',
    goal: 'Show how Behavior Decoded logs become parent training plans',
    learners: ['Ava Thompson'],
    icon: Heart,
    steps: [
      'Open caregiver summaries',
      'Review home behavior logs',
      'Open parent training note',
      'See how data informed coaching',
    ],
    insight: "Caregiver input isn't just stored — it's used.",
    tryNext: ['Review assessment history', 'Compare with Elijah Brooks'],
  },
  {
    id: 'assessment-lifecycle',
    title: 'From Assessment to Recommendation',
    goal: 'See the full assessment lifecycle end-to-end',
    learners: ['Lila Johnson'],
    icon: BarChart3,
    steps: [
      'Open assessment dashboard',
      'View completed vs pending forms',
      'Open score results',
      'Review recommendations',
    ],
    insight: "Assessments drive decision-making — not just data collection.",
    tryNext: ['Check which assessments are pending', 'Review teacher/caregiver form sources'],
  },
  {
    id: 'fba-deep-dive',
    title: 'Understanding Behavior at Its Core',
    goal: 'Walk through a complete FBA using multi-source data',
    learners: ['Jayden Kim'],
    icon: Search,
    steps: [
      'Open FBA section',
      'Review teacher + caregiver interviews',
      'Check ABC logs and observations',
      'View function hypothesis',
      'Review BIP-linked recommendations',
    ],
    insight: 'Multiple data sources combine to explain behavior.',
    tryNext: ['Compare with Mason Rivera school FBA', 'Review linked BIP interventions'],
  },
  {
    id: 'billing-comparison',
    title: 'Compare How Billing Works',
    goal: 'See side-by-side differences across all four payer types',
    learners: ['Ava Thompson', 'Elijah Brooks', 'Chloe Patel', 'Mason Rivera'],
    icon: CreditCard,
    steps: [
      'Open billing dashboard',
      'Compare insurance auths and claims',
      'Compare regional center utilization',
      'Review private pay invoices',
      'Check school contract billing',
    ],
    insight: 'Each payer works differently — but the system unifies them.',
    tryNext: ['Review denied claim example', 'Check expiring authorization'],
  },
  {
    id: 'alerts-reality',
    title: 'What Needs Attention Right Now',
    goal: 'See how the system surfaces real problems and priorities',
    learners: ['Noah Greene', 'Isabella Martinez'],
    icon: AlertTriangle,
    steps: [
      'Open alerts panel',
      'Review expiring authorization',
      'Check overdue notes',
      'View blocked billing items',
    ],
    insight: "The system helps you catch what's falling through.",
    tryNext: ['Resolve a documentation blocker', 'Review task assignment workflow'],
  },
];

interface Props {
  onClose?: () => void;
}

export function DemoWalkthroughs({ onClose }: Props) {
  const [activeWalkthrough, setActiveWalkthrough] = useState<string | null>(null);
  const active = WALKTHROUGHS.find(w => w.id === activeWalkthrough);

  if (active) {
    return (
      <div className="space-y-4">
        <button onClick={() => setActiveWalkthrough(null)} className="text-sm text-primary hover:underline">
          ← Back to Walkthroughs
        </button>
        <div>
          <div className="flex items-center gap-2 mb-2">
            <active.icon className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold">{active.title}</h2>
          </div>
          <p className="text-sm text-muted-foreground">{active.goal}</p>
          <div className="flex flex-wrap gap-1 mt-2">
            {active.learners.map(l => (
              <Badge key={l} variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                {l}
              </Badge>
            ))}
          </div>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Suggested Steps</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {active.steps.map((step, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                  {i + 1}
                </div>
                <span>{step}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-3 flex items-start gap-2">
            <Lightbulb className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-primary">Key Insight</p>
              <p className="text-sm">{active.insight}</p>
            </div>
          </CardContent>
        </Card>

        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">TRY THIS NEXT</p>
          <div className="space-y-1.5">
            {active.tryNext.map((suggestion, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-primary cursor-pointer hover:underline">
                <ArrowRight className="w-3 h-3" />
                <span>{suggestion}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Play className="w-5 h-5 text-primary" />
          Guided Walkthroughs
        </h2>
        <p className="text-sm text-muted-foreground">
          Flexible explorations — follow the suggestions or explore on your own
        </p>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {WALKTHROUGHS.map(w => (
          <Card key={w.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setActiveWalkthrough(w.id)}>
            <CardContent className="py-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <w.icon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{w.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{w.goal}</p>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {w.learners.map(l => (
                    <Badge key={l} variant="outline" className="text-[9px]">{l}</Badge>
                  ))}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground mt-1" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
