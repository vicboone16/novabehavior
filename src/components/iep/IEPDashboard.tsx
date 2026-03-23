import { useState, useEffect, useCallback } from 'react';
import {
  FileText, Users, MessageSquare, Calendar, BookOpen,
  Plus, ChevronRight, AlertCircle, CheckCircle2, Clock,
  Download, ClipboardCheck
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useDataStore } from '@/store/dataStore';
import { toast } from 'sonner';
import { IEPCasePlanner } from './dashboard/IEPCasePlanner';
import { IEPServiceTracker } from './dashboard/IEPServiceTracker';
import { IEPCommsLog } from './dashboard/IEPCommsLog';
import { IEPAutoWorkbook } from './dashboard/IEPAutoWorkbook';
import { IEPEvalTracker } from './dashboard/IEPEvalTracker';
import { IEPStudentDetail } from './dashboard/IEPStudentDetail';

interface IEPStats {
  totalStudents: number;
  upcomingMeetings: number;
  overdueItems: number;
  completedThisMonth: number;
}

export function IEPDashboard() {
  const { user } = useAuth();
  const { students } = useDataStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedStudent, setSelectedStudent] = useState<{ id: string; name: string; color?: string } | null>(null);
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
    } catch {
      toast.error('Failed to load IEP data');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calendar sync: creates an appointment entry when scheduling from eval tracker
  const handleScheduleAppointment = async (data: { student_id: string; title: string; date: string; type: string; notes?: string }) => {
    if (!user) return;
    try {
      const startTime = new Date(data.date);
      const endTime = new Date(startTime.getTime() + 30 * 60000); // 30 min default
      
      const { error } = await supabase.from('appointments').insert({
        title: data.title,
        student_id: data.student_id,
        created_by: user.id,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        duration_minutes: 30,
        appointment_type: data.type,
        status: 'scheduled',
        notes: data.notes || null,
      } as any);
      
      if (error) throw error;
      toast.success(`${data.title} added to calendar`);
    } catch (err: any) {
      toast.error('Failed to add to calendar: ' + err.message);
    }
  };

  // If a student is selected, show their detail view
  if (selectedStudent) {
    return (
      <IEPStudentDetail
        student={selectedStudent}
        onClose={() => setSelectedStudent(null)}
      />
    );
  }

  const statCards = [
    { label: 'Active Students', value: stats.totalStudents, icon: Users, color: 'text-blue-600' },
    { label: 'Upcoming Meetings', value: stats.upcomingMeetings, icon: Calendar, color: 'text-emerald-600' },
    { label: 'Overdue Items', value: stats.overdueItems, icon: AlertCircle, color: 'text-amber-600' },
    { label: 'Completed This Month', value: stats.completedThisMonth, icon: CheckCircle2, color: 'text-green-600' },
  ];

  // Get unique students from case data for the overview clickable list
  const studentIds = [...new Set(caseData.map(c => c.student_id))];

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
          <TabsTrigger value="eval-tracker" className="gap-1.5 text-xs">
            <ClipboardCheck className="w-3.5 h-3.5" />
            Eval Tracker
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
            {/* Students on caseload - clickable */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Students on Caseload</CardTitle>
              </CardHeader>
              <CardContent>
                {studentIds.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p>No students on IEP caseload</p>
                    <p className="text-xs mt-1">Add a case plan or evaluation to get started</p>
                  </div>
                ) : (
                  <ScrollArea className="h-48">
                    <div className="space-y-1">
                      {studentIds.map(sid => {
                        const student = students.find(s => s.id === sid);
                        if (!student) return null;
                        const studentCases = caseData.filter(c => c.student_id === sid);
                        const activeCount = studentCases.filter(c => c.status === 'active').length;
                        return (
                          <div
                            key={sid}
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 cursor-pointer group transition-colors"
                            onClick={() => setSelectedStudent({ id: student.id, name: student.name, color: student.color })}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: student.color || 'hsl(var(--primary))' }}>
                                <span className="text-[10px] font-bold text-white">{student.name.charAt(0)}</span>
                              </div>
                              <span className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                                {student.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {activeCount > 0 && <Badge variant="secondary" className="text-[10px] h-5">{activeCount} active</Badge>}
                              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                        );
                      })}
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
                <Button variant="outline" className="w-full justify-start gap-2 text-sm" onClick={() => setActiveTab('eval-tracker')}>
                  <ClipboardCheck className="w-4 h-4" /> New Evaluation Tracker
                </Button>
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

        <TabsContent value="eval-tracker">
          <IEPEvalTracker onScheduleAppointment={handleScheduleAppointment} />
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
