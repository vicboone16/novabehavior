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

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/nova-ai-chat`;

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

// Built-in quick prompts for new capabilities (shown alongside DB prompts)
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

  const { executeAction, logToAudit } = useNovaAIActions(selectedClientId);

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

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Msg = { role: 'user', content: text.trim() };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput('');
    lastUserInputRef.current = text.trim();
    setIsLoading(true);

    let assistantContent = '';

    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: allMessages.map(m => ({ role: m.role, content: m.content })),
          evidence_mode: evidenceMode,
          client_id: selectedClientId,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        if (resp.status === 429) toast.error('Rate limit exceeded. Please wait and try again.');
        else if (resp.status === 402) toast.error('AI credits depleted. Add credits in workspace settings.');
        else toast.error(err.error || 'AI service error');
        setIsLoading(false);
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
              // Show content without action markers while streaming
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
    } catch (e) {
      console.error('Chat error:', e);
      toast.error('Failed to get AI response');
    } finally {
      setIsLoading(false);
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
                <div className={`max-w-[85%] ${msg.role === 'user' ? '' : ''}`}>
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
                  {/* Action buttons for assistant messages */}
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
                disabled={!input.trim() || isLoading}
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
    </div>
  );
}
