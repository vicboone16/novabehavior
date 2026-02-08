import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Video,
  X,
  PanelRightOpen,
  PanelRightClose,
  FileText,
} from 'lucide-react';
import { ZoomMeeting } from './ZoomMeeting';
import { WherebyMeeting } from './WherebyMeeting';
import { LiveTranscriptionPanel } from './LiveTranscriptionPanel';

type VideoProvider = 'zoom' | 'whereby';

interface TelehealthRoomProps {
  userName: string;
  userEmail?: string;
  studentName?: string;
  onClose?: () => void;
  onTranscriptSave?: (transcript: string) => void;
  // Pre-fill values
  defaultProvider?: VideoProvider;
  defaultMeetingNumber?: string;
  defaultRoomUrl?: string;
}

export function TelehealthRoom({
  userName,
  userEmail,
  studentName,
  onClose,
  onTranscriptSave,
  defaultProvider = 'zoom',
  defaultMeetingNumber,
  defaultRoomUrl,
}: TelehealthRoomProps) {
  const [provider, setProvider] = useState<VideoProvider>(defaultProvider);
  const [isInSession, setIsInSession] = useState(false);
  const [showTranscription, setShowTranscription] = useState(true);
  const [fullTranscript, setFullTranscript] = useState('');

  // Zoom fields
  const [meetingNumber, setMeetingNumber] = useState(defaultMeetingNumber || '');
  const [meetingPassword, setMeetingPassword] = useState('');
  const [zoomRole, setZoomRole] = useState<number>(1); // 1 = host

  // Whereby fields
  const [roomUrl, setRoomUrl] = useState(defaultRoomUrl || '');

  const handleStartSession = useCallback(() => {
    if (provider === 'zoom' && !meetingNumber.trim()) return;
    if (provider === 'whereby' && !roomUrl.trim()) return;
    setIsInSession(true);
  }, [provider, meetingNumber, roomUrl]);

  const handleEndSession = useCallback(() => {
    setIsInSession(false);
    if (fullTranscript && onTranscriptSave) {
      onTranscriptSave(fullTranscript);
    }
  }, [fullTranscript, onTranscriptSave]);

  const handleSaveTranscript = useCallback(() => {
    if (fullTranscript && onTranscriptSave) {
      onTranscriptSave(fullTranscript);
    }
  }, [fullTranscript, onTranscriptSave]);

  // Pre-session setup screen
  if (!isInSession) {
    return (
      <div className="flex items-center justify-center min-h-[500px] p-6">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5 text-primary" />
                Start Telehealth Session
              </CardTitle>
              {onClose && (
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {studentName && (
              <p className="text-sm text-muted-foreground">Session with {studentName}</p>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            <Tabs value={provider} onValueChange={(v) => setProvider(v as VideoProvider)}>
              <TabsList className="w-full">
                <TabsTrigger value="zoom" className="flex-1">Zoom</TabsTrigger>
                <TabsTrigger value="whereby" className="flex-1">Whereby</TabsTrigger>
              </TabsList>

              <TabsContent value="zoom" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="meeting-number">Meeting Number</Label>
                  <Input
                    id="meeting-number"
                    placeholder="Enter Zoom meeting number"
                    value={meetingNumber}
                    onChange={(e) => setMeetingNumber(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="meeting-password">Meeting Password (optional)</Label>
                  <Input
                    id="meeting-password"
                    placeholder="Enter meeting password"
                    value={meetingPassword}
                    onChange={(e) => setMeetingPassword(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-4">
                  <Label>Join as:</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={zoomRole === 1 ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setZoomRole(1)}
                    >
                      Host
                    </Button>
                    <Button
                      variant={zoomRole === 0 ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setZoomRole(0)}
                    >
                      Participant
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="whereby" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="room-url">Whereby Room URL</Label>
                  <Input
                    id="room-url"
                    placeholder="https://whereby.com/your-room"
                    value={roomUrl}
                    onChange={(e) => setRoomUrl(e.target.value)}
                  />
                </div>
              </TabsContent>
            </Tabs>

            <Button
              onClick={handleStartSession}
              className="w-full"
              disabled={
                (provider === 'zoom' && !meetingNumber.trim()) ||
                (provider === 'whereby' && !roomUrl.trim())
              }
            >
              <Video className="h-4 w-4 mr-2" />
              Join Session
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // In-session view
  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-card">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-sm font-medium">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            {provider === 'zoom' ? 'Zoom' : 'Whereby'} Session
            {studentName && <span className="text-muted-foreground ml-1">• {studentName}</span>}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowTranscription(!showTranscription)}
            title={showTranscription ? 'Hide transcription' : 'Show transcription'}
          >
            {showTranscription ? (
              <PanelRightClose className="h-4 w-4 mr-1" />
            ) : (
              <PanelRightOpen className="h-4 w-4 mr-1" />
            )}
            Transcript
          </Button>
          {fullTranscript && (
            <Button variant="outline" size="sm" onClick={handleSaveTranscript}>
              <FileText className="h-4 w-4 mr-1" />
              Save Notes
            </Button>
          )}
          <Button variant="destructive" size="sm" onClick={handleEndSession}>
            End Session
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Video area */}
        <div className={`flex-1 ${showTranscription ? 'w-2/3' : 'w-full'}`}>
          {provider === 'zoom' ? (
            <ZoomMeeting
              meetingNumber={meetingNumber}
              password={meetingPassword}
              userName={userName}
              userEmail={userEmail}
              role={zoomRole}
              onMeetingEnd={handleEndSession}
            />
          ) : (
            <WherebyMeeting
              roomUrl={roomUrl}
              displayName={userName}
              onMeetingEnd={handleEndSession}
            />
          )}
        </div>

        {/* Transcription sidebar */}
        {showTranscription && (
          <div className="w-80 min-w-[280px]">
            <LiveTranscriptionPanel
              onTranscriptUpdate={setFullTranscript}
            />
          </div>
        )}
      </div>
    </div>
  );
}
