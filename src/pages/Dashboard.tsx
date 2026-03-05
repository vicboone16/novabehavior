import { useState } from 'react';
import { ResponsiveGridLayout } from 'react-grid-layout';
import { useContainerWidth } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import { Plus, RotateCcw, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { useDashboardLayout } from '@/hooks/useDashboardLayout';
import { DashboardWidgetShell } from '@/components/dashboard/DashboardWidgetShell';
import { WIDGET_COMPONENTS } from '@/components/dashboard/WidgetComponentMap';
import { WIDGET_REGISTRY, getAvailableWidgetsForRole } from '@/lib/widget-registry';
import { useAuth } from '@/contexts/AuthContext';

export default function Dashboard() {
  const { userRole } = useAuth();
  const role = userRole || 'viewer';
  const {
    activeWidgets,
    layouts,
    initialized,
    onLayoutChange,
    addWidget,
    removeWidget,
    resetToDefaults,
  } = useDashboardLayout();
  const [addPanelOpen, setAddPanelOpen] = useState(false);

  const availableToAdd = getAvailableWidgetsForRole(role).filter(
    w => !activeWidgets.includes(w.id)
  );

  if (!initialized) return null;

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">Dashboard</h1>
        <div className="flex items-center gap-2">
          <Sheet open={addPanelOpen} onOpenChange={setAddPanelOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                Add Widget
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80">
              <SheetHeader>
                <SheetTitle>Add Widgets</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-2">
                {availableToAdd.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    All available widgets are already on your dashboard
                  </p>
                ) : (
                  availableToAdd.map(w => (
                    <button
                      key={w.id}
                      onClick={() => { addWidget(w.id); setAddPanelOpen(false); }}
                      className="w-full text-left p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{w.title}</span>
                        <Badge variant="secondary" className="text-[10px]">{w.category}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{w.description}</p>
                    </button>
                  ))
                )}
              </div>
            </SheetContent>
          </Sheet>
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={resetToDefaults}>
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </Button>
        </div>
      </div>

      {/* Grid */}
      {activeWidgets.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Settings2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-base font-semibold text-foreground mb-2">No widgets configured</h3>
          <p className="text-sm text-muted-foreground mb-4">Add widgets to customize your dashboard</p>
          <Button variant="outline" onClick={() => setAddPanelOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Widget
          </Button>
        </div>
      ) : (
        {/* @ts-ignore - RGL v2 props */}
        <ResponsiveGridLayout
          className="layout"
          layouts={layouts}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
          rowHeight={60}
          onLayoutChange={onLayoutChange}
        >
          {activeWidgets.map(widgetId => {
            const def = WIDGET_REGISTRY.find(w => w.id === widgetId);
            const comp = WIDGET_COMPONENTS[widgetId];
            if (!def || !comp) return null;
            return (
              <div key={widgetId}>
                <DashboardWidgetShell
                  title={def.title}
                  icon={comp.icon}
                  onRemove={() => removeWidget(widgetId)}
                >
                  {comp.component()}
                </DashboardWidgetShell>
              </div>
            );
          })}
        </ResponsiveGridLayout>
      )}
    </div>
  );
}
