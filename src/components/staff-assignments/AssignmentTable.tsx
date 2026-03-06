import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Check, X } from 'lucide-react';
import type { StaffAssignment } from '@/hooks/useStaffAssignments';

interface AssignmentTableProps {
  assignments: StaffAssignment[];
  mode: 'agency' | 'classroom' | 'student';
  onEdit: (a: StaffAssignment) => void;
  onRemove: (id: string) => void;
}

export function AssignmentTable({ assignments, mode, onEdit, onRemove }: AssignmentTableProps) {
  if (!assignments.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg font-medium">No assignments found</p>
        <p className="text-sm mt-1">Click "Assign Staff" to add a new assignment.</p>
      </div>
    );
  }

  const BoolIcon = ({ val }: { val: boolean | null }) =>
    val ? <Check className="h-4 w-4 text-green-600" /> : <X className="h-4 w-4 text-muted-foreground/40" />;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Staff Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          {mode === 'student' && <TableHead>Student</TableHead>}
          {mode === 'student' && <TableHead>Collect Data</TableHead>}
          {mode === 'student' && <TableHead>View Notes</TableHead>}
          {mode === 'student' && <TableHead>View Docs</TableHead>}
          <TableHead>App Context</TableHead>
          <TableHead>Active</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {assignments.map((a) => (
          <TableRow key={a.id}>
            <TableCell className="font-medium">{a.staff_name || 'Unknown'}</TableCell>
            <TableCell className="text-muted-foreground">{a.email || '—'}</TableCell>
            <TableCell>
              <Badge variant="secondary" className="capitalize">{a.role_slug.replace('_', ' ')}</Badge>
            </TableCell>
            {mode === 'student' && <TableCell>{a.student_name || '—'}</TableCell>}
            {mode === 'student' && <TableCell><BoolIcon val={a.can_collect_data} /></TableCell>}
            {mode === 'student' && <TableCell><BoolIcon val={a.can_view_notes} /></TableCell>}
            {mode === 'student' && <TableCell><BoolIcon val={a.can_view_documents} /></TableCell>}
            <TableCell>
              <Badge variant="outline" className="capitalize">{a.app_context || 'all'}</Badge>
            </TableCell>
            <TableCell>
              {a.is_active
                ? <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>
                : <Badge variant="secondary">Inactive</Badge>}
            </TableCell>
            <TableCell className="text-right space-x-1">
              <Button variant="ghost" size="icon" onClick={() => onEdit(a)}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => onRemove(a.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
