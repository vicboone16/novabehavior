import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AssignSupervisorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffUserId: string;
  staffName: string;
  onAssigned?: () => void;
}

interface Supervisor {
  user_id: string;
  display_name: string;
  first_name: string;
  last_name: string;
  credential: string;
  avatar_url?: string;
}

export function AssignSupervisorDialog({
  open,
  onOpenChange,
  staffUserId,
  staffName,
  onAssigned,
}: AssignSupervisorDialogProps) {
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [filteredSupervisors, setFilteredSupervisors] = useState<Supervisor[]>([]);
  const [selectedSupervisorId, setSelectedSupervisorId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [supervisionType, setSupervisionType] = useState<'direct' | 'indirect'>('direct');

  useEffect(() => {
    if (open) {
      loadSupervisors();
    }
  }, [open]);

  useEffect(() => {
    const filtered = supervisors.filter(s => {
      const name = s.display_name || `${s.first_name} ${s.last_name}`;
      return name.toLowerCase().includes(searchQuery.toLowerCase());
    });
    setFilteredSupervisors(filtered);
  }, [searchQuery, supervisors]);

  const loadSupervisors = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, first_name, last_name, credential, avatar_url')
        .in('credential', ['BCBA', 'BCBA-D', 'BCaBA'])
        .eq('employment_status', 'active')
        .order('display_name');

      if (error) throw error;
      setSupervisors(data || []);
      setFilteredSupervisors(data || []);
    } catch (err) {
      console.error('Error loading supervisors:', err);
      toast.error('Failed to load supervisors');
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedSupervisorId) {
      toast.error('Please select a supervisor');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // End any existing active links for this supervisee
      await supabase
        .from('supervisor_links')
        .update({ status: 'ended', end_date: new Date().toISOString().split('T')[0] })
        .eq('supervisee_staff_id', staffUserId)
        .eq('status', 'active');

      // Create new supervisor link using correct column name
      const { error } = await supabase.from('supervisor_links').insert({
        supervisor_staff_id: selectedSupervisorId,
        supervisee_staff_id: staffUserId,
        supervision_type: supervisionType,
        status: 'active',
        start_date: new Date().toISOString().split('T')[0],
        created_by: user?.id,
      });

      if (error) throw error;

      toast.success('Supervisor assigned successfully');
      onOpenChange(false);
      onAssigned?.();
    } catch (err) {
      console.error('Error assigning supervisor:', err);
      toast.error('Failed to assign supervisor');
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (supervisor: Supervisor) => {
    const name = supervisor.display_name || `${supervisor.first_name} ${supervisor.last_name}`;
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Assign Supervisor
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Assign a BCBA/BCaBA supervisor to <strong>{staffName}</strong> to enable scheduling.
          </p>

          <div className="space-y-2">
            <Label>Search Supervisors</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Select Supervisor</Label>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredSupervisors.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No eligible supervisors found
              </p>
            ) : (
              <div className="max-h-[200px] overflow-y-auto space-y-1 border rounded-lg p-2">
                {filteredSupervisors.map((supervisor) => {
                  const name = supervisor.display_name || 
                    `${supervisor.first_name} ${supervisor.last_name}`.trim();
                  const isSelected = selectedSupervisorId === supervisor.user_id;

                  return (
                    <button
                      key={supervisor.user_id}
                      type="button"
                      onClick={() => setSelectedSupervisorId(supervisor.user_id)}
                      className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors ${
                        isSelected 
                          ? 'bg-primary/10 border-primary border' 
                          : 'hover:bg-muted'
                      }`}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={supervisor.avatar_url} />
                        <AvatarFallback className="text-xs">
                          {getInitials(supervisor)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{name}</p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {supervisor.credential}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Supervision Type</Label>
            <Select value={supervisionType} onValueChange={(v: 'direct' | 'indirect') => setSupervisionType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="direct">Direct Supervision</SelectItem>
                <SelectItem value="indirect">Indirect Supervision</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAssign} disabled={!selectedSupervisorId || saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Assigning...
              </>
            ) : (
              'Assign Supervisor'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
