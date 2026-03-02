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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Package, CheckCircle2, FileStack } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface SessionPosting {
  id: string;
  session_id: string;
  student_id: string | null;
  agency_id: string | null;
  minutes: number;
  rounded_minutes: number;
  units: number | null;
  cpt_code: string | null;
  modifier: string | null;
  authorization_id: string | null;
  is_billable: boolean;
  post_status: string;
  posted_at: string;
  posted_by: string;
}

interface BatchResult {
  batch_id: string;
  item_count: number;
  total_minutes: number;
}

export function ReadyForClaimQueue() {
  const { user } = useAuth();
  const { currentAgency } = useAgencyContext();
  const queryClient = useQueryClient();
  const [batchResult, setBatchResult] = useState<BatchResult | null>(null);
  const [batchDetailOpen, setBatchDetailOpen] = useState(false);

  const { data: postings = [], isLoading } = useQuery({
    queryKey: ['ready-for-claim', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('session_postings')
        .select('*')
        .eq('post_status', 'ready_for_claim')
        .eq('is_billable', true)
        .order('posted_at', { ascending: true });
      if (error) throw error;
      return (data || []) as SessionPosting[];
    },
    enabled: !!user,
  });

  // Load batch items when viewing a batch
  const { data: batchItems = [], isLoading: batchItemsLoading } = useQuery({
    queryKey: ['claim-batch-items', batchResult?.batch_id],
    queryFn: async () => {
      if (!batchResult?.batch_id) return [];
      const { data, error } = await supabase
        .from('claim_batch_items')
        .select('*, session_postings:session_posting_id(*)')
        .eq('claim_batch_id', batchResult.batch_id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!batchResult?.batch_id && batchDetailOpen,
  });

  const createBatch = useMutation({
    mutationFn: async () => {
      if (!currentAgency) throw new Error('No agency selected');
      const { data, error } = await supabase.rpc('rpc_create_claim_batch', {
        p_agency_id: currentAgency.id,
        p_limit: 50,
      });
      if (error) throw error;
      const result = data as any;
      if (!result?.ok) throw new Error(result?.error || 'Failed to create batch');
      return result as BatchResult;
    },
    onSuccess: (result) => {
      toast.success(`Batch created: ${result.item_count} items, ${result.total_minutes} min`);
      setBatchResult(result);
      setBatchDetailOpen(true);
      queryClient.invalidateQueries({ queryKey: ['ready-for-claim'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to create claim batch');
    },
  });

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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileStack className="h-5 w-5" />
                Ready for Claim
              </CardTitle>
              <CardDescription>
                {postings.length} billable posting{postings.length !== 1 ? 's' : ''} ready to batch into claims.
              </CardDescription>
            </div>
            {postings.length > 0 && (
              <Button
                onClick={() => createBatch.mutate()}
                disabled={createBatch.isPending || !currentAgency}
              >
                {createBatch.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Package className="mr-2 h-4 w-4" />
                Create Claim Batch
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {postings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>No postings ready for claim.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Posted</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead className="text-right">Minutes</TableHead>
                    <TableHead>CPT</TableHead>
                    <TableHead>Modifier</TableHead>
                    <TableHead>Auth ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {postings.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-xs">
                        {format(new Date(p.posted_at), 'MMM d, h:mm a')}
                      </TableCell>
                      <TableCell className="text-xs">
                        {p.student_id ? p.student_id.slice(0, 8) + '…' : '—'}
                      </TableCell>
                      <TableCell className="text-right text-xs font-medium">
                        {p.rounded_minutes}
                      </TableCell>
                      <TableCell className="text-xs">{p.cpt_code || '—'}</TableCell>
                      <TableCell className="text-xs">{p.modifier || '—'}</TableCell>
                      <TableCell className="text-xs">
                        {p.authorization_id ? p.authorization_id.slice(0, 8) + '…' : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Batch Detail Dialog */}
      <Dialog open={batchDetailOpen} onOpenChange={setBatchDetailOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Claim Batch Created</DialogTitle>
            <DialogDescription>
              Batch ID: {batchResult?.batch_id?.slice(0, 8)}… · {batchResult?.item_count} items · {batchResult?.total_minutes} total minutes
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[50vh]">
            {batchItemsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead className="text-right">Min</TableHead>
                      <TableHead>CPT</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batchItems.map((item: any, idx: number) => {
                      const sp = item.session_postings as any;
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="text-xs">{idx + 1}</TableCell>
                          <TableCell className="text-xs">
                            {sp?.student_id ? sp.student_id.slice(0, 8) + '…' : '—'}
                          </TableCell>
                          <TableCell className="text-right text-xs">{sp?.rounded_minutes ?? '—'}</TableCell>
                          <TableCell className="text-xs">{sp?.cpt_code || '—'}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{item.status}</Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchDetailOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
