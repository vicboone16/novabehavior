import { useState, useMemo } from 'react';
import { 
  Download, FileText, Calendar, BarChart3, TrendingUp, 
  MessageSquare, Lightbulb, CheckSquare, Users, Clock, Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useDataStore } from '@/store/dataStore';
import { format, subDays, subWeeks, subMonths, startOfDay, endOfDay } from 'date-fns';

type ReportType = 'weekly' | 'monthly' | 'triennial' | 'iep-progress' | 'bip-fidelity' | 'parent-summary';
type TimeWindow = 'last5sessions' | 'last30days' | 'quarter' | 'semester' | 'sinceBaseline' | 'custom';

interface ReportOptions {
  includeGraphs: boolean;
  includeNarrative: boolean;
  includeTeacherComments: boolean;
  includeBaselineComparison: boolean;
  includeRecommendations: boolean;
  includeNextSteps: boolean;
}

interface EnhancedExportOptionsProps {
  studentId?: string;
}

export function EnhancedExportOptions({ studentId }: EnhancedExportOptionsProps) {
  const { toast } = useToast();
  const { students, sessions, behaviorGoals, frequencyEntries, abcEntries } = useDataStore();
  
  const [isOpen, setIsOpen] = useState(false);
  const [reportType, setReportType] = useState<ReportType>('weekly');
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('last30days');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState(studentId || '');
  const [additionalNotes, setAdditionalNotes] = useState('');
  
  const [options, setOptions] = useState<ReportOptions>({
    includeGraphs: true,
    includeNarrative: true,
    includeTeacherComments: false,
    includeBaselineComparison: true,
    includeRecommendations: true,
    includeNextSteps: true,
  });

  const reportTypeLabels: Record<ReportType, { label: string; icon: typeof FileText; description: string }> = {
    'weekly': { 
      label: 'Weekly Update', 
      icon: Calendar, 
      description: 'Brief weekly summary of behavior data and progress' 
    },
    'monthly': { 
      label: 'Monthly Summary', 
      icon: BarChart3, 
      description: 'Comprehensive monthly analysis with trends' 
    },
    'triennial': { 
      label: 'Triennial/FBA Summary', 
      icon: FileText, 
      description: 'Full assessment summary for re-evaluations' 
    },
    'iep-progress': { 
      label: 'IEP Progress Report', 
      icon: TrendingUp, 
      description: 'Progress on IEP goals with data support' 
    },
    'bip-fidelity': { 
      label: 'BIP Fidelity Review', 
      icon: CheckSquare, 
      description: 'Implementation fidelity and effectiveness' 
    },
    'parent-summary': { 
      label: 'Parent-Friendly Summary', 
      icon: Users, 
      description: 'Simplified summary for parents/guardians' 
    },
  };

  const timeWindowLabels: Record<TimeWindow, string> = {
    'last5sessions': 'Last 5 Sessions',
    'last30days': 'Last 30 Days',
    'quarter': 'This Quarter',
    'semester': 'This Semester',
    'sinceBaseline': 'Since Baseline',
    'custom': 'Custom Date Range',
  };

  // Get date range based on time window
  const dateRange = useMemo(() => {
    const now = new Date();
    switch (timeWindow) {
      case 'last5sessions':
        // Get dates of last 5 sessions for selected student
        const studentSessions = sessions
          .filter(s => !selectedStudentId || s.studentIds?.includes(selectedStudentId))
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 5);
        if (studentSessions.length === 0) return { from: subDays(now, 7), to: now };
        return {
          from: new Date(studentSessions[studentSessions.length - 1].date),
          to: new Date(studentSessions[0].date),
        };
      case 'last30days':
        return { from: subDays(now, 30), to: now };
      case 'quarter':
        return { from: subMonths(now, 3), to: now };
      case 'semester':
        return { from: subMonths(now, 6), to: now };
      case 'sinceBaseline':
        // Find earliest goal start date
        const studentGoals = behaviorGoals.filter(g => g.studentId === selectedStudentId);
        if (studentGoals.length === 0) return { from: subMonths(now, 3), to: now };
        const earliestGoal = studentGoals.reduce((earliest, g) => {
          const goalDate = g.dataCollectionStartDate || g.startDate;
          return new Date(goalDate) < new Date(earliest) ? goalDate : earliest;
        }, studentGoals[0].dataCollectionStartDate || studentGoals[0].startDate);
        return { from: new Date(earliestGoal), to: now };
      case 'custom':
        return {
          from: customDateFrom ? new Date(customDateFrom) : subDays(now, 30),
          to: customDateTo ? new Date(customDateTo) : now,
        };
      default:
        return { from: subDays(now, 30), to: now };
    }
  }, [timeWindow, customDateFrom, customDateTo, selectedStudentId, sessions, behaviorGoals]);

  // Calculate preview stats
  const previewStats = useMemo(() => {
    if (!selectedStudentId) return null;
    
    const student = students.find(s => s.id === selectedStudentId);
    if (!student) return null;

    const studentGoals = behaviorGoals.filter(g => g.studentId === selectedStudentId);
    const relevantSessions = sessions.filter(s => 
      s.studentIds?.includes(selectedStudentId) &&
      new Date(s.date) >= dateRange.from &&
      new Date(s.date) <= dateRange.to
    );

    return {
      studentName: student.name,
      sessionCount: relevantSessions.length,
      goalCount: studentGoals.length,
      behaviorCount: student.behaviors.length,
      dateRangeText: `${format(dateRange.from, 'MMM d')} - ${format(dateRange.to, 'MMM d, yyyy')}`,
    };
  }, [selectedStudentId, students, behaviorGoals, sessions, dateRange]);

  const handleGenerateReport = () => {
    if (!selectedStudentId) {
      toast({
        title: 'Select a student',
        description: 'Please select a student to generate the report',
        variant: 'destructive',
      });
      return;
    }

    // In a real implementation, this would generate the actual report
    toast({
      title: 'Report Generated',
      description: `${reportTypeLabels[reportType].label} for ${previewStats?.studentName} has been generated.`,
    });
    setIsOpen(false);
  };

  const toggleOption = (key: keyof ReportOptions) => {
    setOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Export Reports
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Enhanced Report Export
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 py-4">
            {/* Student Selection */}
            <div className="space-y-2">
              <Label>Select Student</Label>
              <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a student" />
                </SelectTrigger>
                <SelectContent>
                  {students.filter(s => !s.isArchived).map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Report Type Selection */}
            <div className="space-y-2">
              <Label>Report Type</Label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(reportTypeLabels) as [ReportType, typeof reportTypeLabels[ReportType]][]).map(([type, { label, icon: Icon, description }]) => (
                  <Card 
                    key={type}
                    className={`cursor-pointer transition-colors ${reportType === type ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                    onClick={() => setReportType(type)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-2">
                        <Icon className={`w-4 h-4 mt-0.5 ${reportType === type ? 'text-primary' : 'text-muted-foreground'}`} />
                        <div>
                          <p className="text-sm font-medium">{label}</p>
                          <p className="text-xs text-muted-foreground">{description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <Separator />

            {/* Time Window Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Time Window
              </Label>
              <Select value={timeWindow} onValueChange={(v: TimeWindow) => setTimeWindow(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(timeWindowLabels) as [TimeWindow, string][]).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {timeWindow === 'custom' && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="space-y-1">
                    <Label className="text-xs">From</Label>
                    <Input
                      type="date"
                      value={customDateFrom}
                      onChange={(e) => setCustomDateFrom(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">To</Label>
                    <Input
                      type="date"
                      value={customDateTo}
                      onChange={(e) => setCustomDateTo(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Report Options */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Report Options
              </Label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'includeGraphs' as const, label: 'Include graphs', icon: BarChart3 },
                  { key: 'includeNarrative' as const, label: 'Include narrative summary', icon: FileText },
                  { key: 'includeTeacherComments' as const, label: 'Include teacher comments', icon: MessageSquare },
                  { key: 'includeBaselineComparison' as const, label: 'Include baseline vs current', icon: TrendingUp },
                  { key: 'includeRecommendations' as const, label: 'Include recommendations', icon: Lightbulb },
                  { key: 'includeNextSteps' as const, label: 'Include next steps', icon: CheckSquare },
                ].map(({ key, label, icon: Icon }) => (
                  <div key={key} className="flex items-center space-x-2">
                    <Checkbox
                      id={key}
                      checked={options[key]}
                      onCheckedChange={() => toggleOption(key)}
                    />
                    <Label htmlFor={key} className="text-sm flex items-center gap-1 cursor-pointer">
                      <Icon className="w-3 h-3 text-muted-foreground" />
                      {label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Additional Notes */}
            <div className="space-y-2">
              <Label>Additional Notes (Optional)</Label>
              <Textarea
                placeholder="Add any additional context or notes to include in the report..."
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                rows={3}
              />
            </div>

            {/* Preview Stats */}
            {previewStats && (
              <Card className="bg-muted/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Report Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Student</p>
                      <p className="font-medium">{previewStats.studentName}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Date Range</p>
                      <p className="font-medium">{previewStats.dateRangeText}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Sessions</p>
                      <p className="font-medium">{previewStats.sessionCount}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Goals</p>
                      <p className="font-medium">{previewStats.goalCount}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleGenerateReport} disabled={!selectedStudentId}>
            <Download className="w-4 h-4 mr-2" />
            Generate Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
