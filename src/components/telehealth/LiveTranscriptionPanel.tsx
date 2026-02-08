import { useRef, useEffect, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Copy, Trash2, Loader2 } from 'lucide-react';
import { useLiveTranscription } from '@/hooks/useLiveTranscription';
import { toast } from 'sonner';

interface LiveTranscriptionPanelProps {
  onTranscriptUpdate?: (fullText: string) => void;
}

export function LiveTranscriptionPanel({ onTranscriptUpdate }: LiveTranscriptionPanelProps) {
  const {
    transcripts,
    isConnected,
    isConnecting,
    partialText,
    startTranscription,
    stopTranscription,
    clearTranscripts,
    getFullTranscript,
  } = useLiveTranscription();

  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcripts, partialText]);

  // Notify parent of transcript updates
  useEffect(() => {
    if (onTranscriptUpdate) {
      onTranscriptUpdate(getFullTranscript());
    }
  }, [transcripts, onTranscriptUpdate, getFullTranscript]);

  const handleCopy = () => {
    const text = getFullTranscript();
    if (text) {
      navigator.clipboard.writeText(text);
      toast.success('Transcript copied to clipboard');
    }
  };

  return (
    <div className="flex flex-col h-full border-l bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          {isConnected ? (
            <span className="flex items-center gap-1.5 text-sm font-medium text-primary">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Live
            </span>
          ) : (
            <span className="text-sm font-medium text-muted-foreground">Transcription</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleCopy}
            disabled={transcripts.length === 0}
            title="Copy transcript"
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={clearTranscripts}
            disabled={transcripts.length === 0}
            title="Clear transcript"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Transcript content */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-2">
          {transcripts.length === 0 && !partialText && (
            <p className="text-sm text-muted-foreground text-center py-8">
              {isConnected ? 'Listening for speech...' : 'Start transcription to see live text here'}
            </p>
          )}

          {transcripts.filter(t => t.isFinal).map((entry) => (
            <p key={entry.id} className="text-sm leading-relaxed">
              {entry.text}
            </p>
          ))}

          {/* Partial (in-progress) text */}
          {partialText && (
            <p className="text-sm leading-relaxed text-muted-foreground italic">
              {partialText}
            </p>
          )}
        </div>
      </ScrollArea>

      {/* Controls */}
      <div className="p-3 border-t">
        {isConnected ? (
          <Button
            onClick={stopTranscription}
            variant="destructive"
            className="w-full"
            size="sm"
          >
            <MicOff className="h-4 w-4 mr-2" />
            Stop Transcription
          </Button>
        ) : (
          <Button
            onClick={startTranscription}
            disabled={isConnecting}
            className="w-full"
            size="sm"
          >
            {isConnecting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Mic className="h-4 w-4 mr-2" />
            )}
            {isConnecting ? 'Connecting...' : 'Start Transcription'}
          </Button>
        )}
      </div>
    </div>
  );
}
