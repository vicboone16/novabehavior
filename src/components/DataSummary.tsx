import { BarChart3, FileText, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useDataStore } from '@/store/dataStore';

export function DataSummary() {
  const { 
    students,
    selectedStudentIds,
    abcEntries, 
    frequencyEntries, 
    durationEntries, 
    intervalEntries,
    resetSessionData 
  } = useDataStore();

  const selectedStudents = students.filter(s => selectedStudentIds.includes(s.id));

  const totalABC = abcEntries.length;
  const totalFrequency = frequencyEntries.reduce((sum, e) => sum + e.count, 0);
  const totalDuration = durationEntries
    .filter(e => e.endTime)
    .reduce((sum, e) => sum + e.duration, 0);
  const totalIntervals = intervalEntries.length;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-foreground">Session Summary</h2>
        </div>
        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <FileText className="w-4 h-4" />
                View Details
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Session Data Details</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                {selectedStudents.map(student => {
                  const studentABC = abcEntries.filter(e => e.studentId === student.id);
                  const studentFreq = frequencyEntries.filter(e => e.studentId === student.id);
                  const studentDur = durationEntries.filter(e => e.studentId === student.id && e.endTime);
                  const studentInt = intervalEntries.filter(e => e.studentId === student.id);

                  return (
                    <div key={student.id} className="border border-border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: student.color }}
                        />
                        <h4 className="font-semibold">{student.name}</h4>
                      </div>

                      {studentFreq.length > 0 && (
                        <div className="mb-3">
                          <h5 className="text-xs font-medium text-muted-foreground mb-1">Frequency</h5>
                          <div className="flex flex-wrap gap-2">
                            {studentFreq.map(entry => {
                              const behavior = student.behaviors.find(b => b.id === entry.behaviorId);
                              return (
                                <Badge key={entry.id} variant="secondary">
                                  {behavior?.name}: {entry.count}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {studentDur.length > 0 && (
                        <div className="mb-3">
                          <h5 className="text-xs font-medium text-muted-foreground mb-1">Duration</h5>
                          <div className="flex flex-wrap gap-2">
                            {studentDur.map(entry => {
                              const behavior = student.behaviors.find(b => b.id === entry.behaviorId);
                              return (
                                <Badge key={entry.id} variant="secondary">
                                  {behavior?.name}: {formatDuration(entry.duration)}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {studentInt.length > 0 && (
                        <div className="mb-3">
                          <h5 className="text-xs font-medium text-muted-foreground mb-1">Interval</h5>
                          <div className="text-sm">
                            {student.behaviors
                              .filter(b => b.type === 'interval')
                              .map(behavior => {
                                const entries = studentInt.filter(e => e.behaviorId === behavior.id);
                                const occurred = entries.filter(e => e.occurred).length;
                                return (
                                  <Badge key={behavior.id} variant="secondary" className="mr-2">
                                    {behavior.name}: {occurred}/{entries.length}
                                  </Badge>
                                );
                              })}
                          </div>
                        </div>
                      )}

                      {studentABC.length > 0 && (
                        <div>
                          <h5 className="text-xs font-medium text-muted-foreground mb-1">ABC Entries</h5>
                          <div className="space-y-1 text-sm">
                            {studentABC.map(entry => (
                              <div key={entry.id} className="bg-secondary/50 rounded p-2">
                                <span className="text-antecedent font-medium">A:</span> {entry.antecedent} → 
                                <span className="text-behavior font-medium ml-1">B:</span> {entry.behavior} → 
                                <span className="text-consequence font-medium ml-1">C:</span> {entry.consequence}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {studentABC.length === 0 && studentFreq.length === 0 && studentDur.length === 0 && studentInt.length === 0 && (
                        <p className="text-muted-foreground text-sm">No data recorded</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </DialogContent>
          </Dialog>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2 text-destructive hover:text-destructive"
            onClick={resetSessionData}
          >
            <Trash2 className="w-4 h-4" />
            Clear Session
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-info/10 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-info">{totalFrequency}</p>
          <p className="text-xs text-muted-foreground">Frequency Events</p>
        </div>
        <div className="bg-warning/10 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-warning">{formatDuration(totalDuration)}</p>
          <p className="text-xs text-muted-foreground">Total Duration</p>
        </div>
        <div className="bg-accent/10 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-accent">{totalIntervals}</p>
          <p className="text-xs text-muted-foreground">Intervals Recorded</p>
        </div>
        <div className="bg-antecedent/10 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-antecedent">{totalABC}</p>
          <p className="text-xs text-muted-foreground">ABC Entries</p>
        </div>
      </div>
    </div>
  );
}
