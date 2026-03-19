/**
 * Nova AI Live Copilot — Real-Time Clinical Documentation Copilot
 * 4-panel live workspace: Transcript, Draft Note, Extracted Data, Flags
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useNovaContext, type CopilotWorkflowType } from '@/hooks/useNovaContext';
import { useLiveTranscription } from '@/hooks/useLiveTranscription';
import { useCopilotSpotter, type SpottedItem, type SpotterFlag } from '@/hooks/useCopilotSpotter';
import { useRecordingSafetyGuards } from '@/hooks/useRecordingSafetyGuards';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import {
  Mic, MicOff, Square, Play, Pause, BrainCircuit, FileText,
  Database, AlertTriangle, Check, X, Pencil, Save, ArrowLeft,
  Loader2, User, MapPin, Briefcase, Sparkles, Eye, Clock
} from 'lucide-react';
import { toast } from 'sonner';

const WORKFLOW_LABELS: Record<CopilotWorkflowType, string> = {
  direct_session: 'Direct ABA Session',
  parent_training: 'Parent Training',
  teacher_consult: 'Teacher Consult',
  classroom_observation: 'Classroom Observation',
  fba_observation: 'FBA Observation',
  fba_interview: 'FBA Interview',
  supervision: 'Supervision',
  narrative_note: 'Narrative Note',
  quick_note: 'Quick Note',
  unknown: 'General Capture',
};

const CONFIDENCE_COLORS: Record<string, string> = {
  high: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  low: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

const BASIS_LABELS: Record<string, string> = {
  directly_stated: 'Stated',
  observed: 'Observed',
  inferred: 'Inferred',
  unclear: 'Unclear',
};

export default function NovaCopilot() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const novaCtx = useNovaContext();
  const transcription = useLiveTranscription();
  const spotter = useCopilotSpotter();
  const { getRecoveryState, clearRecovery } = useRecordingSafetyGuards({
    isRecording: transcription.isConnected,
    recordingId: 'copilot-live',
  });

  const [workflowOverride, setWorkflowOverride] = useState<CopilotWorkflowType | null>(null);
  const [draftNote, setDraftNote] = useState('');
  const [activePanel, setActivePanel] = useState('transcript');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const analyzeIntervalRef = useRef<ReturnType<typeof setInterval>>();
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const effectiveWorkflow = workflowOverride || novaCtx.workflowType;

  // Timer
  useEffect(() => {
    if (transcription.isConnected) {
      setElapsedSeconds(0);
      timerRef.current = setInterval(() => setElapsedSeconds(s => s + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [transcription.isConnected]);

  // Periodic analysis of transcript
  useEffect(() => {
    if (transcription.isConnected) {
      analyzeIntervalRef.current = setInterval(() => {
        const fullText = transcription.getFullTranscript();
        if (fullText.length > 20) {
          spotter.analyzeChunk(fullText, effectiveWorkflow, novaCtx.suggestedNoteType);
        }
      }, 8000); // Analyze every 8 seconds
    } else if (analyzeIntervalRef.current) {
      clearInterval(analyzeIntervalRef.current);
    }
    return () => { if (analyzeIntervalRef.current) clearInterval(analyzeIntervalRef.current); };
  }, [transcription.isConnected, effectiveWorkflow, novaCtx.suggestedNoteType]);

  // Build draft note from spotter lines
  useEffect(() => {
    if (spotter.draftLines.length > 0) {
      setDraftNote(spotter.draftLines.join('\n'));
    }
  }, [spotter.draftLines]);

  const handleStart = useCallback(async () => {
    spotter.clearAll();
    setDraftNote('');
    await transcription.startTranscription();
  }, [transcription, spotter]);

  const handleStop = useCallback(() => {
    transcription.stopTranscription();
    // Final analysis
    const fullText = transcription.getFullTranscript();
    if (fullText.length > 20) {
      spotter.analyzeChunk(fullText, effectiveWorkflow, novaCtx.suggestedNoteType);
    }
    toast.success('Capture complete — review your draft below');
  }, [transcription, spotter, effectiveWorkflow, novaCtx.suggestedNoteType]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const activeItems = spotter.items.filter(i => i.status !== 'dismissed');
  const confirmedItems = spotter.items.filter(i => i.status === 'confirmed' || i.status === 'edited');

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full max-h-[calc(100vh-4rem)]">
        {/* ── Header ── */}
        <div className="flex-shrink-0 border-b bg-card p-3 sm:p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-2">
              <BrainCircuit className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-semibold">Nova Copilot</h1>
              <Badge variant="outline" className="text-xs">AI Draft</Badge>
            </div>

            <div className="flex items-center gap-2 ml-auto flex-wrap">
              {/* Context indicators */}
              {novaCtx.userId && (
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="secondary" className="gap-1 text-xs">
                      <User className="h-3 w-3" />
                      {novaCtx.userDisplayName || 'User'}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>Logged-in user detected</TooltipContent>
                </Tooltip>
              )}
              {novaCtx.learnerId && (
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="secondary" className="gap-1 text-xs bg-blue-50 dark:bg-blue-900/20">
                      <MapPin className="h-3 w-3" />
                      Learner Linked
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>Learner auto-detected from current page</TooltipContent>
                </Tooltip>
              )}
              <Badge variant="secondary" className="gap-1 text-xs">
                <Briefcase className="h-3 w-3" />
                {novaCtx.userRole || 'staff'}
              </Badge>
            </div>
          </div>

          {/* Controls row */}
          <div className="flex flex-wrap items-center gap-3 mt-3">
            <Select
              value={effectiveWorkflow}
              onValueChange={(v) => setWorkflowOverride(v as CopilotWorkflowType)}
            >
              <SelectTrigger className="w-[200px] h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(WORKFLOW_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {!transcription.isConnected ? (
              <Button
                onClick={handleStart}
                disabled={transcription.isConnecting}
                className="gap-2"
                size="sm"
              >
                {transcription.isConnecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
                {transcription.isConnecting ? 'Connecting…' : 'Start Live Listening'}
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                  <Clock className="h-3 w-3 text-red-600" />
                  <span className="text-sm font-mono text-red-700 dark:text-red-300">{formatTime(elapsedSeconds)}</span>
                </div>
                <Button variant="destructive" size="sm" onClick={handleStop} className="gap-1">
                  <Square className="h-3 w-3" />
                  Stop
                </Button>
              </div>
            )}

            {spotter.isAnalyzing && (
              <Badge variant="outline" className="gap-1 text-xs animate-pulse">
                <Sparkles className="h-3 w-3" />
                Analyzing…
              </Badge>
            )}
          </div>
        </div>

        {/* ── 4-Panel Workspace ── */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {/* Mobile: tabs; Desktop: grid */}
          <div className="block lg:hidden h-full">
            <Tabs value={activePanel} onValueChange={setActivePanel} className="flex flex-col h-full">
              <TabsList className="flex-shrink-0 mx-2 mt-2">
                <TabsTrigger value="transcript" className="gap-1 text-xs">
                  <Mic className="h-3 w-3" />Transcript
                </TabsTrigger>
                <TabsTrigger value="draft" className="gap-1 text-xs">
                  <FileText className="h-3 w-3" />Draft
                </TabsTrigger>
                <TabsTrigger value="data" className="gap-1 text-xs">
                  <Database className="h-3 w-3" />Data
                  {activeItems.length > 0 && (
                    <span className="ml-1 px-1 bg-primary text-primary-foreground rounded-full text-[10px]">
                      {activeItems.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="flags" className="gap-1 text-xs">
                  <AlertTriangle className="h-3 w-3" />Flags
                  {spotter.flags.length > 0 && (
                    <span className="ml-1 px-1 bg-amber-500 text-white rounded-full text-[10px]">
                      {spotter.flags.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
              <div className="flex-1 min-h-0 p-2">
                <TabsContent value="transcript" className="h-full mt-0">
                  <TranscriptPanel transcription={transcription} />
                </TabsContent>
                <TabsContent value="draft" className="h-full mt-0">
                  <DraftNotePanel
                    draftNote={draftNote}
                    setDraftNote={setDraftNote}
                    noteType={novaCtx.suggestedNoteType}
                    confirmedItems={confirmedItems}
                  />
                </TabsContent>
                <TabsContent value="data" className="h-full mt-0">
                  <ExtractedDataPanel
                    items={activeItems}
                    onConfirm={spotter.confirmItem}
                    onDismiss={spotter.dismissItem}
                    onEdit={spotter.editItem}
                  />
                </TabsContent>
                <TabsContent value="flags" className="h-full mt-0">
                  <FlagsPanel flags={spotter.flags} />
                </TabsContent>
              </div>
            </Tabs>
          </div>

          {/* Desktop: 2x2 grid */}
          <div className="hidden lg:grid grid-cols-2 grid-rows-2 gap-2 p-2 h-full">
            <TranscriptPanel transcription={transcription} />
            <DraftNotePanel
              draftNote={draftNote}
              setDraftNote={setDraftNote}
              noteType={novaCtx.suggestedNoteType}
              confirmedItems={confirmedItems}
            />
            <ExtractedDataPanel
              items={activeItems}
              onConfirm={spotter.confirmItem}
              onDismiss={spotter.dismissItem}
              onEdit={spotter.editItem}
            />
            <FlagsPanel flags={spotter.flags} />
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

/* ────────────── Sub-panels ────────────── */

function TranscriptPanel({ transcription }: { transcription: ReturnType<typeof useLiveTranscription> }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcription.transcripts, transcription.partialText]);

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="py-2 px-3 flex-shrink-0">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <Mic className="h-3.5 w-3.5 text-primary" />
          Live Transcript
          {transcription.isConnected && (
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse ml-1" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 px-3 pb-3">
        <ScrollArea className="h-full" ref={scrollRef}>
          <div className="space-y-1.5 text-sm">
            {transcription.transcripts.length === 0 && !transcription.partialText && (
              <p className="text-muted-foreground italic text-xs">
                {transcription.isConnected
                  ? 'Listening… speak to see transcript here.'
                  : 'Click "Start Live Listening" to begin.'}
              </p>
            )}
            {transcription.transcripts.map(t => (
              <p key={t.id} className={t.isFinal ? 'text-foreground' : 'text-muted-foreground italic'}>
                {t.text}
              </p>
            ))}
            {transcription.partialText && (
              <p className="text-muted-foreground italic">{transcription.partialText}</p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function DraftNotePanel({
  draftNote,
  setDraftNote,
  noteType,
  confirmedItems,
}: {
  draftNote: string;
  setDraftNote: (v: string) => void;
  noteType: string;
  confirmedItems: SpottedItem[];
}) {
  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="py-2 px-3 flex-shrink-0">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5 text-primary" />
          Draft Note
          <Badge variant="outline" className="text-[10px] ml-1">{noteType}</Badge>
          <Badge variant="outline" className="text-[10px] ml-1 bg-amber-50 dark:bg-amber-900/20">AI Draft — Not Finalized</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 px-3 pb-3">
        <Textarea
          value={draftNote}
          onChange={e => setDraftNote(e.target.value)}
          placeholder="AI-generated draft will appear here as you speak…"
          className="h-full resize-none text-sm font-mono"
        />
      </CardContent>
    </Card>
  );
}

function ExtractedDataPanel({
  items,
  onConfirm,
  onDismiss,
  onEdit,
}: {
  items: SpottedItem[];
  onConfirm: (id: string) => void;
  onDismiss: (id: string) => void;
  onEdit: (id: string, value: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="py-2 px-3 flex-shrink-0">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <Database className="h-3.5 w-3.5 text-primary" />
          Extracted Data
          {items.length > 0 && (
            <Badge variant="secondary" className="text-[10px]">{items.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 px-3 pb-3">
        <ScrollArea className="h-full">
          {items.length === 0 ? (
            <p className="text-muted-foreground text-xs italic">
              Clinical items will appear here as Nova spots them in your transcript.
            </p>
          ) : (
            <div className="space-y-2">
              {items.map(item => (
                <div
                  key={item.id}
                  className={`flex flex-col gap-1 p-2 rounded-lg border text-xs ${
                    item.status === 'confirmed' ? 'border-emerald-300 bg-emerald-50/50 dark:bg-emerald-900/10' : 'border-border'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant="outline" className="text-[10px] capitalize">{item.type.replace(/_/g, ' ')}</Badge>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${CONFIDENCE_COLORS[item.confidence]}`}>
                        {item.confidence}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {BASIS_LABELS[item.basis]}
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      {item.status === 'pending' && (
                        <>
                          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onConfirm(item.id)}>
                            <Check className="h-3 w-3 text-emerald-600" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => {
                            setEditingId(item.id);
                            setEditValue(item.value);
                          }}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onDismiss(item.id)}>
                            <X className="h-3 w-3 text-red-500" />
                          </Button>
                        </>
                      )}
                      {item.status === 'confirmed' && <Check className="h-3 w-3 text-emerald-600" />}
                    </div>
                  </div>
                  {editingId === item.id ? (
                    <div className="flex gap-1">
                      <input
                        type="text"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        className="flex-1 px-2 py-1 text-xs border rounded"
                        autoFocus
                      />
                      <Button size="icon" className="h-6 w-6" onClick={() => {
                        onEdit(item.id, editValue);
                        setEditingId(null);
                      }}>
                        <Check className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <p className="text-foreground">{item.value}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function FlagsPanel({ flags }: { flags: SpotterFlag[] }) {
  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="py-2 px-3 flex-shrink-0">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
          Flags & Clarifications
          {flags.length > 0 && (
            <Badge variant="secondary" className="text-[10px] bg-amber-100 dark:bg-amber-900/20">{flags.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 px-3 pb-3">
        <ScrollArea className="h-full">
          {flags.length === 0 ? (
            <p className="text-muted-foreground text-xs italic">
              Clarifications and uncertainty flags will appear here when Nova is unsure about an extraction.
            </p>
          ) : (
            <div className="space-y-2">
              {flags.map((f, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded-lg border border-amber-200 bg-amber-50/50 dark:bg-amber-900/10 text-xs">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <Badge variant="outline" className="text-[10px] capitalize mb-1">
                      {f.type.replace(/_/g, ' ')}
                    </Badge>
                    <p className="text-foreground">{f.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
