import { useState } from 'react';
import { Activity, BarChart3 } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StudentBxPlanView } from '@/components/behavior-interventions';
import { useDataStore } from '@/store/dataStore';
import { useShallow } from 'zustand/react/shallow';
import { HistoricalDataEntry } from '@/components/HistoricalDataEntry';
import { HistoricalDataManager } from '@/components/HistoricalDataManager';
import { BehaviorDataEditor } from './BehaviorDataEditor';
import { StudentBehaviorMerge } from './StudentBehaviorMerge';
import { GoalSuggestionEnginePanel } from '@/components/optimization/GoalSuggestionEnginePanel';
import { CanonicalStatusBadge } from './CanonicalStatusBadge';

type BehaviorTab = 'behaviors' | 'history';

interface BehaviorsSuiteProps {
  studentId: string;
  studentName: string;
}

export function BehaviorsSuite({ studentId, studentName }: BehaviorsSuiteProps) {
  const [activeTab, setActiveTab] = useState<BehaviorTab>('behaviors');

  const {
    students,
    frequencyEntries,
    durationEntries,
    abcEntries,
    intervalEntries,
    behaviorGoals
  } = useDataStore(useShallow((state) => ({
    students: state.students,
    frequencyEntries: state.frequencyEntries,
    durationEntries: state.durationEntries,
    abcEntries: state.abcEntries,
    intervalEntries: state.intervalEntries,
    behaviorGoals: state.behaviorGoals,
  })));

  const student = students.find(s => s.id === studentId);

  if (!student) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Client not found.
        </CardContent>
      </Card>
    );
  }

  const studentFrequency = frequencyEntries.filter(e => e.studentId === studentId);
  const studentDuration = durationEntries.filter(e => e.studentId === studentId);
  const studentABC = abcEntries.filter(e => e.studentId === studentId);
  const studentIntervals = intervalEntries.filter(e => e.studentId === studentId);
  const studentGoals = behaviorGoals.filter(g => g.studentId === studentId);

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as BehaviorTab)}>
        <TabsList className="h-9 p-1">
          <TabsTrigger value="behaviors" className="flex items-center gap-1.5 text-xs px-3">
            <Activity className="w-3.5 h-3.5" />
            Behaviors &amp; Goals
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-1.5 text-xs px-3">
            <BarChart3 className="w-3.5 h-3.5" />
            Data History
          </TabsTrigger>
        </TabsList>

        {/* ── Behaviors & Goals tab ── */}
        <TabsContent value="behaviors" className="mt-4 space-y-4">
          {/* AI goal suggestions */}
          <GoalSuggestionEnginePanel studentId={studentId} surface="programming" />

          {/* Active goals */}
          {studentGoals.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Goals</CardTitle>
                <CardDescription>
                  Behavior goals with direction and mastery status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {studentGoals.map((goal) => {
                    const behavior = student.behaviors.find(b => b.id === goal.behaviorId);
                    return (
                      <Card key={goal.id} className="border-l-4 border-l-primary/40">
                        <CardContent className="py-3 px-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div>
                                <p className="font-medium text-sm">{behavior?.name || 'Unknown Behavior'}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {goal.direction === 'increase' ? '↑ Increase' : goal.direction === 'decrease' ? '↓ Decrease' : '→ Maintain'}{' '}
                                  {goal.metric}{goal.targetValue !== undefined ? ` to ${goal.targetValue}` : ''}
                                  {goal.baseline !== undefined ? ` (baseline: ${goal.baseline})` : ''}
                                </p>
                              </div>
                              {!behavior && (
                                <CanonicalStatusBadge status="needs_mapping" size="sm" />
                              )}
                            </div>
                            {goal.isMastered ? (
                              <Badge className="bg-emerald-100 text-emerald-800 text-xs">✓ Mastered</Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">Active</Badge>
                            )}
                          </div>
                          {behavior?.operationalDefinition && (
                            <p className="text-xs text-muted-foreground mt-2 italic border-t pt-2">
                              {behavior.operationalDefinition}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Behavior plan */}
          <StudentBxPlanView
            studentId={student.id}
            studentName={student.displayName || student.name}
          />
        </TabsContent>

        {/* ── Data History tab ── */}
        <TabsContent value="history" className="mt-4 space-y-4">
          <div className="flex items-center justify-end gap-2">
            <StudentBehaviorMerge studentId={student.id} studentName={student.displayName || student.name} />
            <BehaviorDataEditor studentId={student.id} studentName={student.displayName || student.name} />
            <HistoricalDataManager studentId={student.id} />
          </div>

          <HistoricalDataEntry student={student} />

          {/* Summary counts */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Data Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-primary">
                    {studentFrequency.reduce((sum, e) => sum + e.count, 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Frequency Events</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-primary">{studentABC.length}</p>
                  <p className="text-xs text-muted-foreground">ABC Entries</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-primary">{studentDuration.length}</p>
                  <p className="text-xs text-muted-foreground">Duration Sessions</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-primary">{studentIntervals.length}</p>
                  <p className="text-xs text-muted-foreground">Interval Records</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
