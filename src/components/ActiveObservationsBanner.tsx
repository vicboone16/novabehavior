import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Timer, Square, Trash2, ChevronRight, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useDataStore } from '@/store/dataStore';
import { formatDistanceToNow } from 'date-fns';

interface ActiveObservationsBannerProps {
  onEndObservation?: (studentId: string) => void;
  onDeleteObservation?: (studentId: string) => void;
  showNavigate?: boolean;
}

export function ActiveObservationsBanner({ 
  onEndObservation, 
  onDeleteObservation,
  showNavigate = true 
}: ActiveObservationsBannerProps) {
  const navigate = useNavigate();
  const { 
    sessionStartTime, 
    selectedStudentIds, 
    students,
    studentSessionStatus,
    isStudentSessionEnded,
  } = useDataStore();

  // Get all active observations - properly check if ALL sessions have ended
  const activeObservations = useMemo(() => {
    // No session start time means no active session at all
    if (!sessionStartTime) return [];
    
    // No students selected means no active observations
    if (selectedStudentIds.length === 0) return [];

    // Filter to only students who haven't ended their session
    const activeStudents = selectedStudentIds.filter(id => !isStudentSessionEnded(id));
    
    // If all students have ended their sessions, no active observations
    if (activeStudents.length === 0) return [];

    return activeStudents
      .map(studentId => {
        const student = students.find(s => s.id === studentId);
        const status = studentSessionStatus.find(s => s.studentId === studentId);
        
        return {
          studentId,
          studentName: student?.displayName || student?.name || 'Unknown',
          studentColor: student?.color || '#888',
          startedAt: sessionStartTime,
          isPaused: status?.isPaused || false,
        };
      });
  }, [sessionStartTime, selectedStudentIds, students, studentSessionStatus, isStudentSessionEnded]);

  if (activeObservations.length === 0) return null;

  const handleNavigateToStudent = (studentId: string) => {
    navigate(`/students/${studentId}?tab=assessment`);
  };

  const durationText = sessionStartTime 
    ? formatDistanceToNow(new Date(sessionStartTime), { addSuffix: false })
    : '0 minutes';

  return (
    <Card className="border-primary bg-primary/5">
      <CardContent className="py-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Timer className="w-5 h-5 text-primary animate-pulse" />
            </div>
            <div>
              <p className="font-medium text-sm flex items-center gap-2">
                Active Observation{activeObservations.length > 1 ? 's' : ''} in Progress
                <Badge variant="default" className="gap-1">
                  <Eye className="w-3 h-3" />
                  {activeObservations.length}
                </Badge>
              </p>
              <p className="text-xs text-muted-foreground">
                Duration: {durationText}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Student list dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <Users className="w-4 h-4" />
                  View Students
                  <ChevronRight className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                {activeObservations.map((obs) => (
                  <DropdownMenuItem
                    key={obs.studentId}
                    className="flex items-center justify-between p-2"
                    onClick={() => showNavigate && handleNavigateToStudent(obs.studentId)}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: obs.studentColor }}
                      />
                      <span className="font-medium text-sm">{obs.studentName}</span>
                      {obs.isPaused && (
                        <Badge variant="secondary" className="text-xs">Paused</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {onEndObservation && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 min-h-[32px] min-w-[32px]"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onEndObservation(obs.studentId);
                          }}
                        >
                          <Square className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </DropdownMenuItem>
                ))}
                
                {activeObservations.length === 1 && onDeleteObservation && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => onDeleteObservation(activeObservations[0].studentId)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Observation
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {showNavigate && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/assessment')}
                className="gap-1"
              >
                <Eye className="w-4 h-4" />
                Go to Assessment
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
