import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  BrainCircuit, Send, Loader2, BookOpen, Lightbulb, Users,
  GraduationCap, Search, Target, FileText, ClipboardList, Sparkles,
  MessageSquare, Stethoscope, UserSearch
} from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { ClinicalReasoningSection } from '@/components/nova-ai/ClinicalReasoningSection';
import { CaseAwareReasoningSection } from '@/components/nova-ai/CaseAwareReasoningSection';
import { NovaAIOptimizationActions } from '@/components/nova-ai/NovaAIOptimizationActions';
import { novaAIFetch } from '@/lib/novaAIFetch';

const db = supabase as any;

const ICON_MAP: Record<string, React.ReactNode> = {
  'Explain ABA Concept': <BookOpen className="w-3.5 h-3.5" />,
  'Suggest Behavior Interventions': <Lightbulb className="w-3.5 h-3.5" />,
  'Classroom Support Ideas': <Users className="w-3.5 h-3.5" />,
  'Parent Training Guidance': <GraduationCap className="w-3.5 h-3.5" />,
  'Find Research': <Search className="w-3.5 h-3.5" />,
  'Write a Measurable Goal': <Target className="w-3.5 h-3.5" />,
  'Create Behavior Definition': <FileText className="w-3.5 h-3.5" />,
  'Generate FBA Hypothesis': <ClipboardList className="w-3.5 h-3.5" />,
};

interface Msg { role: 'user' | 'assistant'; content: string; }
interface QuickPrompt { id: string; title: string | null; prompt: string | null; category: string | null; }

export default function NovaAI() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('ask');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [evidenceMode, setEvidenceMode] = useState(false);
  const [quickPrompts, setQuickPrompts] = useState<QuickPrompt[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sendLockRef = useRef(false);

  // Handle contextual launch from other pages
  useEffect(() => {
    const prompt = searchParams.get('prompt');
    const clientId = searchParams.get('clientId');
    const context = searchParams.get('context');
    if (clientId) {
      setActiveTab('case');
    } else if (prompt) {
      setInput(prompt);
      textareaRef.current?.focus();
    }
  }, [searchParams]);

  useEffect(() => {
    db.from('nova_ai_quick_prompts').select('*').order('title').then(({ data }: any) => {
      if (data) setQuickPrompts(data);
    });
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const ensureConversation = useCallback(async (firstMessage: string): Promise<string> => {
    if (conversationId) return conversationId;
    const title = firstMessage.slice(0, 80) + (firstMessage.length > 80 ? '...' : '');
    const { data, error } = await db.from('nova_ai_conversations').insert({
      user_id: user?.id, title,
    }).select('id').single();
    if (error) { console.error('Conversation create error:', error); throw error; }
    setConversationId(data.id);
    return data.id;
  }, [conversationId, user]);

  const persistMessage = useCallback(async (convId: string, role: string, message: string, category?: string) => {
    await db.from('nova_ai_messages').insert({
      conversation_id: convId, role, message, category: category || null,
    });
  }, []);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading || sendLockRef.current) return;
    sendLockRef.current = true;
    const userMsg: Msg = { role: 'user', content: text.trim() };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput('');
    setIsLoading(true);
    let assistantContent = '';

    try {
      const convId = await ensureConversation(text.trim());
      await persistMessage(convId, 'user', text.trim());

      const resp = await novaAIFetch({
        body: { messages: allMessages, evidence_mode: evidenceMode },
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
        let idx: number;
        while ((idx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '' || !line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) { assistantContent += delta; updateAssistant(assistantContent); }
          } catch { buffer = line + '\n' + buffer; break; }
        }
      }

      if (buffer.trim()) {
        for (let raw of buffer.split('\n')) {
          if (!raw || raw.startsWith(':') || raw.trim() === '' || !raw.startsWith('data: ')) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const p = JSON.parse(jsonStr);
            const d = p.choices?.[0]?.delta?.content;
            if (d) { assistantContent += d; updateAssistant(assistantContent); }
          } catch { /* ignore */ }
        }
      }

      if (assistantContent) {
        await persistMessage(convId, 'assistant', assistantContent, evidenceMode ? 'evidence' : 'standard');
      }
    } catch (e) {
      console.error('Chat error:', e);
      toast.error('Failed to get AI response');
    } finally {
      setIsLoading(false);
      sendLockRef.current = false;
    }
  };

  const handleQuickPrompt = (qp: QuickPrompt) => {
    if (qp.prompt) { setInput(qp.prompt); textareaRef.current?.focus(); setActiveTab('ask'); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const startNewConversation = () => {
    setMessages([]);
    setConversationId(null);
    setInput('');
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
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Nova AI</h1>
            <p className="text-sm text-muted-foreground">Behavior Science & Clinical Intelligence Assistant</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {activeTab === 'ask' && conversationId && (
            <Button variant="outline" size="sm" onClick={startNewConversation}>New Chat</Button>
          )}
          <div className="flex items-center gap-2">
            <Switch id="evidence-mode" checked={evidenceMode} onCheckedChange={setEvidenceMode} />
            <Label htmlFor="evidence-mode" className="text-sm font-medium flex items-center gap-1.5 cursor-pointer">
              <BookOpen className="w-3.5 h-3.5" /> Evidence Mode
            </Label>
            {evidenceMode && <Badge variant="default" className="text-[10px]">ON</Badge>}
          </div>
        </div>
      </div>

      {/* Section Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-auto gap-1 bg-muted/50 p-1 flex-wrap">
          <TabsTrigger value="ask" className="gap-1.5 text-xs">
            <MessageSquare className="w-3.5 h-3.5" /> Ask Nova AI
          </TabsTrigger>
          <TabsTrigger value="reasoning" className="gap-1.5 text-xs">
            <Stethoscope className="w-3.5 h-3.5" /> Clinical Reasoning
          </TabsTrigger>
          <TabsTrigger value="case" className="gap-1.5 text-xs">
            <UserSearch className="w-3.5 h-3.5" /> Case-Aware Reasoning
          </TabsTrigger>
          <TabsTrigger value="prompts" className="gap-1.5 text-xs">
            <Sparkles className="w-3.5 h-3.5" /> Quick Prompts
          </TabsTrigger>
        </TabsList>

        {/* Ask Nova AI */}
        <TabsContent value="ask" className="space-y-4">
          {messages.length === 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {quickPrompts.slice(0, 8).map((qp) => (
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

          <Card className="border-border/60">
            <CardContent className="p-0">
              <div ref={scrollRef} className="h-[500px] overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <BrainCircuit className="w-12 h-12 mb-3 opacity-20" />
                    <p className="text-sm font-medium">Ask me anything about behavior science</p>
                    <p className="text-xs">ABA, autism, ADHD, PDA, school supports, research, goal writing, and more</p>
                  </div>
                )}

                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-xl px-4 py-3 ${
                      msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted/70 text-foreground'
                    }`}>
                      {msg.role === 'assistant' ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none [&>h2]:text-sm [&>h2]:font-semibold [&>h2]:mt-3 [&>h2]:mb-1 [&>ul]:text-sm [&>p]:text-sm [&>ol]:text-sm">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
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

              <div className="border-t border-border p-3">
                <div className="flex gap-2">
                  <Textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask a behavior science question..."
                    className="resize-none min-h-[44px] max-h-32"
                    rows={1}
                  />
                  <Button onClick={() => sendMessage(input)} disabled={!input.trim() || isLoading} size="icon" className="shrink-0 h-11 w-11">
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  Nova AI provides guidance based on ABA principles. Always consult qualified professionals for clinical decisions.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Clinical Reasoning */}
        <TabsContent value="reasoning">
          <ClinicalReasoningSection />
        </TabsContent>

        {/* Case-Aware Reasoning */}
        <TabsContent value="case">
          <CaseAwareReasoningSection />
        </TabsContent>

        {/* Quick Prompts Library */}
        <TabsContent value="prompts">
          <div className="space-y-4">
            {/* Optimization Quick Actions */}
            <NovaAIOptimizationActions
              onLaunch={(action, contextText) => {
                setInput(contextText);
                setActiveTab('ask');
                setTimeout(() => textareaRef.current?.focus(), 100);
              }}
            />
            <div>
              <h2 className="text-lg font-semibold text-foreground">Quick Prompt Library</h2>
              <p className="text-sm text-muted-foreground">Click any prompt to load it into the chat</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {quickPrompts.map(qp => (
                <Card
                  key={qp.id}
                  className="cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all"
                  onClick={() => handleQuickPrompt(qp)}
                >
                  <CardContent className="p-3 flex items-start gap-3">
                    <span className="text-primary mt-0.5">
                      {ICON_MAP[qp.title || ''] || <Sparkles className="w-4 h-4" />}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{qp.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{qp.prompt}</p>
                      {qp.category && <Badge variant="outline" className="text-[10px] mt-1">{qp.category}</Badge>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
