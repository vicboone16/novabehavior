import { useState } from 'react';
import { Download, FileText, Table, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
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
import { Separator } from '@/components/ui/separator';
import { SkillTarget, DTTSession, Student, PROMPT_LEVEL_LABELS } from '@/types/behavior';
import { format as formatDate } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface TargetWithSessions extends SkillTarget {
  studentName: string;
  studentColor: string;
  sessions: DTTSession[];
}

interface SkillAcquisitionExportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targets: TargetWithSessions[];
  dateRange: {
    start: Date;
    end: Date;
    label: string;
  };
  students: Student[];
}

type ExportFormat = 'csv' | 'json' | 'summary';

export function SkillAcquisitionExport({
  open,
  onOpenChange,
  targets,
  dateRange,
  students,
}: SkillAcquisitionExportProps) {
  const { toast } = useToast();
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv');
  const [includeTrialData, setIncludeTrialData] = useState(true);
  const [includePromptLevels, setIncludePromptLevels] = useState(true);
  const [includeMasteryCriteria, setIncludeMasteryCriteria] = useState(true);
  const [includeNotes, setIncludeNotes] = useState(true);
  const [groupByStudent, setGroupByStudent] = useState(true);

  const generateCSV = () => {
    const rows: string[][] = [];

    // Header
    const headers = [
      'Student Name',
      'Target Name',
      'Domain',
      'Program',
      'Method',
      'Status',
      'Session Date',
      'Trials',
      '% Correct',
      '% Independent',
    ];
    if (includeMasteryCriteria) {
      headers.push('Mastery Threshold', 'Consecutive Sessions Required');
    }
    if (includeNotes) {
      headers.push('Session Notes');
    }
    rows.push(headers);

    // Data rows
    targets.forEach(target => {
      target.sessions.forEach(session => {
        const row = [
          target.studentName,
          target.name,
          target.domain || '',
          target.program || '',
          target.method.toUpperCase(),
          target.status,
          formatDate(new Date(session.date), 'yyyy-MM-dd HH:mm'),
          session.trials.length.toString(),
          session.percentCorrect.toString(),
          session.percentIndependent.toString(),
        ];
        if (includeMasteryCriteria) {
          row.push(
            target.masteryCriteria?.percentCorrect?.toString() || '',
            target.masteryCriteria?.consecutiveSessions?.toString() || ''
          );
        }
        if (includeNotes) {
          row.push(session.notes || '');
        }
        rows.push(row);
      });
    });

    // Trial-level data
    if (includeTrialData) {
      rows.push([]);
      rows.push(['--- TRIAL-LEVEL DATA ---']);
      
      const trialHeaders = ['Student', 'Target', 'Session Date', 'Trial #', 'Correct', 'Prompt Level'];
      if (includeNotes) trialHeaders.push('Trial Notes');
      rows.push(trialHeaders);

      targets.forEach(target => {
        target.sessions.forEach(session => {
          session.trials.forEach((trial, idx) => {
            const row = [
              target.studentName,
              target.name,
              formatDate(new Date(session.date), 'yyyy-MM-dd HH:mm'),
              (idx + 1).toString(),
              trial.isCorrect ? 'Yes' : 'No',
              PROMPT_LEVEL_LABELS[trial.promptLevel] || trial.promptLevel,
            ];
            if (includeNotes) row.push(trial.notes || '');
            rows.push(row);
          });
        });
      });
    }

    return rows.map(row => 
      row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(',')
    ).join('\n');
  };

  const generateJSON = () => {
    const data = {
      exportDate: new Date().toISOString(),
      dateRange: {
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString(),
      },
      summary: {
        totalTargets: targets.length,
        totalSessions: targets.reduce((sum, t) => sum + t.sessions.length, 0),
        totalTrials: targets.reduce((sum, t) => 
          sum + t.sessions.reduce((s, sess) => s + sess.trials.length, 0), 0
        ),
        statusCounts: targets.reduce((acc, t) => {
          acc[t.status] = (acc[t.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      },
      targets: groupByStudent
        ? students.map(student => ({
            studentName: student.name,
            targets: targets.filter(t => t.studentId === student.id).map(t => ({
              name: t.name,
              domain: t.domain,
              program: t.program,
              method: t.method,
              status: t.status,
              masteryCriteria: includeMasteryCriteria ? t.masteryCriteria : undefined,
              sessions: t.sessions.map(s => ({
                date: s.date,
                percentCorrect: s.percentCorrect,
                percentIndependent: s.percentIndependent,
                trialsCount: s.trials.length,
                trials: includeTrialData ? s.trials.map(trial => ({
                  correct: trial.isCorrect,
                  promptLevel: includePromptLevels ? trial.promptLevel : undefined,
                  errorType: trial.errorType,
                  notes: includeNotes ? trial.notes : undefined,
                })) : undefined,
                notes: includeNotes ? s.notes : undefined,
              })),
            })),
          }))
        : targets.map(t => ({
            studentName: t.studentName,
            name: t.name,
            domain: t.domain,
            program: t.program,
            method: t.method,
            status: t.status,
            masteryCriteria: includeMasteryCriteria ? t.masteryCriteria : undefined,
            sessions: t.sessions.map(s => ({
              date: s.date,
              percentCorrect: s.percentCorrect,
              percentIndependent: s.percentIndependent,
              trialsCount: s.trials.length,
              trials: includeTrialData ? s.trials : undefined,
              notes: includeNotes ? s.notes : undefined,
            })),
          })),
    };

    return JSON.stringify(data, null, 2);
  };

  const generateSummary = () => {
    let summary = `SKILL ACQUISITION SUMMARY REPORT\n`;
    summary += `Generated: ${formatDate(new Date(), 'MMMM d, yyyy h:mm a')}\n`;
    summary += `Date Range: ${formatDate(dateRange.start, 'MMM d, yyyy')} - ${formatDate(dateRange.end, 'MMM d, yyyy')}\n`;
    summary += `${'='.repeat(60)}\n\n`;

    // Overview
    summary += `OVERVIEW\n${'-'.repeat(40)}\n`;
    summary += `Total Skill Targets: ${targets.length}\n`;
    summary += `Total Sessions: ${targets.reduce((sum, t) => sum + t.sessions.length, 0)}\n`;
    summary += `Total Trials: ${targets.reduce((sum, t) => 
      sum + t.sessions.reduce((s, sess) => s + sess.trials.length, 0), 0)}\n\n`;

    // Status breakdown
    summary += `STATUS BREAKDOWN\n${'-'.repeat(40)}\n`;
    const statusCounts: Record<string, number> = {};
    targets.forEach(t => {
      statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
    });
    Object.entries(statusCounts).forEach(([status, count]) => {
      summary += `  ${status.charAt(0).toUpperCase() + status.slice(1)}: ${count}\n`;
    });
    summary += `\n`;

    // Per-student summary
    summary += `BY STUDENT\n${'-'.repeat(40)}\n`;
    const studentGroups = students.map(student => ({
      student,
      studentTargets: targets.filter(t => t.studentId === student.id),
    })).filter(g => g.studentTargets.length > 0);

    studentGroups.forEach(({ student, studentTargets }) => {
      summary += `\n${student.name}\n`;
      summary += `  Targets: ${studentTargets.length}\n`;
      
      studentTargets.forEach(target => {
        const recentSessions = target.sessions.slice(-3);
        const avgRecent = recentSessions.length > 0
          ? Math.round(recentSessions.reduce((s, sess) => s + sess.percentCorrect, 0) / recentSessions.length)
          : 0;

        summary += `\n  • ${target.name}\n`;
        summary += `    Status: ${target.status}\n`;
        summary += `    Method: ${target.method.toUpperCase()}\n`;
        summary += `    Total Sessions: ${target.sessions.length}\n`;
        if (recentSessions.length > 0) {
          summary += `    Avg Last 3 Sessions: ${avgRecent}%\n`;
          summary += `    Last Session: ${formatDate(new Date(recentSessions[recentSessions.length - 1].date), 'MMM d, yyyy')} - ${recentSessions[recentSessions.length - 1].percentCorrect}%\n`;
        }
        if (target.masteryCriteria) {
          summary += `    Mastery Criteria: ${target.masteryCriteria.percentCorrect}% for ${target.masteryCriteria.consecutiveSessions} sessions\n`;
        }
      });
    });

    return summary;
  };

  const handleExport = () => {
    let content: string;
    let filename: string;
    let mimeType: string;

    const dateStr = formatDate(new Date(), 'yyyy-MM-dd');

    switch (exportFormat) {
      case 'csv':
        content = generateCSV();
        filename = `skill-acquisition-${dateStr}.csv`;
        mimeType = 'text/csv';
        break;
      case 'json':
        content = generateJSON();
        filename = `skill-acquisition-${dateStr}.json`;
        mimeType = 'application/json';
        break;
      case 'summary':
        content = generateSummary();
        filename = `skill-acquisition-summary-${dateStr}.txt`;
        mimeType = 'text/plain';
        break;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Export complete',
      description: `Downloaded ${filename}`,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Export Skill Acquisition Data
          </DialogTitle>
          <DialogDescription>
            Export {targets.length} skill targets with {targets.reduce((sum, t) => sum + t.sessions.length, 0)} sessions
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Format Selection */}
          <div className="space-y-2">
            <Label>Export Format</Label>
            <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as ExportFormat)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">
                  <div className="flex items-center gap-2">
                    <Table className="w-4 h-4" />
                    CSV Spreadsheet
                  </div>
                </SelectItem>
                <SelectItem value="json">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4" />
                    JSON Data
                  </div>
                </SelectItem>
                <SelectItem value="summary">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Text Summary Report
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Options */}
          <div className="space-y-3">
            <Label className="text-sm text-muted-foreground">Include in Export</Label>

            <div className="flex items-center gap-2">
              <Checkbox
                id="trial-data"
                checked={includeTrialData}
                onCheckedChange={(checked) => setIncludeTrialData(checked === true)}
              />
              <Label htmlFor="trial-data" className="text-sm cursor-pointer">
                Trial-level data
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="prompt-levels"
                checked={includePromptLevels}
                onCheckedChange={(checked) => setIncludePromptLevels(checked === true)}
                disabled={!includeTrialData}
              />
              <Label htmlFor="prompt-levels" className="text-sm cursor-pointer">
                Prompt levels
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="mastery"
                checked={includeMasteryCriteria}
                onCheckedChange={(checked) => setIncludeMasteryCriteria(checked === true)}
              />
              <Label htmlFor="mastery" className="text-sm cursor-pointer">
                Mastery criteria
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="notes"
                checked={includeNotes}
                onCheckedChange={(checked) => setIncludeNotes(checked === true)}
              />
              <Label htmlFor="notes" className="text-sm cursor-pointer">
                Session & trial notes
              </Label>
            </div>

            {exportFormat === 'json' && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="group-student"
                  checked={groupByStudent}
                  onCheckedChange={(checked) => setGroupByStudent(checked === true)}
                />
                <Label htmlFor="group-student" className="text-sm cursor-pointer">
                  Group by student
                </Label>
              </div>
            )}
          </div>

          <Separator />

          {/* Preview */}
          <div className="p-3 bg-muted/50 rounded-lg text-xs">
            <div className="font-medium mb-1">Export Preview</div>
            <div className="text-muted-foreground space-y-0.5">
              <div>• {targets.length} skill targets</div>
              <div>• {targets.reduce((sum, t) => sum + t.sessions.length, 0)} sessions</div>
              {includeTrialData && (
                <div>
                  • {targets.reduce((sum, t) => 
                    sum + t.sessions.reduce((s, sess) => s + sess.trials.length, 0), 0
                  )} individual trials
                </div>
              )}
              <div>• Date range: {exportFormat === 'summary' ? dateRange.label : `${formatDate(dateRange.start, 'MMM d')} - ${formatDate(dateRange.end, 'MMM d')}`}</div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
