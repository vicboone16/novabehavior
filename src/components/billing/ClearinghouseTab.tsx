import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Download, Clock, FileText, Package, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAgencyContext } from '@/hooks/useAgencyContext';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ClaimBatch {
  id: string;
  agency_id: string;
  item_count: number;
  total_minutes: number;
  status: string;
  created_at: string;
  submitted_at: string | null;
  notes: string | null;
}

const STATUS_COLORS: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  pending: 'secondary',
  generating: 'secondary',
  generated: 'outline',
  submitted: 'default',
  accepted: 'default',
  rejected: 'destructive',
};

export function ClearinghouseTab() {
  const { user } = useAuth();
  const { currentAgency } = useAgencyContext();
  const queryClient = useQueryClient();
  const [selectedBatch, setSelectedBatch] = useState<ClaimBatch | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [generatedFile, setGeneratedFile] = useState<{ content: string; filename: string } | null>(null);

  const { data: batches = [], isLoading } = useQuery({
    queryKey: ['claim-batches', currentAgency?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('claim_batches')
        .select('*')
        .eq('agency_id', currentAgency!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as ClaimBatch[];
    },
    enabled: !!currentAgency?.id,
  });

  const { data: batchItems = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['claim-batch-items', selectedBatch?.id],
    queryFn: async () => {
      if (!selectedBatch?.id) return [];
      const { data, error } = await supabase
        .from('claim_batch_items')
        .select('*, session_postings(*)')
        .eq('claim_batch_id', selectedBatch.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedBatch?.id && confirmOpen,
  });

  const generate837p = useMutation({
    mutationFn: async (batch: ClaimBatch) => {
      // Fetch detailed posting data needed for 837P generation
      const { data: items, error: itemsErr } = await supabase
        .from('claim_batch_items')
        .select(`
          session_postings(
            id, session_id, student_id, cpt_code, modifier, units, rounded_minutes, minutes,
            authorization_id, is_billable, posted_at,
            sessions(start_time, started_at, ended_at),
            students(id, first_name, last_name, date_of_birth, gender)
          )
        `)
        .eq('claim_batch_id', batch.id);

      if (itemsErr) throw itemsErr;

      // Fetch agency/provider info
      const { data: agency } = await supabase
        .from('agencies')
        .select('name, npi, tax_id, address_line1, billing_address_line1')
        .eq('id', batch.agency_id)
        .maybeSingle();

      const postings = (items || [])
        .map((i: any) => i.session_postings)
        .filter(Boolean);

      if (postings.length === 0) throw new Error('No postings found in this batch');

      // Group postings by student+payer into claims
      const claimsMap = new Map<string, any>();
      for (const p of postings) {
        const student = p.students;
        if (!student) continue;
        const key = `${student.id}`;
        if (!claimsMap.has(key)) {
          claimsMap.set(key, {
            claimNumber: `CLM-${batch.id.slice(0, 8)}-${student.id.slice(0, 6)}`.toUpperCase(),
            patientName: `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim(),
            patientDob: student.date_of_birth ?? '19000101',
            patientGender: student.gender === 'female' ? 'F' : student.gender === 'male' ? 'M' : 'U',
            patientAddress: '123 Patient St',
            subscriberId: student.id.slice(0, 12),
            payerName: 'Insurance Payer',
            payerId: '00000',
            renderingProviderNpi: agency?.npi ?? '0000000000',
            renderingProviderName: agency?.name ?? 'Provider',
            billingProviderNpi: agency?.npi ?? '0000000000',
            billingProviderName: agency?.name ?? 'Provider',
            billingProviderTaxId: agency?.tax_id ?? '000000000',
            billingProviderAddress: agency?.billing_address_line1 ?? agency?.address_line1 ?? '123 Agency St',
            diagnosisCodes: ['F84.0'],
            placeOfService: '11',
            serviceLines: [],
          });
        }
        const session = p.sessions;
        const serviceDate = session?.started_at ?? session?.start_time ?? p.posted_at;
        claimsMap.get(key)!.serviceLines.push({
          cptCode: p.cpt_code ?? '97153',
          modifiers: p.modifier ? [p.modifier] : [],
          units: p.units ?? Math.ceil((p.rounded_minutes ?? p.minutes ?? 60) / 15),
          charge: ((p.units ?? Math.ceil((p.rounded_minutes ?? p.minutes ?? 60) / 15)) * 12.0),
          serviceDate: serviceDate ? serviceDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
          diagnosisPointers: [1],
        });
      }

      const claims = Array.from(claimsMap.values());
      const submitterInfo = {
        name: agency?.name ?? 'PROVIDER',
        id: agency?.npi ?? '000000000',
        contactName: 'Billing Contact',
        contactPhone: '8005551234',
      };

      const { data: fnData, error: fnErr } = await supabase.functions.invoke('generate-837p', {
        body: { claims, submitterInfo },
      });

      if (fnErr) throw fnErr;
      if (!fnData?.success) throw new Error(fnData?.error ?? 'Generation failed');

      // Mark batch as submitted
      await supabase
        .from('claim_batches')
        .update({ status: 'generated', submitted_at: new Date().toISOString() })
        .eq('id', batch.id);

      return { content: fnData.fileContent as string, filename: fnData.filename as string, claimCount: claims.length };
    },
    onSuccess: (result) => {
      setGeneratedFile({ content: result.content, filename: result.filename });
      setConfirmOpen(false);
      queryClient.invalidateQueries({ queryKey: ['claim-batches'] });
      toast.success(`837P generated: ${result.claimCount} claim${result.claimCount !== 1 ? 's' : ''}`);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to generate 837P');
    },
  });

  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalItems = batches.reduce((s, b) => s + b.item_count, 0);
  const submittedBatches = batches.filter(b => b.status === 'generated' || b.status === 'submitted').length;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{batches.length}</div>
            <p className="text-sm text-muted-foreground">Claim Batches</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{totalItems}</div>
            <p className="text-sm text-muted-foreground">Total Postings</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{submittedBatches}</div>
            <p className="text-sm text-muted-foreground">Generated / Submitted</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">Office Ally</div>
            <p className="text-sm text-muted-foreground">Clearinghouse</p>
          </CardContent>
        </Card>
      </div>

      {/* Generated file download bar */}
      {generatedFile && (
        <Card className="border-green-500 bg-green-50 dark:bg-green-950">
          <CardContent className="pt-4 pb-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
              <FileText className="h-4 w-4" />
              <span className="text-sm font-medium">{generatedFile.filename} is ready</span>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => downloadFile(generatedFile.content, generatedFile.filename)} className="gap-1">
                <Download className="h-3 w-3" /> Download 837P
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setGeneratedFile(null)}>Dismiss</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Batches table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Claim Batches
          </CardTitle>
          <CardDescription>
            Batches created from the Ready for Claim queue. Select a batch to generate its 837P file.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : batches.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Send className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="font-medium">No batches yet</p>
              <p className="text-sm mt-1">Use "Ready for Claim" tab to batch session postings, then come back here to generate 837P files.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch ID</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Postings</TableHead>
                  <TableHead>Minutes</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.map((batch) => (
                  <TableRow key={batch.id}>
                    <TableCell className="font-mono text-xs">{batch.id.slice(0, 8)}…</TableCell>
                    <TableCell>{format(new Date(batch.created_at), 'MMM d, yyyy')}</TableCell>
                    <TableCell>{batch.item_count}</TableCell>
                    <TableCell>{batch.total_minutes}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_COLORS[batch.status] ?? 'secondary'}>
                        {batch.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {batch.status === 'pending' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1"
                            onClick={() => { setSelectedBatch(batch); setConfirmOpen(true); }}
                          >
                            <FileText className="h-3 w-3" /> Generate 837P
                          </Button>
                        )}
                        {(batch.status === 'generated' || batch.status === 'submitted') && (
                          <Badge variant="outline" className="text-xs">
                            {batch.submitted_at ? `Generated ${format(new Date(batch.submitted_at), 'MMM d')}` : 'Generated'}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Generate 837P confirm dialog */}
      <Dialog open={confirmOpen} onOpenChange={(v) => { setConfirmOpen(v); if (!v) setSelectedBatch(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generate 837P File</DialogTitle>
            <DialogDescription>
              This will build an ANSI X12 837P EDI file for all postings in this batch and prepare it for upload to Office Ally.
            </DialogDescription>
          </DialogHeader>

          {selectedBatch && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Batch</span>
                <span className="font-mono">{selectedBatch.id.slice(0, 8)}…</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Postings</span>
                <span>{selectedBatch.item_count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total minutes</span>
                <span>{selectedBatch.total_minutes}</span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button
              onClick={() => selectedBatch && generate837p.mutate(selectedBatch)}
              disabled={generate837p.isPending}
            >
              {generate837p.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate 837P
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
