import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ClipboardList, LayoutDashboard, Users, FileBarChart, Loader2, ClipboardCheck } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BehaviorManager } from '@/components/BehaviorManager';
import { UserMenu } from '@/components/UserMenu';
import { useSync } from '@/contexts/SyncContext';

export default function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoading } = useSync();
  
  // Determine active tab from path
  const getActiveTab = () => {
    if (location.pathname.startsWith('/students')) return 'students';
    if (location.pathname.startsWith('/reports')) return 'reports';
    if (location.pathname.startsWith('/assessment')) return 'assessment';
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
    }
  };

  return (
    <div className="min-h-screen bg-background">
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
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
                <ClipboardList className="w-4 h-4 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">Behavior Data Collector</h1>
                <p className="text-xs text-muted-foreground">ABC, Frequency, Duration & Interval</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <BehaviorManager />
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
                value="reports" 
                className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
              >
                <FileBarChart className="w-4 h-4" />
                Reports
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Main Content */}
      <main className="container py-4">
        <Outlet />
      </main>
    </div>
  );
}
