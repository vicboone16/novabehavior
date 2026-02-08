import { useState } from 'react';

interface WherebyMeetingProps {
  roomUrl: string;
  displayName?: string;
  onMeetingEnd?: () => void;
}

export function WherebyMeeting({ roomUrl, displayName, onMeetingEnd }: WherebyMeetingProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  // Build the Whereby embed URL with parameters
  const embedUrl = new URL(roomUrl);
  if (displayName) {
    embedUrl.searchParams.set('displayName', displayName);
  }
  embedUrl.searchParams.set('minimal', 'true');
  embedUrl.searchParams.set('skipMediaPermissionPrompt', 'false');
  embedUrl.searchParams.set('chat', 'on');
  embedUrl.searchParams.set('screenshare', 'on');

  return (
    <div className="relative w-full h-full">
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Loading video room...</p>
          </div>
        </div>
      )}
      <iframe
        src={embedUrl.toString()}
        allow="camera; microphone; fullscreen; speaker; display-capture; compute-pressure"
        className="w-full h-full border-0 rounded-lg"
        onLoad={() => setIsLoaded(true)}
        title="Telehealth Video Session"
      />
    </div>
  );
}
