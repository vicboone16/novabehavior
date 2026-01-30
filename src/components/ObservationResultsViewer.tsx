import { useState, useMemo } from 'react';
import { format, isWithinInterval, startOfDay, endOfDay, subDays } from 'date-fns';
import { 
  ClipboardList, Download, Eye, FileText, ChevronDown, ChevronUp,
  Target, MessageSquare, Filter, Calendar, BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { useDataStore } from '@/store/dataStore';
import { Student } from '@/types/behavior';
import { useToast } from '@/hooks/use-toast';
import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  HeadingLevel, 
  AlignmentType,
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
      .filter(s => 
        s.studentIds?.includes(studentId) &&
        new Date(s.date) >= start
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sessions, studentId, dateFilter]);

  // Get session data summary
  const getSessionDataSummary = (sessionId: string) => {
    const sessionAbcs = abcEntries.filter(e => e.studentId === studentId && e.sessionId === sessionId);
    const sessionFrequency = frequencyEntries.filter(e => 
      e.studentId === studentId && e.sessionId === sessionId
    );
    const sessionDuration = durationEntries.filter(e => 
      e.studentId === studentId && e.sessionId === sessionId
    );
    const sessionIntervals = intervalEntries.filter(e => 
      e.studentId === studentId && e.sessionId === sessionId
    );
    
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
      {/* Header with filter */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Observation Results</h3>
          <p className="text-xs text-muted-foreground">
            View collected data from direct observations
          </p>
        </div>
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
                          </CardContent>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  );
                })}
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