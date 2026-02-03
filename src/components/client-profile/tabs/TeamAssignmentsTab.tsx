import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Plus, UserPlus, Users, Shield, Calendar, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import type { ClientTeamAssignment } from '@/types/clientProfile';
import { STAFF_ROLES, PERMISSION_SCOPES } from '@/types/clientProfile';

interface TeamAssignmentsTabProps {
  clientId: string;
  teamAssignments: ClientTeamAssignment[];
  onRefetch: () => void;
}

export function TeamAssignmentsTab({ clientId, teamAssignments, onRefetch }: TeamAssignmentsTabProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [formData, setFormData] = useState({
    staff_user_id: '',
    role: '',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    permission_scope: [] as string[],
    supervision_required: false,
    supervising_staff_id: '',
    notes: '',
  });

  const loadStaffList = async () => {
    setLoadingStaff(true);
    try {
      const { data } = await supabase
        .from('profiles')
        .select('user_id, display_name, first_name, last_name, credential')
        .order('display_name');
      setStaffList(data || []);
    } finally {
      setLoadingStaff(false);
    }
  };

  const handleAddAssignment = async () => {
    if (!formData.staff_user_id || !formData.role) {
      toast.error('Staff member and role are required');
      return;
    }

    try {
      const { error } = await supabase.from('client_team_assignments').insert({
        client_id: clientId,
        staff_user_id: formData.staff_user_id,
        role: formData.role,
        start_date: formData.start_date,
        permission_scope: formData.permission_scope,
        supervision_required: formData.supervision_required,
        supervising_staff_id: formData.supervising_staff_id || null,
        notes: formData.notes || null,
        is_active: true,
      });

      if (error) throw error;
      toast.success('Team member assigned');
      setIsAddDialogOpen(false);
      setFormData({
        staff_user_id: '',
        role: '',
        start_date: format(new Date(), 'yyyy-MM-dd'),
        permission_scope: [],
        supervision_required: false,
        supervising_staff_id: '',
        notes: '',
      });
      onRefetch();
    } catch (error) {
      console.error('Error adding assignment:', error);
      toast.error('Failed to add team member');
    }
  };

  const handleDeactivate = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from('client_team_assignments')
        .update({ is_active: false, end_date: format(new Date(), 'yyyy-MM-dd') })
        .eq('id', assignmentId);

      if (error) throw error;
      toast.success('Assignment deactivated');
      onRefetch();
    } catch (error) {
      toast.error('Failed to deactivate assignment');
    }
  };

  const activeAssignments = teamAssignments.filter(a => a.is_active);
  const inactiveAssignments = teamAssignments.filter(a => !a.is_active);

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'primary_supervisor':
      case 'bcba':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'rbt':
      case 'bt':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'case_manager':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Team & Assignments</h3>
          <p className="text-sm text-muted-foreground">
            Manage staff assigned to this client's care team
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (open) loadStaffList();
        }}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Assign Staff
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Assign Team Member</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Staff Member *</Label>
                <Select
                  value={formData.staff_user_id}
                  onValueChange={(value) => setFormData({ ...formData, staff_user_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    {staffList.map((staff) => (
                      <SelectItem key={staff.user_id} value={staff.user_id}>
                        {staff.display_name || `${staff.first_name} ${staff.last_name}`}
                        {staff.credential && ` (${staff.credential})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Role *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {STAFF_ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Permission Scope</Label>
                <div className="grid grid-cols-2 gap-2">
                  {PERMISSION_SCOPES.map((scope) => (
                    <div key={scope.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={scope.value}
                        checked={formData.permission_scope.includes(scope.value)}
                        onCheckedChange={(checked) => {
                          setFormData({
                            ...formData,
                            permission_scope: checked
                              ? [...formData.permission_scope, scope.value]
                              : formData.permission_scope.filter(s => s !== scope.value)
                          });
                        }}
                      />
                      <Label htmlFor={scope.value} className="text-sm">{scope.label}</Label>
                    </div>
                  ))}
                </div>
              </div>

              {(formData.role === 'rbt' || formData.role === 'bt') && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="supervision_required"
                    checked={formData.supervision_required}
                    onCheckedChange={(checked) => 
                      setFormData({ ...formData, supervision_required: !!checked })
                    }
                  />
                  <Label htmlFor="supervision_required">Supervision Required</Label>
                </div>
              )}

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Optional notes about this assignment..."
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddAssignment}>
                  Assign
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Assignments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Active Team ({activeAssignments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeAssignments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No active team members assigned
            </p>
          ) : (
            <div className="space-y-3">
              {activeAssignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {assignment.staff_profile?.display_name || 
                         `${assignment.staff_profile?.first_name} ${assignment.staff_profile?.last_name}` ||
                         'Unknown Staff'}
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge className={getRoleBadgeColor(assignment.role)}>
                          {STAFF_ROLES.find(r => r.value === assignment.role)?.label || assignment.role}
                        </Badge>
                        {assignment.supervision_required && (
                          <Badge variant="outline" className="text-xs">
                            <Shield className="h-3 w-3 mr-1" />
                            Supervision Required
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3 inline mr-1" />
                      Since {format(new Date(assignment.start_date), 'MMM d, yyyy')}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeactivate(assignment.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inactive Assignments */}
      {inactiveAssignments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground">
              Previous Team Members ({inactiveAssignments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {inactiveAssignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between p-2 border rounded opacity-60"
                >
                  <div>
                    <p className="text-sm">
                      {assignment.staff_profile?.display_name || 'Unknown Staff'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {STAFF_ROLES.find(r => r.value === assignment.role)?.label || assignment.role}
                      {assignment.end_date && ` • Ended ${format(new Date(assignment.end_date), 'MMM d, yyyy')}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
