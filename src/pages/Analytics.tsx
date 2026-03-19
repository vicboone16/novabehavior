import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Calendar, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard';
import { DistrictReportingPanel } from '@/components/phase4';
import { AnalyticsFilters } from '@/components/analytics/AnalyticsFilters';
import { format, subDays } from 'date-fns';

export default function Analytics() {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [filters, setFilters] = useState({
    staffId: null as string | null,
    payerId: null as string | null,
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-20">
        <div className="container py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-lg font-bold text-foreground">Analytics Dashboard</h1>
                <p className="text-xs text-muted-foreground">Business intelligence and reporting</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <AnalyticsFilters
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
                filters={filters}
                onFiltersChange={setFilters}
              />
              <Button variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="utilization">Utilization</TabsTrigger>
            <TabsTrigger value="productivity">Productivity</TabsTrigger>
            <TabsTrigger value="district">District & Schools</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <AnalyticsDashboard 
              dateRange={dateRange} 
              filters={filters}
              view="overview"
            />
          </TabsContent>

          <TabsContent value="revenue">
            <AnalyticsDashboard 
              dateRange={dateRange} 
              filters={filters}
              view="revenue"
            />
          </TabsContent>

          <TabsContent value="utilization">
            <AnalyticsDashboard 
              dateRange={dateRange} 
              filters={filters}
              view="utilization"
            />
          </TabsContent>

          <TabsContent value="productivity">
            <AnalyticsDashboard 
              dateRange={dateRange} 
              filters={filters}
              view="productivity"
            />
          </TabsContent>

          <TabsContent value="district">
            <DistrictReportingPanel />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
