import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Download, FileText, Package, AlertTriangle, CheckCircle2, ExternalLink } from 'lucide-react';
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
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();
  const [selectedBatch, setSelectedBatch] = useState<ClaimBatch | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [generatedFile, setGeneratedFile] = useState<{ content: string; filename: string; batchId: string } | null>(null);

  // Check which students in recent postings are missing payer/member_id
  const { data: missingPayerStudents = [] } = useQuery({
    queryKey: ['missing-payer-students', currentAgency?.id],
    queryFn: async () => {
      // Get distinct student_ids from recent ready-for-claim or draft postings
      const { data: postings } = await supabase
        .from('session_postings')
        .select('student_id')
        .eq('agency_id', currentAgency!.id)
        .in('post_status', ['ready_for_claim', 'pending'])
        .not('student_id', 'is', null);

      const studentIds = [...new Set((postings ?? []).map((p: any) => p.student_id as string))];
      if (studentIds.length === 0) return [];

      // Check which of those students have no active payer assignment with member_id
      const { data: payers } = await supabase
        .from('student_payers')
        .select('student_id, member_id')
        .in('student_id', studentIds)
        .eq('is_active', true);

      const payerMap = new Map<string, string | null>();
      for (const p of (payers ?? [])) payerMap.set(p.student_id, p.member_id);

      const missing = studentIds.filter(id => !payerMap.has(id) || !payerMap.get(id));

      if (missing.length === 0) return [];

      // Get student names for display
      const { data: students } = await supabase
        .from('students')
        .select('id, first_name, last_name')
        .in('id', missing);

      return (students ?? []).map(s => ({
        id: s.id,
        name: `${s.first_name ?? ''} ${s.last_name ?? ''}`.trim() || s.id.slice(0, 8),
      }));
    },
    enabled: !!currentAgency?.id,
  });

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
            students(id, first_name, last_name, date_of_birth, gender, address_line1, address_line2, city, state, zip_code, diagnosis_cluster)
          )
        `)
        .eq('claim_batch_id', batch.id);

      if (itemsErr) throw itemsErr;

      // Fetch agency/provider info
      const { data: agency } = await supabase
        .from('agencies')
        .select('name, npi, tax_id, address_line1, billing_address_line1, billing_address_city, billing_address_state, billing_address_zip, phone')
        .eq('id', batch.agency_id)
        .maybeSingle();

      const postings = (items || [])
        .map((i: any) => i.session_postings)
        .filter(Boolean);

      if (postings.length === 0) throw new Error('No postings found in this batch');

      // Collect unique student IDs to fetch payer assignments in bulk
      const studentIds = [...new Set(postings.map((p: any) => p.student_id).filter(Boolean))];

      // Fetch primary active payer for each student
      const { data: studentPayers } = await supabase
        .from('student_payers')
        .select('student_id, member_id, group_number, subscriber_name, subscriber_relationship, payers(id, name, payer_id, directory_payer_id)')
        .in('student_id', studentIds)
        .eq('is_active', true)
        .order('billing_order', { ascending: true });

      // Build lookup: studentId → primary payer record
      const payerByStudent = new Map<string, any>();
      for (const sp of (studentPayers ?? [])) {
        if (!payerByStudent.has(sp.student_id)) {
          payerByStudent.set(sp.student_id, sp);
        }
      }

      // Map diagnosis_cluster to ICD-10 code (common ABA diagnoses)
      const clusterToIcd: Record<string, string> = {
        autism: 'F84.0',
        asd: 'F84.0',
        asperger: 'F84.5',
        pdd: 'F84.9',
        adhd: 'F90.9',
        dd: 'F79',
        id: 'F79',
      };
      const resolveIcd = (cluster: string | null): string => {
        if (!cluster) return 'F84.0';
        const lower = cluster.toLowerCase();
        for (const [key, code] of Object.entries(clusterToIcd)) {
          if (lower.includes(key)) return code;
        }
        return 'F84.0';
      };

      const billingAddress = [
        agency?.billing_address_line1 ?? agency?.address_line1 ?? '',
        [agency?.billing_address_city, agency?.billing_address_state, agency?.billing_address_zip]
          .filter(Boolean).join(', '),
      ].filter(Boolean).join(', ') || '123 Agency St';

      // Group postings by student into claims
      const claimsMap = new Map<string, any>();
      for (const p of postings) {
        const student = p.students;
        if (!student) continue;
        const key = student.id;
        if (!claimsMap.has(key)) {
          const sp = payerByStudent.get(student.id);
          const payer = sp?.payers;
          const payerEdiId = payer?.payer_id ?? payer?.directory_payer_id ?? '00000';
          const patientAddr = [
            student.address_line1,
            student.city,
            student.state,
            student.zip_code,
          ].filter(Boolean).join(', ') || '123 Patient St';

          claimsMap.set(key, {
            claimNumber: `CLM-${batch.id.slice(0, 8)}-${student.id.slice(0, 6)}`.toUpperCase(),
            patientName: `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim(),
            patientDob: student.date_of_birth ?? '19000101',
            patientGender: student.gender === 'female' ? 'F' : student.gender === 'male' ? 'M' : 'U',
            patientAddress: patientAddr,
            subscriberId: sp?.member_id ?? student.id.slice(0, 12),
            payerName: payer?.name ?? 'Unknown Payer',
            payerId: payerEdiId,
            renderingProviderNpi: agency?.npi ?? '0000000000',
            renderingProviderName: agency?.name ?? 'Provider',
            billingProviderNpi: agency?.npi ?? '0000000000',
            billingProviderName: agency?.name ?? 'Provider',
            billingProviderTaxId: agency?.tax_id ?? '000000000',
            billingProviderAddress: billingAddress,
            diagnosisCodes: [resolveIcd(student.diagnosis_cluster)],
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
      setGeneratedFile({ content: result.content, filename: result.filename, batchId: batch.id });
      setConfirmOpen(false);
      queryClient.invalidateQueries({ queryKey: ['claim-batches'] });
      toast.success(`837P generated: ${result.claimCount} claim${result.claimCount !== 1 ? 's' : ''}`);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to generate 837P');
    },
  });

  const submitToOfficeAlly = useMutation({
    mutationFn: async ({ batchId, content, filename }: { batchId: string; content: string; filename: string }) => {
      const { data, error } = await supabase.functions.invoke('submit-to-office-ally', {
        body: { batchId, fileContent: content, filename },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error ?? 'Submission failed');
      return data as { success: boolean; confirmationNumber?: string; claimCount?: number };
    },
    onSuccess: (result) => {
      toast.success(
        result.confirmationNumber
          ? `Submitted to Office Ally — confirmation ${result.confirmationNumber}`
          : 'Submitted to Office Ally'
      );
      setGeneratedFile(null);
      queryClient.invalidateQueries({ queryKey: ['claim-batches'] });
    },
    onError: (err: any) => {
      // If credentials not set, show helpful message and keep file for manual upload
      toast.error(err.message?.includes('OFFICE_ALLY_USERNAME')
        ? 'Direct EDI not configured — download the 837P and upload manually to Office Ally.'
        : (err.message || 'Submission failed'));
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

      {/* Insurance readiness banner */}
      {missingPayerStudents.length > 0 ? (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/30">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  {missingPayerStudents.length} client{missingPayerStudents.length > 1 ? 's' : ''} missing insurance info
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                  {missingPayerStudents.map(s => s.name).join(', ')} — 837P will use placeholder payer data for these clients.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 gap-1 border-amber-400 text-amber-700 hover:bg-amber-100"
                onClick={() => navigate('/students')}
              >
                <ExternalLink className="h-3 w-3" /> Fix in Student Profiles
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : missingPayerStudents !== undefined && (
        <Card className="border-green-300 bg-green-50 dark:bg-green-950/30">
          <CardContent className="pt-3 pb-3">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-400 text-sm">
              <CheckCircle2 className="h-4 w-4" />
              All clients in current postings have insurance info — claims will generate cleanly.
            </div>
          </CardContent>
        </Card>
      )}

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
              <Button
                size="sm"
                onClick={() => submitToOfficeAlly.mutate({ batchId: generatedFile.batchId, content: generatedFile.content, filename: generatedFile.filename })}
                disabled={submitToOfficeAlly.isPending}
                className="gap-1"
              >
                {submitToOfficeAlly.isPending
                  ? <Loader2 className="h-3 w-3 animate-spin" />
                  : <Send className="h-3 w-3" />}
                Submit to Office Ally
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
            <div className="space-y-3 text-sm">
              <div className="space-y-1">
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

              {/* Pre-flight checks */}
              {!itemsLoading && batchItems.length > 0 && (() => {
                const warnings: string[] = [];
                const postings = batchItems.map((i: any) => i.session_postings).filter(Boolean);
                const missingCpt = postings.filter((p: any) => !p.cpt_code).length;
                const missingAuth = postings.filter((p: any) => !p.authorization_id).length;
                if (missingCpt > 0) warnings.push(`${missingCpt} posting${missingCpt > 1 ? 's' : ''} missing CPT code`);
                if (missingAuth > 0) warnings.push(`${missingAuth} posting${missingAuth > 1 ? 's' : ''} missing authorization`);
                if (warnings.length === 0) return null;
                return (
                  <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3 space-y-1">
                    <p className="text-xs font-medium text-amber-700 dark:text-amber-400">Pre-flight warnings</p>
                    {warnings.map(w => (
                      <p key={w} className="text-xs text-amber-600 dark:text-amber-500">• {w} — defaults will be used</p>
                    ))}
                  </div>
                );
              })()}
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
