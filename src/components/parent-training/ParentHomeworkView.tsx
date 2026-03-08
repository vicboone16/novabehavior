import { useState } from 'react';
import { Upload, FileText, CheckCircle2, Clock, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import type { ParentHomeworkItem, ParentAssignment } from '@/hooks/useParentTrainingParent';

interface Props {
  homework: ParentHomeworkItem[];
  assignments: ParentAssignment[];
  isLoading: boolean;
  onSubmit: (assignmentId: string, clientId: string, title: string, responseText?: string, fileUrl?: string, notes?: string) => Promise<any>;
  onRefetch: () => void;
}

const STATUS_BADGE: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  submitted: 'secondary',
  reviewed: 'default',
  resubmit: 'destructive',
};

export function ParentHomeworkView({ homework, assignments, isLoading, onSubmit, onRefetch }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState('');
  const [title, setTitle] = useState('');
  const [response, setResponse] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const activeAssignments = assignments.filter(a => a.status !== 'completed');

  const handleSubmit = async () => {
    if (!selectedAssignment || !title.trim()) {
      toast.error('Please select a module and add a title');
      return;
    }
    const assign = assignments.find(a => a.assignment_id === selectedAssignment);
    if (!assign) return;
    setSubmitting(true);
    try {
      await onSubmit(selectedAssignment, assign.client_id, title, response || undefined, undefined, notes || undefined);
      toast.success('Homework submitted! Your provider will review it.');
      setShowForm(false);
      setTitle('');
      setResponse('');
      setNotes('');
      setSelectedAssignment('');
      onRefetch();
    } catch (err: any) {
      toast.error('Failed to submit: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-12 text-muted-foreground">Loading homework…</div>;
  }

  return (
    <div className="space-y-4">
      {/* Submit new */}
      {activeAssignments.length > 0 && (
        <div>
          {!showForm ? (
            <Button variant="outline" className="gap-2" onClick={() => setShowForm(true)}>
              <Upload className="w-4 h-4" /> Submit Homework
            </Button>
          ) : (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Submit Homework</CardTitle>
                <CardDescription>Upload your response for your provider to review</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Module</label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={selectedAssignment}
                    onChange={e => setSelectedAssignment(e.target.value)}
                  >
                    <option value="">Select module…</option>
                    {activeAssignments.map(a => (
                      <option key={a.assignment_id} value={a.assignment_id}>
                        {a.module_title || 'Untitled'}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Title</label>
                  <Input placeholder="e.g. Week 2 Practice Log" value={title} onChange={e => setTitle(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Your Response</label>
                  <Textarea placeholder="Share what you practiced, observed, or learned…" value={response} onChange={e => setResponse(e.target.value)} rows={4} />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Notes (optional)</label>
                  <Input placeholder="Any questions for your provider?" value={notes} onChange={e => setNotes(e.target.value)} />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
                  <Button size="sm" onClick={handleSubmit} disabled={submitting}>
                    {submitting ? 'Submitting…' : 'Submit'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* History */}
      {homework.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-30" />
            <p className="text-muted-foreground font-medium">No homework submissions yet</p>
            <p className="text-xs text-muted-foreground mt-1">Submit your practice work for feedback from your provider.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">Submission History</h3>
          {homework.map(h => (
            <Card key={h.homework_id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-foreground">{h.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {new Date(h.submitted_at).toLocaleDateString()}
                    </p>
                    {h.response_text && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{h.response_text}</p>
                    )}
                    {h.reviewer_notes && (
                      <div className="mt-2 bg-primary/5 border border-primary/10 rounded-lg px-3 py-2">
                        <p className="text-xs font-medium text-primary flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" /> Provider Feedback
                        </p>
                        <p className="text-sm text-foreground mt-1">{h.reviewer_notes}</p>
                      </div>
                    )}
                  </div>
                  <Badge variant={STATUS_BADGE[h.review_status] || 'secondary'} className="text-xs capitalize shrink-0">
                    {h.review_status === 'submitted' ? 'Pending Review' : h.review_status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
