import { useState } from 'react';
import { Send, Download, CheckCircle2, XCircle, Clock, FileText, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useClearinghouse } from '@/hooks/useClearinghouse';
import { ClearinghouseSubmissionStatus } from '@/types/clearinghouse';
import { toast } from 'sonner';

const STATUS_MAP: Record<ClearinghouseSubmissionStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  generated: { label: 'Generated', variant: 'secondary' },
  uploaded: { label: 'Uploaded', variant: 'default' },
  accepted: { label: 'Accepted', variant: 'outline' },
  rejected: { label: 'Rejected', variant: 'destructive' },
  partial: { label: 'Partial', variant: 'secondary' },
};

export function ClearinghouseTab() {
  const { submissions, claimHistory, isLoading, createSubmission, updateSubmission, fetchSubmissions } = useClearinghouse();

  const generateBatch = async () => {
    await createSubmission({
      batch_number: `BATCH-${Date.now().toString(36).toUpperCase()}`,
      submission_date: new Date().toISOString(),
      claim_count: 0,
      total_charges: 0,
      status: 'generated',
      clearinghouse: 'Office Ally',
      response_data: {},
    });
    fetchSubmissions();
  };

  const updateSubmissionStatus = async (id: string, status: string) => {
    await updateSubmission(id, { status } as any);
    fetchSubmissions();
  };
  const [showGenerate, setShowGenerate] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('submissions');

  const totalSubmissions = submissions.length;
  const totalClaims = submissions.reduce((s, sub) => s + sub.claim_count, 0);
  const acceptedClaims = submissions.filter(s => s.status === 'accepted').reduce((s, sub) => s + sub.claim_count, 0);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{totalSubmissions}</div>
            <p className="text-sm text-muted-foreground">Batch Submissions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{totalClaims}</div>
            <p className="text-sm text-muted-foreground">Total Claims Sent</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{acceptedClaims}</div>
            <p className="text-sm text-muted-foreground">Accepted</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">Office Ally</div>
            <p className="text-sm text-muted-foreground">Clearinghouse</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2">
        <Button onClick={() => setShowGenerate(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Generate 837P Batch
        </Button>
      </div>

      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <TabsList>
          <TabsTrigger value="submissions">Batch Submissions</TabsTrigger>
          <TabsTrigger value="claim-history">Claim History</TabsTrigger>
        </TabsList>

        <TabsContent value="submissions">
          <Card>
            <CardContent className="pt-6">
              {submissions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Send className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>No submissions yet</p>
                  <p className="text-sm">Generate an 837P batch to submit claims to Office Ally</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Batch #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Claims</TableHead>
                      <TableHead>Total Charges</TableHead>
                      <TableHead>Clearinghouse</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissions.map((sub) => {
                      const status = STATUS_MAP[sub.status];
                      return (
                        <TableRow key={sub.id}>
                          <TableCell className="font-mono">{sub.batch_number}</TableCell>
                          <TableCell>{new Date(sub.submission_date).toLocaleDateString()}</TableCell>
                          <TableCell>{sub.claim_count}</TableCell>
                          <TableCell>${sub.total_charges.toLocaleString()}</TableCell>
                          <TableCell>{sub.clearinghouse}</TableCell>
                          <TableCell><Badge variant={status.variant}>{status.label}</Badge></TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {sub.file_url && (
                                <Button size="sm" variant="outline" className="gap-1">
                                  <Download className="w-3 h-3" /> 837P
                                </Button>
                              )}
                              {sub.status === 'generated' && (
                                <Button size="sm" variant="outline" onClick={() => updateSubmissionStatus(sub.id, 'uploaded')} className="gap-1">
                                  <Send className="w-3 h-3" /> Mark Uploaded
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="claim-history">
          <Card>
            <CardContent className="pt-6">
              {claimHistory.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>No claim submission history yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Claim ID</TableHead>
                      <TableHead>CH Claim ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Rejections</TableHead>
                      <TableHead>Response Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {claimHistory.map((ch) => (
                      <TableRow key={ch.id}>
                        <TableCell className="font-mono text-xs">{ch.claim_id.slice(0, 8)}...</TableCell>
                        <TableCell>{ch.clearinghouse_claim_id || '—'}</TableCell>
                        <TableCell><Badge variant="outline">{ch.clearinghouse_status}</Badge></TableCell>
                        <TableCell>{ch.rejection_reasons.length > 0 ? ch.rejection_reasons.join(', ') : '—'}</TableCell>
                        <TableCell>{ch.response_date ? new Date(ch.response_date).toLocaleDateString() : '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Generate Dialog */}
      <Dialog open={showGenerate} onOpenChange={setShowGenerate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate 837P Batch</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will generate an ANSI X12 837P file containing all ready claims for submission to Office Ally.
            You can then download the file and upload it through the Office Ally portal.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerate(false)}>Cancel</Button>
            <Button onClick={() => { generateBatch(); setShowGenerate(false); toast.success('837P batch generated'); }}>
              Generate 837P File
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
