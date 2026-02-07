import { useState } from 'react';
import { format, startOfWeek, endOfWeek, subWeeks, addWeeks } from 'date-fns';
import { Clock, ChevronLeft, ChevronRight, Plus, Download, CheckCircle2, Send, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useTimesheets } from '@/hooks/useTimesheets';
import { PayrollExportDialog } from './PayrollExportDialog';
import { MileageTracker } from './MileageTracker';
import { TimesheetStatus } from '@/types/payroll';
import { toast } from 'sonner';

const STATUS_BADGES: Record<TimesheetStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  draft: { label: 'Draft', variant: 'secondary' },
  submitted: { label: 'Submitted', variant: 'default' },
  approved: { label: 'Approved', variant: 'outline' },
  exported: { label: 'Exported', variant: 'outline' },
  rejected: { label: 'Rejected', variant: 'destructive' },
};

export function TimesheetDashboard() {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showExport, setShowExport] = useState(false);
  const [showMileage, setShowMileage] = useState(false);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);

  const payPeriodStart = format(startOfWeek(currentWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const payPeriodEnd = format(endOfWeek(currentWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd');

  const { timesheets, entries, isLoading, fetchTimesheets, updateTimesheet, createTimesheet } = useTimesheets();

  // Fetch timesheets on mount and when period changes
  useState(() => { fetchTimesheets(); });

  const submitTimesheet = async (id: string) => {
    await updateTimesheet(id, { status: 'submitted', submitted_at: new Date().toISOString() } as any);
    fetchTimesheets();
  };
  const approveTimesheet = async (id: string) => {
    await updateTimesheet(id, { status: 'approved', approved_at: new Date().toISOString() } as any);
    fetchTimesheets();
  };
  const generateTimesheet = async (start: string, end: string) => {
    await createTimesheet({ pay_period_start: start, pay_period_end: end, status: 'draft', total_hours: 0, billable_hours: 0, non_billable_hours: 0, drive_time_hours: 0, total_mileage: 0 });
    fetchTimesheets();
  };

  const filteredTimesheets = filterStatus === 'all' 
    ? timesheets 
    : timesheets.filter(t => t.status === filterStatus);

  const totalHours = timesheets.reduce((sum, t) => sum + t.total_hours, 0);
  const totalBillable = timesheets.reduce((sum, t) => sum + t.billable_hours, 0);
  const totalMileage = timesheets.reduce((sum, t) => sum + t.total_mileage, 0);

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="text-center min-w-[200px]">
            <p className="font-medium">
              {format(startOfWeek(currentWeek, { weekStartsOn: 1 }), 'MMM d')} - {format(endOfWeek(currentWeek, { weekStartsOn: 1 }), 'MMM d, yyyy')}
            </p>
            <p className="text-xs text-muted-foreground">Pay Period</p>
          </div>
          <Button variant="outline" size="icon" onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[130px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="exported">Exported</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setShowMileage(true)} className="gap-2">
            <Clock className="w-4 h-4" />
            Log Mileage
          </Button>
          <Button variant="outline" onClick={() => setShowGenerateDialog(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Generate
          </Button>
          <Button onClick={() => setShowExport(true)} className="gap-2">
            <Download className="w-4 h-4" />
            Export Payroll
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{timesheets.length}</div>
            <p className="text-sm text-muted-foreground">Timesheets</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{totalHours.toFixed(1)}</div>
            <p className="text-sm text-muted-foreground">Total Hours</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{totalBillable.toFixed(1)}</div>
            <p className="text-sm text-muted-foreground">Billable Hours</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{totalMileage.toFixed(0)}</div>
            <p className="text-sm text-muted-foreground">Total Miles</p>
          </CardContent>
        </Card>
      </div>

      {/* Timesheets Table */}
      <Card>
        <CardHeader>
          <CardTitle>Staff Timesheets</CardTitle>
          <CardDescription>Review and approve timesheets for the selected pay period</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredTimesheets.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="font-medium">No timesheets for this period</p>
              <p className="text-sm">Click "Generate" to create timesheets from appointments</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff Member</TableHead>
                  <TableHead>Total Hours</TableHead>
                  <TableHead>Billable</TableHead>
                  <TableHead>Non-Billable</TableHead>
                  <TableHead>Drive Time</TableHead>
                  <TableHead>Mileage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTimesheets.map((ts) => {
                  const statusBadge = STATUS_BADGES[ts.status];
                  return (
                    <TableRow key={ts.id}>
                      <TableCell className="font-medium">{ts.staff_name || 'Unknown Staff'}</TableCell>
                      <TableCell>{ts.total_hours.toFixed(1)}</TableCell>
                      <TableCell>{ts.billable_hours.toFixed(1)}</TableCell>
                      <TableCell>{ts.non_billable_hours.toFixed(1)}</TableCell>
                      <TableCell>{ts.drive_time_hours.toFixed(1)}</TableCell>
                      <TableCell>{ts.total_mileage.toFixed(0)} mi</TableCell>
                      <TableCell>
                        <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {ts.status === 'draft' && (
                            <Button size="sm" variant="outline" onClick={() => submitTimesheet(ts.id)} className="gap-1">
                              <Send className="w-3 h-3" /> Submit
                            </Button>
                          )}
                          {ts.status === 'submitted' && (
                            <Button size="sm" variant="outline" onClick={() => approveTimesheet(ts.id)} className="gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Approve
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

      {/* Generate Dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Timesheets</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will auto-populate timesheets from completed appointments for the period{' '}
            <strong>{format(startOfWeek(currentWeek, { weekStartsOn: 1 }), 'MMM d')} - {format(endOfWeek(currentWeek, { weekStartsOn: 1 }), 'MMM d, yyyy')}</strong>.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>Cancel</Button>
            <Button onClick={() => { generateTimesheet(payPeriodStart, payPeriodEnd); setShowGenerateDialog(false); }}>
              Generate Timesheets
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showExport && <PayrollExportDialog open={showExport} onOpenChange={setShowExport} payPeriodStart={payPeriodStart} payPeriodEnd={payPeriodEnd} timesheets={timesheets} />}
      {showMileage && <MileageTracker open={showMileage} onOpenChange={setShowMileage} />}
    </div>
  );
}
