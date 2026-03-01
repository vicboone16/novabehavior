import { useState, useEffect } from 'react';
import { FileBarChart, CheckCircle2, XCircle, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useParentSummaryPackets, ParentSummaryPacket } from '@/hooks/useParentSummaryPackets';
import { useAgencyContext } from '@/hooks/useAgencyContext';
import { format } from 'date-fns';

export function ParentSummaryReviewPanel() {
  const { packets, loading, fetchPendingForReview, reviewPacket } = useParentSummaryPackets();
  const { currentAgency } = useAgencyContext();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (currentAgency) {
      fetchPendingForReview(currentAgency.id);
    }
  }, [currentAgency, fetchPendingForReview]);

  const handleReview = async (packetId: string, decision: string) => {
    setProcessing(true);
    const ok = await reviewPacket(packetId, decision, reviewComment || undefined);
    if (ok) {
      setReviewComment('');
      setExpandedId(null);
      if (currentAgency) fetchPendingForReview(currentAgency.id);
    }
    setProcessing(false);
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  if (packets.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <FileBarChart className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No parent summary packets pending review</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <FileBarChart className="h-4 w-4" /> Parent Summary Packets
        <Badge variant="outline" className="text-[10px]">{packets.length} pending</Badge>
      </h3>

      {packets.map((pkt) => {
        const isExpanded = expandedId === pkt.id;
        return (
          <Card key={pkt.id} className="border-l-4 border-l-amber-400">
            <CardHeader
              className="pb-2 cursor-pointer"
              onClick={() => setExpandedId(isExpanded ? null : pkt.id)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm">
                    Week of {format(new Date(pkt.week_start), 'MMM d')} – {format(new Date(pkt.week_end), 'MMM d, yyyy')}
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Source: Behavior Decoded Import · Submitted {format(new Date(pkt.created_at), 'MMM d, yyyy')}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {pkt.status === 'needs_clarification' ? 'Needs Clarification' : 'Pending Review'}
                  </Badge>
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </div>
            </CardHeader>

            {isExpanded && (
              <CardContent className="space-y-4">
                {/* Summary metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div className="bg-muted/50 rounded p-2">
                    <span className="text-muted-foreground">ABCs Logged</span>
                    <p className="font-semibold text-sm">{pkt.abc_count ?? '—'}</p>
                  </div>
                  <div className="bg-muted/50 rounded p-2">
                    <span className="text-muted-foreground">Frequency Total</span>
                    <p className="font-semibold text-sm">{pkt.frequency_total ?? '—'}</p>
                  </div>
                  <div className="bg-muted/50 rounded p-2">
                    <span className="text-muted-foreground">Duration</span>
                    <p className="font-semibold text-sm">{pkt.duration_minutes_total ? `${pkt.duration_minutes_total} min` : '—'}</p>
                  </div>
                  <div className="bg-muted/50 rounded p-2">
                    <span className="text-muted-foreground">Avg Intensity</span>
                    <p className="font-semibold text-sm">{pkt.intensity_avg ? `${pkt.intensity_avg}/5` : '—'}</p>
                  </div>
                </div>

                {/* Tools & engagement */}
                {(pkt.tools_used || pkt.engagement) && (
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {pkt.tools_used && Object.keys(pkt.tools_used).length > 0 && (
                      <div className="bg-muted/30 rounded p-2">
                        <span className="text-muted-foreground font-medium">Tools Used</span>
                        <div className="mt-1 space-y-0.5">
                          {Object.entries(pkt.tools_used).map(([key, val]) => (
                            <div key={key} className="flex justify-between">
                              <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                              <span className="font-medium">{String(val)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {pkt.engagement && Object.keys(pkt.engagement).length > 0 && (
                      <div className="bg-muted/30 rounded p-2">
                        <span className="text-muted-foreground font-medium">Engagement</span>
                        <div className="mt-1 space-y-0.5">
                          {Object.entries(pkt.engagement).map(([key, val]) => (
                            <div key={key} className="flex justify-between">
                              <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                              <span className="font-medium">{String(val)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {pkt.parent_notes && (
                  <div className="text-xs">
                    <span className="text-muted-foreground font-medium">Parent Notes:</span>
                    <p className="mt-1">{pkt.parent_notes}</p>
                  </div>
                )}

                {/* Review actions */}
                <div className="space-y-2 border-t pt-3">
                  <Label className="text-xs">Review Comment (optional)</Label>
                  <Textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Add a comment about this packet…"
                    rows={2}
                    className="text-xs"
                  />
                  <div className="flex gap-2 justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={processing}
                      onClick={() => handleReview(pkt.id, 'needs_clarification')}
                      className="gap-1 text-xs"
                    >
                      <HelpCircle className="h-3.5 w-3.5" /> Request Clarification
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={processing}
                      onClick={() => handleReview(pkt.id, 'rejected')}
                      className="gap-1 text-xs"
                    >
                      <XCircle className="h-3.5 w-3.5" /> Reject
                    </Button>
                    <Button
                      size="sm"
                      disabled={processing}
                      onClick={() => handleReview(pkt.id, 'approved')}
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
