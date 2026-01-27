import { useMemo, useState, useRef } from 'react';
import { format } from 'date-fns';
import { FileText, Download, Printer, Filter, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useDataStore } from '@/store/dataStore';
import { Session } from '@/types/behavior';

export function SessionReportGenerator() {
  const { sessions, students } = useDataStore();
  const [selectedSessionId, setSelectedSessionId] = useState<string>('latest');
  const reportRef = useRef<HTMLDivElement>(null);

  const selectedSession = useMemo(() => {
    if (selectedSessionId === 'latest' && sessions.length > 0) {
      return sessions[sessions.length - 1];
    }
    return sessions.find(s => s.id === selectedSessionId);
  }, [sessions, selectedSessionId]);

  const getStudentName = (studentId: string) => 
    students.find(s => s.id === studentId)?.name || 'Unknown';

  const getStudentColor = (studentId: string) => 
    students.find(s => s.id === studentId)?.color || '#888';

  const getBehaviorName = (studentId: string, behaviorId: string) => {
    const student = students.find(s => s.id === studentId);
    return student?.behaviors.find(b => b.id === behaviorId)?.name || 'Unknown';
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const calculateHourlyRate = (count: number, sessionMinutes: number) => {
    if (sessionMinutes <= 0) return 0;
    return ((count / sessionMinutes) * 60).toFixed(1);
  };

  const handlePrint = () => {
    const printContent = reportRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Behavior Data Report - ${selectedSession ? format(new Date(selectedSession.date), 'yyyy-MM-dd') : 'Report'}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; }
          .report-header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
          .student-section { margin-bottom: 25px; page-break-inside: avoid; }
          .student-header { background: #f5f5f5; padding: 10px; border-radius: 5px; margin-bottom: 10px; }
          .data-section { margin-bottom: 15px; }
          .data-section h4 { margin: 0 0 8px 0; color: #666; font-size: 12px; text-transform: uppercase; }
          .interval-grid { display: flex; flex-wrap: wrap; gap: 4px; }
          .interval-box { width: 24px; height: 24px; border: 1px solid #ddd; display: flex; align-items: center; justify-content: center; font-size: 10px; border-radius: 3px; }
          .interval-yes { background: #22c55e; color: white; }
          .interval-no { background: #ef4444; color: white; }
          .interval-empty { background: #f5f5f5; color: #999; }
          .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 12px; margin-right: 5px; }
          .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
          .summary-box { text-align: center; padding: 10px; border: 1px solid #ddd; border-radius: 5px; }
          .summary-value { font-size: 24px; font-weight: bold; }
          .summary-label { font-size: 11px; color: #666; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
          th { background: #f5f5f5; }
          .notes-section { background: #fffbeb; padding: 10px; border-radius: 5px; margin-top: 15px; }
          @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleDownloadPDF = () => {
    // For PDF, we use the print dialog with "Save as PDF" option
    handlePrint();
  };

  if (sessions.length === 0) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <FileText className="w-4 h-4" />
            Reports
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Report</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No sessions to report</p>
            <p className="text-sm">Save a session first</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <FileText className="w-4 h-4" />
          Reports
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Session Report Generator
          </DialogTitle>
        </DialogHeader>

        {/* Controls */}
        <div className="flex items-center gap-3 py-2 border-b">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Select session" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="latest">Latest Session</SelectItem>
              {sessions.map(s => (
                <SelectItem key={s.id} value={s.id}>
                  {format(new Date(s.date), 'MMM dd, yyyy HH:mm')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
              <Printer className="w-4 h-4" />
              Print
            </Button>
            <Button size="sm" onClick={handleDownloadPDF} className="gap-2">
              <Download className="w-4 h-4" />
              Save as PDF
            </Button>
          </div>
        </div>

        {/* Report Preview */}
        <div className="flex-1 overflow-y-auto py-4">
          {selectedSession && (
            <div ref={reportRef} className="space-y-6">
              {/* Report Header */}
              <div className="report-header text-center border-b-2 border-foreground pb-4">
                <h1 className="text-xl font-bold">Behavior Data Collection Report</h1>
                <p className="text-muted-foreground">
                  {format(new Date(selectedSession.date), 'EEEE, MMMM d, yyyy')} at {format(new Date(selectedSession.date), 'h:mm a')}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Session Length: {selectedSession.sessionLengthMinutes || 60} minutes
                </p>
              </div>

              {/* Summary Stats */}
              <div className="summary-grid grid grid-cols-4 gap-3">
                <Card>
                  <CardContent className="pt-4 text-center">
                    <p className="text-2xl font-bold text-info">
                      {selectedSession.frequencyEntries.reduce((sum, e) => sum + e.count, 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">Total Frequency</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <p className="text-2xl font-bold text-warning">
                      {formatDuration(selectedSession.durationEntries.reduce((sum, e) => sum + e.duration, 0))}
                    </p>
                    <p className="text-xs text-muted-foreground">Total Duration</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <p className="text-2xl font-bold text-accent">
                      {selectedSession.intervalEntries.length}
                    </p>
                    <p className="text-xs text-muted-foreground">Intervals Recorded</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <p className="text-2xl font-bold text-primary">
                      {selectedSession.abcEntries.length}
                    </p>
                    <p className="text-xs text-muted-foreground">ABC Entries</p>
                  </CardContent>
                </Card>
              </div>

              {/* Student Sections */}
              {[...new Set([
                ...selectedSession.frequencyEntries.map(e => e.studentId),
                ...selectedSession.durationEntries.map(e => e.studentId),
                ...selectedSession.intervalEntries.map(e => e.studentId),
                ...selectedSession.abcEntries.map(e => e.studentId),
              ])].map(studentId => {
                const studentFreq = selectedSession.frequencyEntries.filter(e => e.studentId === studentId);
                const studentDur = selectedSession.durationEntries.filter(e => e.studentId === studentId);
                const studentInt = selectedSession.intervalEntries.filter(e => e.studentId === studentId);
                const studentABC = selectedSession.abcEntries.filter(e => e.studentId === studentId);
                const sessionLength = selectedSession.sessionLengthMinutes || 60;

                return (
                  <Card key={studentId} className="student-section">
                    <CardHeader 
                      className="pb-2"
                      style={{ borderLeft: `4px solid ${getStudentColor(studentId)}` }}
                    >
                      <CardTitle className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: getStudentColor(studentId) }}
                        />
                        {getStudentName(studentId)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Frequency Data */}
                      {studentFreq.length > 0 && (
                        <div className="data-section">
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                            Frequency Data
                          </h4>
                          <table className="w-full text-sm border">
                            <thead>
                              <tr className="bg-muted/50">
                                <th className="border p-2 text-left">Behavior</th>
                                <th className="border p-2 text-center">Count</th>
                                <th className="border p-2 text-center">Hourly Rate</th>
                                <th className="border p-2 text-left">Timestamps</th>
                              </tr>
                            </thead>
                            <tbody>
                              {studentFreq.map(entry => (
                                <tr key={entry.id}>
                                  <td className="border p-2">{getBehaviorName(studentId, entry.behaviorId)}</td>
                                  <td className="border p-2 text-center font-bold">{entry.count}</td>
                                  <td className="border p-2 text-center">
                                    {calculateHourlyRate(entry.count, sessionLength)}/hr
                                  </td>
                                  <td className="border p-2 text-xs text-muted-foreground">
                                    {entry.timestamps?.slice(0, 5).map((ts, i) => (
                                      <span key={i}>
                                        {format(new Date(ts), 'HH:mm:ss')}
                                        {i < Math.min(4, (entry.timestamps?.length || 0) - 1) ? ', ' : ''}
                                      </span>
                                    ))}
                                    {(entry.timestamps?.length || 0) > 5 && ` +${entry.timestamps!.length - 5} more`}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Duration Data */}
                      {studentDur.length > 0 && (
                        <div className="data-section">
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                            Duration Data
                          </h4>
                          <table className="w-full text-sm border">
                            <thead>
                              <tr className="bg-muted/50">
                                <th className="border p-2 text-left">Behavior</th>
                                <th className="border p-2 text-center">Duration</th>
                                <th className="border p-2 text-left">Start Time</th>
                                <th className="border p-2 text-left">End Time</th>
                              </tr>
                            </thead>
                            <tbody>
                              {studentDur.map(entry => (
                                <tr key={entry.id}>
                                  <td className="border p-2">{getBehaviorName(studentId, entry.behaviorId)}</td>
                                  <td className="border p-2 text-center font-bold">{formatDuration(entry.duration)}</td>
                                  <td className="border p-2 text-xs">{format(new Date(entry.startTime), 'HH:mm:ss')}</td>
                                  <td className="border p-2 text-xs">{entry.endTime ? format(new Date(entry.endTime), 'HH:mm:ss') : '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Interval Data - Detailed Grid */}
                      {studentInt.length > 0 && (
                        <div className="data-section">
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                            Interval Data (Detailed)
                          </h4>
                          {(() => {
                            const byBehavior = studentInt.reduce((acc, e) => {
                              if (!acc[e.behaviorId]) acc[e.behaviorId] = [];
                              acc[e.behaviorId].push(e);
                              return acc;
                            }, {} as Record<string, typeof studentInt>);

                            return Object.entries(byBehavior).map(([behaviorId, entries]) => {
                              const sorted = entries.sort((a, b) => a.intervalNumber - b.intervalNumber);
                              const occurred = sorted.filter(e => e.occurred).length;
                              const total = sorted.length;
                              const percentage = total > 0 ? Math.round((occurred / total) * 100) : 0;

                              // Get all interval numbers to show gaps
                              const maxInterval = Math.max(...sorted.map(e => e.intervalNumber));
                              const intervals = Array.from({ length: maxInterval + 1 }, (_, i) => {
                                const entry = sorted.find(e => e.intervalNumber === i);
                                return { num: i + 1, entry };
                              });

                              return (
                                <div key={behaviorId} className="mb-4 p-3 bg-muted/30 rounded-lg">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium">{getBehaviorName(studentId, behaviorId)}</span>
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline">
                                        {occurred}/{total} ({percentage}%)
                                      </Badge>
                                    </div>
                                  </div>
                                  <div className="interval-grid flex flex-wrap gap-1">
                                    {intervals.map(({ num, entry }) => (
                                      <div
                                        key={num}
                                        className={`
                                          w-7 h-7 rounded flex items-center justify-center text-xs font-medium border
                                          ${entry?.occurred 
                                            ? 'bg-green-500 text-white border-green-600' 
                                            : entry?.occurred === false 
                                              ? 'bg-red-500 text-white border-red-600'
                                              : 'bg-muted text-muted-foreground border-border'}
                                        `}
                                        title={entry ? `Interval ${num}: ${entry.occurred ? 'Yes' : 'No'} at ${format(new Date(entry.timestamp), 'HH:mm:ss')}` : `Interval ${num}: Not recorded`}
                                      >
                                        {entry?.occurred ? (
                                          <CheckCircle className="w-4 h-4" />
                                        ) : entry?.occurred === false ? (
                                          <XCircle className="w-4 h-4" />
                                        ) : (
                                          num
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                  <div className="mt-2 text-xs text-muted-foreground">
                                    <span className="inline-flex items-center gap-1 mr-3">
                                      <CheckCircle className="w-3 h-3 text-green-500" /> = Occurred
                                    </span>
                                    <span className="inline-flex items-center gap-1">
                                      <XCircle className="w-3 h-3 text-red-500" /> = Did not occur
                                    </span>
                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      )}

                      {/* ABC Data */}
                      {studentABC.length > 0 && (
                        <div className="data-section">
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                            ABC Data
                          </h4>
                          <table className="w-full text-sm border">
                            <thead>
                              <tr className="bg-muted/50">
                                <th className="border p-2 text-left">Time</th>
                                <th className="border p-2 text-left">Antecedent</th>
                                <th className="border p-2 text-left">Behavior</th>
                                <th className="border p-2 text-left">Consequence</th>
                                <th className="border p-2 text-center">Count</th>
                                <th className="border p-2 text-left">Function(s)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {studentABC.map(entry => (
                                <tr key={entry.id}>
                                  <td className="border p-2 text-xs">{format(new Date(entry.timestamp), 'HH:mm:ss')}</td>
                                  <td className="border p-2 text-xs">{entry.antecedent}</td>
                                  <td className="border p-2 text-xs font-medium">{entry.behavior}</td>
                                  <td className="border p-2 text-xs">{entry.consequence}</td>
                                  <td className="border p-2 text-center">{entry.frequencyCount || 1}</td>
                                  <td className="border p-2 text-xs">{entry.functions?.join(', ') || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}

              {/* Session Notes */}
              {selectedSession.notes && (
                <Card className="notes-section bg-amber-50 dark:bg-amber-950/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Session Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{selectedSession.notes}</p>
                  </CardContent>
                </Card>
              )}

              {/* Footer */}
              <Separator />
              <p className="text-xs text-center text-muted-foreground">
                Generated by Behavior Data Collector • {format(new Date(), 'MMMM d, yyyy')}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}