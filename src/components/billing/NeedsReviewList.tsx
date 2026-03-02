import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Loader2, Clock, CheckCircle2, FileText, AlertTriangle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TimeEntry {
  id: string;
  session_id: string | null;
  student_id: string | null;
  agency_id: string | null;
  appointment_id: string | null;
  authorization_id: string | null;
  cpt_code: string | null;
  modifier: string | null;
  activity_type: string;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  is_billable: boolean;
  status: string;
  note: any;
  entry_kind: string;
}

interface SessionNote {
  id: string;
  session_id: string;
  content: any;
  status: string;
  created_at: string;
}

export function NeedsReviewList() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedEntry, setSelectedEntry] = useState<TimeEntry | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Editable fields for the detail drawer
  const [authId, setAuthId] = useState('');
  const [cptCode, setCptCode] = useState('');
  const [modifier, setModifier] = useState('');
  const [forceBillable, setForceBillable] = useState<boolean | null>(null);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['needs-review-entries', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', user!.id)
        .in('status', ['draft', 'reserved'])
        .not('ended_at', 'is', null)
        .order('started_at', { ascending: false });
      if (error) throw error;
      return (data || []) as TimeEntry[];
    },
    enabled: !!user,
  });

  // Load session note when entry is selected
  const { data: sessionNote, isLoading: noteLoading } = useQuery({
    queryKey: ['session-note', selectedEntry?.session_id],
    queryFn: async () => {
      if (!selectedEntry?.session_id) return null;
      const { data, error } = await supabase
        .from('session_notes')
        .select('*')
        .eq('session_id', selectedEntry.session_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as SessionNote | null;
    },
    enabled: !!selectedEntry?.session_id && detailOpen,
  });

  // Load student name
  const { data: student } = useQuery({
    queryKey: ['student-name', selectedEntry?.student_id],
    queryFn: async () => {
      if (!selectedEntry?.student_id) return null;
      const { data } = await supabase
        .from('students')
        .select('id, first_name, last_name')
        .eq('id', selectedEntry.student_id)
        .maybeSingle();
      return data;
    },
    enabled: !!selectedEntry?.student_id && detailOpen,
  });

  const finalizeAndPost = useMutation({
    mutationFn: async (entry: TimeEntry) => {
      if (!entry.session_id) {
        throw new Error('No session linked to this time entry. Cannot finalize.');
      }
      const params: { p_session_id: string; p_authorization_id?: string; p_force_billable?: boolean } = {
        p_session_id: entry.session_id,
      };
      if (authId.trim()) params.p_authorization_id = authId.trim();
      if (forceBillable !== null) params.p_force_billable = forceBillable;

      const { data, error } = await supabase.rpc('rpc_finalize_and_post_session', params);
      if (error) throw error;
      const result = data as any;
      if (!result?.ok) {
        throw new Error(result?.error || 'Unknown error from finalize RPC');
      }
      return result;
    },
    onSuccess: (result) => {
      toast.success(`Posted: ${result.rounded_minutes} min (${result.units_hours} hrs)${result.billable ? ' — Ready for Claim' : ''}`);
      setDetailOpen(false);
      setSelectedEntry(null);
      queryClient.invalidateQueries({ queryKey: ['needs-review-entries'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to finalize & post');
    },
  });

  const openDetail = (entry: TimeEntry) => {
    setSelectedEntry(entry);
    setAuthId(entry.authorization_id || '');
    setCptCode(entry.cpt_code || '');
    setModifier(entry.modifier || '');
    setForceBillable(null);
    setDetailOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Needs Review
          </CardTitle>
          <CardDescription>
            Time entries awaiting finalization and posting. {entries.length} item{entries.length !== 1 ? 's' : ''} pending.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>All caught up — no entries need review.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {entries.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => openDetail(entry)}
                  className="w-full text-left p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors flex items-center justify-between gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm truncate">
                        {entry.activity_type || 'Session'}
                      </span>
                      <Badge variant={entry.status === 'reserved' ? 'secondary' : 'outline'} className="text-xs">
                        {entry.status}
                      </Badge>
                      {entry.is_billable && (
                        <Badge variant="default" className="text-xs">Billable</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground flex gap-3 flex-wrap">
                      <span>{format(new Date(entry.started_at), 'MMM d, yyyy · h:mm a')}</span>
                      <span>{entry.duration_minutes ?? '—'} min</span>
                      {entry.student_id && <span className="truncate">Client: {entry.student_id.slice(0, 8)}…</span>}
                    </div>
                    {entry.note && typeof entry.note === 'object' && (entry.note as any)?.quick_summary && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {(entry.note as any).quick_summary}
                      </p>
                    )}
                  </div>
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail / Finalize Dialog */}
      <Dialog open={detailOpen} onOpenChange={(v) => { setDetailOpen(v); if (!v) setSelectedEntry(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Finalize & Post</DialogTitle>
            <DialogDescription>
              Review the entry, optionally link an authorization, then post.
            </DialogDescription>
          </DialogHeader>

          {selectedEntry && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 pr-2">
                {/* Entry Summary */}
                <div className="space-y-1">
                  <p className="text-sm font-medium">Time Entry</p>
                  <div className="text-sm text-muted-foreground space-y-0.5">
                    <p>Activity: {selectedEntry.activity_type}</p>
                    <p>Date: {format(new Date(selectedEntry.started_at), 'MMM d, yyyy · h:mm a')}</p>
                    <p>Duration: {selectedEntry.duration_minutes ?? '—'} min</p>
                    <p>Kind: {selectedEntry.entry_kind}</p>
                    {student && <p>Client: {student.first_name} {student.last_name}</p>}
                  </div>
                </div>

                {/* Quick Summary */}
                {selectedEntry.note && typeof selectedEntry.note === 'object' && (selectedEntry.note as any)?.quick_summary && (
                  <>
                    <Separator />
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Quick Summary</p>
                      <p className="text-sm text-muted-foreground">{(selectedEntry.note as any).quick_summary}</p>
                    </div>
                  </>
                )}

                {/* Session Note */}
                {selectedEntry.session_id && (
                  <>
                    <Separator />
                    <div className="space-y-1">
                      <p className="text-sm font-medium flex items-center gap-2">
                        Session Note
                        {noteLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                      </p>
                      {sessionNote ? (
                        <div className="text-sm text-muted-foreground">
                          <Badge variant="outline" className="mb-1">{sessionNote.status}</Badge>
                          <p className="mt-1">
                            {typeof sessionNote.content === 'string'
                              ? sessionNote.content.slice(0, 300)
                              : JSON.stringify(sessionNote.content)?.slice(0, 300)}
                            {sessionNote.content && String(sessionNote.content).length > 300 ? '…' : ''}
                          </p>
                        </div>
                      ) : (
                        !noteLoading && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" /> No session note found.
                          </p>
                        )
                      )}
                    </div>
                  </>
                )}

                {!selectedEntry.session_id && (
                  <>
                    <Separator />
                    <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                      <span>This time entry has no linked session. It must be converted to a session before it can be finalized.</span>
                    </div>
                  </>
                )}

                <Separator />

                {/* Editable Fields */}
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="auth_id" className="text-sm">Authorization ID (optional)</Label>
                    <Input
                      id="auth_id"
                      placeholder="UUID or leave empty"
                      value={authId}
                      onChange={(e) => setAuthId(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="cpt" className="text-sm">CPT Code</Label>
                      <Input
                        id="cpt"
                        placeholder="e.g. 97153"
                        value={cptCode}
                        onChange={(e) => setCptCode(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="mod" className="text-sm">Modifier</Label>
                      <Input
                        id="mod"
                        placeholder="e.g. HO"
                        value={modifier}
                        onChange={(e) => setModifier(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm">Override Billable Status</Label>
                      <p className="text-xs text-muted-foreground">Force this entry to be billable or non-billable.</p>
                    </div>
                    <Switch
                      checked={forceBillable ?? selectedEntry.is_billable}
                      onCheckedChange={(v) => setForceBillable(v)}
                    />
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => selectedEntry && finalizeAndPost.mutate(selectedEntry)}
              disabled={finalizeAndPost.isPending || !selectedEntry?.session_id}
            >
              {finalizeAndPost.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Finalize & Post
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
