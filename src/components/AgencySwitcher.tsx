import { useState } from 'react';
import { useAgencyContext } from '@/hooks/useAgencyContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  DialogTrigger,
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
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function AgencySwitcher() {
  const { user, userRole } = useAuth();
  const { currentAgency, agencies, loading, switchAgency, refreshAgencies, isAgencyAdmin } = useAgencyContext();
  const [switching, setSwitching] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newAgencyName, setNewAgencyName] = useState('');

  const isSuperAdmin = userRole === 'super_admin';

  const handleSwitch = async (agencyId: string) => {
    if (agencyId === currentAgency?.id) return;
    
    setSwitching(true);
    const success = await switchAgency(agencyId);
    setSwitching(false);
    
    if (success) {
      toast.success('Switched agency');
      // Optionally reload the page to refresh all data
      // window.location.reload();
    } else {
      toast.error('Failed to switch agency');
    }
  };

  const handleCreateAgency = async () => {
    if (!newAgencyName.trim() || !user) return;
    
    setCreating(true);
    try {
      // Create the agency
      const { data: agency, error: agencyError } = await supabase
        .from('agencies')
        .insert({
          name: newAgencyName.trim(),
          created_by: user.id,
        })
        .select()
        .single();

      if (agencyError) throw agencyError;

      // Create membership for creator as owner
      const { error: membershipError } = await supabase
        .from('agency_memberships')
        .insert({
          agency_id: agency.id,
          user_id: user.id,
          role: 'owner',
          is_primary: agencies.length === 0, // Make primary if first agency
          status: 'active',
          joined_at: new Date().toISOString(),
        });

      if (membershipError) throw membershipError;

      toast.success('Agency created');
      setShowCreateDialog(false);
      setNewAgencyName('');
      await refreshAgencies();
      
      // Switch to the new agency
      await switchAgency(agency.id);
    } catch (error) {
      console.error('Error creating agency:', error);
      toast.error('Failed to create agency');
    } finally {
      setCreating(false);
    }
  };

  // Don't show if no agencies and not super admin
  if (!loading && agencies.length === 0 && !isSuperAdmin) {
    return null;
  }

  // Show loading state
  if (loading) {
    return (
      <Button variant="outline" size="sm" disabled className="gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading...
      </Button>
    );
  }

  // Single agency - just show name, no dropdown
  if (agencies.length === 1 && !isSuperAdmin) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{currentAgency?.name || 'No Agency'}</span>
      </div>
    );
  }

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

          {isAgencyAdmin && currentAgency && (
            <>
              <DropdownMenuSeparator />
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
    </>
  );
}
