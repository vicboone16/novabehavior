import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Eye } from 'lucide-react';
import { CreateRequestDialog } from './CreateRequestDialog';
import { RequestStatusTable } from './RequestStatusTable';
import { useDataStore } from '@/store/dataStore';

interface StudentObservationsTabProps {
  studentId: string;
  studentName: string;
}

export function StudentObservationsTab({ studentId, studentName }: StudentObservationsTabProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const students = useDataStore(s => s.students);
  const student = students.find(s => s.id === studentId);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Teacher Observation Requests
            </CardTitle>
            <Button size="sm" onClick={() => setShowCreateDialog(true)} disabled={!student}>
              <Plus className="w-4 h-4 mr-1" />
              New Request
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Send observation forms to teachers via email — no login required for them to submit data.
          </p>
        </CardHeader>
        <CardContent>
          <RequestStatusTable studentId={studentId} />
        </CardContent>
      </Card>

      {student && (
        <CreateRequestDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          student={student}
        />
      )}
    </div>
  );
}
