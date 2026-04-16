import { useState, useEffect, lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ClipboardList, LayoutGrid, List, Rows3, Smartphone, FileText, Zap, Shield, Sparkles, BrainCircuit } from 'lucide-react';
import { SessionWorkspace } from '@/components/session-workspace/SessionWorkspace';
import { StudentSelector } from '@/components/StudentSelector';
import { CompactStudentCard } from '@/components/CompactStudentCard';
import { HorizontalStudentRow } from '@/components/HorizontalStudentRow';
import { ExpandedStudentView } from '@/components/ExpandedStudentView';
import { SessionTimer } from '@/components/SessionTimer';
import { DataSummary } from '@/components/DataSummary';
import { SyncedIntervalController } from '@/components/SyncedIntervalController';
import { EnhancedABCPopup } from '@/components/EnhancedABCPopup';
import { NovelBehaviorRecorder } from '@/components/NovelBehaviorRecorder';
import { QuickABCCustomizer } from '@/components/QuickABCCustomizer';
import { SessionFocusMode } from '@/components/SessionFocusMode';
import { TrashRecovery } from '@/components/TrashRecovery';
import { EndAllSessionsButton } from '@/components/EndAllSessionsButton';
import { ActiveStudentSessions } from '@/components/ActiveStudentSessions';
import { MobileDataMode } from '@/components/mobile';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useDataStore } from '@/store/dataStore';
import AssessmentDashboard from '@/pages/AssessmentDashboard';
import { IEPDashboard } from '@/components/iep/IEPDashboard';
import { BopsEngineConsole } from '@/components/bops/BopsEngineConsole';
import { BopsFrameworkSetup } from '@/components/bops/BopsFrameworkSetup';
import { BopsStudentHub } from '@/components/bops/BopsStudentHub';
import { BopsSubmissionReview } from '@/components/bops/BopsSubmissionReview';
import { useBopsAdminAccess } from '@/hooks/useBopsAdmin';
import { Loader2 } from 'lucide-react';

const BopsAdminOverview = lazy(() => import('@/components/bops-admin/BopsAdminOverview').then(m => ({ default: m.BopsAdminOverview })));
const BopsAdminStudents = lazy(() => import('@/components/bops-admin/BopsAdminStudents').then(m => ({ default: m.BopsAdminStudents })));
const BopsAdminClassrooms = lazy(() => import('@/components/bops-admin/BopsAdminClassrooms').then(m => ({ default: m.BopsAdminClassrooms })));
const BopsAdminCoverage = lazy(() => import('@/components/bops-admin/BopsAdminCoverage').then(m => ({ default: m.BopsAdminCoverage })));
const BopsAdminTools = lazy(() => import('@/components/bops-admin/BopsAdminTools').then(m => ({ default: m.BopsAdminTools })));
const GoalOptimization = lazy(() => import('@/pages/GoalOptimization'));

type ViewMode = 'grid' | 'rows' | 'tabs';

export default function Clinical() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam || 'sessions');
  const { data: isAdmin } = useBopsAdminAccess();

  // Sync URL ?tab= with local state (for nav links pointing here)
  useEffect(() => {
    if (tabParam && tabParam !== activeTab) setActiveTab(tabParam);
  }, [tabParam]);

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    if (val === 'sessions') {
      setSearchParams({}, { replace: true });
    } else {
      setSearchParams({ tab: val }, { replace: true });
    }
  };

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="bg-muted/50 flex-wrap h-auto gap-0.5">
          <TabsTrigger value="sessions" className="gap-1.5">
            <ClipboardList className="w-3.5 h-3.5" />
            Sessions
          </TabsTrigger>
          <TabsTrigger value="assessments" className="gap-1.5">
            <List className="w-3.5 h-3.5" />
            Assessments
          </TabsTrigger>
          <TabsTrigger value="iep" className="gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            IEP
          </TabsTrigger>
          <TabsTrigger value="optimization" className="gap-1.5">
            <BrainCircuit className="w-3.5 h-3.5" />
            Optimization
          </TabsTrigger>
          <TabsTrigger value="bops" className="gap-1.5">
            <Zap className="w-3.5 h-3.5" />
            BOPS Engine
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="bops-admin" className="gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              BOPS Admin
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="sessions">
          <SessionsView />
        </TabsContent>
        <TabsContent value="assessments">
          <AssessmentDashboard />
        </TabsContent>
        <TabsContent value="iep">
          <IEPDashboard />
        </TabsContent>
        <TabsContent value="optimization">
          <Suspense fallback={<div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>}>
            <GoalOptimization />
          </Suspense>
        </TabsContent>
        <TabsContent value="bops">
          <BopsEngineContent />
        </TabsContent>
        {isAdmin && (
          <TabsContent value="bops-admin">
            <Suspense fallback={<div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>}>
              <BopsAdminContent />
            </Suspense>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function BopsEngineContent() {
  const [subTab, setSubTab] = useState('engine');
  return (
    <div className="space-y-4">
      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList>
          <TabsTrigger value="engine" className="gap-1.5"><LayoutGrid className="w-3.5 h-3.5" />Engine Console</TabsTrigger>
          <TabsTrigger value="students" className="gap-1.5"><List className="w-3.5 h-3.5" />Student Profiles</TabsTrigger>
          <TabsTrigger value="framework" className="gap-1.5"><Shield className="w-3.5 h-3.5" />Framework Setup</TabsTrigger>
          <TabsTrigger value="submissions" className="gap-1.5"><FileText className="w-3.5 h-3.5" />Beacon Submissions</TabsTrigger>
        </TabsList>
        <TabsContent value="engine"><BopsEngineConsole /></TabsContent>
        <TabsContent value="students"><BopsStudentHub /></TabsContent>
        <TabsContent value="framework"><BopsFrameworkSetup /></TabsContent>
        <TabsContent value="submissions"><BopsSubmissionReview /></TabsContent>
      </Tabs>
    </div>
  );
}

function BopsAdminContent() {
  const [subTab, setSubTab] = useState('overview');
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">BOPS Admin Console</h2>
      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList className="flex-wrap h-auto gap-0.5">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="students" className="text-xs">Students</TabsTrigger>
          <TabsTrigger value="classrooms" className="text-xs">Classrooms</TabsTrigger>
          <TabsTrigger value="coverage" className="text-xs">Coverage</TabsTrigger>
          <TabsTrigger value="tools" className="text-xs">Tools</TabsTrigger>
        </TabsList>
        <TabsContent value="overview"><BopsAdminOverview /></TabsContent>
        <TabsContent value="students"><BopsAdminStudents /></TabsContent>
        <TabsContent value="classrooms"><BopsAdminClassrooms /></TabsContent>
        <TabsContent value="coverage"><BopsAdminCoverage /></TabsContent>
        <TabsContent value="tools"><BopsAdminTools /></TabsContent>
      </Tabs>
    </div>
  );
}

function SessionsView() {
  const { students, selectedStudentIds } = useDataStore();
  const selectedStudents = students.filter(s => selectedStudentIds.includes(s.id));
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('rows');
  const [activeTabStudentId, setActiveTabStudentId] = useState<string | null>(null);
  const [showMobileMode, setShowMobileMode] = useState(false);
  const [useNewWorkspace, setUseNewWorkspace] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem('nova_use_new_workspace');
    // Default to NEW workspace for any user who hasn't explicitly opted out.
    if (stored === null) return true;
    return stored !== '0';
  });
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('nova_use_new_workspace', useNewWorkspace ? '1' : '0');
  }, [useNewWorkspace]);

  if (useNewWorkspace) {
    return (
      <div className="space-y-3">
        <SessionWorkspace onClose={() => setUseNewWorkspace(false)} />
      </div>
    );
  }

  const hasIntervalBehaviors = selectedStudents.some(s => 
    s.behaviors.some(b => (b.methods || [b.type]).includes('interval'))
  );
  const hasAnyBehaviors = selectedStudents.some(s => s.behaviors.length > 0);

  const expandedStudent = expandedStudentId ? students.find(s => s.id === expandedStudentId) : null;
  const activeTabStudent = activeTabStudentId 
    ? selectedStudents.find(s => s.id === activeTabStudentId)
    : selectedStudents[0];

  if (expandedStudent) {
    return (
      <ExpandedStudentView
        student={expandedStudent}
        onClose={() => setExpandedStudentId(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Session Timer & Summary */}
      <div className="grid md:grid-cols-2 gap-3">
        <SessionTimer />
        <DataSummary />
      </div>

      <ActiveStudentSessions />

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2 justify-center">
        <TrashRecovery />
        <SessionFocusMode />
        <NovelBehaviorRecorder />
        {hasAnyBehaviors && <EnhancedABCPopup />}
        {selectedStudentIds.length > 0 && <QuickABCCustomizer />}
        <EndAllSessionsButton />
        {selectedStudentIds.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => setShowMobileMode(true)} className="gap-2">
            <Smartphone className="w-4 h-4" />
            Mobile Mode
          </Button>
        )}
        <Button variant="default" size="sm" onClick={() => setUseNewWorkspace(true)} className="gap-2">
          <Sparkles className="w-4 h-4" />
          Back to New Workspace
        </Button>
      </div>

      <div className="rounded-md border border-dashed border-muted-foreground/30 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        You're using <span className="font-medium text-foreground">Classic mode</span>. The new unified Session Workspace is now the default — Classic will be retired in an upcoming release.
      </div>

      {showMobileMode && <MobileDataMode onClose={() => setShowMobileMode(false)} />}

      {hasIntervalBehaviors && <SyncedIntervalController />}

      <StudentSelector />

      {selectedStudents.length > 0 && (
        <>
          {/* View Mode Toggle */}
          <div className="flex justify-end">
            <TooltipProvider>
              <div className="flex border rounded-md overflow-hidden">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant={viewMode === 'rows' ? 'default' : 'ghost'} size="sm" className="h-8 px-3 rounded-none" onClick={() => setViewMode('rows')}>
                      <Rows3 className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Row View</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="sm" className="h-8 px-3 rounded-none border-x" onClick={() => setViewMode('grid')}>
                      <LayoutGrid className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Grid View</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant={viewMode === 'tabs' ? 'default' : 'ghost'} size="sm" className="h-8 px-3 rounded-none" onClick={() => { setViewMode('tabs'); if (!activeTabStudentId && selectedStudents.length > 0) setActiveTabStudentId(selectedStudents[0].id); }}>
                      <List className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Tabbed View</TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          </div>

          {viewMode === 'grid' && (
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {selectedStudents.map(student => (
                <CompactStudentCard key={student.id} student={student} onExpand={() => setExpandedStudentId(student.id)} />
              ))}
            </div>
          )}

          {viewMode === 'rows' && (
            <div className="space-y-3">
              {selectedStudents.map(student => (
                <HorizontalStudentRow key={student.id} student={student} onExpand={() => setExpandedStudentId(student.id)} defaultExpanded={selectedStudents.length <= 3} />
              ))}
            </div>
          )}

          {viewMode === 'tabs' && (
            <div className="space-y-3">
              <Tabs value={activeTabStudentId || selectedStudents[0]?.id} onValueChange={setActiveTabStudentId}>
                <TabsList className="flex flex-wrap h-auto gap-1 bg-secondary/30 p-1">
                  {selectedStudents.map(student => (
                    <TabsTrigger key={student.id} value={student.id} className="data-[state=active]:bg-background"
                      style={{ borderBottom: activeTabStudentId === student.id ? `2px solid ${student.color}` : undefined }}>
                      <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: student.color }} />
                      {student.displayName || student.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              {activeTabStudent && (
                <HorizontalStudentRow key={activeTabStudent.id} student={activeTabStudent} onExpand={() => setExpandedStudentId(activeTabStudent.id)} defaultExpanded={true} />
              )}
            </div>
          )}
        </>
      )}

      {selectedStudents.length === 0 && (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <ClipboardList className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-base font-semibold text-foreground mb-2">No Students Selected</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Add students above and select them to start collecting behavioral data. 
            Go to the Students tab to configure behaviors for each student.
          </p>
        </div>
      )}
    </div>
  );
}
