import React, { useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutDashboard, BookOpen, Users, Target, FileText, ClipboardList, BarChart3 } from 'lucide-react';
import { useParentTraining } from '@/hooks/useParentTraining';
import { useParentTrainingAdmin } from '@/hooks/useParentTrainingAdmin';
import { useAgencyContext } from '@/hooks/useAgencyContext';
import { PTDashboardTab } from '@/components/parent-training/PTDashboardTab';
import { PTCurriculumTab } from '@/components/parent-training/PTCurriculumTab';
import { PTAssignedTrainingTab } from '@/components/parent-training/PTAssignedTrainingTab';
import { PTGoalsTab } from '@/components/parent-training/PTGoalsTab';
import { PTHomeworkTab } from '@/components/parent-training/PTHomeworkTab';
import { PTSessionLogsTab } from '@/components/parent-training/PTSessionLogsTab';
import { PTReportsTab } from '@/components/parent-training/PTReportsTab';

export default function ParentTrainingAdmin() {
  const { currentAgency } = useAgencyContext();
  const agencyId = currentAgency?.id || null;

  const {
    modules, isLoading: modulesLoading,
    fetchModules, createModule, updateModule,
  } = useParentTraining(agencyId);

  const {
    goals, goalAssignments, homework, sessionLogs, customGoals, assignmentsDashboard, isLoading: adminLoading,
    fetchGoals, createGoal, updateGoal,
    fetchGoalAssignments, updateGoalAssignment, addCustomGoalToAssignment,
    fetchAssignmentsDashboard, assignModule, updateAssignment,
    fetchHomework, reviewHomework,
    fetchSessionLogs, createSessionLog,
    fetchCustomGoals, promoteGoalToLibrary,
    logGoalData, buildInsuranceSummary,
  } = useParentTrainingAdmin(agencyId);

  const isLoading = modulesLoading || adminLoading;

  const refreshDashboard = useCallback(() => {
    fetchAssignmentsDashboard();
    fetchHomework();
    fetchSessionLogs();
    fetchGoalAssignments();
  }, [fetchAssignmentsDashboard, fetchHomework, fetchSessionLogs, fetchGoalAssignments]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Parent Training</h1>
          <p className="text-sm text-muted-foreground">Manage caregiver training curriculum, assignments, goals, and documentation</p>
        </div>

        <Tabs defaultValue="dashboard">
          <TabsList className="mb-6 flex-wrap">
            <TabsTrigger value="dashboard" className="gap-2"><LayoutDashboard className="w-4 h-4" />Dashboard</TabsTrigger>
            <TabsTrigger value="curriculum" className="gap-2"><BookOpen className="w-4 h-4" />Curriculum</TabsTrigger>
            <TabsTrigger value="assignments" className="gap-2"><Users className="w-4 h-4" />Assigned</TabsTrigger>
            <TabsTrigger value="goals" className="gap-2"><Target className="w-4 h-4" />Goals</TabsTrigger>
            <TabsTrigger value="homework" className="gap-2"><FileText className="w-4 h-4" />Homework</TabsTrigger>
            <TabsTrigger value="sessions" className="gap-2"><ClipboardList className="w-4 h-4" />Sessions</TabsTrigger>
            <TabsTrigger value="reports" className="gap-2"><BarChart3 className="w-4 h-4" />Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <PTDashboardTab
              assignments={assignmentsDashboard}
              homework={homework}
              sessionLogs={sessionLogs}
              goalAssignments={goalAssignments}
              isLoading={isLoading}
              onRefresh={refreshDashboard}
            />
          </TabsContent>

          <TabsContent value="curriculum">
            <PTCurriculumTab
              modules={modules}
              goals={goals}
              isLoading={isLoading}
              onRefreshModules={fetchModules}
              onRefreshGoals={fetchGoals}
              onCreateModule={createModule}
              onUpdateModule={updateModule}
              onCreateGoal={createGoal}
              onUpdateGoal={updateGoal}
            />
          </TabsContent>

          <TabsContent value="assignments">
            <PTAssignedTrainingTab
              assignments={assignmentsDashboard}
              modules={modules}
              isLoading={isLoading}
              onRefresh={() => { fetchAssignmentsDashboard(); fetchModules(); }}
              onAssign={assignModule}
              onUpdate={updateAssignment}
            />
          </TabsContent>

          <TabsContent value="goals">
            <PTGoalsTab
              goalAssignments={goalAssignments}
              customGoals={customGoals}
              assignments={assignmentsDashboard}
              isLoading={isLoading}
              onRefreshGoalAssignments={fetchGoalAssignments}
              onRefreshCustomGoals={fetchCustomGoals}
              onUpdateGoalAssignment={updateGoalAssignment}
              onAddCustomGoal={addCustomGoalToAssignment}
              onLogGoalData={logGoalData}
              onPromoteGoal={promoteGoalToLibrary}
            />
          </TabsContent>

          <TabsContent value="homework">
            <PTHomeworkTab
              homework={homework}
              isLoading={isLoading}
              onRefresh={fetchHomework}
              onReview={reviewHomework}
            />
          </TabsContent>

          <TabsContent value="sessions">
            <PTSessionLogsTab
              sessionLogs={sessionLogs}
              modules={modules}
              isLoading={isLoading}
              onRefresh={() => { fetchSessionLogs(); fetchModules(); }}
              onCreate={createSessionLog}
            />
          </TabsContent>

          <TabsContent value="reports">
            <PTReportsTab
              goalAssignments={goalAssignments}
              sessionLogs={sessionLogs}
              assignments={assignmentsDashboard}
              isLoading={isLoading}
              onBuildSummary={buildInsuranceSummary}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
