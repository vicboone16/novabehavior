import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FlaskConical, BarChart3, SplitSquareVertical, Layers, LayoutGrid, Download } from 'lucide-react';
import { MultipleBaselineSection } from '@/components/advanced-design/MultipleBaselineSection';
import { ChangingCriterionSection } from '@/components/advanced-design/ChangingCriterionSection';
import { PhaseMarkersSection } from '@/components/advanced-design/PhaseMarkersSection';
import { ResearchGraphGroupsSection } from '@/components/advanced-design/ResearchGraphGroupsSection';
import { AnalysisWorkspaceSection } from '@/components/advanced-design/AnalysisWorkspaceSection';
import { ExportPreviewSection } from '@/components/advanced-design/ExportPreviewSection';

export default function AdvancedDesignAnalysis() {
  const [activeTab, setActiveTab] = useState('multiple-baseline');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <FlaskConical className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Advanced Design Analysis</h1>
          <p className="text-sm text-muted-foreground">
            Private research lab — single-case design, phase management, and advanced ABA graphing
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="multiple-baseline" className="gap-1.5 text-xs">
            <BarChart3 className="w-3.5 h-3.5" /> Multiple Baseline
          </TabsTrigger>
          <TabsTrigger value="changing-criterion" className="gap-1.5 text-xs">
            <SplitSquareVertical className="w-3.5 h-3.5" /> Changing Criterion
          </TabsTrigger>
          <TabsTrigger value="phase-markers" className="gap-1.5 text-xs">
            <Layers className="w-3.5 h-3.5" /> Phase Markers
          </TabsTrigger>
          <TabsTrigger value="graph-groups" className="gap-1.5 text-xs">
            <LayoutGrid className="w-3.5 h-3.5" /> Research Groups
          </TabsTrigger>
          <TabsTrigger value="workspace" className="gap-1.5 text-xs">
            <FlaskConical className="w-3.5 h-3.5" /> Analysis Workspace
          </TabsTrigger>
          <TabsTrigger value="export" className="gap-1.5 text-xs">
            <Download className="w-3.5 h-3.5" /> Export / Preview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="multiple-baseline"><MultipleBaselineSection /></TabsContent>
        <TabsContent value="changing-criterion"><ChangingCriterionSection /></TabsContent>
        <TabsContent value="phase-markers"><PhaseMarkersSection /></TabsContent>
        <TabsContent value="graph-groups"><ResearchGraphGroupsSection /></TabsContent>
        <TabsContent value="workspace"><AnalysisWorkspaceSection /></TabsContent>
        <TabsContent value="export"><ExportPreviewSection /></TabsContent>
      </Tabs>
    </div>
  );
}
