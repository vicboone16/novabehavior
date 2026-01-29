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
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import BehaviorLibrary from "./pages/BehaviorLibrary";
import PendingApproval from "./pages/PendingApproval";
import UserProfile from "./pages/UserProfile";
import Schedule from "./pages/Schedule";
import SecuritySettings from "./pages/SecuritySettings";
import TeacherDashboard from "./pages/TeacherDashboard";
import QuestionnaireForm from "./pages/QuestionnaireForm";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
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
            </Route>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;