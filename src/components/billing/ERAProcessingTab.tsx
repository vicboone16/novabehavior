import { useState } from 'react';
import { Upload, FileText, CheckCircle2, AlertTriangle, DollarSign, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useERAProcessing } from '@/hooks/useERAProcessing';
import { ERAMatchStatus } from '@/types/era';
import { toast } from 'sonner';

const MATCH_BADGES: Record<ERAMatchStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  unmatched: { label: 'Unmatched', variant: 'destructive' },
  auto_matched: { label: 'Auto-Matched', variant: 'default' },
  manual_matched: { label: 'Manual Match', variant: 'outline' },
  no_match: { label: 'No Match', variant: 'secondary' },
};

export function ERAProcessingTab() {
  const { imports, remittances, lineItems, isLoading, createImport, fetchImports, postPayment } = useERAProcessing();

  const importERA = async (filename: string, content: string) => {
    await createImport(filename, content);
    fetchImports();
  };

  const postPayments = async () => {
    const matched = lineItems.filter(l => (l.match_status === 'auto_matched' || l.match_status === 'manual_matched') && !l.posted && l.claim_id);
    for (const item of matched) {
      await postPayment(item.id, item.claim_id!);
    }
    fetchImports();
  };
  const [showImport, setShowImport] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('imports');

  const totalPaid = remittances.reduce((s, r) => s + r.total_paid, 0);
  const matchedCount = lineItems.filter(l => l.match_status === 'auto_matched' || l.match_status === 'manual_matched').length;
  const unmatchedCount = lineItems.filter(l => l.match_status === 'unmatched').length;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      importERA(file.name, content);
      setShowImport(false);
      toast.success(`Imported ${file.name} for parsing`);
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{imports.length}</div>
            <p className="text-sm text-muted-foreground">ERA Files Imported</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">${totalPaid.toLocaleString()}</div>
            <p className="text-sm text-muted-foreground">Total Payments</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{matchedCount}</div>
            <p className="text-sm text-muted-foreground">Matched Claims</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-destructive">{unmatchedCount}</div>
            <p className="text-sm text-muted-foreground">Unmatched</p>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button onClick={() => setShowImport(true)} className="gap-2">
          <Upload className="w-4 h-4" /> Import 835 File
        </Button>
        {matchedCount > 0 && (
          <Button variant="outline" onClick={() => { postPayments(); toast.success('Payments posted'); }} className="gap-2">
            <CheckCircle2 className="w-4 h-4" /> Post Matched Payments
          </Button>
        )}
      </div>

      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <TabsList>
          <TabsTrigger value="imports">Import History</TabsTrigger>
          <TabsTrigger value="remittances">Remittances</TabsTrigger>
          <TabsTrigger value="line-items">Line Items</TabsTrigger>
        </TabsList>

        <TabsContent value="imports">
          <Card>
            <CardContent className="pt-6">
              {imports.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>No ERA files imported yet</p>
                  <p className="text-sm">Upload an 835 file to begin</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Filename</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Remittances</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Matched</TableHead>
                      <TableHead>Unmatched</TableHead>
                      <TableHead>Imported</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {imports.map((imp) => (
                      <TableRow key={imp.id}>
                        <TableCell className="font-medium">{imp.filename}</TableCell>
                        <TableCell><Badge variant="outline">{imp.parse_status}</Badge></TableCell>
                        <TableCell>{imp.total_remittances}</TableCell>
                        <TableCell>${imp.total_amount.toLocaleString()}</TableCell>
                        <TableCell>{imp.matched_count}</TableCell>
                        <TableCell>{imp.unmatched_count}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{new Date(imp.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="remittances">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payer</TableHead>
                    <TableHead>Check/EFT #</TableHead>
                    <TableHead>Payment Date</TableHead>
                    <TableHead>Total Paid</TableHead>
                    <TableHead>Adjustments</TableHead>
                    <TableHead>Claims</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {remittances.map((rem) => (
                    <TableRow key={rem.id}>
                      <TableCell className="font-medium">{rem.payer_name || 'Unknown'}</TableCell>
                      <TableCell>{rem.check_eft_number || '—'}</TableCell>
                      <TableCell>{rem.payment_date || '—'}</TableCell>
                      <TableCell className="text-green-600">${rem.total_paid.toLocaleString()}</TableCell>
                      <TableCell>${rem.total_adjustments.toLocaleString()}</TableCell>
                      <TableCell>{rem.claim_count}</TableCell>
                      <TableCell><Badge variant="outline">{rem.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="line-items">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>CPT</TableHead>
                    <TableHead>Service Date</TableHead>
                    <TableHead>Billed</TableHead>
                    <TableHead>Allowed</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Match</TableHead>
                    <TableHead>Posted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineItems.slice(0, 50).map((item) => {
                    const matchBadge = MATCH_BADGES[item.match_status];
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.patient_name || 'Unknown'}</TableCell>
                        <TableCell>{item.cpt_code || '—'}</TableCell>
                        <TableCell>{item.service_date_from || '—'}</TableCell>
                        <TableCell>${item.billed_amount.toFixed(2)}</TableCell>
                        <TableCell>${item.allowed_amount.toFixed(2)}</TableCell>
                        <TableCell className="text-green-600">${item.paid_amount.toFixed(2)}</TableCell>
                        <TableCell><Badge variant={matchBadge.variant}>{matchBadge.label}</Badge></TableCell>
                        <TableCell>{item.posted ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : '—'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Import Dialog */}
      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Import ERA/835 File
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Upload an ANSI X12 835 Electronic Remittance Advice file for automatic parsing and claim matching.</p>
            <Input type="file" accept=".835,.txt,.edi" onChange={handleFileUpload} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
