import { useState, useCallback, useRef, useEffect } from 'react';
import { useScribe, CommitStrategy } from '@elevenlabs/react';
import { getAccessToken } from '@/lib/novaAIFetch';
import { toast } from 'sonner';

interface TranscriptEntry {
  id: string;
  text: string;
  timestamp: Date;
  isFinal: boolean;
}

export function useLiveTranscription() {
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const entryIdRef = useRef(0);
  const scribeTokenUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-scribe-token`;

  const scribe = useScribe({
    modelId: 'scribe_v2_realtime',
    commitStrategy: CommitStrategy.VAD,
    onPartialTranscript: (data) => {
      // Update the latest partial entry or add new one
      setTranscripts(prev => {
        const lastEntry = prev[prev.length - 1];
        if (lastEntry && !lastEntry.isFinal) {
          return [...prev.slice(0, -1), { ...lastEntry, text: data.text }];
        }
        return [...prev, {
          id: `partial-${entryIdRef.current++}`,
          text: data.text,
          timestamp: new Date(),
          isFinal: false,
        }];
      });
    },
    onCommittedTranscript: (data) => {
      setTranscripts(prev => {
        // Replace the last partial with this committed version
        const withoutLastPartial = prev.filter(t => t.isFinal);
        return [...withoutLastPartial, {
          id: `committed-${entryIdRef.current++}`,
          text: data.text,
          timestamp: new Date(),
          isFinal: true,
        }];
      });
    },
  });

  const startTranscription = useCallback(async () => {
    setIsConnecting(true);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error('Your session expired. Please sign in again.');
      }

      const response = await fetch(scribeTokenUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data?.token) {
        throw new Error(data?.error || 'Failed to get transcription token');
      }

      await scribe.connect({
        token: data.token,
        microphone: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      toast.success('Live transcription started');
    } catch (err: any) {
      console.error('Transcription start error:', err);
      toast.error('Failed to start transcription: ' + err.message);
    } finally {
      setIsConnecting(false);
    }
  }, [scribe, scribeTokenUrl]);

  const stopTranscription = useCallback(() => {
    scribe.disconnect();
    toast.info('Transcription stopped');
  }, [scribe]);

  const clearTranscripts = useCallback(() => {
    setTranscripts([]);
  }, []);

  const getFullTranscript = useCallback(() => {
    return transcripts
      .filter(t => t.isFinal)
      .map(t => t.text)
      .join(' ');
  }, [transcripts]);

  return {
    transcripts,
    isConnected: scribe.isConnected,
    isConnecting,
    partialText: scribe.partialTranscript,
    startTranscription,
    stopTranscription,
    clearTranscripts,
    getFullTranscript,
  };
}
