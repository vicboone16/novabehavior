/**
 * Client-Facing Demo — Simplified view for parents, districts, and buyers.
 * Shows learner progress, caregiver input, and summaries without internal complexity.
 */

import { useState } from 'react';
import { Heart, TrendingUp, BookOpen, Users, Star, Shield, ChevronRight, ArrowLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';

interface DemoLearnerSnapshot {
  name: string;
  age: number;
  parentName: string;
  parentEmail: string;
  goals: string[];
  progressPct: number;
  recentUpdates: string[];
  caregiverHighlights: string[];
}

const SAMPLE_LEARNERS: DemoLearnerSnapshot[] = [
  {
    name: 'Ethan Santos',
    age: 7,
    parentName: 'Maria Santos',
    parentEmail: 'demo-maria@behaviordecoded.app',
    goals: ['Improve social communication', 'Reduce challenging behaviors', 'Increase independent daily living skills'],
    progressPct: 68,
    recentUpdates: [
      'Mastered greeting peers independently across 3 settings',
      'Elopement incidents decreased by 40% over 8 weeks',
      'Successfully completed morning routine with visual schedule',
    ],
    caregiverHighlights: [
      'Using visual schedule at home — morning transitions improved',
      'Reports fewer meltdowns during homework time',
    ],
  },
  {
    name: 'Lily Chen',
    age: 5,
    parentName: 'David Chen',
    parentEmail: 'demo-david@behaviordecoded.app',
    goals: ['Expand expressive language', 'Increase play skills', 'Develop self-regulation strategies'],
    progressPct: 55,
    recentUpdates: [
      'Now using 3-word phrases to request preferred items',
      'Engaging in parallel play with peers for 5+ minutes',
      'Beginning to identify emotions using feeling cards',
    ],
    caregiverHighlights: [
      'Practicing emotion labeling during bedtime routine',
      'Using choice boards during meals — fewer refusals',
    ],
  },
  {
    name: 'Marcus Johnson',
    age: 9,
    parentName: 'Aisha Johnson',
    parentEmail: 'demo-aisha@behaviordecoded.app',
    goals: ['Improve classroom behavior', 'Increase on-task duration', 'Develop peer interaction skills'],
    progressPct: 72,
    recentUpdates: [
      'On-task behavior increased from 40% to 65% during math period',
      'Teacher reports improved hand-raising behavior',
      'Successfully participated in group activity with prompting',
    ],
    caregiverHighlights: [
      'Homework completion improving with timer strategy',
      'Initiated conversation with sibling about shared interest',
    ],
  },
  {
    name: 'Sofia Kim',
    age: 6,
    parentName: 'Rachel Kim',
    parentEmail: 'demo-rachel@behaviordecoded.app',
    goals: ['Develop functional communication', 'Reduce tantrums during transitions', 'Build turn-taking skills'],
    progressPct: 48,
    recentUpdates: [
      'Using PECS Phase 3 to request across 2 environments',
      'Transition tantrums reduced from 8/day to 3/day',
      'Tolerated 2-minute wait with visual timer independently',
    ],
    caregiverHighlights: [
      'Practicing PECS at home during snack time',
      'Using first/then board for bath routine — fewer refusals',
    ],
  },
  {
    name: 'Amara Okafor',
    age: 8,
    parentName: 'James Okafor',
    parentEmail: 'demo-james@behaviordecoded.app',
    goals: ['Increase emotional vocabulary', 'Develop coping strategies', 'Improve peer conflict resolution'],
    progressPct: 63,
    recentUpdates: [
      'Identifying 8 emotions on feeling cards with 80% accuracy',
      'Using deep breathing strategy independently 3x this week',
      'Resolved peer disagreement with verbal negotiation (prompted)',
    ],
    caregiverHighlights: [
      'Practicing calm-down corner routine at home',
      'Reports Amara asking for help before escalating',
    ],
  },
];

export default function ClientDemo() {
  const navigate = useNavigate();
  const [selectedLearner, setSelectedLearner] = useState<DemoLearnerSnapshot | null>(null);

  if (selectedLearner) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Button variant="ghost" size="sm" onClick={() => setSelectedLearner(null)} className="gap-1">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>

        <div>
          <h1 className="text-2xl font-bold">{selectedLearner.name}</h1>
          <p className="text-sm text-muted-foreground">Age {selectedLearner.age} · Progress Summary</p>
        </div>

        {/* Progress */}
        <Card>
          <CardContent className="py-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" /> Overall Progress
              </h3>
              <span className="text-sm font-bold text-emerald-600">{selectedLearner.progressPct}%</span>
            </div>
            <Progress value={selectedLearner.progressPct} className="h-2.5" />
          </CardContent>
        </Card>

        {/* Goals */}
        <Card>
          <CardContent className="py-5 space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500" /> Current Goals
            </h3>
            <ul className="space-y-2">
              {selectedLearner.goals.map((g, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                  {g}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Recent Updates */}
        <Card>
          <CardContent className="py-5 space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-500" /> Recent Progress Updates
            </h3>
            <ul className="space-y-2">
              {selectedLearner.recentUpdates.map((u, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 shrink-0" />
                  {u}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Caregiver Highlights */}
        <Card>
          <CardContent className="py-5 space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Heart className="w-4 h-4 text-rose-500" /> Home & Caregiver Highlights
            </h3>
            <ul className="space-y-2">
              {selectedLearner.caregiverHighlights.map((c, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-2 shrink-0" />
                  {c}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* How It Works */}
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="py-5 space-y-2">
            <h3 className="text-sm font-semibold">How does this work?</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              This platform connects clinical providers, schools, and caregivers in one system.
              Progress is tracked through structured data collection, and updates from home and
              school flow directly into the care team's view — ensuring everyone stays aligned.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="text-center space-y-2 py-4">
        <Badge className="bg-primary/10 text-primary border-0 mb-2">Demo Preview</Badge>
        <h1 className="text-2xl font-bold">See How Support Is Tracked</h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Explore how clinical, school, and caregiver data come together to support each learner's growth.
        </p>
      </div>

      <div className="grid gap-4">
        {SAMPLE_LEARNERS.map(learner => (
          <Card
            key={learner.name}
            className="cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => setSelectedLearner(learner)}
          >
            <CardContent className="py-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{learner.name}</p>
                <p className="text-xs text-muted-foreground">Age {learner.age} · {learner.goals.length} active goals</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <Progress value={learner.progressPct} className="h-1.5 flex-1" />
                  <span className="text-xs font-medium text-emerald-600">{learner.progressPct}%</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-muted/30 border-dashed">
        <CardContent className="py-5 text-center space-y-2">
          <Shield className="w-6 h-6 text-muted-foreground mx-auto" />
          <p className="text-xs text-muted-foreground">
            This is a demonstration with simulated data. No real client information is shown.
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button variant="outline" onClick={() => navigate('/demo')}>
          ← Back to Demo Center
        </Button>
      </div>
    </div>
  );
}
