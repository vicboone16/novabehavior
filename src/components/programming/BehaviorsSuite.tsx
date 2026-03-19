import { useState } from 'react';
import { Activity, Lightbulb, BarChart3, ClipboardCheck, Clock, Plus } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StudentBehaviorsOverview } from '@/components/StudentBehaviorsOverview';
import { StudentBxPlanView, BehaviorInterventionsPicker } from '@/components/behavior-interventions';
import { TOILog } from '@/components/toi/TOILog';
import { useDataStore } from '@/store/dataStore';
import { HistoricalDataEntry } from '@/components/HistoricalDataEntry';
import { HistoricalDataManager } from '@/components/HistoricalDataManager';
import { GoalSuggestionEnginePanel } from '@/components/optimization/GoalSuggestionEnginePanel';

type BehaviorTab = 'behaviors' | 'interventions' | 'data' | 'review' | 'context';

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
    sessions,
    behaviorGoals 
  } = useDataStore();
  
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
        <TabsList className="flex w-full gap-1 h-auto p-1 overflow-x-auto scrollbar-hide">
          <TabsTrigger value="behaviors" className="flex items-center gap-1.5 text-xs whitespace-nowrap">
            <Activity className="w-3.5 h-3.5" />
            Behaviors & Goals
          </TabsTrigger>
          <TabsTrigger value="interventions" className="flex items-center gap-1.5 text-xs whitespace-nowrap">
            <Lightbulb className="w-3.5 h-3.5" />
            Interventions
          </TabsTrigger>
          <TabsTrigger value="data" className="flex items-center gap-1.5 text-xs whitespace-nowrap">
            <BarChart3 className="w-3.5 h-3.5" />
            Data Entry
          </TabsTrigger>
          <TabsTrigger value="review" className="flex items-center gap-1.5 text-xs whitespace-nowrap">
            <ClipboardCheck className="w-3.5 h-3.5" />
            Progress Review
          </TabsTrigger>
          <TabsTrigger value="context" className="flex items-center gap-1.5 text-xs whitespace-nowrap">
            <Clock className="w-3.5 h-3.5" />
            Context Log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="behaviors" className="mt-4 space-y-4">
          <StudentBehaviorsOverview
            studentId={student.id}
            studentName={student.name}
            studentColor={student.color}
            behaviors={student.behaviors}
            frequencyEntries={studentFrequency}
            durationEntries={studentDuration}
            abcEntries={studentABC}
            intervalEntries={studentIntervals}
            sessions={sessions}
            historicalData={student.historicalData?.frequencyEntries || []}
            dataCollectionStartDate={student.dataCollectionStartDate}
            behaviorGoals={studentGoals}
          />
          
          {/* Goal Suggestion Engine — below graphs, above behavior details */}
          <GoalSuggestionEnginePanel studentId={studentId} surface="programming" />
        </TabsContent>

        <TabsContent value="interventions" className="mt-4 space-y-4">
          <StudentBxPlanView 
            studentId={student.id}
            studentName={student.name}
          />
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Add from Library</CardTitle>
              <CardDescription>
                Search and add interventions directly to {studentName}'s profile
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BehaviorInterventionsPicker 
                preSelectedStudentId={student.id}
                compact
                hideHeader
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="mt-4 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div />
            <HistoricalDataManager studentId={student.id} />
          </div>
          <HistoricalDataEntry student={student} />
          
          {/* Data Summary */}
          <Card>
            <CardHeader>
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

        <TabsContent value="review" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Behavior Review</CardTitle>
              <CardDescription>
                Review behavior goals, mastery criteria, and progress toward targets
              </CardDescription>
            </CardHeader>
            <CardContent>
              {studentGoals.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No behavior goals configured. Add goals from the Behaviors tab to track progress.
                </p>
              ) : (
                <div className="space-y-3">
                  {studentGoals.map((goal) => {
                    const behavior = student.behaviors.find(b => b.id === goal.behaviorId);
                    return (
                      <div key={goal.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{behavior?.name || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">
                              {goal.direction === 'increase' ? '↑' : goal.direction === 'decrease' ? '↓' : '→'}{' '}
                              {goal.metric}{goal.targetValue !== undefined ? ` to ${goal.targetValue}` : ''}
                            </p>
                          </div>
                          {goal.isMastered && (
                            <span className="text-xs font-medium text-primary">✓ Mastered</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="context" className="mt-4">
          <TOILog studentId={studentId} studentName={studentName} isAdmin={false} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
