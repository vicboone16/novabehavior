/**
 * Gamified onboarding — progress tracking, task list, badges, and completion.
 */

import { useState, useEffect } from 'react';
import { Trophy, CheckCircle2, Circle, Star, BookOpen, School, Heart, CreditCard, Search, AlertTriangle, Users, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';

interface OnboardingTask {
  id: string;
  label: string;
  category: string;
  icon: any;
}

interface OnboardingBadge {
  id: string;
  emoji: string;
  label: string;
  description: string;
  requiredTasks: string[];
}

const TASKS: OnboardingTask[] = [
  { id: 'view-profile', label: 'Open a learner and review their profile', category: 'beginner', icon: Users },
  { id: 'view-notes', label: 'Review notes history for a learner', category: 'beginner', icon: BookOpen },
  { id: 'find-teacher', label: 'Find a teacher summary in Core', category: 'intermediate', icon: School },
  { id: 'find-caregiver', label: 'View caregiver data from Behavior Decoded', category: 'intermediate', icon: Heart },
  { id: 'check-assessment', label: 'Check an assessment result on the dashboard', category: 'intermediate', icon: Search },
  { id: 'explore-fba', label: 'Explore an FBA workflow with ABC data', category: 'advanced', icon: Search },
  { id: 'compare-billing', label: 'Compare billing across payer types', category: 'advanced', icon: CreditCard },
  { id: 'review-alerts', label: 'Review alerts and identify what needs attention', category: 'advanced', icon: AlertTriangle },
];

const BADGES: OnboardingBadge[] = [
  { id: 'clinical-explorer', emoji: '🧠', label: 'Clinical Explorer', description: 'Viewed learner profiles and clinical notes', requiredTasks: ['view-profile', 'view-notes'] },
  { id: 'school-pro', emoji: '🏫', label: 'School Workflow Pro', description: 'Explored teacher data in clinical context', requiredTasks: ['find-teacher'] },
  { id: 'family-expert', emoji: '👩‍👧', label: 'Family Engagement Expert', description: 'Reviewed caregiver data and parent training', requiredTasks: ['find-caregiver'] },
  { id: 'billing-navigator', emoji: '💰', label: 'Billing Navigator', description: 'Compared billing across payer types', requiredTasks: ['compare-billing'] },
  { id: 'fba-investigator', emoji: '🔍', label: 'FBA Investigator', description: 'Explored the full FBA workflow', requiredTasks: ['explore-fba'] },
];

const STORAGE_KEY = 'nova-demo-onboarding';

export function DemoOnboarding() {
  const [completed, setCompleted] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(completed));
  }, [completed]);

  const toggleTask = (taskId: string) => {
    setCompleted(prev =>
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  const progressPct = (completed.length / TASKS.length) * 100;
  const earnedBadges = BADGES.filter(b => b.requiredTasks.every(t => completed.includes(t)));
  const allDone = completed.length === TASKS.length;

  const tasksByCategory = [
    { label: 'Beginner', tasks: TASKS.filter(t => t.category === 'beginner') },
    { label: 'Intermediate', tasks: TASKS.filter(t => t.category === 'intermediate') },
    { label: 'Advanced', tasks: TASKS.filter(t => t.category === 'advanced') },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          Demo Progress
        </h2>
        <p className="text-sm text-muted-foreground">Track your exploration of the platform</p>
      </div>

      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              {completed.length} of {TASKS.length} workflows explored
            </span>
            <Badge variant={allDone ? 'default' : 'outline'} className="text-xs">
              {allDone ? '🎉 Complete!' : `${Math.round(progressPct)}%`}
            </Badge>
          </div>
          <Progress value={progressPct} className="h-2" />
        </CardContent>
      </Card>

      {allDone && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-4 text-center">
            <Sparkles className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="text-sm font-semibold">You've explored the full system!</p>
            <p className="text-xs text-muted-foreground mt-1">You're ready to use it in real workflows.</p>
          </CardContent>
        </Card>
      )}

      {earnedBadges.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground mb-2">BADGES EARNED</h3>
          <div className="flex flex-wrap gap-2">
            {earnedBadges.map(b => (
              <Badge key={b.id} variant="outline" className="text-xs gap-1 py-1 px-2 bg-amber-50 border-amber-200">
                <span>{b.emoji}</span> {b.label}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {BADGES.length > earnedBadges.length && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground mb-2">BADGES TO EARN</h3>
          <div className="flex flex-wrap gap-2">
            {BADGES.filter(b => !earnedBadges.includes(b)).map(b => (
              <Badge key={b.id} variant="outline" className="text-xs gap-1 py-1 px-2 opacity-50">
                <span>{b.emoji}</span> {b.label}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {tasksByCategory.map(cat => (
        <div key={cat.label}>
          <h3 className="text-xs font-semibold text-muted-foreground mb-2">{cat.label.toUpperCase()}</h3>
          <div className="space-y-1.5">
            {cat.tasks.map(task => {
              const isDone = completed.includes(task.id);
              return (
                <button
                  key={task.id}
                  onClick={() => toggleTask(task.id)}
                  className={`w-full text-left flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${
                    isDone ? 'bg-primary/5 border-primary/20' : 'hover:bg-muted/50'
                  }`}
                >
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                  <task.icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className={`text-sm ${isDone ? 'line-through text-muted-foreground' : ''}`}>
                    {task.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {completed.length > 0 && (
        <Button variant="outline" size="sm" onClick={() => setCompleted([])}>
          Reset Progress
        </Button>
      )}
    </div>
  );
}
