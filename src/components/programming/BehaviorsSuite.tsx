import { useState } from 'react';
import { Activity, Lightbulb, BarChart3, Clock, Target, Columns3 } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { StudentBxPlanView, BehaviorInterventionsPicker } from '@/components/behavior-interventions';
import { TOILog } from '@/components/toi/TOILog';
import { useDataStore } from '@/store/dataStore';
import { useShallow } from 'zustand/react/shallow';
import { HistoricalDataEntry } from '@/components/HistoricalDataEntry';
import { HistoricalDataManager } from '@/components/HistoricalDataManager';
import { BehaviorDataEditor } from './BehaviorDataEditor';
import { StudentBehaviorMerge } from './StudentBehaviorMerge';
import { GoalSuggestionEnginePanel } from '@/components/optimization/GoalSuggestionEnginePanel';
import { CanonicalStatusBadge } from './CanonicalStatusBadge';
import { BopsTagChips } from './BopsTagChips';
import type { ProgrammingMode } from './ProgrammingModule';

type BehaviorTab = 'behaviors' | 'interventions' | 'data' | 'context';

interface BehaviorsSuiteProps {
  studentId: string;
  studentName: string;
  mode?: ProgrammingMode;
  onModeChange?: (mode: ProgrammingMode) => void;
}

export function BehaviorsSuite({ studentId, studentName, mode, onModeChange }: BehaviorsSuiteProps) {
  const [activeTab, setActiveTab] = useState<BehaviorTab>('behaviors');
  
  const { 
    students, 
    frequencyEntries, 
    durationEntries, 
    abcEntries, 
    intervalEntries, 
    sessions,
    behaviorGoals 
  } = useDataStore(useShallow((state) => ({
    students: state.students,
    frequencyEntries: state.frequencyEntries,
    durationEntries: state.durationEntries,
    abcEntries: state.abcEntries,
    intervalEntries: state.intervalEntries,
    sessions: state.sessions,
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
        <div className="flex items-center gap-2 w-full">
          {/* Programming label */}
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide shrink-0">Programming</span>
          
          <TabsList className="flex flex-1 justify-center gap-1 h-auto p-1 overflow-x-auto scrollbar-hide">
            <TabsTrigger value="behaviors" className="flex items-center gap-1 text-xs whitespace-nowrap px-2">
              <Activity className="w-3.5 h-3.5" />
              Behaviors & Goals
            </TabsTrigger>
            <TabsTrigger value="interventions" className="flex items-center gap-1 text-xs whitespace-nowrap px-2">
              <Lightbulb className="w-3.5 h-3.5" />
              Interventions
            </TabsTrigger>
            <TabsTrigger value="data" className="flex items-center gap-1 text-xs whitespace-nowrap px-2">
              <BarChart3 className="w-3.5 h-3.5" />
              Data Entry
            </TabsTrigger>
            <TabsTrigger value="context" className="flex items-center gap-1 text-xs whitespace-nowrap px-2">
              <Clock className="w-3.5 h-3.5" />
              Context Log
            </TabsTrigger>
          </TabsList>

          {/* Skills / Behaviors / Both toggle on the right */}
          {mode && onModeChange && (
            <ToggleGroup 
              type="single" 
              value={mode} 
              onValueChange={(v) => v && onModeChange(v as ProgrammingMode)}
              className="bg-muted rounded-lg p-0.5 shrink-0"
            >
              <ToggleGroupItem value="skills" className="gap-1 text-xs data-[state=on]:bg-background data-[state=on]:shadow-sm px-2">
                <Target className="w-3 h-3" />
                Skills
              </ToggleGroupItem>
              <ToggleGroupItem value="behaviors" className="gap-1 text-xs data-[state=on]:bg-background data-[state=on]:shadow-sm px-2">
                <Activity className="w-3 h-3" />
                Behaviors
              </ToggleGroupItem>
              <ToggleGroupItem value="both" className="gap-1 text-xs data-[state=on]:bg-background data-[state=on]:shadow-sm px-2">
                <Columns3 className="w-3 h-3" />
                Both
              </ToggleGroupItem>
            </ToggleGroup>
          )}
        </div>

        <TabsContent value="behaviors" className="mt-4 space-y-4">
          {/* Goal Suggestion Engine */}
          <GoalSuggestionEnginePanel studentId={studentId} surface="programming" />

          {/* Goals & Linked Interventions — moved here from Progress Review */}
          {studentGoals.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Goals & Linked Interventions</CardTitle>
                <CardDescription>
                  Behavior goals linked to their replacement behaviors and intervention strategies
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
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
                                  Goal: {goal.direction === 'increase' ? '↑ Increase' : goal.direction === 'decrease' ? '↓ Decrease' : '→ Maintain'}{' '}
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
                              Definition: {behavior.operationalDefinition}
                            </p>
                          )}
                          {goal.notes && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Notes: {goal.notes}
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
        </TabsContent>

        <TabsContent value="interventions" className="mt-4 space-y-4">
          <StudentBxPlanView 
            studentId={student.id}
            studentName={student.displayName || student.name}
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
            <div className="flex items-center gap-2">
              <StudentBehaviorMerge studentId={student.id} studentName={student.displayName || student.name} />
              <BehaviorDataEditor studentId={student.id} studentName={student.displayName || student.name} />
              <HistoricalDataManager studentId={student.id} />
            </div>
          </div>
          <HistoricalDataEntry student={student} />
          
          {/* Context Log — moved here under Data Entry */}
          <TOILog studentId={studentId} studentName={studentName} isAdmin={false} />
          
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

        <TabsContent value="context" className="mt-4">
          <TOILog studentId={studentId} studentName={studentName} isAdmin={false} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
