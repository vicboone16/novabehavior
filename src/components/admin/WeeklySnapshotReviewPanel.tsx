import { useState, useEffect } from 'react';
import {
  FileBarChart,
  CheckCircle2,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Calendar,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useWeeklySnapshotReview, WeeklySnapshot } from '@/hooks/useWeeklySnapshotReview';
import { format } from 'date-fns';

interface WeeklySnapshotReviewPanelProps {
  onCountChange?: (count: number) => void;
}

export function WeeklySnapshotReviewPanel({ onCountChange }: WeeklySnapshotReviewPanelProps) {
  const { snapshots, loading, fetchPendingSnapshots, reviewSnapshot } = useWeeklySnapshotReview();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchPendingSnapshots();
  }, [fetchPendingSnapshots]);

  useEffect(() => {
    onCountChange?.(snapshots.length);
  }, [snapshots.length, onCountChange]);

  const handleReview = async (snapshotId: string, decision: 'approved' | 'returned') => {
    setProcessing(true);
    const ok = await reviewSnapshot(snapshotId, decision, reviewComment || undefined);
    if (ok) {
      setReviewComment('');
      setExpandedId(null);
      fetchPendingSnapshots();
    }
    setProcessing(false);
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground py-4">Loading weekly snapshots…</p>;
  }

  if (snapshots.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <FileBarChart className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No weekly snapshots pending review</p>
          <p className="text-xs mt-1">Caregiver-submitted weekly summaries will appear here</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <FileBarChart className="h-4 w-4" /> Weekly Snapshots
          <Badge variant="outline" className="text-[10px]">{snapshots.length} pending</Badge>
        </h3>
      </div>

      {snapshots.map((snap) => {
        const isExpanded = expandedId === snap.id;
        return (
          <Card key={snap.id} className="border-l-4 border-l-amber-400">
            <CardHeader
              className="pb-2 cursor-pointer"
              onClick={() => {
                setExpandedId(isExpanded ? null : snap.id);
                setReviewComment('');
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    {snap.client_name || 'Learner'}
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5 flex items-center gap-1.5">
                    <Calendar className="h-3 w-3" />
                    Week of {format(new Date(snap.week_start), 'MMM d')} – {format(new Date(snap.week_end), 'MMM d, yyyy')}
                    <span className="text-muted-foreground/50">·</span>
                    Submitted {format(new Date(snap.created_at), 'MMM d, yyyy')}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    Pending Review
                  </Badge>
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </div>
            </CardHeader>

            {isExpanded && (
              <CardContent className="space-y-4">
                {/* Summary metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <MetricCard label="Behaviors Logged" value={snap.abc_count ?? snap.behavior_count} />
                  <MetricCard label="Frequency Total" value={snap.frequency_total} />
                  <MetricCard
                    label="Duration"
                    value={snap.duration_minutes_total ?? snap.total_duration_minutes}
                    suffix="min"
                  />
                  <MetricCard
                    label="Avg Intensity"
                    value={snap.intensity_avg ?? snap.avg_intensity}
                    suffix="/5"
                  />
                </div>

                {/* Tools & engagement */}
                {(snap.tools_used || snap.engagement) && (
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {snap.tools_used && Object.keys(snap.tools_used).length > 0 && (
                      <JsonFieldCard title="Tools Used" data={snap.tools_used} />
                    )}
                    {snap.engagement && Object.keys(snap.engagement).length > 0 && (
                      <JsonFieldCard title="Engagement" data={snap.engagement} />
                    )}
                  </div>
                )}

                {(snap.parent_notes || snap.notes) && (
                  <div className="text-xs">
                    <span className="text-muted-foreground font-medium">Caregiver Notes:</span>
                    <p className="mt-1">{snap.parent_notes || snap.notes}</p>
                  </div>
                )}

                {/* Review actions */}
                <div className="space-y-2 border-t pt-3">
                  <Label className="text-xs">Review Comment (optional)</Label>
                  <Textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Add feedback or notes about this snapshot…"
                    rows={2}
                    className="text-xs"
                  />
                  <div className="flex gap-2 justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={processing}
                      onClick={() => handleReview(snap.id, 'returned')}
                      className="gap-1 text-xs"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Return for Changes
                    </Button>
                    <Button
                      size="sm"
                      disabled={processing}
                      onClick={() => handleReview(snap.id, 'approved')}
                      className="gap-1 text-xs"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                    </Button>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function MetricCard({ label, value, suffix }: { label: string; value: number | null | undefined; suffix?: string }) {
  return (
    <div className="bg-muted/50 rounded p-2">
      <span className="text-muted-foreground">{label}</span>
      <p className="font-semibold text-sm">
        {value != null ? `${value}${suffix ? ` ${suffix}` : ''}` : '—'}
      </p>
    </div>
  );
}

function JsonFieldCard({ title, data }: { title: string; data: Record<string, any> }) {
  return (
    <div className="bg-muted/30 rounded p-2">
      <span className="text-muted-foreground font-medium">{title}</span>
      <div className="mt-1 space-y-0.5">
        {Object.entries(data).map(([key, val]) => (
          <div key={key} className="flex justify-between text-xs">
            <span className="capitalize">{key.replace(/_/g, ' ')}</span>
            <span className="font-medium">{String(val)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
