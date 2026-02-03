import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { SupervisorReviewDashboard } from '@/components/admin/SupervisorReviewDashboard';
import { ARReadinessDashboard } from '@/components/scheduling/ARReadinessDashboard';
import { ClipboardCheck, BarChart3 } from 'lucide-react';

export default function NotesReview() {
  const [activeTab, setActiveTab] = useState<'notes' | 'ar-readiness'>('notes');

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notes & AR Readiness</h1>
          <p className="text-sm text-muted-foreground">
            Review clinical notes and track session billing readiness
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'notes' | 'ar-readiness')}>
        <TabsList>
          <TabsTrigger value="notes" className="flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4" />
            Notes Review
          </TabsTrigger>
          <TabsTrigger value="ar-readiness" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            AR Readiness
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notes" className="mt-4">
          <SupervisorReviewDashboard />
        </TabsContent>

        <TabsContent value="ar-readiness" className="mt-4">
          <ARReadinessDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
