import { useState } from 'react';
import { ClipboardList, LayoutGrid, List, Rows3, Smartphone } from 'lucide-react';
import { StudentSelector } from '@/components/StudentSelector';
import { CompactStudentCard } from '@/components/CompactStudentCard';
import { HorizontalStudentRow } from '@/components/HorizontalStudentRow';
import { ExpandedStudentView } from '@/components/ExpandedStudentView';
import { SessionTimer } from '@/components/SessionTimer';
import { DataSummary } from '@/components/DataSummary';
import { SyncedIntervalController } from '@/components/SyncedIntervalController';
import { EnhancedABCPopup } from '@/components/EnhancedABCPopup';
import { NovelBehaviorRecorder } from '@/components/NovelBehaviorRecorder';
import { QuickABCCustomizer } from '@/components/QuickABCCustomizer';
import { SessionFocusMode } from '@/components/SessionFocusMode';
import { TrashRecovery } from '@/components/TrashRecovery';
import { EndAllSessionsButton } from '@/components/EndAllSessionsButton';
import { ActiveStudentSessions } from '@/components/ActiveStudentSessions';
import { MobileDataMode } from '@/components/mobile';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useDataStore } from '@/store/dataStore';

type ViewMode = 'grid' | 'rows' | 'tabs';

export default function Dashboard() {
  const { students, selectedStudentIds } = useDataStore();
  const selectedStudents = students.filter(s => selectedStudentIds.includes(s.id));
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('rows');
  const [activeTabStudentId, setActiveTabStudentId] = useState<string | null>(null);
  const [showMobileMode, setShowMobileMode] = useState(false);

  // Check if any selected student has interval behaviors
  const hasIntervalBehaviors = selectedStudents.some(s => 
    s.behaviors.some(b => (b.methods || [b.type]).includes('interval'))
  );

  // Check if any selected student has behaviors (for ABC popup - can record for any student with behaviors)
  const hasAnyBehaviors = selectedStudents.some(s => s.behaviors.length > 0);

  const expandedStudent = expandedStudentId 
    ? students.find(s => s.id === expandedStudentId)
    : null;

  // Get active tab student
  const activeTabStudent = activeTabStudentId 
    ? selectedStudents.find(s => s.id === activeTabStudentId)
    : selectedStudents[0];

  // Show expanded view if a student is selected for expansion
  if (expandedStudent) {
    return (
      <ExpandedStudentView
        student={expandedStudent}
        onClose={() => setExpandedStudentId(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Session Timer & Summary */}
      <div className="grid md:grid-cols-2 gap-3">
        <SessionTimer />
        <DataSummary />
      </div>

      {/* Active Student Sessions - Per-student timers */}
      <ActiveStudentSessions />

      {/* Quick Actions Row */}
      <div className="flex flex-wrap gap-2 justify-center">
        <TrashRecovery />
        <SessionFocusMode />
        <NovelBehaviorRecorder />
        {hasAnyBehaviors && <EnhancedABCPopup />}
        {selectedStudentIds.length > 0 && <QuickABCCustomizer />}
        <EndAllSessionsButton />
        {selectedStudentIds.length > 0 && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowMobileMode(true)}
            className="gap-2"
          >
            <Smartphone className="w-4 h-4" />
            Mobile Mode
          </Button>
        )}
      </div>

      {/* Mobile Data Mode Overlay */}
      {showMobileMode && (
        <MobileDataMode onClose={() => setShowMobileMode(false)} />
      )}

      {/* Synced Interval Controller */}
      {hasIntervalBehaviors && (
        <SyncedIntervalController />
      )}

      {/* Student Selector */}
      <StudentSelector />

      {/* View Mode Toggle & Content */}
      {selectedStudents.length > 0 && (
        <>
          {/* View Mode Toggle */}
          <div className="flex justify-end">
            <TooltipProvider>
              <div className="flex border rounded-md overflow-hidden">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={viewMode === 'rows' ? 'default' : 'ghost'}
                      size="sm"
                      className="h-8 px-3 rounded-none"
                      onClick={() => setViewMode('rows')}
                    >
                      <Rows3 className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Row View (All Students)</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'ghost'}
                      size="sm"
                      className="h-8 px-3 rounded-none border-x"
                      onClick={() => setViewMode('grid')}
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Grid View (Cards)</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={viewMode === 'tabs' ? 'default' : 'ghost'}
                      size="sm"
                      className="h-8 px-3 rounded-none"
                      onClick={() => {
                        setViewMode('tabs');
                        if (!activeTabStudentId && selectedStudents.length > 0) {
                          setActiveTabStudentId(selectedStudents[0].id);
                        }
                      }}
                    >
                      <List className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Tabbed View (One at a time)</TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          </div>

          {/* Grid View */}
          {viewMode === 'grid' && (
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {selectedStudents.map(student => (
                <CompactStudentCard 
                  key={student.id} 
                  student={student}
                  onExpand={() => setExpandedStudentId(student.id)}
                />
              ))}
            </div>
          )}

          {/* Row View - All students stacked vertically with horizontal content */}
          {viewMode === 'rows' && (
            <div className="space-y-3">
              {selectedStudents.map(student => (
                <HorizontalStudentRow
                  key={student.id}
                  student={student}
                  onExpand={() => setExpandedStudentId(student.id)}
                  defaultExpanded={selectedStudents.length <= 3}
                />
              ))}
            </div>
          )}

          {/* Tabbed View - Student tabs at top, one student's data visible at a time */}
          {viewMode === 'tabs' && (
            <div className="space-y-3">
              <Tabs value={activeTabStudentId || selectedStudents[0]?.id} onValueChange={setActiveTabStudentId}>
                <TabsList className="flex flex-wrap h-auto gap-1 bg-secondary/30 p-1">
                  {selectedStudents.map(student => (
                    <TabsTrigger
                      key={student.id}
                      value={student.id}
                      className="data-[state=active]:bg-background"
                      style={{ 
                        borderBottom: activeTabStudentId === student.id ? `2px solid ${student.color}` : undefined 
                      }}
                    >
                      <div 
                        className="w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: student.color }}
                      />
                      {student.displayName || student.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>

              {activeTabStudent && (
                <HorizontalStudentRow
                  key={activeTabStudent.id}
                  student={activeTabStudent}
                  onExpand={() => setExpandedStudentId(activeTabStudent.id)}
                  defaultExpanded={true}
                />
              )}
            </div>
          )}
        </>
      )}

      {/* Empty State */}
      {selectedStudents.length === 0 && (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <ClipboardList className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-base font-semibold text-foreground mb-2">
            No Students Selected
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Add students above and select them to start collecting behavioral data. 
            Go to the Students tab to configure behaviors for each student.
          </p>
        </div>
      )}
    </div>
  );
}
