import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Users, UserPlus, Link2, Unlink, Trash2, Building2, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import type { SupervisorLink } from '@/types/staffProfile';

interface StaffAssignmentsTabProps {
  userId: string;
  caseloadCount: number;
  supervisorLinks: SupervisorLink[];
  superviseeLinks: SupervisorLink[];
  refetch: () => void;
}

interface CaseloadAssignment {
  id: string;
  student_id: string;
  status: string;
  role: string;
  start_date: string;
  source: 'caseload' | 'team';
  student?: {
    name: string;
  };
}

interface AgencyAssignment {
  id: string;
  agency_id: string;
  agency_name: string;
  role: string;
  status: string;
}

export function StaffAssignmentsTab({ 
  userId, 
  caseloadCount, 
  supervisorLinks, 
  superviseeLinks,
  refetch 
}: StaffAssignmentsTabProps) {
  const [caseload, setCaseload] = useState<CaseloadAssignment[]>([]);
  const [agencies, setAgencies] = useState<AgencyAssignment[]>([]);
  const [availableStaff, setAvailableStaff] = useState<any[]>([]);
  const [availableClients, setAvailableClients] = useState<{ id: string; name: string }[]>([]);
  const [availableAgencies, setAvailableAgencies] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [assignClientOpen, setAssignClientOpen] = useState(false);
  const [assignAgencyOpen, setAssignAgencyOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedAgencyId, setSelectedAgencyId] = useState('');
  const [selectedRole, setSelectedRole] = useState('clinician');
  const [linkForm, setLinkForm] = useState({
    supervisor_staff_id: '',
    supervision_type: 'primary',
    start_date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadCaseload();
    loadAvailableStaff();
    loadAvailableClients();
    loadAgencies();
    loadAvailableAgencies();
  }, [userId]);

  const loadCaseload = async () => {
    try {
      const [caseloadRes, teamRes] = await Promise.all([
        supabase
          .from('staff_caseloads')
          .select(`id, student_id, status, start_date, students:student_id (name)`)
          .eq('clinician_user_id', userId)
          .eq('status', 'active'),
        supabase
          .from('client_team_assignments')
          .select(`id, client_id, role, start_date, is_active`)
          .eq('staff_user_id', userId)
          .eq('is_active', true)
      ]);

      const teamClientIds = [...new Set((teamRes.data || []).map((t: any) => t.client_id))];
      let clientNameMap = new Map<string, string>();
      
      if (teamClientIds.length > 0) {
        const { data: students } = await supabase
          .from('students')
          .select('id, name')
          .in('id', teamClientIds);
        clientNameMap = new Map((students || []).map(s => [s.id, s.name]));
      }

      const seenIds = new Set<string>();
      const combined: CaseloadAssignment[] = [];
      
      (caseloadRes.data || []).forEach((d: any) => {
        if (!seenIds.has(d.student_id)) {
          seenIds.add(d.student_id);
          combined.push({
            id: d.id, student_id: d.student_id, status: d.status,
            role: 'clinician', start_date: d.start_date, source: 'caseload',
            student: d.students
          });
        }
      });
      
      (teamRes.data || []).forEach((t: any) => {
        if (!seenIds.has(t.client_id)) {
          seenIds.add(t.client_id);
          combined.push({
            id: t.id, student_id: t.client_id, status: 'active',
            role: t.role, start_date: t.start_date, source: 'team',
            student: { name: clientNameMap.get(t.client_id) || 'Unknown' }
          });
        }
      });
      
      setCaseload(combined);
    } catch (error) {
      console.error('Error loading caseload:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableStaff = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('user_id, display_name, first_name, last_name, credential')
        .or(`credential.in.(BCBA,BCaBA),user_id.eq.${userId}`);
      const uniqueStaff = data?.filter((staff, index, self) => 
        index === self.findIndex(s => s.user_id === staff.user_id)
      ) || [];
      setAvailableStaff(uniqueStaff);
    } catch (error) {
      console.error('Error loading staff:', error);
    }
  };

  const loadAvailableClients = async () => {
    try {
      const { data } = await supabase
        .from('students')
        .select('id, name')
        .eq('is_archived', false)
        .order('name');
      setAvailableClients(data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const loadAgencies = async () => {
    try {
      const { data } = await supabase
        .from('agency_memberships')
        .select('id, agency_id, role, status, agencies:agency_id (name)')
        .eq('user_id', userId)
        .eq('status', 'active');
      
      setAgencies((data || []).map((d: any) => ({
        id: d.id,
        agency_id: d.agency_id,
        agency_name: d.agencies?.name || 'Unknown',
        role: d.role,
        status: d.status,
      })));
    } catch (error) {
      console.error('Error loading agencies:', error);
    }
  };

  const loadAvailableAgencies = async () => {
    try {
      const { data } = await supabase
        .from('agencies')
        .select('id, name')
        .eq('status', 'active')
        .order('name');
      setAvailableAgencies(data || []);
    } catch (error) {
      console.error('Error loading agencies:', error);
    }
  };

  const handleAssignClient = async () => {
    if (!selectedClientId) { toast.error('Please select a client'); return; }
    try {
      const { error } = await supabase.from('client_team_assignments').insert({
        client_id: selectedClientId,
        staff_user_id: userId,
        role: selectedRole,
        start_date: new Date().toISOString().split('T')[0],
        is_active: true,
      });
      if (error) throw error;
      toast.success('Client assigned successfully');
      setAssignClientOpen(false);
      setSelectedClientId('');
      loadCaseload();
      refetch();
    } catch (error: any) {
      console.error('Error assigning client:', error);
      toast.error(error.message || 'Failed to assign client');
    }
  };

  const handleRemoveClient = async (assignment: CaseloadAssignment) => {
    try {
      if (assignment.source === 'caseload') {
        await supabase.from('staff_caseloads').update({ status: 'inactive' }).eq('id', assignment.id);
      } else {
        await supabase.from('client_team_assignments').update({ is_active: false }).eq('id', assignment.id);
      }
      toast.success('Client removed from caseload');
      loadCaseload();
      refetch();
    } catch (error) {
      console.error('Error removing client:', error);
      toast.error('Failed to remove client');
    }
  };

  const handleAssignAgency = async () => {
    if (!selectedAgencyId) { toast.error('Please select an agency'); return; }
    try {
      const { error } = await supabase.from('agency_memberships').insert({
        agency_id: selectedAgencyId,
        user_id: userId,
        role: 'staff',
        status: 'active',
        joined_at: new Date().toISOString(),
      });
      if (error) throw error;
      toast.success('Agency assigned successfully');
      setAssignAgencyOpen(false);
      setSelectedAgencyId('');
      loadAgencies();
    } catch (error: any) {
      console.error('Error assigning agency:', error);
      toast.error(error.message || 'Failed to assign agency');
    }
  };

  const handleRemoveAgency = async (membershipId: string) => {
    try {
      await supabase.from('agency_memberships').update({ status: 'inactive' }).eq('id', membershipId);
      toast.success('Agency removed');
      loadAgencies();
    } catch (error) {
      console.error('Error removing agency:', error);
      toast.error('Failed to remove agency');
    }
  };

  const handleAddSupervisorLink = async () => {
    if (!linkForm.supervisor_staff_id) {
      toast.error('Please select a supervisor');
      return;
    }
    try {
      const { error } = await supabase.from('supervisor_links').insert({
        supervisee_staff_id: userId,
        supervisor_staff_id: linkForm.supervisor_staff_id,
        supervision_type: linkForm.supervision_type,
        start_date: linkForm.start_date,
        status: 'active',
      });
      if (error) throw error;
      toast.success('Supervisor link created');
      setLinkDialogOpen(false);
      refetch();
    } catch (error) {
      console.error('Error creating supervisor link:', error);
      toast.error('Failed to create supervisor link');
    }
  };

  const handleEndSupervisorLink = async (linkId: string) => {
    try {
      const { error } = await supabase
        .from('supervisor_links')
        .update({ status: 'inactive', end_date: new Date().toISOString().split('T')[0] })
        .eq('id', linkId);
      if (error) throw error;
      toast.success('Supervisor link ended');
      refetch();
    } catch (error) {
      console.error('Error ending supervisor link:', error);
      toast.error('Failed to end supervisor link');
    }
  };

  const activeSupervisorLinks = supervisorLinks.filter(
    l => l.status === 'active' && (!l.end_date || new Date(l.end_date) > new Date())
  );

  return (
    <div className="space-y-6 mt-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{caseload.length}</div>
            <p className="text-sm text-muted-foreground">Active Clients</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{activeSupervisorLinks.length}</div>
            <p className="text-sm text-muted-foreground">Active Supervisors</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{superviseeLinks.filter(l => l.status === 'active').length}</div>
            <p className="text-sm text-muted-foreground">Supervisees</p>
          </CardContent>
        </Card>
      </div>

      {/* Supervisor Links */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Supervision Chain
          </CardTitle>
          <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <UserPlus className="h-4 w-4 mr-2" />
                Add Supervisor
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Supervisor Link</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label>Supervisor</Label>
                  <Select value={linkForm.supervisor_staff_id} onValueChange={(value) => setLinkForm(prev => ({ ...prev, supervisor_staff_id: value }))}>
                    <SelectTrigger><SelectValue placeholder="Select supervisor" /></SelectTrigger>
                    <SelectContent>
                      {availableStaff.map(staff => (
                        <SelectItem key={staff.user_id} value={staff.user_id}>
                          {staff.display_name || `${staff.first_name} ${staff.last_name}`} ({staff.credential})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Supervision Type</Label>
                  <Select value={linkForm.supervision_type} onValueChange={(value) => setLinkForm(prev => ({ ...prev, supervision_type: value }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="primary">Primary</SelectItem>
                      <SelectItem value="secondary">Secondary</SelectItem>
                      <SelectItem value="backup">Backup</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Start Date</Label>
                  <Input type="date" value={linkForm.start_date} onChange={(e) => setLinkForm(prev => ({ ...prev, start_date: e.target.value }))} />
                </div>
                <Button onClick={handleAddSupervisorLink} className="w-full">Create Link</Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {activeSupervisorLinks.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supervisor</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeSupervisorLinks.map(link => (
                  <TableRow key={link.id}>
                    <TableCell className="font-medium">
                      {link.supervisor_profile?.display_name || 
                       `${link.supervisor_profile?.first_name || ''} ${link.supervisor_profile?.last_name || ''}`.trim() ||
                       'Unknown'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={link.supervision_type === 'primary' ? 'default' : 'outline'}>
                        {link.supervision_type}
                      </Badge>
                    </TableCell>
                    <TableCell>{format(new Date(link.start_date), 'MMM d, yyyy')}</TableCell>
                    <TableCell><Badge variant="default">Active</Badge></TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => handleEndSupervisorLink(link.id)} title="End supervision link">
                        <Unlink className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">No active supervisor links</div>
          )}
        </CardContent>
      </Card>

      {/* Caseload with Assign/Remove */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Active Caseload
          </CardTitle>
          <Dialog open={assignClientOpen} onOpenChange={setAssignClientOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <UserPlus className="h-4 w-4 mr-2" />
                Assign Client
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assign Client</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label>Client</Label>
                  <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                    <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                    <SelectContent>
                      {availableClients
                        .filter(c => !caseload.some(a => a.student_id === c.id))
                        .map(client => (
                          <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Role</Label>
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="clinician">Clinician</SelectItem>
                      <SelectItem value="bcba">BCBA</SelectItem>
                      <SelectItem value="rbt">RBT</SelectItem>
                      <SelectItem value="supervisor">Supervisor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAssignClient} className="w-full">Assign Client</Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : caseload.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {caseload.map(assignment => (
                  <TableRow key={assignment.id}>
                    <TableCell className="font-medium">{assignment.student?.name || 'Unknown'}</TableCell>
                    <TableCell className="capitalize">{assignment.role}</TableCell>
                    <TableCell>{assignment.start_date ? format(new Date(assignment.start_date), 'MMM d, yyyy') : '—'}</TableCell>
                    <TableCell><Badge variant="default">{assignment.status}</Badge></TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => handleRemoveClient(assignment)} title="Remove client">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">No active client assignments</div>
          )}
        </CardContent>
      </Card>

      {/* Agency Assignments */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Agency Assignments
          </CardTitle>
          <Dialog open={assignAgencyOpen} onOpenChange={setAssignAgencyOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Building2 className="h-4 w-4 mr-2" />
                Assign Agency
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assign to Agency</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label>Agency</Label>
                  <Select value={selectedAgencyId} onValueChange={setSelectedAgencyId}>
                    <SelectTrigger><SelectValue placeholder="Select agency" /></SelectTrigger>
                    <SelectContent>
                      {availableAgencies
                        .filter(a => !agencies.some(ag => ag.agency_id === a.id))
                        .map(agency => (
                          <SelectItem key={agency.id} value={agency.id}>{agency.name}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAssignAgency} className="w-full">Assign Agency</Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {agencies.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agency</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agencies.map(agency => (
                  <TableRow key={agency.id}>
                    <TableCell className="font-medium">{agency.agency_name}</TableCell>
                    <TableCell className="capitalize">{agency.role}</TableCell>
                    <TableCell><Badge variant="default">{agency.status}</Badge></TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => handleRemoveAgency(agency.id)} title="Remove agency">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">No agency assignments</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
