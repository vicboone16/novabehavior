import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Check, UserCheck } from 'lucide-react';

type AppRole = 'super_admin' | 'admin' | 'staff' | 'viewer';

interface TagType {
  id: string;
  name: string;
  tag_type: 'school' | 'site' | 'team' | 'custom';
  color: string;
}

interface UserInfo {
  id: string;
  email: string | null;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
}

interface ApproveUserDialogProps {
  user: UserInfo | null;
  isOpen: boolean;
  onClose: () => void;
  onApproved: () => void;
  availableTags: TagType[];
  isSuperAdmin: boolean;
}

export function ApproveUserDialog({ 
  user, 
  isOpen, 
  onClose, 
  onApproved, 
  availableTags,
  isSuperAdmin
}: ApproveUserDialogProps) {
  const { toast } = useToast();
  const [selectedRole, setSelectedRole] = useState<string>('staff');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isApproving, setIsApproving] = useState(false);
  const [customRoles, setCustomRoles] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    (supabase as any).from('custom_roles').select('id, name').eq('is_active', true).order('name')
      .then(({ data }: { data: { id: string; name: string }[] | null }) => {
        if (data) setCustomRoles(data);
      });
  }, []);

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev => 
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleApprove = async () => {
    if (!user) return;

    setIsApproving(true);
    try {
      // 1. Approve the user
      const { error: approveError } = await supabase.rpc('approve_user', { 
        _user_id: user.id
      });

      if (approveError) throw approveError;

      // 2. Assign the selected role (base or custom)
      const isCustom = selectedRole.startsWith('custom:');
      if (isCustom) {
        const customRoleId = selectedRole.replace('custom:', '');
        const { error: roleError } = await (supabase as any).from('user_custom_roles').insert({ user_id: user.id, custom_role_id: customRoleId });
        if (roleError) throw roleError;
      } else {
        const { error: roleError } = await supabase.from('user_roles').insert({ user_id: user.id, role: selectedRole as AppRole });
        if (roleError) throw roleError;
      }

      // 3. Assign selected tags
      if (selectedTags.length > 0) {
        const { error: tagsError } = await supabase
          .from('user_tags')
          .insert(
            selectedTags.map(tagId => ({
              user_id: user.id,
              tag_id: tagId,
            }))
          );

        if (tagsError) throw tagsError;
      }

      toast({ 
        title: 'User approved', 
        description: `${user.display_name || user.email} has been approved as ${selectedRole}` 
      });
      
      // Reset state
      setSelectedRole('staff');
      setSelectedTags([]);
      onApproved();
      onClose();
    } catch (error: any) {
      toast({ 
        title: 'Failed to approve user', 
        description: error.message, 
        variant: 'destructive' 
      });
    } finally {
      setIsApproving(false);
    }
  };

  // Group tags by type
  const tagsByType = availableTags.reduce((acc, tag) => {
    if (!acc[tag.tag_type]) acc[tag.tag_type] = [];
    acc[tag.tag_type].push(tag);
    return acc;
  }, {} as Record<string, TagType[]>);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-primary" />
            Approve User
          </DialogTitle>
          <DialogDescription>
            Approve {user?.display_name || user?.email} and configure their access
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* User Info */}
          <div className="p-3 bg-secondary/30 rounded-lg">
            <p className="font-medium">{user?.display_name || 'No name'}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            {user?.first_name && user?.last_name && (
              <p className="text-xs text-muted-foreground mt-1">
                Full name: {user.first_name} {user.last_name}
              </p>
            )}
          </div>

          {/* Role Selection */}
          <div className="space-y-2">
            <Label>Assign Role</Label>
            <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {isSuperAdmin && <SelectItem value="super_admin">Super Admin</SelectItem>}
                {isSuperAdmin && <SelectItem value="admin">Admin</SelectItem>}
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
                {customRoles.length > 0 && (
                  <>
                    <div className="px-2 py-1 text-xs text-muted-foreground font-medium border-t mt-1 pt-2">Custom Roles</div>
                    {customRoles.map(r => (
                      <SelectItem key={r.id} value={`custom:${r.id}`}>{r.name}</SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {selectedRole === 'staff' && 'Can collect data and view assigned students'}
              {selectedRole === 'viewer' && 'View-only access to assigned students'}
              {selectedRole === 'admin' && 'Can manage users, students, and settings'}
              {selectedRole === 'super_admin' && 'Full system access including admin management'}
            </p>
          </div>

          {/* Tag Assignment */}
          <div className="space-y-2">
            <Label>Assign Tags (Optional)</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Assign tags to give this user access to students with matching tags
            </p>
            <ScrollArea className="h-[150px] border rounded-md p-3">
              <div className="space-y-4">
                {Object.entries(tagsByType).map(([type, typeTags]) => (
                  <div key={type} className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase">{type}s</p>
                    <div className="space-y-1">
                      {typeTags.map((tag) => (
                        <div key={tag.id} className="flex items-center gap-2">
                          <Checkbox
                            id={`approve-tag-${tag.id}`}
                            checked={selectedTags.includes(tag.id)}
                            onCheckedChange={() => toggleTag(tag.id)}
                          />
                          <Label 
                            htmlFor={`approve-tag-${tag.id}`} 
                            className="text-sm flex items-center gap-2 cursor-pointer"
                          >
                            <div 
                              className="w-2 h-2 rounded-full" 
                              style={{ backgroundColor: tag.color }} 
                            />
                            {tag.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {availableTags.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    No tags created yet
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Summary */}
          {(selectedTags.length > 0) && (
            <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
              <p className="text-xs font-medium text-primary mb-2">Summary</p>
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline">{selectedRole}</Badge>
                {selectedTags.map(tagId => {
                  const tag = availableTags.find(t => t.id === tagId);
                  return tag ? (
                    <Badge 
                      key={tagId}
                      variant="outline"
                      style={{ borderColor: tag.color, backgroundColor: `${tag.color}10` }}
                    >
                      {tag.name}
                    </Badge>
                  ) : null;
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isApproving}>
            Cancel
          </Button>
          <Button onClick={handleApprove} disabled={isApproving}>
            {isApproving ? (
              <>Approving...</>
            ) : (
              <>
                <Check className="w-4 h-4 mr-1" />
                Approve User
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
