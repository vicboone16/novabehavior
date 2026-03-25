import { useEffect, useState } from 'react';
import { Plus, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useProtocols } from '@/hooks/useProtocols';
import { ProtocolAssignmentStatus } from '@/types/protocol';
import { toast } from 'sonner';

const STATUS_COLORS: Record<ProtocolAssignmentStatus, string> = {
  active: 'default',
  paused: 'secondary',
  mastered: 'outline',
  discontinued: 'destructive',
};

interface ProtocolAssignmentManagerProps {
  studentId: string;
}

export function ProtocolAssignmentManager({ studentId }: ProtocolAssignmentManagerProps) {
  const { templates, assignments, assignProtocol, updateAssignment, fetchTemplates, fetchAssignments } = useProtocols();
  const [showAssign, setShowAssign] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  useEffect(() => {
    void fetchTemplates();
    void fetchAssignments(studentId);
  }, [fetchAssignments, fetchTemplates, studentId]);

  const studentAssignments = assignments.filter((a) => a.student_id === studentId);

  const handleAssign = async () => {
    if (!selectedTemplateId) {
      toast.error('Please select a protocol');
      return;
    }

    try {
      await assignProtocol({
        student_id: studentId,
        protocol_template_id: selectedTemplateId,
        status: 'active',
        start_date: new Date().toISOString(),
        assigned_staff: [],
        customizations: {},
      });
      await fetchAssignments(studentId);
      setShowAssign(false);
      setSelectedTemplateId('');
      toast.success('Protocol assigned');
    } catch (error) {
      console.error('Failed to assign protocol:', error);
      toast.error('Failed to assign protocol');
    }
  };

  const handleStatusChange = async (assignmentId: string, status: string) => {
    try {
      await updateAssignment(assignmentId, { status } as any);
      await fetchAssignments(studentId);
    } catch (error) {
      console.error('Failed to update protocol assignment:', error);
      toast.error('Failed to update assignment');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <BookOpen className="w-4 h-4" /> Assigned Protocols
        </h3>
        <Button size="sm" onClick={() => setShowAssign(true)} className="gap-1">
          <Plus className="w-3 h-3" /> Assign Protocol
        </Button>
      </div>

      {studentAssignments.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No protocols assigned yet</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Protocol</TableHead>
              <TableHead>System</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {studentAssignments.map((assignment) => (
              <TableRow key={assignment.id}>
                <TableCell className="font-medium">{assignment.protocol_template?.title || 'Unknown'}</TableCell>
                <TableCell>
                  {assignment.protocol_template?.curriculum_system && (
                    <Badge variant="outline">{assignment.protocol_template.curriculum_system}</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_COLORS[assignment.status] as any}>{assignment.status}</Badge>
                </TableCell>
                <TableCell>{new Date(assignment.start_date).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Select
                    value={assignment.status}
                    onValueChange={(value) => void handleStatusChange(assignment.id, value)}
                  >
                    <SelectTrigger className="w-[120px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                      <SelectItem value="mastered">Mastered</SelectItem>
                      <SelectItem value="discontinued">Discontinued</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={showAssign} onOpenChange={setShowAssign}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Protocol</DialogTitle>
          </DialogHeader>
          <div>
            <Label>Select Protocol Template</Label>
            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
              <SelectTrigger><SelectValue placeholder="Choose a protocol..." /></SelectTrigger>
              <SelectContent>
                {templates.filter((t) => t.status === 'active').map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.title} {t.curriculum_system ? `(${t.curriculum_system})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssign(false)}>Cancel</Button>
            <Button onClick={() => void handleAssign()}>Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}