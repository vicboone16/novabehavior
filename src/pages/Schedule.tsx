import { useState, useEffect, useMemo, useRef } from 'react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, addWeeks, addMonths, subDays, subWeeks, subMonths, isSameDay, parseISO, startOfDay, endOfDay, isPast, differenceInMinutes } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  Plus, Users, User, Clock, Loader2, Download, AlertTriangle, Sparkles, Video
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScheduleTimeline } from '@/components/schedule/ScheduleTimeline';
import { SchedulingEngine } from '@/components/scheduling/SchedulingEngine';
import { StaffAvailabilityPanel } from '@/components/schedule/StaffAvailabilityPanel';
import { ScheduleDayView } from '@/components/schedule/ScheduleDayView';
import { ScheduleWeekView } from '@/components/schedule/ScheduleWeekView';
import { ScheduleMonthView } from '@/components/schedule/ScheduleMonthView';
import { AppointmentDialog } from '@/components/schedule/AppointmentDialog';
import { SessionPromptDialog } from '@/components/schedule/SessionPromptDialog';
import { VerificationDialog } from '@/components/schedule/VerificationDialog';
import { VerificationQueue } from '@/components/schedule/VerificationQueue';
import { SendTelehealthLinkDialog } from '@/components/telehealth/SendTelehealthLinkDialog';
import type { Appointment, ScheduleViewType, FilterMode } from '@/types/schedule';

type ScheduleTab = 'calendar' | 'planning';

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
  const [showVerificationDialog, setShowVerificationDialog] = useState<Appointment | null>(null);
  const [showVerificationQueue, setShowVerificationQueue] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [activeTab, setActiveTab] = useState<ScheduleTab>('calendar');
  const [showSendTelehealthLink, setShowSendTelehealthLink] = useState(false);
  const [telehealthLinkAppointment, setTelehealthLinkAppointment] = useState<Appointment | null>(null);
  const scheduleRef = useRef<HTMLDivElement>(null);

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
      .select('user_id, display_name, email, first_name, last_name, credential')
      .eq('is_approved', true);

    if (data) {
      setStaff(data.map(p => ({
        id: p.user_id,
        name: p.display_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.email || 'Unknown',
        credential: p.credential || undefined,
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

  // Helper to check if user is assigned to an appointment
  const isUserAssignedToAppointment = (appointment: Appointment, userId: string) => {
    // Check both single staff_user_id and array staff_user_ids
    if (appointment.staff_user_id === userId) return true;
    if (appointment.staff_user_ids && appointment.staff_user_ids.includes(userId)) return true;
    return false;
  };

  // Filter appointments based on filter mode and user permissions
  const filteredAppointments = useMemo(() => {
    let filtered = appointments;

    // Non-admins can ONLY see their own appointments
    if (!isAdmin && user) {
      return appointments.filter(a => isUserAssignedToAppointment(a, user.id));
    }

    // Admins can use all filter modes
    switch (filterMode) {
      case 'my':
        if (user) {
          filtered = appointments.filter(a => isUserAssignedToAppointment(a, user.id));
        }
        break;
      case 'staff':
        if (selectedStaffId) {
          filtered = appointments.filter(a => isUserAssignedToAppointment(a, selectedStaffId));
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
    if (!user) return [];
    
    // Get student IDs from user's appointments
    const studentIdsWithAppointments = new Set(
      appointments
        .filter(a => isUserAssignedToAppointment(a, user.id) && a.student_id)
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
    const now = new Date();
    const startTime = new Date(appointment.start_time);
    const endTime = new Date(appointment.end_time);
    const timeDiffStart = differenceInMinutes(startTime, now); // minutes until start
    const isPastEnd = isPast(endTime);
    const isTelehealth = appointment.appointment_type === 'telehealth';
    
    // If past the appointment end time and unverified, show verification dialog
    if (isPastEnd && appointment.status === 'scheduled' && 
        (!appointment.verification_status || appointment.verification_status === 'unverified')) {
      setShowVerificationDialog(appointment);
    }
    // If within 15 minutes of start time or past start time but before end, offer to start session
    else if (timeDiffStart <= 15 && !isPast(endTime) && appointment.status === 'scheduled' && !appointment.linked_session_id) {
      setShowSessionPrompt(appointment);
    }
    // For telehealth appointments that are upcoming but outside 15-min window, still show session prompt so they can join video / send link
    else if (isTelehealth && !isPastEnd && appointment.status === 'scheduled') {
      setShowSessionPrompt(appointment);
    } else if (isAdmin) {
      // Only admins can edit appointments
      handleEditAppointment(appointment);
    }
  };

  const handleSendTelehealthLink = (appointment: Appointment) => {
    setTelehealthLinkAppointment(appointment);
    setShowSendTelehealthLink(true);
  };

  const handleJoinVideo = (appointment: Appointment) => {
    // For now, show session prompt which has the Join Video option
    setShowSessionPrompt(appointment);
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

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setCurrentDate(date);
      setShowDatePicker(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      const { start, end } = getDateRange();
      
      // Helper to get all staff names for an appointment
      const getStaffNames = (apt: Appointment) => {
        const staffIds = apt.staff_user_ids?.length 
          ? apt.staff_user_ids 
          : apt.staff_user_id ? [apt.staff_user_id] : [];
        
        if (staffIds.length === 0) return 'Unassigned';
        return staffIds.map(id => staff.find(s => s.id === id)?.name || 'Unknown').join(', ');
      };
      
      // Build the PDF content
      const appointmentList = filteredAppointments
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
        .map(apt => {
          const studentName = apt.student_id 
            ? (students.find(s => s.id === apt.student_id)?.name || 'Unknown Student')
            : 'Staff Meeting';
          const staffNames = getStaffNames(apt);
          const startTime = format(new Date(apt.start_time), 'EEE, MMM d, yyyy h:mm a');
          const endTime = format(new Date(apt.end_time), 'h:mm a');
          const status = apt.status.charAt(0).toUpperCase() + apt.status.slice(1);
          const type = apt.appointment_type === 'retroactive' ? ' (Retroactive)' : '';
          
          return `${startTime} - ${endTime}\n  ${studentName} | Staff: ${staffNames}\n  Status: ${status}${type}`;
        })
        .join('\n\n');

      const title = `Schedule Export - ${getDateLabel()}`;
      const exportDate = format(new Date(), 'MMMM d, yyyy h:mm a');
      
      const content = `
${title}
${'='.repeat(50)}
Exported: ${exportDate}
Total Appointments: ${filteredAppointments.length}
${'='.repeat(50)}

${filteredAppointments.length > 0 ? appointmentList : 'No appointments scheduled for this period.'}
      `.trim();

      // Create and download as text file (simple PDF alternative)
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `schedule-${format(start, 'yyyy-MM-dd')}-to-${format(end, 'yyyy-MM-dd')}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({ title: 'Schedule exported successfully' });
    } catch (error: any) {
      toast({ title: 'Export failed', description: error.message, variant: 'destructive' });
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
            <div className="flex items-center gap-4">
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5" />
                Schedule
              </CardTitle>
              
              {/* Main tab switcher: Calendar vs Planning */}
              {isAdmin && (
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ScheduleTab)}>
                  <TabsList>
                    <TabsTrigger value="calendar" className="gap-1">
                      <CalendarIcon className="w-4 h-4" />
                      Calendar
                    </TabsTrigger>
                    <TabsTrigger value="planning" className="gap-1">
                      <Sparkles className="w-4 h-4" />
                      Planning
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              )}
            </div>
            
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

              {/* Verification queue toggle - Admin only */}
              {isAdmin && (
                <div className="flex items-center gap-2">
                  <Switch
                    id="show-verification"
                    checked={showVerificationQueue}
                    onCheckedChange={setShowVerificationQueue}
                  />
                  <Label htmlFor="show-verification" className="text-sm flex items-center gap-1 cursor-pointer">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    Needs Verification
                  </Label>
                </div>
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

        <CardContent className="space-y-4" ref={scheduleRef}>
          {activeTab === 'planning' && isAdmin ? (
            /* Planning tab with SchedulingEngine */
            <SchedulingEngine />
          ) : (
            /* Calendar tab */
            <>
              {/* Navigation and view controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Button variant="outline" size="icon" onClick={() => navigateDate('prev')}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={goToToday}>
                    Today
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => navigateDate('next')}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  
                  {/* Date picker for jumping to specific date */}
                  <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-1">
                        <CalendarIcon className="w-4 h-4" />
                        {getDateLabel()}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={currentDate}
                        onSelect={handleDateSelect}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="flex items-center gap-2">
                  <Tabs value={viewType} onValueChange={(v) => setViewType(v as ScheduleViewType)}>
                    <TabsList>
                      <TabsTrigger value="day">Day</TabsTrigger>
                      <TabsTrigger value="week">Week</TabsTrigger>
                      <TabsTrigger value="month">Month</TabsTrigger>
                      <TabsTrigger value="timeline">Timeline</TabsTrigger>
                    </TabsList>
                  </Tabs>
                  
                  {/* Export PDF button */}
                  <Button variant="outline" size="sm" onClick={handleExportPDF}>
                    <Download className="w-4 h-4 mr-1" />
                    Export
                  </Button>
                </div>
              </div>

              {/* Staff availability panel - visible in day/week views for admins */}
              {isAdmin && (viewType === 'day' || viewType === 'week') && (
                <StaffAvailabilityPanel 
                  currentDate={currentDate} 
                  viewType={viewType} 
                />
              )}

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
        onJoinVideo={handleJoinVideo}
        onSendLink={handleSendTelehealthLink}
      />

      {/* Send Telehealth Link Dialog */}
      <SendTelehealthLinkDialog
        open={showSendTelehealthLink}
        onOpenChange={setShowSendTelehealthLink}
        studentName={students.find(s => s.id === telehealthLinkAppointment?.student_id)?.name || 'Student'}
        staffName={staff.find(s => s.id === telehealthLinkAppointment?.staff_user_id)?.name}
        scheduledTime={telehealthLinkAppointment?.start_time}
      />

      {/* Verification Dialog */}
      <VerificationDialog
        appointment={showVerificationDialog}
        open={!!showVerificationDialog}
        onOpenChange={(open) => !open && setShowVerificationDialog(null)}
        studentName={students.find(s => s.id === showVerificationDialog?.student_id)?.name}
        staffName={staff.find(s => s.id === showVerificationDialog?.staff_user_id)?.name}
        onVerified={() => {
          loadAppointments();
          setShowVerificationDialog(null);
        }}
      />

      {/* Verification Queue - Admin only */}
      {isAdmin && showVerificationQueue && (
        <VerificationQueue
          students={students}
          staff={staff}
          onRefresh={loadAppointments}
        />
      )}
    </div>
  );
}
