import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { 
  History, Calendar, User, Download, FileJson, FileSpreadsheet,
  ChevronDown, ChevronRight, Trash2, Filter, BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDataStore } from '@/store/dataStore';
import { Session, IntervalEntry } from '@/types/behavior';

export function SessionDataReview() {
  const { sessions, students, deleteSession } = useDataStore();
  const [filterDate, setFilterDate] = useState('');
  const [filterStudent, setFilterStudent] = useState<string>('all');
  const [filterBehavior, setFilterBehavior] = useState<string>('all');
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());

  // Get all behaviors across all students
  const allBehaviors = useMemo(() => {
    const behaviors: { id: string; name: string }[] = [];
    students.forEach(student => {
      student.behaviors.forEach(b => {
        if (!behaviors.find(x => x.id === b.id)) {
          behaviors.push({ id: b.id, name: b.name });
        }
      });
    });
    return behaviors;
  }, [students]);

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

  const filteredSessions = useMemo(() => {
    return sessions.filter(session => {
      if (filterDate) {
        const sessionDate = new Date(session.date).toISOString().split('T')[0];
        if (sessionDate !== filterDate) return false;
      }
      if (filterStudent !== 'all') {
        const hasStudent = 
          session.studentIds.includes(filterStudent) ||
          session.frequencyEntries.some(e => e.studentId === filterStudent) ||
          session.durationEntries.some(e => e.studentId === filterStudent) ||
          session.intervalEntries.some(e => e.studentId === filterStudent) ||
          session.abcEntries.some(e => e.studentId === filterStudent);
        if (!hasStudent) return false;
      }
      if (filterBehavior !== 'all') {
        const hasBehavior = 
          session.frequencyEntries.some(e => e.behaviorId === filterBehavior) ||
          session.durationEntries.some(e => e.behaviorId === filterBehavior) ||
          session.intervalEntries.some(e => e.behaviorId === filterBehavior) ||
          session.abcEntries.some(e => e.behaviorId === filterBehavior);
        if (!hasBehavior) return false;
      }
      return true;
    });
  }, [sessions, filterDate, filterStudent, filterBehavior]);

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
    const name = student?.behaviors.find(b => b.id === behaviorId)?.name;
    if (name) return name;
    return `Unnamed Behavior (${behaviorId.slice(0, 6)})`;
  };

  const exportSessionAsCSV = (session: Session) => {
    const rows: string[] = [];
    rows.push('Type,Student,Behavior,Value,Timestamp,Notes');
    
    session.frequencyEntries.forEach(e => {
      rows.push(`Frequency,${getStudentName(e.studentId)},${getBehaviorName(e.studentId, e.behaviorId)},${e.count},${new Date(e.timestamp).toISOString()},`);
    });
    
    session.durationEntries.forEach(e => {
      rows.push(`Duration,${getStudentName(e.studentId)},${getBehaviorName(e.studentId, e.behaviorId)},${e.duration}s,${new Date(e.startTime).toISOString()},`);
    });
    
    session.intervalEntries.forEach(e => {
      rows.push(`Interval,${getStudentName(e.studentId)},${getBehaviorName(e.studentId, e.behaviorId)},${e.occurred ? 'Yes' : 'No'} (Int ${e.intervalNumber + 1}),${new Date(e.timestamp).toISOString()},`);
    });
    
    session.abcEntries.forEach(e => {
      rows.push(`ABC,${getStudentName(e.studentId)},${getBehaviorName(e.studentId, e.behaviorId)},"A:${e.antecedent} B:${e.behavior} C:${e.consequence}",${new Date(e.timestamp).toISOString()},`);
    });

    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session-${format(new Date(session.date), 'yyyy-MM-dd-HHmm')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportSessionAsJSON = (session: Session) => {
    const data = {
      ...session,
      studentNames: session.studentIds.map(id => ({ id, name: getStudentName(id) })),
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session-${format(new Date(session.date), 'yyyy-MM-dd-HHmm')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAllAsCSV = () => {
    const rows: string[] = [];
    rows.push('Session Date,Type,Student,Behavior,Value,Timestamp,Notes');
    
    filteredSessions.forEach(session => {
      const sessionDate = format(new Date(session.date), 'yyyy-MM-dd HH:mm');
      
      session.frequencyEntries.forEach(e => {
        rows.push(`${sessionDate},Frequency,${getStudentName(e.studentId)},${getBehaviorName(e.studentId, e.behaviorId)},${e.count},${new Date(e.timestamp).toISOString()},${session.notes || ''}`);
      });
      
      session.durationEntries.forEach(e => {
        rows.push(`${sessionDate},Duration,${getStudentName(e.studentId)},${getBehaviorName(e.studentId, e.behaviorId)},${e.duration}s,${new Date(e.startTime).toISOString()},${session.notes || ''}`);
      });
      
      session.intervalEntries.forEach(e => {
        rows.push(`${sessionDate},Interval,${getStudentName(e.studentId)},${getBehaviorName(e.studentId, e.behaviorId)},${e.occurred ? 'Yes' : 'No'} (Int ${e.intervalNumber + 1}),${new Date(e.timestamp).toISOString()},${session.notes || ''}`);
      });
      
      session.abcEntries.forEach(e => {
        rows.push(`${sessionDate},ABC,${getStudentName(e.studentId)},${getBehaviorName(e.studentId, e.behaviorId)},"A:${e.antecedent} B:${e.behavior} C:${e.consequence}",${new Date(e.timestamp).toISOString()},${session.notes || ''}`);
      });
    });

    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `all-sessions-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Calculate summary statistics
  const getSummaryStats = (session: Session) => {
    const stats: Record<string, { student: string; behavior: string; type: string; value: string }[]> = {};
    
    session.frequencyEntries.forEach(e => {
      const key = `${e.studentId}-freq`;
      if (!stats[key]) stats[key] = [];
      stats[key].push({
        student: getStudentName(e.studentId),
        behavior: getBehaviorName(e.studentId, e.behaviorId),
        type: 'Frequency',
        value: `${e.count} occurrences`
      });
    });

    session.durationEntries.forEach(e => {
      const key = `${e.studentId}-dur`;
      if (!stats[key]) stats[key] = [];
      stats[key].push({
        student: getStudentName(e.studentId),
        behavior: getBehaviorName(e.studentId, e.behaviorId),
        type: 'Duration',
        value: formatDuration(e.duration)
      });
    });

    // Aggregate interval data
    const intervalByBehavior: Record<string, { studentId: string; occurred: number; total: number }> = {};
    session.intervalEntries.forEach(e => {
      const key = `${e.studentId}-${e.behaviorId}`;
      if (!intervalByBehavior[key]) {
        intervalByBehavior[key] = { studentId: e.studentId, occurred: 0, total: 0 };
      }
      intervalByBehavior[key].total++;
      if (e.occurred) intervalByBehavior[key].occurred++;
    });

    Object.entries(intervalByBehavior).forEach(([key, data]) => {
      const [studentId, behaviorId] = key.split('-');
      const percentage = data.total > 0 ? Math.round((data.occurred / data.total) * 100) : 0;
      const statKey = `${studentId}-int`;
      if (!stats[statKey]) stats[statKey] = [];
      stats[statKey].push({
        student: getStudentName(studentId),
        behavior: getBehaviorName(studentId, behaviorId),
        type: 'Interval',
        value: `${data.occurred}/${data.total} (${percentage}%)`
      });
    });

    return stats;
  };

  const renderSessionDetails = (session: Session) => {
    const stats = getSummaryStats(session);
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

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sessionStudentIds.map(studentId => {
            const studentFreq = session.frequencyEntries.filter(e => e.studentId === studentId);
            const studentDur = session.durationEntries.filter(e => e.studentId === studentId);
            const studentInt = session.intervalEntries.filter(e => e.studentId === studentId);
            const studentABC = session.abcEntries.filter(e => e.studentId === studentId);

            if (studentFreq.length === 0 && studentDur.length === 0 && studentInt.length === 0 && studentABC.length === 0) {
              return null;
            }

            return (
              <Card key={studentId} className="border">
                <CardHeader className="py-2 px-3">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: getStudentColor(studentId) }}
                    />
                    <CardTitle className="text-sm">{getStudentName(studentId)}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="py-2 px-3 space-y-2 text-sm">
                  {studentFreq.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      <span className="text-xs text-muted-foreground w-full">Frequency:</span>
                      {studentFreq.map((e) => (
                        <Badge key={e.id} variant="secondary" className="text-xs">
                          {getBehaviorName(studentId, e.behaviorId)}: {e.count}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {studentDur.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      <span className="text-xs text-muted-foreground w-full">Duration:</span>
                      {studentDur.map(e => (
                        <Badge key={e.id} variant="secondary" className="text-xs">
                          {getBehaviorName(studentId, e.behaviorId)}: {formatDuration(e.duration)}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {studentInt.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      <span className="text-xs text-muted-foreground w-full">Intervals:</span>
                      {(() => {
                        const byBehavior = studentInt.reduce((acc, e) => {
                          if (!acc[e.behaviorId]) acc[e.behaviorId] = { total: 0, occurred: 0 };
                          acc[e.behaviorId].total++;
                          if (e.occurred) acc[e.behaviorId].occurred++;
                          return acc;
                        }, {} as Record<string, { total: number; occurred: number }>);

                        return Object.entries(byBehavior).map(([behaviorId, data]) => {
                          const pct = Math.round((data.occurred / data.total) * 100);
                          return (
                            <Badge key={behaviorId} variant="secondary" className="text-xs">
                              {getBehaviorName(studentId, behaviorId)}: {data.occurred}/{data.total} ({pct}%)
                            </Badge>
                          );
                        });
                      })()}
                    </div>
                  )}

                  {studentABC.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">ABC Entries ({studentABC.length}):</span>
                      {studentABC.slice(0, 3).map(e => (
                        <div key={e.id} className="bg-secondary/30 rounded p-1.5 text-xs">
                          <span className="text-primary font-medium">A:</span> {e.antecedent} → 
                          <span className="text-primary font-medium ml-1">B:</span> {e.behavior} → 
                          <span className="text-primary font-medium ml-1">C:</span> {e.consequence}
                        </div>
                      ))}
                      {studentABC.length > 3 && (
                        <p className="text-xs text-muted-foreground">+{studentABC.length - 3} more entries</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <BarChart3 className="w-4 h-4" />
          Review Data
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            Session Data Review & Export
          </DialogTitle>
        </DialogHeader>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 py-2 border-b">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Filter:</span>
          </div>
          <Input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="w-[150px] h-8"
          />
          <Select value={filterStudent} onValueChange={setFilterStudent}>
            <SelectTrigger className="w-[150px] h-8">
              <SelectValue placeholder="All Students" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Students</SelectItem>
              {students.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterBehavior} onValueChange={setFilterBehavior}>
            <SelectTrigger className="w-[150px] h-8">
              <SelectValue placeholder="All Behaviors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Behaviors</SelectItem>
              {allBehaviors.map(b => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            size="sm" 
            variant="outline" 
            className="ml-auto gap-2"
            onClick={exportAllAsCSV}
            disabled={filteredSessions.length === 0}
          >
            <Download className="w-4 h-4" />
            Export All CSV
          </Button>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto space-y-3 py-2">
          {filteredSessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No sessions found</p>
              <p className="text-sm">Save a session to see it here</p>
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
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            exportSessionAsCSV(session);
                          }}
                          title="Export as CSV"
                        >
                          <FileSpreadsheet className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            exportSessionAsJSON(session);
                          }}
                          title="Export as JSON"
                        >
                          <FileJson className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSession(session.id);
                          }}
                          title="Delete session"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
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
