import { SessionDataReview } from '@/components/SessionDataReview';
import { BehaviorTrendCharts } from '@/components/BehaviorTrendCharts';
import { SessionReportGenerator } from '@/components/SessionReportGenerator';
import { BehaviorGoalsManager } from '@/components/BehaviorGoalsManager';
import { ScatterplotAnalysis } from '@/components/ScatterplotAnalysis';
import { DataExportManager } from '@/components/DataExportManager';
import { ABCReportGenerator } from '@/components/ABCReportGenerator';
import { StudentComparison } from '@/components/StudentComparison';
import { EnhancedExportOptions } from '@/components/EnhancedExportOptions';
import { FBAReportGenerator } from '@/components/FBAReportGenerator';
import { FileText, Users, Download, BarChart3, ClipboardCheck } from 'lucide-react';

export default function Reports() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Reports & Analysis</h2>
          <p className="text-muted-foreground text-sm">
            View session history, generate reports, and analyze behavior trends
          </p>
        </div>
        <EnhancedExportOptions />
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Session History</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Review past sessions and data collected
          </p>
          <SessionDataReview />
        </div>

        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Behavior Trends</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            View charts and trends over time
          </p>
          <BehaviorTrendCharts />
        </div>

        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Scatterplot Analysis</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Time-based behavior patterns
          </p>
          <ScatterplotAnalysis />
        </div>

        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Session Reports</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Generate detailed session reports
          </p>
          <SessionReportGenerator />
        </div>

        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Goals Overview</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Manage and track behavior goals
          </p>
          <BehaviorGoalsManager />
        </div>

        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Download className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Export Data</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Export data in various formats
          </p>
          <DataExportManager />
        </div>

        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Student Comparison</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Compare behavior data across students
          </p>
          <StudentComparison />
        </div>

        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">ABC Report</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Generate ABC data analysis reports
          </p>
          <ABCReportGenerator />
        </div>

        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <ClipboardCheck className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">FBA Report</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Comprehensive FBA with recommendations
          </p>
          <FBAReportGenerator />
        </div>
      </div>
    </div>
  );
}
