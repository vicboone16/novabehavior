/**
 * Nova AI Clinical Capture - Review Workspace
 * Full tabbed workspace for reviewing a recording: Transcript, Summary, ABA Extract,
 * Drafts, Ask AI, Save/Post, Audit.
 */

import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, FileText, BarChart3, Brain, PenTool, MessageSquare, Save, ClipboardList, Loader2, Play, RefreshCw, AlertTriangle, CheckCircle2, Clock, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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

const EXTRACTION_LABELS: Record<string, { label: string; icon: string }> = {
  one_line_summary: { label: 'One-Line Summary', icon: '📝' },
  concise_summary: { label: 'Concise Summary', icon: '📋' },
  detailed_clinical_summary: { label: 'Detailed Clinical Summary', icon: '📄' },
  parent_friendly_summary: { label: 'Parent-Friendly Summary', icon: '👨‍👩‍👧' },
  participants: { label: 'Participants', icon: '👥' },
  setting: { label: 'Setting', icon: '📍' },
  reason_for_contact: { label: 'Reason for Contact', icon: '📞' },
  caregiver_concerns: { label: 'Caregiver Concerns', icon: '💬' },
  teacher_concerns: { label: 'Teacher Concerns', icon: '🏫' },
  observed_behaviors: { label: 'Observed Behaviors', icon: '👁️' },
  antecedents: { label: 'Antecedents', icon: '⬅️' },
  consequences: { label: 'Consequences', icon: '➡️' },
  replacement_behaviors_discussed: { label: 'Replacement Behaviors', icon: '🔄' },
  possible_function_clues: { label: 'Possible Function Clues', icon: '🧠' },
  medication_health_mentions: { label: 'Medication / Health', icon: '💊' },
  environmental_variables: { label: 'Environmental Variables', icon: '🌍' },
  barriers_to_treatment: { label: 'Barriers to Treatment', icon: '🚧' },
  safety_concerns: { label: 'Safety Concerns', icon: '⚠️' },
  follow_up_steps: { label: 'Follow-Up Steps', icon: '📋' },
  action_items: { label: 'Action Items', icon: '✅' },
  missing_information: { label: 'Missing Information', icon: '❓' },
  risk_flags: { label: 'Risk Flags', icon: '🔴' },
};

const DRAFT_TYPE_LABELS: Record<string, string> = {
  narrative_note: 'Narrative Note',
  session_note: 'Session Note',
  soap_note: 'SOAP Note',
  supervision_note: 'Supervision Note',
  parent_training_note: 'Parent Training Note',
  teacher_consult_note: 'Teacher Consult Note',
  fba_parent_interview_paragraph: 'FBA Parent Interview Paragraph',
  fba_observation_paragraph: 'FBA Observation Paragraph',
  team_meeting_summary: 'Team Meeting Summary',
  crisis_debrief_note: 'Crisis Debrief Note',
  private_note: 'Private Note',
  clinical_summary: 'Clinical Summary',
};

export function RecordingReviewWorkspace({ recordingId, onBack }: RecordingReviewWorkspaceProps) {
  const [recording, setRecording] = useState<any>(null);
  const [transcript, setTranscript] = useState<any>(null);
  const [segments, setSegments] = useState<any[]>([]);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [extractions, setExtractions] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('transcript');
  const [processing, setProcessing] = useState(false);
  const [transcriptView, setTranscriptView] = useState<'full' | 'speakers' | 'timestamps'>('full');
  const [transformingDraft, setTransformingDraft] = useState<string | null>(null);

  // AI Q&A state
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswers, setAiAnswers] = useState<Array<{ question: string; answer: string; loading?: boolean }>>([]);
  const [askingAi, setAskingAi] = useState(false);

  const loadRecordingData = useCallback(async () => {
    setLoading(true);
    const [recRes, transRes, draftsRes, extRes, tasksRes, auditRes] = await Promise.all([
      supabase.from('voice_recordings' as any).select('*').eq('id', recordingId).single(),
      supabase.from('voice_transcripts' as any).select('*').eq('recording_id', recordingId).order('version_number', { ascending: false }).limit(1),
      supabase.from('voice_ai_drafts' as any).select('*').eq('recording_id', recordingId).order('created_at', { ascending: true }),
      supabase.from('voice_ai_extractions' as any).select('*').eq('recording_id', recordingId),
      supabase.from('voice_tasks' as any).select('*').eq('recording_id', recordingId),
      supabase.from('voice_audit_log' as any).select('*').eq('recording_id', recordingId).order('created_at', { ascending: true }),
    ]);

    if (recRes.data) setRecording(recRes.data);
    if (transRes.data?.[0]) {
      setTranscript(transRes.data[0]);
      const { data: segs } = await supabase
        .from('voice_transcript_segments' as any)
        .select('*')
        .eq('transcript_id', (transRes.data[0] as any).id)
        .order('segment_index', { ascending: true });
      if (segs) setSegments(segs);
    }
    if (draftsRes.data) setDrafts(draftsRes.data);
    if (extRes.data) setExtractions(extRes.data);
    if (tasksRes.data) setTasks(tasksRes.data);
    if (auditRes.data) setAuditLog(auditRes.data);
    setLoading(false);
  }, [recordingId]);

  useEffect(() => {
    loadRecordingData();
  }, [loadRecordingData]);

  // Polling while processing
  useEffect(() => {
    if (recording?.status === 'processing') {
      const interval = setInterval(loadRecordingData, 4000);
      return () => clearInterval(interval);
    }
  }, [recording?.status, loadRecordingData]);

  const handleProcessTranscript = async () => {
    setProcessing(true);
    try {
      const { error } = await supabase.functions.invoke('voice-capture-process', {
        body: { recording_id: recordingId, action: 'transcribe_and_extract' },
      });
      if (error) throw error;
      toast.success('Processing started — results will appear automatically');
      setTimeout(() => loadRecordingData(), 3000);
    } catch (err: any) {
      toast.error('Processing failed: ' + (err?.message || 'Unknown error'));
    } finally {
      setProcessing(false);
    }
  };

  // ── Ask AI (wired to edge function) ──
  const handleAskAI = async () => {
    if (!aiQuestion.trim() || !transcript?.full_text) return;
    const q = aiQuestion.trim();
    setAiQuestion('');
    setAiAnswers(prev => [...prev, { question: q, answer: '', loading: true }]);
    setAskingAi(true);

    try {
      const { data, error } = await supabase.functions.invoke('voice-capture-process', {
        body: { recording_id: recordingId, action: 'ask_ai', question: q },
      });
      if (error) throw error;
      setAiAnswers(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { question: q, answer: data?.answer || 'No response generated.', loading: false };
        return updated;
      });
    } catch {
      setAiAnswers(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { question: q, answer: 'Failed to get AI response. Please try again.', loading: false };
        return updated;
      });
    } finally {
      setAskingAi(false);
    }
  };

  // ── Draft Approval ──
  const handleApproveDraft = async (draftId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('voice_ai_drafts' as any).update({
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      }).eq('id', draftId);
      toast.success('Draft approved');
      loadRecordingData();
    } catch { toast.error('Failed to approve draft'); }
  };

  // ── Draft Transform ──
  const handleTransformDraft = async (draftId: string, transformType: string) => {
    setTransformingDraft(draftId);
    try {
      const { data, error } = await supabase.functions.invoke('voice-capture-process', {
        body: { recording_id: recordingId, action: 'transform_draft', draft_id: draftId, transform_type: transformType },
      });
      if (error) throw error;
      toast.success('Draft transformed');
      loadRecordingData();
    } catch {
      toast.error('Transform failed');
    } finally {
      setTransformingDraft(null);
    }
  };

  // ── Draft Content Save ──
  const handleSaveDraftContent = async (draftId: string, content: string) => {
    await supabase.from('voice_ai_drafts' as any).update({
      content,
      is_user_edited: true,
    }).eq('id', draftId);
    toast.success('Draft saved');
  };

  // ── Extraction Approve/Ignore ──
  const handleExtractionAction = async (extractionId: string, action: 'approve' | 'ignore') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      if (action === 'approve') {
        await supabase.from('voice_ai_extractions' as any).update({
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        }).eq('id', extractionId);
        toast.success('Extraction approved');
      } else {
        // Mark as ignored by setting confidence to 0
        await supabase.from('voice_ai_extractions' as any).update({
          confidence_score: 0,
        }).eq('id', extractionId);
        toast.success('Extraction ignored');
      }
      loadRecordingData();
    } catch { toast.error('Action failed'); }
  };

  // ── Save Actions ──
  const handleSaveAction = async (actionType: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Validate posting rules
      const postingActions = ['save_narrative_draft', 'save_session_draft', 'save_supervision_draft', 'save_fba_draft', 'save_consult_draft'];
      if (postingActions.includes(actionType)) {
        const blockedStatuses = ['offline_buffering', 'upload_degraded', 'transcript_failed_retryable', 'ai_failed_retryable'];
        if (blockedStatuses.includes(recording?.status)) {
          toast.error('Cannot post — recording is still processing or in a degraded state.');
          return;
        }
        if (drafts.length === 0) {
          toast.error('No drafts available to post.');
          return;
        }
        const hasApproved = drafts.some((d: any) => d.approved_at);
        if (!hasApproved) {
          toast.error('Please approve at least one draft before posting to chart.');
          return;
        }
      }

      await supabase.from('voice_save_actions' as any).insert({
        recording_id: recordingId,
        action_type: actionType,
        performed_by: user.id,
      });

      if (actionType === 'save_private') {
        await supabase.from('voice_recordings' as any).update({ status: 'saved_draft' }).eq('id', recordingId);
      }

      await supabase.from('voice_audit_log' as any).insert({
        recording_id: recordingId,
        user_id: user.id,
        action_type: actionType,
      });

      toast.success('Saved successfully');
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

  const isProcessing = recording.status === 'processing';
  const summaryExtractions = extractions.filter((e: any) => e.extraction_type?.includes('summary'));
  const structuredExtractions = extractions.filter((e: any) => !e.extraction_type?.includes('summary') && (e.confidence_score === null || e.confidence_score > 0));

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

  const renderExtractionValue = (ext: any) => {
    const payload = ext.json_payload;
    if (payload?.text) return <p className="text-sm whitespace-pre-wrap">{payload.text}</p>;
    if (payload?.value) return <p className="text-sm">{payload.value}</p>;
    if (payload?.items && Array.isArray(payload.items)) {
      return (
        <ul className="space-y-1">
          {payload.items.map((item: any, i: number) => (
            <li key={i} className="text-sm flex items-start gap-2">
              <span className="text-muted-foreground mt-0.5">•</span>
              <span>{typeof item === 'string' ? item : JSON.stringify(item)}</span>
            </li>
          ))}
        </ul>
      );
    }
    return <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">{JSON.stringify(payload, null, 2)}</pre>;
  };

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
              <Shield className="w-2.5 h-2.5 mr-0.5" />
              {PRIVACY_LABELS[recording.privacy_mode as keyof typeof PRIVACY_LABELS] || recording.privacy_mode}
            </Badge>
            {isProcessing && <Badge variant="default" className="text-[10px] animate-pulse">Processing...</Badge>}
          </h2>
          <p className="text-xs text-muted-foreground">
            {format(new Date(recording.created_at), 'MMMM d, yyyy h:mm a')}
            {recording.duration_seconds && ` · ${Math.floor(recording.duration_seconds / 60)}m ${recording.duration_seconds % 60}s`}
            {' · '}{CONSENT_LABELS[recording.consent_status as keyof typeof CONSENT_LABELS] || recording.consent_status}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(recording.status === 'audio_secured' || recording.status === 'transcript_failed_retryable' || recording.status === 'ai_failed_retryable') && (
            <Button onClick={handleProcessTranscript} disabled={processing} size="sm">
              {processing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Play className="w-4 h-4 mr-1" />}
              Process
            </Button>
          )}
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => loadRecordingData()}>
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Processing Progress */}
      {isProcessing && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-center gap-3 mb-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-sm font-medium">Processing pipeline running...</span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-xs">
              {[
                { label: 'Transcript', done: recording.transcript_status === 'completed', active: recording.transcript_status === 'processing' },
                { label: 'Extraction', done: extractions.length > 0, active: false },
                { label: 'Drafts', done: drafts.length > 0, active: false },
              ].map(step => (
                <div key={step.label} className="flex items-center gap-1.5">
                  {step.done ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> :
                   step.active ? <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" /> :
                   <Clock className="w-3.5 h-3.5 text-muted-foreground" />}
                  {step.label}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="transcript" className="gap-1.5 text-xs"><FileText className="w-3.5 h-3.5" /> Transcript</TabsTrigger>
          <TabsTrigger value="summary" className="gap-1.5 text-xs"><BarChart3 className="w-3.5 h-3.5" /> Summary</TabsTrigger>
          <TabsTrigger value="extract" className="gap-1.5 text-xs"><Brain className="w-3.5 h-3.5" /> ABA Extract</TabsTrigger>
          <TabsTrigger value="drafts" className="gap-1.5 text-xs">
            <PenTool className="w-3.5 h-3.5" /> Drafts
            {drafts.length > 0 && <Badge variant="secondary" className="text-[9px] ml-1 h-4 min-w-4 px-1">{drafts.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="ask-ai" className="gap-1.5 text-xs"><MessageSquare className="w-3.5 h-3.5" /> Ask AI</TabsTrigger>
          <TabsTrigger value="save" className="gap-1.5 text-xs"><Save className="w-3.5 h-3.5" /> Save / Post</TabsTrigger>
          <TabsTrigger value="audit" className="gap-1.5 text-xs"><ClipboardList className="w-3.5 h-3.5" /> Audit</TabsTrigger>
        </TabsList>

        {/* ── Transcript Tab ── */}
        <TabsContent value="transcript" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Transcript</CardTitle>
                {transcript && (
                  <div className="flex gap-1">
                    {(['full', 'speakers', 'timestamps'] as const).map(view => (
                      <Button key={view} variant={transcriptView === view ? 'default' : 'outline'} size="sm" className="text-xs h-7" onClick={() => setTranscriptView(view)}>
                        {view === 'full' ? 'Full' : view === 'speakers' ? 'Speakers' : 'Timestamps'}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
              {transcript && <CardDescription className="text-xs">{transcript.speaker_count} speaker(s) · Model: {transcript.created_by_model}</CardDescription>}
            </CardHeader>
            <CardContent>
              {transcript?.full_text ? (
                transcriptView === 'full' ? (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{transcript.full_text}</p>
                ) : transcriptView === 'speakers' && segments.length > 0 ? (
                  <div className="space-y-3">
                    {segments.map((seg: any, i: number) => (
                      <div key={seg.id || i} className="flex gap-3">
                        <Badge variant="outline" className="shrink-0 h-5 text-[10px]">
                          {seg.speaker_id ? `Speaker ${seg.segment_index + 1}` : `Seg ${seg.segment_index + 1}`}
                        </Badge>
                        <p className="text-sm">{seg.text}</p>
                      </div>
                    ))}
                  </div>
                ) : transcriptView === 'timestamps' && segments.length > 0 ? (
                  <div className="space-y-2">
                    {segments.map((seg: any, i: number) => (
                      <div key={seg.id || i} className="flex gap-3">
                        <span className="text-xs text-muted-foreground font-mono shrink-0 w-16">
                          {seg.start_ms != null ? `${Math.floor(seg.start_ms / 60000)}:${String(Math.floor((seg.start_ms % 60000) / 1000)).padStart(2, '0')}` : '--:--'}
                        </span>
                        <p className="text-sm">{seg.text}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap text-sm">{transcript.full_text}</p>
                )
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {recording.status === 'audio_secured' ? 'Audio secured. Click "Process" to generate transcript.'
                      : isProcessing ? 'Transcript is being generated...'
                      : 'No transcript available yet.'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Summary Tab ── */}
        <TabsContent value="summary" className="mt-4">
          <div className="grid gap-3">
            {summaryExtractions.length > 0 ? summaryExtractions.map((ext: any) => {
              const meta = EXTRACTION_LABELS[ext.extraction_type] || { label: ext.extraction_type, icon: '📝' };
              return (
                <Card key={ext.id}>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">{meta.icon} {meta.label}</CardTitle></CardHeader>
                  <CardContent>{renderExtractionValue(ext)}</CardContent>
                </Card>
              );
            }) : (
              <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">
                {isProcessing ? 'Summaries are being generated...' : 'Summaries will appear after processing.'}
              </CardContent></Card>
            )}
            {tasks.length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">✅ Action Items</CardTitle></CardHeader>
                <CardContent>
                  <ul className="space-y-1.5">
                    {tasks.map((t: any) => (
                      <li key={t.id} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 text-muted-foreground shrink-0" />
                        <span>{t.task_text}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ── ABA Extract Tab ── */}
        <TabsContent value="extract" className="mt-4">
          <div className="grid gap-3">
            {structuredExtractions.length > 0 ? structuredExtractions.map((ext: any) => {
              const meta = EXTRACTION_LABELS[ext.extraction_type] || { label: ext.extraction_type, icon: '📊' };
              const isRisk = ext.extraction_type === 'safety_concerns' || ext.extraction_type === 'risk_flags';
              const isApproved = !!ext.approved_at;
              return (
                <Card key={ext.id} className={isRisk ? 'border-destructive/30 bg-destructive/5' : isApproved ? 'border-green-500/30 bg-green-500/5' : ''}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-1.5">
                        <span>{meta.icon}</span> {meta.label}
                        {isRisk && <AlertTriangle className="w-3.5 h-3.5 text-destructive" />}
                        {isApproved && <Badge className="text-[10px] bg-green-500">Approved</Badge>}
                      </CardTitle>
                      {ext.confidence_score != null && ext.confidence_score > 0 && (
                        <Badge variant="outline" className="text-[10px]">{Math.round(ext.confidence_score * 100)}%</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {renderExtractionValue(ext)}
                    {!isApproved && (
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleExtractionAction(ext.id, 'approve')}>
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Approve
                        </Button>
                        <Button size="sm" variant="ghost" className="text-xs h-7 text-muted-foreground" onClick={() => handleExtractionAction(ext.id, 'ignore')}>
                          Ignore
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            }) : (
              <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">
                {isProcessing ? 'ABA extractions are being generated...' : 'ABA-specific extractions will appear after processing.'}
              </CardContent></Card>
            )}
          </div>
        </TabsContent>

        {/* ── Drafts Tab ── */}
        <TabsContent value="drafts" className="mt-4">
          <div className="grid gap-3">
            {drafts.length > 0 ? drafts.map((draft: any) => {
              const isTransforming = transformingDraft === draft.id;
              return (
                <Card key={draft.id} className={draft.approved_at ? 'border-green-500/30' : ''}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">{DRAFT_TYPE_LABELS[draft.draft_type] || draft.draft_type?.replace(/_/g, ' ')}</CardTitle>
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className="text-[10px]">{draft.tone}</Badge>
                        <Badge variant="outline" className="text-[10px]">{draft.output_language}</Badge>
                        {draft.approved_at && <Badge className="text-[10px] bg-green-500">Approved</Badge>}
                      </div>
                    </div>
                    <CardDescription className="text-xs">
                      Model: {draft.model_name} · {draft.is_user_edited ? 'Edited' : 'AI Generated'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      defaultValue={draft.content || ''}
                      className="min-h-[150px] text-sm leading-relaxed"
                      onBlur={(e) => {
                        if (e.target.value !== draft.content) {
                          handleSaveDraftContent(draft.id, e.target.value);
                        }
                      }}
                    />
                    <div className="flex gap-2 mt-3 flex-wrap">
                      {[
                        { key: 'shorter', label: 'Shorter' },
                        { key: 'more_objective', label: 'More Objective' },
                        { key: 'school_safe', label: 'School-Safe' },
                        { key: 'parent_friendly', label: 'Parent-Friendly' },
                        { key: 'translate_spanish', label: 'Translate to Spanish' },
                      ].map(tf => (
                        <Button
                          key={tf.key}
                          size="sm"
                          variant="outline"
                          className="text-xs h-7"
                          disabled={isTransforming}
                          onClick={() => handleTransformDraft(draft.id, tf.key)}
                        >
                          {isTransforming ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                          {tf.label}
                        </Button>
                      ))}
                    </div>
                    {!draft.approved_at && (
                      <div className="mt-3 pt-3 border-t">
                        <Button size="sm" onClick={() => handleApproveDraft(draft.id)} className="text-xs">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve Draft
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            }) : (
              <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">
                {isProcessing ? 'Draft notes are being generated...' : 'Draft notes will appear after processing.'}
              </CardContent></Card>
            )}
          </div>
        </TabsContent>

        {/* ── Ask AI Tab ── */}
        <TabsContent value="ask-ai" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Ask AI about this recording</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_PROMPTS.map((prompt, i) => (
                  <Button key={i} variant="outline" size="sm" className="text-xs h-7" onClick={() => setAiQuestion(prompt)} disabled={!transcript?.full_text}>
                    {prompt}
                  </Button>
                ))}
              </div>
              <Separator />
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {aiAnswers.map((qa, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="text-sm font-medium text-primary">Q: {qa.question}</div>
                    {qa.loading ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted p-3 rounded">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Thinking...
                      </div>
                    ) : (
                      <div className="text-sm bg-muted p-3 rounded whitespace-pre-wrap">{qa.answer}</div>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Textarea
                  value={aiQuestion}
                  onChange={(e) => setAiQuestion(e.target.value)}
                  placeholder={transcript?.full_text ? 'Ask a question about this recording...' : 'Process the recording first to enable AI Q&A'}
                  className="min-h-[60px] text-sm"
                  disabled={!transcript?.full_text}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAskAI(); } }}
                />
                <Button onClick={handleAskAI} disabled={!aiQuestion.trim() || !transcript?.full_text || askingAi} className="self-end">
                  {askingAi ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ask'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Save / Post Tab ── */}
        <TabsContent value="save" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Save & Post Actions</CardTitle>
              <CardDescription className="text-xs">Nothing posts to the chart automatically. All outputs require explicit approval.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-2">Private Saves</h3>
                <Button variant="outline" className="justify-start text-sm h-9" onClick={() => handleSaveAction('save_private')}>
                  <Save className="w-4 h-4 mr-2" /> Save Everything Privately
                </Button>
                <Separator className="my-2" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Chart Draft Saves</h3>
                <p className="text-xs text-muted-foreground mb-1">Requires at least one approved draft before posting.</p>
                {[
                  { action: 'save_narrative_draft', label: 'Save as Narrative Note Draft' },
                  { action: 'save_session_draft', label: 'Save as Session Note Draft' },
                  { action: 'save_supervision_draft', label: 'Save as Supervision Draft' },
                  { action: 'save_fba_draft', label: 'Save as FBA Draft' },
                  { action: 'save_consult_draft', label: 'Save as Consult Note' },
                ].map(({ action, label }) => (
                  <Button key={action} variant="outline" className="justify-start text-sm h-9" disabled={drafts.length === 0} onClick={() => handleSaveAction(action)}>
                    <PenTool className="w-4 h-4 mr-2" /> {label}
                  </Button>
                ))}
                <Separator className="my-2" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Other</h3>
                <Button variant="outline" className="justify-start text-sm h-9" disabled={tasks.length === 0} onClick={() => handleSaveAction('save_tasks')}>
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Save Tasks ({tasks.length})
                </Button>
                <Button variant="outline" className="justify-start text-sm h-9" disabled onClick={() => handleSaveAction('propose_profile_updates')}>
                  <AlertTriangle className="w-4 h-4 mr-2" /> Propose Profile Updates
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Audit Tab ── */}
        <TabsContent value="audit" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Audit Trail</CardTitle></CardHeader>
            <CardContent>
              {auditLog.length > 0 ? (
                <div className="space-y-1.5">
                  {auditLog.map((entry: any) => (
                    <div key={entry.id} className="flex items-center gap-3 text-sm py-2 border-b last:border-0">
                      <span className="text-xs text-muted-foreground font-mono w-36 shrink-0">
                        {format(new Date(entry.created_at), 'MMM d h:mm:ss a')}
                      </span>
                      <Badge variant="outline" className="text-[10px] shrink-0">{entry.action_type?.replace(/_/g, ' ')}</Badge>
                      {entry.metadata_json && Object.keys(entry.metadata_json).length > 0 && (
                        <span className="text-xs text-muted-foreground truncate">
                          {Object.entries(entry.metadata_json).map(([k, v]) => `${k}: ${v}`).join(', ')}
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
