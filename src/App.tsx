import { useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { SyncProvider } from "@/contexts/SyncContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ApprovalCheck } from "@/components/ApprovalCheck";
import { SessionTimeoutWarning } from "@/components/SessionTimeoutWarning";
import { toast } from "sonner";
import { useBackendGuard } from "@/hooks/useBackendGuard";
import { BackendGuardScreen } from "@/components/BackendGuardScreen";
import { GlobalErrorBoundary } from "@/components/GlobalErrorBoundary";
import { FloatingCaptureButton } from "./components/voice-capture/FloatingCaptureButton";
import { DemoModeProvider } from "./contexts/DemoModeContext";
import { Loader2 } from "lucide-react";

// Lazy-loaded page components for code splitting
const MainLayout = lazy(() => import("./components/MainLayout"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Students = lazy(() => import("./pages/Students"));
const StudentProfile = lazy(() => import("./pages/StudentProfile"));
const Reports = lazy(() => import("./pages/Reports"));
const AssessmentDashboard = lazy(() => import("./pages/AssessmentDashboard"));
const Clinical = lazy(() => import("./pages/Clinical"));
const SkillAcquisition = lazy(() => import("./pages/SkillAcquisition"));
const NotesReview = lazy(() => import("./pages/NotesReview"));
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const PostLoginRouter = lazy(() => import("./pages/PostLoginRouter"));
const Admin = lazy(() => import("./pages/Admin"));
const BehaviorLibrary = lazy(() => import("./pages/BehaviorLibrary"));
const PendingApproval = lazy(() => import("./pages/PendingApproval"));
const UserProfile = lazy(() => import("./pages/UserProfile"));
const Schedule = lazy(() => import("./pages/Schedule"));
const SecuritySettings = lazy(() => import("./pages/SecuritySettings"));
const TeacherDashboard = lazy(() => import("./pages/TeacherDashboard"));
const QuestionnaireForm = lazy(() => import("./pages/QuestionnaireForm"));
const ConsentForm = lazy(() => import("./pages/ConsentForm"));
const TeacherObservationForm = lazy(() => import("./pages/TeacherObservationForm"));
const ClinicalFormPage = lazy(() => import("./pages/ClinicalFormPage"));
const FormRouteResolver = lazy(() => import("./pages/FormRouteResolver"));
const DocumentInbox = lazy(() => import("./pages/DocumentInbox"));
const Supervision = lazy(() => import("./pages/Supervision"));
const Referrals = lazy(() => import("./pages/Referrals"));
const Billing = lazy(() => import("./pages/Billing"));
const AgencyBillingPolicy = lazy(() => import("./pages/AgencyBillingPolicy"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Recruiting = lazy(() => import("./pages/Recruiting"));
const LMS = lazy(() => import("./pages/LMS"));
const ParentTrainingAdmin = lazy(() => import("./pages/ParentTrainingAdmin"));
const ParentTrainingViewer = lazy(() => import("./pages/ParentTrainingViewer"));
const ParentModulePlayer = lazy(() => import("./pages/ParentModulePlayer"));
const ModulePlayer = lazy(() => import("./pages/ModulePlayer"));
const NotFound = lazy(() => import("./pages/NotFound"));
const BehaviorLabCatalog = lazy(() => import("./pages/BehaviorLabCatalog"));
const BehaviorLabPlayer = lazy(() => import("./pages/BehaviorLabPlayer"));
const IEPLibrary = lazy(() => import("./pages/IEPLibrary"));
const BehaviorLibraryFull = lazy(() => import("./pages/BehaviorLibraryFull"));
const Academy = lazy(() => import("./pages/Academy"));
const InterventionBuilder = lazy(() => import("./pages/InterventionBuilder"));
const ClinicalLibraryLayout = lazy(() => import("./pages/clinical-library/ClinicalLibraryLayout"));
const ClinicalCollectionsPage = lazy(() => import("./pages/clinical-library/ClinicalCollectionsPage"));
const GoalBanksPage = lazy(() => import("./pages/clinical-library/GoalBanksPage"));
const GoalBankDomainPage = lazy(() => import("./pages/clinical-library/GoalBankDomainPage"));
const GoalDetailPage = lazy(() => import("./pages/clinical-library/GoalDetailPage"));
const CurriculumSystemsPage = lazy(() => import("./pages/clinical-library/CurriculumSystemsPage"));
const BehaviorReductionPage = lazy(() => import("./pages/clinical-library/BehaviorReductionPage"));
const BehaviorBankPage = lazy(() => import("./pages/clinical-library/BehaviorBankPage"));
const LibraryRegistryPage = lazy(() => import("./pages/clinical-library/LibraryRegistryPage"));
const Intelligence = lazy(() => import("./pages/Intelligence"));
const IntelligenceOps = lazy(() => import("./pages/IntelligenceOps"));
const ClientDrilldown = lazy(() => import("./pages/ClientDrilldown"));
const ClassroomTodayPage = lazy(() => import("./pages/ClassroomToday"));
const StaffProfilePage = lazy(() => import("./components/staff-profile").then(m => ({ default: m.StaffProfilePage })));
const StaffAssignments = lazy(() => import("./pages/StaffAssignments"));
const IncidentLogs = lazy(() => import("./pages/IncidentLogs"));
const PayerDirectoryPage = lazy(() => import("./pages/payers/PayerDirectoryPage"));
const PayerDetailPage = lazy(() => import("./pages/payers/PayerDetailPage"));
const ServiceDetailPage = lazy(() => import("./pages/payers/ServiceDetailPage"));
const Diagnostics = lazy(() => import("./pages/Diagnostics"));
const ExportHours = lazy(() => import("./pages/ExportHours"));
const TeacherComms = lazy(() => import("./pages/TeacherComms"));
const SDCTraining = lazy(() => import("./pages/SDCTraining"));
const SDCModuleDetail = lazy(() => import("./pages/SDCModuleDetail"));
const SDCCertificationTracker = lazy(() => import("./pages/SDCCertificationTracker"));
const BehaviorStrategies = lazy(() => import("./pages/BehaviorStrategies"));
const BehaviorRecommendations = lazy(() => import("./pages/BehaviorRecommendations"));
const BehaviorRecommendationDetail = lazy(() => import("./pages/BehaviorRecommendationDetail"));
const AdvancedDesignAnalysis = lazy(() => import("./pages/AdvancedDesignAnalysis"));
const AskNovaAI = lazy(() => import("./pages/AskNovaAI"));
const NovaAI = lazy(() => import("./pages/NovaAI"));
const GoalOptimization = lazy(() => import("./pages/GoalOptimization"));
const ResourceHub = lazy(() => import("./pages/ResourceHub"));
const Operations = lazy(() => import("./pages/Operations"));
const NotificationSettings = lazy(() => import("./pages/NotificationSettings"));
const CaptureCenter = lazy(() => import("./pages/CaptureCenter"));
const CaptureLive = lazy(() => import("./pages/CaptureLive"));
const CaptureReview = lazy(() => import("./pages/CaptureReview"));
const DemoCenter = lazy(() => import("./pages/DemoCenter"));
const DemoGateway = lazy(() => import("./pages/DemoGateway"));
const ClientDemo = lazy(() => import("./pages/ClientDemo"));
const HelpCenter = lazy(() => import("./pages/HelpCenter"));
const TrainingAcademy = lazy(() => import("./pages/TrainingAcademy"));
const IntakeForms = lazy(() => import("./pages/IntakeForms"));
const NovaCopilot = lazy(() => import("./pages/NovaCopilot"));
const BopsEngine = lazy(() => import("./pages/BopsEngine"));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
);

const queryClient = new QueryClient();

// Generate unique error ID
const generateErrorId = () => `ERR-${Date.now().toString(36).toUpperCase()}`;

// Avoid spamming users with repeated unhandled rejection toasts
let lastUnhandledRejectionKey = '';
let lastUnhandledRejectionAt = 0;

const App = () => {
  const backendGuard = useBackendGuard();

  // Global unhandled rejection handler for defensive error handling
  useEffect(() => {
    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const reasonText =
        reason instanceof Error
          ? `${reason.name}: ${reason.message}`
          : typeof reason === 'string'
            ? reason
            : (() => {
                try {
                  return JSON.stringify(reason);
                } catch {
                  return String(reason);
                }
              })();

      const key = reasonText.slice(0, 200);
      const now = Date.now();
      if (key && key === lastUnhandledRejectionKey && now - lastUnhandledRejectionAt < 8000) {
        event.preventDefault();
        return;
      }

      lastUnhandledRejectionKey = key;
      lastUnhandledRejectionAt = now;

      const errorId = generateErrorId();
      console.error("Unhandled rejection:", event.reason);
      console.error(`Error ID: ${errorId}`);
      toast.error(`Something went wrong. Please refresh. Error ID: ${errorId}`);
      event.preventDefault(); // Prevent crash
    };

    window.addEventListener("unhandledrejection", handleRejection);
    return () => window.removeEventListener("unhandledrejection", handleRejection);
  }, []);

  // Block UI until backend handshake passes
  if (backendGuard.status !== 'ok') {
    return <BackendGuardScreen guard={backendGuard} />;
  }

  return (
    <GlobalErrorBoundary region="App Shell">
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <DemoModeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <SessionTimeoutWarning />
        <BrowserRouter>
        <FloatingCaptureButton />
        <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/post-login" element={
              <ProtectedRoute>
                <PostLoginRouter />
              </ProtectedRoute>
            } />
            {/* Public questionnaire form - no auth required */}
            <Route path="/questionnaire/:token" element={<QuestionnaireForm />} />
            {/* Public consent form - no auth required */}
            <Route path="/consent/:token" element={<ConsentForm />} />
            {/* Public teacher observation form - no auth required */}
            <Route path="/observation/:token" element={<TeacherObservationForm />} />
            {/* Public custom form - no auth required */}
            <Route path="/form/:token" element={<FormRouteResolver />} />
            {/* Public intake form - no auth required */}
            <Route path="/intake-form/:token" element={<FormRouteResolver />} />
            {/* Public clinical form - no auth required */}
            <Route path="/clinical-form/:token" element={<ClinicalFormPage />} />
            <Route path="/pending-approval" element={
              <ProtectedRoute>
                <PendingApproval />
              </ProtectedRoute>
            } />
            {/* Teacher Dashboard - protected but no SyncProvider needed */}
            <Route path="/teacher-dashboard" element={
              <ProtectedRoute>
                <ApprovalCheck>
                  <TeacherDashboard />
                </ApprovalCheck>
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute>
                <ApprovalCheck>
                  <SyncProvider>
                    <Admin />
                  </SyncProvider>
                </ApprovalCheck>
              </ProtectedRoute>
            } />
            <Route path="/security" element={
              <ProtectedRoute>
                <ApprovalCheck>
                  <SyncProvider>
                    <SecuritySettings />
                  </SyncProvider>
                </ApprovalCheck>
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <ApprovalCheck>
                  <SyncProvider>
                    <UserProfile />
                  </SyncProvider>
                </ApprovalCheck>
              </ProtectedRoute>
            } />
            <Route path="/notifications" element={
              <ProtectedRoute>
                <ApprovalCheck>
                  <SyncProvider>
                    <NotificationSettings />
                  </SyncProvider>
                </ApprovalCheck>
              </ProtectedRoute>
            } />
            <Route path="/iep-library" element={
              <ProtectedRoute>
                <ApprovalCheck>
                  <SyncProvider>
                    <IEPLibrary />
                  </SyncProvider>
                </ApprovalCheck>
              </ProtectedRoute>
            } />
            <Route path="/clinical-library" element={
              <ProtectedRoute>
                <ApprovalCheck>
                  <SyncProvider>
                    <ClinicalLibraryLayout />
                  </SyncProvider>
                </ApprovalCheck>
              </ProtectedRoute>
            }>
              <Route path="curriculum-systems" element={<CurriculumSystemsPage />} />
              <Route path="behavior-reduction" element={<BehaviorReductionPage />} />
              <Route path="behavior-bank" element={<BehaviorBankPage />} />
              <Route path="clinical-collections" element={<ClinicalCollectionsPage />} />
              <Route path="clinical-collections/goal-banks" element={<GoalBanksPage />} />
              <Route path="clinical-collections/goal-banks/:domainSlug" element={<GoalBankDomainPage />} />
              <Route path="clinical-collections/goal-banks/:domainSlug/:goalId" element={<GoalDetailPage />} />
              <Route path="library-registry" element={<LibraryRegistryPage />} />
            </Route>
            <Route path="/shared-library" element={
              <ProtectedRoute>
                <ApprovalCheck>
                  <SyncProvider>
                    <ResourceHub />
                  </SyncProvider>
                </ApprovalCheck>
              </ProtectedRoute>
            } />
            <Route path="/resource-hub" element={
              <ProtectedRoute>
                <ApprovalCheck>
                  <SyncProvider>
                    <ResourceHub />
                  </SyncProvider>
                </ApprovalCheck>
              </ProtectedRoute>
            } />
            <Route path="/operations" element={
              <ProtectedRoute>
                <ApprovalCheck>
                  <SyncProvider>
                    <Operations />
                  </SyncProvider>
                </ApprovalCheck>
              </ProtectedRoute>
            } />
            <Route path="/behaviors" element={<Navigate to="/clinical-library/behavior-bank" replace />} />
            <Route path="/supervision" element={
              <ProtectedRoute>
                <ApprovalCheck>
                  <SyncProvider>
                    <Supervision />
                  </SyncProvider>
                </ApprovalCheck>
              </ProtectedRoute>
            } />
            <Route path="/referrals" element={
              <ProtectedRoute>
                <ApprovalCheck>
                  <SyncProvider>
                    <Referrals />
                  </SyncProvider>
                </ApprovalCheck>
              </ProtectedRoute>
            } />
            <Route path="/billing" element={
              <ProtectedRoute>
                <ApprovalCheck>
                  <SyncProvider>
                    <Billing />
                  </SyncProvider>
                </ApprovalCheck>
              </ProtectedRoute>
            } />
            <Route path="/billing/policy" element={
              <ProtectedRoute>
                <ApprovalCheck>
                  <SyncProvider>
                    <AgencyBillingPolicy />
                  </SyncProvider>
                </ApprovalCheck>
              </ProtectedRoute>
            } />
            <Route path="/billing/export-hours" element={
              <ProtectedRoute>
                <ApprovalCheck>
                  <SyncProvider>
                    <ExportHours />
                  </SyncProvider>
                </ApprovalCheck>
              </ProtectedRoute>
            } />
             <Route path="/billing/payers" element={
               <ProtectedRoute>
                 <ApprovalCheck>
                   <SyncProvider>
                     <PayerDirectoryPage />
                   </SyncProvider>
                 </ApprovalCheck>
               </ProtectedRoute>
             } />
             <Route path="/billing/payers/:payerId" element={
               <ProtectedRoute>
                 <ApprovalCheck>
                   <SyncProvider>
                     <PayerDetailPage />
                   </SyncProvider>
                 </ApprovalCheck>
               </ProtectedRoute>
             } />
             <Route path="/billing/payers/:payerId/services/:serviceId" element={
               <ProtectedRoute>
                 <ApprovalCheck>
                   <SyncProvider>
                     <ServiceDetailPage />
                   </SyncProvider>
                 </ApprovalCheck>
               </ProtectedRoute>
             } />
            <Route path="/analytics" element={
              <ProtectedRoute>
                <ApprovalCheck>
                  <SyncProvider>
                    <Analytics />
                  </SyncProvider>
                </ApprovalCheck>
              </ProtectedRoute>
            } />
            <Route path="/recruiting" element={
              <ProtectedRoute>
                <ApprovalCheck>
                  <SyncProvider>
                    <Recruiting />
                  </SyncProvider>
                </ApprovalCheck>
              </ProtectedRoute>
            } />
            <Route path="/lms" element={
              <ProtectedRoute>
                <ApprovalCheck>
                  <SyncProvider>
                    <LMS />
                  </SyncProvider>
                </ApprovalCheck>
              </ProtectedRoute>
            } />
            <Route path="/parent-training" element={
              <ProtectedRoute>
                <ApprovalCheck>
                  <SyncProvider>
                    <ParentTrainingAdmin />
                  </SyncProvider>
                </ApprovalCheck>
              </ProtectedRoute>
            } />
            <Route path="/parent-training/view" element={
              <ProtectedRoute>
                <ParentTrainingViewer />
              </ProtectedRoute>
            } />
            <Route path="/parent-training/:moduleId" element={
              <ProtectedRoute>
                <ParentModulePlayer />
              </ProtectedRoute>
            } />
            <Route path="/module/:moduleId" element={
              <ProtectedRoute>
                <ApprovalCheck>
                  <SyncProvider>
                    <ModulePlayer />
                  </SyncProvider>
                </ApprovalCheck>
              </ProtectedRoute>
            } />
            <Route path="/inbox" element={
              <ProtectedRoute>
                <ApprovalCheck>
                  <SyncProvider>
                    <DocumentInbox />
                  </SyncProvider>
                </ApprovalCheck>
              </ProtectedRoute>
            } />
            <Route element={
              <ProtectedRoute>
                <ApprovalCheck>
                  <SyncProvider>
                    <MainLayout />
                  </SyncProvider>
                </ApprovalCheck>
              </ProtectedRoute>
            }>
              <Route path="/" element={<Dashboard />} />
              <Route path="/students" element={<Students />} />
              <Route path="/students/:studentId" element={<StudentProfile />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/assessment" element={<AssessmentDashboard />} />
              <Route path="/clinical" element={<Clinical />} />
              <Route path="/skills" element={<SkillAcquisition />} />
              <Route path="/schedule" element={<Schedule />} />
              <Route path="/notes-review" element={<NotesReview />} />
              <Route path="/staff/:userId" element={<StaffProfilePage />} />
              <Route path="/staff-assignments" element={<StaffAssignments />} />
              <Route path="/incident-logs" element={<IncidentLogs />} />
              <Route path="/intelligence" element={<Intelligence />} />
              <Route path="/intelligence/ops" element={<IntelligenceOps />} />
              <Route path="/intelligence/clients/:clientId" element={<ClientDrilldown />} />
              <Route path="/intelligence/classroom/:classroomId" element={<ClassroomTodayPage />} />
              <Route path="/diagnostics" element={<Diagnostics />} />
              <Route path="/teacher-comms" element={<TeacherComms />} />
              <Route path="/academy/lab" element={<BehaviorLabCatalog />} />
              <Route path="/academy/lab/:gameId" element={<BehaviorLabPlayer />} />
              <Route path="/advanced-design" element={<AdvancedDesignAnalysis />} />
              <Route path="/ask-nova" element={<AskNovaAI />} />
              <Route path="/nova-ai" element={<NovaAI />} />
              <Route path="/nova-copilot" element={<NovaCopilot />} />
              <Route path="/optimization" element={<GoalOptimization />} />
              <Route path="/capture" element={<CaptureCenter />} />
              <Route path="/demo" element={<DemoGateway />} />
              <Route path="/demo-center" element={<DemoCenter />} />
              <Route path="/demo/learners" element={<DemoCenter />} />
              <Route path="/demo/workflows" element={<DemoCenter />} />
              <Route path="/demo/training" element={<TrainingAcademy />} />
              <Route path="/demo/help" element={<HelpCenter />} />
              <Route path="/demo/client" element={<ClientDemo />} />
              <Route path="/help-center" element={<HelpCenter />} />
              <Route path="/training-academy" element={<TrainingAcademy />} />
              <Route path="/intake-forms" element={<IntakeForms />} />
              <Route path="/bops" element={<BopsEngine />} />
            </Route>
            {/* Capture Live & Review - outside MainLayout for full-screen experience */}
            <Route path="/capture/live/:recordingId" element={
              <ProtectedRoute>
                <ApprovalCheck>
                  <CaptureLive />
                </ApprovalCheck>
              </ProtectedRoute>
            } />
            <Route path="/capture/review/:recordingId" element={
              <ProtectedRoute>
                <ApprovalCheck>
                  <CaptureReview />
                </ApprovalCheck>
              </ProtectedRoute>
            } />
            <Route path="/behavior-library" element={<Navigate to="/clinical-library/behavior-bank" replace />} />
            <Route path="/academy" element={
              <ProtectedRoute>
                <ApprovalCheck>
                  <SyncProvider>
                    <Academy />
                  </SyncProvider>
                </ApprovalCheck>
              </ProtectedRoute>
            } />
            <Route path="/intervention-builder" element={
              <ProtectedRoute>
                <ApprovalCheck>
                  <SyncProvider>
                    <InterventionBuilder />
                  </SyncProvider>
                </ApprovalCheck>
              </ProtectedRoute>
            } />
            <Route path="/sdc-training" element={
              <ProtectedRoute>
                <ApprovalCheck>
                  <SyncProvider>
                    <SDCTraining />
                  </SyncProvider>
                </ApprovalCheck>
              </ProtectedRoute>
            } />
            <Route path="/sdc-training/module/:id" element={
              <ProtectedRoute>
                <ApprovalCheck>
                  <SyncProvider>
                    <SDCModuleDetail />
                  </SyncProvider>
                </ApprovalCheck>
              </ProtectedRoute>
            } />
            <Route path="/sdc-training/certification" element={
              <ProtectedRoute>
                <ApprovalCheck>
                  <SyncProvider>
                    <SDCCertificationTracker />
                  </SyncProvider>
                </ApprovalCheck>
              </ProtectedRoute>
            } />
            <Route path="/behavior-strategies" element={
              <ProtectedRoute>
                <ApprovalCheck>
                  <SyncProvider>
                    <BehaviorStrategies />
                  </SyncProvider>
                </ApprovalCheck>
              </ProtectedRoute>
            } />
            <Route path="/behavior-recommendations" element={
              <ProtectedRoute>
                <ApprovalCheck>
                  <SyncProvider>
                    <BehaviorRecommendations />
                  </SyncProvider>
                </ApprovalCheck>
              </ProtectedRoute>
            } />
            <Route path="/behavior-recommendations/result/:id" element={
              <ProtectedRoute>
                <ApprovalCheck>
                  <SyncProvider>
                    <BehaviorRecommendationDetail />
                  </SyncProvider>
                </ApprovalCheck>
              </ProtectedRoute>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
      </DemoModeProvider>
    </AuthProvider>
  </QueryClientProvider>
  </GlobalErrorBoundary>
  );
};

export default App;