import { useBopsAdminAccess } from '@/hooks/useBopsAdmin';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BopsAdminOverview } from '@/components/bops-admin/BopsAdminOverview';
import { BopsAdminStudents } from '@/components/bops-admin/BopsAdminStudents';
import { BopsAdminClassrooms } from '@/components/bops-admin/BopsAdminClassrooms';
import { BopsAdminCoverage } from '@/components/bops-admin/BopsAdminCoverage';
import { BopsAdminQA } from '@/components/bops-admin/BopsAdminQA';
import { BopsAdminPlacements } from '@/components/bops-admin/BopsAdminPlacements';
import { BopsAdminBeaconNova } from '@/components/bops-admin/BopsAdminBeaconNova';
import { BopsAdminTools } from '@/components/bops-admin/BopsAdminTools';
import { Loader2, ShieldAlert, LayoutDashboard, Users, Building2, Target, Wrench, MapPin, GitCompare, Settings } from 'lucide-react';
import { useState } from 'react';

export default function BopsAdminConsole() {
  const { data: isAdmin, isLoading } = useBopsAdminAccess();
  const [tab, setTab] = useState('overview');

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-3">
        <ShieldAlert className="w-12 h-12 text-destructive/60" />
        <h2 className="text-lg font-semibold">Access Denied</h2>
        <p className="text-sm text-muted-foreground">You do not have access to the BOPS Admin Console.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">BOPS Admin Console</h1>
        <p className="text-sm text-muted-foreground">
          System monitoring, auditing, repair, and management for BOPS across all students and classrooms
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview" className="gap-1.5 text-xs"><LayoutDashboard className="w-3.5 h-3.5" />Overview</TabsTrigger>
          <TabsTrigger value="students" className="gap-1.5 text-xs"><Users className="w-3.5 h-3.5" />Students</TabsTrigger>
          <TabsTrigger value="classrooms" className="gap-1.5 text-xs"><Building2 className="w-3.5 h-3.5" />Classrooms</TabsTrigger>
          <TabsTrigger value="coverage" className="gap-1.5 text-xs"><Target className="w-3.5 h-3.5" />Coverage</TabsTrigger>
          <TabsTrigger value="qa" className="gap-1.5 text-xs"><Wrench className="w-3.5 h-3.5" />QA / Repair</TabsTrigger>
          <TabsTrigger value="placements" className="gap-1.5 text-xs"><MapPin className="w-3.5 h-3.5" />Placements</TabsTrigger>
          <TabsTrigger value="beacon-nova" className="gap-1.5 text-xs"><GitCompare className="w-3.5 h-3.5" />Beacon / Nova</TabsTrigger>
          <TabsTrigger value="tools" className="gap-1.5 text-xs"><Settings className="w-3.5 h-3.5" />Tools</TabsTrigger>
        </TabsList>

        <TabsContent value="overview"><BopsAdminOverview /></TabsContent>
        <TabsContent value="students"><BopsAdminStudents /></TabsContent>
        <TabsContent value="classrooms"><BopsAdminClassrooms /></TabsContent>
        <TabsContent value="coverage"><BopsAdminCoverage /></TabsContent>
        <TabsContent value="qa"><BopsAdminQA /></TabsContent>
        <TabsContent value="placements"><BopsAdminPlacements /></TabsContent>
        <TabsContent value="beacon-nova"><BopsAdminBeaconNova /></TabsContent>
        <TabsContent value="tools"><BopsAdminTools /></TabsContent>
      </Tabs>
    </div>
  );
}
