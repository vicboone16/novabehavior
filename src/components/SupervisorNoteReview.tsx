import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  User, 
  XCircle,
  RefreshCw,
  Search,
  Filter,
  ChevronDown,
  MessageSquare,
  Eye,
  Check,
  X,
  Edit2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { NOTE_TYPE_LABELS, NoteType } from './SessionNoteBuilder';

interface SessionNote {
  id: string;
  session_id: string;
  student_id: string;
  user_id: string;
  note_type: string;
  content: unknown;
  status: string;
  created_at: string;
  submitted_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_status: string | null;
  reviewer_comments: string | null;
  fidelity_met: boolean | null;
  last_edited_at: string | null;
  last_edited_by: string | null;
  // Joined data
  student_name?: string;
  author_name?: string;
  reviewer_name?: string;
}

type ReviewStatus = 'pending' | 'approved' | 'needs_revision' | 'rejected';

const REVIEW_STATUS_CONFIG: Record<ReviewStatus, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: 'Pending Review', color: 'bg-warning/20 text-warning-foreground', icon: Clock },
  approved: { label: 'Approved', color: 'bg-primary/20 text-primary', icon: CheckCircle2 },
  needs_revision: { label: 'Needs Revision', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: Edit2 },
  rejected: { label: 'Rejected', color: 'bg-destructive/20 text-destructive', icon: XCircle },
};

export function SupervisorNoteReview() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<SessionNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [noteTypeFilter, setNoteTypeFilter] = useState<string>('all');
  const [selectedNote, setSelectedNote] = useState<SessionNote | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>('approved');
  const [reviewerComments, setReviewerComments] = useState('');
  const [fidelityMet, setFidelityMet] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchNotes = async () => {
    setLoading(true);
    try {
      // Fetch notes with student and author info
      const { data: notesData, error } = await supabase
        .from('session_notes')
        .select('*')
        .neq('status', 'draft')
        .order('submitted_at', { ascending: false });

      if (error) throw error;

      // Fetch student names
      const studentIds = [...new Set(notesData?.map(n => n.student_id) || [])];
      const { data: studentsData } = await supabase
        .from('students')
        .select('id, name')
        .in('id', studentIds);

      // Fetch author names
      const userIds = [...new Set(notesData?.map(n => n.user_id) || [])];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, display_name, first_name, last_name')
        .in('user_id', userIds);

      // Fetch reviewer names
      const reviewerIds = [...new Set(notesData?.filter(n => n.reviewed_by).map(n => n.reviewed_by!) || [])];
      const { data: reviewersData } = reviewerIds.length > 0 
        ? await supabase.from('profiles').select('user_id, display_name, first_name, last_name').in('user_id', reviewerIds)
        : { data: [] };

      // Combine data
      const enrichedNotes = notesData?.map(note => ({
        ...note,
        student_name: studentsData?.find(s => s.id === note.student_id)?.name || 'Unknown',
        author_name: getDisplayName(profilesData?.find(p => p.user_id === note.user_id)),
        reviewer_name: note.reviewed_by ? getDisplayName(reviewersData?.find(p => p.user_id === note.reviewed_by)) : null,
      })) || [];

      setNotes(enrichedNotes);
    } catch (error) {
      console.error('Error fetching notes:', error);
      toast({ title: 'Error', description: 'Failed to load notes.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const getDisplayName = (profile: { display_name?: string | null; first_name?: string | null; last_name?: string | null } | undefined) => {
    if (!profile) return 'Unknown';
    if (profile.display_name) return profile.display_name;
    if (profile.first_name && profile.last_name) return `${profile.first_name} ${profile.last_name[0]}.`;
    if (profile.first_name) return profile.first_name;
    return 'Unknown';
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const filteredNotes = notes.filter(note => {
    const matchesSearch = searchQuery === '' || 
      note.student_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.author_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || note.review_status === statusFilter || 
      (statusFilter === 'pending' && !note.review_status);
    
    const matchesType = noteTypeFilter === 'all' || note.note_type === noteTypeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const pendingCount = notes.filter(n => !n.review_status || n.review_status === 'pending').length;

  const openReviewDialog = (note: SessionNote) => {
    setSelectedNote(note);
    setReviewStatus(note.review_status as ReviewStatus || 'approved');
    setReviewerComments(note.reviewer_comments || '');
    setFidelityMet(note.fidelity_met ?? true);
    setReviewDialogOpen(true);
  };

  const handleSubmitReview = async () => {
    if (!selectedNote || !user) return;
    
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('session_notes')
        .update({
          review_status: reviewStatus,
          reviewer_comments: reviewerComments || null,
          fidelity_met: fidelityMet,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', selectedNote.id);

      if (error) throw error;

      toast({
        title: 'Review Submitted',
        description: `Note marked as ${REVIEW_STATUS_CONFIG[reviewStatus].label}`,
      });

      setReviewDialogOpen(false);
      fetchNotes();
    } catch (error) {
      console.error('Error submitting review:', error);
      toast({ title: 'Error', description: 'Failed to submit review.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const renderNoteContent = (note: SessionNote) => {
    const content = note.content as Record<string, string>;
    
    return (
      <div className="space-y-3">
        {Object.entries(content).map(([key, value]) => {
          if (!value) return null;
          const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
          return (
            <div key={key}>
              <Label className="text-xs text-muted-foreground">{label}</Label>
              <p className="text-sm mt-0.5 whitespace-pre-wrap">{value}</p>
            </div>
          );
        })}
      </div>
    );
  };

  const getStatusBadge = (note: SessionNote) => {
    const status = (note.review_status || 'pending') as ReviewStatus;
    const config = REVIEW_STATUS_CONFIG[status];
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} text-xs`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Note Review
          </h2>
          <p className="text-sm text-muted-foreground">
            Review and approve session notes from staff
          </p>
        </div>
        {pendingCount > 0 && (
          <Badge variant="destructive">
            {pendingCount} Pending
          </Badge>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by student or author..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="needs_revision">Needs Revision</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={noteTypeFilter} onValueChange={setNoteTypeFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {(Object.keys(NOTE_TYPE_LABELS) as NoteType[]).map(type => (
                  <SelectItem key={type} value={type}>{NOTE_TYPE_LABELS[type]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={fetchNotes}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notes List */}
      <div className="space-y-3">
        {loading ? (
          <Card>
            <CardContent className="py-8 text-center">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground mt-2">Loading notes...</p>
            </CardContent>
          </Card>
        ) : filteredNotes.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <FileText className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No notes found matching your filters.</p>
            </CardContent>
          </Card>
        ) : (
          filteredNotes.map(note => (
            <Card key={note.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{note.student_name}</span>
                      <Badge variant="outline" className="text-xs">
                        {NOTE_TYPE_LABELS[note.note_type as NoteType] || note.note_type}
                      </Badge>
                      {getStatusBadge(note)}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {note.author_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {note.submitted_at ? format(new Date(note.submitted_at), 'MMM d, yyyy h:mm a') : 'Not submitted'}
                      </span>
                    </div>
                    {note.reviewed_at && note.reviewer_name && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <CheckCircle2 className="w-3 h-3" />
                        Reviewed by {note.reviewer_name} on {format(new Date(note.reviewed_at), 'MMM d, yyyy')}
                      </div>
                    )}
                    {note.reviewer_comments && (
                      <div className="mt-2 p-2 bg-muted rounded-md">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                          <MessageSquare className="w-3 h-3" />
                          Reviewer Comments
                        </div>
                        <p className="text-sm">{note.reviewer_comments}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openReviewDialog(note)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Review
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Review Note
            </DialogTitle>
            {selectedNote && (
              <DialogDescription>
                {selectedNote.student_name} • {NOTE_TYPE_LABELS[selectedNote.note_type as NoteType]} • 
                by {selectedNote.author_name}
              </DialogDescription>
            )}
          </DialogHeader>

          <ScrollArea className="flex-1 -mx-6 px-6">
            <Tabs defaultValue="content" className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value="content" className="flex-1">Note Content</TabsTrigger>
                <TabsTrigger value="review" className="flex-1">Review Actions</TabsTrigger>
              </TabsList>

              <TabsContent value="content" className="mt-4">
                {selectedNote && renderNoteContent(selectedNote)}
              </TabsContent>

              <TabsContent value="review" className="mt-4 space-y-4">
                <div>
                  <Label>Review Decision</Label>
                  <Select value={reviewStatus} onValueChange={(v) => setReviewStatus(v as ReviewStatus)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="approved">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-primary" />
                          Approved
                        </div>
                      </SelectItem>
                      <SelectItem value="needs_revision">
                        <div className="flex items-center gap-2">
                          <Edit2 className="w-4 h-4 text-orange-500" />
                          Needs Revision
                        </div>
                      </SelectItem>
                      <SelectItem value="rejected">
                        <div className="flex items-center gap-2">
                          <XCircle className="w-4 h-4 text-destructive" />
                          Rejected
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between py-3 px-4 bg-muted rounded-lg">
                  <div>
                    <Label>Fidelity Check</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Met fidelity expectations for documentation
                    </p>
                  </div>
                  <Switch
                    checked={fidelityMet}
                    onCheckedChange={setFidelityMet}
                  />
                </div>

                <div>
                  <Label htmlFor="reviewer-comments">
                    Comments {reviewStatus === 'needs_revision' && <span className="text-destructive">*</span>}
                  </Label>
                  <Textarea
                    id="reviewer-comments"
                    value={reviewerComments}
                    onChange={(e) => setReviewerComments(e.target.value)}
                    placeholder={
                      reviewStatus === 'needs_revision' 
                        ? 'Please specify what needs to be revised...'
                        : 'Optional feedback for the author...'
                    }
                    className="mt-1 min-h-[100px]"
                  />
                </div>
              </TabsContent>
            </Tabs>
          </ScrollArea>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitReview}
              disabled={submitting || (reviewStatus === 'needs_revision' && !reviewerComments.trim())}
            >
              {submitting ? (
                <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-1" />
              )}
              Submit Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
