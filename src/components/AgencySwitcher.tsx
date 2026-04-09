import { useState, useEffect } from 'react';
import { useAgencyContext } from '@/hooks/useAgencyContext';
import { useAgencyAliases } from '@/hooks/useAgencyAliases';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
  AtSign,
  Link2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AgencySettingsDialog } from '@/components/agency/AgencySettingsDialog';
import { RedeemAgencyInviteCode } from '@/components/agency/RedeemAgencyInviteCode';

export function AgencySwitcher() {
  const { user, userRole } = useAuth();
  const { currentAgency, agencies, loading, switchAgency, refreshAgencies, isAgencyAdmin } = useAgencyContext();
  const { aliases, fetchMyAliases, setAlias, getAliasForAgency } = useAgencyAliases();
  const [switching, setSwitching] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showManageClientsDialog, setShowManageClientsDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showAliasDialog, setShowAliasDialog] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [aliasSuffix, setAliasSuffix] = useState('');
  const [settingAlias, setSettingAlias] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newAgencyName, setNewAgencyName] = useState('');

  // Client management state
  const [allStudents, setAllStudents] = useState<{ id: string; name: string; agency_id: string | null }[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [savingStudents, setSavingStudents] = useState(false);

  const isSuperAdmin = userRole === 'super_admin';

  // Fetch aliases when user changes
  useEffect(() => {
    if (user) fetchMyAliases();
  }, [user, fetchMyAliases]);

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

  const handleSetAlias = async () => {
    if (!currentAgency || !aliasSuffix.trim()) return;
    setSettingAlias(true);
    const result = await setAlias(currentAgency.id, aliasSuffix.trim());
    setSettingAlias(false);
    if (result) {
      setShowAliasDialog(false);
      setAliasSuffix('');
    }
  };

  const currentAlias = currentAgency ? getAliasForAgency(currentAgency.id) : null;

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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" title={currentAgency?.name || 'Agency'}>
            <Building2 className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[240px]">
          <DropdownMenuLabel>{currentAgency?.name || 'No Agency'}</DropdownMenuLabel>
          {(isAgencyAdmin || isSuperAdmin) && currentAgency && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowManageClientsDialog(true)} className="cursor-pointer">
                <Users className="h-4 w-4 mr-2" />
                Manage Clients
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowSettingsDialog(true)} className="cursor-pointer">
                <Settings className="h-4 w-4 mr-2" />
                Agency Settings
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Get counts for UI
  const studentsInCurrentAgency = allStudents.filter(s => s.agency_id === currentAgency?.id).length;
  const unassignedStudents = allStudents.filter(s => !s.agency_id).length;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2 max-w-[200px]" disabled={switching} title={currentAlias ? `Working as ${currentAlias}` : currentAgency?.name || 'Select Agency'}>
            {switching ? (
              <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            ) : (
              <Building2 className="h-4 w-4 shrink-0" />
            )}
            {currentAlias && (
              <span className="truncate text-xs font-medium">{currentAlias}</span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[260px]">
          {currentAlias && (
            <>
              <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                Working as <span className="font-semibold text-foreground">{currentAlias}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuLabel>Switch Agency</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {agencies.map((membership) => {
            const memberAlias = getAliasForAgency(membership.agency_id);
            return (
              <DropdownMenuItem
                key={membership.id}
                onClick={() => handleSwitch(membership.agency_id)}
                className="flex items-center justify-between cursor-pointer"
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    {membership.agency.logo_url ? (
                      <img 
                        src={membership.agency.logo_url} 
                        alt="" 
                        className="h-5 w-5 rounded object-cover shrink-0"
                      />
                    ) : (
                      <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <span className="truncate max-w-[140px]">{membership.agency.name}</span>
                  </div>
                  {memberAlias && (
                    <span className="text-[10px] text-muted-foreground ml-6 truncate">{memberAlias}</span>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {membership.is_primary && (
                    <Badge variant="outline" className="text-[10px] px-1">Primary</Badge>
                  )}
                  {membership.agency_id === currentAgency?.id && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </div>
              </DropdownMenuItem>
            );
          })}

          {currentAgency && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  setAliasSuffix(currentAlias?.split('.')?.slice(1)?.join('.') || '');
                  setShowAliasDialog(true);
                }}
                className="cursor-pointer"
              >
                <AtSign className="h-4 w-4 mr-2" />
                {currentAlias ? 'Change Alias' : 'Set Alias'}
              </DropdownMenuItem>
            </>
          )}

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

          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setShowJoinDialog(true)}
            className="cursor-pointer"
          >
            <Link2 className="h-4 w-4 mr-2" />
            Join Agency with Code
          </DropdownMenuItem>

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
              <DropdownMenuItem 
                onClick={() => setShowSettingsDialog(true)}
                className="cursor-pointer"
              >
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
        <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
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
              
              <div className="h-[300px] border rounded-lg overflow-y-auto">
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
                            <span className="text-sm font-medium">{student.displayName || student.name}</span>
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
              </div>
              
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

      {/* Agency Settings Dialog */}
      <AgencySettingsDialog 
        open={showSettingsDialog} 
        onOpenChange={setShowSettingsDialog} 
      />

      {/* Set Alias Dialog */}
      <Dialog open={showAliasDialog} onOpenChange={setShowAliasDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AtSign className="h-5 w-5" />
              {currentAlias ? 'Change' : 'Set'} Agency Alias
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Choose a username for <span className="font-medium text-foreground">{currentAgency?.name}</span>.
              {currentAgency?.agency_prefix && (
                <> Your alias will be formatted as <span className="font-mono font-medium">{currentAgency.agency_prefix}.</span><span className="font-mono text-muted-foreground">your-name</span></>
              )}
            </p>
            <div>
              <Label htmlFor="alias-suffix">Username</Label>
              <div className="flex items-center gap-1 mt-1">
                {currentAgency?.agency_prefix && (
                  <span className="text-sm font-mono font-medium text-muted-foreground">{currentAgency.agency_prefix}.</span>
                )}
                <Input
                  id="alias-suffix"
                  value={aliasSuffix}
                  onChange={(e) => setAliasSuffix(e.target.value)}
                  placeholder="e.g. jsmith"
                  className="font-mono"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowAliasDialog(false)}>Cancel</Button>
              <Button onClick={handleSetAlias} disabled={settingAlias || !aliasSuffix.trim()}>
                {settingAlias ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Save Alias
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Join Agency Dialog */}
      <RedeemAgencyInviteCode
        open={showJoinDialog}
        onOpenChange={setShowJoinDialog}
        onRedeemed={() => refreshAgencies()}
      />
    </>
  );
}
