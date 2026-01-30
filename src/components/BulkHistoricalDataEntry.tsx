import { useState, useMemo } from 'react';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { 
  Users, Calendar, Save, X, Check, Minus, 
  ChevronDown, ChevronUp, AlertCircle, Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { useDataStore } from '@/store/dataStore';
import { Student, Behavior } from '@/types/behavior';

type DataStatus = 'collected' | 'zero' | 'no_data';

interface CellData {
  status: DataStatus;
  count: number;
  durationSeconds?: number;
  observationMinutes?: number;
}

// Key format: studentId-behaviorId-date
type BulkDataMap = Record<string, CellData>;

interface BulkHistoricalDataEntryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BulkHistoricalDataEntry({ open, onOpenChange }: BulkHistoricalDataEntryProps) {
  const { students, addHistoricalFrequency, addHistoricalDuration } = useDataStore();
  
  // Selection state
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [selectedBehaviorIds, setSelectedBehaviorIds] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    end: format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
  });
  
  // Bulk data map
  const [bulkData, setBulkData] = useState<BulkDataMap>({});
  
  // UI state
  const [expandedStudents, setExpandedStudents] = useState<string[]>([]);
  const [defaultStatus, setDefaultStatus] = useState<DataStatus>('collected');
  const [defaultCount, setDefaultCount] = useState(0);
  const [showApplyDefaults, setShowApplyDefaults] = useState(false);

  // Get active (non-archived) students
  const activeStudents = useMemo(() => 
    students.filter(s => !s.isArchived),
    [students]
  );

  // Get all unique behaviors across selected students
  const availableBehaviors = useMemo(() => {
    const behaviorMap = new Map<string, Behavior & { studentIds: string[] }>();
    
    selectedStudentIds.forEach(studentId => {
      const student = activeStudents.find(s => s.id === studentId);
      if (!student) return;
      
      student.behaviors
        .filter(b => !b.isArchived && !b.isMastered)
        .forEach(behavior => {
          // Group behaviors by name for multi-student selection
          const key = behavior.name.toLowerCase();
          const existing = behaviorMap.get(key);
          if (existing) {
            existing.studentIds.push(studentId);
          } else {
            behaviorMap.set(key, { ...behavior, studentIds: [studentId] });
          }
        });
    });
    
    return Array.from(behaviorMap.values());
  }, [selectedStudentIds, activeStudents]);

  // Generate dates from range
  const dates = useMemo(() => {
    if (!dateRange.start || !dateRange.end) return [];
    const start = new Date(dateRange.start + 'T00:00:00');
    const end = new Date(dateRange.end + 'T00:00:00');
    if (start > end) return [];
    return eachDayOfInterval({ start, end });
  }, [dateRange]);

  // Get cell key
  const getCellKey = (studentId: string, behaviorId: string, date: Date) => 
    `${studentId}-${behaviorId}-${format(date, 'yyyy-MM-dd')}`;

  // Get cell data
  const getCellData = (studentId: string, behaviorId: string, date: Date): CellData => {
    const key = getCellKey(studentId, behaviorId, date);
    return bulkData[key] || { status: 'no_data', count: 0 };
  };

  // Set cell data
  const setCellData = (studentId: string, behaviorId: string, date: Date, data: Partial<CellData>) => {
    const key = getCellKey(studentId, behaviorId, date);
    setBulkData(prev => ({
      ...prev,
      [key]: { ...getCellData(studentId, behaviorId, date), ...data },
    }));
  };

  // Cycle through status: no_data -> zero -> collected -> no_data
  const cycleStatus = (studentId: string, behaviorId: string, date: Date) => {
    const current = getCellData(studentId, behaviorId, date);
    const statusOrder: DataStatus[] = ['no_data', 'zero', 'collected'];
    const currentIndex = statusOrder.indexOf(current.status);
    const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length];
    setCellData(studentId, behaviorId, date, { 
      status: nextStatus, 
      count: nextStatus === 'zero' ? 0 : (nextStatus === 'collected' ? 1 : 0) 
    });
  };

  // Apply defaults to all cells
  const applyDefaultsToAll = () => {
    const newData: BulkDataMap = {};
    
    selectedStudentIds.forEach(studentId => {
      const student = activeStudents.find(s => s.id === studentId);
      if (!student) return;

      selectedBehaviorIds.forEach(behaviorName => {
        // Find this behavior for this student
        const behavior = student.behaviors.find(b => 
          b.name.toLowerCase() === behaviorName.toLowerCase() && !b.isArchived && !b.isMastered
        );
        if (!behavior) return;

        dates.forEach(date => {
          const key = getCellKey(studentId, behavior.id, date);
          newData[key] = {
            status: defaultStatus,
            count: defaultStatus === 'zero' ? 0 : defaultCount,
          };
        });
      });
    });

    setBulkData(newData);
    setShowApplyDefaults(false);
    toast.success('Defaults applied to all cells');
  };

  // Set all cells for a specific date
  const setAllForDate = (date: Date, status: DataStatus) => {
    selectedStudentIds.forEach(studentId => {
      const student = activeStudents.find(s => s.id === studentId);
      if (!student) return;

      selectedBehaviorIds.forEach(behaviorName => {
        const behavior = student.behaviors.find(b => 
          b.name.toLowerCase() === behaviorName.toLowerCase() && !b.isArchived && !b.isMastered
        );
        if (!behavior) return;
        setCellData(studentId, behavior.id, date, { 
          status, 
          count: status === 'zero' ? 0 : (status === 'collected' ? 1 : 0) 
        });
      });
    });
  };

  // Set all cells for a specific student
  const setAllForStudent = (studentId: string, status: DataStatus) => {
    const student = activeStudents.find(s => s.id === studentId);
    if (!student) return;

    selectedBehaviorIds.forEach(behaviorName => {
      const behavior = student.behaviors.find(b => 
        b.name.toLowerCase() === behaviorName.toLowerCase() && !b.isArchived && !b.isMastered
      );
      if (!behavior) return;

      dates.forEach(date => {
        setCellData(studentId, behavior.id, date, { 
          status, 
          count: status === 'zero' ? 0 : (status === 'collected' ? 1 : 0) 
        });
      });
    });
  };

  // Toggle student expansion
  const toggleStudentExpanded = (studentId: string) => {
    setExpandedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  // Handle save
  const handleSave = () => {
    let savedCount = 0;
    let skippedCount = 0;

    Object.entries(bulkData).forEach(([key, data]) => {
      if (data.status === 'no_data') {
        skippedCount++;
        return;
      }

      const [studentId, behaviorId, dateStr] = key.split('-');
      const timestamp = new Date(dateStr + 'T12:00:00'); // Noon to avoid timezone issues

      // Add frequency entry
      addHistoricalFrequency({
        studentId,
        behaviorId,
        count: data.status === 'zero' ? 0 : data.count,
        timestamp,
        observationDurationMinutes: data.observationMinutes,
      });

      // Add duration if present
      if (data.durationSeconds && data.durationSeconds > 0) {
        addHistoricalDuration({
          studentId,
          behaviorId,
          durationSeconds: data.durationSeconds,
          timestamp,
        });
      }

      savedCount++;
    });

    if (savedCount > 0) {
      toast.success(`Saved ${savedCount} data entries${skippedCount > 0 ? ` (${skippedCount} skipped - no data)` : ''}`);
      resetAndClose();
    } else if (skippedCount > 0) {
      toast.info('All entries marked as "No Data" - nothing saved');
    } else {
      toast.error('No data to save. Please enter data for at least one cell.');
    }
  };

  // Reset and close
  const resetAndClose = () => {
    setSelectedStudentIds([]);
    setSelectedBehaviorIds([]);
    setBulkData({});
    setExpandedStudents([]);
    onOpenChange(false);
  };

  // Get status icon/badge
  const getStatusBadge = (status: DataStatus, count: number) => {
    switch (status) {
      case 'no_data':
        return <Minus className="w-4 h-4 text-muted-foreground" />;
      case 'zero':
        return <Badge variant="secondary" className="text-xs px-1.5">0</Badge>;
      case 'collected':
        return <Badge variant="default" className="text-xs px-1.5">{count}</Badge>;
    }
  };

  // Check if we're ready to show the grid
  const canShowGrid = selectedStudentIds.length > 0 && selectedBehaviorIds.length > 0 && dates.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Bulk Historical Data Entry
          </DialogTitle>
          <DialogDescription>
            Enter zero, collected, or no data status for multiple students, behaviors, and dates at once
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Selection Controls */}
          <div className="grid md:grid-cols-3 gap-4">
            {/* Student Selection */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Students ({selectedStudentIds.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="py-0 pb-3">
                <ScrollArea className="h-32">
                  <div className="space-y-1">
                    {activeStudents.map(student => (
                      <div key={student.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`student-${student.id}`}
                          checked={selectedStudentIds.includes(student.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedStudentIds(prev => [...prev, student.id]);
                            } else {
                              setSelectedStudentIds(prev => prev.filter(id => id !== student.id));
                              // Also remove their behaviors from selection
                            }
                          }}
                        />
                        <label 
                          htmlFor={`student-${student.id}`}
                          className="text-sm cursor-pointer flex items-center gap-2"
                        >
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: student.color }}
                          />
                          {student.displayName || student.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Behavior Selection */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  Behaviors ({selectedBehaviorIds.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="py-0 pb-3">
                <ScrollArea className="h-32">
                  {availableBehaviors.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">
                      Select students first to see behaviors
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {availableBehaviors.map(behavior => (
                        <div key={behavior.name} className="flex items-center gap-2">
                          <Checkbox
                            id={`behavior-${behavior.name}`}
                            checked={selectedBehaviorIds.includes(behavior.name.toLowerCase())}
                            onCheckedChange={(checked) => {
                              const key = behavior.name.toLowerCase();
                              if (checked) {
                                setSelectedBehaviorIds(prev => [...prev, key]);
                              } else {
                                setSelectedBehaviorIds(prev => prev.filter(id => id !== key));
                              }
                            }}
                          />
                          <label 
                            htmlFor={`behavior-${behavior.name}`}
                            className="text-sm cursor-pointer"
                          >
                            {behavior.name}
                            <span className="text-xs text-muted-foreground ml-1">
                              ({behavior.studentIds.length} student{behavior.studentIds.length !== 1 ? 's' : ''})
                            </span>
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Date Range */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Date Range ({dates.length} days)
                </CardTitle>
              </CardHeader>
              <CardContent className="py-0 pb-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Start</Label>
                    <Input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">End</Label>
                    <Input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
                <div className="flex gap-1 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => {
                      const today = new Date();
                      setDateRange({
                        start: format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
                        end: format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
                      });
                    }}
                  >
                    This Week
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => {
                      const lastWeek = addDays(new Date(), -7);
                      setDateRange({
                        start: format(startOfWeek(lastWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
                        end: format(endOfWeek(lastWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
                      });
                    }}
                  >
                    Last Week
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Apply Defaults */}
          {canShowGrid && (
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowApplyDefaults(!showApplyDefaults)}
              >
                Apply Defaults to All
              </Button>
              {showApplyDefaults && (
                <div className="flex items-center gap-2 bg-secondary/50 p-2 rounded-md">
                  <Select value={defaultStatus} onValueChange={(v) => setDefaultStatus(v as DataStatus)}>
                    <SelectTrigger className="w-28 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no_data">No Data</SelectItem>
                      <SelectItem value="zero">Zero</SelectItem>
                      <SelectItem value="collected">Collected</SelectItem>
                    </SelectContent>
                  </Select>
                  {defaultStatus === 'collected' && (
                    <Input
                      type="number"
                      min={0}
                      value={defaultCount}
                      onChange={(e) => setDefaultCount(parseInt(e.target.value) || 0)}
                      className="w-16 h-8"
                      placeholder="Count"
                    />
                  )}
                  <Button size="sm" onClick={applyDefaultsToAll}>
                    <Check className="w-4 h-4 mr-1" />
                    Apply
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Data Grid */}
          {canShowGrid ? (
            <ScrollArea className="flex-1 border rounded-md">
              <div className="min-w-max">
                {selectedStudentIds.map(studentId => {
                  const student = activeStudents.find(s => s.id === studentId);
                  if (!student) return null;

                  const studentBehaviors = student.behaviors.filter(b => 
                    !b.isArchived && 
                    !b.isMastered && 
                    selectedBehaviorIds.includes(b.name.toLowerCase())
                  );

                  if (studentBehaviors.length === 0) return null;

                  const isExpanded = expandedStudents.includes(studentId);

                  return (
                    <Collapsible 
                      key={studentId} 
                      open={isExpanded}
                      onOpenChange={() => toggleStudentExpanded(studentId)}
                    >
                      <div className="border-b">
                        <CollapsibleTrigger asChild>
                          <div className="flex items-center gap-2 p-2 bg-secondary/30 cursor-pointer hover:bg-secondary/50">
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: student.color }}
                            />
                            <span className="font-medium">
                              {student.displayName || student.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              ({studentBehaviors.length} behavior{studentBehaviors.length !== 1 ? 's' : ''})
                            </span>
                            <div className="ml-auto flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAllForStudent(studentId, 'zero');
                                }}
                              >
                                All Zero
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAllForStudent(studentId, 'no_data');
                                }}
                              >
                                All No Data
                              </Button>
                            </div>
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-40 sticky left-0 bg-background">Behavior</TableHead>
                                {dates.map(date => (
                                  <TableHead 
                                    key={date.toISOString()} 
                                    className="text-center px-1 min-w-16"
                                  >
                                    <div className="text-xs">
                                      <div>{format(date, 'EEE')}</div>
                                      <div>{format(date, 'M/d')}</div>
                                    </div>
                                  </TableHead>
                                ))}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {studentBehaviors.map(behavior => (
                                <TableRow key={behavior.id}>
                                  <TableCell className="font-medium sticky left-0 bg-background">
                                    {behavior.name}
                                  </TableCell>
                                  {dates.map(date => {
                                    const cellData = getCellData(studentId, behavior.id, date);
                                    return (
                                      <TableCell 
                                        key={date.toISOString()}
                                        className="text-center p-1"
                                      >
                                        <button
                                          className={`w-full h-8 rounded border flex items-center justify-center transition-colors ${
                                            cellData.status === 'no_data'
                                              ? 'bg-secondary/30 border-transparent'
                                              : cellData.status === 'zero'
                                                ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
                                                : 'bg-primary/10 border-primary/30'
                                          }`}
                                          onClick={() => cycleStatus(studentId, behavior.id, date)}
                                          title="Click to cycle: No Data → Zero → Collected"
                                        >
                                          {getStatusBadge(cellData.status, cellData.count)}
                                        </button>
                                      </TableCell>
                                    );
                                  })}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  );
                })}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex-1 flex items-center justify-center border rounded-md bg-secondary/10">
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-muted-foreground">
                  Select students, behaviors, and date range to start entering data
                </p>
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground border-t pt-2">
            <span className="font-medium">Legend:</span>
            <div className="flex items-center gap-1">
              <Minus className="w-4 h-4" />
              <span>No Data</span>
            </div>
            <div className="flex items-center gap-1">
              <Badge variant="secondary" className="text-xs px-1.5">0</Badge>
              <span>Zero (behavior not observed)</span>
            </div>
            <div className="flex items-center gap-1">
              <Badge variant="default" className="text-xs px-1.5">N</Badge>
              <span>Collected (N occurrences)</span>
            </div>
            <span className="ml-auto">Click cells to cycle status</span>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={resetAndClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={Object.keys(bulkData).length === 0}>
            <Save className="w-4 h-4 mr-2" />
            Save All Data
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
