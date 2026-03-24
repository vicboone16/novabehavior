/**
 * Nova AI Clinical Capture - Live Recording Screen
 * /capture/live/:recordingId
 * 
 * Uses the shared engine from FloatingCaptureButton via captureStore.
 * Includes live transcription via ElevenLabs Realtime Scribe.
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Pause, Play, Square, Upload, Shield, Bookmark, StickyNote, Wifi, WifiOff, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useVoiceCaptureEngine } from '@/hooks/useVoiceCaptureEngine';
import { useCaptureStore } from '@/stores/captureStore';
import { ENCOUNTER_TYPE_LABELS, PRIVACY_LABELS } from '@/types/voiceCapture';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function CaptureLive() {
  const { recordingId } = useParams<{ recordingId: string }>();
  const navigate = useNavigate();
  const engine = useVoiceCaptureEngine();
  const { state } = engine;
  const captureState = useCaptureStore();

  // Live transcription state
  const [liveTranscript, setLiveTranscript] = useState('');
  const [committedLines, setCommittedLines] = useState<string[]>([]);
  const [scribeConnected, setScribeConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const isActive = state.isRecording || captureState.status === 'recording_active';
  const elapsed = state.elapsedSeconds || captureState.elapsedSeconds;

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // Connect to ElevenLabs Realtime Scribe
  const connectScribe = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('elevenlabs-scribe-token');
      if (error || !data?.token) {
        console.error('[LiveScribe] Failed to get token:', error);
        return;
      }

      const ws = new WebSocket('wss://api.elevenlabs.io/v1/speech-to-text/realtime');
      wsRef.current = ws;

      ws.onopen = () => {
        // Send initial config
        ws.send(JSON.stringify({
          type: 'session.config',
          token: data.token,
          model_id: 'scribe_v2_realtime',
          language_code: 'eng',
          encoding: 'pcm_16000',
        }));
        setScribeConnected(true);
        console.log('[LiveScribe] WebSocket connected');
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'partial_transcript' && msg.text) {
            setLiveTranscript(msg.text);
          } else if (msg.type === 'committed_transcript' && msg.text) {
            setCommittedLines(prev => [...prev, msg.text]);
            setLiveTranscript('');
          }
        } catch { /* ignore parse errors */ }
      };

      ws.onclose = () => {
        setScribeConnected(false);
        console.log('[LiveScribe] WebSocket closed');
      };

      ws.onerror = (err) => {
        console.error('[LiveScribe] WebSocket error:', err);
        setScribeConnected(false);
      };

      // Start sending audio from the microphone
      startAudioStreaming(ws);
    } catch (err) {
      console.error('[LiveScribe] Connection failed:', err);
    }
  }, []);

  // Stream microphone audio to the WebSocket
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const scribeStreamRef = useRef<MediaStream | null>(null);

  const startAudioStreaming = async (ws: WebSocket) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 },
      });
      scribeStreamRef.current = stream;

      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (ws.readyState !== WebSocket.OPEN) return;
        const float32 = e.inputBuffer.getChannelData(0);
        // Convert Float32 to Int16 PCM
        const int16 = new Int16Array(float32.length);
        for (let i = 0; i < float32.length; i++) {
          const s = Math.max(-1, Math.min(1, float32[i]));
          int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        // Base64 encode
        const bytes = new Uint8Array(int16.buffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);
        ws.send(JSON.stringify({ type: 'audio', data: base64 }));
      };

      source.connect(processor);
      processor.connect(audioContext.destination);
    } catch (err) {
      console.error('[LiveScribe] Audio streaming failed:', err);
    }
  };

  const disconnectScribe = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (scribeStreamRef.current) {
      scribeStreamRef.current.getTracks().forEach(t => t.stop());
      scribeStreamRef.current = null;
    }
    setScribeConnected(false);
  }, []);

  // Auto-connect scribe when recording is active
  useEffect(() => {
    if (isActive && !scribeConnected && !wsRef.current) {
      connectScribe();
    }
    return () => {
      if (!isActive) disconnectScribe();
    };
  }, [isActive]);

  // Auto-scroll transcript
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [committedLines, liveTranscript]);

  const handleStop = async () => {
    disconnectScribe();
    await engine.stopRecording();
    captureState.clearSession();
    if (recordingId) navigate(`/capture/review/${recordingId}`);
  };

  const uploadProgress = state.totalChunks > 0
    ? Math.round((state.uploadedChunks / state.totalChunks) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Bar */}
      <div className="bg-destructive text-destructive-foreground px-4 py-3">
        <div className="container flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive-foreground hover:bg-white/20" onClick={() => navigate('/capture')}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-white animate-pulse" />
              <span className="font-bold text-sm">REC</span>
            </div>
            <span className="font-mono text-lg font-bold">{formatTime(elapsed)}</span>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-white/30 text-white text-[10px]">
              <Shield className="w-2.5 h-2.5 mr-0.5" />
              {captureState.privacyMode ? PRIVACY_LABELS[captureState.privacyMode] : 'Private'}
            </Badge>
            {captureState.encounterType && (
              <Badge variant="outline" className="border-white/30 text-white text-[10px]">
                {ENCOUNTER_TYPE_LABELS[captureState.encounterType]}
              </Badge>
            )}
          </div>
        </div>
        <Progress value={uploadProgress} className="h-0.5 rounded-none bg-white/20 mt-1" />
      </div>

      {/* Main Content */}
      <div className="flex-1 container py-6 space-y-6 max-w-2xl mx-auto">
        {/* Learner Context */}
        {captureState.linkedLearnerName && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20">
            <span className="text-sm text-muted-foreground">Recording for:</span>
            <Badge variant="secondary">{captureState.linkedLearnerName}</Badge>
          </div>
        )}

        {/* Waveform Visualization */}
        <Card>
          <CardContent className="py-8">
            <div className="flex items-center justify-center gap-1 h-20">
              {Array.from({ length: 32 }).map((_, i) => (
                <div
                  key={i}
                  className="w-1 rounded-full bg-destructive/60 transition-all duration-150"
                  style={{
                    height: `${Math.max(4, (state.audioLevel > (i / 32) ? state.audioLevel * 80 : 4 + Math.random() * 8))}px`,
                    opacity: state.audioLevel > (i / 32) ? 1 : 0.3,
                  }}
                />
              ))}
            </div>
            <p className="text-center text-xs text-muted-foreground mt-4">
              {state.isPaused ? '⏸ Paused' : '🎙 Listening…'}
            </p>
          </CardContent>
        </Card>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="lg"
            className="rounded-full h-14 w-14"
            onClick={() => state.isPaused ? engine.resumeRecording() : engine.pauseRecording()}
          >
            {state.isPaused ? <Play className="w-6 h-6" /> : <Pause className="w-6 h-6" />}
          </Button>
          <Button
            variant="destructive"
            size="lg"
            className="rounded-full h-16 w-16 shadow-xl"
            onClick={handleStop}
          >
            <Square className="w-6 h-6" />
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="rounded-full h-14 w-14"
            onClick={() => {/* bookmark */}}
          >
            <Bookmark className="w-5 h-5" />
          </Button>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="py-3 flex items-center gap-2">
              <Upload className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{state.uploadedChunks}/{state.totalChunks}</p>
                <p className="text-[10px] text-muted-foreground">Chunks uploaded</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3 flex items-center gap-2">
              {captureState.connectionState === 'connected' ? (
                <Wifi className="w-4 h-4 text-primary" />
              ) : (
                <WifiOff className="w-4 h-4 text-destructive" />
              )}
              <div>
                <p className="text-sm font-medium capitalize">{captureState.connectionState}</p>
                <p className="text-[10px] text-muted-foreground">Connection</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Transcript */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-2 mb-3">
              <StickyNote className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Live Transcript</span>
              {scribeConnected ? (
                <Badge variant="default" className="text-[10px] bg-green-600">Live</Badge>
              ) : (
                <Badge variant="secondary" className="text-[10px]">Connecting…</Badge>
              )}
            </div>
            <ScrollArea className="h-48">
              <div className="space-y-1 text-sm">
                {committedLines.length === 0 && !liveTranscript && (
                  <p className="text-muted-foreground italic">
                    {scribeConnected ? 'Waiting for speech…' : 'Connecting to live transcription…'}
                  </p>
                )}
                {committedLines.map((line, i) => (
                  <p key={i} className="text-foreground">{line}</p>
                ))}
                {liveTranscript && (
                  <p className="text-muted-foreground italic">{liveTranscript}</p>
                )}
                <div ref={scrollRef} />
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
