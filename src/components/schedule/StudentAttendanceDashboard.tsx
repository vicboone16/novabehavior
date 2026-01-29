import { useState, useEffect } from 'react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { 
  BarChart3, Calendar, CheckCircle2, XCircle, 
  Clock, AlertTriangle, TrendingUp, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { OUTCOME_LABELS, type AttendanceMetrics, type AttendanceLog } from '@/types/scheduling';

interface StudentAttendanceDashboardProps {
  studentId: string;
  studentName: string;
}

export function StudentAttendanceDashboard({
  studentId,
  studentName,
}: StudentAttendanceDashboardProps) {
  const [timeframe, setTimeframe] = useState('30');
  const [metrics, setMetrics] = useState<AttendanceMetrics | null>(null);
  const [recentLogs, setRecentLogs] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const days = parseInt(timeframe);
      const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');
      const endDate = format(new Date(), 'yyyy-MM-dd');

      // Fetch attendance logs
      const { data: logs, error: logsError } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('student_id', studentId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (logsError) throw logsError;

      // Fetch appointments for the period (to count scheduled)
      const { data: appointments, error: aptError } = await supabase
        .from('appointments')
        .select('*')
        .eq('student_id', studentId)
        .gte('start_time', startOfDay(subDays(new Date(), days)).toISOString())
        .lte('start_time', endOfDay(new Date()).toISOString());

      if (aptError) throw aptError;

      // Calculate metrics
      const scheduled = appointments?.length || 0;
      const occurred = logs?.filter(l => l.outcome === 'occurred').length || 0;
      const canceled = logs?.filter(l => l.outcome === 'canceled').length || 0;
      const rescheduled = logs?.filter(l => l.outcome === 'rescheduled').length || 0;
      const noShow = logs?.filter(l => l.outcome === 'no_show').length || 0;
      const pending = appointments?.filter(a => 
        a.status === 'scheduled' && 
        (!a.verification_status || a.verification_status === 'unverified')
      ).length || 0;

      const totalAttempted = scheduled - pending;
      const attendanceRate = totalAttempted > 0 
        ? Math.round((occurred / totalAttempted) * 100) 
        : 0;

      setMetrics({
        scheduled,
        occurred,
        canceled,
        rescheduled,
        noShow,
        pendingVerification: pending,
        attendanceRate,
      });

      // Fetch user names for logs
      const userIds = [...new Set(logs?.map(l => l.marked_by_user_id) || [])];
      const { data: profiles } = userIds.length > 0
        ? await supabase.from('profiles').select('user_id, display_name, first_name, last_name').in('user_id', userIds)
        : { data: [] };

      const enrichedLogs = logs?.map(log => ({
        ...log,
        marked_by_name: profiles?.find(p => p.user_id === log.marked_by_user_id)
          ? profiles.find(p => p.user_id === log.marked_by_user_id)?.display_name ||
            `${profiles.find(p => p.user_id === log.marked_by_user_id)?.first_name || ''} ${profiles.find(p => p.user_id === log.marked_by_user_id)?.last_name || ''}`.trim() ||
            'Unknown'
          : 'Unknown'
      })) || [];

      setRecentLogs(enrichedLogs.slice(0, 10) as AttendanceLog[]);
    } catch (error) {
      console.error('Error fetching attendance data:', error);
      toast({ title: 'Error', description: 'Failed to load attendance data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (studentId) {
      fetchData();
    }
  }, [studentId, timeframe]);

  const getOutcomeIcon = (outcome: string) => {
    switch (outcome) {
      case 'occurred': return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'canceled': return <XCircle className="w-4 h-4 text-slate-500" />;
      case 'rescheduled': return <Calendar className="w-4 h-4 text-purple-600" />;
      case 'no_show': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getOutcomeBadgeColor = (outcome: string) => {
    switch (outcome) {
      case 'occurred': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'canceled': return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
      case 'rescheduled': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'no_show': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Attendance
            </CardTitle>
            <CardDescription>
              Session attendance metrics for {studentName}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="60">Last 60 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {metrics && (
          <>
            {/* Attendance Rate */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Attendance Rate</span>
                <span className="text-2xl font-bold text-primary">{metrics.attendanceRate}%</span>
              </div>
              <Progress value={metrics.attendanceRate} className="h-2" />
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <p className="text-2xl font-bold">{metrics.scheduled}</p>
                <p className="text-xs text-muted-foreground">Scheduled</p>
              </div>
              <div className="text-center p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
                <p className="text-2xl font-bold text-emerald-600">{metrics.occurred}</p>
                <p className="text-xs text-emerald-600/70">Occurred</p>
              </div>
              <div className="text-center p-3 bg-slate-50 dark:bg-slate-900/30 rounded-lg">
                <p className="text-2xl font-bold text-slate-500">{metrics.canceled}</p>
                <p className="text-xs text-slate-500/70">Canceled</p>
              </div>
              <div className="text-center p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                <p className="text-2xl font-bold text-purple-600">{metrics.rescheduled}</p>
                <p className="text-xs text-purple-600/70">Rescheduled</p>
              </div>
              <div className="text-center p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
                <p className="text-2xl font-bold text-red-600">{metrics.noShow}</p>
                <p className="text-xs text-red-600/70">No Show</p>
              </div>
              <div className="text-center p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                <p className="text-2xl font-bold text-amber-600">{metrics.pendingVerification}</p>
                <p className="text-xs text-amber-600/70">Pending</p>
              </div>
            </div>

            {/* Recent Attendance Log */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Recent Attendance</h4>
              {recentLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No attendance records in this period.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Outcome</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Marked By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentLogs.map(log => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">
                          {format(new Date(log.date), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          <Badge className={`text-xs gap-1 ${getOutcomeBadgeColor(log.outcome)}`}>
                            {getOutcomeIcon(log.outcome)}
                            {OUTCOME_LABELS[log.outcome as keyof typeof OUTCOME_LABELS] || log.outcome}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {log.reason_code?.replace(/_/g, ' ') || '—'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {log.marked_by_name}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
