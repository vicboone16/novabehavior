import { lazy, Suspense, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, LayoutDashboard, Brain, Briefcase } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useClinicalIntelligenceAccess } from '@/hooks/useClinicalIntelligence';
import DashboardWidgetsView from './DashboardWidgetsView';

const Intelligence = lazy(() => import('./Intelligence'));
const Operations = lazy(() => import('./Operations'));

const OPERATIONS_ROLES = new Set([
  'admin',
  'super_admin',
  'agency_admin',
  'bcba',
  'supervisor',
  'manager',
  'billing',
  'scheduler',
]);

/**
 * Dashboard shell with view-switcher tabs:
 *   - Widgets (always)
 *   - Intelligence (gated by Clinical Intelligence access)
 *   - Operations (gated by role)
 *
 * Selection is persisted in `?view=` for deep-linking. If only Widgets is
 * available, the tab bar is hidden.
 */
export default function Dashboard() {
  const { userRole } = useAuth();
  const { hasCIDAccess } = useClinicalIntelligenceAccess();
  const [searchParams, setSearchParams] = useSearchParams();

  const canSeeOperations = useMemo(
    () => OPERATIONS_ROLES.has((userRole as string) || ''),
    [userRole]
  );

  const view = searchParams.get('view') || 'widgets';
  const handleChange = (v: string) => {
    const next = new URLSearchParams(searchParams);
    if (v === 'widgets') next.delete('view');
    else next.set('view', v);
    setSearchParams(next, { replace: true });
  };

  // If only one view is available, just render it without the tab bar.
  if (!hasCIDAccess && !canSeeOperations) {
    return <DashboardWidgetsView />;
  }

  return (
    <Tabs value={view} onValueChange={handleChange} className="space-y-3">
      <TabsList className="w-full sm:w-auto">
        <TabsTrigger value="widgets" className="gap-1.5">
          <LayoutDashboard className="w-4 h-4" />
          <span>Widgets</span>
        </TabsTrigger>
        {hasCIDAccess && (
          <TabsTrigger value="intelligence" className="gap-1.5">
            <Brain className="w-4 h-4" />
            <span>Intelligence</span>
          </TabsTrigger>
        )}
        {canSeeOperations && (
          <TabsTrigger value="operations" className="gap-1.5">
            <Briefcase className="w-4 h-4" />
            <span>Operations</span>
          </TabsTrigger>
        )}
      </TabsList>

      <TabsContent value="widgets" className="mt-3">
        <DashboardWidgetsView />
      </TabsContent>

      {hasCIDAccess && (
        <TabsContent value="intelligence" className="mt-3">
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            }
          >
            <Intelligence />
          </Suspense>
        </TabsContent>
      )}

      {canSeeOperations && (
        <TabsContent value="operations" className="mt-3">
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            }
          >
            <Operations />
          </Suspense>
        </TabsContent>
      )}
    </Tabs>
  );
}
