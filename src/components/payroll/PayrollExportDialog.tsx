import { useState } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { StaffTimesheet, PayrollExportFormat } from '@/types/payroll';
import { toast } from 'sonner';

interface PayrollExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payPeriodStart: string;
  payPeriodEnd: string;
  timesheets: StaffTimesheet[];
}

const FORMAT_LABELS: Record<PayrollExportFormat, string> = {
  quickbooks: 'QuickBooks CSV',
  gusto: 'Gusto CSV',
  adp: 'ADP CSV',
  generic: 'Generic CSV',
};

function generateCSV(timesheets: StaffTimesheet[], format: PayrollExportFormat): string {
  const headers = ['Employee Name', 'Pay Period Start', 'Pay Period End', 'Total Hours', 'Billable Hours', 'Non-Billable Hours', 'Drive Time Hours', 'Mileage'];
  const rows = timesheets.map(t => [
    t.staff_name || 'Unknown',
    t.pay_period_start,
    t.pay_period_end,
    t.total_hours.toFixed(2),
    t.billable_hours.toFixed(2),
    t.non_billable_hours.toFixed(2),
    t.drive_time_hours.toFixed(2),
    t.total_mileage.toFixed(1),
  ]);

  if (format === 'quickbooks') {
    return ['Employee,Hours,Rate,Amount', ...timesheets.map(t => 
      `"${t.staff_name || 'Unknown'}",${t.total_hours.toFixed(2)},,`
    )].join('\n');
  }

  return [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
}

export function PayrollExportDialog({ open, onOpenChange, payPeriodStart, payPeriodEnd, timesheets }: PayrollExportDialogProps) {
  const [exportFormat, setExportFormat] = useState<PayrollExportFormat>('generic');

  const approvedTimesheets = timesheets.filter(t => t.status === 'approved' || t.status === 'exported');

  const handleExport = () => {
    if (approvedTimesheets.length === 0) {
      toast.error('No approved timesheets to export');
      return;
    }

    const csv = generateCSV(approvedTimesheets, exportFormat);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll_${payPeriodStart}_${payPeriodEnd}_${exportFormat}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${approvedTimesheets.length} timesheets as ${FORMAT_LABELS[exportFormat]}`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Export Payroll
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Export Format</Label>
            <Select value={exportFormat} onValueChange={v => setExportFormat(v as PayrollExportFormat)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(FORMAT_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="bg-muted p-3 rounded-md text-sm">
            <p><strong>Period:</strong> {payPeriodStart} to {payPeriodEnd}</p>
            <p><strong>Approved Timesheets:</strong> {approvedTimesheets.length} of {timesheets.length}</p>
            <p><strong>Total Hours:</strong> {approvedTimesheets.reduce((s, t) => s + t.total_hours, 0).toFixed(1)}</p>
          </div>
          {approvedTimesheets.length === 0 && (
            <p className="text-sm text-destructive">No approved timesheets available. Approve timesheets before exporting.</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleExport} disabled={approvedTimesheets.length === 0} className="gap-2">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
