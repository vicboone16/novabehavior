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
import SkillAcquisition from "./pages/SkillAcquisition";
import NotesReview from "./pages/NotesReview";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import BehaviorLibrary from "./pages/BehaviorLibrary";
import PendingApproval from "./pages/PendingApproval";
import UserProfile from "./pages/UserProfile";
import Schedule from "./pages/Schedule";
import SecuritySettings from "./pages/SecuritySettings";
import TeacherDashboard from "./pages/TeacherDashboard";
import QuestionnaireForm from "./pages/QuestionnaireForm";
import ConsentForm from "./pages/ConsentForm";
import DocumentInbox from "./pages/DocumentInbox";
import Supervision from "./pages/Supervision";
import Referrals from "./pages/Referrals";
import Billing from "./pages/Billing";
import Analytics from "./pages/Analytics";
import NotFound from "./pages/NotFound";
import { StaffProfilePage } from "./components/staff-profile";
import { toast } from "sonner";

const queryClient = new QueryClient();

// Generate unique error ID
const generateErrorId = () => `ERR-${Date.now().toString(36).toUpperCase()}`;

const App = () => {
  // Global unhandled rejection handler for defensive error handling
  useEffect(() => {
    const handleRejection = (event: PromiseRejectionEvent) => {
      const errorId = generateErrorId();
      console.error("Unhandled rejection:", event.reason);
      console.error(`Error ID: ${errorId}`);
      toast.error(`Something went wrong. Please refresh. Error ID: ${errorId}`);
      event.preventDefault(); // Prevent crash
    };

    window.addEventListener("unhandledrejection", handleRejection);
    return () => window.removeEventListener("unhandledrejection", handleRejection);
  }, []);

  return (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <SessionTimeoutWarning />
        <BrowserRouter>
        <Routes>
            <Route path="/auth" element={<Auth />} />
            {/* Public questionnaire form - no auth required */}
            <Route path="/questionnaire/:token" element={<QuestionnaireForm />} />
            {/* Public consent form - no auth required */}
            <Route path="/consent/:token" element={<ConsentForm />} />
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
            <Route path="/analytics" element={
              <ProtectedRoute>
                <ApprovalCheck>
                  <SyncProvider>
                    <Analytics />
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
              <Route path="/skills" element={<SkillAcquisition />} />
              <Route path="/schedule" element={<Schedule />} />
              <Route path="/notes-review" element={<NotesReview />} />
              <Route path="/staff/:userId" element={<StaffProfilePage />} />
            </Route>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
  );
};

export default App;