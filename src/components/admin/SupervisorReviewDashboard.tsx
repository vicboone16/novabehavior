import { useState, useEffect, useCallback } from 'react';
import { format, subDays } from 'date-fns';
import { 
  ClipboardCheck, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  User, 
  Clock,
  Filter,
  RefreshCw,
  MessageSquare,
  Flag,
  Eye,
  Edit2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { 
  EnhancedSessionNote, 
  SupervisorReview,
  ReviewOutcome,
  NOTE_TYPE_LABELS,
  REVIEW_OUTCOME_CONFIG,
} from '@/types/sessionNotes';
import { CoachEvidenceReviewPanel } from '@/components/admin/CoachEvidenceReviewPanel';
import { WeeklySnapshotReviewPanel } from '@/components/admin/WeeklySnapshotReviewPanel';

interface NoteWithReview {
  id: string;
  student_id: string;
  session_id?: string | null;
  note_type: string;
  author_user_id: string;
  author_role: string;
  start_time: string;
  end_time?: string | null;
  duration_minutes?: number | null;
  service_setting: string;
  location_detail?: string | null;
  status: string;
  created_at: string | null;
  updated_at: string | null;
  author_name?: string;
  student_name?: string;
  latest_review?: SupervisorReview;
}

export function SupervisorReviewDashboard() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<NoteWithReview[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('needs_review');
  const [staffFilter, setStaffFilter] = useState<string>('all');
  const [timeframeFilter, setTimeframeFilter] = useState<string>('30');
  
  // Staff list
  const [staffMembers, setStaffMembers] = useState<{ id: string; name: string }[]>([]);
  
  // Review dialog
  const [reviewingNote, setReviewingNote] = useState<NoteWithReview | null>(null);
  const [reviewOutcome, setReviewOutcome] = useState<ReviewOutcome>('approved');
  const [reviewComments, setReviewComments] = useState('');
  const [requiredAction, setRequiredAction] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const days = parseInt(timeframeFilter);
      const startDate = subDays(new Date(), days).toISOString();
      
      let query = supabase
        .from('enhanced_session_notes')
        .select('*')
        .eq('billable', true) // Only fetch billable notes for review
        .gte('created_at', startDate)
        .order('created_at', { ascending: false });

      // Filter by status
      if (statusFilter === 'needs_review') {
        query = query.eq('status', 'submitted');
      }

      if (staffFilter !== 'all') {
        query = query.eq('author_user_id', staffFilter);
      }

      const { data: notesData, error } = await query;
      if (error) throw error;

      // Fetch author names
      const authorIds = [...new Set((notesData || []).map(n => n.author_user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, first_name, last_name')
        .in('user_id', authorIds);

      // Fetch student names
      const studentIds = [...new Set((notesData || []).map(n => n.student_id))];
      const { data: students } = await supabase
        .from('students')
        .select('id, name')
        .in('id', studentIds);

      // Fetch reviews for these notes
      const noteIds = (notesData || []).map(n => n.id);
      const { data: reviews } = noteIds.length > 0 
        ? await supabase
            .from('supervisor_reviews')
            .select('*')
            .in('note_id', noteIds)
            .order('created_at', { ascending: false })
        : { data: [] };

      // Enrich notes
      const enrichedNotes: NoteWithReview[] = (notesData || []).map(note => {
        const profile = profiles?.find(p => p.user_id === note.author_user_id);
        const student = students?.find(s => s.id === note.student_id);
        const latestReview = reviews?.find(r => r.note_id === note.id);

        return {
          id: note.id,
          student_id: note.student_id,
          session_id: note.session_id,
          note_type: note.note_type,
          author_user_id: note.author_user_id,
          author_role: note.author_role,
          start_time: note.start_time,
          end_time: note.end_time,
          duration_minutes: note.duration_minutes,
          service_setting: note.service_setting || 'school',
          location_detail: note.location_detail,
          status: note.status,
          created_at: note.created_at,
          updated_at: note.updated_at,
          author_name: profile?.display_name || 
            `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Unknown',
          student_name: student?.name || 'Unknown',
          latest_review: latestReview as SupervisorReview | undefined,
        };
      });

      // Filter by review status if needed
      const filteredNotes = statusFilter === 'reviewed' 
        ? enrichedNotes.filter(n => n.latest_review)
        : statusFilter === 'flagged'
        ? enrichedNotes.filter(n => n.latest_review?.review_outcome === 'flagged')
        : statusFilter === 'needs_revision'
        ? enrichedNotes.filter(n => n.latest_review?.review_outcome === 'needs_revision')
        : enrichedNotes;

      setNotes(filteredNotes);

      // Get unique staff for filter
      const staffSet = new Map();
      enrichedNotes.forEach(n => {
        if (!staffSet.has(n.author_user_id)) {
          staffSet.set(n.author_user_id, n.author_name);
        }
      });
      setStaffMembers(Array.from(staffSet, ([id, name]) => ({ id, name })));

    } catch (error) {
      console.error('Error fetching notes:', error);
      toast({ title: 'Error', description: 'Failed to load notes', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [statusFilter, staffFilter, timeframeFilter]);

  const handleSubmitReview = async () => {
    if (!reviewingNote || !user) return;
    setSaving(true);

    try {
      await supabase
        .from('supervisor_reviews')
        .insert({
          note_id: reviewingNote.id,
          student_id: reviewingNote.student_id,
          author_user_id: reviewingNote.author_user_id,
          reviewer_user_id: user.id,
          review_outcome: reviewOutcome,
          comments: reviewComments || null,
          required_action: requiredAction || null,
        });

      // If approved, lock the note
      if (reviewOutcome === 'approved') {
        await supabase
          .from('enhanced_session_notes')
          .update({ 
            status: 'locked',
            locked_at: new Date().toISOString(),
            locked_by: user.id,
          })
          .eq('id', reviewingNote.id);
      }

      toast({ title: 'Review Submitted', description: 'Your review has been recorded.' });
      setReviewingNote(null);
      setReviewOutcome('approved');
      setReviewComments('');
      setRequiredAction('');
      fetchNotes();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const getReviewBadge = (note: NoteWithReview) => {
    if (!note.latest_review) {
      return (
        <Badge variant="outline" className="text-xs bg-amber-500/20 text-amber-700">
          <Clock className="w-3 h-3 mr-1" />
          Pending Review
        </Badge>
      );
    }
    const config = REVIEW_OUTCOME_CONFIG[note.latest_review.review_outcome as ReviewOutcome];
    return (
      <Badge className={`text-xs ${config.color}`}>
        {config.label}
      </Badge>
    );
  };

  const pendingCount = notes.filter(n => !n.latest_review).length;
  const reviewedCount = notes.filter(n => n.latest_review?.review_outcome === 'approved').length;
  const flaggedCount = notes.filter(n => 
    n.latest_review?.review_outcome === 'flagged' || 
    n.latest_review?.review_outcome === 'needs_revision'
  ).length;

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-primary" />
            Session Review
          </h2>
          <p className="text-sm text-muted-foreground">
            Review and audit submitted billable session notes
          </p>
        </div>
        <div className="flex gap-3">
          <div className="text-center px-4 py-2 bg-warning/10 rounded-lg">
            <p className="text-xl font-bold text-warning">{pendingCount}</p>
            <p className="text-xs text-warning/70">Pending</p>
          </div>
          <div className="text-center px-4 py-2 bg-primary/10 rounded-lg">
            <p className="text-xl font-bold text-primary">{reviewedCount}</p>
            <p className="text-xs text-primary/70">Approved</p>
          </div>
          <div className="text-center px-4 py-2 bg-destructive/10 rounded-lg">
            <p className="text-xl font-bold text-destructive">{flaggedCount}</p>
            <p className="text-xs text-destructive/70">Flagged</p>
          </div>
        </div>
      </div>

      {/* Weekly Snapshots for Review */}
      <CoachEvidenceReviewPanel />

      {/* Weekly Snapshots (Caregiver Summaries) for Review */}
      <WeeklySnapshotReviewPanel />

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3 items-center">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="needs_review">Needs Review</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
                <SelectItem value="needs_revision">Needs Revision</SelectItem>
                <SelectItem value="flagged">Flagged</SelectItem>
                <SelectItem value="all">All Notes</SelectItem>
              </SelectContent>
            </Select>

            <Select value={staffFilter} onValueChange={setStaffFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Staff" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Staff</SelectItem>
                {staffMembers.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={timeframeFilter} onValueChange={setTimeframeFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="60">Last 60 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={fetchNotes}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notes Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground mt-2">Loading notes...</p>
            </div>
          ) : notes.length === 0 ? (
            <div className="py-12 text-center">
              <CheckCircle2 className="w-10 h-10 mx-auto text-primary mb-3" />
              <p className="text-muted-foreground">No notes matching filters.</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>Note Type</TableHead>
                    <TableHead>Review Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notes.map(note => (
                    <TableRow key={note.id}>
                      <TableCell className="font-medium">
                        {format(new Date(note.start_time), 'MMM d, yyyy')}
                        <br />
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(note.start_time), 'h:mm a')}
                        </span>
                      </TableCell>
                      <TableCell>{note.student_name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3 text-muted-foreground" />
                          {note.author_name}
                        </div>
                        <span className="text-xs text-muted-foreground">{note.author_role}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {NOTE_TYPE_LABELS[note.note_type]}
                        </Badge>
                      </TableCell>
                      <TableCell>{getReviewBadge(note)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              setReviewingNote(note);
                              setReviewOutcome('approved');
                            }}
                          >
                            <ClipboardCheck className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={!!reviewingNote} onOpenChange={(open) => !open && setReviewingNote(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5" />
              Review Session Note
            </DialogTitle>
            <DialogDescription>
              {reviewingNote && (
                <>
                  {reviewingNote.student_name} • {format(new Date(reviewingNote.start_time), 'MMM d, yyyy')} • 
                  {NOTE_TYPE_LABELS[reviewingNote.note_type]}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <Label>Review Outcome</Label>
              <RadioGroup value={reviewOutcome} onValueChange={(v) => setReviewOutcome(v as ReviewOutcome)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="approved" id="approved" />
                  <Label htmlFor="approved" className="flex items-center gap-2 cursor-pointer">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    Approved
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="needs_revision" id="needs_revision" />
                  <Label htmlFor="needs_revision" className="flex items-center gap-2 cursor-pointer">
                    <Edit2 className="w-4 h-4 text-warning" />
                    Needs Revision
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="flagged" id="flagged" />
                  <Label htmlFor="flagged" className="flex items-center gap-2 cursor-pointer">
                    <Flag className="w-4 h-4 text-destructive" />
                    Flagged for Follow-up
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {(reviewOutcome === 'needs_revision' || reviewOutcome === 'flagged') && (
              <div className="space-y-2">
                <Label>Required Action</Label>
                <Select value={requiredAction} onValueChange={setRequiredAction}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select action..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="revise_note">RBT Revise Note</SelectItem>
                    <SelectItem value="bcba_followup">BCBA Follow-up</SelectItem>
                    <SelectItem value="training_needed">Training Needed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Comments (private)</Label>
              <Textarea
                value={reviewComments}
                onChange={(e) => setReviewComments(e.target.value)}
                placeholder="Internal comments about this review..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewingNote(null)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitReview} disabled={saving}>
              {saving ? 'Saving...' : 'Submit Review'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
