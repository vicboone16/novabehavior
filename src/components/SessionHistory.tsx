import { useState } from 'react';
import { format } from 'date-fns';
import { History, Calendar, User, Activity, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useDataStore } from '@/store/dataStore';
import { Session } from '@/types/behavior';

export function SessionHistory() {
  const { sessions, students, deleteSession } = useDataStore();
  const [filterDate, setFilterDate] = useState('');
  const [filterStudent, setFilterStudent] = useState<string>('all');
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());

  const toggleExpanded = (sessionId: string) => {
    setExpandedSessions(prev => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  };

  const filteredSessions = sessions
    .filter(session => {
      if (filterDate) {
        // Use local date (avoid UTC conversion which can shift days on mobile/timezones)
        const sessionDate = format(new Date(session.date), 'yyyy-MM-dd');
        if (sessionDate !== filterDate) return false;
      }
      if (filterStudent !== 'all') {
        if (!session.studentIds.includes(filterStudent)) return false;
      }
      return true;
    })
    // Sort by data collection date (most recent first)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getStudentName = (studentId: string) => {
    return students.find(s => s.id === studentId)?.name || 'Unknown';
  };

  const getStudentColor = (studentId: string) => {
    return students.find(s => s.id === studentId)?.color || '#888';
  };

  const getBehaviorName = (studentId: string, behaviorId: string) => {
    const student = students.find(s => s.id === studentId);
    return student?.behaviors.find(b => b.id === behaviorId)?.name || 'Unknown';
  };

  const renderSessionDetails = (session: Session) => {
    const sessionStudentIds = [...new Set([
      ...session.abcEntries.map(e => e.studentId),
      ...session.frequencyEntries.map(e => e.studentId),
      ...session.durationEntries.map(e => e.studentId),
      ...session.intervalEntries.map(e => e.studentId),
    ])];

    return (
      <div className="space-y-4 pt-3">
        {session.notes && (
          <div className="bg-muted/50 rounded-lg p-3">
            <h5 className="text-xs font-semibold text-muted-foreground mb-1">Session Notes</h5>
            <p className="text-sm">{session.notes}</p>
          </div>
        )}

        {sessionStudentIds.map(studentId => {
          const studentFreq = session.frequencyEntries.filter(e => e.studentId === studentId);
          const studentDur = session.durationEntries.filter(e => e.studentId === studentId);
          const studentInt = session.intervalEntries.filter(e => e.studentId === studentId);
          const studentABC = session.abcEntries.filter(e => e.studentId === studentId);

          if (studentFreq.length === 0 && studentDur.length === 0 && studentInt.length === 0 && studentABC.length === 0) {
            return null;
          }

          return (
            <div key={studentId} className="border border-border rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getStudentColor(studentId) }}
                />
                <span className="font-medium text-sm">{getStudentName(studentId)}</span>
              </div>

              <div className="space-y-2 text-sm">
                {studentFreq.length > 0 && (
                  <div>
                    <span className="text-xs text-muted-foreground">Frequency: </span>
                    {studentFreq.map((e, i) => (
                      <Badge key={e.id} variant="secondary" className="mr-1">
                        {getBehaviorName(studentId, e.behaviorId)}: {e.count}
                      </Badge>
                    ))}
                  </div>
                )}

                {studentDur.length > 0 && (
                  <div>
                    <span className="text-xs text-muted-foreground">Duration: </span>
                    {studentDur.map(e => (
                      <Badge key={e.id} variant="secondary" className="mr-1">
                        {getBehaviorName(studentId, e.behaviorId)}: {formatDuration(e.duration)}
                      </Badge>
                    ))}
                  </div>
                )}

                {studentInt.length > 0 && (
                  <div>
                    <span className="text-xs text-muted-foreground">Intervals: </span>
                    {(() => {
                      const byBehavior = studentInt.reduce((acc, e) => {
                        if (!acc[e.behaviorId]) acc[e.behaviorId] = { total: 0, occurred: 0 };
                        acc[e.behaviorId].total++;
                        if (e.occurred) acc[e.behaviorId].occurred++;
                        return acc;
                      }, {} as Record<string, { total: number; occurred: number }>);

                      return Object.entries(byBehavior).map(([behaviorId, data]) => (
                        <Badge key={behaviorId} variant="secondary" className="mr-1">
                          {getBehaviorName(studentId, behaviorId)}: {data.occurred}/{data.total}
                        </Badge>
                      ));
                    })()}
                  </div>
                )}

                {studentABC.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">ABC Entries:</span>
                    {studentABC.map(e => (
                      <div key={e.id} className="bg-secondary/30 rounded p-2 text-xs">
                        <span className="text-antecedent font-medium">A:</span> {e.antecedent} → 
                        <span className="text-behavior font-medium ml-1">B:</span> {e.behavior} → 
                        <span className="text-consequence font-medium ml-1">C:</span> {e.consequence}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <History className="w-4 h-4" />
          Session History
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            Session History
          </DialogTitle>
        </DialogHeader>

        {/* Filters */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1">
            <Input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full"
              placeholder="Filter by date"
            />
          </div>
          <Select value={filterStudent} onValueChange={setFilterStudent}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by student" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Students</SelectItem>
              {students.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Sessions List */}
        <div className="space-y-3">
          {filteredSessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No sessions found</p>
            </div>
          ) : (
            filteredSessions.map(session => (
              <Collapsible 
                key={session.id}
                open={expandedSessions.has(session.id)}
                onOpenChange={() => toggleExpanded(session.id)}
              >
                <div className="border border-border rounded-lg">
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-secondary/30">
                      <div className="flex items-center gap-3">
                        {expandedSessions.has(session.id) ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">
                              {format(new Date(session.date), 'MMM d, yyyy')}
                            </span>
                            <span className="text-muted-foreground text-sm">
                              {format(new Date(session.date), 'h:mm a')}
                            </span>
                          </div>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {session.frequencyEntries.reduce((sum, e) => sum + e.count, 0)} freq
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {session.durationEntries.length} dur
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {session.intervalEntries.length} int
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {session.abcEntries.length} abc
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSession(session.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="border-t border-border px-3 pb-3">
                      {renderSessionDetails(session)}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
