import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, User, Target, Activity, Plus, Trash2, Pencil, 
  Calendar, CheckCircle2, Clock, FileText, Save, X, Archive, AlertTriangle, Check, FolderOpen, Grid3X3, Info, StickyNote, ClipboardCheck, UserCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useDataStore } from '@/store/dataStore';
import { 
  DataCollectionMethod, 
  METHOD_LABELS, 
  ANTECEDENT_OPTIONS, 
  CONSEQUENCE_OPTIONS,
  GoalDirection,
  GoalMetric,
  BehaviorGoal,
  Student
} from '@/types/behavior';
import { ConfirmDialog } from '@/components/ui/alert-dialog-confirm';
import { format } from 'date-fns';
import { StudentFileManager } from '@/components/StudentFileManager';
import { HistoricalIntervalEntry } from '@/components/HistoricalIntervalEntry';
import { HistoricalSessionEditor } from '@/components/HistoricalSessionEditor';
import { StudentProfileInfo } from '@/components/StudentProfileInfo';
import { NarrativeNotesManager } from '@/components/NarrativeNotesManager';
import { FBAModeTools } from '@/components/FBAModeTools';
import { TeacherFriendlyView } from '@/components/TeacherFriendlyView';
import { EnhancedGoalBuilder } from '@/components/EnhancedGoalBuilder';
import { useAuth } from '@/contexts/AuthContext';
import { Session } from '@/types/behavior';

export default function StudentProfile() {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const { 
    students, 
    addBehaviorWithMethods, 
    removeBehavior,
    updateBehaviorMethods,
    addCustomAntecedent,
    addCustomConsequence,
    behaviorGoals,
    addBehaviorGoal,
    updateBehaviorGoal,
    removeBehaviorGoal,
    frequencyEntries,
    abcEntries,
    durationEntries,
    intervalEntries,
    sessions,
    addABCEntry,
    incrementFrequency,
    archiveStudent,
    unarchiveStudent,
    permanentlyDeleteStudent,
    updateStudentName,
    updateStudentProfile,
    addNarrativeNote,
    updateNarrativeNote,
    deleteNarrativeNote,
  } = useDataStore();

  const student = students.find(s => s.id === studentId);
  const studentGoals = behaviorGoals.filter(g => g.studentId === studentId);

  // State for dialogs
  const [showAddBehavior, setShowAddBehavior] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showAddData, setShowAddData] = useState(false);
  const [showAddABC, setShowAddABC] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: string; id: string } | null>(null);
  const [editGoal, setEditGoal] = useState<BehaviorGoal | null>(null);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [showHistoricalInterval, setShowHistoricalInterval] = useState(false);
  const [editSession, setEditSession] = useState<Session | null>(null);
  const [deleteSessionConfirm, setDeleteSessionConfirm] = useState<string | null>(null);
  const { deleteSession } = useDataStore();

  // Form states
  const [newBehaviorName, setNewBehaviorName] = useState('');
  const [selectedMethods, setSelectedMethods] = useState<DataCollectionMethod[]>(['frequency']);
  const [newAntecedent, setNewAntecedent] = useState('');
  const [newConsequence, setNewConsequence] = useState('');

  // Goal form states
  const [goalBehaviorId, setGoalBehaviorId] = useState('');
  const [goalDirection, setGoalDirection] = useState<GoalDirection>('decrease');
  const [goalMetric, setGoalMetric] = useState<GoalMetric>('frequency');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalBaseline, setGoalBaseline] = useState('');
  const [goalNotes, setGoalNotes] = useState('');
  const [goalIntroducedDate, setGoalIntroducedDate] = useState('');
  const [goalDataStartDate, setGoalDataStartDate] = useState('');

  // Manual data entry states
  const [dataDate, setDataDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dataTime, setDataTime] = useState(format(new Date(), 'HH:mm'));
  const [dataBehaviorId, setDataBehaviorId] = useState('');
  const [dataType, setDataType] = useState<'frequency' | 'abc'>('frequency');
  const [dataCount, setDataCount] = useState('1');
  const [dataAntecedent, setDataAntecedent] = useState('');
  const [dataBehavior, setDataBehavior] = useState('');
  const [dataConsequence, setDataConsequence] = useState('');

  if (!student) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Student not found</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/students')}>
          Back to Students
        </Button>
      </div>
    );
  }

  // Get student's data summary
  const studentFrequency = frequencyEntries.filter(e => e.studentId === studentId);
  const studentABC = abcEntries.filter(e => e.studentId === studentId);
  const studentDuration = durationEntries.filter(e => e.studentId === studentId);
  const studentIntervals = intervalEntries.filter(e => e.studentId === studentId);

  // Get historical interval sessions for this student
  const historicalIntervalSessions = sessions.filter(session => 
    session.intervalEntries.some(e => e.studentId === studentId)
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleAddBehavior = () => {
    if (newBehaviorName.trim() && selectedMethods.length > 0) {
      addBehaviorWithMethods(student.id, newBehaviorName.trim(), selectedMethods);
      setNewBehaviorName('');
      setSelectedMethods(['frequency']);
      setShowAddBehavior(false);
    }
  };

  const handleAddGoal = () => {
    if (goalBehaviorId) {
      const goalData: Omit<BehaviorGoal, 'id'> = {
        studentId: student.id,
        behaviorId: goalBehaviorId,
        direction: goalDirection,
        metric: goalMetric,
        targetValue: goalTarget ? parseFloat(goalTarget) : undefined,
        baseline: goalBaseline ? parseFloat(goalBaseline) : undefined,
        startDate: new Date(),
        notes: goalNotes || undefined,
        introducedDate: goalIntroducedDate ? new Date(goalIntroducedDate) : undefined,
        dataCollectionStartDate: goalDataStartDate ? new Date(goalDataStartDate) : undefined,
      };
      
      if (editGoal) {
        updateBehaviorGoal(editGoal.id, goalData);
        setEditGoal(null);
      } else {
        addBehaviorGoal(goalData);
      }
      
      resetGoalForm();
      setShowAddGoal(false);
    }
  };

  const handleArchive = () => {
    archiveStudent(student.id);
    setShowArchiveConfirm(false);
    navigate('/students');
  };

  const handlePermanentDelete = () => {
    if (deleteInput === 'DELETE') {
      permanentlyDeleteStudent(student.id);
      setShowDeleteConfirm(false);
      navigate('/students');
    }
  };

  const handleMarkMastery = (goal: BehaviorGoal) => {
    updateBehaviorGoal(goal.id, {
      isMastered: true,
      masteryDate: new Date(),
    });
  };

  const handleUnmarkMastery = (goal: BehaviorGoal) => {
    updateBehaviorGoal(goal.id, {
      isMastered: false,
      masteryDate: undefined,
    });
  };

  const resetGoalForm = () => {
    setGoalBehaviorId('');
    setGoalDirection('decrease');
    setGoalMetric('frequency');
    setGoalTarget('');
    setGoalBaseline('');
    setGoalNotes('');
    setGoalIntroducedDate('');
    setGoalDataStartDate('');
  };

  const openEditGoal = (goal: BehaviorGoal) => {
    setEditGoal(goal);
    setGoalBehaviorId(goal.behaviorId);
    setGoalDirection(goal.direction);
    setGoalMetric(goal.metric);
    setGoalTarget(goal.targetValue.toString());
    setGoalBaseline(goal.baseline?.toString() || '');
    setGoalNotes(goal.notes || '');
    setGoalIntroducedDate(goal.introducedDate ? format(new Date(goal.introducedDate), 'yyyy-MM-dd') : '');
    setGoalDataStartDate(goal.dataCollectionStartDate ? format(new Date(goal.dataCollectionStartDate), 'yyyy-MM-dd') : '');
    setShowAddGoal(true);
  };

  const handleAddManualData = () => {
    if (!dataBehaviorId) return;
    
    const behavior = student.behaviors.find(b => b.id === dataBehaviorId);
    if (!behavior) return;

    const count = parseInt(dataCount) || 1;
    
    for (let i = 0; i < count; i++) {
      incrementFrequency(student.id, dataBehaviorId);
    }
    
    setShowAddData(false);
    setDataCount('1');
    setDataBehaviorId('');
  };

  const handleAddManualABC = () => {
    if (!dataBehaviorId || !dataAntecedent || !dataConsequence) return;
    
    const behavior = student.behaviors.find(b => b.id === dataBehaviorId);
    if (!behavior) return;

    addABCEntry({
      studentId: student.id,
      behaviorId: dataBehaviorId,
      antecedent: dataAntecedent,
      behavior: behavior.name,
      consequence: dataConsequence,
      frequencyCount: 1,
    });
    
    setShowAddData(false);
    setDataAntecedent('');
    setDataConsequence('');
    setDataBehaviorId('');
  };

  const handleDeleteConfirm = () => {
    if (!deleteConfirm) return;
    
    if (deleteConfirm.type === 'behavior') {
      removeBehavior(student.id, deleteConfirm.id);
    } else if (deleteConfirm.type === 'goal') {
      removeBehaviorGoal(deleteConfirm.id);
    }
    
    setDeleteConfirm(null);
  };

  const allAntecedents = [...ANTECEDENT_OPTIONS, ...(student.customAntecedents || [])];
  const allConsequences = [...CONSEQUENCE_OPTIONS, ...(student.customConsequences || [])];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/students')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div
          className={`w-14 h-14 rounded-full flex items-center justify-center ${student.isArchived ? 'opacity-50' : ''}`}
          style={{ backgroundColor: `${student.color}20` }}
        >
          <User className="w-7 h-7" style={{ color: student.color }} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <Input
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="h-9 text-xl font-bold max-w-[200px]"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && editedName.trim()) {
                      updateStudentName(student.id, editedName);
                      setIsEditingName(false);
                    } else if (e.key === 'Escape') {
                      setIsEditingName(false);
                    }
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    if (editedName.trim()) {
                      updateStudentName(student.id, editedName);
                    }
                    setIsEditingName(false);
                  }}
                >
                  <Check className="w-4 h-4 text-primary" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setIsEditingName(false)}
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-foreground">{student.name}</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    setEditedName(student.name);
                    setIsEditingName(true);
                  }}
                >
                  <Pencil className="w-4 h-4 text-muted-foreground" />
                </Button>
              </>
            )}
            {student.isArchived && (
              <Badge variant="outline" className="text-xs">
                <Archive className="w-3 h-3 mr-1" />
                Archived
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-sm">
            {student.behaviors.length} behaviors configured
          </p>
        </div>
        
        {/* Archive/Delete Actions */}
        <div className="flex gap-2">
          {student.isArchived ? (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  unarchiveStudent(student.id);
                }}
              >
                Restore
              </Button>
              <Button
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Permanently
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              onClick={() => setShowArchiveConfirm(true)}
            >
              <Archive className="w-4 h-4 mr-2" />
              Archive
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="flex flex-wrap gap-1 h-auto p-1 w-full max-w-5xl">
          <TabsTrigger value="profile" className="gap-1 text-xs">
            <Info className="w-3 h-3" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="behaviors" className="gap-1 text-xs">
            <Activity className="w-3 h-3" />
            Behaviors
          </TabsTrigger>
          <TabsTrigger value="goals" className="gap-1 text-xs">
            <Target className="w-3 h-3" />
            Goals
          </TabsTrigger>
          <TabsTrigger value="abc" className="gap-1 text-xs">
            <FileText className="w-3 h-3" />
            ABC Options
          </TabsTrigger>
          <TabsTrigger value="data" className="gap-1 text-xs">
            <Clock className="w-3 h-3" />
            Add Data
          </TabsTrigger>
          <TabsTrigger value="notes" className="gap-1 text-xs">
            <StickyNote className="w-3 h-3" />
            Notes
          </TabsTrigger>
          <TabsTrigger value="files" className="gap-1 text-xs">
            <FolderOpen className="w-3 h-3" />
            Files
          </TabsTrigger>
          {student.assessmentModeEnabled && (
            <TabsTrigger value="fba" className="gap-1 text-xs">
              <ClipboardCheck className="w-3 h-3" />
              FBA Tools
            </TabsTrigger>
          )}
          <TabsTrigger value="teacher" className="gap-1 text-xs">
            <UserCheck className="w-3 h-3" />
            Teacher View
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4">
          <StudentProfileInfo
            student={student}
            onUpdate={(updates) => updateStudentProfile(student.id, updates)}
          />
        </TabsContent>

        {/* Behaviors Tab */}
        <TabsContent value="behaviors" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Behaviors</h3>
            <Button onClick={() => setShowAddBehavior(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Behavior
            </Button>
          </div>

          <div className="grid gap-3">
            {student.behaviors.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No behaviors configured. Add one to start tracking.
                </CardContent>
              </Card>
            ) : (
              student.behaviors.map((behavior) => (
                <Card key={behavior.id}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{behavior.name}</h4>
                        <div className="flex gap-1 mt-1">
                          {(behavior.methods || [behavior.type]).map((method) => (
                            <Badge key={method} variant="secondary" className="text-xs">
                              {METHOD_LABELS[method]}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteConfirm({ type: 'behavior', id: behavior.id })}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Goals Tab */}
        <TabsContent value="goals" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Behavior Goals</h3>
            <Button onClick={() => { resetGoalForm(); setShowAddGoal(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Goal
            </Button>
          </div>

          <div className="grid gap-3">
            {studentGoals.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No goals set. Add goals to track progress.
                </CardContent>
              </Card>
            ) : (
              studentGoals.map((goal) => {
                const behavior = student.behaviors.find(b => b.id === goal.behaviorId);
                return (
                  <Card key={goal.id} className={goal.isMastered ? 'border-primary/50 bg-primary/5' : ''}>
                    <CardContent className="py-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{behavior?.name || 'Unknown'}</h4>
                            {goal.isMastered && (
                              <Badge className="bg-primary text-primary-foreground">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Mastered
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {goal.direction === 'increase' ? '↑' : goal.direction === 'decrease' ? '↓' : '→'}{' '}
                            {goal.metric}{goal.targetValue !== undefined ? ` to ${goal.targetValue}` : ''}
                            {goal.baseline !== undefined && ` (baseline: ${goal.baseline})`}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditGoal(goal)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteConfirm({ type: 'goal', id: goal.id })}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Goal dates */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {goal.introducedDate && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            Introduced: {format(new Date(goal.introducedDate), 'MMM d, yyyy')}
                          </div>
                        )}
                        {goal.dataCollectionStartDate && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            Data started: {format(new Date(goal.dataCollectionStartDate), 'MMM d, yyyy')}
                          </div>
                        )}
                        {goal.masteryDate && (
                          <div className="flex items-center gap-1 text-primary">
                            <CheckCircle2 className="w-3 h-3" />
                            Mastered: {format(new Date(goal.masteryDate), 'MMM d, yyyy')}
                          </div>
                        )}
                      </div>

                      {goal.notes && (
                        <p className="text-sm text-muted-foreground bg-secondary/30 rounded p-2">
                          {goal.notes}
                        </p>
                      )}

                      {/* Mastery toggle */}
                      <div className="pt-2 border-t">
                        {goal.isMastered ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUnmarkMastery(goal)}
                          >
                            <X className="w-4 h-4 mr-2" />
                            Unmark Mastery
                          </Button>
                        ) : (
                          <Button
                            variant="default"
                            size="sm"
                            className="bg-primary hover:bg-primary/90"
                            onClick={() => handleMarkMastery(goal)}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Mark as Mastered
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* ABC Options Tab */}
        <TabsContent value="abc" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Custom Antecedents */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Custom Antecedents</CardTitle>
                <CardDescription>Add antecedent options specific to this student</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="New antecedent..."
                    value={newAntecedent}
                    onChange={(e) => setNewAntecedent(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newAntecedent.trim()) {
                        addCustomAntecedent(student.id, newAntecedent.trim());
                        setNewAntecedent('');
                      }
                    }}
                  />
                  <Button
                    onClick={() => {
                      if (newAntecedent.trim()) {
                        addCustomAntecedent(student.id, newAntecedent.trim());
                        setNewAntecedent('');
                      }
                    }}
                    disabled={!newAntecedent.trim()}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {ANTECEDENT_OPTIONS.map((a) => (
                    <Badge key={a} variant="secondary" className="text-xs">
                      {a}
                    </Badge>
                  ))}
                  {student.customAntecedents?.map((a) => (
                    <Badge key={a} variant="default" className="text-xs">
                      {a}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Custom Consequences */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Custom Consequences</CardTitle>
                <CardDescription>Add consequence options specific to this student</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="New consequence..."
                    value={newConsequence}
                    onChange={(e) => setNewConsequence(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newConsequence.trim()) {
                        addCustomConsequence(student.id, newConsequence.trim());
                        setNewConsequence('');
                      }
                    }}
                  />
                  <Button
                    onClick={() => {
                      if (newConsequence.trim()) {
                        addCustomConsequence(student.id, newConsequence.trim());
                        setNewConsequence('');
                      }
                    }}
                    disabled={!newConsequence.trim()}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {CONSEQUENCE_OPTIONS.map((c) => (
                    <Badge key={c} variant="secondary" className="text-xs">
                      {c}
                    </Badge>
                  ))}
                  {student.customConsequences?.map((c) => (
                    <Badge key={c} variant="default" className="text-xs">
                      {c}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Add Data Tab */}
        <TabsContent value="data" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Add Historical / External Data</CardTitle>
              <CardDescription>
                Manually add data collected outside the system or from past sessions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Historical Interval Data Button */}
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => setShowHistoricalInterval(true)}
              >
                <Grid3X3 className="w-4 h-4" />
                Add Historical Interval Data
              </Button>

              {/* Historical Sessions List */}
              {historicalIntervalSessions.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Previous Historical Sessions</Label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {historicalIntervalSessions.slice(0, 5).map((session) => {
                      const sessionIntervals = session.intervalEntries.filter(e => e.studentId === studentId);
                      const occurredCount = sessionIntervals.filter(e => e.occurred && !e.voided).length;
                      const totalValid = sessionIntervals.filter(e => !e.voided).length;
                      const percentage = totalValid > 0 ? Math.round((occurredCount / totalValid) * 100) : 0;
                      
                      return (
                        <div 
                          key={session.id} 
                          className="flex items-center justify-between p-2 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex-1">
                            <p className="text-sm font-medium">{format(new Date(session.date), 'MMM d, yyyy h:mm a')}</p>
                            <p className="text-xs text-muted-foreground">
                              {sessionIntervals.length} intervals • {occurredCount}/{totalValid} ({percentage}%)
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditSession(session)}
                            >
                              <Pencil className="w-3 h-3 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeleteSessionConfirm(session.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                    {historicalIntervalSessions.length > 5 && (
                      <p className="text-xs text-muted-foreground text-center">
                        + {historicalIntervalSessions.length - 5} more sessions
                      </p>
                    )}
                  </div>
                </div>
              )}
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or add frequency/ABC data</span>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={dataDate}
                    onChange={(e) => setDataDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Time</Label>
                  <Input
                    type="time"
                    value={dataTime}
                    onChange={(e) => setDataTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Behavior</Label>
                <Select value={dataBehaviorId} onValueChange={setDataBehaviorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select behavior" />
                  </SelectTrigger>
                  <SelectContent>
                    {student.behaviors.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Data Type</Label>
                <Select value={dataType} onValueChange={(v: 'frequency' | 'abc') => setDataType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="frequency">Frequency Count</SelectItem>
                    <SelectItem value="abc">ABC Entry</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {dataType === 'frequency' ? (
                <div className="space-y-2">
                  <Label>Count</Label>
                  <Input
                    type="number"
                    min="1"
                    value={dataCount}
                    onChange={(e) => setDataCount(e.target.value)}
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Antecedent</Label>
                    <Select value={dataAntecedent} onValueChange={setDataAntecedent}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select antecedent" />
                      </SelectTrigger>
                      <SelectContent>
                        {allAntecedents.map((a) => (
                          <SelectItem key={a} value={a}>{a}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Consequence</Label>
                    <Select value={dataConsequence} onValueChange={setDataConsequence}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select consequence" />
                      </SelectTrigger>
                      <SelectContent>
                        {allConsequences.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <Button
                className="w-full"
                onClick={dataType === 'frequency' ? handleAddManualData : handleAddManualABC}
                disabled={!dataBehaviorId || (dataType === 'abc' && (!dataAntecedent || !dataConsequence))}
              >
                <Save className="w-4 h-4 mr-2" />
                Add Data Entry
              </Button>
            </CardContent>
          </Card>

          {/* Data Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Data Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="p-3 bg-secondary/30 rounded-lg">
                  <p className="text-2xl font-bold text-primary">
                    {studentFrequency.reduce((sum, e) => sum + e.count, 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Frequency Events</p>
                </div>
                <div className="p-3 bg-secondary/30 rounded-lg">
                  <p className="text-2xl font-bold text-primary">{studentABC.length}</p>
                  <p className="text-xs text-muted-foreground">ABC Entries</p>
                </div>
                <div className="p-3 bg-secondary/30 rounded-lg">
                  <p className="text-2xl font-bold text-primary">{studentDuration.length}</p>
                  <p className="text-xs text-muted-foreground">Duration Sessions</p>
                </div>
                <div className="p-3 bg-secondary/30 rounded-lg">
                  <p className="text-2xl font-bold text-primary">{studentIntervals.length}</p>
                  <p className="text-xs text-muted-foreground">Interval Records</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes" className="space-y-4">
          <NarrativeNotesManager
            studentId={student.id}
            notes={student.narrativeNotes || []}
            behaviors={student.behaviors}
            onAddNote={(note) => addNarrativeNote(student.id, note)}
            onUpdateNote={(noteId, updates) => updateNarrativeNote(student.id, noteId, updates)}
            onDeleteNote={(noteId) => deleteNarrativeNote(student.id, noteId)}
          />
        </TabsContent>

        {/* Files Tab */}
        <TabsContent value="files" className="space-y-4">
          <StudentFileManager studentId={student.id} studentName={student.name} />
        </TabsContent>

        {/* FBA Tools Tab - Only visible when Assessment Mode is ON */}
        {student.assessmentModeEnabled && (
          <TabsContent value="fba" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5 text-primary" />
                  FBA / Assessment Tools
                </CardTitle>
                <CardDescription>
                  Pattern detection, function analysis, and FBA report generation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FBAModeTools student={student} />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Teacher-Friendly View Tab */}
        <TabsContent value="teacher" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-primary" />
                Teacher-Friendly View
              </CardTitle>
              <CardDescription>
                Simplified interface with large touch targets for quick data entry
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TeacherFriendlyView student={student} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Behavior Dialog */}
      <Dialog open={showAddBehavior} onOpenChange={setShowAddBehavior}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Behavior</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Behavior Name</Label>
              <Input
                placeholder="Enter behavior name..."
                value={newBehaviorName}
                onChange={(e) => setNewBehaviorName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Data Collection Methods</Label>
              <div className="grid grid-cols-2 gap-2">
                {(['frequency', 'duration', 'interval', 'abc', 'latency'] as DataCollectionMethod[]).map((method) => (
                  <div key={method} className="flex items-center gap-2">
                    <Checkbox
                      id={method}
                      checked={selectedMethods.includes(method)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedMethods([...selectedMethods, method]);
                        } else {
                          setSelectedMethods(selectedMethods.filter(m => m !== method));
                        }
                      }}
                    />
                    <Label htmlFor={method} className="cursor-pointer">
                      {METHOD_LABELS[method]}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddBehavior(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddBehavior} disabled={!newBehaviorName.trim() || selectedMethods.length === 0}>
              Add Behavior
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Goal Dialog */}
      <Dialog open={showAddGoal} onOpenChange={(open) => { setShowAddGoal(open); if (!open) setEditGoal(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editGoal ? 'Edit Goal' : 'Add Goal'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label>Behavior</Label>
              <Select value={goalBehaviorId} onValueChange={setGoalBehaviorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select behavior" />
                </SelectTrigger>
                <SelectContent>
                  {student.behaviors.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Direction</Label>
                <Select value={goalDirection} onValueChange={(v: GoalDirection) => setGoalDirection(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="increase">Increase</SelectItem>
                    <SelectItem value="decrease">Decrease</SelectItem>
                    <SelectItem value="maintain">Maintain</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Metric</Label>
                <Select value={goalMetric} onValueChange={(v: GoalMetric) => setGoalMetric(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="frequency">Frequency</SelectItem>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="duration">Duration</SelectItem>
                    <SelectItem value="rate">Rate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Target Value</Label>
                <Input
                  type="number"
                  value={goalTarget}
                  onChange={(e) => setGoalTarget(e.target.value)}
                  placeholder="e.g., 5"
                />
              </div>
              <div className="space-y-2">
                <Label>Baseline (optional)</Label>
                <Input
                  type="number"
                  value={goalBaseline}
                  onChange={(e) => setGoalBaseline(e.target.value)}
                  placeholder="Current level"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Goal Introduced Date</Label>
                <Input
                  type="date"
                  value={goalIntroducedDate}
                  onChange={(e) => setGoalIntroducedDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Data Collection Start Date</Label>
                <Input
                  type="date"
                  value={goalDataStartDate}
                  onChange={(e) => setGoalDataStartDate(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={goalNotes}
                onChange={(e) => setGoalNotes(e.target.value)}
                placeholder="Additional notes about this goal..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddGoal(false); setEditGoal(null); }}>
              Cancel
            </Button>
            <Button onClick={handleAddGoal} disabled={!goalBehaviorId}>
              {editGoal ? 'Save Changes' : 'Add Goal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={() => setDeleteConfirm(null)}
        title={`Delete ${deleteConfirm?.type === 'behavior' ? 'Behavior' : 'Goal'}`}
        description={`Are you sure you want to delete this ${deleteConfirm?.type}? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirm}
        variant="destructive"
      />

      {/* Delete Historical Session Confirmation */}
      <ConfirmDialog
        open={!!deleteSessionConfirm}
        onOpenChange={() => setDeleteSessionConfirm(null)}
        title="Delete Historical Session"
        description="Are you sure you want to delete this historical session? All interval data for this session will be permanently removed."
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleteSessionConfirm) {
            deleteSession(deleteSessionConfirm);
            setDeleteSessionConfirm(null);
          }
        }}
        variant="destructive"
      />

      <ConfirmDialog
        open={showArchiveConfirm}
        onOpenChange={setShowArchiveConfirm}
        title="Archive Student"
        description={`Are you sure you want to archive "${student.name}"? They will be removed from active sessions but their data will be preserved. You can restore them later from the archived students list.`}
        confirmLabel="Archive"
        onConfirm={handleArchive}
      />

      {/* Permanent Delete Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={(open) => {
        setShowDeleteConfirm(open);
        if (!open) setDeleteInput('');
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Permanently Delete Student
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
              <p className="text-sm text-destructive font-medium">
                This action is IRREVERSIBLE
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Permanently deleting "{student.name}" will remove:
              </p>
              <ul className="text-sm text-muted-foreground mt-2 list-disc list-inside space-y-1">
                <li>All behavior configurations</li>
                <li>All collected data (frequency, duration, interval, ABC)</li>
                <li>All goals and progress</li>
                <li>Custom antecedents and consequences</li>
              </ul>
            </div>
            <div className="space-y-2">
              <Label>Type <span className="font-mono font-bold">DELETE</span> to confirm:</Label>
              <Input
                value={deleteInput}
                onChange={(e) => setDeleteInput(e.target.value)}
                placeholder="DELETE"
                className="font-mono"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowDeleteConfirm(false);
              setDeleteInput('');
            }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handlePermanentDelete}
              disabled={deleteInput !== 'DELETE'}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Historical Interval Entry Dialog */}
      <HistoricalIntervalEntry 
        student={student} 
        open={showHistoricalInterval} 
        onOpenChange={setShowHistoricalInterval} 
      />

      {/* Historical Session Editor Dialog */}
      {editSession && (
        <HistoricalSessionEditor
          student={student}
          session={editSession}
          open={!!editSession}
          onOpenChange={(open) => !open && setEditSession(null)}
        />
      )}
    </div>
  );
}
