import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2, VideoOff } from 'lucide-react';
import { toast } from 'sonner';

interface ZoomMeetingProps {
  meetingNumber: string;
  password?: string;
  userName: string;
  userEmail?: string;
  role?: number; // 0 = attendee, 1 = host
  onMeetingEnd?: () => void;
}

export function ZoomMeeting({
  meetingNumber,
  password = '',
  userName,
  userEmail = '',
  role = 0,
  onMeetingEnd,
}: ZoomMeetingProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const clientRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isJoined, setIsJoined] = useState(false);

  const initAndJoin = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Dynamically import the embedded SDK
      const ZoomModule = await import('@zoom/meetingsdk/embedded');
      const ZoomMtgEmbedded = ZoomModule.default;

      const client = ZoomMtgEmbedded.createClient();
      clientRef.current = client;

      if (!containerRef.current) throw new Error('Container not ready');

      await client.init({
        zoomAppRoot: containerRef.current,
        language: 'en-US',
        patchJsMedia: true,
        leaveOnPageUnload: true,
      });

      // Get signature from edge function
      const { data, error: fnError } = await supabase.functions.invoke('zoom-signature', {
        body: { meetingNumber, role },
      });

      if (fnError || !data?.signature) {
        throw new Error(fnError?.message || 'Failed to generate meeting signature');
      }

      await client.join({
        signature: data.signature,
        sdkKey: data.sdkKey,
        meetingNumber,
        password,
        userName,
        userEmail,
      });

      setIsJoined(true);
      toast.success('Joined Zoom meeting');
    } catch (err: any) {
      console.error('Zoom join error:', err);
      setError(err.message || 'Failed to join meeting');
      toast.error('Failed to join Zoom meeting');
    } finally {
      setIsLoading(false);
    }
  }, [meetingNumber, password, userName, userEmail, role]);

  useEffect(() => {
    initAndJoin();

    return () => {
      if (clientRef.current) {
        try {
          clientRef.current.leaveMeeting();
        } catch {
          // Already left
        }
      }
    };
  }, [initAndJoin]);

  const handleLeave = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.leaveMeeting();
      setIsJoined(false);
      onMeetingEnd?.();
    }
  }, [onMeetingEnd]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
        <VideoOff className="h-12 w-12 text-muted-foreground" />
        <div>
          <p className="font-medium text-destructive">Failed to join meeting</p>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
        </div>
        <Button onClick={initAndJoin} variant="outline" size="sm">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Joining Zoom meeting...</p>
          </div>
        </div>
      )}
      <div ref={containerRef} className="w-full h-full" id="zoom-meeting-container" />
    </div>
  );
}
