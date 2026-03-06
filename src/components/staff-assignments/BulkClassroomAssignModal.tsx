import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Search, Users } from 'lucide-react';

const ROLE_OPTIONS = [
  { value: 'teacher', label: 'Teacher' },
  { value: 'aide', label: 'Aide' },
  { value: 'behavior_staff', label: 'Behavior Staff' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'bcba', label: 'BCBA' },
  { value: 'admin', label: 'Admin' },
];

interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
}

interface BulkClassroomAssignModalProps {
  open: boolean;
  onClose: () => void;
  onBulkAssign: (classroomId: string, userIds: string[], roleSlug: string) => Promise<boolean>;
  profiles: Profile[];
  classrooms: { id: string; name: string }[];
  agencies: { id: string; name: string }[];
}

export function BulkClassroomAssignModal({
  open, onClose, onBulkAssign, profiles, classrooms, agencies,
}: BulkClassroomAssignModalProps) {
  const [classroomId, setClassroomId] = useState('');
  const [agencyId, setAgencyId] = useState('');
  const [roleSlug, setRoleSlug] = useState('teacher');
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const profileName = (p: Profile) =>
    p.display_name || [p.first_name, p.last_name].filter(Boolean).join(' ') || p.email || 'Unknown';

  const filteredProfiles = profiles.filter(p => {
    if (!search) return true;
    const term = search.toLowerCase();
    return profileName(p).toLowerCase().includes(term) || (p.email || '').toLowerCase().includes(term);
  });

  const toggleUser = (id: string) => {
    setSelectedUserIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAssign = async () => {
    if (!classroomId || selectedUserIds.size === 0) return;
    setSaving(true);
    const ok = await onBulkAssign(classroomId, Array.from(selectedUserIds), roleSlug);
    setSaving(false);
    if (ok) {
      setSelectedUserIds(new Set());
      setSearch('');
      onClose();
    }
  };

  const handleClose = () => {
    setSelectedUserIds(new Set());
    setSearch('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Quick Assign to Classroom
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Agency */}
          <div>
            <Label>Agency</Label>
            <Select value={agencyId} onValueChange={setAgencyId}>
              <SelectTrigger><SelectValue placeholder="Select agency" /></SelectTrigger>
              <SelectContent>
                {agencies.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Classroom */}
          <div>
            <Label>Classroom</Label>
            <Select value={classroomId} onValueChange={setClassroomId}>
              <SelectTrigger><SelectValue placeholder="Select classroom" /></SelectTrigger>
              <SelectContent>
                {classrooms.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Role for all */}
          <div>
            <Label>Role (applied to all)</Label>
            <Select value={roleSlug} onValueChange={setRoleSlug}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map(r => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Staff multi-select */}
          <div>
            <Label>Select Staff Members</Label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search staff..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            {selectedUserIds.size > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {Array.from(selectedUserIds).map(id => {
                  const p = profiles.find(pr => pr.id === id);
                  return (
                    <Badge key={id} variant="secondary" className="text-xs cursor-pointer" onClick={() => toggleUser(id)}>
                      {p ? profileName(p) : id} ×
                    </Badge>
                  );
                })}
              </div>
            )}
            <ScrollArea className="h-[200px] border rounded-md mt-2">
              <div className="p-2 space-y-1">
                {filteredProfiles.slice(0, 100).map(p => (
                  <label
                    key={p.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-sm"
                  >
                    <Checkbox
                      checked={selectedUserIds.has(p.id)}
                      onCheckedChange={() => toggleUser(p.id)}
                    />
                    <span className="flex-1 truncate">{profileName(p)}</span>
                    {p.email && <span className="text-xs text-muted-foreground truncate max-w-[150px]">{p.email}</span>}
                  </label>
                ))}
                {filteredProfiles.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No staff found</p>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleAssign} disabled={saving || !classroomId || selectedUserIds.size === 0}>
            {saving ? 'Assigning...' : `Assign ${selectedUserIds.size} Staff`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
