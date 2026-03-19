import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  BrainCircuit, Send, Loader2, BookOpen, Lightbulb, Users, 
  GraduationCap, Search, Target, HelpCircle, PenTool, Sparkles,
  ClipboardList, Database, MessageSquare, FileText, RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { NovaAIClientSelector } from '@/components/nova-ai/NovaAIClientSelector';
import { NovaAIActionButtons, type NovaAction } from '@/components/nova-ai/NovaAIActionButtons';
import { NovaAIConfirmDialog } from '@/components/nova-ai/NovaAIConfirmDialog';
import { NovaAIReviewPanel } from '@/components/nova-ai/NovaAIReviewPanel';
import { useNovaAIActions } from '@/hooks/useNovaAIActions';
import { novaAIFetch } from '@/lib/novaAIFetch';
import {
  classifyMode,
  itemsNeedReview,
  itemsNeedSession,
  buildCompletionSummary,
  buildChatSummary,
  verifyNovaActionComplete,
  inputLikelyContainsData,
  type PipelineResult,
  type PipelineStepResult,
} from '@/lib/novaAIPipelineExecutor';

const ICON_MAP: Record<string, React.ReactNode> = {
  'Ask a Behavior Question': <HelpCircle className="w-3.5 h-3.5" />,
  'Suggest Interventions': <Lightbulb className="w-3.5 h-3.5" />,
  'Classroom Support Ideas': <Users className="w-3.5 h-3.5" />,
  'Parent Training Guidance': <GraduationCap className="w-3.5 h-3.5" />,
  'Find Research': <Search className="w-3.5 h-3.5" />,
  'Write a Measurable Goal': <Target className="w-3.5 h-3.5" />,
  'Explain an ABA Concept': <BookOpen className="w-3.5 h-3.5" />,
  'Help Write Clinical Language': <PenTool className="w-3.5 h-3.5" />,
  'Write SOAP Note': <ClipboardList className="w-3.5 h-3.5" />,
  'Log Session Data': <Database className="w-3.5 h-3.5" />,
  'Write Caregiver Note': <MessageSquare className="w-3.5 h-3.5" />,
  'Parse Old Notes': <FileText className="w-3.5 h-3.5" />,
  'Reconstruct Session': <RotateCcw className="w-3.5 h-3.5" />,
};

const BUILT_IN_PROMPTS = [
  { id: 'builtin-soap', title: 'Write SOAP Note', prompt: 'Write a SOAP note for today\'s session. I\'ll provide the details:', category: 'clinical' },
  { id: 'builtin-data', title: 'Log Session Data', prompt: 'I need to log session data. Here\'s what happened:', category: 'data' },
  { id: 'builtin-caregiver', title: 'Write Caregiver Note', prompt: 'Write a caregiver communication note based on this update:', category: 'clinical' },
  { id: 'builtin-parse', title: 'Parse Old Notes', prompt: 'Parse the following old session notes into structured data:', category: 'data' },
  { id: 'builtin-reconstruct', title: 'Reconstruct Session', prompt: 'Reconstruct this entire session from the following narrative. Extract all behaviors, skills, ABC events, and generate appropriate notes:', category: 'data' },
];

interface Msg {
  role: 'user' | 'assistant';
  content: string;
  actions?: NovaAction[];
}

interface QuickPrompt {
  id: string;
  title: string | null;
  prompt: string | null;
  category: string | null;
}

// Parse <!--NOVA_ACTION:...--> markers from AI response
function parseNovaActions(content: string): { cleanContent: string; actions: NovaAction[] } {
  const actions: NovaAction[] = [];
  const regex = /<!--NOVA_ACTION:(.*?)-->/gs;
  let match;
  while ((match = regex.exec(content)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      actions.push({ type: parsed.type, data: parsed.data });
    } catch { /* skip malformed markers */ }
  }
  const cleanContent = content.replace(regex, '').trim();
  return { cleanContent, actions };
}

export default function AskNovaAI() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [evidenceMode, setEvidenceMode] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [quickPrompts, setQuickPrompts] = useState<QuickPrompt[]>([]);
  const [confirmAction, setConfirmAction] = useState<{ action: NovaAction; destination: string } | null>(null);
  const [reviewAction, setReviewAction] = useState<NovaAction | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastUserInputRef = useRef('');
  // In-flight send lock to prevent duplicate messages
  const sendLockRef = useRef(false);

  const { executeAction, logToAudit, updateRequestStatus } = useNovaAIActions(selectedClientId);

  useEffect(() => {
    const load = async () => {
      const { data } = await (supabase as any)
        .from('ai_quick_prompts')
        .select('*')
        .order('created_at', { ascending: true });
      if (data) setQuickPrompts(data);
    };
    load();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const allQuickPrompts = [...quickPrompts, ...BUILT_IN_PROMPTS];

  /**
   * Auto-execute the structured data pipeline after actions are parsed.
   * This is the core of the Smart Data Engine — it runs automatically
   * instead of waiting for user to click action buttons.
   */
  const autoExecutePipeline = useCallback(async (
    actions: NovaAction[],
    rawInput: string
  ) => {
    const mode = classifyMode(actions);
    if (mode === 'assistant') return; // No pipeline needed

    const steps: PipelineStepResult[] = [];
    const errors: string[] = [];
    let needsReview = false;
    let needsSession = false;

    for (const action of actions) {
      try {
        if (action.type === 'extract_structured_data') {
          const behaviors = action.data?.behaviors || [];
          if (!behaviors.length) continue;

          // Check if items need review
          if (itemsNeedReview(action)) {
            needsReview = true;
            steps.push({ step: 'review_check', success: true, detail: `${behaviors.length} item(s) parsed, some need review` });

            // Auto-open review panel
            setReviewAction(action);
            
            // Also auto-execute staging via executeAction so items are persisted
            // even while review panel is open
            try {
              await executeAction(action, 'session_data', rawInput);
              steps.push({ step: 'staging', success: true, detail: 'Items staged for review' });
            } catch (err: any) {
              steps.push({ step: 'staging', success: false, detail: err.message });
              errors.push(`Staging failed: ${err.message}`);
            }
            continue;
          }

          // Check if items need a session
          if (itemsNeedSession(action)) {
            needsSession = true;
            steps.push({ step: 'session_check', success: true, detail: 'Items staged — session required' });
            
            // Execute action which will handle pending_session path
            try {
              await executeAction(action, 'session_data', rawInput);
              steps.push({ step: 'staging', success: true, detail: 'Items staged as pending_session' });
            } catch (err: any) {
              steps.push({ step: 'staging', success: false, detail: err.message });
              errors.push(`Staging failed: ${err.message}`);
            }
            continue;
          }

          // All items are clean — auto-route to clinical tables
          try {
            const success = await executeAction(action, 'session_data', rawInput);
            if (success) {
              steps.push({ step: 'clinical_routing', success: true, detail: `${behaviors.length} item(s) saved to clinical tables` });
              steps.push({ step: 'graph_queue', success: true, detail: 'Graph updates queued' });
              steps.push({ step: 'timeline', success: true, detail: 'Timeline entry created' });
            } else {
              steps.push({ step: 'clinical_routing', success: false, detail: 'Save returned false' });
              errors.push('Clinical routing did not complete');
            }
          } catch (err: any) {
            steps.push({ step: 'clinical_routing', success: false, detail: err.message });
            errors.push(`Save failed: ${err.message}`);
          }
        } else if (
          action.type === 'generate_soap_note' ||
          action.type === 'generate_narrative_note' ||
          action.type === 'generate_caregiver_note'
        ) {
          // Auto-execute note generation — save as draft
          const destination = action.type === 'generate_soap_note' ? 'session_notes'
            : action.type === 'generate_narrative_note' ? 'narrative_notes'
            : 'caregiver_notes';
          
          try {
            const success = await executeAction(action, destination, rawInput);
            if (success) {
              steps.push({ step: 'note_save', success: true, detail: `${action.type.replace('generate_', '').replace(/_/g, ' ')} saved as draft` });
            } else {
              steps.push({ step: 'note_save', success: false, detail: 'Note save failed' });
              errors.push('Note save did not complete');
            }
          } catch (err: any) {
            steps.push({ step: 'note_save', success: false, detail: err.message });
            errors.push(`Note save failed: ${err.message}`);
          }
        }
        // request_clarification actions are NOT auto-executed — they show buttons
      } catch (err: any) {
        console.error('[NovaAI Pipeline] Action execution error:', err);
        errors.push(`Action ${action.type} failed: ${err.message}`);
      }
    }

    // Build pipeline result
    const result: PipelineResult = {
      completed: errors.length === 0,
      mode,
      steps,
      summary: '',
      needsReview,
      needsSession,
      errors,
    };
    result.summary = buildCompletionSummary(result);

    // Verify completion
    const expectedSteps: string[] = [];
    if (mode === 'structured_data' || mode === 'mixed') {
      if (needsReview) {
        expectedSteps.push('review_check');
      } else if (needsSession) {
        expectedSteps.push('session_check', 'staging');
      } else {
        expectedSteps.push('clinical_routing');
      }
    }
    if (mode === 'note_generation' || mode === 'mixed') {
      expectedSteps.push('note_save');
    }

    const failedSteps = verifyNovaActionComplete(result, expectedSteps);

    if (failedSteps.length > 0 && !needsReview && !needsSession) {
      console.error('[NovaAI Pipeline] Failed steps:', failedSteps);
      toast.error(`Pipeline incomplete: ${failedSteps.join(', ')} did not complete`);
    } else if (needsSession) {
      toast.warning('Parsed items staged — select a session to complete saving.', { duration: 6000 });
    } else if (needsReview) {
      toast.info('Nova AI parsed your data — some items need review.', { duration: 5000 });
    } else if (result.completed) {
      // Show success toast only when truly complete
      const savedCount = steps.filter(s => s.step === 'clinical_routing' && s.success)
        .reduce((n, s) => n + (parseInt(s.detail) || 1), 0);
      if (savedCount > 0) {
        toast.success(`Pipeline complete — data saved to clinical tables`);
      }
    }

    // Append pipeline summary as a follow-up assistant message in the chat
    const chatSummary = buildChatSummary(result);
    if (chatSummary) {
      setMessages(prev => [...prev, { role: 'assistant', content: chatSummary }]);
    }

    // Log pipeline result
    console.log('[NovaAI Pipeline] Result:', {
      mode: result.mode,
      completed: result.completed,
      steps: result.steps.map(s => `${s.step}: ${s.success ? '✓' : '✗'} ${s.detail}`),
      errors: result.errors,
    });
  }, [executeAction]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading || sendLockRef.current) return;

    // Acquire send lock
    sendLockRef.current = true;

    const userMsg: Msg = { role: 'user', content: text.trim() };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput('');
    lastUserInputRef.current = text.trim();
    setIsLoading(true);

    let assistantContent = '';

    try {
      const resp = await novaAIFetch({
        body: {
          messages: allMessages.map(m => ({ role: m.role, content: m.content })),
          evidence_mode: evidenceMode,
          client_id: selectedClientId,
        },
      });

      if (!resp) {
        setIsLoading(false);
        sendLockRef.current = false;
        return;
      }

      if (!resp.body) throw new Error('No response body');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const updateAssistant = (content: string) => {
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant') {
            return prev.map((m, i) => i === prev.length - 1 ? { ...m, content } : m);
          }
          return [...prev, { role: 'assistant', content }];
        });
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              assistantContent += delta;
              const { cleanContent } = parseNovaActions(assistantContent);
              updateAssistant(cleanContent);
            }
          } catch {
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }

      // Flush remaining
      if (buffer.trim()) {
        for (let raw of buffer.split('\n')) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              assistantContent += delta;
            }
          } catch { /* ignore */ }
        }
      }

      // Parse actions from final content
      const { cleanContent, actions } = parseNovaActions(assistantContent);

      // Update final message with actions
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant') {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: cleanContent, actions } : m);
        }
        return [...prev, { role: 'assistant', content: cleanContent, actions }];
      });

      // Detect intent from actions for logging
      const detectedIntent = actions.length > 0 
        ? actions.map(a => a.type).join(',') 
        : 'general';

      // Log to DB
      if (assistantContent) {
        await logToAudit(
          text.trim(),
          cleanContent,
          detectedIntent,
          actions.map(a => ({ type: a.type })),
          actions.length > 0 ? actions.map(a => a.data) : null
        );
      }

      // ═══════════════════════════════════════════════════════════
      // AUTO-EXECUTE PIPELINE
      // ═══════════════════════════════════════════════════════════
      if (actions.length > 0 && selectedClientId) {
        const executableActions = actions.filter(a => a.type !== 'request_clarification');
        if (executableActions.length > 0) {
          await autoExecutePipeline(executableActions, text.trim());
        }
      } else if (actions.length === 0 && selectedClientId && inputLikelyContainsData(text.trim())) {
        // FORCED RETRY: Model returned text-only for data-like input.
        // Retry with force_tools=true to force tool_choice=required on the edge function.
        console.warn('[NovaAI] Model did not use tools for data-like input. Retrying with forced tool_choice...');
        
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: '🔄 Detected clinical data — re-processing with structured extraction...',
        }]);

        try {
          const retryResp = await novaAIFetch({
            body: {
              messages: allMessages.map(m => ({ role: m.role, content: m.content })),
              evidence_mode: evidenceMode,
              client_id: selectedClientId,
              force_tools: true,
            },
          });

          if (retryResp?.body) {
            let retryContent = '';
            const retryReader = retryResp.body.getReader();
            const retryDecoder = new TextDecoder();
            let retryBuffer = '';

            while (true) {
              const { done, value } = await retryReader.read();
              if (done) break;
              retryBuffer += retryDecoder.decode(value, { stream: true });

              let idx: number;
              while ((idx = retryBuffer.indexOf('\n')) !== -1) {
                let rLine = retryBuffer.slice(0, idx);
                retryBuffer = retryBuffer.slice(idx + 1);
                if (rLine.endsWith('\r')) rLine = rLine.slice(0, -1);
                if (rLine.startsWith(':') || rLine.trim() === '') continue;
                if (!rLine.startsWith('data: ')) continue;
                const rJson = rLine.slice(6).trim();
                if (rJson === '[DONE]') break;
                try {
                  const rParsed = JSON.parse(rJson);
                  const rDelta = rParsed.choices?.[0]?.delta?.content;
                  if (rDelta) retryContent += rDelta;
                } catch { retryBuffer = rLine + '\n' + retryBuffer; break; }
              }
            }

            const { actions: retryActions } = parseNovaActions(retryContent);
            if (retryActions.length > 0) {
              const execRetry = retryActions.filter(a => a.type !== 'request_clarification');
              if (execRetry.length > 0) {
                setMessages(prev => prev.filter(m => m.content !== '🔄 Detected clinical data — re-processing with structured extraction...'));
                await autoExecutePipeline(execRetry, text.trim());
              }
            } else {
              setMessages(prev => prev.map(m => 
                m.content === '🔄 Detected clinical data — re-processing with structured extraction...'
                  ? { ...m, content: '⚠️ I detected clinical data but couldn\'t extract it automatically. Try rephrasing with specific numbers (e.g., "aggression 3 times, manding 8/10 trials") or use the **Log Session Data** quick prompt.' }
                  : m
              ));
            }
          }
        } catch (retryErr) {
          console.error('[NovaAI] Forced retry failed:', retryErr);
          setMessages(prev => prev.map(m => 
            m.content === '🔄 Detected clinical data — re-processing with structured extraction...'
              ? { ...m, content: '⚠️ I detected clinical data but couldn\'t extract it automatically. Try rephrasing with specific numbers or use the **Log Session Data** quick prompt.' }
              : m
          ));
        }
      }
    } catch (e) {
      console.error('Chat error:', e);
      toast.error('Failed to get AI response');
    } finally {
      setIsLoading(false);
      sendLockRef.current = false;
    }
  };

  const handleQuickPrompt = (prompt: QuickPrompt) => {
    if (prompt.prompt) {
      setInput(prompt.prompt);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleAction = (action: NovaAction, destination: string) => {
    // Clarification responses get sent as messages
    if (destination.startsWith('clarify:')) {
      const answer = destination.split(':').slice(2).join(':');
      sendMessage(answer);
      return;
    }
    // Review destination opens the full review panel
    if (destination === 'review') {
      setReviewAction(action);
      return;
    }
    // Show confirmation dialog for other destinations
    setConfirmAction({ action, destination });
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    const success = await executeAction(confirmAction.action, confirmAction.destination, lastUserInputRef.current);
    if (success) {
      setConfirmAction(null);
    }
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <BrainCircuit className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Ask Nova AI</h1>
            <p className="text-sm text-muted-foreground">
              Clinical Copilot & Smart Data Engine
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <NovaAIClientSelector
            selectedClientId={selectedClientId}
            onClientChange={setSelectedClientId}
          />
          <div className="flex items-center gap-2">
            <Switch
              id="evidence-mode"
              checked={evidenceMode}
              onCheckedChange={setEvidenceMode}
            />
            <Label htmlFor="evidence-mode" className="text-sm font-medium flex items-center gap-1.5 cursor-pointer">
              <BookOpen className="w-3.5 h-3.5" />
              Evidence Mode
            </Label>
            {evidenceMode && (
              <Badge variant="default" className="text-[10px]">ON</Badge>
            )}
          </div>
        </div>
      </div>

      {/* Quick Prompts */}
      {messages.length === 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {allQuickPrompts.map((qp) => (
            <Button
              key={qp.id}
              variant="outline"
              className="h-auto py-3 px-3 flex flex-col items-start gap-1.5 text-left hover:bg-primary/5 hover:border-primary/30 transition-colors"
              onClick={() => handleQuickPrompt(qp)}
            >
              <span className="text-primary">
                {ICON_MAP[qp.title || ''] || <Sparkles className="w-3.5 h-3.5" />}
              </span>
              <span className="text-xs font-medium leading-tight">{qp.title}</span>
            </Button>
          ))}
        </div>
      )}

      {/* Chat Window */}
      <Card className="border-border/60">
        <CardContent className="p-0">
          <div
            ref={scrollRef}
            className="h-[500px] overflow-y-auto p-4 space-y-4"
          >
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <BrainCircuit className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-sm font-medium">Ask me anything about behavior science</p>
                <p className="text-xs">
                  {selectedClientId 
                    ? 'Case-aware mode active — I can write notes, log data, and analyze this client'
                    : 'Select a client above to enable smart data logging and note writing'}
                </p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[85%]`}>
                  <div
                    className={`rounded-xl px-4 py-3 ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted/70 text-foreground'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none [&>h2]:text-sm [&>h2]:font-semibold [&>h2]:mt-3 [&>h2]:mb-1 [&>ul]:text-sm [&>p]:text-sm [&>ol]:text-sm">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                  {/* Action buttons for assistant messages — still shown as manual fallback */}
                  {msg.role === 'assistant' && msg.actions && msg.actions.length > 0 && (
                    <NovaAIActionButtons
                      actions={msg.actions}
                      onAction={handleAction}
                      disabled={isLoading}
                    />
                  )}
                </div>
              </div>
            ))}

            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex justify-start">
                <div className="bg-muted/70 rounded-xl px-4 py-3">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-border p-3">
            <div className="flex gap-2">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={selectedClientId 
                  ? "Ask a question, paste session notes, or describe what happened..."
                  : "Ask a behavior science question..."
                }
                className="resize-none min-h-[44px] max-h-32"
                rows={1}
              />
              <Button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isLoading || sendLockRef.current}
                size="icon"
                className="shrink-0 h-11 w-11"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5">
              Nova AI provides guidance based on ABA principles. Always consult qualified professionals for clinical decisions.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <NovaAIConfirmDialog
        open={!!confirmAction}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        action={confirmAction?.action || null}
        destination={confirmAction?.destination || ''}
        onConfirm={handleConfirmAction}
      />

      {/* Item-Level Review Panel */}
      <NovaAIReviewPanel
        open={!!reviewAction}
        onOpenChange={(open) => { if (!open) setReviewAction(null); }}
        action={reviewAction}
        clientId={selectedClientId}
        onSaveApproved={async (modifiedAction, destination) => {
          return executeAction(modifiedAction, destination, lastUserInputRef.current);
        }}
      />
    </div>
  );
}
