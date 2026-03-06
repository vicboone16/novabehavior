import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen, Users, GraduationCap, Layers, ShieldCheck, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSDCTraining } from '@/hooks/useSDCTraining';
import { InstructorGuideTab } from '@/components/sdc-training/InstructorGuideTab';
import { StaffWorkbookTab } from '@/components/sdc-training/StaffWorkbookTab';
import { CoursesTab } from '@/components/sdc-training/CoursesTab';
import { ModulesTab } from '@/components/sdc-training/ModulesTab';
import { CertificationTab } from '@/components/sdc-training/CertificationTab';
import { DownloadsTab } from '@/components/sdc-training/DownloadsTab';

export default function SDCTraining() {
  const navigate = useNavigate();
  const {
    modules, certifications, requirements, resources,
    trainingModules, downloads, certRequirements, certProgress,
    isLoading, isAdmin, fetchAll,
  } = useSDCTraining();
  const [activeTab, setActiveTab] = useState('modules');

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const moduleNames = modules.reduce<Record<string, string>>((acc, m) => {
    acc[m.id] = m.title;
    return acc;
  }, {});

  // Count from both systems
  const totalModules = Math.max(modules.length, trainingModules.length);
  const totalResources = Math.max(resources.length, downloads.length);
  const totalCerts = certifications.length || (certRequirements.length > 0 ? 1 : 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">SDC Behavior Training System</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Social Development Class staff training, certification, and resources
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 text-sm">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Layers className="w-4 h-4" /> {totalModules} Modules
            </span>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Download className="w-4 h-4" /> {totalResources} Resources
            </span>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <ShieldCheck className="w-4 h-4" /> {certRequirements.length} Cert Requirements
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

            {isAdmin && (
              <TabsContent value="instructor">
                <InstructorGuideTab modules={modules} isAdmin={isAdmin} />
              </TabsContent>
            )}
            <TabsContent value="workbook">
              <StaffWorkbookTab modules={modules} />
            </TabsContent>
            <TabsContent value="courses">
              <CoursesTab />
            </TabsContent>
            <TabsContent value="modules">
              <ModulesTab modules={modules} />
            </TabsContent>
            <TabsContent value="certification">
              <CertificationTab
                certifications={certifications}
                requirements={requirements}
                isAdmin={isAdmin}
                onViewDetails={() => navigate('/sdc-training/certification')}
              />
            </TabsContent>
            <TabsContent value="downloads">
              <DownloadsTab resources={resources} isAdmin={isAdmin} moduleNames={moduleNames} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
