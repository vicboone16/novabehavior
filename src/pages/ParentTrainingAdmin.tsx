import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Library, Users, BarChart3 } from 'lucide-react';
import { useParentTraining } from '@/hooks/useParentTraining';
import { useAgencyContext } from '@/hooks/useAgencyContext';
import { AdminModulesTab } from '@/components/parent-training/AdminModulesTab';
import { AdminLibraryTab } from '@/components/parent-training/AdminLibraryTab';
import { AdminAssignmentsTab } from '@/components/parent-training/AdminAssignmentsTab';
import { AdminAnalyticsTab } from '@/components/parent-training/AdminAnalyticsTab';

export default function ParentTrainingAdmin() {
  const { currentAgency } = useAgencyContext();
  const agencyId = currentAgency?.id || null;
  const {
    modules, libraryItems, assignments, progress, isLoading,
    fetchModules, createModule, updateModule,
    fetchLibrary, createLibraryItem, updateLibraryItem,
    fetchAssignments, createAssignment, updateAssignment,
    fetchProgress,
    fetchVersions,
  } = useParentTraining(agencyId);

  const [selectedModuleForVersions, setSelectedModuleForVersions] = useState<string | null>(null);

  const handleManageVersions = (moduleId: string) => {
    setSelectedModuleForVersions(moduleId);
    fetchVersions(moduleId);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Parent Training Builder</h1>
          <p className="text-sm text-muted-foreground">Create, manage, and assign parent training content</p>
        </div>

        <Tabs defaultValue="modules">
          <TabsList className="mb-6">
            <TabsTrigger value="modules" className="gap-2"><BookOpen className="w-4 h-4" />Modules</TabsTrigger>
            <TabsTrigger value="library" className="gap-2"><Library className="w-4 h-4" />Library</TabsTrigger>
            <TabsTrigger value="assignments" className="gap-2"><Users className="w-4 h-4" />Assignments</TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2"><BarChart3 className="w-4 h-4" />Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="modules">
            <AdminModulesTab
              modules={modules}
              isLoading={isLoading}
              onRefresh={fetchModules}
              onCreate={createModule}
              onUpdate={updateModule}
              onManageVersions={handleManageVersions}
            />
          </TabsContent>

          <TabsContent value="library">
            <AdminLibraryTab
              items={libraryItems}
              isLoading={isLoading}
              onRefresh={fetchLibrary}
              onCreate={createLibraryItem}
              onUpdate={updateLibraryItem}
            />
          </TabsContent>

          <TabsContent value="assignments">
            <AdminAssignmentsTab
              assignments={assignments}
              modules={modules}
              isLoading={isLoading}
              onRefresh={fetchAssignments}
              onCreate={createAssignment}
              onUpdate={updateAssignment}
            />
          </TabsContent>

          <TabsContent value="analytics">
            <AdminAnalyticsTab
              progress={progress}
              assignments={assignments}
              isLoading={isLoading}
              onRefreshProgress={fetchProgress}
              onRefreshAssignments={fetchAssignments}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
