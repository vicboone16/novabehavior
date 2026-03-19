import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { SyncProvider } from "@/contexts/SyncContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ApprovalCheck } from "@/components/ApprovalCheck";
import { SessionTimeoutWarning } from "@/components/SessionTimeoutWarning";
import MainLayout from "./components/MainLayout";
import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import StudentProfile from "./pages/StudentProfile";
import Reports from "./pages/Reports";
import AssessmentDashboard from "./pages/AssessmentDashboard";
import Clinical from "./pages/Clinical";
import SkillAcquisition from "./pages/SkillAcquisition";
import NotesReview from "./pages/NotesReview";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import PostLoginRouter from "./pages/PostLoginRouter";
import Admin from "./pages/Admin";
import BehaviorLibrary from "./pages/BehaviorLibrary";
import PendingApproval from "./pages/PendingApproval";
import UserProfile from "./pages/UserProfile";
import Schedule from "./pages/Schedule";
import SecuritySettings from "./pages/SecuritySettings";
import TeacherDashboard from "./pages/TeacherDashboard";
import QuestionnaireForm from "./pages/QuestionnaireForm";
import ConsentForm from "./pages/ConsentForm";
import TeacherObservationForm from "./pages/TeacherObservationForm";
import PublicFormPage from "./pages/PublicFormPage";
import DocumentInbox from "./pages/DocumentInbox";
import Supervision from "./pages/Supervision";
import Referrals from "./pages/Referrals";
import Billing from "./pages/Billing";
import AgencyBillingPolicy from "./pages/AgencyBillingPolicy";
import Analytics from "./pages/Analytics";
import Recruiting from "./pages/Recruiting";
import LMS from "./pages/LMS";
import ParentTrainingAdmin from "./pages/ParentTrainingAdmin";
import ParentTrainingViewer from "./pages/ParentTrainingViewer";
import ParentModulePlayer from "./pages/ParentModulePlayer";
import ModulePlayer from "./pages/ModulePlayer";
import NotFound from "./pages/NotFound";
import BehaviorLabCatalog from "./pages/BehaviorLabCatalog";
import BehaviorLabPlayer from "./pages/BehaviorLabPlayer";
import IEPLibrary from "./pages/IEPLibrary";
import BehaviorLibraryFull from "./pages/BehaviorLibraryFull";
import Academy from "./pages/Academy";
import InterventionBuilder from "./pages/InterventionBuilder";
import ClinicalLibraryLayout from "./pages/clinical-library/ClinicalLibraryLayout";
import ClinicalCollectionsPage from "./pages/clinical-library/ClinicalCollectionsPage";
import GoalBanksPage from "./pages/clinical-library/GoalBanksPage";
import GoalBankDomainPage from "./pages/clinical-library/GoalBankDomainPage";
import GoalDetailPage from "./pages/clinical-library/GoalDetailPage";
import CurriculumSystemsPage from "./pages/clinical-library/CurriculumSystemsPage";
import BehaviorReductionPage from "./pages/clinical-library/BehaviorReductionPage";
import LibraryRegistryPage from "./pages/clinical-library/LibraryRegistryPage";
import Intelligence from "./pages/Intelligence";
import IntelligenceOps from "./pages/IntelligenceOps";
import ClientDrilldown from "./pages/ClientDrilldown";
import ClassroomTodayPage from "./pages/ClassroomToday";
import { StaffProfilePage } from "./components/staff-profile";
import StaffAssignments from "./pages/StaffAssignments";
import IncidentLogs from "./pages/IncidentLogs";
 import PayerDirectoryPage from "./pages/payers/PayerDirectoryPage";
 import PayerDetailPage from "./pages/payers/PayerDetailPage";
 import ServiceDetailPage from "./pages/payers/ServiceDetailPage";
import { toast } from "sonner";
import { useBackendGuard } from "@/hooks/useBackendGuard";
import { BackendGuardScreen } from "@/components/BackendGuardScreen";
import { GlobalErrorBoundary } from "@/components/GlobalErrorBoundary";
import Diagnostics from "./pages/Diagnostics";
import ExportHours from "./pages/ExportHours";
import TeacherComms from "./pages/TeacherComms";
import SDCTraining from "./pages/SDCTraining";
import SDCModuleDetail from "./pages/SDCModuleDetail";
import SDCCertificationTracker from "./pages/SDCCertificationTracker";
import BehaviorStrategies from "./pages/BehaviorStrategies";
import BehaviorRecommendations from "./pages/BehaviorRecommendations";
import BehaviorRecommendationDetail from "./pages/BehaviorRecommendationDetail";
import AdvancedDesignAnalysis from "./pages/AdvancedDesignAnalysis";
import AskNovaAI from "./pages/AskNovaAI";
import NovaAI from "./pages/NovaAI";
import GoalOptimization from "./pages/GoalOptimization";
import ResourceHub from "./pages/ResourceHub";
import Operations from "./pages/Operations";
import NotificationSettings from "./pages/NotificationSettings";
import CaptureCenter from "./pages/CaptureCenter";
import CaptureLive from "./pages/CaptureLive";
import CaptureReview from "./pages/CaptureReview";
import DemoCenter from "./pages/DemoCenter";
import DemoGateway from "./pages/DemoGateway";
import HelpCenter from "./pages/HelpCenter";
import TrainingAcademy from "./pages/TrainingAcademy";
import IntakeForms from "./pages/IntakeForms";
import { FloatingCaptureButton } from "./components/voice-capture/FloatingCaptureButton";
import { DemoModeProvider } from "./contexts/DemoModeContext";

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
            <Route path="/form/:token" element={<PublicFormPage />} />
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
            <Route path="/behaviors" element={
              <ProtectedRoute>
                <ApprovalCheck>
                  <SyncProvider>
                    <BehaviorLibrary />
                  </SyncProvider>
                </ApprovalCheck>
              </ProtectedRoute>
            } />
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
              <Route path="/optimization" element={<GoalOptimization />} />
              <Route path="/capture" element={<CaptureCenter />} />
              <Route path="/demo" element={<DemoGateway />} />
              <Route path="/demo-center" element={<DemoCenter />} />
              <Route path="/demo/learners" element={<DemoCenter />} />
              <Route path="/demo/workflows" element={<DemoCenter />} />
              <Route path="/demo/training" element={<TrainingAcademy />} />
              <Route path="/demo/help" element={<HelpCenter />} />
              <Route path="/help-center" element={<HelpCenter />} />
              <Route path="/training-academy" element={<TrainingAcademy />} />
              <Route path="/intake-forms" element={<IntakeForms />} />
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
            <Route path="/behavior-library" element={
              <ProtectedRoute>
                <ApprovalCheck>
                  <SyncProvider>
                    <BehaviorLibraryFull />
                  </SyncProvider>
                </ApprovalCheck>
              </ProtectedRoute>
            } />
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
    </AuthProvider>
  </QueryClientProvider>
  </GlobalErrorBoundary>
  );
};

export default App;