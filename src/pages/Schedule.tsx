import { useState, useEffect, useMemo } from 'react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, addWeeks, addMonths, subDays, subWeeks, subMonths, isSameDay, parseISO, startOfDay, endOfDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  Plus, Users, User, Clock, Loader2 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScheduleTimeline } from '@/components/schedule/ScheduleTimeline';
import { ScheduleDayView } from '@/components/schedule/ScheduleDayView';
import { ScheduleWeekView } from '@/components/schedule/ScheduleWeekView';
import { ScheduleMonthView } from '@/components/schedule/ScheduleMonthView';
import { AppointmentDialog } from '@/components/schedule/AppointmentDialog';
import { SessionPromptDialog } from '@/components/schedule/SessionPromptDialog';
import type { Appointment, ScheduleViewType, FilterMode } from '@/types/schedule';

export default function Schedule() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<ScheduleViewType>('week');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [staff, setStaff] = useState<{ id: string; name: string }[]>([]);
  const [students, setStudents] = useState<{ id: string; name: string; color: string }[]>([]);
  
  const [showAppointmentDialog, setShowAppointmentDialog] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [showSessionPrompt, setShowSessionPrompt] = useState<Appointment | null>(null);

  // Check admin status and set appropriate filter mode for non-admins
  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) return;
      const { data } = await supabase.rpc('is_admin', { _user_id: user.id });
      setIsAdmin(!!data);
      // Non-admins should only see their own schedule by default
      if (!data) {
        setFilterMode('my');
      }
    };
    checkAdmin();
  }, [user]);

  // Load data
  useEffect(() => {
    loadData();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('appointments-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
        loadAppointments();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Reload appointments when date range changes
  useEffect(() => {
    loadAppointments();
  }, [currentDate, viewType]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadAppointments(), loadStaff(), loadStudents()]);
    } finally {
      setLoading(false);
    }
  };

  const loadAppointments = async () => {
    const { start, end } = getDateRange();
    
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .gte('start_time', start.toISOString())
      .lte('start_time', end.toISOString())
      .order('start_time');

    if (error) {
      console.error('Error loading appointments:', error);
      return;
    }

    setAppointments((data || []) as Appointment[]);
  };

  const loadStaff = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('user_id, display_name, email, first_name, last_name')
      .eq('is_approved', true);

    if (data) {
      setStaff(data.map(p => ({
        id: p.user_id,
        name: p.display_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.email || 'Unknown'
      })));
    }
  };

  const loadStudents = async () => {
    const { data } = await supabase
      .from('students')
      .select('id, name, color')
      .eq('is_archived', false)
      .order('name');

    if (data) {
      setStudents(data);
    }
  };

  const getDateRange = () => {
    switch (viewType) {
      case 'day':
        return { start: startOfDay(currentDate), end: endOfDay(currentDate) };
      case 'week':
        return { start: startOfWeek(currentDate), end: endOfWeek(currentDate) };
      case 'month':
        return { start: startOfMonth(currentDate), end: endOfMonth(currentDate) };
      case 'timeline':
        return { start: startOfDay(currentDate), end: endOfDay(currentDate) };
      default:
        return { start: startOfDay(currentDate), end: endOfDay(currentDate) };
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const fn = direction === 'prev' 
      ? viewType === 'day' || viewType === 'timeline' ? subDays 
        : viewType === 'week' ? subWeeks : subMonths
      : viewType === 'day' || viewType === 'timeline' ? addDays 
        : viewType === 'week' ? addWeeks : addMonths;
    setCurrentDate(fn(currentDate, 1));
  };

  const goToToday = () => setCurrentDate(new Date());

  // Filter appointments based on filter mode and user permissions
  const filteredAppointments = useMemo(() => {
    let filtered = appointments;

    // Non-admins can ONLY see their own appointments
    if (!isAdmin) {
      return appointments.filter(a => a.staff_user_id === user?.id);
    }

    // Admins can use all filter modes
    switch (filterMode) {
      case 'my':
        filtered = appointments.filter(a => a.staff_user_id === user?.id);
        break;
      case 'staff':
        if (selectedStaffId) {
          filtered = appointments.filter(a => a.staff_user_id === selectedStaffId);
        }
        break;
      case 'student':
        if (selectedStudentId) {
          filtered = appointments.filter(a => a.student_id === selectedStudentId);
        }
        break;
    }

    return filtered;
  }, [appointments, filterMode, selectedStaffId, selectedStudentId, user?.id, isAdmin]);

  // For non-admins, only show students they have appointments with
  const visibleStudents = useMemo(() => {
    if (isAdmin) return students;
    
    // Get student IDs from user's appointments
    const studentIdsWithAppointments = new Set(
      appointments
        .filter(a => a.staff_user_id === user?.id && a.student_id)
        .map(a => a.student_id)
    );
    
    return students.filter(s => studentIdsWithAppointments.has(s.id));
  }, [students, appointments, user?.id, isAdmin]);

  const handleCreateAppointment = () => {
    setEditingAppointment(null);
    setShowAppointmentDialog(true);
  };

  const handleEditAppointment = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setShowAppointmentDialog(true);
  };

  const handleAppointmentClick = (appointment: Appointment) => {
    // Check if it's time to start the session
    const now = new Date();
    const startTime = new Date(appointment.start_time);
    const timeDiff = (startTime.getTime() - now.getTime()) / (1000 * 60); // minutes
    
    // If within 15 minutes of start time or past start time, offer to start session
    if (timeDiff <= 15 && appointment.status === 'scheduled' && !appointment.linked_session_id) {
      setShowSessionPrompt(appointment);
    } else if (isAdmin) {
      // Only admins can edit appointments
      handleEditAppointment(appointment);
    }
    // Non-admins clicking outside the session prompt window does nothing
  };

  const handleSaveAppointment = async (data: Partial<Appointment>) => {
    try {
      if (editingAppointment) {
        const { error } = await supabase
          .from('appointments')
          .update(data)
          .eq('id', editingAppointment.id);

        if (error) throw error;
        toast({ title: 'Appointment updated' });
      } else {
        const insertData = { ...data, created_by: user?.id } as any;
        const { error } = await supabase
          .from('appointments')
          .insert(insertData);

        if (error) throw error;
        toast({ title: 'Appointment created' });
      }

      setShowAppointmentDialog(false);
      loadAppointments();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleDeleteAppointment = async (id: string) => {
    try {
      const { error } = await supabase.from('appointments').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Appointment deleted' });
      setShowAppointmentDialog(false);
      loadAppointments();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleDragAppointment = async (id: string, newStart: Date, newEnd: Date) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          start_time: newStart.toISOString(),
          end_time: newEnd.toISOString(),
          duration_minutes: Math.round((newEnd.getTime() - newStart.getTime()) / 60000)
        })
        .eq('id', id);

      if (error) throw error;
      loadAppointments();
    } catch (error: any) {
      toast({ title: 'Failed to move appointment', description: error.message, variant: 'destructive' });
    }
  };

  const getDateLabel = () => {
    switch (viewType) {
      case 'day':
      case 'timeline':
        return format(currentDate, 'EEEE, MMMM d, yyyy');
      case 'week':
        const weekStart = startOfWeek(currentDate);
        const weekEnd = endOfWeek(currentDate);
        return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
      case 'month':
        return format(currentDate, 'MMMM yyyy');
      default:
        return format(currentDate, 'MMMM d, yyyy');
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              Schedule
            </CardTitle>
            
            <div className="flex flex-wrap items-center gap-2">
              {/* Filter controls - Only show for admins */}
              {isAdmin && (
                <>
                  <Select value={filterMode} onValueChange={(v: FilterMode) => setFilterMode(v)}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        <span className="flex items-center gap-2"><Users className="w-4 h-4" /> All</span>
                      </SelectItem>
                      <SelectItem value="my">
                        <span className="flex items-center gap-2"><User className="w-4 h-4" /> My Schedule</span>
                      </SelectItem>
                      <SelectItem value="staff">By Staff</SelectItem>
                      <SelectItem value="student">By Student</SelectItem>
                    </SelectContent>
                  </Select>

                  {filterMode === 'staff' && (
                    <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select staff..." />
                      </SelectTrigger>
                      <SelectContent>
                        {staff.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {filterMode === 'student' && (
                    <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select student..." />
                      </SelectTrigger>
                      <SelectContent>
                        {students.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </>
              )}

              {/* Non-admins see a label instead of filter dropdown */}
              {!isAdmin && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  My Schedule
                </Badge>
              )}

              {/* Only admins can create new appointments */}
              {isAdmin && (
                <Button onClick={handleCreateAppointment} size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  New Appointment
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Navigation and view controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => navigateDate('prev')}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday}>
                Today
              </Button>
              <Button variant="outline" size="icon" onClick={() => navigateDate('next')}>
                <ChevronRight className="w-4 h-4" />
              </Button>
              <span className="ml-2 font-medium">{getDateLabel()}</span>
            </div>

            <Tabs value={viewType} onValueChange={(v) => setViewType(v as ScheduleViewType)}>
              <TabsList>
                <TabsTrigger value="day">Day</TabsTrigger>
                <TabsTrigger value="week">Week</TabsTrigger>
                <TabsTrigger value="month">Month</TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Calendar views */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {viewType === 'day' && (
                <ScheduleDayView
                  date={currentDate}
                  appointments={filteredAppointments}
                  students={visibleStudents}
                  staff={staff}
                  onAppointmentClick={handleAppointmentClick}
                  onDragAppointment={isAdmin ? handleDragAppointment : async () => {}}
                />
              )}
              {viewType === 'week' && (
                <ScheduleWeekView
                  date={currentDate}
                  appointments={filteredAppointments}
                  students={visibleStudents}
                  staff={staff}
                  onAppointmentClick={handleAppointmentClick}
                  onDragAppointment={isAdmin ? handleDragAppointment : async () => {}}
                />
              )}
              {viewType === 'month' && (
                <ScheduleMonthView
                  date={currentDate}
                  appointments={filteredAppointments}
                  students={visibleStudents}
                  staff={staff}
                  onAppointmentClick={handleAppointmentClick}
                />
              )}
              {viewType === 'timeline' && (
                <ScheduleTimeline
                  date={currentDate}
                  appointments={filteredAppointments}
                  students={visibleStudents}
                  staff={staff}
                  filterMode={isAdmin ? filterMode : 'my'}
                  onAppointmentClick={handleAppointmentClick}
                  onDragAppointment={isAdmin ? handleDragAppointment : async () => {}}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      {isAdmin && (
        <AppointmentDialog
          open={showAppointmentDialog}
          onOpenChange={setShowAppointmentDialog}
          appointment={editingAppointment}
          students={students}
          staff={staff}
          onSave={handleSaveAppointment}
          onDelete={editingAppointment ? () => handleDeleteAppointment(editingAppointment.id) : undefined}
        />
      )}

      <SessionPromptDialog
        appointment={showSessionPrompt}
        onClose={() => setShowSessionPrompt(null)}
        students={students}
        staff={staff}
      />
    </div>
  );
}
