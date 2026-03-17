import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen, Users, GraduationCap, Layers, ShieldCheck, Download, LayoutDashboard, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSDCTraining } from '@/hooks/useSDCTraining';
import { OverviewTab } from '@/components/sdc-training/OverviewTab';
import { InstructorGuideTab } from '@/components/sdc-training/InstructorGuideTab';
import { StaffWorkbookTab } from '@/components/sdc-training/StaffWorkbookTab';
import { CoursesTab } from '@/components/sdc-training/CoursesTab';
import { ModulesTab } from '@/components/sdc-training/ModulesTab';
import { CertificationTab } from '@/components/sdc-training/CertificationTab';
import { DownloadsTab } from '@/components/sdc-training/DownloadsTab';
import { AdminTab } from '@/components/sdc-training/AdminTab';

export default function SDCTraining() {
  const navigate = useNavigate();
  const {
    trainingModules, workbookItems, downloads, certRequirements, certProgress, assignments,
    sdcModules, sdcResources, allStaffProgress,
    createModule, updateModule, deleteModule, assignModuleToStaff, createResource,
    isLoading, isAdmin, fetchAll,
  } = useSDCTraining();
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const completedCerts = certProgress.filter(p => ['completed', 'approved'].includes(p.status)).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/academy')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Team Trainings</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Staff training, certification, and resources
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 text-sm">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Layers className="w-4 h-4" /> {sdcModules.length || trainingModules.length} Modules
            </span>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Download className="w-4 h-4" /> {sdcResources.length || downloads.length} Resources
            </span>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <ShieldCheck className="w-4 h-4" /> {completedCerts}/{certRequirements.length} Cert Requirements
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6 flex-wrap h-auto gap-1">
              <TabsTrigger value="overview" className="flex items-center gap-1.5">
                <LayoutDashboard className="w-4 h-4" /> Overview
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger value="admin" className="flex items-center gap-1.5">
                  <Settings className="w-4 h-4" /> Admin
                </TabsTrigger>
              )}
              {isAdmin && (
                <TabsTrigger value="instructor" className="flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4" /> Instructor Guide
                </TabsTrigger>
              )}
              <TabsTrigger value="workbook" className="flex items-center gap-1.5">
                <Users className="w-4 h-4" /> Staff Workbook
              </TabsTrigger>
              <TabsTrigger value="courses" className="flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4" /> Courses
              </TabsTrigger>
              <TabsTrigger value="modules" className="flex items-center gap-1.5">
                <Layers className="w-4 h-4" /> Modules
              </TabsTrigger>
              <TabsTrigger value="certification" className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" /> Certification
              </TabsTrigger>
              <TabsTrigger value="downloads" className="flex items-center gap-1.5">
                <Download className="w-4 h-4" /> Downloads
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <OverviewTab
                modules={trainingModules}
                downloads={downloads}
                certRequirements={certRequirements}
                certProgress={certProgress}
                assignments={assignments}
                onNavigate={setActiveTab}
              />
            </TabsContent>
            {isAdmin && (
              <TabsContent value="admin">
                <AdminTab
                  modules={sdcModules}
                  resources={sdcResources}
                  allStaffProgress={allStaffProgress}
                  onCreateModule={createModule}
                  onUpdateModule={updateModule}
                  onDeleteModule={deleteModule}
                  onAssignModule={assignModuleToStaff}
                  onCreateResource={createResource}
                  onRefresh={fetchAll}
                />
              </TabsContent>
            )}
            {isAdmin && (
              <TabsContent value="instructor">
                <InstructorGuideTab modules={trainingModules} />
              </TabsContent>
            )}
            <TabsContent value="workbook">
              <StaffWorkbookTab modules={trainingModules} workbookItems={workbookItems} />
            </TabsContent>
            <TabsContent value="courses">
              <CoursesTab />
            </TabsContent>
            <TabsContent value="modules">
              <ModulesTab modules={trainingModules} downloads={downloads} workbookItems={workbookItems} certRequirements={certRequirements} certProgress={certProgress} />
            </TabsContent>
            <TabsContent value="certification">
              <CertificationTab
                certRequirements={certRequirements}
                certProgress={certProgress}
                modules={trainingModules}
                isAdmin={isAdmin}
                onViewDetails={() => navigate('/sdc-training/certification')}
              />
            </TabsContent>
            <TabsContent value="downloads">
              <DownloadsTab downloads={downloads} modules={trainingModules} isAdmin={isAdmin} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
