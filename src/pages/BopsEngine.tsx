import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BopsFrameworkSetup } from '@/components/bops/BopsFrameworkSetup';
import { BopsStudentHub } from '@/components/bops/BopsStudentHub';
import { BopsSubmissionReview } from '@/components/bops/BopsSubmissionReview';
import { BopsEngineConsole } from '@/components/bops/BopsEngineConsole';
import { Shield, Users, FileCheck, LayoutDashboard } from 'lucide-react';

export default function BopsEngine() {
  const [tab, setTab] = useState('engine');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">BOPS Intelligence Engine</h1>
        <p className="text-sm text-muted-foreground">
          Profile-driven behavioral programming system — assessment, classification, and daily planning
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="engine" className="gap-1.5">
            <LayoutDashboard className="w-4 h-4" />
            Engine Console
          </TabsTrigger>
          <TabsTrigger value="students" className="gap-1.5">
            <Users className="w-4 h-4" />
            Student Profiles
          </TabsTrigger>
          <TabsTrigger value="framework" className="gap-1.5">
            <Shield className="w-4 h-4" />
            Framework Setup
          </TabsTrigger>
          <TabsTrigger value="submissions" className="gap-1.5">
            <FileCheck className="w-4 h-4" />
            Beacon Submissions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="engine">
          <BopsEngineConsole />
        </TabsContent>
        <TabsContent value="students">
          <BopsStudentHub />
        </TabsContent>
        <TabsContent value="framework">
          <BopsFrameworkSetup />
        </TabsContent>
        <TabsContent value="submissions">
          <BopsSubmissionReview />
        </TabsContent>
      </Tabs>
    </div>
  );
}