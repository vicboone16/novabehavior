/**
 * Nova AI Clinical Capture - Review Workspace
 * Full tabbed workspace for reviewing a recording: Transcript, Summary, ABA Extract,
 * Drafts, Ask AI, Save/Post, Audit.
 */

import { useState, useEffect } from 'react';
import { ArrowLeft, FileText, BarChart3, Brain, PenTool, MessageSquare, Save, ClipboardList, Loader2, Play, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { ENCOUNTER_TYPE_LABELS, CONSENT_LABELS, PRIVACY_LABELS } from '@/types/voiceCapture';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface RecordingReviewWorkspaceProps {
  recordingId: string;
  onBack: () => void;
}

export function RecordingReviewWorkspace({ recordingId, onBack }: RecordingReviewWorkspaceProps) {
  const [recording, setRecording] = useState<any>(null);
  const [transcript, setTranscript] = useState<any>(null);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [extractions, setExtractions] = useState<any[]>([]);
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('transcript');
  const [processing, setProcessing] = useState(false);

  // AI Q&A state
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswers, setAiAnswers] = useState<Array<{ question: string; answer: string }>>([]);

  useEffect(() => {
    loadRecordingData();
  }, [recordingId]);

  const loadRecordingData = async () => {
    setLoading(true);
    const [recRes, transRes, draftsRes, extRes, auditRes] = await Promise.all([
      supabase.from('voice_recordings' as any).select('*').eq('id', recordingId).single(),
      supabase.from('voice_transcripts' as any).select('*').eq('recording_id', recordingId).order('version_number', { ascending: false }).limit(1),
      supabase.from('voice_ai_drafts' as any).select('*').eq('recording_id', recordingId).order('created_at', { ascending: true }),
      supabase.from('voice_ai_extractions' as any).select('*').eq('recording_id', recordingId),
      supabase.from('voice_audit_log' as any).select('*').eq('recording_id', recordingId).order('created_at', { ascending: true }),
    ]);

    if (recRes.data) setRecording(recRes.data);
    if (transRes.data?.[0]) setTranscript(transRes.data[0]);
    if (draftsRes.data) setDrafts(draftsRes.data);
    if (extRes.data) setExtractions(extRes.data);
    if (auditRes.data) setAuditLog(auditRes.data);
    setLoading(false);
  };

  const handleProcessTranscript = async () => {
    setProcessing(true);
    try {
      // Trigger backend processing via edge function
      const { data, error } = await supabase.functions.invoke('voice-capture-process', {
        body: { recording_id: recordingId, action: 'transcribe_and_extract' },
      });

      if (error) throw error;
      toast.success('Processing started — transcript and AI outputs will appear shortly');

      // Refresh after a delay
      setTimeout(() => loadRecordingData(), 5000);
    } catch (err: any) {
      toast.error('Processing failed: ' + (err?.message || 'Unknown error'));
    } finally {
      setProcessing(false);
    }
  };

  const handleSavePrivately = async () => {
    try {
      await supabase.from('voice_recordings' as any).update({
        status: 'saved_draft',
      }).eq('id', recordingId);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('voice_save_actions' as any).insert({
          recording_id: recordingId,
          action_type: 'save_private',
          performed_by: user.id,
        });
        await supabase.from('voice_audit_log' as any).insert({
          recording_id: recordingId,
          user_id: user.id,
          action_type: 'saved_privately',
        });
      }

      toast.success('Saved privately');
      loadRecordingData();
    } catch {
      toast.error('Save failed');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!recording) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Recording not found</p>
        <Button onClick={onBack} variant="outline" size="sm" className="mt-4">Go Back</Button>
      </div>
    );
  }

  const SUGGESTED_PROMPTS = [
    'Summarize main concerns',
    'What possible functions were mentioned?',
    'What follow-up questions should I ask?',
    'Extract medication changes',
    'Make this more objective',
    'Create a session note draft',
    'What information is still missing for an FBA?',
    'Translate summary to Spanish',
    'What risk issues came up?',
    'Create a caregiver training summary',
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            {ENCOUNTER_TYPE_LABELS[recording.encounter_type as keyof typeof ENCOUNTER_TYPE_LABELS] || recording.encounter_type}
            <Badge variant={recording.privacy_mode === 'private' ? 'secondary' : 'outline'} className="text-[10px]">
              {PRIVACY_LABELS[recording.privacy_mode as keyof typeof PRIVACY_LABELS] || recording.privacy_mode}
            </Badge>
          </h2>
          <p className="text-xs text-muted-foreground">
            {format(new Date(recording.created_at), 'MMMM d, yyyy h:mm a')}
            {recording.duration_seconds && ` · ${Math.floor(recording.duration_seconds / 60)}m ${recording.duration_seconds % 60}s`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {recording.status === 'audio_secured' && (
            <Button onClick={handleProcessTranscript} disabled={processing} size="sm">
              {processing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Play className="w-4 h-4 mr-1" />}
              Process
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => loadRecordingData()}>
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="transcript" className="gap-1.5 text-xs">
            <FileText className="w-3.5 h-3.5" /> Transcript
          </TabsTrigger>
          <TabsTrigger value="summary" className="gap-1.5 text-xs">
            <BarChart3 className="w-3.5 h-3.5" /> Summary
          </TabsTrigger>
          <TabsTrigger value="extract" className="gap-1.5 text-xs">
            <Brain className="w-3.5 h-3.5" /> ABA Extract
          </TabsTrigger>
          <TabsTrigger value="drafts" className="gap-1.5 text-xs">
            <PenTool className="w-3.5 h-3.5" /> Drafts
          </TabsTrigger>
          <TabsTrigger value="ask-ai" className="gap-1.5 text-xs">
            <MessageSquare className="w-3.5 h-3.5" /> Ask AI
          </TabsTrigger>
          <TabsTrigger value="save" className="gap-1.5 text-xs">
            <Save className="w-3.5 h-3.5" /> Save / Post
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-1.5 text-xs">
            <ClipboardList className="w-3.5 h-3.5" /> Audit
          </TabsTrigger>
        </TabsList>

        {/* Transcript Tab */}
        <TabsContent value="transcript" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Transcript</CardTitle></CardHeader>
            <CardContent>
              {transcript?.full_text ? (
                <div className="prose prose-sm max-w-none">
                  <p className="whitespace-pre-wrap text-sm">{transcript.full_text}</p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {recording.status === 'audio_secured'
                      ? 'Audio secured. Click "Process" to generate transcript.'
                      : recording.transcript_status === 'processing'
                        ? 'Transcript is being generated...'
                        : 'No transcript available yet.'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Summary Tab */}
        <TabsContent value="summary" className="mt-4">
          <div className="grid gap-3">
            {extractions.filter(e => e.extraction_type?.includes('summary')).length > 0 ? (
              extractions.filter(e => e.extraction_type?.includes('summary')).map(ext => (
                <Card key={ext.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm capitalize">{ext.extraction_type?.replace(/_/g, ' ')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{ext.json_payload?.text || JSON.stringify(ext.json_payload)}</p>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  Summaries will appear after processing is complete.
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ABA Extract Tab */}
        <TabsContent value="extract" className="mt-4">
          <div className="grid gap-3">
            {extractions.filter(e => !e.extraction_type?.includes('summary')).length > 0 ? (
              extractions.filter(e => !e.extraction_type?.includes('summary')).map(ext => (
                <Card key={ext.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm capitalize">{ext.extraction_type?.replace(/_/g, ' ')}</CardTitle>
                      {ext.confidence_score && (
                        <Badge variant="outline" className="text-[10px]">
                          {Math.round(ext.confidence_score * 100)}% confidence
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                      {JSON.stringify(ext.json_payload, null, 2)}
                    </pre>
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" variant="outline" className="text-xs">Approve</Button>
                      <Button size="sm" variant="ghost" className="text-xs text-muted-foreground">Ignore</Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  ABA-specific extractions will appear after processing.
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Drafts Tab */}
        <TabsContent value="drafts" className="mt-4">
          <div className="grid gap-3">
            {drafts.length > 0 ? (
              drafts.map(draft => (
                <Card key={draft.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm capitalize">{draft.draft_type?.replace(/_/g, ' ')}</CardTitle>
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className="text-[10px]">{draft.tone}</Badge>
                        {draft.approved_at && <Badge className="text-[10px]">Approved</Badge>}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={draft.content || ''}
                      className="min-h-[120px] text-sm"
                      readOnly
                    />
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <Button size="sm" variant="outline" className="text-xs">Shorter</Button>
                      <Button size="sm" variant="outline" className="text-xs">More Objective</Button>
                      <Button size="sm" variant="outline" className="text-xs">Parent-Friendly</Button>
                      <Button size="sm" variant="outline" className="text-xs">Translate</Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  Draft notes will appear after processing.
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Ask AI Tab */}
        <TabsContent value="ask-ai" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Ask AI about this recording</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {/* Suggested prompts */}
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_PROMPTS.map((prompt, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => setAiQuestion(prompt)}
                  >
                    {prompt}
                  </Button>
                ))}
              </div>

              <Separator />

              {/* Q&A history */}
              {aiAnswers.map((qa, i) => (
                <div key={i} className="space-y-2">
                  <div className="text-sm font-medium">Q: {qa.question}</div>
                  <div className="text-sm text-muted-foreground bg-muted p-3 rounded">{qa.answer}</div>
                </div>
              ))}

              {/* Input */}
              <div className="flex gap-2">
                <Textarea
                  value={aiQuestion}
                  onChange={(e) => setAiQuestion(e.target.value)}
                  placeholder="Ask a question about this recording..."
                  className="min-h-[60px] text-sm"
                />
                <Button
                  onClick={() => {
                    if (aiQuestion.trim()) {
                      setAiAnswers(prev => [...prev, { question: aiQuestion, answer: 'AI processing will be available after the processing pipeline is connected.' }]);
                      setAiQuestion('');
                    }
                  }}
                  className="self-end"
                >
                  Ask
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Save / Post Tab */}
        <TabsContent value="save" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Save & Post Actions</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-2">
                <Button variant="outline" className="justify-start" onClick={handleSavePrivately}>
                  <Save className="w-4 h-4 mr-2" /> Save Transcript Privately
                </Button>
                <Button variant="outline" className="justify-start" onClick={handleSavePrivately}>
                  <Save className="w-4 h-4 mr-2" /> Save Summary Privately
                </Button>
                <Button variant="outline" className="justify-start" disabled>
                  <PenTool className="w-4 h-4 mr-2" /> Save as Narrative Note Draft
                </Button>
                <Button variant="outline" className="justify-start" disabled>
                  <PenTool className="w-4 h-4 mr-2" /> Save as Session Note Draft
                </Button>
                <Button variant="outline" className="justify-start" disabled>
                  <PenTool className="w-4 h-4 mr-2" /> Save as Supervision Draft
                </Button>
                <Button variant="outline" className="justify-start" disabled>
                  <PenTool className="w-4 h-4 mr-2" /> Save as FBA Draft
                </Button>
                <Button variant="outline" className="justify-start" disabled>
                  <PenTool className="w-4 h-4 mr-2" /> Save Tasks
                </Button>
                <Button variant="outline" className="justify-start" disabled>
                  <PenTool className="w-4 h-4 mr-2" /> Propose Profile Updates
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Chart posting requires an approved draft. Nothing is auto-posted.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Tab */}
        <TabsContent value="audit" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Audit Trail</CardTitle></CardHeader>
            <CardContent>
              {auditLog.length > 0 ? (
                <div className="space-y-2">
                  {auditLog.map(entry => (
                    <div key={entry.id} className="flex items-center gap-3 text-sm py-1.5 border-b last:border-0">
                      <span className="text-xs text-muted-foreground w-32 shrink-0">
                        {format(new Date(entry.created_at), 'MMM d h:mm a')}
                      </span>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {entry.action_type?.replace(/_/g, ' ')}
                      </Badge>
                      {entry.metadata_json && Object.keys(entry.metadata_json).length > 0 && (
                        <span className="text-xs text-muted-foreground truncate">
                          {JSON.stringify(entry.metadata_json)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No audit entries yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
