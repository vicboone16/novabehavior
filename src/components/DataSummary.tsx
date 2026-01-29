import { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { BarChart3, FileText, Trash2, Download, Save, StickyNote, Clock, Eye, EyeOff, Minimize2, Maximize2, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useDataStore } from '@/store/dataStore';
import { SessionHistory } from './SessionHistory';
import { SessionLengthManager } from './SessionLengthManager';
import { SessionReportGenerator } from './SessionReportGenerator';
import { ABCReportGenerator } from './ABCReportGenerator';
import { toast } from '@/hooks/use-toast';
import { ConfirmDialog } from '@/components/ui/alert-dialog-confirm';
import { useAutoSave } from '@/hooks/useAutoSave';

export function DataSummary() {
  const { 
    students,
    selectedStudentIds,
    abcEntries, 
    frequencyEntries, 
    durationEntries, 
    intervalEntries,
    sessionNotes,
    sessionLengthMinutes,
    showTimestamps,
    setShowTimestamps,
    setSessionNotes,
    saveSession,
    hasUnsavedChanges,
    resetSessionData,
    getEffectiveSessionLength 
  } = useDataStore();

  const [showNotes, setShowNotes] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showNoChangesWarning, setShowNoChangesWarning] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  // Auto-save hook
  const { lastAutoSave, isAutoSaving } = useAutoSave();

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

  const formatTime = (date: Date) => {
    return format(new Date(date), 'HH:mm:ss');
  };

  const calculateHourlyRate = (count: number, sessionMinutes: number) => {
    if (sessionMinutes <= 0) return 0;
    return ((count / sessionMinutes) * 60).toFixed(1);
  };

  const handleSaveSession = () => {
    const result = saveSession();
    
    if (!result.hasChanges) {
      // No changes since last save - show warning
      setShowNoChangesWarning(true);
      return;
    }
    
    if (result.saved) {
      // Successfully saved - show confirmation toast
      toast({
        title: "Session Saved",
        description: (
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            <span>Your session data has been saved successfully.</span>
          </div>
        ),
        duration: 4000,
      });
    } else {
      // No data to save
      toast({
        title: "No Data to Save",
        description: "There is no session data to save.",
        variant: "destructive",
      });
    }
  };

  const exportToCSV = () => {
    let csv = 'Student,Behavior,Type,Value,HourlyRate,Timestamp\n';
    
    // Frequency entries with hourly rate
    frequencyEntries.forEach(entry => {
      const student = students.find(s => s.id === entry.studentId);
      const behavior = student?.behaviors.find(b => b.id === entry.behaviorId);
      const sessionLength = getEffectiveSessionLength(entry.studentId, entry.behaviorId);
      const hourlyRate = calculateHourlyRate(entry.count, sessionLength);
      csv += `"${student?.name || 'Unknown'}","${behavior?.name || 'Unknown'}","Frequency","${entry.count}","${hourlyRate}/hr","${new Date(entry.timestamp).toISOString()}"\n`;
      
      // Include individual timestamps if available
      if (entry.timestamps && showTimestamps) {
        entry.timestamps.forEach((ts, idx) => {
          csv += `"${student?.name || 'Unknown'}","${behavior?.name || 'Unknown'}","Frequency Event ${idx + 1}","1","","${new Date(ts).toISOString()}"\n`;
        });
      }
    });

    // Duration entries
    durationEntries.filter(e => e.endTime).forEach(entry => {
      const student = students.find(s => s.id === entry.studentId);
      const behavior = student?.behaviors.find(b => b.id === entry.behaviorId);
      csv += `"${student?.name || 'Unknown'}","${behavior?.name || 'Unknown'}","Duration","${entry.duration}s","","${new Date(entry.startTime).toISOString()}"\n`;
    });

    // Interval entries
    intervalEntries.forEach(entry => {
      const student = students.find(s => s.id === entry.studentId);
      const behavior = student?.behaviors.find(b => b.id === entry.behaviorId);
      csv += `"${student?.name || 'Unknown'}","${behavior?.name || 'Unknown'}","Interval ${entry.intervalNumber + 1}","${entry.occurred ? 'Yes' : 'No'}","","${new Date(entry.timestamp).toISOString()}"\n`;
    });

    // ABC entries
    abcEntries.forEach(entry => {
      const student = students.find(s => s.id === entry.studentId);
      const functions = entry.functions?.join(';') || '';
      csv += `"${student?.name || 'Unknown'}","${entry.behavior}","ABC","A: ${entry.antecedent} | C: ${entry.consequence} | F: ${functions}","${entry.frequencyCount}x","${new Date(entry.timestamp).toISOString()}"\n`;
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
      sessionLengthMinutes,
      students: selectedStudents.map(s => ({
        name: s.name,
        behaviors: s.behaviors,
      })),
      frequencyEntries: frequencyEntries.map(e => ({
        ...e,
        hourlyRate: calculateHourlyRate(e.count, getEffectiveSessionLength(e.studentId, e.behaviorId)),
      })),
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

  // Calculate overall hourly rate
  const overallHourlyRate = calculateHourlyRate(totalFrequency, sessionLengthMinutes);

  // Minimized view
  if (isMinimized) {
    return (
      <div className="bg-card border border-border rounded-xl p-2 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Summary</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-2 text-xs">
              <Badge variant="secondary" className="h-5">{totalFrequency} freq</Badge>
              <Badge variant="secondary" className="h-5">{totalIntervals} int</Badge>
              <Badge variant="secondary" className="h-5">{totalABC} ABC</Badge>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsMinimized(false)}
              className="h-6 w-6 p-0"
            >
              <Maximize2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-foreground">Session Summary</h2>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <SessionLengthManager />
          <SessionHistory />
          <SessionReportGenerator />
          <ABCReportGenerator />
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
              
              {/* Timestamps Toggle */}
              <div className="flex items-center justify-between bg-secondary/50 rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2">
                  {showTimestamps ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  <Label htmlFor="show-timestamps">Show Timestamps</Label>
                </div>
                <Switch
                  id="show-timestamps"
                  checked={showTimestamps}
                  onCheckedChange={setShowTimestamps}
                />
              </div>

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
                          <div className="space-y-2">
                            {studentFreq.map(entry => {
                              const behavior = student.behaviors.find(b => b.id === entry.behaviorId);
                              const sessionLength = getEffectiveSessionLength(student.id, entry.behaviorId);
                              const hourlyRate = calculateHourlyRate(entry.count, sessionLength);
                              return (
                                <div key={entry.id} className="bg-secondary/30 rounded p-2">
                                  <div className="flex items-center justify-between">
                                    <Badge variant="secondary">
                                      {behavior?.name}: {entry.count}
                                    </Badge>
                                    <div className="flex items-center gap-2 text-xs">
                                      <Badge variant="outline" className="gap-1">
                                        <Clock className="w-3 h-3" />
                                        {hourlyRate}/hr
                                      </Badge>
                                      {showTimestamps && (
                                        <span className="text-muted-foreground">
                                          Started: {formatTime(entry.timestamp)}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  {showTimestamps && entry.timestamps && entry.timestamps.length > 0 && (
                                    <div className="mt-2 text-xs text-muted-foreground">
                                      <span className="font-medium">Event times: </span>
                                      {entry.timestamps.map((ts, idx) => (
                                        <span key={idx}>
                                          {formatTime(ts)}{idx < entry.timestamps!.length - 1 ? ', ' : ''}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {studentDur.length > 0 && (
                        <div className="mb-3">
                          <h5 className="text-xs font-medium text-muted-foreground mb-1">Duration</h5>
                          <div className="space-y-1">
                            {studentDur.map(entry => {
                              const behavior = student.behaviors.find(b => b.id === entry.behaviorId);
                              return (
                                <div key={entry.id} className="flex items-center justify-between bg-secondary/30 rounded p-2">
                                  <Badge variant="secondary">
                                    {behavior?.name}: {formatDuration(entry.duration)}
                                  </Badge>
                                  {showTimestamps && (
                                    <span className="text-xs text-muted-foreground">
                                      {formatTime(entry.startTime)} - {entry.endTime ? formatTime(entry.endTime) : 'ongoing'}
                                    </span>
                                  )}
                                </div>
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
                                const validEntries = entries.filter(e => !e.voided);
                                const voidedEntries = entries.filter(e => e.voided);
                                const occurred = validEntries.filter(e => e.occurred).length;
                                const presentIntervals = validEntries.length;
                                const totalIntervals = entries.length;
                                const percentage = presentIntervals > 0 ? Math.round((occurred / presentIntervals) * 100) : 0;
                                
                                return (
                                  <div key={behavior.id} className="bg-secondary/30 rounded p-2 mb-1">
                                    <div className="flex items-center justify-between">
                                      <Badge variant="secondary">
                                        {behavior.name}: {occurred}/{presentIntervals}
                                      </Badge>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium text-primary">
                                          {percentage}%
                                        </span>
                                        {voidedEntries.length > 0 && (
                                          <Badge variant="outline" className="text-[10px] h-5 text-muted-foreground">
                                            {voidedEntries.length} N/A
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                    {presentIntervals !== totalIntervals && (
                                      <p className="text-[10px] text-muted-foreground mt-1">
                                        Present: {presentIntervals}/{totalIntervals} intervals
                                      </p>
                                    )}
                                    {showTimestamps && entries.length > 0 && (
                                      <div className="mt-1 text-xs text-muted-foreground">
                                        {entries.slice(0, 5).map((e, idx) => (
                                          <span key={e.id}>
                                            Int {e.intervalNumber + 1}: {e.voided ? '—' : e.occurred ? '✓' : '✗'} ({formatTime(e.timestamp)})
                                            {idx < Math.min(4, entries.length - 1) ? ' | ' : ''}
                                          </span>
                                        ))}
                                        {entries.length > 5 && <span>... +{entries.length - 5} more</span>}
                                      </div>
                                    )}
                                  </div>
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
                                <div className="flex items-center justify-between mb-1">
                                  <div>
                                    <span className="text-antecedent font-medium">A:</span> {entry.antecedent} → 
                                    <span className="text-behavior font-medium ml-1">B:</span> {entry.behavior} → 
                                    <span className="text-consequence font-medium ml-1">C:</span> {entry.consequence}
                                  </div>
                                  {entry.frequencyCount > 1 && (
                                    <Badge variant="outline">{entry.frequencyCount}x</Badge>
                                  )}
                                </div>
                                {showTimestamps && (
                                  <div className="text-xs text-muted-foreground">
                                    {formatTime(entry.timestamp)}
                                    {entry.functions && entry.functions.length > 0 && (
                                      <span className="ml-2">| Functions: {entry.functions.join(', ')}</span>
                                    )}
                                    {entry.hasDuration && entry.durationMinutes && (
                                      <span className="ml-2">| Duration: {entry.durationMinutes}m</span>
                                    )}
                                  </div>
                                )}
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
            onClick={() => {
              // If data is saved, just clear display; if unsaved, ask for confirmation
              if (hasUnsavedChanges()) {
                setShowClearConfirm(true);
              } else {
                resetSessionData();
              }
            }}
          >
            <Trash2 className="w-4 h-4" />
            Clear
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsMinimized(true)}
            className="h-8 w-8 p-0"
          >
            <Minimize2 className="w-4 h-4" />
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
          {totalFrequency > 0 && (
            <p className="text-xs text-info mt-1">{overallHourlyRate}/hr</p>
          )}
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
        <div className="flex flex-col gap-2">
          <div className="flex gap-2 flex-wrap items-center">
            <Button 
              size="sm" 
              onClick={handleSaveSession} 
              className="gap-2"
              variant={hasUnsavedChanges() ? "default" : "outline"}
              disabled={isAutoSaving}
            >
              {isAutoSaving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : hasUnsavedChanges() ? (
                <Save className="w-4 h-4" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-primary" />
              )}
              {isAutoSaving ? "Saving..." : hasUnsavedChanges() ? "Save Session" : "Saved"}
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
          
          {/* Auto-save status */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <RefreshCw className="w-3 h-3" />
            <span>
              Auto-save: {lastAutoSave 
                ? `Last saved ${formatDistanceToNow(lastAutoSave, { addSuffix: true })}` 
                : 'Enabled (every 2 min)'}
            </span>
            {!hasUnsavedChanges() && hasData && (
              <Badge variant="outline" className="text-[10px] h-4 px-1 gap-1">
                <CheckCircle2 className="w-2 h-2" />
                Up to date
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* No Changes Warning Dialog */}
      <ConfirmDialog
        open={showNoChangesWarning}
        onOpenChange={setShowNoChangesWarning}
        title="No Changes to Save"
        description="You haven't made any changes since your last save. Your data is already saved."
        confirmLabel="OK"
        cancelLabel="Close"
        onConfirm={() => setShowNoChangesWarning(false)}
      />
      
      {/* Clear Confirmation Dialog */}
      <ConfirmDialog
        open={showClearConfirm}
        onOpenChange={setShowClearConfirm}
        title="Clear Unsaved Data?"
        description="You have unsaved data that will be moved to the trash. Already-saved data will NOT be affected. Continue?"
        confirmLabel="Clear Display"
        cancelLabel="Cancel"
        onConfirm={() => {
          resetSessionData();
          setShowClearConfirm(false);
        }}
      />
    </div>
  );
}
