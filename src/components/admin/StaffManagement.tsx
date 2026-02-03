import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { 
  Search, Plus, Filter, Grid3X3, List, ChevronLeft, Users, User,
  Calendar, Loader2, ArrowLeft
} from 'lucide-react';
import { StaffCard, StaffMember } from './StaffCard';
import { cn } from '@/lib/utils';

type ViewMode = 'grid' | 'list' | 'calendar';
type StaffFilter = 'all' | 'bcba' | 'rbt' | 'admin';

interface StaffManagementProps {
  onNavigateToSchedule?: (userId: string) => void;
}

export function StaffManagement({ onNavigateToSchedule }: StaffManagementProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [students, setStudents] = useState<{ id: string; name: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filter, setFilter] = useState<StaffFilter>('all');
  
  // Drill-down state
  const [selectedSupervisor, setSelectedSupervisor] = useState<StaffMember | null>(null);
  const [selectedClinician, setSelectedClinician] = useState<StaffMember | null>(null);
  
  // Dialog states
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [showStaffDetails, setShowStaffDetails] = useState<StaffMember | null>(null);
  
  // New staff form
  const [newStaffForm, setNewStaffForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    pin: '',
    phone: '',
    credential: '',
    npi: '',
    title: 'Clinician',
    supervisor_id: '',
    role: 'staff',
    sendEmail: false,
  });
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load all staff with their roles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          user_id, display_name, first_name, last_name, email, phone,
          credential, npi, title, status, supervisor_id, avatar_url
        `)
        .eq('is_approved', true);

      if (profilesError) throw profilesError;

      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role');

      // Get patient counts for each clinician
      const { data: caseloads } = await supabase
        .from('staff_caseloads')
        .select('clinician_user_id, student_id')
        .eq('status', 'active');

      // Fetch staff credentials for NPI and certification info
      const { data: credentials } = await supabase
        .from('staff_credentials')
        .select('user_id, credential_type, credential_number, is_verified')
        .in('credential_type', ['NPI', 'BCBA', 'BCBA-D', 'BCaBA', 'RBT', 'QBA', 'State License']);

      // Build staff list with counts
      const staffWithCounts: StaffMember[] = (profiles || []).map(p => {
        const userRoles = roles?.filter(r => r.user_id === p.user_id).map(r => r.role) || [];
        const patientCount = caseloads?.filter(c => c.clinician_user_id === p.user_id).length || 0;
        const clinicianCount = profiles?.filter(pr => pr.supervisor_id === p.user_id).length || 0;
        const supervisor = profiles?.find(pr => pr.user_id === p.supervisor_id);

        // Get NPI from credentials table if not in profile
        const userCredentials = credentials?.filter(c => c.user_id === p.user_id) || [];
        const npiCredential = userCredentials.find(c => c.credential_type === 'NPI');
        const certCredential = userCredentials.find(c => 
          ['BCBA', 'BCBA-D', 'BCaBA', 'RBT', 'QBA'].includes(c.credential_type)
        );

        return {
          id: p.user_id,
          user_id: p.user_id,
          display_name: p.display_name,
          first_name: p.first_name,
          last_name: p.last_name,
          email: p.email,
          phone: p.phone,
          // Prefer profile credential, fall back to credentials table
          credential: p.credential || certCredential?.credential_type || null,
          // Prefer profile NPI, fall back to credentials table
          npi: p.npi || npiCredential?.credential_number || null,
          title: p.title,
          status: p.status || 'active',
          supervisor_id: p.supervisor_id,
          supervisor_name: supervisor?.display_name || 
            (supervisor?.first_name && supervisor?.last_name 
              ? `${supervisor.first_name} ${supervisor.last_name}` 
              : null),
          avatar_url: p.avatar_url,
          patient_count: patientCount,
          clinician_count: clinicianCount,
          roles: userRoles,
        };
      });

      setStaff(staffWithCounts);

      // Load students
      const { data: studentsData } = await supabase
        .from('students')
        .select('id, name')
        .eq('is_archived', false)
        .order('name');
      
      setStudents(studentsData || []);
    } catch (error: any) {
      toast({ title: 'Failed to load staff', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Get supervisors (admins with clinicians under them)
  const supervisors = useMemo(() => 
    staff.filter(s => s.roles.includes('admin') || s.clinician_count! > 0),
    [staff]
  );

  // Get clinicians under selected supervisor
  const cliniciansUnderSupervisor = useMemo(() => {
    if (!selectedSupervisor) return [];
    return staff.filter(s => s.supervisor_id === selectedSupervisor.user_id);
  }, [staff, selectedSupervisor]);

  // Get patients/students assigned to selected clinician
  const patientsUnderClinician = useMemo(() => {
    // This would need caseload data to show actual patients
    return students.slice(0, selectedClinician?.patient_count || 0);
  }, [students, selectedClinician]);

  // Filter staff based on search and filter
  const filteredStaff = useMemo(() => {
    let result = staff;

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(s => 
        s.display_name?.toLowerCase().includes(query) ||
        s.first_name?.toLowerCase().includes(query) ||
        s.last_name?.toLowerCase().includes(query) ||
        s.email?.toLowerCase().includes(query) ||
        s.credential?.toLowerCase().includes(query)
      );
    }

    // Apply filter
    switch (filter) {
      case 'bcba':
        result = result.filter(s => s.credential?.toUpperCase().includes('BCBA'));
        break;
      case 'rbt':
        result = result.filter(s => s.credential?.toUpperCase().includes('RBT'));
        break;
      case 'admin':
        result = result.filter(s => s.roles.includes('admin') || s.roles.includes('super_admin'));
        break;
    }

    return result;
  }, [staff, searchQuery, filter]);

  const handleViewDetails = (member: StaffMember) => {
    if (member.clinician_count && member.clinician_count > 0) {
      setSelectedSupervisor(member);
      setSelectedClinician(null);
    } else {
      setShowStaffDetails(member);
    }
  };

  const handleViewPatients = (member: StaffMember) => {
    setSelectedClinician(member);
  };

  const handleBack = () => {
    if (selectedClinician) {
      setSelectedClinician(null);
    } else if (selectedSupervisor) {
      setSelectedSupervisor(null);
    }
  };

  const handleAddStaff = async () => {
    if (!newStaffForm.email || !newStaffForm.password || !newStaffForm.first_name || !newStaffForm.last_name) {
      toast({ title: 'Missing required fields', description: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }

    if (newStaffForm.password.length < 6) {
      toast({ title: 'Password too short', description: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }

    if (newStaffForm.pin && !/^\d{6}$/.test(newStaffForm.pin)) {
      toast({ title: 'Invalid PIN', description: 'PIN must be exactly 6 digits', variant: 'destructive' });
      return;
    }

    setIsCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-staff', {
        body: {
          email: newStaffForm.email,
          password: newStaffForm.password,
          pin: newStaffForm.pin || undefined,
          first_name: newStaffForm.first_name,
          last_name: newStaffForm.last_name,
          phone: newStaffForm.phone,
          credential: newStaffForm.credential,
          npi: newStaffForm.npi,
          supervisor_id: newStaffForm.supervisor_id,
          title: newStaffForm.title,
          role: newStaffForm.role,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({ 
        title: 'Staff member created', 
        description: `${data.display_name} has been created successfully${newStaffForm.sendEmail ? '. Login email will be sent.' : '.'}` 
      });

      // TODO: If sendEmail is true, trigger email sending

      setShowAddStaff(false);
      setNewStaffForm({
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        pin: '',
        phone: '',
        credential: '',
        npi: '',
        title: 'Clinician',
        supervisor_id: '',
        role: 'staff',
        sendEmail: false,
      });
      
      // Reload staff list
      loadData();
    } catch (error: any) {
      toast({ title: 'Failed to create staff', description: error.message, variant: 'destructive' });
    } finally {
      setIsCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Render breadcrumb header based on drill-down state
  const renderHeader = () => {
    if (selectedClinician) {
      return (
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Avatar className="h-12 w-12">
            <AvatarImage src={selectedClinician.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {selectedClinician.first_name?.[0]}{selectedClinician.last_name?.[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-xl font-bold">
              {selectedClinician.first_name} {selectedClinician.last_name}
            </h2>
            <p className="text-sm text-muted-foreground">
              {selectedClinician.credential || selectedClinician.title} • 
              Patients: <span className="text-primary font-medium">{selectedClinician.patient_count}</span>
            </p>
          </div>
        </div>
      );
    }

    if (selectedSupervisor) {
      return (
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Avatar className="h-12 w-12">
            <AvatarImage src={selectedSupervisor.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {selectedSupervisor.first_name?.[0]}{selectedSupervisor.last_name?.[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-xl font-bold">
              {selectedSupervisor.first_name} {selectedSupervisor.last_name}
            </h2>
            <p className="text-sm text-muted-foreground">
              {selectedSupervisor.title || 'Administrator'} • 
              <span className="text-primary font-medium ml-1">
                Clinicians: {selectedSupervisor.clinician_count}
              </span>
              <span className="mx-2">|</span>
              Patients: {selectedSupervisor.patient_count}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Staff Management</h2>
          <p className="text-sm text-muted-foreground">
            {staff.length} staff members
          </p>
        </div>
        <Button onClick={() => setShowAddStaff(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add New Clinician
        </Button>
      </div>
    );
  };

  // Render content based on drill-down state
  const renderContent = () => {
    // Showing patients under clinician
    if (selectedClinician) {
      return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            All patients assigned to {selectedClinician.first_name} {selectedClinician.last_name}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {patientsUnderClinician.length === 0 ? (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                No patients assigned to this clinician
              </div>
            ) : (
              patientsUnderClinician.map(patient => (
                <div 
                  key={patient.id}
                  className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-secondary text-secondary-foreground">
                        {patient.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{patient.name}</p>
                      <p className="text-xs text-muted-foreground">Patient</p>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full mt-3" size="sm">
                    View Details
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      );
    }

    // Showing clinicians under supervisor
    if (selectedSupervisor) {
      return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            All clinicians supervised by {selectedSupervisor.first_name} {selectedSupervisor.last_name}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {cliniciansUnderSupervisor.length === 0 ? (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                No clinicians under this supervisor
              </div>
            ) : (
              cliniciansUnderSupervisor.map(clinician => (
                <StaffCard
                  key={clinician.id}
                  staff={clinician}
                  onViewDetails={handleViewDetails}
                  onViewPatients={handleViewPatients}
                  onViewSchedule={onNavigateToSchedule ? () => onNavigateToSchedule(clinician.user_id) : undefined}
                  showPatientCount
                />
              ))
            )}
          </div>
        </div>
      );
    }

    // Default: show all staff or supervisors
    return (
      <div className="space-y-4">
        {/* Search and filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search clinicians..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Tabs value={filter} onValueChange={(v) => setFilter(v as StaffFilter)}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="bcba">BCBAs</TabsTrigger>
              <TabsTrigger value="rbt">RBTs</TabsTrigger>
              <TabsTrigger value="admin">Admins</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center border rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'calendar' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('calendar')}
            >
              <Calendar className="w-4 h-4" />
            </Button>
          </div>

          <Select>
            <SelectTrigger className="w-[140px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="all">All Status</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Staff grid */}
        <div className={cn(
          "grid gap-4",
          viewMode === 'grid' 
            ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" 
            : "grid-cols-1"
        )}>
          {filteredStaff.map(member => (
            <StaffCard
              key={member.id}
              staff={member}
              onViewDetails={handleViewDetails}
              onViewPatients={member.patient_count > 0 ? handleViewPatients : undefined}
              onViewSchedule={onNavigateToSchedule ? () => onNavigateToSchedule(member.user_id) : undefined}
              showPatientCount
              showClinicianCount={member.clinician_count! > 0}
            />
          ))}
        </div>

        {filteredStaff.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No staff members found
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {renderHeader()}
      {renderContent()}

      {/* Add Staff Dialog */}
      <Dialog open={showAddStaff} onOpenChange={setShowAddStaff}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Staff Member</DialogTitle>
            <DialogDescription>
              Create a new staff account with login credentials.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name *</Label>
                <Input
                  value={newStaffForm.first_name}
                  onChange={(e) => setNewStaffForm(f => ({ ...f, first_name: e.target.value }))}
                  placeholder="First name"
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name *</Label>
                <Input
                  value={newStaffForm.last_name}
                  onChange={(e) => setNewStaffForm(f => ({ ...f, last_name: e.target.value }))}
                  placeholder="Last name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Email Address *</Label>
              <Input
                type="email"
                value={newStaffForm.email}
                onChange={(e) => setNewStaffForm(f => ({ ...f, email: e.target.value }))}
                placeholder="email@example.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Password *</Label>
                <Input
                  type="password"
                  value={newStaffForm.password}
                  onChange={(e) => setNewStaffForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Min 6 characters"
                />
              </div>
              <div className="space-y-2">
                <Label>PIN (6 digits)</Label>
                <Input
                  type="text"
                  maxLength={6}
                  value={newStaffForm.pin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setNewStaffForm(f => ({ ...f, pin: val }));
                  }}
                  placeholder="Optional PIN"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input
                value={newStaffForm.phone}
                onChange={(e) => setNewStaffForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="(555) 555-5555"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Credential</Label>
                <Select 
                  value={newStaffForm.credential}
                  onValueChange={(v) => setNewStaffForm(f => ({ ...f, credential: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BCBA">BCBA</SelectItem>
                    <SelectItem value="BCaBA">BCaBA</SelectItem>
                    <SelectItem value="RBT">RBT</SelectItem>
                    <SelectItem value="BCBA-D">BCBA-D</SelectItem>
                    <SelectItem value="QBA">QBA</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>NPI (Optional)</Label>
                <Input
                  value={newStaffForm.npi}
                  onChange={(e) => setNewStaffForm(f => ({ ...f, npi: e.target.value }))}
                  placeholder="NPI number"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select 
                  value={newStaffForm.role}
                  onValueChange={(v) => setNewStaffForm(f => ({ ...f, role: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Supervisor</Label>
                <Select 
                  value={newStaffForm.supervisor_id}
                  onValueChange={(v) => setNewStaffForm(f => ({ ...f, supervisor_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {supervisors.map(s => (
                      <SelectItem key={s.id} value={s.user_id}>
                        {s.first_name} {s.last_name} ({s.credential || s.title})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2 border-t">
              <input
                type="checkbox"
                id="sendEmail"
                checked={newStaffForm.sendEmail}
                onChange={(e) => setNewStaffForm(f => ({ ...f, sendEmail: e.target.checked }))}
                className="rounded border-border"
              />
              <Label htmlFor="sendEmail" className="text-sm font-normal cursor-pointer">
                Send login credentials via email
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddStaff(false)} disabled={isCreating}>
              Cancel
            </Button>
            <Button onClick={handleAddStaff} disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Staff Member'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Staff Details Dialog */}
      <Dialog open={!!showStaffDetails} onOpenChange={() => setShowStaffDetails(null)}>
        <DialogContent className="max-w-lg">
          {showStaffDetails && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={showStaffDetails.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xl">
                      {showStaffDetails.first_name?.[0]}{showStaffDetails.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <DialogTitle className="text-xl">
                      {showStaffDetails.first_name} {showStaffDetails.last_name}
                    </DialogTitle>
                    <p className="text-muted-foreground">
                      {showStaffDetails.credential || showStaffDetails.title}
                    </p>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Email</p>
                    <p className="font-medium">{showStaffDetails.email || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Phone</p>
                    <p className="font-medium">{showStaffDetails.phone || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">NPI</p>
                    <p className="font-medium">{showStaffDetails.npi || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Supervisor</p>
                    <p className="font-medium text-primary">
                      {showStaffDetails.supervisor_name || 'None assigned'}
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 pt-4 border-t">
                  <div className="flex-1 text-center p-3 rounded-lg bg-primary/5">
                    <p className="text-2xl font-bold text-primary">{showStaffDetails.patient_count}</p>
                    <p className="text-xs text-muted-foreground">Active Patients</p>
                  </div>
                  {showStaffDetails.clinician_count! > 0 && (
                    <div className="flex-1 text-center p-3 rounded-lg bg-secondary">
                      <p className="text-2xl font-bold">{showStaffDetails.clinician_count}</p>
                      <p className="text-xs text-muted-foreground">Clinicians</p>
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowStaffDetails(null)}>
                  Close
                </Button>
                {onNavigateToSchedule && (
                  <Button onClick={() => {
                    onNavigateToSchedule(showStaffDetails.user_id);
                    setShowStaffDetails(null);
                  }}>
                    <Calendar className="w-4 h-4 mr-2" />
                    View Schedule
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
