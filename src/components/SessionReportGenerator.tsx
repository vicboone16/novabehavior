import { useMemo, useState, useRef } from 'react';
import { format } from 'date-fns';
import { FileText, Download, Printer, Filter, CheckCircle, XCircle, Clock, MinusCircle, UserPlus, UserMinus, AlertTriangle, User, Activity, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDataStore } from '@/store/dataStore';
import { Session, IntervalEntry, DataCollectionMethod, METHOD_LABELS } from '@/types/behavior';
import { generateGenericDocxReport } from '@/lib/insuranceReportExport';
import { toast } from 'sonner';

const SAMPLING_TYPE_LABELS: Record<string, string> = {
  partial: 'Partial Interval Recording',
  whole: 'Whole Interval Recording',
  momentary: 'Momentary Time Sampling',
};

export function SessionReportGenerator() {
  const { sessions, students, studentIntervalStatus, sessionConfig } = useDataStore();
  const [selectedSessionId, setSelectedSessionId] = useState<string>('latest');
  const reportRef = useRef<HTMLDivElement>(null);
  
  // Filtering state
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [selectedBehaviorIds, setSelectedBehaviorIds] = useState<string[]>([]);
  const [selectedMethods, setSelectedMethods] = useState<DataCollectionMethod[]>([]);
  const [showIntervalDetailTable, setShowIntervalDetailTable] = useState<boolean>(false);

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
    const name = student?.behaviors.find(b => b.id === behaviorId)?.name;
    if (name) return name;
    return `Unnamed Behavior (${behaviorId.slice(0, 6)})`;
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

  const getVoidReasonLabel = (reason?: IntervalEntry['voidReason'], custom?: string) => {
    if (!reason) return 'N/A';
    if (reason === 'other' && custom) return custom;
    const labels: Record<string, string> = {
      late_arrival: 'Late Arrival',
      early_departure: 'Early Departure',
      not_present: 'Not Present',
      fire_drill: 'Fire Drill',
      break: 'Break/Lunch',
      transition: 'Transition',
      other: 'Other',
    };
    return labels[reason] || reason;
  };

  // Get unique students from selected session
  const sessionStudentIds = useMemo(() => {
    if (!selectedSession) return [];
    return [...new Set([
      ...selectedSession.frequencyEntries.map(e => e.studentId),
      ...selectedSession.durationEntries.map(e => e.studentId),
      ...selectedSession.intervalEntries.map(e => e.studentId),
      ...selectedSession.abcEntries.map(e => e.studentId),
    ])];
  }, [selectedSession]);

  // Get unique behaviors from selected session
  const sessionBehaviors = useMemo(() => {
    if (!selectedSession) return [];
    const behaviors = new Map<string, { id: string; name: string; studentId: string }>();
    
    selectedSession.frequencyEntries.forEach(e => {
      behaviors.set(e.behaviorId, { id: e.behaviorId, name: getBehaviorName(e.studentId, e.behaviorId), studentId: e.studentId });
    });
    selectedSession.durationEntries.forEach(e => {
      behaviors.set(e.behaviorId, { id: e.behaviorId, name: getBehaviorName(e.studentId, e.behaviorId), studentId: e.studentId });
    });
    selectedSession.intervalEntries.forEach(e => {
      behaviors.set(e.behaviorId, { id: e.behaviorId, name: getBehaviorName(e.studentId, e.behaviorId), studentId: e.studentId });
    });
    
    return Array.from(behaviors.values());
  }, [selectedSession, students]);

  // Available methods in session
  const sessionMethods = useMemo(() => {
    if (!selectedSession) return [];
    const methods: DataCollectionMethod[] = [];
    if (selectedSession.frequencyEntries.length > 0) methods.push('frequency');
    if (selectedSession.durationEntries.length > 0) methods.push('duration');
    if (selectedSession.intervalEntries.length > 0) methods.push('interval');
    if (selectedSession.abcEntries.length > 0) methods.push('abc');
    return methods;
  }, [selectedSession]);

  // Filter helpers
  const toggleStudent = (studentId: string) => {
    setSelectedStudentIds(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const toggleBehavior = (behaviorId: string) => {
    setSelectedBehaviorIds(prev => 
      prev.includes(behaviorId) 
        ? prev.filter(id => id !== behaviorId)
        : [...prev, behaviorId]
    );
  };

  const toggleMethod = (method: DataCollectionMethod) => {
    setSelectedMethods(prev => 
      prev.includes(method) 
        ? prev.filter(m => m !== method)
        : [...prev, method]
    );
  };

  // Apply filters to session data
  const filteredData = useMemo(() => {
    if (!selectedSession) return null;

    const filterByStudent = (entry: { studentId: string }) => 
      selectedStudentIds.length === 0 || selectedStudentIds.includes(entry.studentId);
    
    const filterByBehavior = (entry: { behaviorId: string }) => 
      selectedBehaviorIds.length === 0 || selectedBehaviorIds.includes(entry.behaviorId);

    const includeMethod = (method: DataCollectionMethod) =>
      selectedMethods.length === 0 || selectedMethods.includes(method);

    return {
      frequencyEntries: includeMethod('frequency') 
        ? selectedSession.frequencyEntries.filter(e => filterByStudent(e) && filterByBehavior(e))
        : [],
      durationEntries: includeMethod('duration')
        ? selectedSession.durationEntries.filter(e => filterByStudent(e) && filterByBehavior(e))
        : [],
      intervalEntries: includeMethod('interval')
        ? selectedSession.intervalEntries.filter(e => filterByStudent(e) && filterByBehavior(e))
        : [],
      abcEntries: includeMethod('abc')
        ? selectedSession.abcEntries.filter(e => filterByStudent(e) && filterByBehavior(e))
        : [],
    };
  }, [selectedSession, selectedStudentIds, selectedBehaviorIds, selectedMethods]);

  const hasFilters = selectedStudentIds.length > 0 || selectedBehaviorIds.length > 0 || selectedMethods.length > 0;

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
          .interval-na { background: #e5e7eb; color: #9ca3af; border-style: dashed; }
          .interval-empty { background: #f5f5f5; color: #999; }
          .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 12px; margin-right: 5px; }
          .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
          .summary-box { text-align: center; padding: 10px; border: 1px solid #ddd; border-radius: 5px; }
          .summary-value { font-size: 24px; font-weight: bold; }
          .summary-label { font-size: 11px; color: #666; }
          .void-summary { background: #f3f4f6; padding: 12px; border-radius: 5px; margin-bottom: 15px; }
          .void-summary h4 { margin: 0 0 8px 0; font-size: 13px; }
          .attendance-summary { background: #f3f4f6; padding: 12px; border-radius: 5px; margin-bottom: 15px; }
          .attendance-item { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
          th { background: #f5f5f5; }
          .notes-section { background: #fffbeb; padding: 10px; border-radius: 5px; margin-top: 15px; }
          .smart-summary { font-size: 11px; color: #666; margin-bottom: 8px; }
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

        {/* Controls Row 1 - Session Selection */}
        <div className="flex flex-wrap items-center gap-2 py-2 border-b">
          <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
            <SelectTrigger className="w-[200px] h-8">
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

          {/* Student Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1">
                <User className="w-3 h-3" />
                Students
                {selectedStudentIds.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1">
                    {selectedStudentIds.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Filter by Student</Label>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 text-xs"
                    onClick={() => setSelectedStudentIds([])}
                  >
                    Clear
                  </Button>
                </div>
                <ScrollArea className="max-h-[200px]">
                  {sessionStudentIds.map(studentId => (
                    <div key={studentId} className="flex items-center gap-2 py-1">
                      <Checkbox
                        id={`report-student-${studentId}`}
                        checked={selectedStudentIds.includes(studentId)}
                        onCheckedChange={() => toggleStudent(studentId)}
                      />
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: getStudentColor(studentId) }}
                      />
                      <Label htmlFor={`report-student-${studentId}`} className="text-sm cursor-pointer">
                        {getStudentName(studentId)}
                      </Label>
                    </div>
                  ))}
                </ScrollArea>
              </div>
            </PopoverContent>
          </Popover>

          {/* Behavior Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1">
                <Activity className="w-3 h-3" />
                Behaviors
                {selectedBehaviorIds.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1">
                    {selectedBehaviorIds.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Filter by Behavior</Label>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 text-xs"
                    onClick={() => setSelectedBehaviorIds([])}
                  >
                    Clear
                  </Button>
                </div>
                <ScrollArea className="max-h-[200px]">
                  {sessionBehaviors.map(({ id, name }) => (
                    <div key={id} className="flex items-center gap-2 py-1">
                      <Checkbox
                        id={`report-behavior-${id}`}
                        checked={selectedBehaviorIds.includes(id)}
                        onCheckedChange={() => toggleBehavior(id)}
                      />
                      <Label htmlFor={`report-behavior-${id}`} className="text-sm cursor-pointer">
                        {name}
                      </Label>
                    </div>
                  ))}
                </ScrollArea>
              </div>
            </PopoverContent>
          </Popover>

          {/* Method Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1">
                <SlidersHorizontal className="w-3 h-3" />
                Methods
                {selectedMethods.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1">
                    {selectedMethods.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Filter by Method</Label>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 text-xs"
                    onClick={() => setSelectedMethods([])}
                  >
                    Clear
                  </Button>
                </div>
                {sessionMethods.map(method => (
                  <div key={method} className="flex items-center gap-2 py-1">
                    <Checkbox
                      id={`report-method-${method}`}
                      checked={selectedMethods.includes(method)}
                      onCheckedChange={() => toggleMethod(method)}
                    />
                    <Label htmlFor={`report-method-${method}`} className="text-sm cursor-pointer">
                      {METHOD_LABELS[method]}
                    </Label>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Interval Detail Toggle */}
          <div className="flex items-center gap-2 border-l pl-3 ml-2">
            <Checkbox
              id="show-interval-detail"
              checked={showIntervalDetailTable}
              onCheckedChange={(checked) => setShowIntervalDetailTable(checked === true)}
            />
            <Label htmlFor="show-interval-detail" className="text-xs cursor-pointer whitespace-nowrap">
              Interval Audit Table
            </Label>
          </div>

          {hasFilters && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 text-xs"
              onClick={() => {
                setSelectedStudentIds([]);
                setSelectedBehaviorIds([]);
                setSelectedMethods([]);
              }}
            >
              Clear All Filters
            </Button>
          )}

          <div className="ml-auto flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={async () => {
                if (!selectedSession || !filteredData) return;
                try {
                  const sections: Array<{ heading: string; content: string }> = [];
                  sections.push({
                    heading: 'Session Information',
                    content: `Date: ${format(new Date(selectedSession.date), 'MMMM d, yyyy')}\nLength: ${selectedSession.sessionLengthMinutes || 60} minutes`,
                  });
                  if (filteredData.frequencyEntries.length > 0) {
                    sections.push({
                      heading: 'Frequency Data',
                      content: filteredData.frequencyEntries.map(e => `${getBehaviorName(e.studentId, e.behaviorId)} (${getStudentName(e.studentId)}): ${e.count}`).join('\n'),
                    });
                  }
                  if (filteredData.durationEntries.length > 0) {
                    sections.push({
                      heading: 'Duration Data',
                      content: filteredData.durationEntries.map(e => `${getBehaviorName(e.studentId, e.behaviorId)} (${getStudentName(e.studentId)}): ${formatDuration(e.duration)}`).join('\n'),
                    });
                  }
                  if (filteredData.abcEntries.length > 0) {
                    sections.push({
                      heading: 'ABC Data',
                      content: filteredData.abcEntries.map(e => `Behavior: ${getBehaviorName(e.studentId, e.behaviorId)}\nAntecedent: ${(e.antecedents || [e.antecedent]).join(', ')}\nConsequence: ${(e.consequences || [e.consequence]).join(', ')}`).join('\n\n'),
                    });
                  }
                  await generateGenericDocxReport({
                    title: 'Session Report',
                    subtitle: format(new Date(selectedSession.date), 'MMMM d, yyyy'),
                    sections,
                    fileName: `Session_Report_${format(new Date(selectedSession.date), 'yyyy-MM-dd')}.docx`,
                  });
                  toast.success('Session report downloaded');
                } catch {
                  toast.error('Failed to download report');
                }
              }}
            >
              <Download className="w-4 h-4" />
              Download .docx
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
              <Printer className="w-4 h-4" />
              Print
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
                  {selectedSession.intervalEntries.length > 0 && (
                    <span> • {SAMPLING_TYPE_LABELS[sessionConfig.samplingType] || 'Partial Interval Recording'}</span>
                  )}
                </p>
              </div>

              {/* Filter Summary */}
              {hasFilters && (
                <div className="filter-summary bg-muted/50 p-3 rounded-lg text-sm">
                  <span className="font-medium">Report Filters: </span>
                  {selectedStudentIds.length > 0 && (
                    <span>Students: {selectedStudentIds.map(id => getStudentName(id)).join(', ')}; </span>
                  )}
                  {selectedBehaviorIds.length > 0 && (
                    <span>Behaviors: {sessionBehaviors.filter(b => selectedBehaviorIds.includes(b.id)).map(b => b.name).join(', ')}; </span>
                  )}
                  {selectedMethods.length > 0 && (
                    <span>Methods: {selectedMethods.map(m => METHOD_LABELS[m]).join(', ')}; </span>
                  )}
                </div>
              )}

              {/* Summary Stats */}
              {filteredData && (() => {
                const allIntervals = filteredData.intervalEntries;
                const validIntervals = allIntervals.filter(e => !e.voided);
                const voidedIntervals = allIntervals.filter(e => e.voided);
                const occurredIntervals = validIntervals.filter(e => e.occurred).length;
                const intervalPercentage = validIntervals.length > 0 
                  ? Math.round((occurredIntervals / validIntervals.length) * 100) 
                  : 0;

                return (
                  <>
                    <div className="summary-grid grid grid-cols-4 gap-3">
                      <Card>
                        <CardContent className="pt-4 text-center">
                          <p className="text-2xl font-bold text-info">
                            {filteredData.frequencyEntries.reduce((sum, e) => sum + e.count, 0)}
                          </p>
                          <p className="text-xs text-muted-foreground">Total Frequency</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4 text-center">
                          <p className="text-2xl font-bold text-warning">
                            {formatDuration(filteredData.durationEntries.reduce((sum, e) => sum + e.duration, 0))}
                          </p>
                          <p className="text-xs text-muted-foreground">Total Duration</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4 text-center">
                          <p className="text-2xl font-bold text-accent">
                            {occurredIntervals}/{validIntervals.length}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Intervals ({intervalPercentage}%)
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4 text-center">
                          <p className="text-2xl font-bold text-primary">
                            {filteredData.abcEntries.length}
                          </p>
                          <p className="text-xs text-muted-foreground">ABC Entries</p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Voided Intervals Summary */}
                    {voidedIntervals.length > 0 && (
                      <Card className="bg-muted/30">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                            Excluded Intervals (N/A)
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2">
                            {(() => {
                              // Group by reason
                              const byReason = voidedIntervals.reduce((acc, e) => {
                                const reason = getVoidReasonLabel(e.voidReason, e.voidReasonCustom);
                                if (!acc[reason]) acc[reason] = [];
                                acc[reason].push(e.intervalNumber + 1);
                                return acc;
                              }, {} as Record<string, number[]>);

                              return Object.entries(byReason).map(([reason, intervals]) => {
                                const uniqueIntervals = [...new Set(intervals)].sort((a, b) => a - b);
                                return (
                                  <Badge key={reason} variant="outline" className="gap-1">
                                    {reason}: #{uniqueIntervals.join(', #')}
                                  </Badge>
                                );
                              });
                            })()}
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            {voidedIntervals.length} interval entries excluded from percentage calculations
                          </p>
                        </CardContent>
                      </Card>
                    )}

                    {/* Attendance Changes */}
                    {studentIntervalStatus.length > 0 && (
                      <Card className="bg-muted/30">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <UserPlus className="w-4 h-4 text-muted-foreground" />
                            Attendance Changes
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-1">
                            {studentIntervalStatus.map(status => {
                              const student = students.find(s => s.id === status.studentId);
                              if (!student) return null;
                              return (
                                <div key={status.studentId} className="flex items-center gap-2 text-sm">
                                  <div 
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: student.color }}
                                  />
                                  <span className="font-medium">{student.name}:</span>
                                  {status.joinedAtInterval !== undefined && status.joinedAtInterval > 0 && (
                                    <Badge variant="outline" className="gap-1">
                                      <UserPlus className="w-3 h-3" />
                                      Joined at interval {status.joinedAtInterval + 1}
                                    </Badge>
                                  )}
                                  {status.departedAtInterval !== undefined && (
                                    <Badge variant="outline" className="gap-1">
                                      <UserMinus className="w-3 h-3" />
                                      Left at interval {status.departedAtInterval + 1}
                                    </Badge>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </>
                );
              })()}

              {/* Student Sections */}
              {filteredData && [...new Set([
                ...filteredData.frequencyEntries.map(e => e.studentId),
                ...filteredData.durationEntries.map(e => e.studentId),
                ...filteredData.intervalEntries.map(e => e.studentId),
                ...filteredData.abcEntries.map(e => e.studentId),
              ])].map(studentId => {
                const studentFreq = filteredData.frequencyEntries.filter(e => e.studentId === studentId);
                const studentDur = filteredData.durationEntries.filter(e => e.studentId === studentId);
                const studentInt = filteredData.intervalEntries.filter(e => e.studentId === studentId);
                const studentABC = filteredData.abcEntries.filter(e => e.studentId === studentId);
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

                      {/* Interval Data - Detailed Grid with Smart Summaries */}
                      {studentInt.length > 0 && (
                        <div className="data-section">
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                            Interval Data ({SAMPLING_TYPE_LABELS[sessionConfig.samplingType] || 'Partial Interval'})
                          </h4>
                          {(() => {
                            const byBehavior = studentInt.reduce((acc, e) => {
                              if (!acc[e.behaviorId]) acc[e.behaviorId] = [];
                              acc[e.behaviorId].push(e);
                              return acc;
                            }, {} as Record<string, typeof studentInt>);

                            return Object.entries(byBehavior).map(([behaviorId, entries]) => {
                              const sorted = entries.sort((a, b) => a.intervalNumber - b.intervalNumber);
                              const validEntries = sorted.filter(e => !e.voided);
                              const voidedEntries = sorted.filter(e => e.voided);
                              const occurred = validEntries.filter(e => e.occurred).length;
                              const presentIntervals = validEntries.length;
                              const totalIntervals = sorted.length;
                              const percentage = presentIntervals > 0 ? Math.round((occurred / presentIntervals) * 100) : 0;

                              // Get all interval numbers to show gaps
                              const maxInterval = Math.max(...sorted.map(e => e.intervalNumber));
                              const intervals = Array.from({ length: maxInterval + 1 }, (_, i) => {
                                const entry = sorted.find(e => e.intervalNumber === i);
                                return { num: i + 1, entry };
                              });

                              // Group voided reasons
                              const voidReasons = voidedEntries.reduce((acc, e) => {
                                const reason = getVoidReasonLabel(e.voidReason, e.voidReasonCustom);
                                acc[reason] = (acc[reason] || 0) + 1;
                                return acc;
                              }, {} as Record<string, number>);

                              return (
                                <div key={behaviorId} className="mb-4 p-3 bg-muted/30 rounded-lg">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium">{getBehaviorName(studentId, behaviorId)}</span>
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="font-bold">
                                        {occurred}/{presentIntervals} ({percentage}%)
                                      </Badge>
                                      {voidedEntries.length > 0 && (
                                        <Badge variant="secondary" className="text-xs">
                                          {voidedEntries.length} N/A
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* Smart summary text */}
                                  {presentIntervals !== totalIntervals && (
                                    <p className="text-xs text-muted-foreground mb-2">
                                      Present intervals: {presentIntervals} of {totalIntervals} total
                                      {Object.entries(voidReasons).length > 0 && (
                                        <span className="ml-2">
                                          ({Object.entries(voidReasons).map(([reason, count], i) => (
                                            <span key={reason}>
                                              {count}× {reason}{i < Object.entries(voidReasons).length - 1 ? ', ' : ''}
                                            </span>
                                          ))})
                                        </span>
                                      )}
                                    </p>
                                  )}

                                  <div className="interval-grid flex flex-wrap gap-1">
                                    {intervals.map(({ num, entry }) => (
                                      <div
                                        key={num}
                                        className={`
                                          w-7 h-7 rounded flex items-center justify-center text-xs font-medium border
                                          ${entry?.voided
                                            ? 'bg-muted text-muted-foreground border-dashed border-muted-foreground/50'
                                            : entry?.occurred 
                                              ? 'bg-primary text-primary-foreground border-primary' 
                                              : entry?.occurred === false 
                                                ? 'bg-destructive text-destructive-foreground border-destructive'
                                                : 'bg-muted text-muted-foreground border-border'}
                                        `}
                                        title={
                                          entry?.voided 
                                            ? `Interval ${num}: N/A (${getVoidReasonLabel(entry.voidReason, entry.voidReasonCustom)})`
                                            : entry 
                                              ? `Interval ${num}: ${entry.occurred ? 'Yes' : 'No'} at ${format(new Date(entry.timestamp), 'HH:mm:ss')}` 
                                              : `Interval ${num}: Not recorded`
                                        }
                                      >
                                        {entry?.voided ? (
                                          <MinusCircle className="w-4 h-4" />
                                        ) : entry?.occurred ? (
                                          <CheckCircle className="w-4 h-4" />
                                        ) : entry?.occurred === false ? (
                                          <XCircle className="w-4 h-4" />
                                        ) : (
                                          num
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                  <div className="mt-2 text-xs text-muted-foreground flex flex-wrap gap-x-3">
                                    <span className="inline-flex items-center gap-1">
                                      <CheckCircle className="w-3 h-3 text-primary" /> Occurred
                                    </span>
                                    <span className="inline-flex items-center gap-1">
                                      <XCircle className="w-3 h-3 text-destructive" /> Did not occur
                                    </span>
                                    {voidedEntries.length > 0 && (
                                      <span className="inline-flex items-center gap-1">
                                        <MinusCircle className="w-3 h-3" /> N/A (excluded)
                                      </span>
                                    )}
                                  </div>

                                  {/* Detailed Audit Table */}
                                  {showIntervalDetailTable && (
                                    <div className="mt-3 border rounded overflow-hidden">
                                      <table className="w-full text-xs">
                                        <thead>
                                          <tr className="bg-muted/50">
                                            <th className="border-r p-1.5 text-center font-medium w-16">Interval #</th>
                                            <th className="border-r p-1.5 text-center font-medium w-20">Status</th>
                                            <th className="border-r p-1.5 text-left font-medium">Timestamp</th>
                                            <th className="border-r p-1.5 text-left font-medium">Marked At</th>
                                            <th className="p-1.5 text-left font-medium">Notes</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {sorted.map((entry, idx) => (
                                            <tr key={entry.id} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                                              <td className="border-r p-1.5 text-center font-medium">
                                                {entry.intervalNumber + 1}
                                              </td>
                                              <td className={`border-r p-1.5 text-center font-bold ${
                                                entry.voided 
                                                  ? 'text-muted-foreground' 
                                                  : entry.occurred 
                                                    ? 'text-primary' 
                                                    : 'text-destructive'
                                              }`}>
                                                {entry.voided ? 'N/A' : entry.occurred ? 'Y' : 'N'}
                                              </td>
                                              <td className="border-r p-1.5 text-muted-foreground">
                                                {format(new Date(entry.timestamp), 'MMM d, yyyy HH:mm:ss')}
                                              </td>
                                              <td className="border-r p-1.5 text-muted-foreground">
                                                {entry.markedAt 
                                                  ? format(new Date(entry.markedAt), 'HH:mm:ss')
                                                  : format(new Date(entry.timestamp), 'HH:mm:ss')
                                                }
                                              </td>
                                              <td className="p-1.5 text-muted-foreground">
                                                {entry.voided && (
                                                  <span className="text-warning">
                                                    {getVoidReasonLabel(entry.voidReason, entry.voidReasonCustom)}
                                                    {entry.voidReasonCustom && `: ${entry.voidReasonCustom}`}
                                                  </span>
                                                )}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
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
                <Card className="notes-section bg-muted/50">
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