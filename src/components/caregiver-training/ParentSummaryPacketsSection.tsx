import { useState, useEffect } from 'react';
import { FileBarChart, Clock, CheckCircle2, XCircle, HelpCircle, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useParentSummaryPackets, ParentSummaryPacket } from '@/hooks/useParentSummaryPackets';
import { format } from 'date-fns';

interface ParentSummaryPacketsSectionProps {
  studentId: string;
}

const STATUS_BADGE: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string }> = {
  pending_review: { variant: 'outline', label: 'Pending Review' },
  approved: { variant: 'default', label: 'Approved' },
  rejected: { variant: 'destructive', label: 'Rejected' },
  needs_clarification: { variant: 'secondary', label: 'Needs Clarification' },
};

export function ParentSummaryPacketsSection({ studentId }: ParentSummaryPacketsSectionProps) {
  const { packets, loading, fetchPackets } = useParentSummaryPackets();

  useEffect(() => {
    fetchPackets({ clientId: studentId });
  }, [studentId, fetchPackets]);

  const approved = packets.filter(p => p.status === 'approved');
  const pending = packets.filter(p => p.status === 'pending_review' || p.status === 'needs_clarification');

  if (loading) return <p className="text-sm text-muted-foreground">Loading parent summaries…</p>;

  if (packets.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <FileBarChart className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No parent summary packets</p>
          <p className="text-xs mt-1">Linked parents can import weekly summaries from Behavior Decoded</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <FileBarChart className="h-4 w-4" /> Parent Summary Packets
        {pending.length > 0 && (
          <Badge variant="outline" className="text-[10px] h-4 px-1.5">{pending.length} pending</Badge>
        )}
      </h3>

      <Card>
        <CardContent className="pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Week</TableHead>
                <TableHead>ABCs</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Avg Intensity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {packets.map((pkt) => {
                const badge = STATUS_BADGE[pkt.status] || STATUS_BADGE.pending_review;
                return (
                  <TableRow key={pkt.id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {format(new Date(pkt.week_start), 'MMM d')} – {format(new Date(pkt.week_end), 'MMM d')}
                    </TableCell>
                    <TableCell className="text-xs">{pkt.abc_count ?? '—'}</TableCell>
                    <TableCell className="text-xs">{pkt.frequency_total ?? '—'}</TableCell>
                    <TableCell className="text-xs">{pkt.duration_minutes_total ? `${pkt.duration_minutes_total} min` : '—'}</TableCell>
                    <TableCell className="text-xs">{pkt.intensity_avg ? `${pkt.intensity_avg}/5` : '—'}</TableCell>
                    <TableCell>
                      <Badge variant={badge.variant} className="text-[10px]">{badge.label}</Badge>
                    </TableCell>
                    <TableCell className="text-xs max-w-[150px] truncate">{pkt.parent_notes || '—'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
