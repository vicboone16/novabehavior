import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  Package, CheckCircle2, AlertTriangle, Clock, Eye, XCircle,
  MessageSquare, ArrowRight, FileText, User, RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useWeeklySnapshots, WeeklySnapshotPacket, WeeklySnapshotItem } from '@/hooks/useWeeklySnapshots';

interface CoachEvidenceReviewPanelProps {
  onCountChange?: (count: number) => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: 'Pending Review', color: 'bg-amber-500/20 text-amber-700', icon: Clock },
  approved: { label: 'Approved', color: 'bg-primary/20 text-primary', icon: CheckCircle2 },
  follow_up: { label: 'Follow-up Needed', color: 'bg-warning/20 text-warning', icon: MessageSquare },
  rejected: { label: 'Rejected', color: 'bg-destructive/20 text-destructive', icon: XCircle },
};

export function CoachEvidenceReviewPanel({ onCountChange }: CoachEvidenceReviewPanelProps) {
  const {
    packets, loading,
    fetchPendingForReview, fetchItems,
    approveSnapshot, rejectSnapshot, requestFollowUp,
  } = useWeeklySnapshots();

  const [reviewingPacket, setReviewingPacket] = useState<WeeklySnapshotPacket | null>(null);
  const [packetItems, setPacketItems] = useState<WeeklySnapshotItem[]>([]);
  const [reviewAction, setReviewAction] = useState<'approved' | 'rejected' | 'follow_up'>('approved');
  const [reviewNotes, setReviewNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [coachNames, setCoachNames] = useState<Record<string, string>>({});
  const [studentNames, setStudentNames] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchPendingForReview();
  }, []);

  useEffect(() => {
    onCountChange?.(packets.length);
  }, [packets.length, onCountChange]);

  // Resolve coach and student names
  useEffect(() => {
    if (packets.length === 0) return;
    const coachIds = [...new Set(packets.map(p => p.coach_user_id))];
    const studentIds = [...new Set(packets.map(p => p.student_id))];

    supabase.from('profiles').select('user_id, display_name, first_name, last_name').in('user_id', coachIds)
      .then(({ data }) => {
        const map: Record<string, string> = {};
        (data || []).forEach(p => {
          map[p.user_id] = p.display_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown';
        });
        setCoachNames(map);
      });

    supabase.from('students').select('id, name').in('id', studentIds)
      .then(({ data }) => {
        const map: Record<string, string> = {};
        (data || []).forEach(s => { map[s.id] = s.name; });
        setStudentNames(map);
      });
  }, [packets]);

  const openReview = async (packet: WeeklySnapshotPacket) => {
    setReviewingPacket(packet);
    setReviewAction('approved');
    setReviewNotes('');
    try {
      const items = await fetchItems(packet.id);
      setPacketItems(items);
    } catch {
      setPacketItems([]);
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewingPacket) return;
    setSaving(true);
    try {
      if (reviewAction === 'approved') {
        await approveSnapshot(reviewingPacket.id, reviewNotes);
      } else if (reviewAction === 'rejected') {
        await rejectSnapshot(reviewingPacket.id, reviewNotes);
      } else {
        await requestFollowUp(reviewingPacket.id, reviewNotes);
      }
      setReviewingPacket(null);
      fetchPendingForReview();
    } catch (err: any) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-6 text-center">
        <RefreshCw className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground mt-2">Loading weekly snapshots...</p>
      </div>
    );
  }

  if (packets.length === 0) {
    return null;
  }

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm">Weekly Snapshots</span>
              <Badge variant="secondary">{packets.length}</Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={() => fetchPendingForReview()}>
              <RefreshCw className="w-3 h-3" />
            </Button>
          </div>
          <ScrollArea className="max-h-[300px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Learner</TableHead>
                  <TableHead>Coach</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {packets.map(packet => {
                  const cfg = STATUS_CONFIG[packet.status] || STATUS_CONFIG.pending;
                  const StatusIcon = cfg.icon;
                  return (
                    <TableRow key={packet.id}>
                      <TableCell className="text-sm">
                        {format(new Date(packet.submitted_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-sm">{studentNames[packet.student_id] || '—'}</TableCell>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3 text-muted-foreground" />
                          {coachNames[packet.coach_user_id] || '—'}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm font-medium max-w-[200px] truncate">
                        {packet.title}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${cfg.color}`}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {cfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => openReview(packet)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={!!reviewingPacket} onOpenChange={(open) => !open && setReviewingPacket(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Review Weekly Snapshot
            </DialogTitle>
            <DialogDescription>
              {reviewingPacket && (
                <>
                  {studentNames[reviewingPacket.student_id] || 'Learner'} •{' '}
                  Caregiver: {reviewingPacket.caregiver_name} •{' '}
                  {format(new Date(reviewingPacket.submitted_at), 'MMM d, yyyy')}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Snapshot summary */}
            <div className="rounded-lg border p-3 space-y-2">
              <p className="font-medium text-sm">{reviewingPacket?.title}</p>
              {reviewingPacket?.description && (
                <p className="text-xs text-muted-foreground">{reviewingPacket.description}</p>
              )}
              <div className="flex gap-3 text-xs text-muted-foreground">
                <span>Active time: {Math.round((reviewingPacket?.active_seconds || 0) / 60)} min</span>
                <span>Completions: {reviewingPacket?.completion_count || 0}</span>
                {reviewingPacket?.integrity_score != null && (
                  <span>Integrity: {reviewingPacket.integrity_score}%</span>
                )}
              </div>
            </div>

            {/* Evidence items */}
            {packetItems.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs">Evidence Items ({packetItems.length})</Label>
                <div className="space-y-1 max-h-[150px] overflow-y-auto">
                  {packetItems.map(item => (
                    <div key={item.id} className="flex items-center gap-2 p-2 rounded border text-xs">
                      <FileText className="w-3 h-3 text-muted-foreground shrink-0" />
                      <span className="font-medium">{item.label || item.item_type}</span>
                      <span className="text-muted-foreground truncate">
                        {JSON.stringify(item.payload).slice(0, 60)}...
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Review action */}
            <div className="space-y-3">
              <Label>Review Decision</Label>
              <RadioGroup value={reviewAction} onValueChange={(v) => setReviewAction(v as any)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="approved" id="ep-approved" />
                  <Label htmlFor="ep-approved" className="flex items-center gap-2 cursor-pointer">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    Approve — route to Caregiver Training
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="follow_up" id="ep-followup" />
                  <Label htmlFor="ep-followup" className="flex items-center gap-2 cursor-pointer">
                    <MessageSquare className="w-4 h-4 text-warning" />
                    Request Follow-up
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="rejected" id="ep-rejected" />
                  <Label htmlFor="ep-rejected" className="flex items-center gap-2 cursor-pointer">
                    <XCircle className="w-4 h-4 text-destructive" />
                    Reject
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Reviewer Notes</Label>
              <Textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Notes for the coach or internal record..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewingPacket(null)}>Cancel</Button>
            <Button onClick={handleSubmitReview} disabled={saving}>
              {saving ? 'Saving...' : 'Submit Review'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
