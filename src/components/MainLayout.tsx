import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  FileBarChart, 
  Loader2, 
  ClipboardCheck, 
  Calendar, 
  GraduationCap, 
  FileCheck,
  UserCheck,
  UserPlus,
  DollarSign,
  BookOpen,
  Smartphone,
  Menu,
  Stethoscope
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

import { UserMenu } from '@/components/UserMenu';
import { NotificationBell } from '@/components/NotificationBell';
import { GlobalSearch } from '@/components/GlobalSearch';
import { AgencySwitcher } from '@/components/AgencySwitcher';
import { useSync } from '@/contexts/SyncContext';
import { PendingApprovalsNotification } from '@/components/PendingApprovalsNotification';
import { useAuth } from '@/contexts/AuthContext';
import { useIsDeviceMobile } from '@/hooks/use-mobile';
import { useMobilePreference } from '@/hooks/useMobilePreference';
import { useFeaturePermissions } from '@/hooks/useFeaturePermissions';
import { useClinicalIntelligenceAccess } from '@/hooks/useClinicalIntelligence';
import { useEntityLabel } from '@/hooks/useEntityLabel';
import { Brain, Inbox, FlaskConical, BrainCircuit } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { usePendingChangesCount } from '@/hooks/usePendingChangesCount';
import { useAdvancedDesignAccess } from '@/hooks/useAdvancedDesignAccess';

export default function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoading } = useSync();
  const { userRole } = useAuth();
  const isDeviceMobile = useIsDeviceMobile();
  const { preference, setMobilePreference } = useMobilePreference();
  const featurePerms = useFeaturePermissions();
  const { hasCIDAccess } = useClinicalIntelligenceAccess();
  const entityLabel = useEntityLabel();
  const { data: commsCounts } = usePendingChangesCount();
  const { hasAccess: hasAdvancedDesignAccess } = useAdvancedDesignAccess();
  
  // Show "Return to Mobile" button when user opted for desktop on a mobile device
  const showMobileButton = isDeviceMobile && preference === 'desktop';
  
  // Check if user can view notes review (admin or super_admin)
  const canViewNotesReview = userRole === 'admin' || userRole === 'super_admin';
  
  // Determine active tab from path
  const getActiveTab = () => {
    if (location.pathname.startsWith('/students')) return 'students';
    if (location.pathname.startsWith('/clinical')) return 'clinical';
    if (location.pathname.startsWith('/assessment')) return 'clinical'; // redirect assessment to clinical
    if (location.pathname.startsWith('/reports')) return 'reports';
    if (location.pathname.startsWith('/schedule')) return 'schedule';
    if (location.pathname.startsWith('/notes-review')) return 'notes-review';
    if (location.pathname.startsWith('/intelligence')) return 'intelligence';
    if (location.pathname.startsWith('/teacher-comms')) return 'teacher-comms';
    if (location.pathname.startsWith('/advanced-design')) return 'advanced-design';
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
      case 'clinical':
        navigate('/clinical');
        break;
      case 'reports':
        navigate('/reports');
        break;

      case 'schedule':
        navigate('/schedule');
        break;
      case 'notes-review':
        navigate('/notes-review');
        break;
      case 'intelligence':
        navigate('/intelligence');
        break;
      case 'teacher-comms':
        navigate('/teacher-comms');
        break;
      case 'advanced-design':
        navigate('/advanced-design');
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
        <div className="container py-2 md:py-3 px-3 md:px-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 md:gap-4 min-w-0">
              <AgencySwitcher />
            </div>
            <div className="flex items-center gap-1 md:gap-2 shrink-0">
              <GlobalSearch />
              <div className="hidden lg:flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => navigate('/supervision')} className="gap-1">
                  <UserCheck className="w-4 h-4" />
                  <span>Supervision</span>
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate('/referrals')} className="gap-1">
                  <UserPlus className="w-4 h-4" />
                  <span>Referrals</span>
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate('/billing')} className="gap-1">
                  <DollarSign className="w-4 h-4" />
                  <span>Billing</span>
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate('/clinical-library')} className="gap-1">
                  <BookOpen className="w-4 h-4" />
                  <span>Clinical Library</span>
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate('/nova-ai')} className="gap-1">
                  <BrainCircuit className="w-4 h-4" />
                  <span>Nova AI</span>
                </Button>
                {featurePerms.teacher_mode_access && (
                  <Button variant="outline" size="sm" onClick={() => navigate('/teacher-dashboard')} className="gap-2">
                    <GraduationCap className="w-4 h-4" />
                    <span>Teacher Mode</span>
                  </Button>
                )}
              </div>
              {/* Mobile-only dropdown menu for nav */}
              <div className="flex lg:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Menu className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => navigate('/supervision')}>
                      <UserCheck className="w-4 h-4 mr-2" />
                      Supervision
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/referrals')}>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Referrals
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/billing')}>
                      <DollarSign className="w-4 h-4 mr-2" />
                      Billing
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/clinical-library')}>
                      <BookOpen className="w-4 h-4 mr-2" />
                      Clinical Library
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/ask-nova')}>
                      <BrainCircuit className="w-4 h-4 mr-2" />
                      Ask Nova AI
                    </DropdownMenuItem>
                    {featurePerms.teacher_mode_access && (
                      <DropdownMenuItem onClick={() => navigate('/teacher-dashboard')}>
                        <GraduationCap className="w-4 h-4 mr-2" />
                        Teacher Mode
                      </DropdownMenuItem>
                    )}
                    {hasCIDAccess && (
                      <DropdownMenuItem onClick={() => navigate('/intelligence')}>
                        <Brain className="w-4 h-4 mr-2" />
                        Intelligence
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <NotificationBell />
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation - horizontally scrollable on mobile */}
      <div className="border-b border-border bg-card/50 overflow-x-auto scrollbar-hide">
        <div className="container px-3 md:px-4">
          <Tabs value={getActiveTab()} onValueChange={handleTabChange}>
            <TabsList className="h-10 md:h-12 bg-transparent border-none w-max min-w-full flex">
              <TabsTrigger 
                value="dashboard" 
                className="gap-1.5 md:gap-2 text-xs md:text-sm whitespace-nowrap data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=active]:font-bold"
              >
                <LayoutDashboard className="w-3.5 h-3.5 md:w-4 md:h-4" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger 
                value="students" 
                className="gap-1.5 md:gap-2 text-xs md:text-sm whitespace-nowrap data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=active]:font-bold"
              >
                <Users className="w-3.5 h-3.5 md:w-4 md:h-4" />
                {entityLabel.plural}
              </TabsTrigger>
              <TabsTrigger 
                value="clinical" 
                className="gap-1.5 md:gap-2 text-xs md:text-sm whitespace-nowrap data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=active]:font-bold"
              >
                <Stethoscope className="w-3.5 h-3.5 md:w-4 md:h-4" />
                Clinical
              </TabsTrigger>




              <TabsTrigger 
                value="reports" 
                className="gap-1.5 md:gap-2 text-xs md:text-sm whitespace-nowrap data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=active]:font-bold"
              >
                <FileBarChart className="w-3.5 h-3.5 md:w-4 md:h-4" />
                Reports
              </TabsTrigger>
              <TabsTrigger 
                value="schedule" 
                className="gap-1.5 md:gap-2 text-xs md:text-sm whitespace-nowrap data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=active]:font-bold"
              >
                <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4" />
                Schedule
              </TabsTrigger>
              {hasCIDAccess && (
                <TabsTrigger 
                  value="intelligence" 
                  className="gap-1.5 md:gap-2 text-xs md:text-sm whitespace-nowrap data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=active]:font-bold"
                >
                  <Brain className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  Intelligence
                </TabsTrigger>
              )}
              
              {canViewNotesReview && (
                <TabsTrigger 
                  value="notes-review" 
                  className="gap-1.5 md:gap-2 text-xs md:text-sm whitespace-nowrap data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=active]:font-bold"
                >
                  <FileCheck className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  Notes Review
                </TabsTrigger>
              )}
              <TabsTrigger 
                value="teacher-comms" 
                className="gap-1.5 md:gap-2 text-xs md:text-sm whitespace-nowrap data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=active]:font-bold relative"
              >
                <Inbox className="w-3.5 h-3.5 md:w-4 md:h-4" />
                Teacher Comms
                {(commsCounts?.total || 0) > 0 && (
                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0 ml-1 h-4 min-w-4">
                    {commsCounts!.total > 99 ? '99+' : commsCounts!.total}
                  </Badge>
                )}
              </TabsTrigger>
              {hasAdvancedDesignAccess && (
                <TabsTrigger 
                  value="advanced-design" 
                  className="gap-1.5 md:gap-2 text-xs md:text-sm whitespace-nowrap data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=active]:font-bold"
                >
                  <FlaskConical className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  Design Lab
                </TabsTrigger>
              )}
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Main Content */}
      <main className="container py-3 md:py-4 px-3 md:px-4">
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