import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Activity, Brain, Users2, ClipboardList, FileText, Send, Loader2,
  ArrowLeft, AlertTriangle, TrendingUp, Shield, UserCheck, RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { CaseQuickActions, type QuickAction } from './CaseQuickActions';
import { ResponseExportActions } from './ResponseExportActions';
import { novaAIFetch } from '@/lib/novaAIFetch';

const db = supabase as any;

type CaseMode = 'case_behavior_analysis' | 'case_skill_analysis' | 'case_caregiver_analysis' | 'full_clinical_review' | 'case_report_language' | string;

interface ModeConfig {
  key: string;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const CASE_MODES: ModeConfig[] = [
  { key: 'case_behavior_analysis', label: 'Case Behavior Analysis', icon: <Activity className="w-5 h-5" />, description: 'Analyze behavior data, triggers, and patterns for this case' },
  { key: 'case_skill_analysis', label: 'Case Skill Analysis', icon: <TrendingUp className="w-5 h-5" />, description: 'Interpret skill acquisition, stalled targets, and prompt dependency' },
  { key: 'case_caregiver_analysis', label: 'Case Caregiver Analysis', icon: <Users2 className="w-5 h-5" />, description: 'Review caregiver training progress and engagement signals' },
  { key: 'full_clinical_review', label: 'Full Clinical Review', icon: <Brain className="w-5 h-5" />, description: 'Comprehensive review across behavior, skill, and caregiver data' },
  { key: 'case_report_language', label: 'Case Report Language', icon: <FileText className="w-5 h-5" />, description: 'Draft clinical language using the case context' },
  { key: 'replacement_behavior_selector', label: 'Replacement Behavior Selector', icon: <ClipboardList className="w-5 h-5" />, description: 'Suggest replacement behaviors' },
  { key: 'case_full_clinical_review', label: 'Full Clinical Review', icon: <Brain className="w-5 h-5" />, description: 'Comprehensive case review' },
];

interface Client { client_id: string; first_name: string; last_name: string; }
interface CaseContext {
  skill_alert_count?: number;
  behavior_alert_count?: number;
  programming_alert_count?: number;
  caregiver_alert_count?: number;
  behavior_name?: string;
  top_time_of_day?: string;
  top_antecedent_pattern?: string;
  top_consequence_pattern?: string;
  transition_risk_flag?: boolean;
  escape_pattern_flag?: boolean;
  attention_pattern_flag?: boolean;
  total_behavior_events?: number;
  caregiver_total_goals?: number;
  caregiver_mastered_goals?: number;
  caregiver_in_progress_goals?: number;
  caregiver_not_started_goals?: number;
}
interface BehaviorContext {
  problem_behavior_name?: string;
  problem_behavior_count?: number;
  replacement_behavior_count?: number;
  replacement_to_problem_ratio?: number;
  replacement_status?: string;
}

export function CaseAwareReasoningSection() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [contextScope, setContextScope] = useState('full_case');
  const [caseContext, setCaseContext] = useState<CaseContext | null>(null);
  const [behaviorContext, setBehaviorContext] = useState<BehaviorContext[]>([]);
  const [contextLoaded, setContextLoaded] = useState(false);
  const [loadingContext, setLoadingContext] = useState(false);
  const [selectedMode, setSelectedMode] = useState<string | null>(null);
  const [activeActionTitle, setActiveActionTitle] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState('');
  const [reasoningOutputId, setReasoningOutputId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [quickActions, setQuickActions] = useState<QuickAction[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    db.from('clients').select('client_id, first_name, last_name').order('last_name').limit(500)
      .then(({ data }: any) => { if (data) setClients(data); });
    db.from('nova_ai_case_quick_actions').select('*').eq('is_active', true).order('sort_order')
      .then(({ data }: any) => { if (data) setQuickActions(data); });
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [response]);

  const loadCaseContext = async () => {
    if (!selectedClientId) { toast.error('Select a student/client first'); return; }
    setLoadingContext(true);
    try {
      const [ctxRes, behRes] = await Promise.all([
        db.from('v_nova_ai_case_context_summary').select('*').eq('client_id', selectedClientId).maybeSingle(),
        db.from('v_nova_ai_behavior_context').select('*').eq('student_id', selectedClientId),
      ]);
      setCaseContext(ctxRes.data || null);
      setBehaviorContext(behRes.data || []);
      setContextLoaded(true);

      const { data: sess } = await db.from('nova_ai_case_context_sessions').insert({
        user_id: user?.id, client_id: selectedClientId, context_scope: contextScope,
        context_snapshot: { case: ctxRes.data, behaviors: behRes.data },
      }).select('id').single();
      if (sess) setSessionId(sess.id);
      toast.success('Case context loaded');
    } catch (e) {
      console.error(e);
      toast.error('Failed to load case context');
    } finally {
      setLoadingContext(false);
    }
  };

  const buildCasePrompt = (overrideInput?: string): string => {
    const parts: string[] = [];
    if (caseContext) {
      parts.push('=== CASE CONTEXT ===');
      if (caseContext.skill_alert_count) parts.push(`Skill Alerts: ${caseContext.skill_alert_count}`);
      if (caseContext.behavior_alert_count) parts.push(`Behavior Alerts: ${caseContext.behavior_alert_count}`);
      if (caseContext.programming_alert_count) parts.push(`Programming Alerts: ${caseContext.programming_alert_count}`);
      if (caseContext.caregiver_alert_count) parts.push(`Caregiver Alerts: ${caseContext.caregiver_alert_count}`);
      if (caseContext.behavior_name) parts.push(`Primary Behavior: ${caseContext.behavior_name}`);
      if (caseContext.top_time_of_day) parts.push(`Top Time of Day: ${caseContext.top_time_of_day}`);
      if (caseContext.top_antecedent_pattern) parts.push(`Top Antecedent: ${caseContext.top_antecedent_pattern}`);
      if (caseContext.top_consequence_pattern) parts.push(`Top Consequence: ${caseContext.top_consequence_pattern}`);
      if (caseContext.transition_risk_flag) parts.push('⚠ Transition risk flag');
      if (caseContext.escape_pattern_flag) parts.push('⚠ Escape pattern flag');
      if (caseContext.attention_pattern_flag) parts.push('⚠ Attention pattern flag');
      if (caseContext.total_behavior_events) parts.push(`Total Behavior Events: ${caseContext.total_behavior_events}`);
      if (caseContext.caregiver_total_goals) {
        parts.push(`Caregiver Goals: ${caseContext.caregiver_mastered_goals}/${caseContext.caregiver_total_goals} mastered, ${caseContext.caregiver_in_progress_goals} in progress, ${caseContext.caregiver_not_started_goals} not started`);
      }
    }
    if (behaviorContext.length > 0) {
      parts.push('\n=== REPLACEMENT BEHAVIOR DATA ===');
      behaviorContext.forEach(b => {
        parts.push(`${b.problem_behavior_name}: problem=${b.problem_behavior_count}, replacement=${b.replacement_behavior_count}, ratio=${b.replacement_to_problem_ratio}, status=${b.replacement_status}`);
      });
    }
    const txt = overrideInput ?? input;
    if (txt.trim()) parts.push(`\n=== PROVIDER QUESTION ===\n${txt.trim()}`);
    return parts.join('\n');
  };

  const getSystemSuffix = (mode?: string): string => {
    const m = mode || selectedMode;
    const base = '\n\nYou are analyzing a specific student/client case using real clinical data. Interpret the data like a BCBA would. Be specific, practical, and clinically grounded.';
    const suffixes: Record<string, string> = {
      case_behavior_analysis: '\n\nStructure your response with:\n## Behavior Summary\n## Pattern Interpretation\n## Possible Clinical Concerns\n## Possible Next Steps',
      case_skill_analysis: '\n\nStructure your response with:\n## Skill Progress Summary\n## Stalled / Prompt Dependency Signals\n## Clinical Interpretation\n## Possible Next Steps',
      case_caregiver_analysis: '\n\nStructure your response with:\n## Caregiver Progress Summary\n## Engagement / Follow-Through Signals\n## Clinical Interpretation\n## Possible Next Steps',
      full_clinical_review: '\n\nStructure your response with:\n## Overall Case Summary\n## Strengths / Progress\n## Concerns / Barriers\n## Priority Next Steps',
      case_full_clinical_review: '\n\nStructure your response with:\n## Overall Case Summary\n## Strengths / Progress\n## Concerns / Barriers\n## Priority Next Steps',
      case_report_language: '\n\nStructure your response with:\n## Draft Report Language\n## Concise Version\n## Formal Version',
      replacement_behavior_selector: '\n\nStructure your response with:\n## Suggested Replacement Behaviors\n## Why They Fit\n## Teaching Considerations\n## Reinforcement Considerations',
    };
    return base + (suffixes[m || ''] || '');
  };

  const runReasoning = async (promptText: string, mode: string, actionKey?: string) => {
    const prompt = buildCasePrompt(promptText);
    if (!prompt.trim() || isLoading) return;
    setIsLoading(true);
    setResponse('');
    setReasoningOutputId(null);
    let fullResponse = '';

    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          evidence_mode: true,
          system_suffix: getSystemSuffix(mode),
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        if (resp.status === 429) toast.error('Rate limit exceeded.');
        else if (resp.status === 402) toast.error('AI credits depleted.');
        else toast.error(err.error || 'AI service error');
        setIsLoading(false);
        return;
      }

      if (!resp.body) throw new Error('No body');
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

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
            if (delta) { fullResponse += delta; setResponse(fullResponse); }
          } catch { buffer = line + '\n' + buffer; break; }
        }
      }

      if (fullResponse) {
        const { data: output } = await db.from('nova_ai_case_reasoning_outputs').insert({
          user_id: user?.id, session_id: sessionId, client_id: selectedClientId,
          reasoning_mode: mode, prompt_text: promptText || null,
          context_snapshot: { case: caseContext, behaviors: behaviorContext },
          response_text: fullResponse,
        }).select('id').single();
        if (output) setReasoningOutputId(output.id);

        // Log quick action usage
        if (actionKey && sessionId) {
          await db.from('nova_ai_case_quick_action_history').insert({
            context_session_id: sessionId, user_id: user?.id,
            action_key: actionKey, reasoning_output_id: output?.id,
          });
        }
      }
    } catch (e) {
      console.error('Case reasoning error:', e);
      toast.error('Failed to get response');
    } finally {
      setIsLoading(false);
    }
  };

  const submit = () => {
    if (!selectedMode) return;
    runReasoning(input, selectedMode);
  };

  const handleQuickAction = (action: QuickAction) => {
    setSelectedMode(action.default_reasoning_mode);
    setActiveActionTitle(action.action_title);
    setInput(action.default_prompt_text || '');
    runReasoning(action.default_prompt_text || '', action.default_reasoning_mode, action.action_key);
  };

  const resetAll = () => {
    setSelectedMode(null);
    setActiveActionTitle(null);
    setResponse('');
    setReasoningOutputId(null);
    setInput('');
  };

  const handleRerun = () => {
    if (selectedMode) runReasoning(input, selectedMode);
  };

  const clientName = clients.find(c => c.client_id === selectedClientId);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Case-Aware Clinical Reasoning</h2>
        <p className="text-sm text-muted-foreground">Select a student/client and let Nova AI reason from their actual case data</p>
      </div>

      {/* Client Selection & Context Loading */}
      <Card className="border-border/60">
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Student / Client</Label>
              <Select value={selectedClientId} onValueChange={(v) => { setSelectedClientId(v); setContextLoaded(false); resetAll(); }}>
                <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                <SelectContent>
                  {clients.map(c => (
                    <SelectItem key={c.client_id} value={c.client_id}>{c.last_name}, {c.first_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Context Scope</Label>
              <Select value={contextScope} onValueChange={setContextScope}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_case">Full Case</SelectItem>
                  <SelectItem value="behavior">Behavior</SelectItem>
                  <SelectItem value="skill">Skill</SelectItem>
                  <SelectItem value="caregiver">Caregiver</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={loadCaseContext} disabled={!selectedClientId || loadingContext} className="w-full">
                {loadingContext ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Shield className="w-4 h-4 mr-2" />}
                Load Case Context
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Context Preview */}
      {contextLoaded && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {caseContext && (
            <>
              <ContextCard label="Skill Alerts" value={caseContext.skill_alert_count} icon={<TrendingUp className="w-3.5 h-3.5" />} warn={(caseContext.skill_alert_count || 0) > 0} />
              <ContextCard label="Behavior Alerts" value={caseContext.behavior_alert_count} icon={<AlertTriangle className="w-3.5 h-3.5" />} warn={(caseContext.behavior_alert_count || 0) > 0} />
              <ContextCard label="Caregiver Alerts" value={caseContext.caregiver_alert_count} icon={<Users2 className="w-3.5 h-3.5" />} warn={(caseContext.caregiver_alert_count || 0) > 0} />
              <ContextCard label="Total Events" value={caseContext.total_behavior_events} icon={<Activity className="w-3.5 h-3.5" />} />
              {caseContext.top_antecedent_pattern && (
                <ContextCard label="Top Antecedent" value={caseContext.top_antecedent_pattern} icon={<ClipboardList className="w-3.5 h-3.5" />} span />
              )}
              {caseContext.top_consequence_pattern && (
                <ContextCard label="Top Consequence" value={caseContext.top_consequence_pattern} icon={<ClipboardList className="w-3.5 h-3.5" />} span />
              )}
              {(caseContext.caregiver_total_goals || 0) > 0 && (
                <ContextCard label="Caregiver Goals" value={`${caseContext.caregiver_mastered_goals}/${caseContext.caregiver_total_goals} mastered`} icon={<UserCheck className="w-3.5 h-3.5" />} span />
              )}
            </>
          )}
          {behaviorContext.length > 0 && behaviorContext.slice(0, 3).map((b, i) => (
            <ContextCard key={i} label={b.problem_behavior_name || 'Behavior'} value={`${b.replacement_status || 'unknown'} (ratio: ${b.replacement_to_problem_ratio ?? 'N/A'})`} icon={<Activity className="w-3.5 h-3.5" />} />
          ))}
        </div>
      )}

      {/* Quick Actions */}
      {contextLoaded && !selectedMode && quickActions.length > 0 && (
        <CaseQuickActions actions={quickActions} onLaunch={handleQuickAction} isLoading={isLoading} />
      )}

      {/* Manual Mode Selection */}
      {contextLoaded && !selectedMode && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Or choose a reasoning mode</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {CASE_MODES.filter(m => !['case_full_clinical_review', 'replacement_behavior_selector'].includes(m.key)).map(m => (
              <Card key={m.key} className="cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all" onClick={() => setSelectedMode(m.key)}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <span className="text-primary">{m.icon}</span>{m.label}
                  </CardTitle>
                  <CardDescription className="text-xs">{m.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Active Mode / Response Workspace */}
      {contextLoaded && selectedMode && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={resetAll}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <span className="text-primary">
              {CASE_MODES.find(m => m.key === selectedMode)?.icon || <Brain className="w-5 h-5" />}
            </span>
            <h3 className="text-base font-semibold text-foreground">
              {activeActionTitle || CASE_MODES.find(m => m.key === selectedMode)?.label || selectedMode}
            </h3>
            {clientName && (
              <Badge variant="outline" className="text-xs ml-auto">{clientName.first_name} {clientName.last_name}</Badge>
            )}
          </div>

          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
              placeholder="Add additional context or refine your question..."
              className="resize-none min-h-[60px] max-h-32"
              rows={2}
            />
            <div className="flex flex-col gap-1">
              <Button onClick={submit} disabled={isLoading} size="icon" className="shrink-0 h-11 w-11">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
              {response && !isLoading && (
                <Button onClick={handleRerun} variant="ghost" size="icon" className="shrink-0 h-8 w-11" title="Rerun">
                  <RotateCcw className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>

          {(response || isLoading) && (
            <Card className="border-border/60">
              <CardContent className="p-4">
                <div ref={scrollRef} className="max-h-[500px] overflow-y-auto">
                  {response ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none [&>h2]:text-sm [&>h2]:font-semibold [&>h2]:mt-3 [&>h2]:mb-1 [&>ul]:text-sm [&>p]:text-sm [&>ol]:text-sm">
                      <ReactMarkdown>{response}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Analyzing case data...</span>
                    </div>
                  )}
                </div>
                {response && !isLoading && (
                  <ResponseExportActions
                    responseText={response}
                    reasoningOutputId={reasoningOutputId}
                    clientId={selectedClientId}
                    sessionId={sessionId}
                  />
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function ContextCard({ label, value, icon, warn, span }: { label: string; value?: string | number | null; icon: React.ReactNode; warn?: boolean; span?: boolean }) {
  return (
    <Card className={`${span ? 'col-span-2' : ''} ${warn ? 'border-destructive/30 bg-destructive/5' : 'border-border/60'}`}>
      <CardContent className="p-2.5 flex items-start gap-2">
        <span className={warn ? 'text-destructive' : 'text-muted-foreground'}>{icon}</span>
        <div className="min-w-0">
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
          <p className="text-xs font-semibold text-foreground truncate">{value ?? '—'}</p>
        </div>
      </CardContent>
    </Card>
  );
}
