import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Bot, Loader2, Sparkles, CheckCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { INTAKE_AI_EXTRACTION_PROMPT, type IntakeAIExtractionResult } from '@/lib/intakeAIExtractionPrompt';
import { novaAIFetch } from '@/lib/novaAIFetch';

interface Props {
  studentId: string;
  studentName: string;
  onComplete?: (formInstanceId: string) => void;
}

export function AIIntakeSessionLauncher({ studentId, studentName, onComplete }: Props) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [selectedTemplateCode, setSelectedTemplateCode] = useState('');
  const [templates, setTemplates] = useState<{ id: string; name: string; code: string }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<IntakeAIExtractionResult | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [step, setStep] = useState<'input' | 'processing' | 'review'>('input');

  const open = async () => {
    setIsOpen(true);
    setStep('input');
    setResult(null);
    setTranscript('');
    setSelectedTemplateCode('');

    const { data } = await supabase.from('form_templates').select('id, name, code').eq('is_active', true).order('name');
    setTemplates((data || []) as any[]);
  };

  const processTranscript = async () => {
    if (!transcript.trim() || !selectedTemplateCode) return;
    setIsProcessing(true);
    setStep('processing');

    try {
      // 1. Create intake session
      const { data: session, error: sessErr } = await supabase
        .from('intake_sessions')
        .insert({
          linked_entity_type: 'student',
          linked_entity_id: studentId,
          session_type: 'ai_transcript',
          started_by: user?.id,
          status: 'in_progress',
        } as any)
        .select('id')
        .single();
      if (sessErr) throw sessErr;
      setSessionId(session.id);

      // 2. Save transcript
      await supabase.from('intake_transcripts').insert({
        intake_session_id: session.id,
        transcript_text: transcript,
        transcript_json: { raw: transcript },
      } as any);

      // 3. Load template fields for context
      const selectedTemplate = templates.find(t => t.code === selectedTemplateCode);
      const templateId = selectedTemplate?.id;
      const { data: secs } = await supabase
        .from('form_template_sections')
        .select('section_key, title, form_template_fields(field_key, field_label, field_type, options_json)')
        .eq('template_id', templateId!)
        .order('display_order');

      const fieldContext = (secs || []).map((s: any) => ({
        section: s.title,
        fields: (s.form_template_fields || []).map((f: any) => ({
          key: f.field_key,
          label: f.field_label,
          type: f.field_type,
          options: f.options_json,
        })),
      }));

      // 4. Call AI
      const aiResponse = await novaAIFetch({
        body: {
          message: `Student: ${studentName}\n\nForm fields available:\n${JSON.stringify(fieldContext, null, 2)}\n\nTranscript:\n${transcript}`,
          systemPrompt: INTAKE_AI_EXTRACTION_PROMPT,
          mode: 'intake_extraction',
        },
      });

      if (!aiResponse) throw new Error('AI processing failed');
      const responseData = await aiResponse.json();
      const parsed = responseData?.content ? JSON.parse(responseData.content) : responseData;
      setResult(parsed as IntakeAIExtractionResult);

      // 5. Save extraction
      await supabase.from('intake_ai_extractions').insert({
        intake_session_id: session.id,
        extraction_json: parsed,
        confidence_overall: parsed.field_extractions?.length > 0
          ? parsed.field_extractions.reduce((sum: number, f: any) => sum + (f.confidence_score || 0), 0) / parsed.field_extractions.length
          : null,
      } as any);

      // 6. Update session status
      await supabase.from('intake_sessions').update({
        status: 'completed',
        ended_at: new Date().toISOString(),
      } as any).eq('id', session.id);

      setStep('review');
      toast.success('Transcript processed successfully');
    } catch (err: any) {
      console.error('AI extraction failed:', err);
      toast.error('Processing failed: ' + err.message);
      setStep('input');
    } finally {
      setIsProcessing(false);
    }
  };

  const applyToForm = async () => {
    if (!result || !selectedTemplateCode) return;
    setIsProcessing(true);

    try {
      // Create form instance via RPC
      const { data: instanceId, error: instErr } = await supabase.rpc('create_form_instance', {
        p_template_code: selectedTemplateCode,
        p_linked_entity_type: 'student',
        p_linked_entity_id: studentId,
        p_completion_mode: 'ai_prefill',
        p_created_by: user?.id || null,
        p_source_type: 'ai_intake',
      });
      if (instErr) throw instErr;

      // Link to session
      if (sessionId) {
        await supabase.from('intake_sessions').update({ form_instance_id: instanceId } as any).eq('id', sessionId);
      }

      // Bulk save extracted answers via RPC
      const answersArray = result.field_extractions.map(f => ({
        field_key: f.field_key,
        value_raw: f.value_raw,
        repeat_index: 0,
      }));

      if (answersArray.length > 0) {
        await supabase.rpc('save_form_answers_bulk', {
          p_form_instance_id: instanceId as string,
          p_answers: answersArray,
          p_source_type: 'ai_transcript',
          p_ai_generated: true,
          p_manually_edited: false,
        });
      }

      toast.success('AI-prefilled form created. Review and edit as needed.');
      setIsOpen(false);
      onComplete?.(instanceId as string);
    } catch (err: any) {
      toast.error('Failed to create form: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <Button size="sm" variant="outline" onClick={open}>
        <Bot className="h-4 w-4 mr-1" />
        AI Intake Session
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              AI Intake Session — {studentName}
            </DialogTitle>
            <DialogDescription>
              Paste a transcript from a parent interview or intake call. Nova AI will extract structured data and prefill a form.
            </DialogDescription>
          </DialogHeader>

          {step === 'input' && (
            <div className="space-y-4">
              <div>
                <Label>Target Form Template</Label>
                <Select value={selectedTemplateCode} onValueChange={setSelectedTemplateCode}>
                  <SelectTrigger><SelectValue placeholder="Select template to prefill..." /></SelectTrigger>
                  <SelectContent>
                    {templates.map(t => <SelectItem key={t.id} value={t.code}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Transcript</Label>
                <Textarea
                  value={transcript}
                  onChange={e => setTranscript(e.target.value)}
                  placeholder="Paste the intake transcript here..."
                  rows={12}
                  className="font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {transcript.length} characters · {transcript.split(/\s+/).filter(Boolean).length} words
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button onClick={processTranscript} disabled={!transcript.trim() || !selectedTemplateCode}>
                  <Sparkles className="h-4 w-4 mr-1" /> Extract & Prefill
                </Button>
              </DialogFooter>
            </div>
          )}

          {step === 'processing' && (
            <div className="py-12 text-center">
              <Loader2 className="h-10 w-10 mx-auto animate-spin text-primary mb-4" />
              <p className="font-medium">Processing transcript...</p>
              <p className="text-sm text-muted-foreground mt-1">Extracting structured data and mapping to form fields</p>
            </div>
          )}

          {step === 'review' && result && (
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Summary</CardTitle></CardHeader>
                <CardContent className="text-xs space-y-1">
                  <p>{result.summary.short_summary}</p>
                  {result.summary.caregiver_priorities.length > 0 && (
                    <p><strong>Priorities:</strong> {result.summary.caregiver_priorities.join(', ')}</p>
                  )}
                  {result.summary.strengths.length > 0 && (
                    <p><strong>Strengths:</strong> {result.summary.strengths.join(', ')}</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    Fields Extracted
                    <Badge variant="secondary">{result.field_extractions.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {result.field_extractions.map((f, i) => (
                      <div key={i} className="flex items-start justify-between text-xs border-b pb-1">
                        <div>
                          <span className="font-medium">{f.field_key}</span>
                          <span className="text-muted-foreground ml-2">{JSON.stringify(f.value_raw)?.substring(0, 60)}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {f.needs_review && <Badge variant="destructive" className="text-[9px] h-4">Review</Badge>}
                          <Badge variant="outline" className="text-[9px] h-4">
                            {Math.round((f.confidence_score || 0) * 100)}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {result.issues.length > 0 && (
                <Card className="border-destructive/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-destructive">
                      <AlertTriangle className="h-4 w-4" /> Issues ({result.issues.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {result.issues.map((issue, i) => (
                      <div key={i} className="text-xs mb-1">
                        <Badge variant="outline" className="text-[9px] mr-1">{issue.issue_type}</Badge>
                        {issue.description}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {result.missing_information.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Missing Information ({result.missing_information.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {result.missing_information.map((m, i) => (
                      <div key={i} className="text-xs mb-1">
                        <span className="font-medium">{m.field_key}:</span> {m.question_needed}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setStep('input')}>Back to Edit</Button>
                <Button onClick={applyToForm} disabled={isProcessing}>
                  {isProcessing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                  Create Prefilled Form
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
