import { useState, useEffect } from 'react';
import { format, differenceInDays, startOfDay, subDays } from 'date-fns';
import { 
  AlertTriangle, 
  Clock, 
  User, 
  Filter, 
  RefreshCw,
  CheckCircle2, 
  Calendar,
  FileText,
  XCircle,
  ChevronDown,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { SERVICE_SETTING_LABELS, OUTCOME_LABELS, AttendanceOutcome } from '@/types/scheduling';
import { VerificationDialog } from './VerificationDialog';
import type { Appointment, CalendarStudent, CalendarStaff } from '@/types/schedule';

interface VerificationQueueProps {
  students: CalendarStudent[];
  staff: CalendarStaff[];
  onRefresh: () => void;
}

type QueueTab = 'unverified' | 'recent' | 'flagged';

interface ExtendedAppointment extends Appointment {
  has_session?: boolean;
  has_note?: boolean;
}

export function VerificationQueue({
  students,
  staff,
  onRefresh,
}: VerificationQueueProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<QueueTab>('unverified');
  const [appointments, setAppointments] = useState<ExtendedAppointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  
  // Filters
  const [filterStaff, setFilterStaff] = useState<string>('all');
  const [filterStudent, setFilterStudent] = useState<string>('all');
  const [filterDays, setFilterDays] = useState<string>('7');

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const daysBack = parseInt(filterDays);
      const startDate = subDays(startOfDay(now), daysBack);

      let query = supabase
        .from('appointments')
        .select(`
          *,
          sessions:linked_session_id (
            id,
            has_data
          )
        `)
        .lt('end_time', now.toISOString())
        .gte('start_time', startDate.toISOString())
        .order('start_time', { ascending: false });

      // Apply tab-specific filters
      if (activeTab === 'unverified') {
        query = query
          .eq('status', 'scheduled')
          .or('verification_status.is.null,verification_status.eq.unverified');
      } else if (activeTab === 'recent') {
        query = query.in('verification_status', ['verified_occurred', 'verified_not_occurred']);
      } else if (activeTab === 'flagged') {
        // Appointments that are significantly overdue (>3 days)
        const threeDaysAgo = subDays(now, 3);
        query = query
          .eq('status', 'scheduled')
          .or('verification_status.is.null,verification_status.eq.unverified')
          .lt('end_time', threeDaysAgo.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform and add metadata
      const transformed: ExtendedAppointment[] = (data || []).map((apt: any) => ({
        ...apt,
        has_session: !!apt.sessions?.id,
        has_note: apt.sessions?.has_data || false,
      }));

      setAppointments(transformed);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to load verification queue', 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [activeTab, filterDays]);

  const filteredAppointments = appointments.filter(apt => {
    if (filterStaff !== 'all') {
      const hasStaff = apt.staff_user_id === filterStaff || apt.staff_user_ids?.includes(filterStaff);
      if (!hasStaff) return false;
    }
    if (filterStudent !== 'all' && apt.student_id !== filterStudent) return false;
    return true;
  });

  const getStudentName = (id?: string | null) => 
    students.find(s => s.id === id)?.name || 'Unknown';
  
  const getStaffName = (apt: Appointment) => {
    const staffId = apt.staff_user_id || apt.staff_user_ids?.[0];
    return staff.find(s => s.id === staffId)?.name || 'Unassigned';
  };

  const getDaysOverdue = (endTime: string) => {
    return differenceInDays(new Date(), new Date(endTime));
  };

  const handleVerified = () => {
    setSelectedAppointment(null);
    fetchAppointments();
    onRefresh();
  };

  const handleQuickAction = async (apt: ExtendedAppointment, action: 'occurred' | AttendanceOutcome) => {
    if (!user || !apt.student_id) return;

    try {
      if (action === 'occurred') {
        // Create session and mark as occurred
        const { data: session, error: sessionError } = await supabase
          .from('sessions')
          .insert({
            user_id: user.id,
            name: `Session - ${getStudentName(apt.student_id)}`,
            start_time: apt.start_time,
            end_time: apt.end_time,
            session_length_minutes: apt.duration_minutes,
            student_ids: [apt.student_id],
            status: 'completed',
            appointment_id: apt.id,
            service_type: apt.appointment_type || 'direct_therapy',
            service_setting: apt.service_setting || 'school',
            verification_source: 'queue_verified',
            attendance_outcome: 'occurred',
            has_data: false,
            provider_id: apt.staff_user_id,
          })
          .select()
          .single();

        if (sessionError) throw sessionError;

        await supabase
          .from('appointments')
          .update({
            status: 'completed',
            verification_status: 'verified_occurred',
            verified_at: new Date().toISOString(),
            verified_by: user.id,
            linked_session_id: session.id,
          })
          .eq('id', apt.id);

        await supabase
          .from('attendance_logs')
          .insert({
            student_id: apt.student_id,
            appointment_id: apt.id,
            session_id: session.id,
            date: format(new Date(apt.start_time), 'yyyy-MM-dd'),
            outcome: 'occurred',
            marked_by_user_id: user.id,
          });

        toast({ title: 'Verified', description: 'Session marked as occurred' });
      } else {
        // Mark as did not occur
        const statusMap: Record<string, string> = {
          canceled: 'canceled',
          rescheduled: 'rescheduled',
          no_show: 'no_show',
        };

        await supabase
          .from('appointments')
          .update({
            status: statusMap[action] || 'did_not_occur',
            verification_status: 'verified_not_occurred',
            verified_at: new Date().toISOString(),
            verified_by: user.id,
          })
          .eq('id', apt.id);

        await supabase
          .from('attendance_logs')
          .insert({
            student_id: apt.student_id,
            appointment_id: apt.id,
            date: format(new Date(apt.start_time), 'yyyy-MM-dd'),
            outcome: action,
            marked_by_user_id: user.id,
          });

        toast({ title: 'Updated', description: `Marked as ${OUTCOME_LABELS[action as AttendanceOutcome]}` });
      }

      fetchAppointments();
      onRefresh();
    } catch (error: any) {
      console.error('Error:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const renderAppointmentRow = (apt: ExtendedAppointment) => {
    const daysOverdue = getDaysOverdue(apt.end_time);
    const isVerified = apt.verification_status?.includes('verified');

    return (
      <TableRow key={apt.id} className={isVerified ? 'opacity-60' : ''}>
        <TableCell className="font-medium">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            {format(new Date(apt.start_time), 'MMM d, yyyy')}
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <div 
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: students.find(s => s.id === apt.student_id)?.color }}
            />
            {getStudentName(apt.student_id)}
          </div>
        </TableCell>
        <TableCell className="text-muted-foreground">
          {getStaffName(apt)}
        </TableCell>
        <TableCell>
          {format(new Date(apt.start_time), 'h:mm a')} - {format(new Date(apt.end_time), 'h:mm a')}
        </TableCell>
        <TableCell>
          <Badge variant="outline" className="text-xs">
            {SERVICE_SETTING_LABELS[apt.service_setting as keyof typeof SERVICE_SETTING_LABELS] || apt.service_setting}
          </Badge>
        </TableCell>
        <TableCell>
          {!isVerified ? (
            <Badge 
              variant={daysOverdue > 3 ? 'destructive' : daysOverdue > 1 ? 'secondary' : 'outline'} 
              className="text-xs"
            >
              {daysOverdue} day{daysOverdue !== 1 ? 's' : ''} ago
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs text-primary border-primary/30">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Verified
            </Badge>
          )}
        </TableCell>
        <TableCell>
          <div className="flex gap-1">
            {apt.has_session && (
              <Badge variant="outline" className="text-xs">
                <FileText className="w-3 h-3" />
              </Badge>
            )}
          </div>
        </TableCell>
        <TableCell className="text-right">
          {!isVerified ? (
            <div className="flex gap-1 justify-end">
              <Button 
                size="sm" 
                variant="outline"
                className="text-primary hover:text-primary hover:bg-primary/10"
                onClick={() => handleQuickAction(apt, 'occurred')}
              >
                <CheckCircle2 className="w-4 h-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline">
                    <XCircle className="w-4 h-4 mr-1" />
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleQuickAction(apt, 'canceled')}>
                    Canceled
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleQuickAction(apt, 'rescheduled')}>
                    Rescheduled
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleQuickAction(apt, 'no_show')}>
                    No Show
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedAppointment(apt)}>
                    Other / Details...
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => setSelectedAppointment(apt)}
            >
              View
            </Button>
          )}
        </TableCell>
      </TableRow>
    );
  };

  const unverifiedCount = appointments.filter(a => !a.verification_status?.includes('verified')).length;
  const flaggedCount = appointments.filter(a => 
    !a.verification_status?.includes('verified') && 
    getDaysOverdue(a.end_time) > 3
  ).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Verification Queue
            </CardTitle>
            <CardDescription>
              Audit and verify past appointments
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchAppointments} disabled={loading}>
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as QueueTab)}>
          <TabsList>
            <TabsTrigger value="unverified" className="gap-1">
              Unverified
              {unverifiedCount > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {unverifiedCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="flagged" className="gap-1">
              Flagged
              {flaggedCount > 0 && (
                <Badge variant="destructive" className="ml-1 text-xs">
                  {flaggedCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="recent">Recently Verified</TabsTrigger>
          </TabsList>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center mt-4">
            <Filter className="w-4 h-4 text-muted-foreground" />
            
            <Select value={filterDays} onValueChange={setFilterDays}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="14">Last 14 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterStaff} onValueChange={setFilterStaff}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Staff" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Staff</SelectItem>
                {staff.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={filterStudent} onValueChange={setFilterStudent}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Students" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Students</SelectItem>
                {students.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(filterStaff !== 'all' || filterStudent !== 'all') && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setFilterStaff('all');
                  setFilterStudent('all');
                }}
              >
                Clear
              </Button>
            )}
          </div>

          {/* Content */}
          <TabsContent value={activeTab} className="mt-4">
            {filteredAppointments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>
                  {activeTab === 'unverified' 
                    ? 'All appointments are verified!' 
                    : activeTab === 'flagged'
                      ? 'No flagged appointments'
                      : 'No recently verified appointments'}
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Setting</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAppointments.map(renderAppointmentRow)}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Verification Dialog */}
      <VerificationDialog
        appointment={selectedAppointment}
        open={!!selectedAppointment}
        onOpenChange={(open) => !open && setSelectedAppointment(null)}
        studentName={getStudentName(selectedAppointment?.student_id)}
        staffName={selectedAppointment ? getStaffName(selectedAppointment) : undefined}
        onVerified={handleVerified}
      />
    </Card>
  );
}
