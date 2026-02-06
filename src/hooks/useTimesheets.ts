import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { StaffTimesheet, TimesheetEntry, PayrollExport, PayrollExportFormat } from '@/types/payroll';

export function useTimesheets() {
  const { user } = useAuth();
  const [timesheets, setTimesheets] = useState<StaffTimesheet[]>([]);
  const [entries, setEntries] = useState<TimesheetEntry[]>([]);
  const [exports, setExports] = useState<PayrollExport[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTimesheets = useCallback(async (staffId?: string) => {
    setIsLoading(true);
    try {
      let query = supabase.from('staff_timesheets').select('*').order('pay_period_start', { ascending: false });
      if (staffId) query = query.eq('staff_user_id', staffId);
      const { data, error } = await query;
      if (error) throw error;
      setTimesheets((data || []) as unknown as StaffTimesheet[]);
    } catch (err: any) {
      toast.error('Failed to load timesheets: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchEntries = useCallback(async (timesheetId: string) => {
    const { data, error } = await supabase
      .from('timesheet_entries')
      .select('*')
      .eq('timesheet_id', timesheetId)
      .order('entry_date', { ascending: true });
    if (error) throw error;
    setEntries((data || []) as unknown as TimesheetEntry[]);
    return data as unknown as TimesheetEntry[];
  }, []);

  const createTimesheet = useCallback(async (timesheet: Partial<StaffTimesheet>) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('staff_timesheets')
      .insert({ ...timesheet, staff_user_id: timesheet.staff_user_id || user.id } as any)
      .select()
      .single();
    if (error) throw error;
    toast.success('Timesheet created');
    return data as unknown as StaffTimesheet;
  }, [user]);

  const updateTimesheet = useCallback(async (id: string, updates: Partial<StaffTimesheet>) => {
    const { error } = await supabase.from('staff_timesheets').update(updates as any).eq('id', id);
    if (error) throw error;
    toast.success('Timesheet updated');
  }, []);

  const addEntry = useCallback(async (entry: Partial<TimesheetEntry>) => {
    const { data, error } = await supabase.from('timesheet_entries').insert(entry as any).select().single();
    if (error) throw error;
    return data as unknown as TimesheetEntry;
  }, []);

  const updateEntry = useCallback(async (id: string, updates: Partial<TimesheetEntry>) => {
    const { error } = await supabase.from('timesheet_entries').update(updates as any).eq('id', id);
    if (error) throw error;
  }, []);

  const deleteEntry = useCallback(async (id: string) => {
    const { error } = await supabase.from('timesheet_entries').delete().eq('id', id);
    if (error) throw error;
  }, []);

  const generatePayrollCSV = useCallback((timesheetData: StaffTimesheet[], entriesMap: Record<string, TimesheetEntry[]>, format: PayrollExportFormat): string => {
    const rows: string[][] = [];
    
    switch (format) {
      case 'quickbooks':
        rows.push(['Employee', 'Date', 'Hours', 'Rate', 'Type', 'Billable', 'Mileage']);
        timesheetData.forEach(ts => {
          const tsEntries = entriesMap[ts.id] || [];
          tsEntries.forEach(e => {
            rows.push([
              ts.staff_name || ts.staff_user_id,
              e.entry_date,
              (e.duration_minutes / 60).toFixed(2),
              (e.pay_rate || 0).toFixed(2),
              e.entry_type,
              e.is_billable ? 'Yes' : 'No',
              (e.mileage || 0).toFixed(1),
            ]);
          });
        });
        break;
      case 'gusto':
        rows.push(['Employee ID', 'Pay Period Start', 'Pay Period End', 'Regular Hours', 'OT Hours', 'Total Hours']);
        timesheetData.forEach(ts => {
          rows.push([ts.staff_user_id, ts.pay_period_start, ts.pay_period_end, ts.total_hours.toFixed(2), '0.00', ts.total_hours.toFixed(2)]);
        });
        break;
      case 'adp':
        rows.push(['Co Code', 'Batch ID', 'File #', 'Reg Hours', 'O/T Hours', 'Reg Earnings', 'Memo']);
        timesheetData.forEach(ts => {
          rows.push(['', '', ts.staff_user_id.slice(0, 8), ts.total_hours.toFixed(2), '0.00', '', `Period: ${ts.pay_period_start} to ${ts.pay_period_end}`]);
        });
        break;
      default:
        rows.push(['Staff ID', 'Staff Name', 'Period Start', 'Period End', 'Total Hours', 'Billable Hours', 'Non-Billable Hours', 'Drive Time', 'Mileage', 'Status']);
        timesheetData.forEach(ts => {
          rows.push([ts.staff_user_id, ts.staff_name || '', ts.pay_period_start, ts.pay_period_end, ts.total_hours.toFixed(2), ts.billable_hours.toFixed(2), ts.non_billable_hours.toFixed(2), ts.drive_time_hours.toFixed(2), ts.total_mileage.toFixed(1), ts.status]);
        });
    }
    
    return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  }, []);

  return {
    timesheets, entries, exports, isLoading,
    fetchTimesheets, fetchEntries, createTimesheet, updateTimesheet,
    addEntry, updateEntry, deleteEntry, generatePayrollCSV,
  };
}
