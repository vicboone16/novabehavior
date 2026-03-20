import { useState, useEffect, useCallback } from 'react';
import {
  FileText, Users, MessageSquare, Calendar, BookOpen,
  Plus, ChevronRight, AlertCircle, CheckCircle2, Clock,
  Download, Eye, Send
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { IEPCasePlanner } from './dashboard/IEPCasePlanner';
import { IEPServiceTracker } from './dashboard/IEPServiceTracker';
import { IEPCommsLog } from './dashboard/IEPCommsLog';
import { IEPAutoWorkbook } from './dashboard/IEPAutoWorkbook';

interface IEPStats {
  totalStudents: number;
  upcomingMeetings: number;
  overdueItems: number;
  completedThisMonth: number;
}

export function IEPDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<IEPStats>({
    totalStudents: 0,
    upcomingMeetings: 0,
    overdueItems: 0,
    completedThisMonth: 0,
  });
  const [caseData, setCaseData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('iep_case_data')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setCaseData(data || []);

      // Calculate stats
      const cases = data || [];
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      
      setStats({
        totalStudents: new Set(cases.map((c: any) => c.student_id)).size,
        upcomingMeetings: cases.filter((c: any) => 
          c.data_type === 'meeting_notes' && 
          c.data?.meeting_date && 
          new Date(c.data.meeting_date) > now
        ).length,
        overdueItems: cases.filter((c: any) => 
          c.status === 'active' && 
          c.data?.due_date && 
          new Date(c.data.due_date) < now
        ).length,
        completedThisMonth: cases.filter((c: any) => 
          c.status === 'completed' && 
          new Date(c.updated_at) >= monthStart
        ).length,
      });
    } catch (err: any) {
      toast.error('Failed to load IEP data');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const statCards = [
    { label: 'Active Students', value: stats.totalStudents, icon: Users, color: 'text-blue-600' },
    { label: 'Upcoming Meetings', value: stats.upcomingMeetings, icon: Calendar, color: 'text-emerald-600' },
    { label: 'Overdue Items', value: stats.overdueItems, icon: AlertCircle, color: 'text-amber-600' },
    { label: 'Completed This Month', value: stats.completedThisMonth, icon: CheckCircle2, color: 'text-green-600' },
  ];

  return (
    <div className="space-y-4">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map((stat) => (
          <Card key={stat.label} className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/50 flex-wrap h-auto gap-1">
          <TabsTrigger value="overview" className="gap-1.5 text-xs">
            <BookOpen className="w-3.5 h-3.5" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="case-planner" className="gap-1.5 text-xs">
            <FileText className="w-3.5 h-3.5" />
            Case Planner
          </TabsTrigger>
          <TabsTrigger value="service-tracker" className="gap-1.5 text-xs">
            <Clock className="w-3.5 h-3.5" />
            Service Minutes
          </TabsTrigger>
          <TabsTrigger value="communications" className="gap-1.5 text-xs">
            <MessageSquare className="w-3.5 h-3.5" />
            Communications
          </TabsTrigger>
          <TabsTrigger value="auto-iep" className="gap-1.5 text-xs">
            <Download className="w-3.5 h-3.5" />
            Auto IEP
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Recent Activity */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                {caseData.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p>No IEP activity yet</p>
                    <p className="text-xs mt-1">Start by adding case data from the Case Planner tab</p>
                  </div>
                ) : (
                  <ScrollArea className="h-48">
                    <div className="space-y-2">
                      {caseData.slice(0, 10).map((item: any) => (
                        <div key={item.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 text-sm">
                          <Badge variant="outline" className="text-xs shrink-0">
                            {item.data_type.replace('_', ' ')}
                          </Badge>
                          <span className="truncate text-muted-foreground">
                            {new Date(item.updated_at).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start gap-2 text-sm" onClick={() => setActiveTab('case-planner')}>
                  <Plus className="w-4 h-4" /> New Case Plan
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2 text-sm" onClick={() => setActiveTab('service-tracker')}>
                  <Clock className="w-4 h-4" /> Log Service Minutes
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2 text-sm" onClick={() => setActiveTab('communications')}>
                  <MessageSquare className="w-4 h-4" /> Log Communication
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2 text-sm" onClick={() => setActiveTab('auto-iep')}>
                  <Download className="w-4 h-4" /> Generate IEP Packet
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="case-planner">
          <IEPCasePlanner caseData={caseData.filter(c => c.data_type === 'case_plan')} onRefresh={fetchData} />
        </TabsContent>

        <TabsContent value="service-tracker">
          <IEPServiceTracker caseData={caseData.filter(c => c.data_type === 'service_minutes')} onRefresh={fetchData} />
        </TabsContent>

        <TabsContent value="communications">
          <IEPCommsLog caseData={caseData.filter(c => ['communication', 'meeting_notes'].includes(c.data_type))} onRefresh={fetchData} />
        </TabsContent>

        <TabsContent value="auto-iep">
          <IEPAutoWorkbook />
        </TabsContent>
      </Tabs>
    </div>
  );
}
