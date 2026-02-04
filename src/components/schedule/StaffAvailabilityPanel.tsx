import { useState, useEffect, useMemo } from 'react';
import { format, parseISO, isSameDay, startOfWeek, addDays } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Users, ChevronDown, ChevronUp, Clock, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface StaffAvailability {
  id: string;
  staff_user_id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
  notes: string | null;
}

interface StaffMember {
  user_id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  credential: string | null;
}

interface StaffAvailabilityPanelProps {
  currentDate: Date;
  viewType: 'day' | 'week';
}

const DAYS_OF_WEEK = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAY_LABELS: Record<string, string> = {
  sunday: 'Sun',
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
};

export function StaffAvailabilityPanel({ currentDate, viewType }: StaffAvailabilityPanelProps) {
  const [open, setOpen] = useState(true);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [availability, setAvailability] = useState<StaffAvailability[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [staffRes, availRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('user_id, display_name, first_name, last_name, credential')
          .eq('is_approved', true)
          .eq('employment_status', 'active'),
        supabase
          .from('staff_availability')
          .select('*')
          .eq('is_active', true),
      ]);

      if (staffRes.data) setStaff(staffRes.data);
      if (availRes.data) setAvailability(availRes.data as StaffAvailability[]);
    } catch (error) {
      console.error('Error loading availability:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get relevant days based on view type
  const relevantDays = useMemo(() => {
    if (viewType === 'day') {
      return [DAYS_OF_WEEK[currentDate.getDay()]];
    }
    // Week view - show all 7 days starting from week start
    return DAYS_OF_WEEK;
  }, [currentDate, viewType]);

  // Group availability by staff
  const staffWithAvailability = useMemo(() => {
    return staff.map(s => {
      const staffAvail = availability.filter(a => a.staff_user_id === s.user_id);
      const availByDay: Record<string, StaffAvailability[]> = {};
      
      relevantDays.forEach(day => {
        availByDay[day] = staffAvail.filter(a => a.day_of_week === day);
      });

      const hasAnyAvailability = relevantDays.some(day => availByDay[day].length > 0);
      const name = s.display_name || `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Unknown';

      return {
        ...s,
        name,
        availByDay,
        hasAnyAvailability,
      };
    }).sort((a, b) => {
      // Sort by availability first, then by name
      if (a.hasAnyAvailability && !b.hasAnyAvailability) return -1;
      if (!a.hasAnyAvailability && b.hasAnyAvailability) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [staff, availability, relevantDays]);

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="mb-4">
        <CollapsibleTrigger asChild>
          <CardHeader className="py-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4" />
                Staff Availability
                <Badge variant="outline" className="ml-2">{staff.length} staff</Badge>
              </CardTitle>
              {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
            ) : (
              <ScrollArea className="max-h-[300px]">
                <div className="space-y-2">
                  {/* Day headers for week view */}
                  {viewType === 'week' && (
                    <div className="grid grid-cols-8 gap-1 text-xs font-medium text-muted-foreground border-b pb-2 mb-2">
                      <div>Staff</div>
                      {relevantDays.map(day => (
                        <div key={day} className="text-center">{DAY_LABELS[day]}</div>
                      ))}
                    </div>
                  )}

                  {staffWithAvailability.map(staffMember => (
                    <div 
                      key={staffMember.user_id} 
                      className={cn(
                        "grid gap-1 py-1.5 px-2 rounded-md text-sm",
                        viewType === 'week' ? 'grid-cols-8' : 'flex items-center justify-between',
                        staffMember.hasAnyAvailability ? 'bg-muted/30' : 'bg-muted/10 opacity-60'
                      )}
                    >
                      {/* Staff name */}
                      <div className="flex items-center gap-1.5 truncate">
                        {staffMember.hasAnyAvailability ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        )}
                        <span className="truncate font-medium">{staffMember.name}</span>
                        {staffMember.credential && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                            {staffMember.credential}
                          </Badge>
                        )}
                      </div>

                      {/* Availability per day */}
                      {viewType === 'week' ? (
                        relevantDays.map(day => {
                          const dayAvail = staffMember.availByDay[day] || [];
                          return (
                            <div key={day} className="text-center">
                              {dayAvail.length > 0 ? (
                                <div className="flex flex-col items-center gap-0.5">
                              {dayAvail.slice(0, 2).map((a, i) => (
                                    <span key={i} className="text-[10px] text-primary">
                                      {formatTime(a.start_time).replace(' ', '').toLowerCase()}
                                    </span>
                                  ))}
                                  {dayAvail.length > 2 && (
                                    <span className="text-[10px] text-muted-foreground">+{dayAvail.length - 2}</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div className="flex items-center gap-2">
                          {staffMember.availByDay[relevantDays[0]]?.map((a, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              {formatTime(a.start_time)} - {formatTime(a.end_time)}
                            </Badge>
                          ))}
                          {(!staffMember.availByDay[relevantDays[0]] || staffMember.availByDay[relevantDays[0]].length === 0) && (
                            <span className="text-xs text-muted-foreground">Not available</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  {staff.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No active staff members
                    </p>
                  )}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
