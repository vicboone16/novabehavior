import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Stethoscope, RefreshCw, BarChart3, PenTool, Send, Loader2, ArrowLeft, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { ResponseExportActions } from './ResponseExportActions';

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/nova-ai-chat`;
const db = supabase as any;

type ReasoningMode = 'clinical_decision_support' | 'replacement_behavior' | 'behavior_pattern' | 'report_writing';

interface ModeConfig {
  key: ReasoningMode;
  label: string;
  icon: React.ReactNode;
  description: string;
  color: string;
}

const MODES: ModeConfig[] = [
  { key: 'clinical_decision_support', label: 'Clinical Decision Support', icon: <Stethoscope className="w-5 h-5" />, description: 'Interpret data and identify clinical next steps', color: 'text-blue-500' },
  { key: 'replacement_behavior', label: 'Replacement Behavior Selector', icon: <RefreshCw className="w-5 h-5" />, description: 'Suggest replacement behaviors by function and context', color: 'text-green-500' },
  { key: 'behavior_pattern', label: 'Behavior Pattern Analysis', icon: <BarChart3 className="w-5 h-5" />, description: 'Analyze trends, ABC patterns, and contextual factors', color: 'text-amber-500' },
  { key: 'report_writing', label: 'Report Writing Assistant', icon: <PenTool className="w-5 h-5" />, description: 'Draft clinical language for reports and notes', color: 'text-purple-500' },
];

interface ReportPreset { id: string; preset_key: string; preset_name: string; description: string | null; }

export function ClinicalReasoningSection() {
  const { user } = useAuth();
  const [selectedMode, setSelectedMode] = useState<ReasoningMode | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState('');
  const [reportPresets, setReportPresets] = useState<ReportPreset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState('');
  // Replacement behavior fields
  const [rbProblem, setRbProblem] = useState('');
  const [rbFunction, setRbFunction] = useState('');
  const [rbSetting, setRbSetting] = useState('');
  const [rbAge, setRbAge] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    db.from('nova_ai_report_presets').select('*').eq('is_active', true).order('preset_name').then(({ data }: any) => {
      if (data) setReportPresets(data);
    });
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [response]);

  const buildPrompt = (): string => {
    if (selectedMode === 'replacement_behavior') {
      const parts = [];
      if (rbProblem) parts.push(`Problem behavior: ${rbProblem}`);
      if (rbFunction) parts.push(`Likely function: ${rbFunction}`);
      if (rbSetting) parts.push(`Setting: ${rbSetting}`);
      if (rbAge) parts.push(`Age group: ${rbAge}`);
      if (input) parts.push(`Additional context: ${input}`);
      return parts.join('\n');
    }
    if (selectedMode === 'report_writing' && selectedPreset) {
      const preset = reportPresets.find(p => p.preset_key === selectedPreset);
      return `Report type: ${preset?.preset_name || selectedPreset}\n\n${input}`;
    }
    return input;
  };

  const getSystemSuffix = (): string => {
    switch (selectedMode) {
      case 'clinical_decision_support':
        return `\n\nMODE: Clinical Decision Support\nStructure your response with:\n## Clinical Summary\n## Key Concerns\n## Possible Barriers\n## Practical Next Steps`;
      case 'replacement_behavior':
        return `\n\nMODE: Replacement Behavior Selector\nStructure your response with:\n## Suggested Replacement Behaviors\n## Why They Fit\n## Teaching Considerations\n## Reinforcement Considerations`;
      case 'behavior_pattern':
        return `\n\nMODE: Behavior Pattern Analysis\nStructure your response with:\n## Pattern Summary\n## Likely Relevant Contexts\n## Clinical Interpretation\n## What Additional Data Might Help`;
      case 'report_writing':
        return `\n\nMODE: Report Writing Assistant\nStructure your response with:\n## Draft Language\n## Concise Version\n## Formal Version`;
      default:
        return '';
    }
  };

  const submit = async () => {
    const prompt = buildPrompt();
    if (!prompt.trim() || isLoading || !selectedMode) return;

    setIsLoading(true);
    setResponse('');
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
          reasoning_mode: selectedMode,
          system_suffix: getSystemSuffix(),
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

      // Log
      if (fullResponse) {
        await db.from('nova_ai_reasoning_logs').insert({
          user_id: user?.id,
          mode_key: selectedMode,
          prompt_text: prompt,
          response_text: fullResponse,
          selected_context_json: selectedMode === 'replacement_behavior'
            ? { problem: rbProblem, function: rbFunction, setting: rbSetting, age: rbAge }
            : selectedMode === 'report_writing' ? { preset: selectedPreset } : null,
        });
      }
    } catch (e) {
      console.error('Reasoning error:', e);
      toast.error('Failed to get response');
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setResponse('');
    setInput('');
    setRbProblem('');
    setRbFunction('');
    setRbSetting('');
    setRbAge('');
    setSelectedPreset('');
  };

  if (!selectedMode) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Clinical Reasoning</h2>
          <p className="text-sm text-muted-foreground">Select a reasoning mode to get started</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {MODES.map(m => (
            <Card
              key={m.key}
              className="cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all"
              onClick={() => setSelectedMode(m.key)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <span className={m.color}>{m.icon}</span>
                  {m.label}
                </CardTitle>
                <CardDescription className="text-xs">{m.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const mode = MODES.find(m => m.key === selectedMode)!;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedMode(null); reset(); }}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <span className={mode.color}>{mode.icon}</span>
        <h2 className="text-lg font-semibold text-foreground">{mode.label}</h2>
      </div>

      {/* Mode-specific inputs */}
      {selectedMode === 'replacement_behavior' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Problem Behavior</Label>
            <Input value={rbProblem} onChange={e => setRbProblem(e.target.value)} placeholder="e.g. Elopement" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Likely Function</Label>
            <Select value={rbFunction} onValueChange={setRbFunction}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="escape">Escape/Avoidance</SelectItem>
                <SelectItem value="attention">Attention</SelectItem>
                <SelectItem value="tangible">Tangible</SelectItem>
                <SelectItem value="sensory">Sensory/Automatic</SelectItem>
                <SelectItem value="multiple">Multiple Functions</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Setting</Label>
            <Select value={rbSetting} onValueChange={setRbSetting}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="classroom">Classroom</SelectItem>
                <SelectItem value="home">Home</SelectItem>
                <SelectItem value="clinic">Clinic</SelectItem>
                <SelectItem value="community">Community</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Age Group</Label>
            <Select value={rbAge} onValueChange={setRbAge}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="early_childhood">Early Childhood (2-5)</SelectItem>
                <SelectItem value="school_age">School Age (6-12)</SelectItem>
                <SelectItem value="adolescent">Adolescent (13-17)</SelectItem>
                <SelectItem value="adult">Adult (18+)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {selectedMode === 'report_writing' && (
        <div className="space-y-1">
          <Label className="text-xs">Report Type</Label>
          <Select value={selectedPreset} onValueChange={setSelectedPreset}>
            <SelectTrigger className="w-64"><SelectValue placeholder="Select preset" /></SelectTrigger>
            <SelectContent>
              {reportPresets.map(p => (
                <SelectItem key={p.id} value={p.preset_key}>{p.preset_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Input + send */}
      <div className="flex gap-2">
        <Textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
          placeholder={selectedMode === 'replacement_behavior'
            ? 'Additional context or notes (optional)...'
            : selectedMode === 'report_writing'
              ? 'Describe what you need language for...'
              : 'Describe the clinical situation or question...'
          }
          className="resize-none min-h-[60px] max-h-32"
          rows={2}
        />
        <Button onClick={submit} disabled={isLoading} size="icon" className="shrink-0 h-11 w-11">
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>

      {/* Response */}
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
                  <span className="text-sm">Analyzing...</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
