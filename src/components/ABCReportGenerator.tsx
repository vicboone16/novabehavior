import { useMemo, useState, useRef } from 'react';
import { format } from 'date-fns';
import { FileSpreadsheet, Download, Printer, Filter, Calendar, User, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { useDataStore } from '@/store/dataStore';
import { ABCEntry } from '@/types/behavior';

export function ABCReportGenerator() {
  const { sessions, students, abcEntries } = useDataStore();
  const reportRef = useRef<HTMLDivElement>(null);
  
  // Filters
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [selectedBehaviorIds, setSelectedBehaviorIds] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [dataSource, setDataSource] = useState<'current' | 'sessions'>('current');

  // Get all ABC entries based on data source
  const allABCEntries = useMemo(() => {
    if (dataSource === 'current') {
      return abcEntries;
    }
    return sessions.flatMap(s => s.abcEntries);
  }, [dataSource, abcEntries, sessions]);

  // Get unique students and behaviors from entries
  const uniqueStudentIds = useMemo(() => 
    [...new Set(allABCEntries.map(e => e.studentId))],
    [allABCEntries]
  );

  const uniqueBehaviors = useMemo(() => {
    const behaviors = new Map<string, string>();
    allABCEntries.forEach(e => {
      behaviors.set(e.behaviorId, e.behavior);
    });
    return Array.from(behaviors.entries());
  }, [allABCEntries]);

  // Filter entries
  const filteredEntries = useMemo(() => {
    return allABCEntries.filter(entry => {
      // Student filter
      if (selectedStudentIds.length > 0 && !selectedStudentIds.includes(entry.studentId)) {
        return false;
      }
      // Behavior filter
      if (selectedBehaviorIds.length > 0 && !selectedBehaviorIds.includes(entry.behaviorId)) {
        return false;
      }
      // Date range filter
      const entryDate = new Date(entry.timestamp);
      if (dateRange.from && entryDate < dateRange.from) {
        return false;
      }
      if (dateRange.to) {
        const toEnd = new Date(dateRange.to);
        toEnd.setHours(23, 59, 59, 999);
        if (entryDate > toEnd) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [allABCEntries, selectedStudentIds, selectedBehaviorIds, dateRange]);

  const getStudentName = (studentId: string) => 
    students.find(s => s.id === studentId)?.name || 'Unknown';

  const getStudentColor = (studentId: string) => 
    students.find(s => s.id === studentId)?.color || '#888';

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

  const handlePrint = () => {
    const printContent = reportRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>ABC Data Report - ${format(new Date(), 'yyyy-MM-dd')}</title>
        <style>
          @page { size: landscape; margin: 0.5in; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; }
          .report-header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
          .filter-summary { background: #f5f5f5; padding: 10px; border-radius: 5px; margin-bottom: 15px; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
          th { background: #f5f5f5; font-weight: 600; }
          .student-cell { display: flex; align-items: center; gap: 6px; }
          .color-dot { width: 10px; height: 10px; border-radius: 50%; }
          .function-badge { display: inline-block; padding: 1px 6px; border-radius: 8px; font-size: 10px; background: #e5e7eb; margin-right: 3px; }
          .footer { margin-top: 20px; text-align: center; font-size: 11px; color: #666; }
          @media print { 
            body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
            @page { size: landscape; }
          }
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

  const hasFilters = selectedStudentIds.length > 0 || selectedBehaviorIds.length > 0 || dateRange.from || dateRange.to;

  if (allABCEntries.length === 0) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            ABC Report
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>ABC Data Report</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8 text-muted-foreground">
            <FileSpreadsheet className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No ABC data to report</p>
            <p className="text-sm">Record ABC entries first</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <FileSpreadsheet className="w-4 h-4" />
          ABC Report
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            ABC Data Report Generator
          </DialogTitle>
        </DialogHeader>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-2 py-2 border-b">
          {/* Data Source */}
          <Select value={dataSource} onValueChange={(v) => setDataSource(v as 'current' | 'sessions')}>
            <SelectTrigger className="w-[150px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">Current Session</SelectItem>
              <SelectItem value="sessions">All Saved Sessions</SelectItem>
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
                  {uniqueStudentIds.map(studentId => (
                    <div key={studentId} className="flex items-center gap-2 py-1">
                      <Checkbox
                        id={`abc-student-${studentId}`}
                        checked={selectedStudentIds.includes(studentId)}
                        onCheckedChange={() => toggleStudent(studentId)}
                      />
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: getStudentColor(studentId) }}
                      />
                      <Label htmlFor={`abc-student-${studentId}`} className="text-sm cursor-pointer">
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
                  {uniqueBehaviors.map(([id, name]) => (
                    <div key={id} className="flex items-center gap-2 py-1">
                      <Checkbox
                        id={`abc-behavior-${id}`}
                        checked={selectedBehaviorIds.includes(id)}
                        onCheckedChange={() => toggleBehavior(id)}
                      />
                      <Label htmlFor={`abc-behavior-${id}`} className="text-sm cursor-pointer">
                        {name}
                      </Label>
                    </div>
                  ))}
                </ScrollArea>
              </div>
            </PopoverContent>
          </Popover>

          {/* Date Range Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1">
                <Calendar className="w-3 h-3" />
                Date Range
                {(dateRange.from || dateRange.to) && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1">
                    Set
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="range"
                selected={{ from: dateRange.from, to: dateRange.to }}
                onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                numberOfMonths={2}
              />
              <div className="p-2 border-t">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full"
                  onClick={() => setDateRange({})}
                >
                  Clear Dates
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <div className="ml-auto flex gap-2">
            <Badge variant="outline">
              {filteredEntries.length} entries
            </Badge>
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
              <Printer className="w-4 h-4" />
              Print (Landscape)
            </Button>
            <Button size="sm" onClick={handlePrint} className="gap-2">
              <Download className="w-4 h-4" />
              Save as PDF
            </Button>
          </div>
        </div>

        {/* Report Preview */}
        <div className="flex-1 overflow-y-auto py-4">
          <div ref={reportRef} className="space-y-4">
            {/* Report Header */}
            <div className="report-header text-center border-b-2 border-foreground pb-4">
              <h1 className="text-xl font-bold">ABC Data Collection Report</h1>
              <p className="text-muted-foreground">
                Generated on {format(new Date(), 'EEEE, MMMM d, yyyy')}
              </p>
            </div>

            {/* Filter Summary */}
            {hasFilters && (
              <div className="filter-summary bg-muted/50 p-3 rounded-lg text-sm">
                <span className="font-medium">Filters Applied: </span>
                {selectedStudentIds.length > 0 && (
                  <span>Students: {selectedStudentIds.map(id => getStudentName(id)).join(', ')}; </span>
                )}
                {selectedBehaviorIds.length > 0 && (
                  <span>Behaviors: {uniqueBehaviors.filter(([id]) => selectedBehaviorIds.includes(id)).map(([, name]) => name).join(', ')}; </span>
                )}
                {dateRange.from && (
                  <span>From: {format(dateRange.from, 'MMM d, yyyy')}; </span>
                )}
                {dateRange.to && (
                  <span>To: {format(dateRange.to, 'MMM d, yyyy')}; </span>
                )}
              </div>
            )}

            {/* ABC Data Table */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">ABC Data Table</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50 border-b">
                        <th className="p-2 text-left font-medium">Date/Time</th>
                        <th className="p-2 text-left font-medium">Student</th>
                        <th className="p-2 text-left font-medium">Antecedent</th>
                        <th className="p-2 text-left font-medium">Behavior</th>
                        <th className="p-2 text-left font-medium">Consequence</th>
                        <th className="p-2 text-center font-medium">Count</th>
                        <th className="p-2 text-left font-medium">Function(s)</th>
                        <th className="p-2 text-center font-medium">Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEntries.map((entry, idx) => (
                        <tr key={entry.id} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                          <td className="p-2 text-xs whitespace-nowrap">
                            {format(new Date(entry.timestamp), 'MMM d, yyyy')}
                            <br />
                            <span className="text-muted-foreground">{format(new Date(entry.timestamp), 'h:mm:ss a')}</span>
                          </td>
                          <td className="p-2">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full shrink-0"
                                style={{ backgroundColor: getStudentColor(entry.studentId) }}
                              />
                              <span className="text-xs">{getStudentName(entry.studentId)}</span>
                            </div>
                          </td>
                          <td className="p-2 text-xs max-w-[150px]">
                            {entry.antecedents?.join(', ') || entry.antecedent}
                          </td>
                          <td className="p-2 text-xs font-medium max-w-[150px]">
                            {entry.behaviors?.map(b => b.behaviorName).join(', ') || entry.behavior}
                          </td>
                          <td className="p-2 text-xs max-w-[150px]">
                            {entry.consequences?.join(', ') || entry.consequence}
                          </td>
                          <td className="p-2 text-center">
                            <Badge variant="secondary">{entry.frequencyCount || 1}</Badge>
                          </td>
                          <td className="p-2 text-xs">
                            {entry.functions?.map(f => (
                              <Badge key={f} variant="outline" className="mr-1 text-[10px]">
                                {f}
                              </Badge>
                            )) || '-'}
                          </td>
                          <td className="p-2 text-center text-xs">
                            {entry.hasDuration && entry.durationMinutes ? `${entry.durationMinutes}m` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Summary Statistics */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Summary Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <p className="text-2xl font-bold text-primary">{filteredEntries.length}</p>
                    <p className="text-xs text-muted-foreground">Total Entries</p>
                  </div>
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <p className="text-2xl font-bold text-primary">
                      {filteredEntries.reduce((sum, e) => sum + (e.frequencyCount || 1), 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">Total Count</p>
                  </div>
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <p className="text-2xl font-bold text-primary">
                      {new Set(filteredEntries.map(e => e.studentId)).size}
                    </p>
                    <p className="text-xs text-muted-foreground">Students</p>
                  </div>
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <p className="text-2xl font-bold text-primary">
                      {new Set(filteredEntries.map(e => e.behaviorId)).size}
                    </p>
                    <p className="text-xs text-muted-foreground">Unique Behaviors</p>
                  </div>
                </div>

                {/* Function Distribution */}
                {filteredEntries.some(e => e.functions?.length) && (
                  <div className="mt-4">
                    <h4 className="text-xs font-medium text-muted-foreground mb-2">Function Distribution</h4>
                    <div className="flex flex-wrap gap-2">
                      {(() => {
                        const functionCounts = filteredEntries.reduce((acc, e) => {
                          e.functions?.forEach(f => {
                            acc[f] = (acc[f] || 0) + 1;
                          });
                          return acc;
                        }, {} as Record<string, number>);

                        return Object.entries(functionCounts)
                          .sort((a, b) => b[1] - a[1])
                          .map(([func, count]) => (
                            <Badge key={func} variant="outline" className="gap-1">
                              {func}: {count}
                            </Badge>
                          ));
                      })()}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Footer */}
            <Separator />
            <p className="text-xs text-center text-muted-foreground footer">
              Generated by Behavior Data Collector • {format(new Date(), 'MMMM d, yyyy h:mm a')}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
