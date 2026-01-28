import { useState, useMemo } from 'react';
import { 
  ClipboardCheck, Users, FileText, BarChart3, Brain, Eye, 
  Target, AlertTriangle, CheckCircle2, ArrowRight, ChevronRight,
  FileUp, BookOpen, Lightbulb, TrendingUp, Clock, Calendar, ClipboardList
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDataStore } from '@/store/dataStore';
import { FBAModeTools } from '@/components/FBAModeTools';
import { DocumentUpload } from '@/components/DocumentUpload';
import { ABCTracker } from '@/components/ABCTracker';
import { IndirectAssessmentTools } from '@/components/IndirectAssessmentTools';
import { CollaborationPanel } from '@/components/CollaborationPanel';
import { FBAReportGenerator } from '@/components/FBAReportGenerator';
import { BIPGenerator } from '@/components/BIPGenerator';
import { ParentFriendlyFBASummary } from '@/components/ParentFriendlyFBASummary';
import { Student, FUNCTION_OPTIONS, BehaviorFunction } from '@/types/behavior';

// FBA Workflow Steps
const FBA_WORKFLOW_STEPS = [
  { 
    id: 'referral', 
    label: 'Referral & Consent', 
    description: 'Document referral reason and obtain consent',
    icon: FileText 
  },
  { 
    id: 'records', 
    label: 'Records Review', 
    description: 'Review existing documents (IEP, BIP, evaluations)',
    icon: BookOpen 
  },
  { 
    id: 'indirect', 
    label: 'Indirect Assessment', 
    description: 'Interviews, rating scales, and questionnaires',
    icon: Users 
  },
  { 
    id: 'direct', 
    label: 'Direct Observation', 
    description: 'ABC data collection and pattern analysis',
    icon: Eye 
  },
  { 
    id: 'analysis', 
    label: 'Data Analysis', 
    description: 'Identify patterns and hypothesize functions',
    icon: BarChart3 
  },
  { 
    id: 'hypothesis', 
    label: 'Hypothesis Statement', 
    description: 'Develop functional hypothesis statements',
    icon: Brain 
  },
  { 
    id: 'report', 
    label: 'Report Generation', 
    description: 'Generate comprehensive FBA report',
    icon: FileText 
  },
];

export default function AssessmentDashboard() {
  const { students, abcEntries, frequencyEntries, sessions } = useDataStore();
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  // Filter to students with assessment mode enabled
  const assessmentStudents = useMemo(() => {
    return students.filter(s => s.assessmentModeEnabled && !s.isArchived);
  }, [students]);

  const allActiveStudents = useMemo(() => {
    return students.filter(s => !s.isArchived);
  }, [students]);

  const selectedStudent = useMemo(() => {
    return students.find(s => s.id === selectedStudentId);
  }, [students, selectedStudentId]);

  // Assessment overview stats
  const assessmentStats = useMemo(() => {
    const studentIds = assessmentStudents.map(s => s.id);
    const relevantABC = abcEntries.filter(e => studentIds.includes(e.studentId));
    const relevantSessions = sessions.filter(s => 
      s.studentIds?.some(id => studentIds.includes(id))
    );

    return {
      totalStudents: assessmentStudents.length,
      totalABCEntries: relevantABC.length,
      totalObservations: relevantSessions.length,
      averageEntriesPerStudent: assessmentStudents.length 
        ? Math.round(relevantABC.length / assessmentStudents.length) 
        : 0,
    };
  }, [assessmentStudents, abcEntries, sessions]);

  // Student-specific stats
  const studentStats = useMemo(() => {
    if (!selectedStudent) return null;

    const studentABC = abcEntries.filter(e => e.studentId === selectedStudentId);
    const studentSessions = sessions.filter(s => 
      s.studentIds?.includes(selectedStudentId)
    );

    // Calculate function distribution
    const functionCounts = new Map<BehaviorFunction, number>();
    studentABC.forEach(entry => {
      const functions = entry.functions || ['unknown' as BehaviorFunction];
      functions.forEach(fn => {
        functionCounts.set(fn, (functionCounts.get(fn) || 0) + 1);
      });
    });

    const functionDistribution = Array.from(functionCounts.entries())
      .map(([fn, count]) => ({
        function: fn,
        count,
        label: FUNCTION_OPTIONS.find(f => f.value === fn)?.label || fn,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      abcCount: studentABC.length,
      sessionCount: studentSessions.length,
      behaviorCount: selectedStudent.behaviors.length,
      functionDistribution,
      primaryFunction: functionDistribution[0] || null,
    };
  }, [selectedStudent, selectedStudentId, abcEntries, sessions]);

  const toggleStepComplete = (stepIndex: number) => {
    setCompletedSteps(prev => {
      const next = new Set(prev);
      if (next.has(stepIndex)) {
        next.delete(stepIndex);
      } else {
        next.add(stepIndex);
      }
      return next;
    });
  };

  const getFunctionColor = (fn: BehaviorFunction) => {
    const colors: Record<BehaviorFunction, string> = {
      attention: 'bg-blue-500',
      escape: 'bg-orange-500',
      tangible: 'bg-green-500',
      sensory: 'bg-purple-500',
      automatic: 'bg-pink-500',
      unknown: 'bg-muted',
    };
    return colors[fn] || 'bg-muted';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-primary" />
            Assessment Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            FBA workflow, tools, and analysis in one place
          </p>
        </div>

        <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="Select a student..." />
          </SelectTrigger>
          <SelectContent>
            {assessmentStudents.length > 0 && (
              <>
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                  Assessment Mode Students
                </div>
                {assessmentStudents.map(student => (
                  <SelectItem key={student.id} value={student.id}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: student.color }}
                      />
                      {student.name}
                      <Badge variant="secondary" className="text-xs ml-1">FBA</Badge>
                    </div>
                  </SelectItem>
                ))}
              </>
            )}
            {allActiveStudents.filter(s => !s.assessmentModeEnabled).length > 0 && (
              <>
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground border-t mt-1 pt-2">
                  Other Students
                </div>
                {allActiveStudents.filter(s => !s.assessmentModeEnabled).map(student => (
                  <SelectItem key={student.id} value={student.id}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: student.color }}
                      />
                      {student.name}
                    </div>
                  </SelectItem>
                ))}
              </>
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{assessmentStats.totalStudents}</p>
                <p className="text-xs text-muted-foreground">FBA Students</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <BarChart3 className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{assessmentStats.totalABCEntries}</p>
                <p className="text-xs text-muted-foreground">ABC Entries</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Eye className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{assessmentStats.totalObservations}</p>
                <p className="text-xs text-muted-foreground">Observations</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <TrendingUp className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{assessmentStats.averageEntriesPerStudent}</p>
                <p className="text-xs text-muted-foreground">Avg Entries/Student</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      {!selectedStudentId ? (
        <Card className="py-12">
          <CardContent className="text-center">
            <ClipboardCheck className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-medium mb-2">Select a Student</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Choose a student above to access FBA tools and workflow
            </p>
            {assessmentStudents.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Tip: Enable "Assessment Mode" on a student's profile to add them to the FBA list
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="workflow" className="space-y-4">
          <TabsList className="grid grid-cols-6 w-full">
            <TabsTrigger value="workflow" className="gap-1 text-xs">
              <Target className="w-3 h-3" />
              Workflow
            </TabsTrigger>
            <TabsTrigger value="indirect" className="gap-1 text-xs">
              <ClipboardList className="w-3 h-3" />
              Indirect
            </TabsTrigger>
            <TabsTrigger value="collect" className="gap-1 text-xs">
              <Eye className="w-3 h-3" />
              Direct
            </TabsTrigger>
            <TabsTrigger value="analysis" className="gap-1 text-xs">
              <Brain className="w-3 h-3" />
              Analysis
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-1 text-xs">
              <FileUp className="w-3 h-3" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="report" className="gap-1 text-xs">
              <FileText className="w-3 h-3" />
              Report
            </TabsTrigger>
          </TabsList>

          {/* Workflow Tab */}
          <TabsContent value="workflow" className="space-y-4">
            <div className="grid lg:grid-cols-3 gap-4">
              {/* Student Quick Stats */}
              <Card className="lg:col-span-1">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: selectedStudent?.color }}
                    />
                    {selectedStudent?.name}
                  </CardTitle>
                  <CardDescription className="text-xs">Assessment Progress</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span>Workflow Progress</span>
                      <span>{Math.round((completedSteps.size / FBA_WORKFLOW_STEPS.length) * 100)}%</span>
                    </div>
                    <Progress 
                      value={(completedSteps.size / FBA_WORKFLOW_STEPS.length) * 100} 
                      className="h-2" 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="p-2 bg-muted rounded-lg">
                      <p className="text-lg font-bold">{studentStats?.abcCount || 0}</p>
                      <p className="text-xs text-muted-foreground">ABC Entries</p>
                    </div>
                    <div className="p-2 bg-muted rounded-lg">
                      <p className="text-lg font-bold">{studentStats?.sessionCount || 0}</p>
                      <p className="text-xs text-muted-foreground">Sessions</p>
                    </div>
                  </div>

                  {studentStats?.primaryFunction && (
                    <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
                      <p className="text-xs text-muted-foreground mb-1">Primary Function</p>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${getFunctionColor(studentStats.primaryFunction.function)}`} />
                        <span className="font-medium text-sm">{studentStats.primaryFunction.label}</span>
                        <Badge variant="secondary" className="text-xs ml-auto">
                          {studentStats.primaryFunction.count} entries
                        </Badge>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Workflow Steps */}
              <Card className="lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">FBA Workflow Steps</CardTitle>
                  <CardDescription className="text-xs">
                    Track progress through the assessment process
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px] pr-4">
                    <div className="space-y-2">
                      {FBA_WORKFLOW_STEPS.map((step, index) => (
                        <div 
                          key={step.id}
                          className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            completedSteps.has(index)
                              ? 'bg-green-500/10 border-green-500/30'
                              : currentStep === index
                              ? 'bg-primary/5 border-primary/30'
                              : 'hover:bg-muted/50'
                          }`}
                          onClick={() => setCurrentStep(index)}
                        >
                          <div className={`p-2 rounded-lg ${
                            completedSteps.has(index)
                              ? 'bg-green-500/20 text-green-600'
                              : 'bg-muted'
                          }`}>
                            <step.icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm">{step.label}</p>
                              {completedSteps.has(index) && (
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">{step.description}</p>
                          </div>
                          <Button 
                            variant={completedSteps.has(index) ? "secondary" : "outline"} 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleStepComplete(index);
                            }}
                          >
                            {completedSteps.has(index) ? 'Completed' : 'Mark Done'}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Collaboration Panel - shown on workflow tab */}
            {selectedStudent && (
              <CollaborationPanel 
                studentId={selectedStudentId}
                studentName={selectedStudent.name}
              />
            )}

            {/* Quick Actions */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-yellow-500" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Button variant="outline" className="h-auto py-3 flex-col gap-1">
                    <Eye className="w-4 h-4" />
                    <span className="text-xs">Start Observation</span>
                  </Button>
                  <Button variant="outline" className="h-auto py-3 flex-col gap-1">
                    <FileUp className="w-4 h-4" />
                    <span className="text-xs">Upload Document</span>
                  </Button>
                  <Button variant="outline" className="h-auto py-3 flex-col gap-1">
                    <Brain className="w-4 h-4" />
                    <span className="text-xs">View Analysis</span>
                  </Button>
                  <Button variant="outline" className="h-auto py-3 flex-col gap-1">
                    <FileText className="w-4 h-4" />
                    <span className="text-xs">Generate Report</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Indirect Assessment Tab */}
          <TabsContent value="indirect" className="space-y-4">
            {selectedStudent && (
              <div className="grid lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  <IndirectAssessmentTools 
                    student={selectedStudent}
                    onSaveAssessment={(result) => {
                      console.log('Assessment saved:', result);
                    }}
                  />
                </div>
                <div className="space-y-4">
                  <CollaborationPanel 
                    studentId={selectedStudentId}
                    studentName={selectedStudent.name}
                  />
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Assessment Tips</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-xs text-muted-foreground">
                      <p>• <strong>FAST</strong> - Quick 16-item screening tool for initial function identification</p>
                      <p>• <strong>MAS</strong> - 16-item scale providing more detailed function analysis</p>
                      <p>• <strong>QABF</strong> - Comprehensive 25-item assessment with 5 items per function</p>
                      <p className="pt-2">Consider interviewing multiple informants (teachers, parents, staff) to get a complete picture.</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Collect Data Tab */}
          <TabsContent value="collect" className="space-y-4">
            {selectedStudent && (
              <div className="grid lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">ABC Data Collection</CardTitle>
                    <CardDescription className="text-xs">
                      Record antecedent-behavior-consequence observations
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {selectedStudent.behaviors.length > 0 ? (
                      <ABCTracker 
                        studentId={selectedStudentId}
                        behavior={selectedStudent.behaviors[0]}
                        studentColor={selectedStudent.color}
                      />
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No behaviors defined</p>
                        <p className="text-xs">Add behaviors to the student profile first</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Session Summary</CardTitle>
                    <CardDescription className="text-xs">
                      Today's data collection summary
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-muted rounded-lg text-center">
                          <Clock className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                          <p className="text-lg font-bold">
                            {abcEntries.filter(e => 
                              e.studentId === selectedStudentId && 
                              new Date(e.timestamp).toDateString() === new Date().toDateString()
                            ).length}
                          </p>
                          <p className="text-xs text-muted-foreground">Today's ABC</p>
                        </div>
                        <div className="p-3 bg-muted rounded-lg text-center">
                          <Calendar className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                          <p className="text-lg font-bold">
                            {studentStats?.abcCount || 0}
                          </p>
                          <p className="text-xs text-muted-foreground">Total ABC</p>
                        </div>
                      </div>

                      {/* Recent entries */}
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">Recent Entries</p>
                        <ScrollArea className="h-[200px]">
                          {abcEntries
                            .filter(e => e.studentId === selectedStudentId)
                            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                            .slice(0, 5)
                            .map(entry => (
                              <div key={entry.id} className="p-2 border-b last:border-0 text-xs">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className="text-xs">
                                    {entry.antecedent || entry.antecedents?.[0]}
                                  </Badge>
                                  <ChevronRight className="w-3 h-3 text-muted-foreground" />
                                  <Badge className="text-xs">
                                    {entry.behavior}
                                  </Badge>
                                  <ChevronRight className="w-3 h-3 text-muted-foreground" />
                                  <Badge variant="secondary" className="text-xs">
                                    {entry.consequence || entry.consequences?.[0]}
                                  </Badge>
                                </div>
                                <p className="text-muted-foreground">
                                  {new Date(entry.timestamp).toLocaleString()}
                                </p>
                              </div>
                            ))}
                          {abcEntries.filter(e => e.studentId === selectedStudentId).length === 0 && (
                            <p className="text-muted-foreground text-center py-4">
                              No ABC entries yet
                            </p>
                          )}
                        </ScrollArea>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Analysis Tab */}
          <TabsContent value="analysis">
            {selectedStudent && <FBAModeTools student={selectedStudent} />}
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents">
            {selectedStudent && (
              <DocumentUpload 
                studentId={selectedStudent.id}
                documents={selectedStudent.documents || []}
                onUploadComplete={(doc) => {
                  // In a real implementation, this would update the student's documents
                  console.log('Document uploaded:', doc);
                }}
                onDeleteDocument={(id) => {
                  // In a real implementation, this would delete the document
                  console.log('Delete document:', id);
                }}
              />
            )}
          </TabsContent>

          {/* Report Tab */}
          <TabsContent value="report" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">FBA Report Generator</CardTitle>
                <CardDescription className="text-xs">
                  Generate comprehensive assessment report based on collected data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Report Sections Preview */}
                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    { title: 'Background Information', status: 'ready' },
                    { title: 'Assessment Procedures', status: 'ready' },
                    { title: 'Indirect Assessment Results', status: studentStats?.abcCount ? 'ready' : 'pending' },
                    { title: 'Direct Observation Results', status: studentStats?.abcCount ? 'ready' : 'pending' },
                    { title: 'Hypothesis Statement', status: studentStats?.primaryFunction ? 'ready' : 'pending' },
                    { title: 'Recommendations', status: 'draft' },
                  ].map(section => (
                    <div 
                      key={section.title}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <span className="text-sm">{section.title}</span>
                      <Badge 
                        variant={
                          section.status === 'ready' ? 'default' :
                          section.status === 'pending' ? 'secondary' : 'outline'
                        }
                        className="text-xs"
                      >
                        {section.status}
                      </Badge>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2">
                  {selectedStudent && (
                    <>
                      <FBAReportGenerator student={selectedStudent} />
                      <ParentFriendlyFBASummary student={selectedStudent} />
                      <BIPGenerator student={selectedStudent} />
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
