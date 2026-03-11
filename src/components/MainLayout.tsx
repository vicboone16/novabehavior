import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Loader2, Menu, Smartphone } from 'lucide-react';
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
import { useIsDeviceMobile } from '@/hooks/use-mobile';
import { useMobilePreference } from '@/hooks/useMobilePreference';
import { useEntityLabel } from '@/hooks/useEntityLabel';
import { Badge } from '@/components/ui/badge';
import { usePendingChangesCount } from '@/hooks/usePendingChangesCount';
import { useAppNavigation, type NavItem } from '@/hooks/useAppNavigation';
import { getNavIcon } from '@/lib/navIcons';

export default function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoading } = useSync();
  const isDeviceMobile = useIsDeviceMobile();
  const { preference, setMobilePreference } = useMobilePreference();
  const entityLabel = useEntityLabel();
  const { data: commsCounts } = usePendingChangesCount();
  const { primaryTabs, headerButtons, isLoading: navLoading } = useAppNavigation();

  const showMobileButton = isDeviceMobile && preference === 'desktop';

  // Determine active tab from path
  const getActiveTab = () => {
    const path = location.pathname;
    // Match longest route first among primary tabs
    let best: NavItem | null = null;
    for (const tab of primaryTabs) {
      if (!tab.route) continue;
      if (tab.route === '/' && path === '/') { best = tab; break; }
      if (tab.route !== '/' && path.startsWith(tab.route)) {
        if (!best || tab.route.length > (best.route?.length || 0)) best = tab;
      }
    }
    return best?.nav_key || 'dashboard';
  };

  const handleTabChange = (value: string) => {
    const tab = primaryTabs.find(t => t.nav_key === value);
    if (tab?.route) navigate(tab.route);
  };

  const resolveLabel = (item: NavItem) => {
    if (item.nav_key === 'students') return entityLabel.plural;
    return item.label;
  };

  return (
    <div className="min-h-screen bg-background">
      <PendingApprovalsNotification />

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
              {/* Desktop header buttons – rendered from DB */}
              <div className="hidden lg:flex items-center gap-2">
                {headerButtons.map(item => {
                  const Icon = getNavIcon(item.icon);
                  return (
                    <Button
                      key={item.nav_key}
                      variant="outline"
                      size="sm"
                      onClick={() => item.route && navigate(item.route)}
                      className="gap-1"
                    >
                      {Icon && <Icon className="w-4 h-4" />}
                      <span>{item.label}</span>
                    </Button>
                  );
                })}
              </div>
              {/* Mobile dropdown – rendered from DB */}
              <div className="flex lg:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Menu className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    {headerButtons.map(item => {
                      const Icon = getNavIcon(item.icon);
                      return (
                        <DropdownMenuItem
                          key={item.nav_key}
                          onClick={() => item.route && navigate(item.route)}
                        >
                          {Icon && <Icon className="w-4 h-4 mr-2" />}
                          {item.label}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <NotificationBell />
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation – rendered from DB */}
      <div className="border-b border-border bg-card/50 overflow-x-auto scrollbar-hide">
        <div className="container px-3 md:px-4">
          <Tabs value={getActiveTab()} onValueChange={handleTabChange}>
            <TabsList className="h-10 md:h-12 bg-transparent border-none w-max min-w-full flex">
              {primaryTabs.map(item => {
                const Icon = getNavIcon(item.icon);
                return (
                  <TabsTrigger
                    key={item.nav_key}
                    value={item.nav_key}
                    className="gap-1.5 md:gap-2 text-xs md:text-sm whitespace-nowrap data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=active]:font-bold relative"
                  >
                    {Icon && <Icon className="w-3.5 h-3.5 md:w-4 md:h-4" />}
                    {resolveLabel(item)}
                    {item.badge_source === 'comms_count' && (commsCounts?.total || 0) > 0 && (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0 ml-1 h-4 min-w-4">
                        {commsCounts!.total > 99 ? '99+' : commsCounts!.total}
                      </Badge>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Main Content */}
      <main className="container py-3 md:py-4 px-3 md:px-4">
        <Outlet />
      </main>

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
