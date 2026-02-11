import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Download, FileDown, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { useDataStore } from '@/store/dataStore';
import { Student, FUNCTION_OPTIONS } from '@/types/behavior';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
} from 'docx';
import { saveAs } from 'file-saver';
import { toast } from 'sonner';

interface ComprehensiveAssessmentExportProps {
  student: Student;
}

function createBorders() {
  return {
    top: { style: BorderStyle.SINGLE, size: 1, color: '999999' },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: '999999' },
    left: { style: BorderStyle.SINGLE, size: 1, color: '999999' },
    right: { style: BorderStyle.SINGLE, size: 1, color: '999999' },
  };
}

export function ComprehensiveAssessmentExport({ student }: ComprehensiveAssessmentExportProps) {
  const { sessions, abcEntries, frequencyEntries, durationEntries, intervalEntries } = useDataStore();
  const [open, setOpen] = useState(false);

  // Toggle state for sections
  const [includeIndirect, setIncludeIndirect] = useState(true);
  const [includeDirect, setIncludeDirect] = useState(true);
  const [includeFunctionAnalysis, setIncludeFunctionAnalysis] = useState(true);
  const [includeHypothesis, setIncludeHypothesis] = useState(true);
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(new Set());
  const [selectAllSessions, setSelectAllSessions] = useState(true);

  // Get student sessions
  const studentSessions = useMemo(() => {
    return sessions
      .filter(s => s.studentIds?.includes(student.id))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sessions, student.id]);

  // Get data counts per session
  const sessionDataMap = useMemo(() => {
    const map = new Map<string, { abc: number; freq: number; dur: number; interval: number }>();
    studentSessions.forEach(s => {
      const abc = abcEntries.filter(e => e.studentId === student.id && e.sessionId === s.id).length;
      const freq = frequencyEntries.filter(e => e.studentId === student.id && e.sessionId === s.id).reduce((sum, e) => sum + e.count, 0);
      const dur = durationEntries.filter(e => e.studentId === student.id && e.sessionId === s.id).reduce((sum, e) => sum + (e.duration || 0), 0);
      const interval = intervalEntries.filter(e => e.studentId === student.id && e.sessionId === s.id).length;
      map.set(s.id, { abc, freq, dur, interval });
    });
    return map;
  }, [studentSessions, abcEntries, frequencyEntries, durationEntries, intervalEntries, student.id]);

  // Also find orphaned data (entries with session IDs not in our session list)
  const orphanedSessionIds = useMemo(() => {
    const knownIds = new Set(studentSessions.map(s => s.id));
    const orphanIds = new Set<string>();
    abcEntries.filter(e => e.studentId === student.id && e.sessionId && !knownIds.has(e.sessionId)).forEach(e => orphanIds.add(e.sessionId!));
    frequencyEntries.filter(e => e.studentId === student.id && e.sessionId && !knownIds.has(e.sessionId)).forEach(e => orphanIds.add(e.sessionId!));
    durationEntries.filter(e => e.studentId === student.id && e.sessionId && !knownIds.has(e.sessionId)).forEach(e => orphanIds.add(e.sessionId!));
    intervalEntries.filter(e => e.studentId === student.id && e.sessionId && !knownIds.has(e.sessionId)).forEach(e => orphanIds.add(e.sessionId!));
    return Array.from(orphanIds);
  }, [studentSessions, abcEntries, frequencyEntries, durationEntries, intervalEntries, student.id]);

  const savedAssessments = student.indirectAssessments || [];

  const toggleSession = (id: string) => {
    setSelectedSessionIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setSelectAllSessions(false);
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAllSessions(checked);
    if (checked) {
      setSelectedSessionIds(new Set([...studentSessions.map(s => s.id), ...orphanedSessionIds]));
    } else {
      setSelectedSessionIds(new Set());
    }
  };

  // Initialize selection on open
  const handleOpenChange = (o: boolean) => {
    setOpen(o);
    if (o) {
      const allIds = [...studentSessions.map(s => s.id), ...orphanedSessionIds];
      setSelectedSessionIds(new Set(allIds));
      setSelectAllSessions(true);
    }
  };

  const getSessionEntries = (sessionId: string) => ({
    abc: abcEntries.filter(e => e.studentId === student.id && e.sessionId === sessionId),
    freq: frequencyEntries.filter(e => e.studentId === student.id && e.sessionId === sessionId),
    dur: durationEntries.filter(e => e.studentId === student.id && e.sessionId === sessionId),
    intervals: intervalEntries.filter(e => e.studentId === student.id && e.sessionId === sessionId),
  });

  const handleExport = async () => {
    try {
      const children: (Paragraph | Table)[] = [];

      // Title
      children.push(
        new Paragraph({
          text: 'COMPREHENSIVE ASSESSMENT DATA EXPORT',
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
        })
      );
      children.push(new Paragraph({ text: '' }));
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Student: ', bold: true }),
            new TextRun(student.displayName || student.name),
          ],
        })
      );
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Date Generated: ', bold: true }),
            new TextRun(format(new Date(), 'MMMM d, yyyy h:mm a')),
          ],
        })
      );
      children.push(new Paragraph({ text: '' }));

      // Section 1: Indirect Assessment Results
      if (includeIndirect && savedAssessments.length > 0) {
        children.push(
          new Paragraph({
            text: 'INDIRECT ASSESSMENT RESULTS',
            heading: HeadingLevel.HEADING_1,
          })
        );
        children.push(new Paragraph({ text: '' }));

        for (const assessment of savedAssessments) {
          children.push(
            new Paragraph({
              text: `${assessment.type} - ${assessment.targetBehavior}`,
              heading: HeadingLevel.HEADING_2,
            })
          );
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: 'Completed By: ', bold: true }),
                new TextRun(assessment.completedBy),
                new TextRun({ text: '  |  Date: ', bold: true }),
                new TextRun(format(new Date(assessment.completedAt), 'MMM d, yyyy')),
                new TextRun({ text: '  |  Primary Function: ', bold: true }),
                new TextRun(FUNCTION_OPTIONS.find(f => f.value === assessment.primaryFunction)?.label || assessment.primaryFunction),
              ],
            })
          );

          // Scores table
          const scoreRows = Object.entries(assessment.scores || {}).map(([fn, score]) => {
            const label = FUNCTION_OPTIONS.find(f => f.value === fn)?.label || fn;
            return new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ text: label })], borders: createBorders() }),
                new TableCell({ children: [new Paragraph({ text: String(score) })], borders: createBorders() }),
              ],
            });
          });

          if (scoreRows.length > 0) {
            children.push(
              new Table({
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Function', bold: true })] })], borders: createBorders(), width: { size: 60, type: WidthType.PERCENTAGE } }),
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Score', bold: true })] })], borders: createBorders(), width: { size: 40, type: WidthType.PERCENTAGE } }),
                    ],
                  }),
                  ...scoreRows,
                ],
                width: { size: 100, type: WidthType.PERCENTAGE },
              })
            );
          }

          if (assessment.notes) {
            children.push(new Paragraph({ text: '' }));
            children.push(new Paragraph({ children: [new TextRun({ text: 'Notes: ', bold: true }), new TextRun(assessment.notes)] }));
          }
          children.push(new Paragraph({ text: '' }));
        }
      }

      // Section 2: Direct Observation Data
      if (includeDirect) {
        children.push(
          new Paragraph({
            text: 'DIRECT OBSERVATION DATA',
            heading: HeadingLevel.HEADING_1,
          })
        );
        children.push(new Paragraph({ text: '' }));

        const targetIds = selectAllSessions
          ? [...studentSessions.map(s => s.id), ...orphanedSessionIds]
          : Array.from(selectedSessionIds);

        for (const sessionId of targetIds) {
          const session = studentSessions.find(s => s.id === sessionId);
          const entries = getSessionEntries(sessionId);
          const hasData = entries.abc.length > 0 || entries.freq.length > 0 || entries.dur.length > 0 || entries.intervals.length > 0;
          if (!hasData) continue;

          const sessionLabel = session
            ? `${format(new Date(session.date), 'MMM d, yyyy h:mm a')} (${session.sessionLengthMinutes} min)`
            : `Observation (recovered data)`;

          children.push(
            new Paragraph({
              text: sessionLabel,
              heading: HeadingLevel.HEADING_2,
            })
          );

          // Summary
          const totalFreq = entries.freq.reduce((s, e) => s + e.count, 0);
          const totalDur = entries.dur.reduce((s, e) => s + (e.duration || 0), 0);
          const intervalsOccurred = entries.intervals.filter(e => e.occurred).length;

          children.push(new Paragraph({
            children: [
              new TextRun({ text: `ABC Records: ${entries.abc.length}  |  ` }),
              new TextRun({ text: `Frequency: ${totalFreq}  |  ` }),
              new TextRun({ text: `Duration: ${Math.floor(totalDur / 60)}m ${totalDur % 60}s  |  ` }),
              new TextRun({ text: `Intervals: ${intervalsOccurred}/${entries.intervals.length}` }),
            ],
          }));

          // ABC detail table
          if (entries.abc.length > 0) {
            children.push(new Paragraph({ text: '' }));
            const abcRows = entries.abc.map(e => {
              const antecedents = e.antecedents?.length ? e.antecedents.join('; ') : e.antecedent || '';
              const consequences = e.consequences?.length ? e.consequences.join('; ') : e.consequence || '';
              const functions = e.functions?.map(f => FUNCTION_OPTIONS.find(fo => fo.value === f)?.label || f).join(', ') || '';
              const freqText = e.frequencyCount > 1 ? `×${e.frequencyCount}` : '';
              const durText = e.hasDuration && e.durationMinutes != null ? `${e.durationMinutes}m` : '';
              const details = [freqText, durText].filter(Boolean).join(', ');
              const behaviorCol = e.behavior + (details ? ` (${details})` : '');
              
              // Include concurrent behaviors if present
              const concurrentNote = e.behaviors?.length 
                ? '\n' + e.behaviors.map(b => `  + ${b.behaviorName}${b.frequencyCount > 1 ? ` ×${b.frequencyCount}` : ''}${b.durationMinutes ? ` ${b.durationMinutes}m` : ''}`).join('\n')
                : '';
              
              return new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: format(new Date(e.timestamp), 'h:mm a'), spacing: { before: 40, after: 40 } })], borders: createBorders() }),
                  new TableCell({ children: [new Paragraph({ text: behaviorCol + concurrentNote })], borders: createBorders() }),
                  new TableCell({ children: [new Paragraph({ text: antecedents })], borders: createBorders() }),
                  new TableCell({ children: [new Paragraph({ text: consequences })], borders: createBorders() }),
                  new TableCell({ children: [new Paragraph({ text: functions })], borders: createBorders() }),
                ],
              });
            });

            children.push(
              new Table({
                rows: [
                  new TableRow({
                    children: ['Time', 'Behavior', 'Antecedent(s)', 'Consequence(s)', 'Function'].map(h =>
                      new TableCell({
                        children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })],
                        borders: createBorders(),
                      })
                    ),
                  }),
                  ...abcRows,
                ],
                width: { size: 100, type: WidthType.PERCENTAGE },
              })
            );
          }

          // Frequency detail
          if (entries.freq.length > 0) {
            children.push(new Paragraph({ text: '' }));
            children.push(new Paragraph({ children: [new TextRun({ text: 'Frequency Data:', bold: true })] }));
            const behaviorCounts = new Map<string, number>();
            entries.freq.forEach(e => {
              const beh = student.behaviors.find(b => b.id === e.behaviorId);
              const name = beh?.name || e.behaviorId;
              behaviorCounts.set(name, (behaviorCounts.get(name) || 0) + e.count);
            });
            behaviorCounts.forEach((count, name) => {
              children.push(new Paragraph({ text: `  • ${name}: ${count}` }));
            });
          }

          children.push(new Paragraph({ text: '' }));
        }
      }

      // Section 3: Function Analysis
      if (includeFunctionAnalysis) {
        children.push(
          new Paragraph({
            text: 'FUNCTION ANALYSIS',
            heading: HeadingLevel.HEADING_1,
          })
        );
        children.push(new Paragraph({ text: '' }));

        const studentAbcData = abcEntries.filter(e => e.studentId === student.id);
        const functionCounts = new Map<string, number>();
        const antecedentCounts = new Map<string, number>();
        const consequenceCounts = new Map<string, number>();

        studentAbcData.forEach(entry => {
          const ants = entry.antecedents || (entry.antecedent ? [entry.antecedent] : []);
          const cons = entry.consequences || (entry.consequence ? [entry.consequence] : []);
          const fns = entry.functions?.filter(f => f !== 'unknown') || [];

          ants.forEach(a => antecedentCounts.set(a, (antecedentCounts.get(a) || 0) + 1));
          cons.forEach(c => consequenceCounts.set(c, (consequenceCounts.get(c) || 0) + 1));
          fns.forEach(f => {
            const label = FUNCTION_OPTIONS.find(fo => fo.value === f)?.label || f;
            functionCounts.set(label, (functionCounts.get(label) || 0) + 1);
          });
        });

        children.push(new Paragraph({ children: [new TextRun({ text: 'Function Distribution:', bold: true })] }));
        const total = Array.from(functionCounts.values()).reduce((a, b) => a + b, 0);
        functionCounts.forEach((count, label) => {
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          children.push(new Paragraph({ text: `  • ${label}: ${count} (${pct}%)` }));
        });

        children.push(new Paragraph({ text: '' }));
        children.push(new Paragraph({ children: [new TextRun({ text: 'Top Antecedents:', bold: true })] }));
        Array.from(antecedentCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).forEach(([value, count]) => {
          const pct = studentAbcData.length > 0 ? Math.round((count / studentAbcData.length) * 100) : 0;
          children.push(new Paragraph({ text: `  • ${value}: ${count} (${pct}%)` }));
        });

        children.push(new Paragraph({ text: '' }));
        children.push(new Paragraph({ children: [new TextRun({ text: 'Top Consequences:', bold: true })] }));
        Array.from(consequenceCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).forEach(([value, count]) => {
          const pct = studentAbcData.length > 0 ? Math.round((count / studentAbcData.length) * 100) : 0;
          children.push(new Paragraph({ text: `  • ${value}: ${count} (${pct}%)` }));
        });
        children.push(new Paragraph({ text: '' }));
      }

      // Section 4: Hypothesis
      if (includeHypothesis) {
        children.push(
          new Paragraph({
            text: 'HYPOTHESIS STATEMENT',
            heading: HeadingLevel.HEADING_1,
          })
        );
        children.push(new Paragraph({ text: '' }));

        const studentAbcData = abcEntries.filter(e => e.studentId === student.id);
        const functionCounts = new Map<string, number>();
        const antecedentCounts = new Map<string, number>();
        const consequenceCounts = new Map<string, number>();

        studentAbcData.forEach(entry => {
          const fns = entry.functions?.filter(f => f !== 'unknown') || [];
          const ants = entry.antecedents || (entry.antecedent ? [entry.antecedent] : []);
          const cons = entry.consequences || (entry.consequence ? [entry.consequence] : []);
          fns.forEach(f => functionCounts.set(f, (functionCounts.get(f) || 0) + 1));
          ants.forEach(a => antecedentCounts.set(a, (antecedentCounts.get(a) || 0) + 1));
          cons.forEach(c => consequenceCounts.set(c, (consequenceCounts.get(c) || 0) + 1));
        });

        const topFunction = Array.from(functionCounts.entries()).sort((a, b) => b[1] - a[1])[0];
        const topAntecedent = Array.from(antecedentCounts.entries()).sort((a, b) => b[1] - a[1])[0];
        const topConsequence = Array.from(consequenceCounts.entries()).sort((a, b) => b[1] - a[1])[0];
        const behaviorNames = student.behaviors.map(b => b.name).join(', ');

        if (topFunction && topAntecedent && topConsequence) {
          const fnLabel = FUNCTION_OPTIONS.find(f => f.value === topFunction[0])?.label || topFunction[0];
          children.push(new Paragraph({
            children: [new TextRun({
              text: `When ${topAntecedent[0].toLowerCase()}, ${student.name} engages in ${behaviorNames || 'target behavior(s)'} in order to obtain ${fnLabel.toLowerCase()}. The behavior is maintained by ${topConsequence[0].toLowerCase()}.`,
              italics: true,
            })],
          }));
        } else {
          children.push(new Paragraph({ text: 'Insufficient data to generate a hypothesis statement. Continue collecting ABC data with function tagging.' }));
        }
        children.push(new Paragraph({ text: '' }));
      }

      // Generate document
      const doc = new Document({
        sections: [{ properties: {}, children }],
      });

      const blob = await Packer.toBlob(doc);
      const filename = `Comprehensive-Assessment-${(student.displayName || student.name).replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}.docx`;
      saveAs(blob, filename);
      toast.success('Comprehensive assessment exported');
      setOpen(false);
    } catch (error) {
      console.error('Comprehensive export error:', error);
      toast.error('Failed to export assessment data');
    }
  };

  const allSessionIds = [...studentSessions.map(s => s.id), ...orphanedSessionIds];
  const sessionsWithData = allSessionIds.filter(id => {
    const data = sessionDataMap.get(id);
    if (data) return data.abc > 0 || data.freq > 0 || data.dur > 0 || data.interval > 0;
    // Check orphaned
    return abcEntries.some(e => e.studentId === student.id && e.sessionId === id) ||
           frequencyEntries.some(e => e.studentId === student.id && e.sessionId === id);
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <FileDown className="w-4 h-4" />
          Export All Data
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-sm">Comprehensive Assessment Export</DialogTitle>
          <p className="text-xs text-muted-foreground">
            Select which sections to include in the exported Word document
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Section toggles */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="indirect"
                checked={includeIndirect}
                onCheckedChange={(c) => setIncludeIndirect(!!c)}
              />
              <Label htmlFor="indirect" className="text-sm cursor-pointer">
                Indirect Assessments
                {savedAssessments.length > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs">{savedAssessments.length}</Badge>
                )}
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="direct"
                checked={includeDirect}
                onCheckedChange={(c) => setIncludeDirect(!!c)}
              />
              <Label htmlFor="direct" className="text-sm cursor-pointer">
                Direct Observation Data
                <Badge variant="secondary" className="ml-2 text-xs">{sessionsWithData.length} sessions</Badge>
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="functions"
                checked={includeFunctionAnalysis}
                onCheckedChange={(c) => setIncludeFunctionAnalysis(!!c)}
              />
              <Label htmlFor="functions" className="text-sm cursor-pointer">
                Function Analysis
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="hypothesis"
                checked={includeHypothesis}
                onCheckedChange={(c) => setIncludeHypothesis(!!c)}
              />
              <Label htmlFor="hypothesis" className="text-sm cursor-pointer">
                Hypothesis Statement
              </Label>
            </div>
          </div>

          {/* Session selection (only if direct observations included) */}
          {includeDirect && studentSessions.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Select Observations</Label>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="selectAll"
                      checked={selectAllSessions}
                      onCheckedChange={(c) => handleSelectAll(!!c)}
                    />
                    <Label htmlFor="selectAll" className="text-xs cursor-pointer">All</Label>
                  </div>
                </div>
                <ScrollArea className="h-[150px] border rounded-md p-2">
                  <div className="space-y-1">
                    {studentSessions.map(session => {
                      const data = sessionDataMap.get(session.id);
                      const hasData = data && (data.abc > 0 || data.freq > 0 || data.dur > 0 || data.interval > 0);
                      return (
                        <div key={session.id} className="flex items-center gap-2 py-1">
                          <Checkbox
                            checked={selectAllSessions || selectedSessionIds.has(session.id)}
                            onCheckedChange={() => toggleSession(session.id)}
                          />
                          <span className="text-xs">
                            {format(new Date(session.date), 'MMM d, yyyy h:mm a')}
                          </span>
                          {hasData ? (
                            <Badge variant="secondary" className="text-[10px] h-4">data</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] h-4 text-muted-foreground">empty</Badge>
                          )}
                        </div>
                      );
                    })}
                    {orphanedSessionIds.map(id => (
                      <div key={id} className="flex items-center gap-2 py-1">
                        <Checkbox
                          checked={selectAllSessions || selectedSessionIds.has(id)}
                          onCheckedChange={() => toggleSession(id)}
                        />
                        <span className="text-xs">Recovered observation data</span>
                        <Badge variant="secondary" className="text-[10px] h-4">recovered</Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
          <Button size="sm" className="gap-1" onClick={handleExport}>
            <Download className="w-4 h-4" />
            Export to Word
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
