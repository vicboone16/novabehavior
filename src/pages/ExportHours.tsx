import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAgencyContext } from '@/hooks/useAgencyContext';
import { toast } from 'sonner';
import { format, subDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, ArrowLeft, CalendarIcon, Download, FileSpreadsheet } from 'lucide-react';

interface HoursRow {
  group_key: string;
  group_label: string;
  total_minutes: number;
  billable_minutes: number;
  nonbillable_minutes: number;
  total_hours: number;
  billable_hours: number;
  nonbillable_hours: number;
  entry_count: number;
}

function downloadCSV(rows: HoursRow[], grouping: string, startDate: Date, endDate: Date) {
  const headers = ['Group', 'Entries', 'Total Min', 'Billable Min', 'Non-Billable Min', 'Total Hrs', 'Billable Hrs', 'Non-Billable Hrs'];
  const csvRows = [
    headers.join(','),
    ...rows.map((r) =>
      [
        `"${r.group_label}"`,
        r.entry_count,
        r.total_minutes,
        r.billable_minutes,
        r.nonbillable_minutes,
        r.total_hours,
        r.billable_hours,
        r.nonbillable_hours,
      ].join(',')
    ),
  ];
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `hours_${grouping}_${format(startDate, 'yyyyMMdd')}_${format(endDate, 'yyyyMMdd')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ExportHours() {
  const navigate = useNavigate();
  const { currentAgency, agencies, loading: agencyLoading } = useAgencyContext();
  const [agencyId, setAgencyId] = useState(currentAgency?.id || '');
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 14));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [grouping, setGrouping] = useState('by_staff');
  const [results, setResults] = useState<HoursRow[] | null>(null);

  const runReport = useMutation({
    mutationFn: async () => {
      if (!agencyId) throw new Error('Select an agency');
      const { data, error } = await supabase.rpc('rpc_export_hours', {
        p_agency_id: agencyId,
        p_start_date: format(startDate, 'yyyy-MM-dd'),
        p_end_date: format(endDate, 'yyyy-MM-dd'),
        p_grouping: grouping,
      });
      if (error) throw error;
      return (data || []) as HoursRow[];
    },
    onSuccess: (data) => {
      setResults(data);
      if (data.length === 0) toast.info('No data found for the selected range.');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to run report');
    },
  });

  // Totals
  const totals = results?.reduce(
    (acc, r) => ({
      total_minutes: acc.total_minutes + r.total_minutes,
      billable_minutes: acc.billable_minutes + r.billable_minutes,
      nonbillable_minutes: acc.nonbillable_minutes + r.nonbillable_minutes,
      total_hours: acc.total_hours + Number(r.total_hours),
      billable_hours: acc.billable_hours + Number(r.billable_hours),
      nonbillable_hours: acc.nonbillable_hours + Number(r.nonbillable_hours),
      entry_count: acc.entry_count + r.entry_count,
    }),
    { total_minutes: 0, billable_minutes: 0, nonbillable_minutes: 0, total_hours: 0, billable_hours: 0, nonbillable_hours: 0, entry_count: 0 }
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-20">
        <div className="container py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/billing')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold text-foreground">Export Hours</h1>
              <p className="text-xs text-muted-foreground">Generate hours reports grouped by staff, client, or service</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-6 space-y-6 max-w-4xl">
        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileSpreadsheet className="h-5 w-5" />
              Report Parameters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Agency */}
              <div className="space-y-1.5">
                <Label>Agency</Label>
                <Select value={agencyId} onValueChange={setAgencyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select agency" />
                  </SelectTrigger>
                  <SelectContent>
                    {agencies.map((m) => (
                      <SelectItem key={m.agency_id} value={m.agency_id}>
                        {m.agency.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Grouping */}
              <div className="space-y-1.5">
                <Label>Group By</Label>
                <Select value={grouping} onValueChange={setGrouping}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="by_staff">By Staff</SelectItem>
                    <SelectItem value="by_client">By Client</SelectItem>
                    <SelectItem value="by_service">By Service</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {/* Start Date */}
              <div className="space-y-1.5">
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !startDate && 'text-muted-foreground')}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={startDate} onSelect={(d) => d && setStartDate(d)} initialFocus className={cn('p-3 pointer-events-auto')} />
                  </PopoverContent>
                </Popover>
              </div>

              {/* End Date */}
              <div className="space-y-1.5">
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !endDate && 'text-muted-foreground')}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={endDate} onSelect={(d) => d && setEndDate(d)} initialFocus className={cn('p-3 pointer-events-auto')} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => runReport.mutate()} disabled={runReport.isPending || !agencyId}>
                {runReport.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Run Report
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {results !== null && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Results</CardTitle>
                  <CardDescription>
                    {results.length} group{results.length !== 1 ? 's' : ''} · {format(startDate, 'MMM d')} – {format(endDate, 'MMM d, yyyy')}
                  </CardDescription>
                </div>
                {results.length > 0 && (
                  <Button variant="outline" size="sm" onClick={() => downloadCSV(results, grouping, startDate, endDate)}>
                    <Download className="mr-2 h-4 w-4" />
                    Download CSV
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {results.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No data found.</p>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{grouping === 'by_staff' ? 'Staff' : grouping === 'by_client' ? 'Client' : 'Service'}</TableHead>
                        <TableHead className="text-right">Entries</TableHead>
                        <TableHead className="text-right">Total Min</TableHead>
                        <TableHead className="text-right">Billable Min</TableHead>
                        <TableHead className="text-right">Non-Bill Min</TableHead>
                        <TableHead className="text-right">Total Hrs</TableHead>
                        <TableHead className="text-right">Billable Hrs</TableHead>
                        <TableHead className="text-right">Non-Bill Hrs</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.map((r) => (
                        <TableRow key={r.group_key}>
                          <TableCell className="font-medium">{r.group_label}</TableCell>
                          <TableCell className="text-right">{r.entry_count}</TableCell>
                          <TableCell className="text-right">{r.total_minutes}</TableCell>
                          <TableCell className="text-right">{r.billable_minutes}</TableCell>
                          <TableCell className="text-right">{r.nonbillable_minutes}</TableCell>
                          <TableCell className="text-right font-medium">{r.total_hours}</TableCell>
                          <TableCell className="text-right">{r.billable_hours}</TableCell>
                          <TableCell className="text-right">{r.nonbillable_hours}</TableCell>
                        </TableRow>
                      ))}
                      {/* Totals row */}
                      {totals && (
                        <TableRow className="bg-muted/50 font-semibold">
                          <TableCell>Totals</TableCell>
                          <TableCell className="text-right">{totals.entry_count}</TableCell>
                          <TableCell className="text-right">{totals.total_minutes}</TableCell>
                          <TableCell className="text-right">{totals.billable_minutes}</TableCell>
                          <TableCell className="text-right">{totals.nonbillable_minutes}</TableCell>
                          <TableCell className="text-right">{totals.total_hours.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{totals.billable_hours.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{totals.nonbillable_hours.toFixed(2)}</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
