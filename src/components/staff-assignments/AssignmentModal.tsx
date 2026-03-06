import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import type { StaffAssignment, StaffAssignmentFormData } from '@/hooks/useStaffAssignments';

const ROLE_OPTIONS = [
  { value: 'teacher', label: 'Teacher' },
  { value: 'aide', label: 'Aide' },
  { value: 'behavior_staff', label: 'Behavior Staff' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'bcba', label: 'BCBA' },
  { value: 'parent_support', label: 'Parent Support' },
  { value: 'admin', label: 'Admin' },
];

const APP_CONTEXT_OPTIONS = [
  { value: 'novatrack', label: 'NovaTrack Core' },
  { value: 'beacon', label: 'Beacon (Teacher)' },
  { value: 'parent_app', label: 'Parent App' },
  { value: 'all', label: 'All Apps' },
];

interface AssignmentModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: StaffAssignmentFormData) => Promise<boolean>;
  editingAssignment?: StaffAssignment | null;
  mode: 'agency' | 'classroom' | 'student';
  profiles: { id: string; email: string | null; display_name: string | null; first_name: string | null; last_name: string | null }[];
  agencies: { id: string; name: string }[];
  classrooms: { id: string; name: string }[];
  students: { id: string; first_name: string | null; last_name: string | null }[];
}

export function AssignmentModal({
  open, onClose, onSave, editingAssignment, mode,
  profiles, agencies, classrooms, students,
}: AssignmentModalProps) {
  const [form, setForm] = useState<StaffAssignmentFormData>({
    user_id: '',
    role_slug: 'teacher',
    is_active: true,
  });
  const [saving, setSaving] = useState(false);
  const [staffSearch, setStaffSearch] = useState('');

  useEffect(() => {
    if (editingAssignment) {
      setForm({
        user_id: editingAssignment.user_id,
        agency_id: editingAssignment.agency_id,
        classroom_id: editingAssignment.classroom_id,
        student_id: editingAssignment.student_id,
        role_slug: editingAssignment.role_slug,
        app_context: editingAssignment.app_context,
        permission_level: editingAssignment.permission_level,
        can_collect_data: editingAssignment.can_collect_data ?? false,
        can_view_notes: editingAssignment.can_view_notes ?? false,
        can_view_documents: editingAssignment.can_view_documents ?? false,
        can_edit_profile: editingAssignment.can_edit_profile ?? false,
        can_generate_reports: editingAssignment.can_generate_reports ?? false,
        is_active: editingAssignment.is_active,
        notes: editingAssignment.notes,
      });
    } else {
      setForm({ user_id: '', role_slug: 'teacher', is_active: true });
    }
  }, [editingAssignment, open]);

  const handleSave = async () => {
    if (!form.user_id) return;
    setSaving(true);
    const ok = await onSave(form);
    setSaving(false);
    if (ok) onClose();
  };

  const profileName = (p: typeof profiles[0]) =>
    p.display_name || [p.first_name, p.last_name].filter(Boolean).join(' ') || p.email || 'Unknown';

  const filteredProfiles = profiles.filter(p => {
    if (!staffSearch) return true;
    const term = staffSearch.toLowerCase();
    return profileName(p).toLowerCase().includes(term) || (p.email || '').toLowerCase().includes(term);
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingAssignment ? 'Edit Assignment' : 'Assign Staff'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Staff member */}
          <div>
            <Label>Staff Member</Label>
            <Input
              placeholder="Search staff..."
              value={staffSearch}
              onChange={(e) => setStaffSearch(e.target.value)}
              className="mb-1"
            />
            <Select value={form.user_id} onValueChange={(v) => setForm(f => ({ ...f, user_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
              <SelectContent>
                {filteredProfiles.slice(0, 50).map(p => (
                  <SelectItem key={p.id} value={p.id}>{profileName(p)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Agency */}
          {(mode === 'agency' || mode === 'classroom') && (
            <div>
              <Label>Agency</Label>
              <Select value={form.agency_id || ''} onValueChange={(v) => setForm(f => ({ ...f, agency_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select agency" /></SelectTrigger>
                <SelectContent>
                  {agencies.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Classroom */}
          {mode === 'classroom' && (
            <div>
              <Label>Classroom</Label>
              <Select value={form.classroom_id || ''} onValueChange={(v) => setForm(f => ({ ...f, classroom_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select classroom" /></SelectTrigger>
                <SelectContent>
                  {classrooms.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Student */}
          {mode === 'student' && (
            <div>
              <Label>Student</Label>
              <Select value={form.student_id || ''} onValueChange={(v) => setForm(f => ({ ...f, student_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                <SelectContent>
                  {students.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {[s.first_name, s.last_name].filter(Boolean).join(' ') || 'Unnamed'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Role */}
          <div>
            <Label>Role</Label>
            <Select value={form.role_slug} onValueChange={(v) => setForm(f => ({ ...f, role_slug: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map(r => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* App Context */}
          <div>
            <Label>App Context</Label>
            <Select value={form.app_context || ''} onValueChange={(v) => setForm(f => ({ ...f, app_context: v }))}>
              <SelectTrigger><SelectValue placeholder="Select app context" /></SelectTrigger>
              <SelectContent>
                {APP_CONTEXT_OPTIONS.map(a => (
                  <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Permission toggles for student mode */}
          {mode === 'student' && (
            <div className="space-y-3 rounded-md border p-3">
              <p className="text-sm font-medium text-muted-foreground">Permissions</p>
              {([
                ['can_collect_data', 'Can Collect Data'],
                ['can_view_notes', 'Can View Notes'],
                ['can_view_documents', 'Can View Documents'],
                ['can_edit_profile', 'Can Edit Profile'],
                ['can_generate_reports', 'Can Generate Reports'],
              ] as const).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between">
                  <Label className="text-sm">{label}</Label>
                  <Switch
                    checked={!!(form as any)[key]}
                    onCheckedChange={(v) => setForm(f => ({ ...f, [key]: v }))}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Active toggle */}
          <div className="flex items-center justify-between">
            <Label>Active</Label>
            <Switch checked={!!form.is_active} onCheckedChange={(v) => setForm(f => ({ ...f, is_active: v }))} />
          </div>

          {/* Notes */}
          <div>
            <Label>Notes (optional)</Label>
            <Textarea
              value={form.notes || ''}
              onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Optional notes..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !form.user_id}>
            {saving ? 'Saving...' : editingAssignment ? 'Update' : 'Assign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
