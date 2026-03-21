import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useReviewBeaconSubmission } from '@/hooks/useBopsData';
import { Loader2, Check, X, Download } from 'lucide-react';

export function BopsSubmissionReview() {
  const [filter, setFilter] = useState('pending');

  const { data: submissions, isLoading } = useQuery({
    queryKey: ['beacon-submissions-all', filter],
    queryFn: async () => {
      let q = supabase
        .from('beacon_submissions')
        .select('*, students:student_id(first_name, last_name)')
        .order('created_at', { ascending: false });
      if (filter !== 'all') q = q.eq('submission_status', filter);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const reviewMut = useReviewBeaconSubmission();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Beacon Submission Review Queue</CardTitle>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="reviewed">Reviewed</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? <Loader2 className="animate-spin mx-auto" /> : (
          (!submissions || submissions.length === 0) ? (
            <p className="text-center text-muted-foreground py-8">No submissions found.</p>
          ) : (
            <div className="space-y-3">
              {submissions.map((s: any) => (
                <div key={s.id} className="p-3 rounded-lg border flex items-start justify-between">
                  <div>
                    <p className="font-medium text-sm">
                      {s.students?.first_name} {s.students?.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {s.submission_type} • {s.date_range_start} to {s.date_range_end}
                    </p>
                    {s.summary_text && <p className="text-xs mt-1">{s.summary_text}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={
                      s.submission_status === 'pending' ? 'secondary' :
                      s.submission_status === 'accepted' ? 'default' : 'destructive'
                    }>
                      {s.submission_status}
                    </Badge>
                    {s.submission_status === 'pending' && (
                      <>
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => reviewMut.mutate({ id: s.id, status: 'accepted' })}>
                          <Check className="w-3 h-3" /> Accept
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => reviewMut.mutate({ id: s.id, status: 'rejected' })}>
                          <X className="w-3 h-3" /> Reject
                        </Button>
                        <Button size="sm" variant="ghost" className="gap-1" onClick={() => reviewMut.mutate({ id: s.id, status: 'partially_used' })}>
                          <Download className="w-3 h-3" /> Import
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
}
