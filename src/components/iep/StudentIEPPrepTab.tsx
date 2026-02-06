import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Lightbulb } from 'lucide-react';
import { IEPMeetingPrepWizard } from './IEPMeetingPrepWizard';
import { useDataStore } from '@/store/dataStore';

interface StudentIEPPrepTabProps {
  studentId: string;
}

export function StudentIEPPrepTab({ studentId }: StudentIEPPrepTabProps) {
  const [showWizard, setShowWizard] = useState(false);
  const students = useDataStore(s => s.students);
  const student = students.find(s => s.id === studentId);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              IEP Meeting Prep
            </CardTitle>
            <Button size="sm" onClick={() => setShowWizard(true)} disabled={!student}>
              <Plus className="w-4 h-4 mr-1" />
              New Prep
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Guided 6-step workflow to prepare data summaries, goals, and recommendations for IEP/504 meetings.
          </p>
        </CardHeader>
        <CardContent>
          {!showWizard ? (
            <div className="text-center py-8">
              <Lightbulb className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-4">
                Start a new IEP meeting prep to auto-pull behavior trends, goal progress, and generate a shareable report.
              </p>
              <Button variant="outline" onClick={() => setShowWizard(true)} disabled={!student}>
                <Plus className="w-4 h-4 mr-1" />
                Start IEP Meeting Prep
              </Button>
            </div>
          ) : student ? (
            <IEPMeetingPrepWizard
              open={showWizard}
              onOpenChange={setShowWizard}
              student={student}
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
