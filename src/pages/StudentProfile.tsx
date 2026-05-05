import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, User, Target, Activity, Plus, Trash2, Pencil, 
  Calendar, CheckCircle2, Clock, FileText, Save, X, Archive, AlertTriangle, Check, FolderOpen, Grid3X3, Info, StickyNote, ClipboardCheck, UserCheck, Brain, BrainCircuit, GraduationCap, Shield, Lightbulb, Heart, BookOpen, Layers, Zap, Mic, Package, BarChart3
} from 'lucide-react';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
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
  Student,
  SkillTarget,
  DTTSession,
  DTTTrial,
} from '@/types/behavior';
import { ConfirmDialog } from '@/components/ui/alert-dialog-confirm';
import { format } from 'date-fns';
import { StudentFileManager } from '@/components/StudentFileManager';
import { HistoricalIntervalEntry } from '@/components/HistoricalIntervalEntry';
import { HistoricalSessionEditor } from '@/components/HistoricalSessionEditor';
import { StudentProfileInfo } from '@/components/StudentProfileInfo';
import { NotesHub } from '@/components/notes/NotesHub';
import { FBAModeTools } from '@/components/FBAModeTools';
import { TeacherFriendlyView } from '@/components/TeacherFriendlyView';
import { EnhancedGoalBuilder } from '@/components/EnhancedGoalBuilder';
import { FBAFindingsDisplay } from '@/components/FBAFindingsDisplay';
import { FBAWorkflowProgress } from '@/components/FBAWorkflowProgress';
import { StudentBackgroundEditor } from '@/components/StudentBackgroundEditor';
import { StudentTagSelector } from '@/components/StudentTagSelector';
import { StudentAppointments } from '@/components/schedule/StudentAppointments';
import { StudentAttendanceDashboard } from '@/components/schedule/StudentAttendanceDashboard';

import { FidelityDashboard } from '@/components/fidelity';
import { ActiveObservationsBanner } from '@/components/ActiveObservationsBanner';
import { StudentObservationsTab } from '@/components/observation-requests/StudentObservationsTab';
import { StudentIEPPrepTab } from '@/components/iep/StudentIEPPrepTab';
import { CaregiverTrainingTab } from '@/components/caregiver-training/CaregiverTrainingTab';
import { ProtocolAssignmentManager } from '@/components/curriculum/ProtocolAssignmentManager';
import { GoalSuggestionEnginePanel } from '@/components/optimization/GoalSuggestionEnginePanel';
import { ObservationHistory } from '@/components/ObservationHistory';
import { TeacherDataHub } from '@/components/teacher/TeacherDataHub';
import { PendingStudentChanges } from '@/components/messaging/PendingStudentChanges';
import { SdcIntakeManager, StudentSdcSnapshotViewer } from '@/components/sdc-intake';
import { StudentIntakeFormsTab } from '@/components/intake-forms/StudentIntakeFormsTab';
import { QuestionnaireManager } from '@/components/questionnaire/QuestionnaireManager';
import { StudentClinicalForms } from '@/components/clinical-forms/StudentClinicalForms';
import { ParentSnapshotGenerator } from '@/components/parent-comms/ParentSnapshotGenerator';
import { BehaviorDecodedPanel, RewardEffectivenessPanel, BeaconAISuggestionsPanel } from '@/components/phase4';
import { PhaseChangeManager } from '@/components/PhaseChangeManager';
import { useAuth } from '@/contexts/AuthContext';
import { ProgrammingModule } from '@/components/programming';
import { useStudentAccess } from '@/hooks/useStudentAccess';
import { Session } from '@/types/behavior';
import { logDataAccess } from '@/lib/auditLogger';
import { toast } from 'sonner';
import { FundingModeToggle, PayersAuthorizationsTab, InsuranceStatusBanner, AuthorizationUsagePage } from '@/components/funding';
import { useFundingMode } from '@/hooks/useFundingMode';
import { useClientProfile } from '@/hooks/useClientProfile';
import { StudentIntelligencePanel } from '@/components/intelligence/StudentIntelligencePanel';
import { ReplacementBehaviorCard } from '@/components/intelligence/ReplacementBehaviorCard';
import { BehaviorIntelligenceSection } from '@/components/intelligence/BehaviorIntelligenceSection';
import { SkillIntelligenceSection } from '@/components/intelligence/SkillIntelligenceSection';
import { 
  ContactsTab, 
  SafetyMedicalTab, 
  SchedulingTab,
  LocationsTab, 
  TeamAssignmentsTab, 
  DocumentsTab,
  TagsCaseAttributesTab,
  CommunicationCombinedTab,
} from '@/components/client-profile/tabs';
import { Phone, MapPin, Users, MessageSquare, HeartPulse, Tag } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { StudentBopsTab } from '@/components/bops/StudentBopsTab';
import { useSupabaseAbcSync } from '@/hooks/useSupabaseAbcSync';
import { useBehaviorSessionSync } from '@/hooks/useBehaviorSessionSync';

export default function StudentProfile() {
  const { studentId } = useParams<{ studentId: string }>();
  useSupabaseAbcSync(studentId);
  useBehaviorSessionSync(studentId);
  const navigate = useNavigate();
  const { 
    students, 
    addBehaviorWithMethods, 
    removeBehavior,
    updateBehaviorMethods,
    updateBehaviorName,
    updateBehaviorDefinition,
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
    addHistoricalFrequency,
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
  
  const studentAccess = useStudentAccess(studentId);
  const { fundingMode, insuranceTrackingState, setFundingMode, hasActivePayer, hasActiveAuth, refetch: refetchFunding } = useFundingMode(studentId);
  const clientProfile = useClientProfile(studentId);

  useEffect(() => {
    if (studentId && student) {
      logDataAccess(studentId, 'view', 'profile', { studentName: student.name });
    }
  }, [studentId, student?.name]);

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
  
  // Inline behavior editing state
  const [editingBehaviorId, setEditingBehaviorId] = useState<string | null>(null);
  const [editBehaviorName, setEditBehaviorName] = useState('');
  const [editBehaviorDefinition, setEditBehaviorDefinition] = useState('');
  const [editBehaviorMethods, setEditBehaviorMethods] = useState<DataCollectionMethod[]>([]);

  const startEditBehavior = (behaviorId: string, name: string, definition: string, methods: DataCollectionMethod[]) => {
    setEditingBehaviorId(behaviorId);
    setEditBehaviorName(name);
    setEditBehaviorDefinition(definition || '');
    setEditBehaviorMethods(methods.length > 0 ? methods : ['frequency']);
  };

  const toggleEditMethod = (method: DataCollectionMethod) => {
    setEditBehaviorMethods(prev =>
      prev.includes(method) ? prev.filter(m => m !== method) : [...prev, method]
    );
  };

  const saveEditBehavior = () => {
    if (!editingBehaviorId || !editBehaviorName.trim() || editBehaviorMethods.length === 0) return;
    updateBehaviorName(student!.id, editingBehaviorId, editBehaviorName.trim());
    updateBehaviorDefinition(student!.id, editingBehaviorId, editBehaviorDefinition);
    updateBehaviorMethods(student!.id, editingBehaviorId, editBehaviorMethods);
    setEditingBehaviorId(null);
    toast.success('Behavior updated — existing data is unchanged');
  };

  const cancelEditBehavior = () => {
    setEditingBehaviorId(null);
  };
  
  const [selectedSkillTarget, setSelectedSkillTarget] = useState<SkillTarget | null>(null);

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
  const [dataObservationDuration, setDataObservationDuration] = useState('');
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

  const studentFrequency = frequencyEntries.filter(e => e.studentId === studentId);
  const studentABC = abcEntries.filter(e => e.studentId === studentId);
  const studentDuration = durationEntries.filter(e => e.studentId === studentId);
  const studentIntervals = intervalEntries.filter(e => e.studentId === studentId);

  const historicalIntervalSessions = sessions.filter(session => 
    session.intervalEntries.some(e => e.studentId === studentId)
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getBehaviorName = (behaviorId: string) => {
    return student.behaviors.find(b => b.id === behaviorId)?.name || `Needs Mapping (${behaviorId.slice(0, 6)})`;
  };

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
    const durationMinutes = dataObservationDuration ? parseFloat(dataObservationDuration) : undefined;
    const safeTime = (dataTime || '').trim() || '12:00';
    const timestamp = new Date(`${dataDate}T${safeTime}`);
    if (Number.isNaN(timestamp.getTime())) {
      toast.error('Please select a valid date. Time is optional.');
      return;
    }
    
    addHistoricalFrequency({
      studentId: student.id,
      behaviorId: dataBehaviorId,
      count,
      timestamp,
      observationDurationMinutes: durationMinutes,
    });
    
    setShowAddData(false);
    setDataCount('1');
    setDataObservationDuration('');
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
    <div className="space-y-6 max-sm:space-y-3">
      {/* Breadcrumbs */}
      <Breadcrumbs />
      {/* Header */}
      <div className="flex items-center gap-4 max-sm:gap-2 max-sm:flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/students')}>
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
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-muted-foreground text-sm">
              {student.behaviors.length} behaviors configured
            </p>
            <StudentTagSelector studentId={student.id} showLabel={false} compact />
          </div>
        </div>
        
        {/* Archive/Delete Actions */}
        <div className="flex gap-2 max-sm:w-full max-sm:justify-end">
          {student.isArchived ? (
            <>
              <Button variant="outline" onClick={() => unarchiveStudent(student.id)}>
                Restore
              </Button>
              <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Permanently
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => setShowArchiveConfirm(true)}>
              <Archive className="w-4 h-4 mr-2" />
              Archive
            </Button>
          )}
        </div>
      </div>

      {/* Funding Mode Toggle */}
      <FundingModeToggle
        studentId={student.id}
        currentMode={fundingMode}
        insuranceTrackingState={insuranceTrackingState}
        onModeChange={async (mode) => {
          await setFundingMode(mode);
          refetchFunding();
        }}
        hasActivePayer={hasActivePayer}
        hasActiveAuth={hasActiveAuth}
      />

      {/* Insurance Status Banner */}
      <InsuranceStatusBanner
        fundingMode={fundingMode}
        insuranceTrackingState={insuranceTrackingState}
        onFinishSetup={() => {}}
        onSwitchToSchoolBased={async () => {
          await setFundingMode('school_based');
          refetchFunding();
        }}
        onReenableInsurance={() => {}}
      />

      {/* ====== CORE 6-TAB NAVIGATION ====== */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex gap-1 h-auto p-1 w-full overflow-x-auto scrollbar-hide flex-nowrap">
          <TabsTrigger value="overview" className="gap-1.5 text-xs whitespace-nowrap">
            <Info className="w-3.5 h-3.5" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="notes" className="gap-1.5 text-xs whitespace-nowrap">
            <StickyNote className="w-3.5 h-3.5" />
            Notes
          </TabsTrigger>
          <TabsTrigger value="programming" className="gap-1.5 text-xs whitespace-nowrap">
            <Layers className="w-3.5 h-3.5" />
            Programming
          </TabsTrigger>
          <TabsTrigger value="assessments" className="gap-1.5 text-xs whitespace-nowrap">
            <Brain className="w-3.5 h-3.5" />
            Assessment History
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-1.5 text-xs whitespace-nowrap">
            <BarChart3 className="w-3.5 h-3.5" />
            Reports
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-1.5 text-xs whitespace-nowrap">
            <FolderOpen className="w-3.5 h-3.5" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="bops" className="gap-1.5 text-xs whitespace-nowrap">
            <Shield className="w-3.5 h-3.5" />
            BOPS Profile
          </TabsTrigger>
        </TabsList>

        {/* ====== OVERVIEW TAB ====== */}
        <TabsContent value="overview" className="space-y-4">
          <StudentProfileInfo
            student={student}
            onUpdate={(updates) => updateStudentProfile(student.id, updates)}
          />
          <StudentBackgroundEditor
            student={student}
            onUpdate={(updates) => updateStudentProfile(student.id, updates)}
          />
          
          {/* Pending Teacher Edits */}
          <PendingStudentChanges studentId={student.id} studentName={student.name} />

          {/* Intelligence Summary */}
          <StudentIntelligencePanel studentId={student.id} />
          <BeaconAISuggestionsPanel scopeType="student" scopeId={student.id} />
          
          {/* Team & Assignments */}
          <Collapsible defaultOpen={true}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Team & Assignments
                    <Badge variant="secondary" className="ml-auto">{clientProfile.teamAssignments.length}</Badge>
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <TeamAssignmentsTab
                    clientId={student.id}
                    teamAssignments={clientProfile.teamAssignments}
                    onRefetch={clientProfile.refetch}
                  />
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Contacts */}
          <Collapsible defaultOpen={true}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Contacts
                    <Badge variant="secondary" className="ml-auto">{clientProfile.contacts.length}</Badge>
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <ContactsTab
                    clientId={student.id}
                    contacts={clientProfile.contacts}
                    onRefresh={clientProfile.refetch}
                  />
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Locations */}
          <Collapsible defaultOpen={false}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Locations
                    <Badge variant="secondary" className="ml-auto">{clientProfile.locations.length}</Badge>
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <LocationsTab
                    clientId={student.id}
                    locations={clientProfile.locations}
                    onRefresh={clientProfile.refetch}
                  />
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Safety & Medical */}
          <Collapsible defaultOpen={false}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardTitle className="text-base flex items-center gap-2">
                    <HeartPulse className="w-4 h-4" />
                    Safety & Medical
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <SafetyMedicalTab
                    clientId={student.id}
                    data={clientProfile.safetyMedical}
                    onRefresh={clientProfile.refetch}
                  />
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Scheduling */}
          <Collapsible defaultOpen={false}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Schedule & Appointments
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-4">
                  <SchedulingTab
                    clientId={student.id}
                    data={clientProfile.schedulingPreferences}
                    onRefresh={clientProfile.refetch}
                  />
                  <StudentAttendanceDashboard studentId={student.id} studentName={student.name} />
                  <StudentAppointments studentId={student.id} studentName={student.name} studentColor={student.color} />
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Communication */}
          <Collapsible defaultOpen={false}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Communication
                    <Badge variant="secondary" className="ml-auto">{clientProfile.communicationLog.length} logs</Badge>
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <CommunicationCombinedTab
                    clientId={student.id}
                    communicationAccess={clientProfile.communicationAccess}
                    communicationLog={clientProfile.communicationLog}
                    contacts={clientProfile.contacts}
                    onRefresh={clientProfile.refetch}
                  />
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Caregiver Training */}
          <Collapsible defaultOpen={false}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Heart className="w-4 h-4" />
                    Caregiver Training
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <CaregiverTrainingTab studentId={student.id} />
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Payers & Auth (insurance only) */}
          {fundingMode === 'insurance' && (
            <Collapsible defaultOpen={false}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Payers & Authorizations
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0 space-y-4">
                    <PayersAuthorizationsTab studentId={student.id} />
                    <AuthorizationUsagePage studentId={student.id} />
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}
        </TabsContent>

        {/* ====== NOTES TAB ====== */}
        <TabsContent value="notes" className="space-y-4">
          <NotesHub
            student={student}
            studentAccess={studentAccess}
            addNarrativeNote={addNarrativeNote}
            updateNarrativeNote={updateNarrativeNote}
            deleteNarrativeNote={deleteNarrativeNote}
          />
        </TabsContent>

        {/* ====== PROGRAMMING TAB ====== */}
        <TabsContent value="programming" className="space-y-4">
          <ProgrammingModule
            studentId={student.id}
            studentName={student.name}
            isAdmin={studentAccess.isAdmin || studentAccess.canEditProfile}
          />
          {/* Protocol Assignments — Library-based program assignment */}
          <ProtocolAssignmentManager studentId={student.id} />

        </TabsContent>

        {/* ====== ASSESSMENTS TAB ====== */}
        <TabsContent value="assessments" className="space-y-4">
          {/* Goal Suggestion Engine */}
          <GoalSuggestionEnginePanel studentId={student.id} surface="reassessment" />
          
          <div className="grid gap-4">
            {/* Active Observation Banner */}
            <ActiveObservationsBanner 
              onEndObservation={(sid) => {
                const store = useDataStore.getState();
                store.endStudentSession(sid);
                toast.success('Observation ended for student');
              }}
              onDeleteObservation={(sid) => {
                const store = useDataStore.getState();
                store.endStudentSession(sid);
                toast.success('Observation deleted');
              }}
            />

            {/* FBA Workflow */}
            <FBAWorkflowProgress student={student} />
            <ObservationHistory studentId={student.id} />
            <StudentBackgroundEditor
              student={student}
              onUpdate={(updates) => updateStudentProfile(student.id, updates)}
            />
            <FBAFindingsDisplay student={student} />

            {/* FBA Tools - inline when assessment mode is enabled */}
            {student.assessmentModeEnabled && (
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
            )}

            {/* Indirect Assessments */}
            {student.indirectAssessments && student.indirectAssessments.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ClipboardCheck className="w-4 h-4" />
                    Saved Indirect Assessments ({student.indirectAssessments.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {student.indirectAssessments.map(assessment => (
                      <div key={assessment.id} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary">{assessment.type}</Badge>
                          <div>
                            <p className="text-sm font-medium">{assessment.targetBehavior}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(assessment.completedAt), 'MMM dd, yyyy')} by {assessment.completedBy}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline">
                          Primary: {assessment.primaryFunction}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* BIP Summary */}
            {student.bipData && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Behavior Intervention Plan
                    <Badge variant={student.bipData.status === 'active' ? 'default' : 'secondary'}>
                      {student.bipData.status}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                    <div className="p-2 bg-muted rounded">
                      <p className="text-lg font-bold">{student.bipData.targetBehaviors.length}</p>
                      <p className="text-xs text-muted-foreground">Target Behaviors</p>
                    </div>
                    <div className="p-2 bg-muted rounded">
                      <p className="text-lg font-bold">{student.bipData.replacementBehaviors.length}</p>
                      <p className="text-xs text-muted-foreground">Replacements</p>
                    </div>
                    <div className="p-2 bg-muted rounded">
                      <p className="text-lg font-bold">
                        {(student.bipData.preventativeStrategies?.length || 0) + 
                         (student.bipData.teachingStrategies?.length || 0) +
                         (student.bipData.reactiveStrategies?.length || 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">Strategies</p>
                    </div>
                    <div className="p-2 bg-muted rounded">
                      <p className="text-lg font-bold">{student.bipData.teamMembers?.length || 0}</p>
                      <p className="text-xs text-muted-foreground">Team Members</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Last updated: {format(new Date(student.bipData.updatedAt), 'MMM dd, yyyy')}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Treatment Fidelity */}
            <FidelityDashboard studentId={student.id} studentName={student.name} />

            {/* Empty State */}
            {!student.fbaFindings && (!student.indirectAssessments || student.indirectAssessments.length === 0) && !student.bipData && (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center">
                  <Brain className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-muted-foreground">No assessment data saved yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Complete FBA assessments and generate reports to save findings here
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* SDC Intake */}
          <SdcIntakeManager
            studentId={student.id}
            studentName={student.name}
            studentGrade={student.grade || ''}
          />

            {/* Questionnaires — sendable forms (teacher observation, ABAS-3, etc.) */}
            <QuestionnaireManager studentId={student.id} studentName={student.name} />

            {/* Clinical Forms — sendable clinical assessment forms */}
            <StudentClinicalForms studentId={student.id} studentName={student.name} />
        </TabsContent>

        {/* ====== REPORTS TAB ====== */}
        <TabsContent value="reports" className="space-y-4">
          {/* SDC Behavior Snapshot — shows only if student has one */}
          <StudentSdcSnapshotViewer studentId={student.id} studentName={student.name} />

          {/* Data Sources: Teacher, Observations, IEP, Parent */}
          <TeacherDataHub clientId={student.id} />
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-primary" />
                Teacher Data Entry
              </CardTitle>
              <CardDescription>
                Simplified interface with large touch targets for quick data entry
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TeacherFriendlyView student={student} />
            </CardContent>
          </Card>
          <StudentObservationsTab studentId={student.id} studentName={student.name} />
          <StudentIEPPrepTab studentId={student.id} />
          <ParentSnapshotGenerator studentId={student.id} studentName={student.name} />

          {/* Intelligence Sections */}
          <BehaviorIntelligenceSection studentId={student.id} />
          <SkillIntelligenceSection studentId={student.id} />
          <RewardEffectivenessPanel studentId={student.id} />
          <BehaviorDecodedPanel studentId={student.id} />
        </TabsContent>

        {/* ====== DOCUMENTS TAB ====== */}
        <TabsContent value="documents" className="space-y-4">
          {/* Intake Forms — assigned forms for this student */}
          <StudentIntakeFormsTab studentId={student.id} />

          {/* E-Signatures & Documents */}
          <DocumentsTab
            clientId={student.id}
            documents={clientProfile.documents}
            onRefetch={clientProfile.refetch}
          />
          <StudentFileManager studentId={student.id} studentName={student.name} />
          <TagsCaseAttributesTab
            clientId={student.id}
            caseAttributes={clientProfile.caseAttributes}
            onRefetch={clientProfile.refetch}
          />
        </TabsContent>

        {/* ====== BOPS TAB ====== */}
        <TabsContent value="bops" className="space-y-4">
          <StudentBopsTab studentId={student.id} />
        </TabsContent>
      </Tabs>

      {/* ====== DIALOGS (unchanged) ====== */}
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
            <Button variant="outline" onClick={() => setShowAddBehavior(false)}>Cancel</Button>
            <Button onClick={handleAddBehavior} disabled={!newBehaviorName.trim() || selectedMethods.length === 0}>
              Add Behavior
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddGoal} onOpenChange={(open) => { setShowAddGoal(open); if (!open) setEditGoal(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editGoal ? 'Edit Goal' : 'Add Goal'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label>Behavior</Label>
              <Select value={goalBehaviorId} onValueChange={setGoalBehaviorId}>
                <SelectTrigger><SelectValue placeholder="Select behavior" /></SelectTrigger>
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
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
                <Input type="number" value={goalTarget} onChange={(e) => setGoalTarget(e.target.value)} placeholder="e.g., 5" />
              </div>
              <div className="space-y-2">
                <Label>Baseline (optional)</Label>
                <Input type="number" value={goalBaseline} onChange={(e) => setGoalBaseline(e.target.value)} placeholder="Current level" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Goal Introduced Date</Label>
                <Input type="date" value={goalIntroducedDate} onChange={(e) => setGoalIntroducedDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Data Collection Start Date</Label>
                <Input type="date" value={goalDataStartDate} onChange={(e) => setGoalDataStartDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={goalNotes} onChange={(e) => setGoalNotes(e.target.value)} placeholder="Additional notes about this goal..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddGoal(false); setEditGoal(null); }}>Cancel</Button>
            <Button onClick={handleAddGoal} disabled={!goalBehaviorId}>
              {editGoal ? 'Save Changes' : 'Add Goal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={() => setDeleteConfirm(null)}
        title={`Delete ${deleteConfirm?.type === 'behavior' ? 'Behavior' : 'Goal'}`}
        description={`Are you sure you want to delete this ${deleteConfirm?.type}? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirm}
        variant="destructive"
      />

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
              <p className="text-sm text-destructive font-medium">This action is IRREVERSIBLE</p>
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
              <Input value={deleteInput} onChange={(e) => setDeleteInput(e.target.value)} placeholder="DELETE" className="font-mono" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDeleteConfirm(false); setDeleteInput(''); }}>Cancel</Button>
            <Button variant="destructive" onClick={handlePermanentDelete} disabled={deleteInput !== 'DELETE'}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <HistoricalIntervalEntry 
        student={student} 
        open={showHistoricalInterval} 
        onOpenChange={setShowHistoricalInterval} 
      />

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
