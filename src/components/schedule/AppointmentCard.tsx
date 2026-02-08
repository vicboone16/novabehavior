import { format, isPast, differenceInMinutes } from 'date-fns';
import { 
  Clock, User, MapPin, FileText, Calendar,
  CheckCircle2, XCircle, AlertTriangle, Link2,
  MoreVertical, Play, Edit2, Video, Send
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { STATUS_COLORS, SERVICE_SETTING_LABELS } from '@/types/scheduling';
import type { Appointment, CalendarStudent, CalendarStaff } from '@/types/schedule';

interface AppointmentCardProps {
  appointment: Appointment;
  students: CalendarStudent[];
  staff: CalendarStaff[];
  isAdmin?: boolean;
  onVerify: () => void;
  onEdit?: () => void;
  onStartSession?: () => void;
  onMarkCanceled?: () => void;
  onMarkNoShow?: () => void;
  onCloseWithoutSession?: () => void;
  onJoinVideo?: () => void;
  onSendTelehealthLink?: () => void;
}

export function AppointmentCard({
  appointment,
  students,
  staff,
  isAdmin = false,
  onVerify,
  onEdit,
  onStartSession,
  onMarkCanceled,
  onMarkNoShow,
  onCloseWithoutSession,
  onJoinVideo,
  onSendTelehealthLink,
}: AppointmentCardProps) {
  const student = students.find(s => s.id === appointment.student_id);
  const staffMember = appointment.staff_user_id 
    ? staff.find(s => s.id === appointment.staff_user_id)
    : null;
  
  const startTime = new Date(appointment.start_time);
  const endTime = new Date(appointment.end_time);
  const now = new Date();
  const isPastAppointment = isPast(endTime);
  const isWithinStartWindow = differenceInMinutes(startTime, now) <= 15 && !isPast(startTime);
  const isTelehealth = !!(appointment as any).is_telehealth;
  const isUpcoming = !isPastAppointment && appointment.status === 'scheduled';
  const needsVerification = isPastAppointment && 
    appointment.status === 'scheduled' && 
    (!appointment.verification_status || appointment.verification_status === 'unverified');

  const status = appointment.status as keyof typeof STATUS_COLORS;
  const statusColor = STATUS_COLORS[status] || STATUS_COLORS.scheduled;

  const getStaffNames = () => {
    const staffIds = appointment.staff_user_ids?.length 
      ? appointment.staff_user_ids 
      : appointment.staff_user_id ? [appointment.staff_user_id] : [];
    
    if (staffIds.length === 0) return 'Unassigned';
    return staffIds.map(id => staff.find(s => s.id === id)?.name || 'Unknown').join(', ');
  };

  return (
    <Card className={cn("relative", needsVerification && "ring-2 ring-amber-500")}>
      {needsVerification && (
        <div className="absolute -top-2 -right-2">
          <Badge variant="destructive" className="text-xs animate-pulse">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Verify
          </Badge>
        </div>
      )}
      
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {student && (
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${student.color}20` }}
              >
                <User className="w-4 h-4" style={{ color: student.color }} />
              </div>
            )}
            <div>
              <CardTitle className="text-base">
                {student?.name || 'Staff Meeting'}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {appointment.title || appointment.appointment_type || 'Session'}
              </p>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isAdmin && onEdit && (
                <DropdownMenuItem onClick={onEdit}>
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              )}
              {onStartSession && isWithinStartWindow && appointment.status === 'scheduled' && (
                <DropdownMenuItem onClick={onStartSession}>
                  <Play className="w-4 h-4 mr-2" />
                  Start Session
                </DropdownMenuItem>
              )}
              {isTelehealth && isUpcoming && onJoinVideo && (
                <DropdownMenuItem onClick={onJoinVideo}>
                  <Video className="w-4 h-4 mr-2" />
                  Join Video
                </DropdownMenuItem>
              )}
              {isTelehealth && isUpcoming && onSendTelehealthLink && (
                <DropdownMenuItem onClick={onSendTelehealthLink}>
                  <Send className="w-4 h-4 mr-2" />
                  Send Link to Participant
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {onMarkCanceled && (
                <DropdownMenuItem onClick={onMarkCanceled}>
                  <XCircle className="w-4 h-4 mr-2" />
                  Mark as Canceled
                </DropdownMenuItem>
              )}
              {onMarkNoShow && (
                <DropdownMenuItem onClick={onMarkNoShow}>
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Mark as No-Show
                </DropdownMenuItem>
              )}
              {isAdmin && onCloseWithoutSession && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onCloseWithoutSession} className="text-muted-foreground">
                    Close Without Session
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Time */}
        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span>
            {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
          </span>
          <span className="text-muted-foreground">({appointment.duration_minutes} min)</span>
        </div>

        {/* Date */}
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span>{format(startTime, 'EEEE, MMMM d, yyyy')}</span>
        </div>

        {/* Staff */}
        <div className="flex items-center gap-2 text-sm">
          <User className="w-4 h-4 text-muted-foreground" />
          <span>{getStaffNames()}</span>
        </div>

        {/* Setting */}
        {(appointment as any).service_setting && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <span>
              {SERVICE_SETTING_LABELS[(appointment as any).service_setting as keyof typeof SERVICE_SETTING_LABELS] || (appointment as any).service_setting}
            </span>
            {(appointment as any).location_detail && (
              <span className="text-muted-foreground">• {(appointment as any).location_detail}</span>
            )}
          </div>
        )}

        {/* Status */}
        <div className="flex items-center gap-2">
          <Badge className={cn("text-xs", statusColor)}>
            {appointment.status === 'scheduled' && 'Scheduled'}
            {appointment.status === 'completed' && 'Completed'}
            {appointment.status === 'canceled' && 'Canceled'}
            {appointment.status === 'rescheduled' && 'Rescheduled'}
            {appointment.status === 'no_show' && 'No Show'}
            {appointment.status === 'did_not_occur' && 'Did Not Occur'}
            {appointment.status === 'pending_verification' && 'Pending Verification'}
          </Badge>
          
          {appointment.linked_session_id && (
            <Badge variant="outline" className="text-xs gap-1">
              <Link2 className="w-3 h-3" />
              Session Linked
            </Badge>
          )}
        </div>

        {/* Notes */}
        {appointment.notes && (
          <div className="text-sm text-muted-foreground border-t pt-2 mt-2">
            <FileText className="w-3 h-3 inline mr-1" />
            {appointment.notes}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 pt-2 border-t">
          {needsVerification || (isPastAppointment && appointment.status === 'scheduled') ? (
            <Button onClick={onVerify} className="flex-1" size="sm">
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Verify
            </Button>
          ) : isWithinStartWindow && appointment.status === 'scheduled' && onStartSession ? (
            <>
              <Button onClick={onStartSession} className="flex-1" size="sm">
                <Play className="w-4 h-4 mr-1" />
                Start Session
              </Button>
              {isTelehealth && onJoinVideo && (
                <Button onClick={onJoinVideo} variant="secondary" size="sm">
                  <Video className="w-4 h-4 mr-1" />
                  Join Video
                </Button>
              )}
            </>
          ) : isTelehealth && isUpcoming && onJoinVideo ? (
            <Button onClick={onJoinVideo} variant="secondary" className="flex-1" size="sm">
              <Video className="w-4 h-4 mr-1" />
              Join Video
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
