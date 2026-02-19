import { useState, useMemo } from 'react';
import { format, subDays } from 'date-fns';
import { 
  ClipboardList, Download, Eye, FileText, ChevronDown, ChevronUp,
  Filter, Calendar, BarChart3, FileDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useDataStore } from '@/store/dataStore';
import { Student, Session, ABCEntry, FrequencyEntry, DurationEntry, IntervalEntry } from '@/types/behavior';
import { useToast } from '@/hooks/use-toast';
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

interface ObservationResultsViewerProps {
  studentId: string;
  student: Student;
}

interface StructuredObservationData {
  id: string;
  studentId: string;
  observationDate: Date;
  observer: string;
  teacherClass: string;
  teacherPosition: string;
  teacherTechniques: string;
  additionalObservations: string;
  behaviorChecklist: {
    id: string;
    category: string;
    behavior: string;
    rating: 'not_observed' | 'sometimes' | 'frequently';
  }[];
  notes: string;
}

export function ObservationResultsViewer({ studentId, student }: ObservationResultsViewerProps) {
  const { toast } = useToast();
  const { sessions, abcEntries, frequencyEntries, durationEntries, intervalEntries } = useDataStore();
  
  const [dateFilter, setDateFilter] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [selectedObservation, setSelectedObservation] = useState<StructuredObservationData | null>(null);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());

  // Parse structured observations from narrative notes
  const structuredObservations = useMemo(() => {
    const observations: StructuredObservationData[] = [];
    
    if (student.narrativeNotes) {
      student.narrativeNotes.forEach(note => {
        // Check if this note contains structured observation data
        if (note.content && typeof note.content === 'string') {
          try {
            const parsed = JSON.parse(note.content);
            if (parsed.behaviorChecklist) {
              observations.push({
                ...parsed,
                id: note.id,
                observationDate: new Date(parsed.observationDate || note.timestamp),
              });
            }
          } catch {
            // Not JSON structured observation, skip
          }
        } else if (note.content && typeof note.content === 'object') {
          const content = note.content as any;
          if (content.behaviorChecklist) {
            observations.push({
              ...content,
              id: note.id,
              observationDate: new Date(content.observationDate || note.timestamp),
            });
          }
        }
      });
    }
    
    return observations.sort((a, b) => 
      new Date(b.observationDate).getTime() - new Date(a.observationDate).getTime()
    );
  }, [student.narrativeNotes]);

  // Get filtered sessions for this student
  const filteredSessions = useMemo(() => {
    const now = new Date();
    let start: Date;
    
    switch (dateFilter) {
      case '7d':
        start = subDays(now, 7);
        break;
      case '30d':
        start = subDays(now, 30);
        break;
      case '90d':
        start = subDays(now, 90);
        break;
      default:
        start = new Date(0);
    }
    
    return sessions
      .filter(s => {
        if (!s.studentIds?.includes(studentId)) return false;
        if (new Date(s.date) < start) return false;
        
        // Filter out empty/false sessions - must have actual behavioral data
        // Check both global store entries AND inline session entries
        const hasAbcData = abcEntries.some(e => e.studentId === studentId && e.sessionId === s.id)
          || (s.abcEntries?.some(e => e.studentId === studentId) ?? false);
        const hasFreqData = frequencyEntries.some(e => e.studentId === studentId && e.sessionId === s.id)
          || (s.frequencyEntries?.some(e => e.studentId === studentId) ?? false);
        const hasDurData = durationEntries.some(e => e.studentId === studentId && e.sessionId === s.id)
          || (s.durationEntries?.some(e => e.studentId === studentId) ?? false);
        const hasIntData = intervalEntries.some(e => e.studentId === studentId && e.sessionId === s.id)
          || (s.intervalEntries?.some(e => e.studentId === studentId) ?? false);
        
        return hasAbcData || hasFreqData || hasDurData || hasIntData;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sessions, studentId, dateFilter, abcEntries, frequencyEntries, durationEntries, intervalEntries]);

  // Detect data entries that belong to sessions not currently displayed
  const unmatchedDataSummary = useMemo(() => {
    const displayedSessionIds = new Set(filteredSessions.map(s => s.id));
    
    const unmatchedAbcs = abcEntries.filter(e => e.studentId === studentId && e.sessionId && !displayedSessionIds.has(e.sessionId));
    const unmatchedFreq = frequencyEntries.filter(e => e.studentId === studentId && e.sessionId && !displayedSessionIds.has(e.sessionId));
    const unmatchedDur = durationEntries.filter(e => e.studentId === studentId && e.sessionId && !displayedSessionIds.has(e.sessionId));
    const unmatchedInt = intervalEntries.filter(e => e.studentId === studentId && e.sessionId && !displayedSessionIds.has(e.sessionId));
    
    const totalFreq = unmatchedFreq.reduce((sum, e) => sum + e.count, 0);
    const totalDur = unmatchedDur.reduce((sum, e) => sum + (e.duration || 0), 0);
    
    const hasUnmatched = unmatchedAbcs.length > 0 || totalFreq > 0 || totalDur > 0 || unmatchedInt.length > 0;
    
    // Group by session ID to create virtual session entries
    const sessionGroups = new Map<string, { abcCount: number; frequencyCount: number; durationSeconds: number; intervalCount: number; intervalsOccurred: number; earliestTimestamp: Date }>();
    
    [...unmatchedAbcs, ...unmatchedFreq, ...unmatchedDur, ...unmatchedInt].forEach(e => {
      const sid = e.sessionId || 'unknown';
      if (!sessionGroups.has(sid)) {
        sessionGroups.set(sid, { abcCount: 0, frequencyCount: 0, durationSeconds: 0, intervalCount: 0, intervalsOccurred: 0, earliestTimestamp: new Date() });
      }
    });
    
    unmatchedAbcs.forEach(e => {
      const g = sessionGroups.get(e.sessionId || 'unknown')!;
      g.abcCount++;
      if (new Date(e.timestamp) < g.earliestTimestamp) g.earliestTimestamp = new Date(e.timestamp);
    });
    unmatchedFreq.forEach(e => {
      const g = sessionGroups.get(e.sessionId || 'unknown')!;
      g.frequencyCount += e.count;
      if (new Date(e.timestamp) < g.earliestTimestamp) g.earliestTimestamp = new Date(e.timestamp);
    });
    unmatchedDur.forEach(e => {
      const g = sessionGroups.get(e.sessionId || 'unknown')!;
      g.durationSeconds += e.duration || 0;
      if (new Date(e.startTime) < g.earliestTimestamp) g.earliestTimestamp = new Date(e.startTime);
    });
    unmatchedInt.forEach(e => {
      const g = sessionGroups.get(e.sessionId || 'unknown')!;
      g.intervalCount++;
      if (e.occurred) g.intervalsOccurred++;
      if (new Date(e.timestamp) < g.earliestTimestamp) g.earliestTimestamp = new Date(e.timestamp);
    });
    
    return { hasUnmatched, sessionGroups };
  }, [abcEntries, frequencyEntries, durationEntries, intervalEntries, studentId, filteredSessions]);

  // Get session data summary
  const getSessionDataSummary = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    const globalAbcs = abcEntries.filter(e => e.studentId === studentId && e.sessionId === sessionId);
    const inlineAbcs = session?.abcEntries?.filter(e => e.studentId === studentId) || [];
    const seenIds = new Set<string>();
    const sessionAbcs = [...globalAbcs, ...inlineAbcs].filter(e => {
      if (seenIds.has(e.id)) return false;
      seenIds.add(e.id);
      return true;
    });
    const globalFreq = frequencyEntries.filter(e => e.studentId === studentId && e.sessionId === sessionId);
    const inlineFreq = session?.frequencyEntries?.filter(e => e.studentId === studentId) || [];
    const seenFreqIds = new Set<string>();
    const sessionFrequency = [...globalFreq, ...inlineFreq].filter(e => {
      if (seenFreqIds.has(e.id)) return false;
      seenFreqIds.add(e.id);
      return true;
    });
    const globalDur = durationEntries.filter(e => e.studentId === studentId && e.sessionId === sessionId);
    const inlineDur = session?.durationEntries?.filter(e => e.studentId === studentId) || [];
    const seenDurIds = new Set<string>();
    const sessionDuration = [...globalDur, ...inlineDur].filter(e => {
      if (seenDurIds.has(e.id)) return false;
      seenDurIds.add(e.id);
      return true;
    });
    const globalInt = intervalEntries.filter(e => e.studentId === studentId && e.sessionId === sessionId);
    const inlineInt = session?.intervalEntries?.filter(e => e.studentId === studentId) || [];
    const seenIntIds = new Set<string>();
    const sessionIntervals = [...globalInt, ...inlineInt].filter(e => {
      if (seenIntIds.has(e.id)) return false;
      seenIntIds.add(e.id);
      return true;
    });
    
    const totalFrequency = sessionFrequency.reduce((sum, e) => sum + e.count, 0);
    const totalDuration = sessionDuration.reduce((sum, e) => sum + (e.duration || 0), 0);
    const intervalCount = sessionIntervals.length;
    const intervalsOccurred = sessionIntervals.filter(e => e.occurred).length;
    
    return {
      abcCount: sessionAbcs.length,
      frequencyCount: totalFrequency,
      durationSeconds: totalDuration,
      intervalCount,
      intervalsOccurred,
      intervalPercentage: intervalCount > 0 ? Math.round((intervalsOccurred / intervalCount) * 100) : 0,
    };
  };

  // Get detailed session data for export
  const getDetailedSessionData = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    const globalAbcs = abcEntries.filter(e => e.studentId === studentId && e.sessionId === sessionId);
    const inlineAbcs = session?.abcEntries?.filter(e => e.studentId === studentId) || [];
    const seenAbcIds = new Set<string>();
    const sessionAbcs = [...globalAbcs, ...inlineAbcs].filter(e => {
      if (seenAbcIds.has(e.id)) return false;
      seenAbcIds.add(e.id);
      return true;
    });
    const globalFreq = frequencyEntries.filter(e => e.studentId === studentId && e.sessionId === sessionId);
    const inlineFreq = session?.frequencyEntries?.filter(e => e.studentId === studentId) || [];
    const seenFreqIds = new Set<string>();
    const sessionFrequency = [...globalFreq, ...inlineFreq].filter(e => {
      if (seenFreqIds.has(e.id)) return false;
      seenFreqIds.add(e.id);
      return true;
    });
    const globalDur = durationEntries.filter(e => e.studentId === studentId && e.sessionId === sessionId);
    const inlineDur = session?.durationEntries?.filter(e => e.studentId === studentId) || [];
    const seenDurIds = new Set<string>();
    const sessionDuration = [...globalDur, ...inlineDur].filter(e => {
      if (seenDurIds.has(e.id)) return false;
      seenDurIds.add(e.id);
      return true;
    });
    const globalInt = intervalEntries.filter(e => e.studentId === studentId && e.sessionId === sessionId);
    const inlineInt = session?.intervalEntries?.filter(e => e.studentId === studentId) || [];
    const seenIntIds = new Set<string>();
    const sessionIntervals = [...globalInt, ...inlineInt].filter(e => {
      if (seenIntIds.has(e.id)) return false;
      seenIntIds.add(e.id);
      return true;
    });
    
    return { sessionAbcs, sessionFrequency, sessionDuration, sessionIntervals };
  };

  // Helper: Build comprehensive ABC paragraphs for Word export
  const buildAbcParagraphs = (abc: ABCEntry, index: number): Paragraph[] => {
    const paragraphs: Paragraph[] = [];
    
    // Entry header with timestamp
    paragraphs.push(new Paragraph({
      children: [
        new TextRun({ text: `Entry ${index + 1} — `, bold: true }),
        new TextRun(format(new Date(abc.timestamp), 'h:mm a')),
      ],
    }));

    // All antecedents
    const allAntecedents = abc.antecedents?.length 
      ? abc.antecedents.join('; ') 
      : abc.antecedent || 'N/A';
    paragraphs.push(new Paragraph({
      children: [
        new TextRun({ text: 'Antecedent(s): ', bold: true }),
        new TextRun(allAntecedents),
      ],
    }));

    // Behavior + frequency count
    const behaviorText = abc.behavior || 'N/A';
    const freqText = abc.frequencyCount > 1 ? ` (×${abc.frequencyCount})` : '';
    paragraphs.push(new Paragraph({
      children: [
        new TextRun({ text: 'Behavior: ', bold: true }),
        new TextRun(behaviorText + freqText),
      ],
    }));

    // Multiple concurrent behaviors if present
    if (abc.behaviors && abc.behaviors.length > 0) {
      abc.behaviors.forEach(b => {
        const bFreq = b.frequencyCount && b.frequencyCount > 1 ? ` (×${b.frequencyCount})` : '';
        const bDur = b.durationMinutes ? ` — ${b.durationMinutes} min` : '';
        paragraphs.push(new Paragraph({
          children: [
            new TextRun({ text: '  • ', bold: false }),
            new TextRun(b.behaviorName + bFreq + bDur),
          ],
        }));
      });
    }

    // Duration if present
    if (abc.hasDuration && abc.durationMinutes != null) {
      paragraphs.push(new Paragraph({
        children: [
          new TextRun({ text: 'Duration: ', bold: true }),
          new TextRun(`${abc.durationMinutes} minutes`),
        ],
      }));
    }

    // All consequences
    const allConsequences = abc.consequences?.length 
      ? abc.consequences.join('; ') 
      : abc.consequence || 'N/A';
    paragraphs.push(new Paragraph({
      children: [
        new TextRun({ text: 'Consequence(s): ', bold: true }),
        new TextRun(allConsequences),
      ],
    }));

    // Functions
    if (abc.functions && abc.functions.length > 0) {
      paragraphs.push(new Paragraph({
        children: [
          new TextRun({ text: 'Hypothesized Function(s): ', bold: true }),
          new TextRun(abc.functions.join(', ')),
        ],
      }));
    }

    // Concurrent flag
    if (abc.isConcurrent) {
      paragraphs.push(new Paragraph({
        children: [
          new TextRun({ text: 'Note: ', bold: true, italics: true }),
          new TextRun({ text: 'Concurrent behavior episode', italics: true }),
        ],
      }));
    }

    paragraphs.push(new Paragraph({ text: '' }));
    return paragraphs;
  };

  // Format duration helper
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  };

  // Export single session to Word document
  const exportSessionToDocx = async (session: Session) => {
    const { sessionAbcs, sessionFrequency, sessionDuration, sessionIntervals } = getDetailedSessionData(session.id);
    const summary = getSessionDataSummary(session.id);
    const children: Paragraph[] = [];

    // Title
    children.push(
      new Paragraph({
        text: 'OBSERVATION SESSION REPORT',
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
      })
    );
    children.push(new Paragraph({ text: '' }));

    // Header info
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
          new TextRun({ text: 'Date: ', bold: true }),
          new TextRun(format(new Date(session.date), 'MMMM d, yyyy')),
        ],
      })
    );
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Time: ', bold: true }),
          new TextRun(format(new Date(session.date), 'h:mm a')),
        ],
      })
    );
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Duration: ', bold: true }),
          new TextRun(`${session.sessionLengthMinutes} minutes`),
        ],
      })
    );
    children.push(new Paragraph({ text: '' }));

    // Summary Section
    children.push(
      new Paragraph({
        text: 'DATA SUMMARY',
        heading: HeadingLevel.HEADING_2,
      })
    );
    children.push(new Paragraph({ text: '' }));

    children.push(new Paragraph({
      children: [
        new TextRun({ text: `• ABC Records: `, bold: true }),
        new TextRun(`${summary.abcCount}`),
      ],
    }));
    children.push(new Paragraph({
      children: [
        new TextRun({ text: `• Frequency Count: `, bold: true }),
        new TextRun(`${summary.frequencyCount}`),
      ],
    }));
    children.push(new Paragraph({
      children: [
        new TextRun({ text: `• Duration Total: `, bold: true }),
        new TextRun(formatDuration(summary.durationSeconds)),
      ],
    }));
    children.push(new Paragraph({
      children: [
        new TextRun({ text: `• Interval Percentage: `, bold: true }),
        new TextRun(`${summary.intervalPercentage}% (${summary.intervalsOccurred}/${summary.intervalCount})`),
      ],
    }));
    children.push(new Paragraph({ text: '' }));

    // ABC Data Section
    if (sessionAbcs.length > 0) {
      children.push(
        new Paragraph({
          text: 'ABC DATA LOG',
          heading: HeadingLevel.HEADING_2,
        })
      );
      children.push(new Paragraph({ text: '' }));

      sessionAbcs.forEach((abc, index) => {
        children.push(...buildAbcParagraphs(abc, index));
      });
    }

    // Frequency Data Section
    if (sessionFrequency.length > 0) {
      children.push(
        new Paragraph({
          text: 'FREQUENCY DATA',
          heading: HeadingLevel.HEADING_2,
        })
      );
      children.push(new Paragraph({ text: '' }));

      // Group by behavior
      const freqByBehavior = sessionFrequency.reduce((acc, entry) => {
        const behavior = student.behaviors.find(b => b.id === entry.behaviorId);
        const name = behavior?.name || 'Unknown';
        if (!acc[name]) acc[name] = 0;
        acc[name] += entry.count;
        return acc;
      }, {} as Record<string, number>);

      Object.entries(freqByBehavior).forEach(([name, count]) => {
        children.push(new Paragraph({
          children: [
            new TextRun({ text: `• ${name}: `, bold: true }),
            new TextRun(`${count} occurrences`),
          ],
        }));
      });
      children.push(new Paragraph({ text: '' }));
    }

    // Duration Data Section
    if (sessionDuration.length > 0) {
      children.push(
        new Paragraph({
          text: 'DURATION DATA',
          heading: HeadingLevel.HEADING_2,
        })
      );
      children.push(new Paragraph({ text: '' }));

      // Group by behavior
      const durByBehavior = sessionDuration.reduce((acc, entry) => {
        const behavior = student.behaviors.find(b => b.id === entry.behaviorId);
        const name = behavior?.name || 'Unknown';
        if (!acc[name]) acc[name] = 0;
        acc[name] += entry.duration || 0;
        return acc;
      }, {} as Record<string, number>);

      Object.entries(durByBehavior).forEach(([name, seconds]) => {
        children.push(new Paragraph({
          children: [
            new TextRun({ text: `• ${name}: `, bold: true }),
            new TextRun(formatDuration(seconds)),
          ],
        }));
      });
      children.push(new Paragraph({ text: '' }));
    }

    // Interval Data Section
    if (sessionIntervals.length > 0) {
      children.push(
        new Paragraph({
          text: 'INTERVAL DATA',
          heading: HeadingLevel.HEADING_2,
        })
      );
      children.push(new Paragraph({ text: '' }));

      // Group by behavior
      const intByBehavior = sessionIntervals.reduce((acc, entry) => {
        const behavior = student.behaviors.find(b => b.id === entry.behaviorId);
        const name = behavior?.name || 'Unknown';
        if (!acc[name]) acc[name] = { occurred: 0, total: 0 };
        acc[name].total++;
        if (entry.occurred) acc[name].occurred++;
        return acc;
      }, {} as Record<string, { occurred: number; total: number }>);

      Object.entries(intByBehavior).forEach(([name, data]) => {
        const pct = Math.round((data.occurred / data.total) * 100);
        children.push(new Paragraph({
          children: [
            new TextRun({ text: `• ${name}: `, bold: true }),
            new TextRun(`${pct}% (${data.occurred}/${data.total} intervals)`),
          ],
        }));
      });
      children.push(new Paragraph({ text: '' }));
    }

    // Skill / Cold Probe Data Section — DTT sessions that fall on this observation date
    const sessionDate = format(new Date(session.date), 'yyyy-MM-dd');
    const skillTargets = student.skillTargets || [];
    const dttSessions = (student.dttSessions || []).filter(d => {
      const dDate = format(new Date(d.date), 'yyyy-MM-dd');
      return dDate === sessionDate;
    });
    if (dttSessions.length > 0) {
      children.push(new Paragraph({ text: 'SKILL ACQUISITION / COLD PROBE DATA', heading: HeadingLevel.HEADING_2 }));
      children.push(new Paragraph({ text: '' }));
      for (const dttSession of dttSessions) {
        const target = skillTargets.find(t => t.id === dttSession.skillTargetId);
        children.push(new Paragraph({
          children: [
            new TextRun({ text: target?.name || 'Unknown Target', bold: true }),
            new TextRun(` — ${target?.method?.toUpperCase() || 'PROBE'}`),
          ],
        }));
        children.push(new Paragraph({
          children: [
            new TextRun({ text: 'Correct: ', bold: true }),
            new TextRun(`${dttSession.percentCorrect}%`),
            new TextRun({ text: '  |  Independent: ', bold: true }),
            new TextRun(`${dttSession.percentIndependent}%`),
            new TextRun({ text: '  |  Trials: ', bold: true }),
            new TextRun(`${dttSession.trials.length}`),
          ],
        }));
        if (dttSession.notes) {
          children.push(new Paragraph({
            children: [new TextRun({ text: 'Notes: ', bold: true }), new TextRun(dttSession.notes)],
          }));
        }
        children.push(new Paragraph({ text: '' }));
      }
    }

    // Session Notes
    if (session.notes) {
      children.push(
        new Paragraph({
          text: 'SESSION NOTES',
          heading: HeadingLevel.HEADING_2,
        })
      );
      children.push(new Paragraph({ text: session.notes }));
    }

    // Create document
    const doc = new Document({
      sections: [{ properties: {}, children }],
    });

    const blob = await Packer.toBlob(doc);
    const filename = `observation-session-${student.name.replace(/\s+/g, '-')}-${format(new Date(session.date), 'yyyy-MM-dd')}.docx`;
    saveAs(blob, filename);
    
    toast({
      title: 'Exported',
      description: 'Session data exported to Word document.',
    });
  };

  // Export all filtered sessions to Word document
  const exportAllSessionsToDocx = async () => {
    if (filteredSessions.length === 0) {
      toast({
        title: 'No sessions to export',
        description: 'There are no sessions in the selected date range.',
        variant: 'destructive',
      });
      return;
    }

    const children: Paragraph[] = [];

    // Title
    children.push(
      new Paragraph({
        text: 'OBSERVATION SESSIONS REPORT',
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
      })
    );
    children.push(new Paragraph({ text: '' }));

    // Header info
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
          new TextRun({ text: 'Report Date: ', bold: true }),
          new TextRun(format(new Date(), 'MMMM d, yyyy')),
        ],
      })
    );
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Sessions Included: ', bold: true }),
          new TextRun(`${filteredSessions.length}`),
        ],
      })
    );
    children.push(new Paragraph({ text: '' }));
    children.push(new Paragraph({ text: '─'.repeat(50) }));
    children.push(new Paragraph({ text: '' }));

    // Each session
    for (const session of filteredSessions) {
      const summary = getSessionDataSummary(session.id);
      const { sessionAbcs } = getDetailedSessionData(session.id);

      children.push(
        new Paragraph({
          text: format(new Date(session.date), 'MMMM d, yyyy - h:mm a'),
          heading: HeadingLevel.HEADING_2,
        })
      );
      children.push(new Paragraph({
        children: [
          new TextRun({ text: 'Duration: ', bold: true }),
          new TextRun(`${session.sessionLengthMinutes} minutes`),
        ],
      }));
      children.push(new Paragraph({ text: '' }));

      // Summary stats
      children.push(new Paragraph({
        text: `ABC: ${summary.abcCount} | Frequency: ${summary.frequencyCount} | Duration: ${formatDuration(summary.durationSeconds)} | Intervals: ${summary.intervalPercentage}%`,
      }));
      children.push(new Paragraph({ text: '' }));

      // ABC entries - comprehensive
      if (sessionAbcs.length > 0) {
        children.push(new Paragraph({
          children: [new TextRun({ text: 'ABC Records:', bold: true })],
        }));
        children.push(new Paragraph({ text: '' }));
        sessionAbcs.forEach((abc, index) => {
          children.push(...buildAbcParagraphs(abc, index));
        });
      }

      // Frequency breakdown by behavior
      const { sessionFrequency, sessionDuration, sessionIntervals } = getDetailedSessionData(session.id);
      if (sessionFrequency.length > 0) {
        children.push(new Paragraph({
          children: [new TextRun({ text: 'Frequency Breakdown:', bold: true })],
        }));
        const freqByBehavior = sessionFrequency.reduce((acc, entry) => {
          const behavior = student.behaviors.find(b => b.id === entry.behaviorId);
          const name = behavior?.name || 'Unknown';
          if (!acc[name]) acc[name] = 0;
          acc[name] += entry.count;
          return acc;
        }, {} as Record<string, number>);
        Object.entries(freqByBehavior).forEach(([name, count]) => {
          const rate = session.sessionLengthMinutes > 0 ? (count / (session.sessionLengthMinutes / 60)).toFixed(1) : '—';
          children.push(new Paragraph({
            children: [
              new TextRun({ text: `  • ${name}: `, bold: true }),
              new TextRun(`${count} occurrences (${rate}/hr)`),
            ],
          }));
        });
        children.push(new Paragraph({ text: '' }));
      }

      // Duration breakdown by behavior
      if (sessionDuration.length > 0) {
        children.push(new Paragraph({
          children: [new TextRun({ text: 'Duration Breakdown:', bold: true })],
        }));
        const durByBehavior = sessionDuration.reduce((acc, entry) => {
          const behavior = student.behaviors.find(b => b.id === entry.behaviorId);
          const name = behavior?.name || 'Unknown';
          if (!acc[name]) acc[name] = 0;
          acc[name] += entry.duration || 0;
          return acc;
        }, {} as Record<string, number>);
        Object.entries(durByBehavior).forEach(([name, seconds]) => {
          children.push(new Paragraph({
            children: [
              new TextRun({ text: `  • ${name}: `, bold: true }),
              new TextRun(formatDuration(seconds)),
            ],
          }));
        });
        children.push(new Paragraph({ text: '' }));
      }

      // Interval breakdown by behavior
      if (sessionIntervals.length > 0) {
        children.push(new Paragraph({
          children: [new TextRun({ text: 'Interval Breakdown:', bold: true })],
        }));
        const intByBehavior = sessionIntervals.reduce((acc, entry) => {
          const behavior = student.behaviors.find(b => b.id === entry.behaviorId);
          const name = behavior?.name || 'Unknown';
          if (!acc[name]) acc[name] = { occurred: 0, total: 0 };
          acc[name].total++;
          if (entry.occurred) acc[name].occurred++;
          return acc;
        }, {} as Record<string, { occurred: number; total: number }>);
        Object.entries(intByBehavior).forEach(([name, data]) => {
          const pct = Math.round((data.occurred / data.total) * 100);
          children.push(new Paragraph({
            children: [
              new TextRun({ text: `  • ${name}: `, bold: true }),
              new TextRun(`${pct}% (${data.occurred}/${data.total} intervals)`),
            ],
          }));
        });
        children.push(new Paragraph({ text: '' }));
      }

      // Skill / Cold Probe Data for this session date
      const sDate = format(new Date(session.date), 'yyyy-MM-dd');
      const sessionSkillTargets = student.skillTargets || [];
      const sessionDttSessions = (student.dttSessions || []).filter(d => format(new Date(d.date), 'yyyy-MM-dd') === sDate);
      if (sessionDttSessions.length > 0) {
        children.push(new Paragraph({ children: [new TextRun({ text: 'Skill / Cold Probe Data:', bold: true })] }));
        sessionDttSessions.forEach(dttSess => {
          const tgt = sessionSkillTargets.find(t => t.id === dttSess.skillTargetId);
          children.push(new Paragraph({
            children: [
              new TextRun({ text: `  • ${tgt?.name || 'Unknown'}: `, bold: true }),
              new TextRun(`${dttSess.percentCorrect}% correct, ${dttSess.percentIndependent}% independent (${dttSess.trials.length} trials)`),
            ],
          }));
        });
        children.push(new Paragraph({ text: '' }));
      }

      if (session.notes) {
        children.push(new Paragraph({
          children: [
            new TextRun({ text: 'Notes: ', bold: true }),
            new TextRun(session.notes),
          ],
        }));
        children.push(new Paragraph({ text: '' }));
      }

      children.push(new Paragraph({ text: '─'.repeat(50) }));
      children.push(new Paragraph({ text: '' }));
    }

    const doc = new Document({
      sections: [{ properties: {}, children }],
    });

    const blob = await Packer.toBlob(doc);
    const filename = `all-sessions-${student.name.replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}.docx`;
    saveAs(blob, filename);
    
    toast({
      title: 'Exported',
      description: `${filteredSessions.length} sessions exported to Word document.`,
    });
  };

  // Export recovered/orphaned session data to Word document
  const exportRecoveredDataToDocx = async (sessionId: string, data: { abcCount: number; frequencyCount: number; durationSeconds: number; intervalCount: number; intervalsOccurred: number; earliestTimestamp: Date }) => {
    const sessionAbcs = abcEntries.filter(e => e.studentId === studentId && e.sessionId === sessionId);
    const sessionFrequency = frequencyEntries.filter(e => e.studentId === studentId && e.sessionId === sessionId);
    const sessionDuration = durationEntries.filter(e => e.studentId === studentId && e.sessionId === sessionId);
    const sessionIntervals = intervalEntries.filter(e => e.studentId === studentId && e.sessionId === sessionId);

    const children: Paragraph[] = [];

    children.push(new Paragraph({ text: 'RECOVERED OBSERVATION DATA REPORT', heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }));
    children.push(new Paragraph({ text: '' }));
    children.push(new Paragraph({ children: [new TextRun({ text: 'Student: ', bold: true }), new TextRun(student.displayName || student.name)] }));
    children.push(new Paragraph({ children: [new TextRun({ text: 'Earliest Data Point: ', bold: true }), new TextRun(format(data.earliestTimestamp, 'MMMM d, yyyy h:mm a'))] }));
    children.push(new Paragraph({ text: '' }));

    children.push(new Paragraph({ text: 'DATA SUMMARY', heading: HeadingLevel.HEADING_2 }));
    children.push(new Paragraph({ children: [new TextRun({ text: '• ABC Records: ', bold: true }), new TextRun(`${data.abcCount}`)] }));
    children.push(new Paragraph({ children: [new TextRun({ text: '• Frequency Count: ', bold: true }), new TextRun(`${data.frequencyCount}`)] }));
    children.push(new Paragraph({ children: [new TextRun({ text: '• Duration Total: ', bold: true }), new TextRun(formatDuration(data.durationSeconds))] }));
    children.push(new Paragraph({ children: [new TextRun({ text: '• Interval Percentage: ', bold: true }), new TextRun(`${data.intervalCount > 0 ? Math.round((data.intervalsOccurred / data.intervalCount) * 100) : 0}% (${data.intervalsOccurred}/${data.intervalCount})`)] }));
    children.push(new Paragraph({ text: '' }));

    if (sessionAbcs.length > 0) {
      children.push(new Paragraph({ text: 'ABC DATA LOG', heading: HeadingLevel.HEADING_2 }));
      children.push(new Paragraph({ text: '' }));
      sessionAbcs.forEach((abc, index) => {
        children.push(...buildAbcParagraphs(abc, index));
      });
    }

    if (sessionFrequency.length > 0) {
      children.push(new Paragraph({ text: 'FREQUENCY DATA', heading: HeadingLevel.HEADING_2 }));
      const freqByBehavior = sessionFrequency.reduce((acc, entry) => {
        const behavior = student.behaviors.find(b => b.id === entry.behaviorId);
        const name = behavior?.name || 'Unknown';
        if (!acc[name]) acc[name] = 0;
        acc[name] += entry.count;
        return acc;
      }, {} as Record<string, number>);
      Object.entries(freqByBehavior).forEach(([name, count]) => {
        children.push(new Paragraph({ children: [new TextRun({ text: `• ${name}: `, bold: true }), new TextRun(`${count} occurrences`)] }));
      });
      children.push(new Paragraph({ text: '' }));
    }

    if (sessionDuration.length > 0) {
      children.push(new Paragraph({ text: 'DURATION DATA', heading: HeadingLevel.HEADING_2 }));
      const durByBehavior = sessionDuration.reduce((acc, entry) => {
        const behavior = student.behaviors.find(b => b.id === entry.behaviorId);
        const name = behavior?.name || 'Unknown';
        if (!acc[name]) acc[name] = 0;
        acc[name] += entry.duration || 0;
        return acc;
      }, {} as Record<string, number>);
      Object.entries(durByBehavior).forEach(([name, seconds]) => {
        children.push(new Paragraph({ children: [new TextRun({ text: `• ${name}: `, bold: true }), new TextRun(formatDuration(seconds))] }));
      });
      children.push(new Paragraph({ text: '' }));
    }

    if (sessionIntervals.length > 0) {
      children.push(new Paragraph({ text: 'INTERVAL DATA', heading: HeadingLevel.HEADING_2 }));
      const intByBehavior = sessionIntervals.reduce((acc, entry) => {
        const behavior = student.behaviors.find(b => b.id === entry.behaviorId);
        const name = behavior?.name || 'Unknown';
        if (!acc[name]) acc[name] = { occurred: 0, total: 0 };
        acc[name].total++;
        if (entry.occurred) acc[name].occurred++;
        return acc;
      }, {} as Record<string, { occurred: number; total: number }>);
      Object.entries(intByBehavior).forEach(([name, d]) => {
        const pct = Math.round((d.occurred / d.total) * 100);
        children.push(new Paragraph({ children: [new TextRun({ text: `• ${name}: `, bold: true }), new TextRun(`${pct}% (${d.occurred}/${d.total} intervals)`)] }));
      });
      children.push(new Paragraph({ text: '' }));
    }

    const doc = new Document({ sections: [{ properties: {}, children }] });
    const blob = await Packer.toBlob(doc);
    const filename = `recovered-data-${student.name.replace(/\s+/g, '-')}-${format(data.earliestTimestamp, 'yyyy-MM-dd')}.docx`;
    saveAs(blob, filename);
    toast({ title: 'Exported', description: 'Recovered data exported to Word document.' });
  };

  // Export structured observation to PDF/DOCX
  const exportStructuredObservation = async (obs: StructuredObservationData) => {
    const children: Paragraph[] = [];

    // Title
    children.push(
      new Paragraph({
        text: 'STRUCTURED OBSERVATION REPORT',
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
      })
    );
    children.push(new Paragraph({ text: '' }));

    // Header info
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
          new TextRun({ text: 'Date: ', bold: true }),
          new TextRun(format(new Date(obs.observationDate), 'MMMM d, yyyy')),
        ],
      })
    );
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Observer: ', bold: true }),
          new TextRun(obs.observer || 'Not specified'),
        ],
      })
    );
    if (obs.teacherClass) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Teacher/Class: ', bold: true }),
            new TextRun(obs.teacherClass),
          ],
        })
      );
    }
    children.push(new Paragraph({ text: '' }));

    // Part 1: Narrative Observations
    children.push(
      new Paragraph({
        text: 'PART 1: NARRATIVE OBSERVATIONS',
        heading: HeadingLevel.HEADING_2,
      })
    );
    children.push(new Paragraph({ text: '' }));

    if (obs.teacherPosition) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: 'Teacher Position:', bold: true })],
        })
      );
      children.push(new Paragraph({ text: obs.teacherPosition }));
      children.push(new Paragraph({ text: '' }));
    }

    if (obs.teacherTechniques) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: 'Teacher Techniques:', bold: true })],
        })
      );
      children.push(new Paragraph({ text: obs.teacherTechniques }));
      children.push(new Paragraph({ text: '' }));
    }

    if (obs.additionalObservations) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: 'Additional Observations:', bold: true })],
        })
      );
      children.push(new Paragraph({ text: obs.additionalObservations }));
      children.push(new Paragraph({ text: '' }));
    }

    // Part 2: Behavior Checklist
    if (obs.behaviorChecklist && obs.behaviorChecklist.length > 0) {
      children.push(
        new Paragraph({
          text: 'PART 2: BEHAVIOR CHECKLIST',
          heading: HeadingLevel.HEADING_2,
        })
      );
      children.push(new Paragraph({ text: '' }));

      // Group by category
      const grouped = obs.behaviorChecklist.reduce((acc, item) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
      }, {} as Record<string, typeof obs.behaviorChecklist>);

      Object.entries(grouped).forEach(([category, items]) => {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: category, bold: true, italics: true })],
          })
        );
        items.forEach(item => {
          const ratingLabel = item.rating === 'frequently' ? 'Frequently' : 
                              item.rating === 'sometimes' ? 'Sometimes' : 'Not Observed';
          children.push(
            new Paragraph({
              text: `  • ${item.behavior}: ${ratingLabel}`,
            })
          );
        });
        children.push(new Paragraph({ text: '' }));
      });
    }

    // Notes
    if (obs.notes) {
      children.push(
        new Paragraph({
          text: 'NOTES',
          heading: HeadingLevel.HEADING_2,
        })
      );
      children.push(new Paragraph({ text: obs.notes }));
    }

    // Create document
    const doc = new Document({
      sections: [{ properties: {}, children }],
    });

    // Generate and save
    const blob = await Packer.toBlob(doc);
    const filename = `structured-observation-${student.name.replace(/\s+/g, '-')}-${format(new Date(obs.observationDate), 'yyyy-MM-dd')}.docx`;
    saveAs(blob, filename);
    
    toast({
      title: 'Exported',
      description: 'Structured observation exported to Word document.',
    });
  };

  const toggleSession = (sessionId: string) => {
    setExpandedSessions(prev => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {/* Header with filter and export */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-medium">Observation Results</h3>
          <p className="text-xs text-muted-foreground">
            View collected data from direct observations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                <FileDown className="w-4 h-4" />
                Export All
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportAllSessionsToDocx}>
                <Download className="w-4 h-4 mr-2" />
                Export to Word (.docx)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as typeof dateFilter)}>
            <SelectTrigger className="w-[130px] h-8">
              <Filter className="w-3 h-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="sessions" className="space-y-4">
        <TabsList className="grid grid-cols-2 w-full max-w-[300px]">
          <TabsTrigger value="sessions" className="gap-1 text-xs">
            <BarChart3 className="w-3 h-3" />
            Sessions
          </TabsTrigger>
          <TabsTrigger value="structured" className="gap-1 text-xs">
            <ClipboardList className="w-3 h-3" />
            Structured Forms
          </TabsTrigger>
        </TabsList>

        {/* Session Data Tab */}
        <TabsContent value="sessions">
          <ScrollArea className="h-[400px]">
            {filteredSessions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Eye className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No observation sessions found</p>
              </div>
            ) : (
              <div className="space-y-2">
                    {filteredSessions.map(session => {
                      const summary = getSessionDataSummary(session.id);
                      const isExpanded = expandedSessions.has(session.id);
                      const hasData = summary.abcCount > 0 || summary.frequencyCount > 0 || 
                                      summary.durationSeconds > 0 || summary.intervalCount > 0;

                      return (
                        <Collapsible
                          key={session.id}
                          open={isExpanded}
                          onOpenChange={() => toggleSession(session.id)}
                        >
                          <Card className="overflow-hidden">
                            <CollapsibleTrigger asChild>
                              <CardHeader className="py-3 px-4 cursor-pointer hover:bg-muted/50">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-muted-foreground" />
                                    <div>
                                      <p className="font-medium text-sm">
                                        {format(new Date(session.date), 'MMM d, yyyy')}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {format(new Date(session.date), 'h:mm a')} ({session.sessionLengthMinutes} min)
                                      </p>
                                    </div>
                                  </div>
                              <div className="flex items-center gap-2">
                                {hasData ? (
                                  <Badge variant="secondary" className="text-xs">
                                    Data collected
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs">
                                    No data
                                  </Badge>
                                )}
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </div>
                            </div>
                          </CardHeader>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <CardContent className="pt-0 pb-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                              <div className="p-2 bg-muted/50 rounded text-center">
                                <p className="text-lg font-bold">{summary.abcCount}</p>
                                <p className="text-xs text-muted-foreground">ABC Records</p>
                              </div>
                              <div className="p-2 bg-muted/50 rounded text-center">
                                <p className="text-lg font-bold">{summary.frequencyCount}</p>
                                <p className="text-xs text-muted-foreground">Frequency</p>
                              </div>
                              <div className="p-2 bg-muted/50 rounded text-center">
                                <p className="text-lg font-bold">
                                  {Math.floor(summary.durationSeconds / 60)}m
                                </p>
                                <p className="text-xs text-muted-foreground">Duration</p>
                              </div>
                              <div className="p-2 bg-muted/50 rounded text-center">
                                <p className="text-lg font-bold">{summary.intervalPercentage}%</p>
                                <p className="text-xs text-muted-foreground">
                                  Intervals ({summary.intervalsOccurred}/{summary.intervalCount})
                                </p>
                              </div>
                            </div>
                            {/* Export buttons */}
                            <div className="flex gap-2 mt-3">
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1"
                                onClick={() => exportSessionToDocx(session)}
                              >
                                <Download className="w-3 h-3" />
                                Export to Word
                              </Button>
                            </div>
                          </CardContent>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  );
                })}

                {/* Show unmatched/orphaned data from other sessions */}
                {unmatchedDataSummary.hasUnmatched && (
                  <>
                    <div className="border-t pt-3 mt-3">
                      <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        Data from other sessions (not shown above)
                      </p>
                    </div>
                    {Array.from(unmatchedDataSummary.sessionGroups.entries())
                      .sort(([, a], [, b]) => b.earliestTimestamp.getTime() - a.earliestTimestamp.getTime())
                      .map(([sessionId, data]) => {
                        const hasEntryData = data.abcCount > 0 || data.frequencyCount > 0 || data.durationSeconds > 0 || data.intervalCount > 0;
                        if (!hasEntryData) return null;
                        return (
                          <Card key={sessionId} className="overflow-hidden border-dashed">
                            <CardHeader className="py-3 px-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4 text-muted-foreground" />
                                  <div>
                                    <p className="font-medium text-sm">
                                      {format(data.earliestTimestamp, 'MMM d, yyyy')}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {format(data.earliestTimestamp, 'h:mm a')} (recovered data)
                                    </p>
                                  </div>
                                </div>
                                <Badge variant="secondary" className="text-xs">Data recovered</Badge>
                              </div>
                            </CardHeader>
                            <CardContent className="pt-0 pb-4">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                                <div className="p-2 bg-muted/50 rounded text-center">
                                  <p className="text-lg font-bold">{data.abcCount}</p>
                                  <p className="text-xs text-muted-foreground">ABC Records</p>
                                </div>
                                <div className="p-2 bg-muted/50 rounded text-center">
                                  <p className="text-lg font-bold">{data.frequencyCount}</p>
                                  <p className="text-xs text-muted-foreground">Frequency</p>
                                </div>
                                <div className="p-2 bg-muted/50 rounded text-center">
                                  <p className="text-lg font-bold">{Math.floor(data.durationSeconds / 60)}m</p>
                                  <p className="text-xs text-muted-foreground">Duration</p>
                                </div>
                                <div className="p-2 bg-muted/50 rounded text-center">
                                  <p className="text-lg font-bold">
                                    {data.intervalCount > 0 ? Math.round((data.intervalsOccurred / data.intervalCount) * 100) : 0}%
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Intervals ({data.intervalsOccurred}/{data.intervalCount})
                                  </p>
                                </div>
                              </div>
                              {/* Export button for recovered data */}
                              <div className="flex gap-2 mt-3">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-1"
                                  onClick={() => exportRecoveredDataToDocx(sessionId, data)}
                                >
                                  <Download className="w-3 h-3" />
                                  Export to Word
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                  </>
                )}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        {/* Structured Observations Tab */}
        <TabsContent value="structured">
          <ScrollArea className="h-[400px]">
            {structuredObservations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No structured observations found</p>
                <p className="text-xs mt-1">Complete a structured observation form to see results here</p>
              </div>
            ) : (
              <div className="space-y-2">
                {structuredObservations.map(obs => {
                  const frequentBehaviors = obs.behaviorChecklist?.filter(b => b.rating === 'frequently') || [];
                  const sometimesBehaviors = obs.behaviorChecklist?.filter(b => b.rating === 'sometimes') || [];

                  return (
                    <Card key={obs.id} className="overflow-hidden">
                      <CardHeader className="py-3 px-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium text-sm">
                                {format(new Date(obs.observationDate), 'MMM d, yyyy')}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Observer: {obs.observer || 'Unknown'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {frequentBehaviors.length > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                {frequentBehaviors.length} frequent
                              </Badge>
                            )}
                            {sometimesBehaviors.length > 0 && (
                              <Badge variant="outline" className="text-xs bg-warning/20">
                                {sometimesBehaviors.length} sometimes
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 pb-4">
                        <div className="flex gap-2 mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1"
                            onClick={() => setSelectedObservation(obs)}
                          >
                            <Eye className="w-3 h-3" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1"
                            onClick={() => exportStructuredObservation(obs)}
                          >
                            <Download className="w-3 h-3" />
                            Export
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* View Observation Dialog */}
      <Dialog open={!!selectedObservation} onOpenChange={() => setSelectedObservation(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5" />
              Structured Observation
            </DialogTitle>
          </DialogHeader>
          
          {selectedObservation && (
            <div className="space-y-4">
              {/* Header info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Date:</span>{' '}
                  <span className="font-medium">
                    {format(new Date(selectedObservation.observationDate), 'MMMM d, yyyy')}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Observer:</span>{' '}
                  <span className="font-medium">{selectedObservation.observer}</span>
                </div>
                {selectedObservation.teacherClass && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Teacher/Class:</span>{' '}
                    <span className="font-medium">{selectedObservation.teacherClass}</span>
                  </div>
                )}
              </div>

              {/* Narrative sections */}
              {(selectedObservation.teacherPosition || selectedObservation.teacherTechniques || selectedObservation.additionalObservations) && (
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Narrative Observations</h4>
                  {selectedObservation.teacherPosition && (
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Teacher Position</p>
                      <p className="text-sm">{selectedObservation.teacherPosition}</p>
                    </div>
                  )}
                  {selectedObservation.teacherTechniques && (
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Teacher Techniques</p>
                      <p className="text-sm">{selectedObservation.teacherTechniques}</p>
                    </div>
                  )}
                  {selectedObservation.additionalObservations && (
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Additional Observations</p>
                      <p className="text-sm">{selectedObservation.additionalObservations}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Behavior checklist results */}
              {selectedObservation.behaviorChecklist && selectedObservation.behaviorChecklist.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Behavior Checklist Results</h4>
                  <div className="space-y-2">
                    {Object.entries(
                      selectedObservation.behaviorChecklist.reduce((acc, item) => {
                        if (!acc[item.category]) acc[item.category] = [];
                        acc[item.category].push(item);
                        return acc;
                      }, {} as Record<string, typeof selectedObservation.behaviorChecklist>)
                    ).map(([category, items]) => (
                      <div key={category} className="bg-muted/30 p-2 rounded">
                        <p className="font-medium text-xs mb-1">{category}</p>
                        <div className="space-y-1">
                          {items.map(item => (
                            <div key={item.id} className="flex items-center justify-between text-xs">
                              <span>{item.behavior}</span>
                              <Badge
                                variant={
                                  item.rating === 'frequently' ? 'destructive' :
                                  item.rating === 'sometimes' ? 'secondary' : 'outline'
                                }
                                className="text-[10px]"
                              >
                                {item.rating === 'frequently' ? 'Frequently' :
                                 item.rating === 'sometimes' ? 'Sometimes' : 'Not Observed'}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedObservation.notes && (
                <div>
                  <h4 className="font-medium text-sm mb-2">Notes</h4>
                  <p className="text-sm bg-muted/50 p-3 rounded-lg">{selectedObservation.notes}</p>
                </div>
              )}

              {/* Export button */}
              <Button 
                className="w-full gap-2" 
                onClick={() => exportStructuredObservation(selectedObservation)}
              >
                <Download className="w-4 h-4" />
                Export to Word Document
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}