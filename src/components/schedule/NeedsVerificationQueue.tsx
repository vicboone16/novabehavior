import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, differenceInDays, isPast } from 'date-fns';
import { 
  AlertTriangle, Clock, User, Filter, RefreshCw,
  CheckCircle2, MapPin, Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { SERVICE_SETTING_LABELS } from '@/types/scheduling';
import { VerificationDialog } from './VerificationDialog';
import type { Appointment, CalendarStudent, CalendarStaff } from '@/types/schedule';

interface NeedsVerificationQueueProps {
  students: CalendarStudent[];
  staff: CalendarStaff[];
  onRefresh: () => void;
}

export function NeedsVerificationQueue({
  students,
  staff,
  onRefresh,
}: NeedsVerificationQueueProps) {
  const navigate = useNavigate();
  const [unverified, setUnverified] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  
  // Filters
  const [filterStaff, setFilterStaff] = useState<string>('all');
  const [filterStudent, setFilterStudent] = useState<string>('all');
  const [filterSetting, setFilterSetting] = useState<string>('all');

  const fetchUnverified = async () => {
    setLoading(true);
    try {
      const now = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .lt('end_time', now)
        .eq('status', 'scheduled')
        .or('verification_status.is.null,verification_status.eq.unverified')
        .order('start_time', { ascending: false });

      if (error) throw error;
      setUnverified((data || []) as Appointment[]);
    } catch (error) {
      console.error('Error fetching unverified:', error);
      toast({ title: 'Error', description: 'Failed to load unverified appointments', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnverified();
  }, []);

  const filteredAppointments = unverified.filter(apt => {
    if (filterStaff !== 'all') {
      const hasStaff = apt.staff_user_id === filterStaff || apt.staff_user_ids?.includes(filterStaff);
      if (!hasStaff) return false;
    }
    if (filterStudent !== 'all' && apt.student_id !== filterStudent) return false;
    if (filterSetting !== 'all' && (apt as any).service_setting !== filterSetting) return false;
    return true;
  });

  const getStudentName = (id?: string | null) => students.find(s => s.id === id)?.name || 'Unknown';
  const getStaffName = (apt: Appointment) => {
    const staffId = apt.staff_user_id || apt.staff_user_ids?.[0];
    return staff.find(s => s.id === staffId)?.name || 'Unassigned';
  };

  const getDaysOverdue = (endTime: string) => {
    return differenceInDays(new Date(), new Date(endTime));
  };

  const handleVerified = () => {
    setSelectedAppointment(null);
    fetchUnverified();
    onRefresh();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Needs Verification
            </CardTitle>
            <CardDescription>
              Past appointments awaiting verification
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchUnverified} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <Filter className="w-4 h-4 text-muted-foreground" />
          
          <Select value={filterStaff} onValueChange={setFilterStaff}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Staff" />
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
              <SelectValue placeholder="Student" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Students</SelectItem>
              {students.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={filterSetting} onValueChange={setFilterSetting}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Setting" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Settings</SelectItem>
              {Object.entries(SERVICE_SETTING_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(filterStaff !== 'all' || filterStudent !== 'all' || filterSetting !== 'all') && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                setFilterStaff('all');
                setFilterStudent('all');
                setFilterSetting('all');
              }}
            >
              Clear
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="flex gap-4 text-sm">
          <Badge variant="outline" className="text-amber-600 border-amber-300">
            {filteredAppointments.length} pending verification
          </Badge>
        </div>

        {/* Table */}
        {filteredAppointments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>All appointments are verified!</p>
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
                  <TableHead>Overdue</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAppointments.map(apt => {
                  const daysOverdue = getDaysOverdue(apt.end_time);
                  return (
                    <TableRow key={apt.id}>
                      <TableCell className="font-medium">
                        {format(new Date(apt.start_time), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>{getStudentName(apt.student_id)}</TableCell>
                      <TableCell>{getStaffName(apt)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(apt.start_time), 'h:mm a')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {SERVICE_SETTING_LABELS[(apt as any).service_setting as keyof typeof SERVICE_SETTING_LABELS] || 'Unknown'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={daysOverdue > 3 ? 'destructive' : 'secondary'} 
                          className="text-xs"
                        >
                          {daysOverdue} day{daysOverdue !== 1 ? 's' : ''}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          size="sm" 
                          onClick={() => setSelectedAppointment(apt)}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Verify
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>

      {/* Verification Dialog */}
      <VerificationDialog
        appointment={selectedAppointment}
        open={!!selectedAppointment}
        onOpenChange={(open) => !open && setSelectedAppointment(null)}
        studentName={getStudentName(selectedAppointment?.student_id)}
        staffName={selectedAppointment ? getStaffName(selectedAppointment) : undefined}
        onVerified={handleVerified}
        onCreateNote={(sessionId, appointmentId) => {
          const studentId = selectedAppointment?.student_id;
          if (studentId) {
            navigate(`/students/${studentId}?tab=notes&sessionId=${sessionId}&appointmentId=${appointmentId}`);
          }
        }}
      />
    </Card>
  );
}
