import { useState } from 'react';
import { FileText, User, Users, Crown, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { SessionParticipant, NoteDelegateMethod, useSessionParticipants } from '@/hooks/useSessionParticipants';
import { useAuth } from '@/contexts/AuthContext';

interface NoteDelegationPanelProps {
  sessionId: string;
  /** Whether the current user is a BCBA/supervisor who can assign the delegate */
  canAssign?: boolean;
}

function participantLabel(p: SessionParticipant) {
  return p.display_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Staff';
}

function roleLabel(role: string) {
  if (role === 'lead') return 'Lead';
  if (role === 'observer') return 'Observer';
  return 'Data Collector';
}

export function NoteDelegationPanel({ sessionId, canAssign = false }: NoteDelegationPanelProps) {
  const { user } = useAuth();
  const { participants, noteDelegate, claimNoteDelegate, assignNoteDelegate, loading } = useSessionParticipants(sessionId);
  const [busy, setBusy] = useState(false);

  const handleClaim = async () => {
    setBusy(true);
    await claimNoteDelegate();
    setBusy(false);
  };

  const handleAssign = async (targetUserId: string, method: NoteDelegateMethod) => {
    setBusy(true);
    await assignNoteDelegate(targetUserId, method);
    setBusy(false);
  };

  const iAmDelegate = noteDelegate?.user_id === user?.id;

  if (loading || participants.length === 0) return null;

  return (
    <Card className="shadow-none border-border">
      <CardHeader className="pb-3 pt-4 px-4">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          Session Participants &amp; Note Assignment
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {/* Participants list */}
        <div className="space-y-1.5">
          {participants.map(p => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-sm"
            >
              <div className="flex items-center gap-2 min-w-0">
                <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="font-medium truncate">{participantLabel(p)}</span>
                <Badge variant="outline" className="text-[10px] px-1 h-4">
                  {roleLabel(p.role)}
                </Badge>
                {p.note_delegate && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge className="text-[10px] px-1 h-4 bg-secondary text-secondary-foreground border-border hover:bg-secondary">
                        <Crown className="w-2.5 h-2.5 mr-0.5" />
                        Note writer
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>This staff member is responsible for writing the clinical note</TooltipContent>
                  </Tooltip>
                )}
              </div>
              {/* BCBA can reassign the note to anyone */}
              {canAssign && !p.note_delegate && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs px-2"
                  disabled={busy}
                  onClick={() => handleAssign(p.user_id, 'bcba_assigned')}
                >
                  Assign note
                </Button>
              )}
            </div>
          ))}
        </div>

        {/* Action area */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Anyone can claim the note */}
          {!noteDelegate && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              disabled={busy}
              onClick={handleClaim}
            >
              <Crown className="w-3.5 h-3.5" />
              {iAmDelegate ? "You're the note writer" : 'Claim note writing'}
            </Button>
          )}

          {noteDelegate && !iAmDelegate && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Crown className="w-3 h-3 text-primary" />
              Note assigned to <strong>{participantLabel(noteDelegate)}</strong>
            </p>
          )}

          {noteDelegate && iAmDelegate && (
            <div className="flex items-center gap-2">
              <Badge className="gap-1 bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">
                <Crown className="w-3 h-3" />
                {"You're writing the note"}
              </Badge>
              {/* Starter or BCBA can reassign */}
              {(canAssign || participants[0]?.user_id === user?.id) && participants.length > 1 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 text-xs px-2 gap-1">
                      Reassign <ChevronDown className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuLabel className="text-xs">Assign note to</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {participants
                      .filter(p => p.user_id !== user?.id)
                      .map(p => (
                        <DropdownMenuItem
                          key={p.user_id}
                          onClick={() => handleAssign(p.user_id, canAssign ? 'bcba_assigned' : 'starter')}
                        >
                          <Users className="w-3.5 h-3.5 mr-2" />
                          {participantLabel(p)}
                        </DropdownMenuItem>
                      ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
