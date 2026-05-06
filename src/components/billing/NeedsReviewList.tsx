import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAgencyContext } from '@/hooks/useAgencyContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Loader2, Clock, CheckCircle2, FileText, AlertTriangle, PenLine, ShieldCheck } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
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
  student_name?: string;
}

interface SessionNote {
  id: string;
  session_id: string;
  content: any;
  status: string;
  review_status: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  reviewer_comments: string | null;
  created_at: string;
}

export function NeedsReviewList() {
  const { user, userRole } = useAuth();
  const { currentAgency } = useAgencyContext();
  const queryClient = useQueryClient();
  const [selectedEntry, setSelectedEntry] = useState<TimeEntry | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [cosignComment, setCosignComment] = useState('');

  // Auth options for the selected entry's student
  const [studentAuthOptions, setStudentAuthOptions] = useState<Array<{
    id: string; auth_number: string; payer_name: string; units_remaining: number | null;
  }>>([]);

  // Supervisors (admin/super_admin) see all agency entries; staff see their own
  const isSupervisor = userRole === 'admin' || userRole === 'super_admin';

  // Editable fields for the detail drawer
  const [authId, setAuthId] = useState('');
  const [cptCode, setCptCode] = useState('');
  const [modifier, setModifier] = useState('');
  const [forceBillable, setForceBillable] = useState<boolean | null>(null);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['needs-review-entries', user?.id, isSupervisor, currentAgency?.id],
    queryFn: async () => {
      let query = supabase
        .from('time_entries')
        .select('*, students(first_name, last_name)')
        .in('status', ['draft', 'reserved'])
        .not('ended_at', 'is', null)
        .order('started_at', { ascending: false });

      if (isSupervisor && currentAgency?.id) {
        query = query.eq('agency_id', currentAgency.id);
      } else {
        query = query.eq('user_id', user!.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      return ((data || []) as any[]).map(row => ({
        ...row,
        student_name: row.students
          ? `${row.students.first_name ?? ''} ${row.students.last_name ?? ''}`.trim()
          : null,
      })) as TimeEntry[];
    },
    enabled: !!user,
  });

  // Batch review-status for all list entries (drives badges)
  const sessionIds = entries.map(e => e.session_id).filter(Boolean) as string[];
  const { data: noteStatusMap = {} } = useQuery<Record<string, string | null>>({
    queryKey: ['note-review-status', sessionIds.join(',')],
    queryFn: async () => {
      if (sessionIds.length === 0) return {};
      const { data } = await supabase
        .from('session_notes')
        .select('session_id, review_status')
        .in('session_id', sessionIds);
      const map: Record<string, string | null> = {};
      for (const row of data ?? []) map[row.session_id] = row.review_status;
      return map;
    },
    enabled: sessionIds.length > 0,
  });

  // Load full session note when entry is selected
  const { data: sessionNote, isLoading: noteLoading } = useQuery({
    queryKey: ['session-note', selectedEntry?.session_id],
    queryFn: async () => {
      if (!selectedEntry?.session_id) return null;
      const { data, error } = await supabase
        .from('session_notes')
        .select('id, session_id, content, status, review_status, reviewed_by, reviewed_at, reviewer_comments, created_at')
        .eq('session_id', selectedEntry.session_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as SessionNote | null;
    },
    enabled: !!selectedEntry?.session_id && detailOpen,
  });

  // Co-sign mutation: mark note as approved by the current supervisor
  const cosignNote = useMutation({
    mutationFn: async ({ noteId, comment }: { noteId: string; comment: string }) => {
      const { error } = await supabase
        .from('session_notes')
        .update({
          review_status: 'approved',
          reviewed_by: user!.id,
          reviewed_at: new Date().toISOString(),
          reviewer_comments: comment || null,
        })
        .eq('id', noteId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Note co-signed and approved');
      setCosignComment('');
      queryClient.invalidateQueries({ queryKey: ['session-note', selectedEntry?.session_id] });
      queryClient.invalidateQueries({ queryKey: ['note-review-status'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Co-sign failed');
    },
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

      // Step 1: Finalize & post session
      const { data, error } = await supabase.rpc('rpc_finalize_and_post_session', params);
      if (error) throw error;
      const result = data as any;
      if (!result?.ok) {
        throw new Error(result?.error || 'Unknown error from finalize RPC');
      }

      // Step 2: Add to timesheet
      const { data: tsResult, error: tsError } = await supabase.rpc('rpc_add_time_entry_to_timesheet', {
        p_time_entry_id: entry.id,
      });
      if (tsError) console.warn('Timesheet add warning:', tsError.message);
      const tsData = tsResult as any;

      // Step 3: Recalc timesheet totals
      if (tsData?.ok && tsData?.timesheet_id) {
        const { error: recalcErr } = await supabase.rpc('rpc_recalc_timesheet_totals', {
          p_timesheet_id: tsData.timesheet_id,
        });
        if (recalcErr) console.warn('Timesheet recalc warning:', recalcErr.message);
      }

      return { ...result, timesheet_added: tsData?.ok ?? false };
    },
    onSuccess: (result) => {
      const msg = `Posted: ${result.rounded_minutes} min (${result.units_hours} hrs)`;
      const suffix = result.timesheet_added ? ' · Added to timesheet' : '';
      const claimSuffix = result.billable ? ' · Ready for Claim' : '';
      toast.success(msg + claimSuffix + suffix);
      setDetailOpen(false);
      setSelectedEntry(null);
      queryClient.invalidateQueries({ queryKey: ['needs-review-entries'] });
      queryClient.invalidateQueries({ queryKey: ['ready-for-claim'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to finalize & post');
    },
  });

  const bulkFinalize = useMutation({
    mutationFn: async (ids: string[]) => {
      const targets = entries.filter(e => ids.includes(e.id) && e.session_id);
      const results = await Promise.allSettled(
        targets.map(entry =>
          supabase.rpc('rpc_finalize_and_post_session', {
            p_session_id: entry.session_id!,
          })
        )
      );
      const failed = results.filter(r => r.status === 'rejected').length;
      return { total: targets.length, failed };
    },
    onSuccess: ({ total, failed }) => {
      if (failed === 0) {
        toast.success(`${total} entr${total !== 1 ? 'ies' : 'y'} finalized and posted`);
      } else {
        toast.warning(`${total - failed} posted, ${failed} failed — check individually`);
      }
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['needs-review-entries'] });
      queryClient.invalidateQueries({ queryKey: ['ready-for-claim'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Bulk finalize failed');
    },
  });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedIds(prev =>
      prev.size === entries.length ? new Set() : new Set(entries.map(e => e.id))
    );
  };

  const openDetail = (entry: TimeEntry) => {
    setSelectedEntry(entry);
    setAuthId(entry.authorization_id || '');
    setCptCode(entry.cpt_code || '');
    setModifier(entry.modifier || '');
    setForceBillable(null);
    setCosignComment('');
    setDetailOpen(true);
    // Load active auths for this student
    if (entry.student_id) {
      supabase
        .from('authorizations')
        .select('id, auth_number, units_remaining, payer:payers(name)')
        .eq('student_id', entry.student_id)
        .eq('status', 'active')
        .gte('end_date', new Date().toISOString().slice(0, 10))
        .order('end_date', { ascending: true })
        .then(({ data }) => {
          setStudentAuthOptions((data ?? []).map((a: any) => ({
            id: a.id,
            auth_number: a.auth_number,
            payer_name: a.payer?.name ?? '',
            units_remaining: a.units_remaining,
          })));
        });
    } else {
      setStudentAuthOptions([]);
    }
  };

  // Finalize is blocked until the note is co-signed (or no note exists)
  const noteApproved = !sessionNote || sessionNote.review_status === 'approved';
  const canFinalize = !!selectedEntry?.session_id && noteApproved;

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
            {isSupervisor ? 'All staff entries' : 'Your entries'} awaiting finalization and posting. {entries.length} item{entries.length !== 1 ? 's' : ''} pending.
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
              {/* Bulk action bar */}
              <div className="flex items-center gap-3 pb-2 border-b">
                <button
                  onClick={toggleAll}
                  className="text-xs text-muted-foreground hover:text-foreground underline"
                >
                  {selectedIds.size === entries.length ? 'Deselect all' : 'Select all'}
                </button>
                {selectedIds.size > 0 && (
                  <>
                    <span className="text-xs text-muted-foreground">{selectedIds.size} selected</span>
                    <Button
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => bulkFinalize.mutate(Array.from(selectedIds))}
                      disabled={bulkFinalize.isPending}
                    >
                      {bulkFinalize.isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                      Finalize &amp; Post {selectedIds.size}
                    </Button>
                  </>
                )}
              </div>

              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="w-full p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors flex items-center gap-3"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(entry.id)}
                    onChange={() => toggleSelect(entry.id)}
                    onClick={e => e.stopPropagation()}
                    className="h-4 w-4 rounded border-border cursor-pointer"
                  />
                  <button
                    onClick={() => openDetail(entry)}
                    className="flex-1 text-left flex items-center justify-between gap-4 min-w-0"
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
                      {entry.student_name
                        ? <span className="truncate font-medium">{entry.student_name}</span>
                        : entry.student_id && <span className="truncate text-muted-foreground">{entry.student_id.slice(0, 8)}…</span>
                      }
                      {entry.cpt_code && <span className="font-mono">{entry.cpt_code}</span>}
                      {entry.session_id && noteStatusMap[entry.session_id] !== 'approved' && noteStatusMap[entry.session_id] !== undefined && (
                        <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                          <PenLine className="h-3 w-3" />Co-sign needed
                        </span>
                      )}
                    </div>
                    {entry.note && typeof entry.note === 'object' && (entry.note as any)?.quick_summary && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {(entry.note as any).quick_summary}
                      </p>
                    )}
                  </div>
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  </button>
                </div>
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

                {/* Co-sign section */}
                {sessionNote && isSupervisor && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <p className="text-sm font-medium flex items-center gap-2">
                        <PenLine className="h-4 w-4" />
                        Supervisor Co-sign
                      </p>
                      {sessionNote.review_status === 'approved' ? (
                        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
                          <ShieldCheck className="h-4 w-4 shrink-0" />
                          <span>
                            Co-signed{sessionNote.reviewed_at
                              ? ` on ${format(new Date(sessionNote.reviewed_at), 'MMM d, yyyy')}`
                              : ''}
                            {sessionNote.reviewer_comments && ` — "${sessionNote.reviewer_comments}"`}
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="p-2 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            Note requires supervisor co-sign before billing can be finalized.
                          </div>
                          <Textarea
                            placeholder="Optional co-sign comment…"
                            value={cosignComment}
                            onChange={e => setCosignComment(e.target.value)}
                            className="text-sm min-h-[60px]"
                          />
                          <Button
                            variant="secondary"
                            size="sm"
                            className="gap-2"
                            onClick={() => cosignNote.mutate({ noteId: sessionNote.id, comment: cosignComment })}
                            disabled={cosignNote.isPending}
                          >
                            {cosignNote.isPending
                              ? <Loader2 className="h-3 w-3 animate-spin" />
                              : <ShieldCheck className="h-3 w-3" />}
                            Co-sign &amp; Approve
                          </Button>
                        </div>
                      )}
                    </div>
                  </>
                )}

                <Separator />

                {/* Editable Fields */}
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="auth_id" className="text-sm">Authorization (optional)</Label>
                    {studentAuthOptions.length > 0 ? (
                      <select
                        id="auth_id"
                        value={authId}
                        onChange={e => setAuthId(e.target.value)}
                        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="">— no authorization —</option>
                        {studentAuthOptions.map(a => (
                          <option key={a.id} value={a.id}>
                            {a.auth_number} · {a.payer_name}
                            {a.units_remaining !== null ? ` · ${a.units_remaining} units left` : ''}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        id="auth_id"
                        placeholder="Auth UUID (no active auths found)"
                        value={authId}
                        onChange={e => setAuthId(e.target.value)}
                        className="mt-1"
                      />
                    )}
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

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            {!canFinalize && !finalizeAndPost.isPending && (
              <p className="text-xs text-amber-600 flex items-center gap-1 sm:mr-auto">
                <AlertTriangle className="h-3 w-3" />
                Co-sign the note above before finalizing.
              </p>
            )}
            <Button variant="outline" onClick={() => setDetailOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => selectedEntry && finalizeAndPost.mutate(selectedEntry)}
              disabled={finalizeAndPost.isPending || !canFinalize}
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
