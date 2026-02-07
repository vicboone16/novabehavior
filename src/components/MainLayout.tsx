import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  ClipboardList, 
  LayoutDashboard, 
  Users, 
  FileBarChart, 
  Loader2, 
  ClipboardCheck, 
  Target, 
  Calendar, 
  GraduationCap, 
  FileCheck,
  UserCheck,
  UserPlus,
  DollarSign,
  BarChart3,
  BookOpen,
  Smartphone,
  Briefcase,
  GraduationCap as GraduationCapIcon
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { BehaviorManager } from '@/components/BehaviorManager';
import { UserMenu } from '@/components/UserMenu';
import { NotificationBell } from '@/components/NotificationBell';
import { GlobalSearch } from '@/components/GlobalSearch';
import { AgencySwitcher } from '@/components/AgencySwitcher';
import { useSync } from '@/contexts/SyncContext';
import { PendingApprovalsNotification } from '@/components/PendingApprovalsNotification';
import { useAuth } from '@/contexts/AuthContext';
import { useIsDeviceMobile } from '@/hooks/use-mobile';
import { useMobilePreference } from '@/hooks/useMobilePreference';

export default function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoading } = useSync();
  const { userRole } = useAuth();
  const isDeviceMobile = useIsDeviceMobile();
  const { preference, setMobilePreference } = useMobilePreference();
  
  // Show "Return to Mobile" button when user opted for desktop on a mobile device
  const showMobileButton = isDeviceMobile && preference === 'desktop';
  
  // Check if user can view notes review (admin or super_admin)
  const canViewNotesReview = userRole === 'admin' || userRole === 'super_admin';
  
  // Determine active tab from path
  const getActiveTab = () => {
    if (location.pathname.startsWith('/students')) return 'students';
    if (location.pathname.startsWith('/reports')) return 'reports';
    if (location.pathname.startsWith('/assessment')) return 'assessment';
    if (location.pathname.startsWith('/skills')) return 'skills';
    if (location.pathname.startsWith('/schedule')) return 'schedule';
    if (location.pathname.startsWith('/notes-review')) return 'notes-review';
    return 'dashboard';
  };

  const handleTabChange = (value: string) => {
    switch (value) {
      case 'dashboard':
        navigate('/');
        break;
      case 'students':
        navigate('/students');
        break;
      case 'reports':
        navigate('/reports');
        break;
      case 'assessment':
        navigate('/assessment');
        break;
      case 'skills':
        navigate('/skills');
        break;
      case 'schedule':
        navigate('/schedule');
        break;
      case 'notes-review':
        navigate('/notes-review');
        break;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Pending Approvals Notification for Admins */}
      <PendingApprovalsNotification />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 p-6 rounded-lg bg-card border shadow-lg">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Syncing your data...</p>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-20">
        <div className="container py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
                  <ClipboardList className="w-4 h-4 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-foreground">Behavior Data Collector</h1>
                  <p className="text-xs text-muted-foreground">ABC, Frequency, Duration & Interval</p>
                </div>
              </div>
              <AgencySwitcher />
            </div>
            <div className="flex items-center gap-2">
              <GlobalSearch />
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/supervision')}
                className="gap-1"
              >
                <UserCheck className="w-4 h-4" />
                <span className="hidden sm:inline">Supervision</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/referrals')}
                className="gap-1"
              >
                <UserPlus className="w-4 h-4" />
                <span className="hidden sm:inline">Referrals</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/billing')}
                className="gap-1"
              >
                <DollarSign className="w-4 h-4" />
                <span className="hidden sm:inline">Billing</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/analytics')}
                className="gap-1"
              >
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">Analytics</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/iep-library')}
                className="gap-1"
              >
                <BookOpen className="w-4 h-4" />
                <span className="hidden sm:inline">IEP Library</span>
              </Button>
              {(userRole === 'admin' || userRole === 'super_admin') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/recruiting')}
                  className="gap-1"
                >
                  <Briefcase className="w-4 h-4" />
                  <span className="hidden sm:inline">Recruiting</span>
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/lms')}
                className="gap-1"
              >
                <GraduationCapIcon className="w-4 h-4" />
                <span className="hidden sm:inline">LMS</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/teacher-dashboard')}
                className="gap-2"
              >
                <GraduationCap className="w-4 h-4" />
                <span className="hidden sm:inline">Teacher Mode</span>
              </Button>
              <BehaviorManager />
              <NotificationBell />
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="border-b border-border bg-card/50">
        <div className="container">
          <Tabs value={getActiveTab()} onValueChange={handleTabChange}>
            <TabsList className="h-12 bg-transparent border-none">
              <TabsTrigger 
                value="dashboard" 
                className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger 
                value="students" 
                className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
              >
                <Users className="w-4 h-4" />
                Students
              </TabsTrigger>
              <TabsTrigger 
                value="assessment" 
                className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
              >
                <ClipboardCheck className="w-4 h-4" />
                Assessment
              </TabsTrigger>
              <TabsTrigger 
                value="skills" 
                className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
              >
                <Target className="w-4 h-4" />
                Skills
              </TabsTrigger>
              <TabsTrigger 
                value="reports" 
                className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
              >
                <FileBarChart className="w-4 h-4" />
                Reports
              </TabsTrigger>
              <TabsTrigger 
                value="schedule" 
                className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
              >
                <Calendar className="w-4 h-4" />
                Schedule
              </TabsTrigger>
              {canViewNotesReview && (
                <TabsTrigger 
                  value="notes-review" 
                  className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                >
                  <FileCheck className="w-4 h-4" />
                  Notes Review
                </TabsTrigger>
              )}
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Main Content */}
      <main className="container py-4">
        <Outlet />
      </main>

      {/* Floating "Return to Mobile View" button when opted for desktop on mobile */}
      {showMobileButton && (
        <Button
          onClick={() => setMobilePreference('auto')}
          className="fixed bottom-4 right-4 z-40 shadow-lg gap-2"
          size="sm"
        >
          <Smartphone className="w-4 h-4" />
          Mobile View
        </Button>
      )}
    </div>
  );
}