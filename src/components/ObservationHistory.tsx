import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Clock, Eye, Calendar, ChevronDown, ChevronUp, FileText, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useDataStore } from '@/store/dataStore';
import { Session } from '@/types/behavior';

interface ObservationHistoryProps {
  studentId: string;
}

export function ObservationHistory({ studentId }: ObservationHistoryProps) {
  const { sessions, students, abcEntries, frequencyEntries } = useDataStore();
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  const student = students.find(s => s.id === studentId);

  // Get observation sessions for this student
  const observationSessions = useMemo(() => {
    return sessions
      .filter(session => session.studentIds?.includes(studentId))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sessions, studentId]);

  // Get session-specific data
  const getSessionData = (session: Session) => {
    const sessionFrequency = session.frequencyEntries?.filter(e => e.studentId === studentId) || [];
    const sessionABC = abcEntries.filter(e => 
      e.studentId === studentId && 
      e.sessionId === session.id
    );
    const sessionIntervals = session.intervalEntries?.filter(e => e.studentId === studentId) || [];
    const sessionDuration = session.durationEntries?.filter(e => e.studentId === studentId) || [];

    const totalFrequency = sessionFrequency.reduce((sum, e) => sum + e.count, 0);
    const totalDuration = sessionDuration.reduce((sum, e) => sum + e.duration, 0);

    return {
      frequencyCount: totalFrequency,
      abcCount: sessionABC.length,
      intervalCount: sessionIntervals.length,
      durationSeconds: totalDuration,
      frequencyEntries: sessionFrequency,
      abcEntries: sessionABC,
    };
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  };

  if (observationSessions.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <Eye className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-muted-foreground">No observation history</p>
          <p className="text-xs text-muted-foreground mt-1">
            Start an observation to begin collecting data
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Observation History
          <Badge variant="secondary">{observationSessions.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-2">
            {observationSessions.slice(0, 20).map((session) => {
              const data = getSessionData(session);
              const isExpanded = expandedSessionId === session.id;
              const sessionDate = new Date(session.date);

              return (
                <Collapsible
                  key={session.id}
                  open={isExpanded}
                  onOpenChange={() => setExpandedSessionId(isExpanded ? null : session.id)}
                >
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted/80 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded bg-background">
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {format(sessionDate, 'MMM d, yyyy')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(sessionDate, 'h:mm a')} • {session.sessionLengthMinutes}min session
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          {data.frequencyCount > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {data.frequencyCount} freq
                            </Badge>
                          )}
                          {data.abcCount > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {data.abcCount} ABC
                            </Badge>
                          )}
                          {data.intervalCount > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {data.intervalCount} int
                            </Badge>
                          )}
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="px-3 pb-3">
                    <div className="mt-2 space-y-3 pl-10">
                      {/* Data Summary */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
                        <div className="p-2 bg-background rounded">
                          <p className="text-lg font-bold">{data.frequencyCount}</p>
                          <p className="text-xs text-muted-foreground">Frequency</p>
                        </div>
                        <div className="p-2 bg-background rounded">
                          <p className="text-lg font-bold">{data.abcCount}</p>
                          <p className="text-xs text-muted-foreground">ABC Entries</p>
                        </div>
                        <div className="p-2 bg-background rounded">
                          <p className="text-lg font-bold">{data.intervalCount}</p>
                          <p className="text-xs text-muted-foreground">Intervals</p>
                        </div>
                        <div className="p-2 bg-background rounded">
                          <p className="text-lg font-bold">{formatDuration(data.durationSeconds)}</p>
                          <p className="text-xs text-muted-foreground">Duration</p>
                        </div>
                      </div>

                      {/* Behavior breakdown */}
                      {data.frequencyEntries.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Behavior Breakdown</p>
                          <div className="flex flex-wrap gap-1">
                            {data.frequencyEntries.map((entry, idx) => {
                              const behavior = student?.behaviors.find(b => b.id === entry.behaviorId);
                              return (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {behavior?.name || 'Unknown'}: {entry.count}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* ABC summary */}
                      {data.abcEntries.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">ABC Summary</p>
                          <div className="text-xs text-muted-foreground">
                            {data.abcEntries.slice(0, 3).map((entry, idx) => (
                              <p key={idx} className="truncate">
                                A: {entry.antecedent} → B: {entry.behavior} → C: {entry.consequence}
                              </p>
                            ))}
                            {data.abcEntries.length > 3 && (
                              <p className="text-primary">+{data.abcEntries.length - 3} more entries</p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Session notes */}
                      {session.notes && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            Notes
                          </p>
                          <p className="text-xs text-muted-foreground bg-background p-2 rounded">
                            {session.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}

            {observationSessions.length > 20 && (
              <p className="text-xs text-muted-foreground text-center py-2">
                + {observationSessions.length - 20} more observations
              </p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
