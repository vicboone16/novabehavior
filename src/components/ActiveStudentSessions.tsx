import { useState } from 'react';
import { 
  Users, 
  Plus, 
  Square, 
  Clock,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useDataStore } from '@/store/dataStore';
import { StudentSessionTimer } from './StudentSessionTimer';
import { SessionEndFlow } from './SessionEndFlow';

interface ActiveStudentSessionsProps {
  onAddStudent?: () => void;
}

export function ActiveStudentSessions({ onAddStudent }: ActiveStudentSessionsProps) {
  const { 
    students, 
    selectedStudentIds, 
    sessionStartTime,
    getStudentSessionStatus,
  } = useDataStore();

  const [isExpanded, setIsExpanded] = useState(true);
  const [showEndAll, setShowEndAll] = useState(false);

  // Get active students (selected and not ended)
  const activeStudents = students.filter(s => 
    selectedStudentIds.includes(s.id) && 
    !getStudentSessionStatus(s.id)?.hasEnded
  );

  const endedStudents = students.filter(s => 
    selectedStudentIds.includes(s.id) && 
    getStudentSessionStatus(s.id)?.hasEnded
  );

  // Don't show if no session is running
  if (!sessionStartTime) {
    return null;
  }

  return (
    <>
      <Card className="border-primary/20">
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CollapsibleTrigger asChild>
                <div className="flex items-center gap-2 cursor-pointer hover:opacity-80">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-sm flex items-center gap-2">
                      Active Sessions
                      <Badge variant="secondary" className="text-xs">
                        {activeStudents.length} student{activeStudents.length !== 1 ? 's' : ''}
                      </Badge>
                    </CardTitle>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground ml-1" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground ml-1" />
                  )}
                </div>
              </CollapsibleTrigger>

              <div className="flex gap-2">
                {onAddStudent && (
                  <Button variant="outline" size="sm" onClick={onAddStudent}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Student
                  </Button>
                )}
                {activeStudents.length > 0 && (
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => setShowEndAll(true)}
                  >
                    <Square className="w-4 h-4 mr-1" />
                    End All
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>

          <CollapsibleContent>
            <CardContent className="pt-0 space-y-2">
              {activeStudents.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  <Clock className="w-6 h-6 mx-auto mb-2 opacity-50" />
                  <p>No active student sessions</p>
                  <p className="text-xs mt-1">Select students to begin data collection</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {activeStudents.map(student => (
                    <StudentSessionTimer
                      key={student.id}
                      studentId={student.id}
                      studentName={student.displayName || student.name}
                      studentColor={student.color}
                      compact
                    />
                  ))}
                </div>
              )}

              {endedStudents.length > 0 && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-2">
                    Ended ({endedStudents.length})
                  </p>
                  <div className="space-y-1">
                    {endedStudents.map(student => (
                      <StudentSessionTimer
                        key={student.id}
                        studentId={student.id}
                        studentName={student.displayName || student.name}
                        studentColor={student.color}
                        compact
                      />
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      <SessionEndFlow
        open={showEndAll}
        onOpenChange={setShowEndAll}
        mode="all"
        onComplete={() => {}}
      />
    </>
  );
}
