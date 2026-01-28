import { useState } from 'react';
import { Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SessionEndFlow } from './SessionEndFlow';
import { useDataStore } from '@/store/dataStore';
import { toast } from '@/hooks/use-toast';

export function EndAllSessionsButton() {
  const [showEndFlow, setShowEndFlow] = useState(false);
  const { selectedStudentIds, students, getStudentSessionStatus } = useDataStore();

  // Count active students (not already ended)
  const activeStudents = students.filter(s => 
    selectedStudentIds.includes(s.id) && 
    !getStudentSessionStatus(s.id)?.hasEnded
  );

  if (activeStudents.length === 0) return null;

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => setShowEndFlow(true)}
        className="gap-2"
      >
        <Square className="w-4 h-4" />
        End All Sessions
      </Button>

      <SessionEndFlow
        open={showEndFlow}
        onOpenChange={setShowEndFlow}
        mode="all"
        onComplete={() => {
          toast({
            title: 'Sessions Ended',
            description: 'All student sessions have been completed.',
          });
        }}
      />
    </>
  );
}
