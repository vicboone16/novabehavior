import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Slider } from '@/components/ui/slider';
import { 
  Calendar, Clock, MapPin, User, Users, AlertTriangle, CheckCircle, 
  Loader2, Search, Plus, X
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { SERVICE_TYPES, SETTINGS_OPTIONS, DAYS_OF_WEEK } from '@/types/staffProfile';

interface SchedulingEngineProps {
  clientId?: string;
  /** Optional callback when staff is selected - used when embedded in dialogs */
  onStaffSelected?: (staffId: string) => void;
}

interface StaffSuggestion {
  userId: string;
  name: string;
  credential: string;
  distance: number;
  travelTime: number;
  languages: string[];
  matchScore: number;
  warnings: string[];
  blocked: boolean;
  blockReason?: string;
}

interface ScheduleFormData {
  client_id: string;
  service_type: string;
  location_id: string;
  requested_day: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  frequency: 'one_time' | 'weekly' | 'biweekly' | 'monthly';
  preferred_staff_ids: string[];
  constraints: {
    language_required?: string;
    gender_preference?: string;
  };
  notes: string;
}

export function SchedulingEngine({ clientId, onStaffSelected }: SchedulingEngineProps) {
  const [clients, setClients] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [staffSuggestions, setStaffSuggestions] = useState<StaffSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchingStaff, setSearchingStaff] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const [formData, setFormData] = useState<ScheduleFormData>({
    client_id: clientId || '',
    service_type: '',
    location_id: '',
    requested_day: '',
    start_time: '09:00',
    end_time: '10:00',
    duration_minutes: 60,
    frequency: 'one_time',
    preferred_staff_ids: [],
    constraints: {},
    notes: '',
  });

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    if (formData.client_id) {
      loadClientLocations(formData.client_id);
    }
  }, [formData.client_id]);

  const loadClients = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const loadClientLocations = async (clientId: string) => {
    try {
      const { data, error } = await supabase
        .from('client_locations')
        .select('*')
        .eq('client_id', clientId)
        .eq('is_active', true);

      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  };

  const searchAvailableStaff = async () => {
    if (!formData.client_id || !formData.service_type || !formData.requested_day) {
      toast.error('Please select client, service type, and day');
      return;
    }

    setSearchingStaff(true);
    try {
      // Get all active staff
      const { data: staffProfiles, error: staffError } = await supabase
        .from('profiles')
        .select('*')
        .eq('employment_status', 'active');

      if (staffError) throw staffError;

      // Get client location for distance calculation
      const selectedLocation = locations.find(l => l.id === formData.location_id);

      // Get availability for requested day
      const { data: availability, error: availError } = await supabase
        .from('staff_availability')
        .select('*')
        .eq('day_of_week', formData.requested_day.toLowerCase())
        .eq('is_active', true);

      if (availError) throw availError;

      // Get team assignments for this client
      const { data: assignments, error: assignError } = await supabase
        .from('client_team_assignments')
        .select('staff_user_id')
        .eq('client_id', formData.client_id)
        .eq('is_active', true);

      if (assignError) throw assignError;

      const assignedStaffIds = new Set(assignments?.map(a => a.staff_user_id) || []);

      // Build suggestions
      const suggestions: StaffSuggestion[] = [];

      for (const staff of staffProfiles || []) {
        const warnings: string[] = [];
        let blocked = false;
        let blockReason = '';

        // Check if staff is assigned to client
        if (!assignedStaffIds.has(staff.user_id)) {
          warnings.push('Not on client roster');
        }

        // Check service type eligibility
        const allowedServices = Array.isArray(staff.allowed_service_types) 
          ? staff.allowed_service_types as string[]
          : [];
        if (!allowedServices.includes(formData.service_type)) {
          warnings.push('Service type not in capabilities');
        }

        // Check setting eligibility
        if (selectedLocation) {
          const allowedSettings = Array.isArray(staff.settings_willing_to_serve)
            ? staff.settings_willing_to_serve as string[]
            : [];
          if (!allowedSettings.includes(selectedLocation.location_type)) {
            warnings.push('Setting not in preferences');
          }
        }

        // Check availability
        const staffAvail = availability?.filter(a => a.staff_user_id === staff.user_id) || [];
        const hasAvailability = staffAvail.some(a => 
          a.start_time <= formData.start_time && a.end_time >= formData.end_time
        );
        if (!hasAvailability) {
          blocked = true;
          blockReason = 'No availability for requested time';
        }

        // Calculate distance
        let distance = 0;
        let travelTime = 0;
        if (selectedLocation && staff.geocode_lat && staff.geocode_lng && 
            selectedLocation.geocode_lat && selectedLocation.geocode_lng) {
          // Haversine formula
          const R = 3959; // Earth radius in miles
          const lat1 = staff.geocode_lat * Math.PI / 180;
          const lat2 = selectedLocation.geocode_lat * Math.PI / 180;
          const dLat = (selectedLocation.geocode_lat - staff.geocode_lat) * Math.PI / 180;
          const dLon = (selectedLocation.geocode_lng - staff.geocode_lng) * Math.PI / 180;
          const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon/2) * Math.sin(dLon/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          distance = Math.round(R * c * 100) / 100;
          travelTime = Math.ceil(distance * 3); // ~3 min/mile

          // Check travel radius
          const maxRadius = staff.max_travel_radius_miles || 15;
          if (distance > maxRadius) {
            warnings.push(`Exceeds travel radius (${maxRadius} mi)`);
          }
        }

        // Check language requirements
        if (formData.constraints.language_required) {
          const languages = Array.isArray(staff.languages_spoken)
            ? staff.languages_spoken as string[]
            : [];
          if (!languages.includes(formData.constraints.language_required)) {
            warnings.push(`Does not speak ${formData.constraints.language_required}`);
          }
        }

        // Check supervisor chain for RBT/BT
        if (staff.credential === 'RBT' || staff.credential === 'BT') {
          const { data: supervisorLink } = await supabase
            .from('supervisor_links')
            .select('id')
            .eq('supervisee_staff_id', staff.user_id)
            .eq('status', 'active')
            .limit(1);

          if (!supervisorLink || supervisorLink.length === 0) {
            blocked = true;
            blockReason = 'Missing supervisor chain';
          }
        }

        // Calculate match score
        let matchScore = 100;
        matchScore -= warnings.length * 15;
        matchScore -= distance * 2;
        if (blocked) matchScore = 0;

        suggestions.push({
          userId: staff.user_id,
          name: staff.display_name || `${staff.first_name || ''} ${staff.last_name || ''}`.trim() || 'Unknown',
          credential: staff.credential || '',
          distance,
          travelTime,
          languages: Array.isArray(staff.languages_spoken) ? staff.languages_spoken as string[] : [],
          matchScore: Math.max(0, matchScore),
          warnings,
          blocked,
          blockReason,
        });
      }

      // Sort by match score descending
      suggestions.sort((a, b) => b.matchScore - a.matchScore);
      setStaffSuggestions(suggestions);

    } catch (error) {
      console.error('Error searching staff:', error);
      toast.error('Failed to search available staff');
    } finally {
      setSearchingStaff(false);
    }
  };

  const handleCreateRequest = async () => {
    if (!formData.client_id || !formData.service_type) {
      toast.error('Please fill in required fields');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.from('schedule_requests').insert({
        client_id: formData.client_id,
        service_type: formData.service_type,
        location_id: formData.location_id || null,
        requested_day: formData.requested_day || null,
        requested_start_time: formData.start_time || null,
        requested_end_time: formData.end_time || null,
        frequency: formData.frequency,
        duration_minutes: formData.duration_minutes,
        preferred_staff_ids: formData.preferred_staff_ids,
        constraints: formData.constraints,
        notes: formData.notes || null,
        status: 'pending',
        created_by: user?.id || '',
      });

      if (error) throw error;

      toast.success('Schedule request created');
      setDialogOpen(false);
      setFormData({
        client_id: clientId || '',
        service_type: '',
        location_id: '',
        requested_day: '',
        start_time: '09:00',
        end_time: '10:00',
        duration_minutes: 60,
        frequency: 'one_time',
        preferred_staff_ids: [],
        constraints: {},
        notes: '',
      });
      setStaffSuggestions([]);
    } catch (error) {
      console.error('Error creating schedule request:', error);
      toast.error('Failed to create schedule request');
    } finally {
      setLoading(false);
    }
  };

  const selectStaff = (userId: string) => {
    // If onStaffSelected callback is provided, call it and return (used in dialog mode)
    if (onStaffSelected) {
      onStaffSelected(userId);
      return;
    }
    
    // Otherwise, toggle selection in form data
    setFormData(prev => ({
      ...prev,
      preferred_staff_ids: prev.preferred_staff_ids.includes(userId)
        ? prev.preferred_staff_ids.filter(id => id !== userId)
        : [...prev.preferred_staff_ids, userId]
    }));
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Scheduling Engine
          </CardTitle>
          <CardDescription>
            Create schedule requests with constraint-aware staff matching
          </CardDescription>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Schedule Request
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Schedule Request</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6 pt-4">
              {/* Client & Service */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Client *</Label>
                  <Select
                    value={formData.client_id}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, client_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map(client => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Service Type *</Label>
                  <Select
                    value={formData.service_type}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, service_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select service" />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICE_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Location */}
              <div>
                <Label>Location</Label>
                <Select
                  value={formData.location_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, location_id: value }))}
                  disabled={!formData.client_id}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map(loc => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.location_name} ({loc.location_type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Day & Time */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Day</Label>
                  <Select
                    value={formData.requested_day}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, requested_day: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select day" />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS_OF_WEEK.map(day => (
                        <SelectItem key={day.value} value={day.value}>
                          {day.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Start Time</Label>
                  <Input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>End Time</Label>
                  <Input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                  />
                </div>
              </div>

              {/* Frequency & Duration */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Frequency</Label>
                  <Select
                    value={formData.frequency}
                    onValueChange={(value: any) => setFormData(prev => ({ ...prev, frequency: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="one_time">One-time</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="biweekly">Bi-weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Duration (minutes)</Label>
                  <Input
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      duration_minutes: parseInt(e.target.value) || 60 
                    }))}
                    min={15}
                    step={15}
                  />
                </div>
              </div>

              {/* Search Staff Button */}
              <Button 
                variant="outline" 
                onClick={searchAvailableStaff}
                disabled={searchingStaff}
                className="w-full"
              >
                {searchingStaff ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Find Available Staff
                  </>
                )}
              </Button>

              {/* Staff Suggestions */}
              {staffSuggestions.length > 0 && (
                <div className="border rounded-lg p-4 space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Staff Suggestions
                  </h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {staffSuggestions.map(staff => (
                      <div
                        key={staff.userId}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          formData.preferred_staff_ids.includes(staff.userId)
                            ? 'border-primary bg-primary/5'
                            : staff.blocked
                              ? 'border-destructive/30 bg-destructive/5 opacity-60'
                              : 'hover:border-primary/50'
                        }`}
                        onClick={() => !staff.blocked && selectStaff(staff.userId)}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{staff.name}</span>
                              <Badge variant="outline">{staff.credential}</Badge>
                              {formData.preferred_staff_ids.includes(staff.userId) && (
                                <Badge variant="default">Selected</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {staff.distance} mi
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                ~{staff.travelTime} min
                              </span>
                            </div>
                          </div>
                          <div className={`text-lg font-bold ${
                            staff.matchScore >= 70 ? 'text-green-600' :
                            staff.matchScore >= 40 ? 'text-amber-600' : 'text-red-600'
                          }`}>
                            {staff.matchScore}%
                          </div>
                        </div>
                        
                        {staff.blocked && (
                          <Alert variant="destructive" className="mt-2 py-2">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>{staff.blockReason}</AlertDescription>
                          </Alert>
                        )}
                        
                        {staff.warnings.length > 0 && !staff.blocked && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {staff.warnings.map((warning, i) => (
                              <Badge key={i} variant="outline" className="text-amber-600 border-amber-300">
                                {warning}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional scheduling notes..."
                  rows={2}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateRequest} disabled={loading}>
                  {loading ? 'Creating...' : 'Create Request'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
    </Card>
  );
}
