import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { FileText, Clock, User, Target, AlertCircle, Check, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useDataStore } from '@/store/dataStore';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface SessionNoteBuilderProps {
  studentId: string;
  sessionId: string;
  sessionData: {
    startTime: Date;
    endTime: Date;
    durationMinutes: number;
    location?: string;
  };
  onSubmit: (noteData: NoteData) => void;
  onCancel: () => void;
  noteRequired?: boolean;
}

interface NoteData {
  noteType: 'quick' | 'aba_session' | 'soap' | 'consultation';
  content: Record<string, string>;
  status: 'draft' | 'submitted';
}

interface BehaviorSummary {
  behaviorId: string;
  behaviorName: string;
  frequencyCount: number;
  durationSeconds: number;
  intervalPercentage: number;
  abcCount: number;
}

export function SessionNoteBuilder({
  studentId,
  sessionId,
  sessionData,
  onSubmit,
  onCancel,
  noteRequired = false,
}: SessionNoteBuilderProps) {
  const { user } = useAuth();
  const { students, frequencyEntries, durationEntries, intervalEntries, abcEntries } = useDataStore();
  
  const [noteType, setNoteType] = useState<'quick' | 'aba_session'>('quick');
  const [saving, setSaving] = useState(false);
  const [showAutoData, setShowAutoData] = useState(true);
  
  // Quick Note fields
  const [quickNote, setQuickNote] = useState('');
  
  // ABA Session Note fields
  const [abaFields, setAbaFields] = useState({
    sessionObjective: '',
    behaviorsObserved: '',
    interventionsUsed: '',
    studentResponse: '',
    progressNotes: '',
    recommendations: '',
    nextSessionPlan: '',
    additionalNotes: '',
  });

  const student = students.find(s => s.id === studentId);
  
  // Calculate session data summaries
  const behaviorSummaries: BehaviorSummary[] = student?.behaviors.map(behavior => {
    // Frequency
    const freqEntry = frequencyEntries.find(
      e => e.studentId === studentId && e.behaviorId === behavior.id && e.sessionId === sessionId
    );
    const frequencyCount = freqEntry?.count || 0;

    // Duration
    const durationEntriesForBehavior = durationEntries.filter(
      e => e.studentId === studentId && e.behaviorId === behavior.id && e.sessionId === sessionId
    );
    const durationSeconds = durationEntriesForBehavior.reduce((sum, e) => sum + e.duration, 0);

    // Interval
    const intervalEntriesForBehavior = intervalEntries.filter(
      e => e.studentId === studentId && e.behaviorId === behavior.id && e.sessionId === sessionId && !e.voided
    );
    const intervalTotal = intervalEntriesForBehavior.length;
    const intervalOccurred = intervalEntriesForBehavior.filter(e => e.occurred).length;
    const intervalPercentage = intervalTotal > 0 ? Math.round((intervalOccurred / intervalTotal) * 100) : 0;

    // ABC
    const abcEntriesForBehavior = abcEntries.filter(
      e => e.studentId === studentId && e.behaviorId === behavior.id && e.sessionId === sessionId
    );
    const abcCount = abcEntriesForBehavior.length;

    return {
      behaviorId: behavior.id,
      behaviorName: behavior.name,
      frequencyCount,
      durationSeconds,
      intervalPercentage,
      abcCount,
    };
  }) || [];

  // Skill acquisition summary from student data
  const studentDttSessions = student?.dttSessions?.filter(
    s => format(new Date(s.date), 'yyyy-MM-dd') === format(sessionData.startTime, 'yyyy-MM-dd')
  ) || [];

  const skillSummaries = studentDttSessions.map(session => {
    const target = student?.skillTargets?.find(t => t.id === session.skillTargetId);
    return {
      targetName: target?.name || 'Unknown Target',
      trialsCompleted: session.trials.length,
      percentCorrect: session.percentCorrect,
      percentIndependent: session.percentIndependent,
    };
  });

  // Auto-generate behaviors observed text
  const generateBehaviorsText = () => {
    const parts: string[] = [];
    
    behaviorSummaries.forEach(summary => {
      const segments: string[] = [];
      
      if (summary.frequencyCount > 0) {
        segments.push(`${summary.frequencyCount} occurrences`);
      }
      if (summary.durationSeconds > 0) {
        const minutes = Math.floor(summary.durationSeconds / 60);
        const seconds = summary.durationSeconds % 60;
        segments.push(`${minutes}m ${seconds}s total duration`);
      }
      if (summary.intervalPercentage > 0) {
        segments.push(`${summary.intervalPercentage}% of intervals`);
      }
      
      if (segments.length > 0) {
        parts.push(`${summary.behaviorName}: ${segments.join(', ')}`);
      }
    });

    return parts.join('. ') || 'No behavior data recorded this session.';
  };

  // Pre-populate ABA fields on mount
  useEffect(() => {
    const behaviorsText = generateBehaviorsText();
    setAbaFields(prev => ({
      ...prev,
      behaviorsObserved: behaviorsText,
    }));
  }, [studentId]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  };

  const handleSubmit = async (asDraft = false) => {
    setSaving(true);
    
    try {
      const content = noteType === 'quick' 
        ? { note: quickNote }
        : abaFields;

      const noteData: NoteData = {
        noteType,
        content,
        status: asDraft ? 'draft' : 'submitted',
      };

      // Save to database
      const { error } = await supabase.from('session_notes').insert({
        session_id: sessionId,
        student_id: studentId,
        user_id: user?.id,
        note_type: noteType,
        content: content,
        status: asDraft ? 'draft' : 'submitted',
        submitted_at: asDraft ? null : new Date().toISOString(),
      });

      if (error) throw error;

      toast({
        title: asDraft ? 'Draft Saved' : 'Note Submitted',
        description: asDraft 
          ? 'Your note has been saved as a draft.'
          : 'Session note has been submitted and locked.',
      });

      onSubmit(noteData);
    } catch (error) {
      console.error('Error saving note:', error);
      toast({
        title: 'Error',
        description: 'Failed to save note. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with session info */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Session Note for {student?.name}
            </CardTitle>
            {noteRequired && (
              <Badge variant="destructive" className="text-xs">
                <AlertCircle className="w-3 h-3 mr-1" />
                Required
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              <span>{format(sessionData.startTime, 'MMM d, yyyy')}</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span>{format(sessionData.startTime, 'h:mm a')} - {format(sessionData.endTime, 'h:mm a')}</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span>{sessionData.durationMinutes.toFixed(1)} min</span>
            </div>
            {sessionData.location && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <span>{sessionData.location}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Auto-populated data summary */}
      <Collapsible open={showAutoData} onOpenChange={setShowAutoData}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Session Data Summary
                </CardTitle>
                <ChevronDown className={`w-4 h-4 transition-transform ${showAutoData ? 'rotate-180' : ''}`} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 space-y-3">
              {/* Behavior Data */}
              {behaviorSummaries.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground">Behavior Data</Label>
                  <div className="mt-1 space-y-1">
                    {behaviorSummaries.map(summary => (
                      <div key={summary.behaviorId} className="flex flex-wrap gap-2 text-xs">
                        <span className="font-medium">{summary.behaviorName}:</span>
                        {summary.frequencyCount > 0 && (
                          <Badge variant="outline">{summary.frequencyCount} freq</Badge>
                        )}
                        {summary.durationSeconds > 0 && (
                          <Badge variant="outline">{formatDuration(summary.durationSeconds)}</Badge>
                        )}
                        {summary.intervalPercentage > 0 && (
                          <Badge variant="outline">{summary.intervalPercentage}% intervals</Badge>
                        )}
                        {summary.abcCount > 0 && (
                          <Badge variant="outline">{summary.abcCount} ABC</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Skill Acquisition Data */}
              {skillSummaries.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground">Skill Acquisition</Label>
                  <div className="mt-1 space-y-1">
                    {skillSummaries.map((skill, idx) => (
                      <div key={idx} className="flex flex-wrap gap-2 text-xs">
                        <span className="font-medium">{skill.targetName}:</span>
                        <Badge variant="outline">{skill.trialsCompleted} trials</Badge>
                        <Badge variant="outline">{skill.percentCorrect}% correct</Badge>
                        <Badge variant="outline">{skill.percentIndependent}% independent</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {behaviorSummaries.every(s => s.frequencyCount === 0 && s.durationSeconds === 0 && s.intervalPercentage === 0) && 
               skillSummaries.length === 0 && (
                <p className="text-xs text-muted-foreground italic">No data recorded this session.</p>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Note Type Selection */}
      <Tabs value={noteType} onValueChange={(v) => setNoteType(v as 'quick' | 'aba_session')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="quick">Quick Note</TabsTrigger>
          <TabsTrigger value="aba_session">ABA Session Note</TabsTrigger>
        </TabsList>

        {/* Quick Note */}
        <TabsContent value="quick" className="space-y-3">
          <Card>
            <CardContent className="pt-4">
              <Label htmlFor="quick-note">Session Notes</Label>
              <Textarea
                id="quick-note"
                value={quickNote}
                onChange={(e) => setQuickNote(e.target.value)}
                placeholder="Enter brief session notes..."
                className="mt-1.5 min-h-[120px]"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA Session Note */}
        <TabsContent value="aba_session" className="space-y-3">
          <Card>
            <CardContent className="pt-4 space-y-4">
              <div>
                <Label htmlFor="session-objective">Session Objective</Label>
                <Input
                  id="session-objective"
                  value={abaFields.sessionObjective}
                  onChange={(e) => setAbaFields(prev => ({ ...prev, sessionObjective: e.target.value }))}
                  placeholder="What was the primary focus of this session?"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="behaviors-observed">Behaviors Observed</Label>
                <Textarea
                  id="behaviors-observed"
                  value={abaFields.behaviorsObserved}
                  onChange={(e) => setAbaFields(prev => ({ ...prev, behaviorsObserved: e.target.value }))}
                  placeholder="Describe behaviors observed during the session..."
                  className="mt-1 min-h-[80px]"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Auto-populated from session data. Edit as needed.
                </p>
              </div>

              <div>
                <Label htmlFor="interventions-used">Interventions Used</Label>
                <Textarea
                  id="interventions-used"
                  value={abaFields.interventionsUsed}
                  onChange={(e) => setAbaFields(prev => ({ ...prev, interventionsUsed: e.target.value }))}
                  placeholder="What strategies or interventions were implemented?"
                  className="mt-1 min-h-[60px]"
                />
              </div>

              <div>
                <Label htmlFor="student-response">Student Response</Label>
                <Textarea
                  id="student-response"
                  value={abaFields.studentResponse}
                  onChange={(e) => setAbaFields(prev => ({ ...prev, studentResponse: e.target.value }))}
                  placeholder="How did the student respond to interventions?"
                  className="mt-1 min-h-[60px]"
                />
              </div>

              <div>
                <Label htmlFor="progress-notes">Progress Notes</Label>
                <Textarea
                  id="progress-notes"
                  value={abaFields.progressNotes}
                  onChange={(e) => setAbaFields(prev => ({ ...prev, progressNotes: e.target.value }))}
                  placeholder="Note any progress toward goals..."
                  className="mt-1 min-h-[60px]"
                />
              </div>

              <div>
                <Label htmlFor="recommendations">Recommendations</Label>
                <Textarea
                  id="recommendations"
                  value={abaFields.recommendations}
                  onChange={(e) => setAbaFields(prev => ({ ...prev, recommendations: e.target.value }))}
                  placeholder="Any recommendations for future sessions or team..."
                  className="mt-1 min-h-[60px]"
                />
              </div>

              <div>
                <Label htmlFor="next-session-plan">Next Session Plan</Label>
                <Input
                  id="next-session-plan"
                  value={abaFields.nextSessionPlan}
                  onChange={(e) => setAbaFields(prev => ({ ...prev, nextSessionPlan: e.target.value }))}
                  placeholder="Goals for the next session..."
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="additional-notes">Additional Notes</Label>
                <Textarea
                  id="additional-notes"
                  value={abaFields.additionalNotes}
                  onChange={(e) => setAbaFields(prev => ({ ...prev, additionalNotes: e.target.value }))}
                  placeholder="Any other relevant information..."
                  className="mt-1 min-h-[60px]"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex justify-between gap-2 pt-2">
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          <X className="w-4 h-4 mr-1" />
          {noteRequired ? 'Submit Data Only' : 'Cancel'}
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleSubmit(true)} disabled={saving}>
            Save Draft
          </Button>
          <Button onClick={() => handleSubmit(false)} disabled={saving}>
            <Check className="w-4 h-4 mr-1" />
            Submit Note
          </Button>
        </div>
      </div>
    </div>
  );
}
