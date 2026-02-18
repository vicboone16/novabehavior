import { useState } from 'react';
import { Users, LogIn, Clock, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { ActiveSharedSession, useSessionParticipants } from '@/hooks/useSessionParticipants';
import { useDataStore } from '@/store/dataStore';
import { useAuth } from '@/contexts/AuthContext';

interface JoinActiveSessionBannerProps {
  joinableSessions: ActiveSharedSession[];
  onJoined?: () => void;
}

function JoinSessionDialog({
  session,
  open,
  onOpenChange,
  onJoined,
}: {
  session: ActiveSharedSession;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onJoined?: () => void;
}) {
  const { user } = useAuth();
  const { joinSession } = useSessionParticipants(session.session_id);
  const { students, startSession } = useDataStore();
  const [joining, setJoining] = useState(false);

  const sessionStudents = students.filter(s => session.student_ids.includes(s.id));

  const handleJoin = async () => {
    if (!user) return;
    setJoining(true);
    try {
      await joinSession(session.student_ids, 'data_collector');
      // Sync local timer to this shared session
      startSession(undefined, session.session_id);
      toast.success(`Joined session started by ${session.started_by_name}`);
      onOpenChange(false);
      onJoined?.();
    } catch (e) {
      toast.error('Could not join session');
    } finally {
      setJoining(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Join Active Session
          </DialogTitle>
          <DialogDescription>
            {session.started_by_name} started a data collection session for{' '}
            {sessionStudents.length > 0
              ? sessionStudents.map(s => s.name).join(', ')
              : `${session.student_ids.length} student(s)`}
            {' '}{formatDistanceToNow(new Date(session.started_at), { addSuffix: true })}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Started by</span>
              <span className="font-medium">{session.started_by_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current participants</span>
              <Badge variant="secondary">{session.participant_count}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Students</span>
              <span className="font-medium text-right max-w-[60%]">
                {sessionStudents.length > 0
                  ? sessionStudents.map(s => s.name).join(', ')
                  : session.student_ids.length + ' student(s)'}
              </span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            By joining, you'll be able to collect data during this session. Your appointments for these students will remain separate. A note-writing assignment can be configured after the session ends.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Not Now
            </Button>
            <Button className="flex-1 gap-2" onClick={handleJoin} disabled={joining}>
              <LogIn className="w-4 h-4" />
              {joining ? 'Joining...' : 'Join Session'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function JoinActiveSessionBanner({ joinableSessions, onJoined }: JoinActiveSessionBannerProps) {
  const [selectedSession, setSelectedSession] = useState<ActiveSharedSession | null>(null);

  if (joinableSessions.length === 0) return null;

  return (
    <>
      <Card className="border-primary/30 bg-primary/5 shadow-none">
        <CardContent className="p-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
              <Users className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                {joinableSessions.length === 1
                  ? 'Active session in progress'
                  : `${joinableSessions.length} active sessions in progress`}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                A colleague is collecting data for students assigned to you.
              </p>
              <div className="mt-2 space-y-1.5">
                {joinableSessions.map(session => (
                  <button
                    key={session.session_id}
                    className="w-full text-left flex items-center justify-between rounded-md bg-background border border-border px-3 py-2 text-sm hover:bg-muted/50 transition-colors group"
                    onClick={() => setSelectedSession(session)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">
                        By <strong>{session.started_by_name}</strong>
                        {' · '}
                        {formatDistanceToNow(new Date(session.started_at), { addSuffix: true })}
                      </span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedSession && (
        <JoinSessionDialog
          session={selectedSession}
          open={!!selectedSession}
          onOpenChange={v => { if (!v) setSelectedSession(null); }}
          onJoined={onJoined}
        />
      )}
    </>
  );
}
