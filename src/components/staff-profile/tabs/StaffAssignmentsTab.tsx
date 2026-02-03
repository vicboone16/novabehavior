import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Users, UserPlus, Link2, Unlink } from 'lucide-react';
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
  student?: {
    name: string;
  };
}

export function StaffAssignmentsTab({ 
  userId, 
  caseloadCount, 
  supervisorLinks, 
  superviseeLinks,
  refetch 
}: StaffAssignmentsTabProps) {
  const [caseload, setCaseload] = useState<CaseloadAssignment[]>([]);
  const [availableStaff, setAvailableStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkForm, setLinkForm] = useState({
    supervisor_staff_id: '',
    supervision_type: 'primary',
    start_date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadCaseload();
    loadAvailableStaff();
  }, [userId]);

  const loadCaseload = async () => {
    try {
      const { data, error } = await supabase
        .from('staff_caseloads')
        .select(`
          id,
          student_id,
          status,
          start_date,
          students:student_id (name)
        `)
        .eq('clinician_user_id', userId)
        .eq('status', 'active');

      if (error) throw error;
      setCaseload(data?.map((d: any) => ({
        id: d.id,
        student_id: d.student_id,
        status: d.status,
        role: 'clinician',
        start_date: d.start_date,
        student: d.students
      })) || []);
    } catch (error) {
      console.error('Error loading caseload:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableStaff = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, first_name, last_name, credential')
        .in('credential', ['BCBA', 'BCaBA'])
        .neq('user_id', userId);

      if (error) throw error;
      setAvailableStaff(data || []);
    } catch (error) {
      console.error('Error loading staff:', error);
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
        .update({ 
          status: 'inactive',
          end_date: new Date().toISOString().split('T')[0]
        })
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
            <div className="text-2xl font-bold">{caseloadCount}</div>
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
                  <Select
                    value={linkForm.supervisor_staff_id}
                    onValueChange={(value) => setLinkForm(prev => ({ ...prev, supervisor_staff_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select supervisor" />
                    </SelectTrigger>
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
                  <Select
                    value={linkForm.supervision_type}
                    onValueChange={(value) => setLinkForm(prev => ({ ...prev, supervision_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="primary">Primary</SelectItem>
                      <SelectItem value="secondary">Secondary</SelectItem>
                      <SelectItem value="backup">Backup</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={linkForm.start_date}
                    onChange={(e) => setLinkForm(prev => ({ ...prev, start_date: e.target.value }))}
                  />
                </div>
                
                <Button onClick={handleAddSupervisorLink} className="w-full">
                  Create Link
                </Button>
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
                    <TableCell>
                      <Badge variant="default">Active</Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEndSupervisorLink(link.id)}
                        title="End supervision link"
                      >
                        <Unlink className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No active supervisor links
            </div>
          )}
        </CardContent>
      </Card>

      {/* Caseload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Active Caseload
          </CardTitle>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {caseload.map(assignment => (
                  <TableRow key={assignment.id}>
                    <TableCell className="font-medium">
                      {assignment.student?.name || 'Unknown'}
                    </TableCell>
                    <TableCell className="capitalize">{assignment.role}</TableCell>
                    <TableCell>{format(new Date(assignment.start_date), 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                      <Badge variant="default">{assignment.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No active client assignments
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
