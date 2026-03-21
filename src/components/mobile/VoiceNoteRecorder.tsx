import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, X, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getAccessToken } from '@/lib/novaAIFetch';
import { toast } from 'sonner';

interface VoiceNoteRecorderProps {
  studentId?: string;
  onClose: () => void;
  onSave?: (transcription: string) => void;
}

export function VoiceNoteRecorder({ studentId, onClose, onSave }: VoiceNoteRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(100);
      }
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast.error('Could not access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate([50, 50, 50]);
      }
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current || !audioUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleTranscribe = async () => {
    if (!audioBlob) return;

    setIsTranscribing(true);
    
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error('Your session expired. Please sign in again.');
      }

      const formData = new FormData();
      formData.append('audio', new File([audioBlob], 'recording.webm', { type: 'audio/webm' }));

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-transcribe`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: formData,
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'Transcription failed');
      
      const transcriptionText = data?.text || 'No speech detected';
      setTranscription(transcriptionText);
      toast.success('Transcription complete');
    } catch (error: any) {
      console.error('Transcription error:', error);
      toast.error(error?.message || 'Failed to transcribe audio');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleSave = () => {
    if (transcription && onSave) {
      onSave(transcription);
    }
    toast.success('Voice note saved');
    onClose();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base">Voice Note</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Recording Display */}
          <div className="flex flex-col items-center py-4">
            {isRecording ? (
              <>
                <div className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center animate-pulse">
                  <Mic className="w-8 h-8 text-destructive" />
                </div>
                <p className="text-2xl font-mono mt-4">{formatTime(recordingTime)}</p>
                <p className="text-sm text-muted-foreground">Recording...</p>
              </>
            ) : audioUrl ? (
              <>
                <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
                  {isPlaying ? (
                    <Pause className="w-8 h-8 text-primary" />
                  ) : (
                    <Play className="w-8 h-8 text-primary" />
                  )}
                </div>
                <p className="text-2xl font-mono mt-4">{formatTime(recordingTime)}</p>
                <p className="text-sm text-muted-foreground">Recording complete</p>
              </>
            ) : (
              <>
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                  <Mic className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground mt-4">Tap to start recording</p>
              </>
            )}
          </div>

          {/* Audio Element */}
          {audioUrl && (
            <audio 
              ref={audioRef} 
              src={audioUrl} 
              onEnded={() => setIsPlaying(false)}
              hidden
            />
          )}

          {/* Transcription */}
          {transcription && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-1">Transcription</p>
              <p className="text-sm text-muted-foreground">{transcription}</p>
            </div>
          )}

          {/* Controls */}
          <div className="flex gap-2 justify-center">
            {!isRecording && !audioUrl ? (
              <Button onClick={startRecording} size="lg" className="w-full">
                <Mic className="w-5 h-5 mr-2" />
                Start Recording
              </Button>
            ) : isRecording ? (
              <Button onClick={stopRecording} variant="destructive" size="lg" className="w-full">
                <Square className="w-5 h-5 mr-2" />
                Stop
              </Button>
            ) : (
              <div className="flex gap-2 w-full">
                <Button variant="outline" onClick={togglePlayback} className="flex-1">
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
                
                {!transcription && (
                  <Button 
                    variant="outline" 
                    onClick={handleTranscribe}
                    disabled={isTranscribing}
                    className="flex-1"
                  >
                    {isTranscribing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Transcribe'
                    )}
                  </Button>
                )}
                
                <Button onClick={handleSave} className="flex-1">
                  <Check className="w-4 h-4 mr-1" />
                  Save
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
