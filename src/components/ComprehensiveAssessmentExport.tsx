import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Download, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import { Student, FUNCTION_OPTIONS, PROMPT_LEVEL_LABELS } from '@/types/behavior';
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

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

export function ComprehensiveAssessmentExport({ student }: ComprehensiveAssessmentExportProps) {
  const { sessions, abcEntries, frequencyEntries, durationEntries, intervalEntries } = useDataStore();
  const [open, setOpen] = useState(false);

  // Toggle state for sections
  const [includeIndirect, setIncludeIndirect] = useState(true);
  const [includeDirect, setIncludeDirect] = useState(true);
  const [includeFunctionAnalysis, setIncludeFunctionAnalysis] = useState(true);
  const [includeHypothesis, setIncludeHypothesis] = useState(true);
  const [includeSkillAcquisition, setIncludeSkillAcquisition] = useState(true);
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(new Set());
  const [selectAllSessions, setSelectAllSessions] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Get ALL session IDs that have data for this student
  const sessionsWithData = useMemo(() => {
    const result: { id: string; date: Date; label: string; isOrphaned: boolean; abc: number; freq: number; dur: number; interval: number }[] = [];

    // Known sessions
    sessions
      .filter(s => s.studentIds?.includes(student.id))
      .forEach(s => {
        const abc = abcEntries.filter(e => e.studentId === student.id && e.sessionId === s.id).length;
        const freq = frequencyEntries.filter(e => e.studentId === student.id && e.sessionId === s.id).reduce((sum, e) => sum + e.count, 0);
        const dur = durationEntries.filter(e => e.studentId === student.id && e.sessionId === s.id).length;
        const interval = intervalEntries.filter(e => e.studentId === student.id && e.sessionId === s.id).length;
        const hasData = abc > 0 || freq > 0 || dur > 0 || interval > 0 || !!s.notes;
        if (hasData) {
          result.push({
            id: s.id,
            date: new Date(s.date),
            label: `${format(new Date(s.date), 'MMM d, yyyy h:mm a')} (${s.sessionLengthMinutes} min)`,
            isOrphaned: false,
            abc, freq, dur, interval,
          });
        }
      });

    // Orphaned sessions
    const knownIds = new Set(sessions.map(s => s.id));
    const orphanIds = new Set<string>();
    abcEntries.filter(e => e.studentId === student.id && e.sessionId && !knownIds.has(e.sessionId)).forEach(e => orphanIds.add(e.sessionId!));
    frequencyEntries.filter(e => e.studentId === student.id && e.sessionId && !knownIds.has(e.sessionId)).forEach(e => orphanIds.add(e.sessionId!));
    durationEntries.filter(e => e.studentId === student.id && e.sessionId && !knownIds.has(e.sessionId)).forEach(e => orphanIds.add(e.sessionId!));
    intervalEntries.filter(e => e.studentId === student.id && e.sessionId && !knownIds.has(e.sessionId)).forEach(e => orphanIds.add(e.sessionId!));

    orphanIds.forEach(oid => {
      const abc = abcEntries.filter(e => e.studentId === student.id && e.sessionId === oid).length;
      const freq = frequencyEntries.filter(e => e.studentId === student.id && e.sessionId === oid).reduce((sum, e) => sum + e.count, 0);
      const dur = durationEntries.filter(e => e.studentId === student.id && e.sessionId === oid).length;
      const interval = intervalEntries.filter(e => e.studentId === student.id && e.sessionId === oid).length;
      // Get earliest timestamp
      const timestamps: Date[] = [];
      abcEntries.filter(e => e.studentId === student.id && e.sessionId === oid).forEach(e => timestamps.push(new Date(e.timestamp)));
      frequencyEntries.filter(e => e.studentId === student.id && e.sessionId === oid).forEach(e => timestamps.push(new Date(e.timestamp)));
      const earliest = timestamps.length > 0 ? new Date(Math.min(...timestamps.map(t => t.getTime()))) : new Date();
      result.push({
        id: oid, date: earliest,
        label: `Recovered data — ${format(earliest, 'MMM d, yyyy')}`,
        isOrphaned: true, abc, freq, dur, interval,
      });
    });

    return result.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [sessions, student.id, abcEntries, frequencyEntries, durationEntries, intervalEntries]);

  // Date-filtered sessions
  const filteredSessions = useMemo(() => {
    return sessionsWithData.filter(s => {
      if (dateFrom && s.date < new Date(dateFrom)) return false;
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59);
        if (s.date > to) return false;
      }
      return true;
    });
  }, [sessionsWithData, dateFrom, dateTo]);

  const savedAssessments = student.indirectAssessments || [];
  const skillTargets = student.skillTargets || [];
  const dttSessions = student.dttSessions || [];

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
      setSelectedSessionIds(new Set(filteredSessions.map(s => s.id)));
    } else {
      setSelectedSessionIds(new Set());
    }
  };

  const handleOpenChange = (o: boolean) => {
    setOpen(o);
    if (o) {
      setSelectedSessionIds(new Set(sessionsWithData.map(s => s.id)));
      setSelectAllSessions(true);
      setDateFrom('');
      setDateTo('');
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
      children.push(new Paragraph({ text: 'COMPREHENSIVE ASSESSMENT DATA EXPORT', heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }));
      children.push(new Paragraph({ text: '' }));
      children.push(new Paragraph({ children: [new TextRun({ text: 'Student: ', bold: true }), new TextRun(student.displayName || student.name)] }));
      children.push(new Paragraph({ children: [new TextRun({ text: 'Date Generated: ', bold: true }), new TextRun(format(new Date(), 'MMMM d, yyyy h:mm a'))] }));
      if (dateFrom || dateTo) {
        children.push(new Paragraph({ children: [new TextRun({ text: 'Date Range: ', bold: true }), new TextRun(`${dateFrom || 'Start'} — ${dateTo || 'Present'}`)] }));
      }
      children.push(new Paragraph({ text: '' }));

      // ═══════════════════════════════════════════
      // SECTION 1: INDIRECT ASSESSMENT RESULTS
      // ═══════════════════════════════════════════
      if (includeIndirect && savedAssessments.length > 0) {
        children.push(new Paragraph({ text: 'INDIRECT ASSESSMENT RESULTS', heading: HeadingLevel.HEADING_1 }));
        children.push(new Paragraph({ text: '' }));

        for (const assessment of savedAssessments) {
          children.push(new Paragraph({ text: `${assessment.type} — ${assessment.targetBehavior}`, heading: HeadingLevel.HEADING_2 }));
          children.push(new Paragraph({
            children: [
              new TextRun({ text: 'Completed By: ', bold: true }), new TextRun(assessment.completedBy),
              new TextRun({ text: '  |  Date: ', bold: true }), new TextRun(format(new Date(assessment.completedAt), 'MMM d, yyyy')),
              new TextRun({ text: '  |  Primary Function: ', bold: true }),
              new TextRun(FUNCTION_OPTIONS.find(f => f.value === assessment.primaryFunction)?.label || assessment.primaryFunction),
            ],
          }));

          // Scores table
          const scoreEntries = Object.entries(assessment.scores || {});
          if (scoreEntries.length > 0) {
            children.push(new Table({
              rows: [
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Function', bold: true })] })], borders: createBorders(), width: { size: 50, type: WidthType.PERCENTAGE } }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Score', bold: true })] })], borders: createBorders(), width: { size: 25, type: WidthType.PERCENTAGE } }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Percentage', bold: true })] })], borders: createBorders(), width: { size: 25, type: WidthType.PERCENTAGE } }),
                  ],
                }),
                ...scoreEntries.map(([fn, score]) => {
                  const label = FUNCTION_OPTIONS.find(f => f.value === fn)?.label || fn;
                  const totalScore = scoreEntries.reduce((sum, [, s]) => sum + (s as number), 0);
                  const pct = totalScore > 0 ? Math.round(((score as number) / totalScore) * 100) : 0;
                  return new TableRow({
                    children: [
                      new TableCell({ children: [new Paragraph({ text: label })], borders: createBorders() }),
                      new TableCell({ children: [new Paragraph({ text: String(score) })], borders: createBorders() }),
                      new TableCell({ children: [new Paragraph({ text: `${pct}%` })], borders: createBorders() }),
                    ],
                  });
                }),
              ],
              width: { size: 100, type: WidthType.PERCENTAGE },
            }));
          }

          // Item-level responses if available
          if (assessment.responses && Object.keys(assessment.responses).length > 0) {
            children.push(new Paragraph({ text: '' }));
            children.push(new Paragraph({ children: [new TextRun({ text: 'Item Responses:', bold: true })] }));
            Object.entries(assessment.responses).forEach(([itemKey, value]) => {
              children.push(new Paragraph({ text: `  ${itemKey}: ${value}` }));
            });
          }

          if (assessment.notes) {
            children.push(new Paragraph({ text: '' }));
            children.push(new Paragraph({ children: [new TextRun({ text: 'Notes: ', bold: true }), new TextRun(assessment.notes)] }));
          }
          children.push(new Paragraph({ text: '' }));
        }
      }

      // ═══════════════════════════════════════════
      // SECTION 2: DIRECT OBSERVATION DATA
      // ═══════════════════════════════════════════
      if (includeDirect) {
        children.push(new Paragraph({ text: 'DIRECT OBSERVATION DATA', heading: HeadingLevel.HEADING_1 }));
        children.push(new Paragraph({ text: '' }));

        const targetIds = selectAllSessions
          ? filteredSessions.map(s => s.id)
          : Array.from(selectedSessionIds);

        if (targetIds.length === 0) {
          children.push(new Paragraph({ text: 'No observation sessions selected or found for this date range.', }));
          children.push(new Paragraph({ text: '' }));
        }

        for (const sessionId of targetIds) {
          const sessionMeta = filteredSessions.find(s => s.id === sessionId) || sessionsWithData.find(s => s.id === sessionId);
          const session = sessions.find(s => s.id === sessionId);
          const entries = getSessionEntries(sessionId);
          const hasData = entries.abc.length > 0 || entries.freq.length > 0 || entries.dur.length > 0 || entries.intervals.length > 0;
          if (!hasData) continue;

          const sessionLabel = sessionMeta?.label || (session ? format(new Date(session.date), 'MMM d, yyyy h:mm a') : 'Recovered data');
          children.push(new Paragraph({ text: sessionLabel, heading: HeadingLevel.HEADING_2 }));

          // Summary line
          const totalFreq = entries.freq.reduce((s, e) => s + e.count, 0);
          const totalDur = entries.dur.reduce((s, e) => s + (e.duration || 0), 0);
          const intervalsOccurred = entries.intervals.filter(e => e.occurred).length;
          const intPct = entries.intervals.length > 0 ? Math.round((intervalsOccurred / entries.intervals.length) * 100) : 0;

          children.push(new Paragraph({
            children: [
              new TextRun({ text: `ABC: ${entries.abc.length}  |  Frequency: ${totalFreq}  |  Duration: ${formatDuration(totalDur)}  |  Intervals: ${intPct}% (${intervalsOccurred}/${entries.intervals.length})` }),
            ],
          }));
          children.push(new Paragraph({ text: '' }));

          // ── ABC Detail Table ──
          if (entries.abc.length > 0) {
            children.push(new Paragraph({ children: [new TextRun({ text: 'ABC Records', bold: true, underline: {} })] }));
            children.push(new Paragraph({ text: '' }));

            const abcRows = entries.abc.map(e => {
              const antecedents = e.antecedents?.length ? e.antecedents.join('; ') : e.antecedent || '';
              const consequences = e.consequences?.length ? e.consequences.join('; ') : e.consequence || '';
              const functions = e.functions?.map(f => FUNCTION_OPTIONS.find(fo => fo.value === f)?.label || f).join(', ') || '';
              const freqText = e.frequencyCount > 1 ? ` (×${e.frequencyCount})` : '';
              const durText = e.hasDuration && e.durationMinutes != null ? ` [${e.durationMinutes}m]` : '';
              let behaviorCol = (e.behavior || '') + freqText + durText;
              if (e.behaviors?.length) {
                behaviorCol += '\n' + e.behaviors.map(b =>
                  `  + ${b.behaviorName}${b.frequencyCount > 1 ? ` ×${b.frequencyCount}` : ''}${b.durationMinutes ? ` ${b.durationMinutes}m` : ''}`
                ).join('\n');
              }
              if (e.isConcurrent) behaviorCol += ' [concurrent]';

              return new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: format(new Date(e.timestamp), 'h:mm a') })], borders: createBorders() }),
                  new TableCell({ children: [new Paragraph({ text: behaviorCol })], borders: createBorders() }),
                  new TableCell({ children: [new Paragraph({ text: antecedents })], borders: createBorders() }),
                  new TableCell({ children: [new Paragraph({ text: consequences })], borders: createBorders() }),
                  new TableCell({ children: [new Paragraph({ text: functions })], borders: createBorders() }),
                ],
              });
            });

            children.push(new Table({
              rows: [
                new TableRow({
                  children: ['Time', 'Behavior', 'Antecedent(s)', 'Consequence(s)', 'Function'].map(h =>
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })], borders: createBorders() })
                  ),
                }),
                ...abcRows,
              ],
              width: { size: 100, type: WidthType.PERCENTAGE },
            }));
            children.push(new Paragraph({ text: '' }));
          }

          // ── Frequency Breakdown ──
          if (entries.freq.length > 0) {
            children.push(new Paragraph({ children: [new TextRun({ text: 'Frequency Data', bold: true, underline: {} })] }));
            const behaviorCounts = new Map<string, { count: number; timestamps: Date[] }>();
            entries.freq.forEach(e => {
              const beh = student.behaviors.find(b => b.id === e.behaviorId);
              const name = beh?.name || e.behaviorId;
              const existing = behaviorCounts.get(name) || { count: 0, timestamps: [] };
              existing.count += e.count;
              if (e.timestamps) existing.timestamps.push(...e.timestamps.map(t => new Date(t)));
              behaviorCounts.set(name, existing);
            });
            behaviorCounts.forEach((data, name) => {
              const rateInfo = session?.sessionLengthMinutes
                ? ` (rate: ${(data.count / (session.sessionLengthMinutes / 60)).toFixed(1)}/hr)`
                : '';
              children.push(new Paragraph({ text: `  • ${name}: ${data.count}${rateInfo}` }));
            });
            children.push(new Paragraph({ text: '' }));
          }

          // ── Duration Breakdown ──
          if (entries.dur.length > 0) {
            children.push(new Paragraph({ children: [new TextRun({ text: 'Duration Data', bold: true, underline: {} })] }));
            const durByBehavior = new Map<string, number>();
            entries.dur.forEach(e => {
              const beh = student.behaviors.find(b => b.id === e.behaviorId);
              const name = beh?.name || e.behaviorId;
              durByBehavior.set(name, (durByBehavior.get(name) || 0) + (e.duration || 0));
            });
            durByBehavior.forEach((seconds, name) => {
              const pctOfSession = session?.sessionLengthMinutes
                ? ` (${Math.round((seconds / (session.sessionLengthMinutes * 60)) * 100)}% of session)`
                : '';
              children.push(new Paragraph({ text: `  • ${name}: ${formatDuration(seconds)}${pctOfSession}` }));
            });
            children.push(new Paragraph({ text: '' }));
          }

          // ── Interval Breakdown ──
          if (entries.intervals.length > 0) {
            children.push(new Paragraph({ children: [new TextRun({ text: 'Interval Data', bold: true, underline: {} })] }));
            const intByBehavior = new Map<string, { occurred: number; total: number }>();
            entries.intervals.forEach(e => {
              const beh = student.behaviors.find(b => b.id === e.behaviorId);
              const name = beh?.name || e.behaviorId;
              const existing = intByBehavior.get(name) || { occurred: 0, total: 0 };
              existing.total++;
              if (e.occurred) existing.occurred++;
              intByBehavior.set(name, existing);
            });
            intByBehavior.forEach((data, name) => {
              const pct = Math.round((data.occurred / data.total) * 100);
              children.push(new Paragraph({ text: `  • ${name}: ${pct}% (${data.occurred}/${data.total} intervals)` }));
            });
            children.push(new Paragraph({ text: '' }));
          }

          // Session notes
          if (session?.notes) {
            children.push(new Paragraph({ children: [new TextRun({ text: 'Session Notes: ', bold: true }), new TextRun(session.notes)] }));
            children.push(new Paragraph({ text: '' }));
          }

          children.push(new Paragraph({ text: '─'.repeat(60) }));
          children.push(new Paragraph({ text: '' }));
        }
      }

      // ═══════════════════════════════════════════
      // SECTION 3: FUNCTION ANALYSIS
      // ═══════════════════════════════════════════
      if (includeFunctionAnalysis) {
        children.push(new Paragraph({ text: 'FUNCTION ANALYSIS', heading: HeadingLevel.HEADING_1 }));
        children.push(new Paragraph({ text: '' }));

        const studentAbcData = abcEntries.filter(e => e.studentId === student.id);
        if (studentAbcData.length === 0) {
          children.push(new Paragraph({ text: 'No ABC data available for function analysis.' }));
        } else {
          const functionCounts = new Map<string, number>();
          const antecedentCounts = new Map<string, number>();
          const consequenceCounts = new Map<string, number>();
          const behaviorFunctionMap = new Map<string, Map<string, number>>();

          studentAbcData.forEach(entry => {
            const ants = entry.antecedents?.length ? entry.antecedents : (entry.antecedent ? [entry.antecedent] : []);
            const cons = entry.consequences?.length ? entry.consequences : (entry.consequence ? [entry.consequence] : []);
            const fns = entry.functions?.filter(f => f !== 'unknown') || [];

            ants.forEach(a => antecedentCounts.set(a, (antecedentCounts.get(a) || 0) + 1));
            cons.forEach(c => consequenceCounts.set(c, (consequenceCounts.get(c) || 0) + 1));
            fns.forEach(f => {
              const label = FUNCTION_OPTIONS.find(fo => fo.value === f)?.label || f;
              functionCounts.set(label, (functionCounts.get(label) || 0) + 1);

              // Track per-behavior function
              const bName = entry.behavior || 'Unknown';
              if (!behaviorFunctionMap.has(bName)) behaviorFunctionMap.set(bName, new Map());
              const bfMap = behaviorFunctionMap.get(bName)!;
              bfMap.set(label, (bfMap.get(label) || 0) + 1);
            });
          });

          // Function distribution
          children.push(new Paragraph({ children: [new TextRun({ text: 'Overall Function Distribution:', bold: true })] }));
          const total = Array.from(functionCounts.values()).reduce((a, b) => a + b, 0);
          Array.from(functionCounts.entries()).sort((a, b) => b[1] - a[1]).forEach(([label, count]) => {
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            children.push(new Paragraph({ text: `  • ${label}: ${count} (${pct}%)` }));
          });
          children.push(new Paragraph({ text: '' }));

          // Per-behavior function breakdown
          if (behaviorFunctionMap.size > 0) {
            children.push(new Paragraph({ children: [new TextRun({ text: 'Function by Behavior:', bold: true })] }));
            behaviorFunctionMap.forEach((fnMap, behavior) => {
              const behTotal = Array.from(fnMap.values()).reduce((a, b) => a + b, 0);
              const fnList = Array.from(fnMap.entries()).sort((a, b) => b[1] - a[1])
                .map(([fn, c]) => `${fn} ${Math.round((c / behTotal) * 100)}%`).join(', ');
              children.push(new Paragraph({ text: `  • ${behavior}: ${fnList}` }));
            });
            children.push(new Paragraph({ text: '' }));
          }

          // Top antecedents
          children.push(new Paragraph({ children: [new TextRun({ text: 'Top Antecedents:', bold: true })] }));
          Array.from(antecedentCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([value, count]) => {
            const pct = Math.round((count / studentAbcData.length) * 100);
            children.push(new Paragraph({ text: `  • ${value}: ${count} (${pct}%)` }));
          });
          children.push(new Paragraph({ text: '' }));

          // Top consequences
          children.push(new Paragraph({ children: [new TextRun({ text: 'Top Consequences:', bold: true })] }));
          Array.from(consequenceCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([value, count]) => {
            const pct = Math.round((count / studentAbcData.length) * 100);
            children.push(new Paragraph({ text: `  • ${value}: ${count} (${pct}%)` }));
          });
          children.push(new Paragraph({ text: '' }));
        }
      }

      // ═══════════════════════════════════════════
      // SECTION 4: HYPOTHESIS STATEMENT
      // ═══════════════════════════════════════════
      if (includeHypothesis) {
        children.push(new Paragraph({ text: 'HYPOTHESIS STATEMENT', heading: HeadingLevel.HEADING_1 }));
        children.push(new Paragraph({ text: '' }));

        const studentAbcData = abcEntries.filter(e => e.studentId === student.id);
        const functionCounts = new Map<string, number>();
        const antecedentCounts = new Map<string, number>();
        const consequenceCounts = new Map<string, number>();

        studentAbcData.forEach(entry => {
          const fns = entry.functions?.filter(f => f !== 'unknown') || [];
          const ants = entry.antecedents?.length ? entry.antecedents : (entry.antecedent ? [entry.antecedent] : []);
          const cons = entry.consequences?.length ? entry.consequences : (entry.consequence ? [entry.consequence] : []);
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

          // Secondary functions
          const secondaryFns = Array.from(functionCounts.entries()).sort((a, b) => b[1] - a[1]).slice(1);
          if (secondaryFns.length > 0) {
            children.push(new Paragraph({ text: '' }));
            children.push(new Paragraph({ children: [new TextRun({ text: 'Secondary functions: ', bold: true }), new TextRun(
              secondaryFns.map(([f, c]) => {
                const l = FUNCTION_OPTIONS.find(fo => fo.value === f)?.label || f;
                return `${l} (${c} occurrences)`;
              }).join(', ')
            )] }));
          }
        } else {
          children.push(new Paragraph({ text: 'Insufficient data to generate a hypothesis statement. Continue collecting ABC data with function tagging.' }));
        }
        children.push(new Paragraph({ text: '' }));
      }

      // ═══════════════════════════════════════════
      // SECTION 5: SKILL ACQUISITION DATA
      // ═══════════════════════════════════════════
      if (includeSkillAcquisition && (skillTargets.length > 0 || dttSessions.length > 0)) {
        children.push(new Paragraph({ text: 'SKILL ACQUISITION DATA', heading: HeadingLevel.HEADING_1 }));
        children.push(new Paragraph({ text: '' }));

        // Skill targets summary
        if (skillTargets.length > 0) {
          children.push(new Paragraph({ children: [new TextRun({ text: 'Active Skill Targets:', bold: true })] }));
          children.push(new Paragraph({ text: '' }));

          const targetRows = skillTargets.map(t => {
            const sessionsForTarget = dttSessions.filter(s => s.skillTargetId === t.id);
            const latestSession = sessionsForTarget.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
            return new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ text: t.name })], borders: createBorders() }),
                new TableCell({ children: [new Paragraph({ text: t.domain || '' })], borders: createBorders() }),
                new TableCell({ children: [new Paragraph({ text: t.method.toUpperCase() })], borders: createBorders() }),
                new TableCell({ children: [new Paragraph({ text: t.status })], borders: createBorders() }),
                new TableCell({ children: [new Paragraph({ text: `${sessionsForTarget.length}` })], borders: createBorders() }),
                new TableCell({ children: [new Paragraph({ text: latestSession ? `${latestSession.percentCorrect}%` : 'N/A' })], borders: createBorders() }),
              ],
            });
          });

          children.push(new Table({
            rows: [
              new TableRow({
                children: ['Target', 'Domain', 'Method', 'Status', 'Sessions', 'Latest %'].map(h =>
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })], borders: createBorders() })
                ),
              }),
              ...targetRows,
            ],
            width: { size: 100, type: WidthType.PERCENTAGE },
          }));
          children.push(new Paragraph({ text: '' }));
        }

        // DTT Session details
        if (dttSessions.length > 0) {
          children.push(new Paragraph({ children: [new TextRun({ text: 'DTT/Probe Session History:', bold: true })] }));
          children.push(new Paragraph({ text: '' }));

          const sortedDtt = [...dttSessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          for (const dttSession of sortedDtt.slice(0, 20)) {
            const target = skillTargets.find(t => t.id === dttSession.skillTargetId);
            children.push(new Paragraph({
              children: [
                new TextRun({ text: `${format(new Date(dttSession.date), 'MMM d, yyyy')} — `, bold: true }),
                new TextRun(target?.name || 'Unknown Target'),
              ],
            }));
            children.push(new Paragraph({ text: `  Correct: ${dttSession.percentCorrect}% | Independent: ${dttSession.percentIndependent}% | Trials: ${dttSession.trials.length}` }));

            // Trial breakdown by prompt level
            if (dttSession.trials.length > 0) {
              const promptBreakdown = new Map<string, { correct: number; total: number }>();
              dttSession.trials.forEach(trial => {
                const label = PROMPT_LEVEL_LABELS[trial.promptLevel] || trial.promptLevel;
                const existing = promptBreakdown.get(label) || { correct: 0, total: 0 };
                existing.total++;
                if (trial.isCorrect) existing.correct++;
                promptBreakdown.set(label, existing);
              });
              const breakdownStr = Array.from(promptBreakdown.entries())
                .map(([level, data]) => `${level}: ${data.correct}/${data.total}`)
                .join(' | ');
              children.push(new Paragraph({ text: `  Prompt Levels: ${breakdownStr}` }));
            }

            if (dttSession.notes) {
              children.push(new Paragraph({ text: `  Notes: ${dttSession.notes}` }));
            }
            children.push(new Paragraph({ text: '' }));
          }

          if (sortedDtt.length > 20) {
            children.push(new Paragraph({ text: `  ... and ${sortedDtt.length - 20} more sessions` }));
            children.push(new Paragraph({ text: '' }));
          }
        }
      }

      // Generate document
      const doc = new Document({ sections: [{ properties: {}, children }] });
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <FileDown className="w-4 h-4" />
          Export All Data
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm">Comprehensive Assessment Export</DialogTitle>
          <p className="text-xs text-muted-foreground">
            Select sections, date range, and observations to include
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Section toggles */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox id="indirect" checked={includeIndirect} onCheckedChange={(c) => setIncludeIndirect(!!c)} />
              <Label htmlFor="indirect" className="text-sm cursor-pointer">
                Indirect Assessments (FAST/MAS/QABF)
                {savedAssessments.length > 0 && <Badge variant="secondary" className="ml-2 text-xs">{savedAssessments.length}</Badge>}
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="direct" checked={includeDirect} onCheckedChange={(c) => setIncludeDirect(!!c)} />
              <Label htmlFor="direct" className="text-sm cursor-pointer">
                Direct Observation Data (ABC, Frequency, Duration, Intervals)
                <Badge variant="secondary" className="ml-2 text-xs">{sessionsWithData.length} sessions</Badge>
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="functions" checked={includeFunctionAnalysis} onCheckedChange={(c) => setIncludeFunctionAnalysis(!!c)} />
              <Label htmlFor="functions" className="text-sm cursor-pointer">Function Analysis</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="hypothesis" checked={includeHypothesis} onCheckedChange={(c) => setIncludeHypothesis(!!c)} />
              <Label htmlFor="hypothesis" className="text-sm cursor-pointer">Hypothesis Statement</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="skills" checked={includeSkillAcquisition} onCheckedChange={(c) => setIncludeSkillAcquisition(!!c)} />
              <Label htmlFor="skills" className="text-sm cursor-pointer">
                Skill Acquisition (DTT/NET/Probes)
                {skillTargets.length > 0 && <Badge variant="secondary" className="ml-2 text-xs">{skillTargets.length} targets</Badge>}
              </Label>
            </div>
          </div>

          {/* Date range filter */}
          <Separator />
          <div className="space-y-2">
            <Label className="text-xs font-medium">Date Range (optional)</Label>
            <div className="flex gap-2">
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="text-xs h-8" placeholder="From" />
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="text-xs h-8" placeholder="To" />
            </div>
          </div>

          {/* Session selection */}
          {includeDirect && filteredSessions.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Select Observations ({filteredSessions.length})</Label>
                  <div className="flex items-center gap-2">
                    <Checkbox id="selectAll" checked={selectAllSessions} onCheckedChange={(c) => handleSelectAll(!!c)} />
                    <Label htmlFor="selectAll" className="text-xs cursor-pointer">All</Label>
                  </div>
                </div>
                <ScrollArea className="h-[150px] border rounded-md p-2">
                  <div className="space-y-1">
                    {filteredSessions.map(s => (
                      <div key={s.id} className="flex items-center gap-2 py-1">
                        <Checkbox
                          checked={selectAllSessions || selectedSessionIds.has(s.id)}
                          onCheckedChange={() => toggleSession(s.id)}
                        />
                        <span className="text-xs flex-1">{s.label}</span>
                        <div className="flex gap-1">
                          {s.abc > 0 && <Badge variant="secondary" className="text-[10px] h-4">{s.abc} abc</Badge>}
                          {s.freq > 0 && <Badge variant="secondary" className="text-[10px] h-4">{s.freq} freq</Badge>}
                          {s.dur > 0 && <Badge variant="secondary" className="text-[10px] h-4">dur</Badge>}
                          {s.interval > 0 && <Badge variant="secondary" className="text-[10px] h-4">int</Badge>}
                          {s.isOrphaned && <Badge variant="outline" className="text-[10px] h-4">recovered</Badge>}
                        </div>
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
