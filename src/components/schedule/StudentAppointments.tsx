import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Calendar, Clock, User, Plus, ExternalLink, 
  Loader2, CalendarDays, CheckCircle2, XCircle, Video, Send
} from 'lucide-react';
import { AppointmentDialog } from './AppointmentDialog';
import { SendTelehealthLinkDialog } from '@/components/telehealth/SendTelehealthLinkDialog';
import type { Appointment, CalendarStudent, CalendarStaff } from '@/types/schedule';

interface StudentAppointmentsProps {
  studentId: string;
  studentName: string;
  studentColor: string;
}

export function StudentAppointments({ studentId, studentName, studentColor }: StudentAppointmentsProps) {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [staff, setStaff] = useState<CalendarStaff[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [showSendLink, setShowSendLink] = useState(false);
  const [sendLinkAppointment, setSendLinkAppointment] = useState<Appointment | null>(null);

  useEffect(() => {
    loadData();
  }, [studentId, user]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Check admin status
      if (user) {
        const { data: adminData } = await supabase.rpc('is_admin', { _user_id: user.id });
        setIsAdmin(!!adminData);
      }

      // Load appointments for this student
      const { data: appointmentsData } = await supabase
        .from('appointments')
        .select('*')
        .eq('student_id', studentId)
        .order('start_time', { ascending: false });

      setAppointments((appointmentsData || []) as Appointment[]);

      // Load staff for the dialog
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, display_name, email, first_name, last_name')
        .eq('is_approved', true);

      if (profilesData) {
        setStaff(profilesData.map(p => ({
          id: p.user_id,
          name: p.display_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.email || 'Unknown'
        })));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (data: Partial<Appointment>) => {
    try {
      if (editingAppointment) {
        await supabase
          .from('appointments')
          .update(data)
          .eq('id', editingAppointment.id);
      } else {
        await supabase
          .from('appointments')
          .insert({ ...data, student_id: studentId, created_by: user?.id } as any);
      }
      setShowDialog(false);
      setEditingAppointment(null);
      loadData();
    } catch (error) {
      console.error('Error saving appointment:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await supabase.from('appointments').delete().eq('id', id);
      setShowDialog(false);
      setEditingAppointment(null);
      loadData();
    } catch (error) {
      console.error('Error deleting appointment:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-primary hover:bg-primary/90"><CheckCircle2 className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'cancelled':
        return <Badge variant="secondary"><XCircle className="w-3 h-3 mr-1" />Cancelled</Badge>;
      case 'in_progress':
        return <Badge variant="default">In Progress</Badge>;
      case 'no_show':
        return <Badge variant="destructive">No Show</Badge>;
      default:
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Scheduled</Badge>;
    }
  };

  const getStaffNames = (apt: any) => {
    const staffIds = apt.staff_user_ids?.length 
      ? apt.staff_user_ids 
      : apt.staff_user_id ? [apt.staff_user_id] : [];
    
    if (staffIds.length === 0) return null;
    return staffIds.map((id: string) => staff.find(s => s.id === id)?.name || 'Unknown').join(', ');
  };

  // Separate upcoming and past appointments
  const now = new Date();
  const upcomingAppointments = appointments.filter(a => new Date(a.start_time) >= now);
  const pastAppointments = appointments.filter(a => new Date(a.start_time) < now);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="w-4 h-4" />
              Appointments
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link to="/schedule">
                  <ExternalLink className="w-3 h-3 mr-1" />
                  View Calendar
                </Link>
              </Button>
              {isAdmin && (
                <Button size="sm" onClick={() => { setEditingAppointment(null); setShowDialog(true); }}>
                  <Plus className="w-3 h-3 mr-1" />
                  Add Appointment
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {appointments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No appointments scheduled for this student.</p>
              {isAdmin && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-3"
                  onClick={() => { setEditingAppointment(null); setShowDialog(true); }}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Schedule First Appointment
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Upcoming */}
              {upcomingAppointments.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Upcoming</h4>
                  <div className="space-y-2">
                    {upcomingAppointments.map(apt => (
                      <div
                        key={apt.id}
                        onClick={() => isAdmin && (setEditingAppointment(apt), setShowDialog(true))}
                        className={`p-3 rounded-lg border ${isAdmin ? 'cursor-pointer hover:bg-muted/50' : ''} ${
                          apt.appointment_type === 'retroactive' ? 'border-dashed' : ''
                        }`}
                        style={{ borderColor: studentColor }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm">
                                {format(new Date(apt.start_time), 'EEE, MMM d')}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                {format(new Date(apt.start_time), 'h:mm a')} - {format(new Date(apt.end_time), 'h:mm a')}
                              </span>
                              {apt.appointment_type === 'retroactive' && (
                                <Badge variant="outline" className="text-xs">Retroactive</Badge>
                              )}
                              {(apt as any).is_telehealth && (
                                <Badge variant="outline" className="text-xs gap-1">
                                  <Video className="w-3 h-3" />
                                  Telehealth
                                </Badge>
                              )}
                            </div>
                            {getStaffNames(apt) && (
                              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {getStaffNames(apt)}
                              </p>
                            )}
                            {/* Telehealth actions */}
                            {(apt as any).is_telehealth && apt.status === 'scheduled' && (
                              <div className="flex gap-1 mt-2" onClick={(e) => e.stopPropagation()}>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => {
                                    setSendLinkAppointment(apt);
                                    setShowSendLink(true);
                                  }}
                                >
                                  <Send className="w-3 h-3 mr-1" />
                                  Send Link
                                </Button>
                              </div>
                            )}
                          </div>
                          {getStatusBadge(apt.status)}
                        </div>
                      </div>
                    ))}

                  </div>
                </div>
              )}

              {/* Past */}
              {pastAppointments.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">
                    Past ({pastAppointments.length})
                  </h4>
                  <ScrollArea className="max-h-[300px]">
                    <div className="space-y-2">
                      {pastAppointments.slice(0, 20).map(apt => (
                        <div
                          key={apt.id}
                          onClick={() => isAdmin && (setEditingAppointment(apt), setShowDialog(true))}
                          className={`p-3 rounded-lg border bg-muted/20 ${isAdmin ? 'cursor-pointer hover:bg-muted/40' : ''} ${
                            apt.appointment_type === 'retroactive' ? 'border-dashed' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm">
                                  {format(new Date(apt.start_time), 'EEE, MMM d, yyyy')}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                  {format(new Date(apt.start_time), 'h:mm a')} - {format(new Date(apt.end_time), 'h:mm a')}
                                </span>
                                {apt.appointment_type === 'retroactive' && (
                                  <Badge variant="outline" className="text-xs">Retroactive</Badge>
                                )}
                              </div>
                              {getStaffNames(apt) && (
                                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {getStaffNames(apt)}
                                </p>
                              )}
                            </div>
                            {getStatusBadge(apt.status)}
                          </div>
                        </div>
                      ))}
                      {pastAppointments.length > 20 && (
                        <p className="text-xs text-center text-muted-foreground py-2">
                          Showing 20 of {pastAppointments.length} past appointments
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <AppointmentDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        appointment={editingAppointment}
        students={[{ id: studentId, name: studentName, color: studentColor }]}
        staff={staff}
        onSave={handleSave}
        onDelete={editingAppointment ? () => handleDelete(editingAppointment.id) : undefined}
        defaultStudentId={studentId}
      />

      <SendTelehealthLinkDialog
        open={showSendLink}
        onOpenChange={setShowSendLink}
        studentName={studentName}
        staffName={sendLinkAppointment ? getStaffNames(sendLinkAppointment) || undefined : undefined}
        scheduledTime={sendLinkAppointment?.start_time}
      />
    </>
  );
}
