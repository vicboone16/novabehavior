import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, AlertTriangle, Target, Star, Camera, Settings2, GraduationCap, Scroll, Sparkles, Users } from "lucide-react";
import { TeacherWeeklySummaryPanel } from "./TeacherWeeklySummaryPanel";
import { TeacherABCLogsPanel } from "./TeacherABCLogsPanel";
import { TeacherDataSessionsPanel } from "./TeacherDataSessionsPanel";
import { TeacherSummaries } from "@/components/TeacherSummaries";
import { BeaconPointsPanel } from "./BeaconPointsPanel";
import { ParentSnapshotPanel } from "./ParentSnapshotPanel";
import { ParentReportConfigPanel } from "@/components/parent-comms/ParentReportConfigPanel";
import { QuestBoard } from "@/components/quests/QuestBoard";
import { CosmeticInventory } from "@/components/cosmetics/CosmeticInventory";
import { TeacherParentEngagement } from "@/components/parent-loop/TeacherParentEngagement";

interface TeacherDataHubProps {
  clientId: string;
}

export function TeacherDataHub({ clientId }: TeacherDataHubProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-primary" />
          Teacher / Classroom Data
        </CardTitle>
        <CardDescription>
          Data collected by teachers and classroom staff via Beacon. Review, annotate, and integrate into behavior plans.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="weekly" className="space-y-4">
          <TabsList className="flex flex-wrap gap-1 h-auto p-1">
            <TabsTrigger value="weekly" className="gap-1 text-xs">
              <BarChart3 className="w-3 h-3" />
              Weekly Summaries
            </TabsTrigger>
            <TabsTrigger value="abc" className="gap-1 text-xs">
              <AlertTriangle className="w-3 h-3" />
              ABC / Triggers
            </TabsTrigger>
            <TabsTrigger value="sessions" className="gap-1 text-xs">
              <Target className="w-3 h-3" />
              Data Sessions
            </TabsTrigger>
            <TabsTrigger value="points" className="gap-1 text-xs">
              <Star className="w-3 h-3" />
              Beacon Points
            </TabsTrigger>
            <TabsTrigger value="snapshots" className="gap-1 text-xs">
              <Camera className="w-3 h-3" />
              Parent Snapshots
            </TabsTrigger>
            <TabsTrigger value="shared" className="gap-1 text-xs">
              <GraduationCap className="w-3 h-3" />
              BCBA Summaries
            </TabsTrigger>
            <TabsTrigger value="parent-config" className="gap-1 text-xs">
              <Settings2 className="w-3 h-3" />
              Parent Settings
            </TabsTrigger>
            <TabsTrigger value="quests" className="gap-1 text-xs">
              <Scroll className="w-3 h-3" />
              Quests
            </TabsTrigger>
            <TabsTrigger value="cosmetics" className="gap-1 text-xs">
              <Sparkles className="w-3 h-3" />
              Unlocks
            </TabsTrigger>
            <TabsTrigger value="parent-engagement" className="gap-1 text-xs">
              <Users className="w-3 h-3" />
              Parent Loop
            </TabsTrigger>
          </TabsList>

          <TabsContent value="weekly">
            <TeacherWeeklySummaryPanel clientId={clientId} />
          </TabsContent>
          <TabsContent value="abc">
            <TeacherABCLogsPanel clientId={clientId} />
          </TabsContent>
          <TabsContent value="sessions">
            <TeacherDataSessionsPanel clientId={clientId} />
          </TabsContent>
          <TabsContent value="points">
            <BeaconPointsPanel clientId={clientId} />
          </TabsContent>
          <TabsContent value="snapshots">
            <ParentSnapshotPanel clientId={clientId} />
          </TabsContent>
          <TabsContent value="shared">
            <TeacherSummaries clientId={clientId} />
          </TabsContent>
          <TabsContent value="parent-config">
            <ParentReportConfigPanel studentId={clientId} />
          </TabsContent>
          <TabsContent value="quests">
            <QuestBoard studentId={clientId} agencyId="" isTeacher />
          </TabsContent>
          <TabsContent value="cosmetics">
            <CosmeticInventory studentId={clientId} />
          </TabsContent>
          <TabsContent value="parent-engagement">
            <TeacherParentEngagement studentId={clientId} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
