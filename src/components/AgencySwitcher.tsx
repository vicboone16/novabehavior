import { useState, useEffect } from 'react';
import { useAgencyContext } from '@/hooks/useAgencyContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Building2, 
  ChevronDown, 
  Check, 
  Plus, 
  Loader2,
  Settings,
  Users,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function AgencySwitcher() {
  const { user, userRole } = useAuth();
  const { currentAgency, agencies, loading, switchAgency, refreshAgencies, isAgencyAdmin } = useAgencyContext();
  const [switching, setSwitching] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showManageClientsDialog, setShowManageClientsDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newAgencyName, setNewAgencyName] = useState('');

  // Client management state
  const [allStudents, setAllStudents] = useState<{ id: string; name: string; agency_id: string | null }[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [savingStudents, setSavingStudents] = useState(false);

  const isSuperAdmin = userRole === 'super_admin';

  // Load all students when manage dialog opens
  useEffect(() => {
    if (showManageClientsDialog && currentAgency) {
      loadStudents();
    }
  }, [showManageClientsDialog, currentAgency]);

  const loadStudents = async () => {
    setLoadingStudents(true);
    try {
      // Super admins and agency admins can see all students
      const { data, error } = await supabase
        .from('students')
        .select('id, name, agency_id')
        .eq('is_archived', false)
        .order('name');
      
      if (error) throw error;
      setAllStudents(data || []);
      
      // Pre-select students already in this agency
      const currentAgencyStudents = (data || [])
        .filter(s => s.agency_id === currentAgency?.id)
        .map(s => s.id);
      setSelectedStudentIds(currentAgencyStudents);
    } catch (err) {
      console.error('Error loading students:', err);
      toast.error('Failed to load clients');
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleSaveClientAssignments = async () => {
    if (!currentAgency) return;
    
    setSavingStudents(true);
    try {
      // Get current assignments
      const currentlyAssigned = allStudents
        .filter(s => s.agency_id === currentAgency.id)
        .map(s => s.id);
      
      // Students to add to this agency
      const toAdd = selectedStudentIds.filter(id => !currentlyAssigned.includes(id));
      
      // Students to remove from this agency (set to null)
      const toRemove = currentlyAssigned.filter(id => !selectedStudentIds.includes(id));
      
      // Update students being added
      if (toAdd.length > 0) {
        const { error } = await supabase
          .from('students')
          .update({ agency_id: currentAgency.id })
          .in('id', toAdd);
        if (error) throw error;
      }
      
      // Update students being removed (set agency_id to null)
      if (toRemove.length > 0) {
        const { error } = await supabase
          .from('students')
          .update({ agency_id: null })
          .in('id', toRemove);
        if (error) throw error;
      }
      
      toast.success(`Updated client assignments: ${toAdd.length} added, ${toRemove.length} removed`);
      setShowManageClientsDialog(false);
    } catch (err) {
      console.error('Error saving assignments:', err);
      toast.error('Failed to save client assignments');
    } finally {
      setSavingStudents(false);
    }
  };

  const handleSwitch = async (agencyId: string) => {
    if (agencyId === currentAgency?.id) return;
    
    setSwitching(true);
    const success = await switchAgency(agencyId);
    setSwitching(false);
    
    if (success) {
      toast.success('Switched agency');
    } else {
      toast.error('Failed to switch agency');
    }
  };

  const handleCreateAgency = async () => {
    if (!newAgencyName.trim() || !user) return;
    
    setCreating(true);
    try {
      const { data: agency, error: agencyError } = await supabase
        .from('agencies')
        .insert({
          name: newAgencyName.trim(),
          created_by: user.id,
        })
        .select()
        .single();

      if (agencyError) throw agencyError;

      const { error: membershipError } = await supabase
        .from('agency_memberships')
        .insert({
          agency_id: agency.id,
          user_id: user.id,
          role: 'owner',
          is_primary: agencies.length === 0,
          status: 'active',
          joined_at: new Date().toISOString(),
        });

      if (membershipError) throw membershipError;

      toast.success('Agency created');
      setShowCreateDialog(false);
      setNewAgencyName('');
      await refreshAgencies();
      await switchAgency(agency.id);
    } catch (error) {
      console.error('Error creating agency:', error);
      toast.error('Failed to create agency');
    } finally {
      setCreating(false);
    }
  };

  if (!loading && agencies.length === 0 && !isSuperAdmin) {
    return null;
  }

  if (loading) {
    return (
      <Button variant="outline" size="sm" disabled className="gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading...
      </Button>
    );
  }

  if (agencies.length === 1 && !isSuperAdmin) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{currentAgency?.name || 'No Agency'}</span>
      </div>
    );
  }

  // Get counts for UI
  const studentsInCurrentAgency = allStudents.filter(s => s.agency_id === currentAgency?.id).length;
  const unassignedStudents = allStudents.filter(s => !s.agency_id).length;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2" disabled={switching}>
            {switching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Building2 className="h-4 w-4" />
            )}
            <span className="max-w-[150px] truncate">
              {currentAgency?.name || 'Select Agency'}
            </span>
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[240px]">
          <DropdownMenuLabel>Switch Agency</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {agencies.map((membership) => (
            <DropdownMenuItem
              key={membership.id}
              onClick={() => handleSwitch(membership.agency_id)}
              className="flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2">
                {membership.agency.logo_url ? (
                  <img 
                    src={membership.agency.logo_url} 
                    alt="" 
                    className="h-5 w-5 rounded object-cover"
                  />
                ) : (
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="truncate max-w-[140px]">{membership.agency.name}</span>
              </div>
              <div className="flex items-center gap-1">
                {membership.is_primary && (
                  <Badge variant="outline" className="text-[10px] px-1">Primary</Badge>
                )}
                {membership.agency_id === currentAgency?.id && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </div>
            </DropdownMenuItem>
          ))}

          {isSuperAdmin && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setShowCreateDialog(true)}
                className="cursor-pointer"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New Agency
              </DropdownMenuItem>
            </>
          )}

          {(isAgencyAdmin || isSuperAdmin) && currentAgency && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => setShowManageClientsDialog(true)}
                className="cursor-pointer"
              >
                <Users className="h-4 w-4 mr-2" />
                Manage Clients
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <Settings className="h-4 w-4 mr-2" />
                Agency Settings
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Create Agency Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Agency</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label htmlFor="agency-name">Agency Name</Label>
              <Input
                id="agency-name"
                value={newAgencyName}
                onChange={(e) => setNewAgencyName(e.target.value)}
                placeholder="Enter agency name"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateAgency} 
                disabled={creating || !newAgencyName.trim()}
              >
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Agency
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage Clients Dialog */}
      <Dialog open={showManageClientsDialog} onOpenChange={setShowManageClientsDialog}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Manage Clients for {currentAgency?.name}
            </DialogTitle>
          </DialogHeader>
          
          <p className="text-sm text-muted-foreground">
            Select clients to assign to this agency. Clients can only belong to one agency at a time.
          </p>

          {loadingStudents ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <>
              <div className="flex gap-2 text-xs text-muted-foreground mb-2">
                <Badge variant="secondary">{selectedStudentIds.length} selected</Badge>
                <Badge variant="outline">{unassignedStudents} unassigned</Badge>
              </div>
              
              <ScrollArea className="flex-1 max-h-[400px] border rounded-lg">
                <div className="p-2 space-y-1">
                  {allStudents.length === 0 ? (
                    <p className="text-center py-4 text-muted-foreground">No clients found</p>
                  ) : (
                    allStudents.map((student) => {
                      const isInOtherAgency = student.agency_id && student.agency_id !== currentAgency?.id;
                      const otherAgency = isInOtherAgency 
                        ? agencies.find(a => a.agency_id === student.agency_id)?.agency.name 
                        : null;
                      
                      return (
                        <label 
                          key={student.id} 
                          className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-muted/50 ${
                            isInOtherAgency ? 'opacity-60' : ''
                          }`}
                        >
                          <Checkbox
                            checked={selectedStudentIds.includes(student.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedStudentIds(prev => [...prev, student.id]);
                              } else {
                                setSelectedStudentIds(prev => prev.filter(id => id !== student.id));
                              }
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium">{student.name}</span>
                            {isInOtherAgency && (
                              <p className="text-xs text-muted-foreground">
                                Currently in: {otherAgency || 'Another agency'}
                              </p>
                            )}
                            {!student.agency_id && (
                              <p className="text-xs text-destructive">Unassigned</p>
                            )}
                          </div>
                          {student.agency_id === currentAgency?.id && (
                            <Badge variant="secondary" className="text-xs">Current</Badge>
                          )}
                        </label>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
              
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowManageClientsDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveClientAssignments} disabled={savingStudents}>
                  {savingStudents ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Assignments'
                  )}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
