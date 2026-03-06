import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Check, X } from 'lucide-react';

const ROLES = [
  { role: 'Teacher', agency: true, classroom: true, studentData: true, notes: false, documents: false, reports: false },
  { role: 'Aide', agency: true, classroom: true, studentData: true, notes: false, documents: false, reports: false },
  { role: 'Behavior Staff', agency: true, classroom: true, studentData: true, notes: true, documents: true, reports: true },
  { role: 'BCBA / Supervisor', agency: true, classroom: true, studentData: true, notes: true, documents: true, reports: true },
  { role: 'Parent Support', agency: false, classroom: false, studentData: false, notes: false, documents: false, reports: false },
  { role: 'Admin', agency: true, classroom: true, studentData: true, notes: true, documents: true, reports: true },
];

const BoolIcon = ({ val }: { val: boolean }) =>
  val ? <Check className="h-4 w-4 text-green-600" /> : <X className="h-4 w-4 text-muted-foreground/40" />;

export function RoleMatrix() {
  return (
    <div>
      <p className="text-sm text-muted-foreground mb-4">
        Default permission matrix by role. Individual assignments may override these defaults.
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Role</TableHead>
            <TableHead>Agency Access</TableHead>
            <TableHead>Classroom Access</TableHead>
            <TableHead>Student Data</TableHead>
            <TableHead>Notes Access</TableHead>
            <TableHead>Document Access</TableHead>
            <TableHead>Reporting</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ROLES.map((r) => (
            <TableRow key={r.role}>
              <TableCell className="font-medium">{r.role}</TableCell>
              <TableCell><BoolIcon val={r.agency} /></TableCell>
              <TableCell><BoolIcon val={r.classroom} /></TableCell>
              <TableCell><BoolIcon val={r.studentData} /></TableCell>
              <TableCell><BoolIcon val={r.notes} /></TableCell>
              <TableCell><BoolIcon val={r.documents} /></TableCell>
              <TableCell><BoolIcon val={r.reports} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
