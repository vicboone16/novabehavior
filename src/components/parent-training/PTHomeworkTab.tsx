import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Eye, CheckCircle, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import type { PTHomework } from '@/hooks/useParentTrainingAdmin';
import { useProfileNameResolver, useClientNameResolver } from '@/hooks/useProfileNameResolver';

interface Props {
  homework: PTHomework[];
  isLoading: boolean;
  onRefresh: () => void;
  onReview: (id: string, notes: string, status: string) => Promise<void>;
}

export function PTHomeworkTab({ homework, isLoading, onRefresh, onReview }: Props) {
  const [viewItem, setViewItem] = useState<PTHomework | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');

  useEffect(() => { onRefresh(); }, [onRefresh]);

  const parentIds = useMemo(() => homework.map(h => h.parent_user_id).filter(Boolean), [homework]);
  const clientIds = useMemo(() => homework.map(h => h.client_id).filter(Boolean), [homework]);
  const { getName: getParentName } = useProfileNameResolver(parentIds);
  const { getName: getClientName } = useClientNameResolver(clientIds);

  const handleReview = async (status: string) => {
    if (!viewItem) return;
    try {
      await onReview(viewItem.homework_id, reviewNotes, status);
      setViewItem(null);
      setReviewNotes('');
      onRefresh();
    } catch {}
  };

  const statusColor = (s: string) => s === 'reviewed' ? 'default' : s === 'pending' ? 'secondary' : 'outline';

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Homework Review</h2>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Title</TableHead><TableHead>Caregiver</TableHead><TableHead>Client</TableHead><TableHead>Submitted</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
                : homework.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No homework submissions yet.</TableCell></TableRow>
                : homework.map(h => (
                  <TableRow key={h.homework_id}>
                    <TableCell className="font-medium">{h.title}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{getParentName(h.parent_user_id) || h.parent_user_id.slice(0, 8) + '…'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{getClientName(h.client_id) || h.client_id.slice(0, 8) + '…'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{format(new Date(h.submitted_at), 'MMM d, yyyy')}</TableCell>
                    <TableCell><Badge variant={statusColor(h.review_status) as any}>{h.review_status}</Badge></TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => { setViewItem(h); setReviewNotes(h.reviewer_notes || ''); }}><Eye className="w-4 h-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!viewItem} onOpenChange={v => { if (!v) setViewItem(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{viewItem?.title}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Response</Label>
              <p className="text-sm bg-muted/50 p-3 rounded-md mt-1 whitespace-pre-wrap">{viewItem?.response_text || 'No text response.'}</p>
            </div>
            {viewItem?.file_url && (
              <div>
                <Label className="text-xs text-muted-foreground">Attached File</Label>
                <a href={viewItem.file_url} target="_blank" rel="noreferrer" className="text-sm text-primary underline block mt-1">{viewItem.file_url.split('/').pop()}</a>
              </div>
            )}
            {viewItem?.notes && <div><Label className="text-xs text-muted-foreground">Parent Notes</Label><p className="text-sm mt-1">{viewItem.notes}</p></div>}
            <div><Label>Provider Feedback</Label><Textarea value={reviewNotes} onChange={e => setReviewNotes(e.target.value)} placeholder="Add feedback for the caregiver…" /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setViewItem(null)}>Close</Button>
              <Button variant="secondary" onClick={() => handleReview('needs_resubmission')} className="gap-1"><RotateCcw className="w-4 h-4" /> Request Resubmission</Button>
              <Button onClick={() => handleReview('reviewed')} className="gap-1"><CheckCircle className="w-4 h-4" /> Mark Reviewed</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
