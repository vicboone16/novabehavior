import { useState } from 'react';
import { BarChart3, FileText, Trash2, Download, Save, StickyNote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useDataStore } from '@/store/dataStore';
import { SessionHistory } from './SessionHistory';

export function DataSummary() {
  const { 
    students,
    selectedStudentIds,
    abcEntries, 
    frequencyEntries, 
    durationEntries, 
    intervalEntries,
    sessionNotes,
    setSessionNotes,
    saveSession,
    resetSessionData 
  } = useDataStore();

  const [showNotes, setShowNotes] = useState(false);

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

  const handleSaveSession = () => {
    saveSession();
  };

  const exportToCSV = () => {
    let csv = 'Student,Behavior,Type,Value,Timestamp\n';
    
    // Frequency entries
    frequencyEntries.forEach(entry => {
      const student = students.find(s => s.id === entry.studentId);
      const behavior = student?.behaviors.find(b => b.id === entry.behaviorId);
      csv += `"${student?.name || 'Unknown'}","${behavior?.name || 'Unknown'}","Frequency","${entry.count}","${new Date(entry.timestamp).toISOString()}"\n`;
    });

    // Duration entries
    durationEntries.filter(e => e.endTime).forEach(entry => {
      const student = students.find(s => s.id === entry.studentId);
      const behavior = student?.behaviors.find(b => b.id === entry.behaviorId);
      csv += `"${student?.name || 'Unknown'}","${behavior?.name || 'Unknown'}","Duration","${entry.duration}s","${new Date(entry.startTime).toISOString()}"\n`;
    });

    // Interval entries
    intervalEntries.forEach(entry => {
      const student = students.find(s => s.id === entry.studentId);
      const behavior = student?.behaviors.find(b => b.id === entry.behaviorId);
      csv += `"${student?.name || 'Unknown'}","${behavior?.name || 'Unknown'}","Interval ${entry.intervalNumber + 1}","${entry.occurred ? 'Yes' : 'No'}","${new Date(entry.timestamp).toISOString()}"\n`;
    });

    // ABC entries
    abcEntries.forEach(entry => {
      const student = students.find(s => s.id === entry.studentId);
      csv += `"${student?.name || 'Unknown'}","${entry.behavior}","ABC","A: ${entry.antecedent} | C: ${entry.consequence}","${new Date(entry.timestamp).toISOString()}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `behavior-data-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToJSON = () => {
    const data = {
      exportDate: new Date().toISOString(),
      notes: sessionNotes,
      students: selectedStudents.map(s => ({
        name: s.name,
        behaviors: s.behaviors,
      })),
      frequencyEntries,
      durationEntries: durationEntries.filter(e => e.endTime),
      intervalEntries,
      abcEntries,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `behavior-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const hasData = totalABC > 0 || totalFrequency > 0 || totalDuration > 0 || totalIntervals > 0;

  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-foreground">Session Summary</h2>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <SessionHistory />
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
                              .filter(b => (b.methods || [b.type]).includes('interval'))
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
            Clear
          </Button>
        </div>
      </div>

      {/* Session Notes */}
      <Collapsible open={showNotes} onOpenChange={setShowNotes} className="mb-4">
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2 w-full justify-start">
            <StickyNote className="w-4 h-4" />
            Session Notes
            {sessionNotes && <Badge variant="secondary" className="ml-2">Has notes</Badge>}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <Textarea
            placeholder="Add notes about this session..."
            value={sessionNotes}
            onChange={(e) => setSessionNotes(e.target.value)}
            className="min-h-[80px]"
          />
        </CollapsibleContent>
      </Collapsible>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
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

      {/* Export & Save Actions */}
      {hasData && (
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" onClick={handleSaveSession} className="gap-2">
            <Save className="w-4 h-4" />
            Save Session
          </Button>
          <Button size="sm" variant="outline" onClick={exportToCSV} className="gap-2">
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
          <Button size="sm" variant="outline" onClick={exportToJSON} className="gap-2">
            <Download className="w-4 h-4" />
            Export JSON
          </Button>
        </div>
      )}
    </div>
  );
}
