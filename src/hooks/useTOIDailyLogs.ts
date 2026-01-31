import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import type { TOIDailyLog, TOIDailyLogInput, TOIDailyStatus } from '@/types/toiDailyLog';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';

interface UseTOIDailyLogsOptions {
  studentId?: string;
  dateRange?: { start: Date; end: Date };
}

export function useTOIDailyLogs(options: UseTOIDailyLogsOptions = {}) {
  const { user } = useAuth();
  const [logs, setLogs] = useState<TOIDailyLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    if (!options.studentId) {
      setLogs([]);
      setLoading(false);
      return;
    }

    try {
      let query = supabase
        .from('toi_daily_logs')
        .select('*')
        .eq('student_id', options.studentId)
        .order('log_date', { ascending: false });

      if (options.dateRange) {
        const startDate = format(options.dateRange.start, 'yyyy-MM-dd');
        const endDate = format(options.dateRange.end, 'yyyy-MM-dd');
        query = query.gte('log_date', startDate).lte('log_date', endDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      const typedData = (data || []).map((row: any) => ({
        id: row.id,
        student_id: row.student_id,
        log_date: row.log_date,
        status: row.status as TOIDailyStatus,
        notes: row.notes,
        created_by_user_id: row.created_by_user_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
      })) as TOIDailyLog[];

      setLogs(typedData);
    } catch (error: any) {
      console.error('Error fetching TOI daily logs:', error);
      toast({
        title: 'Error loading TOI daily logs',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [options.studentId, options.dateRange?.start?.toISOString(), options.dateRange?.end?.toISOString()]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Subscribe to realtime changes
  useEffect(() => {
    if (!options.studentId) return;

    const channel = supabase
      .channel(`toi_daily_logs_${options.studentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'toi_daily_logs',
          filter: `student_id=eq.${options.studentId}`,
        },
        () => {
          fetchLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [options.studentId, fetchLogs]);

  const upsertLog = useCallback(async (input: TOIDailyLogInput) => {
    if (!user?.id) {
      toast({ title: 'Not authenticated', variant: 'destructive' });
      return null;
    }

    try {
      // Check if log already exists for this date
      const { data: existing } = await supabase
        .from('toi_daily_logs')
        .select('id')
        .eq('student_id', input.student_id)
        .eq('log_date', input.log_date)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { data, error } = await supabase
          .from('toi_daily_logs')
          .update({
            status: input.status,
            notes: input.notes ?? null,
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data as unknown as TOIDailyLog;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('toi_daily_logs')
          .insert({
            student_id: input.student_id,
            log_date: input.log_date,
            status: input.status,
            notes: input.notes ?? null,
            created_by_user_id: user.id,
          })
          .select()
          .single();

        if (error) throw error;
        return data as unknown as TOIDailyLog;
      }
    } catch (error: any) {
      console.error('Error saving TOI daily log:', error);
      toast({
        title: 'Error saving TOI daily log',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }
  }, [user?.id]);

  const deleteLog = useCallback(async (logId: string) => {
    try {
      const { error } = await supabase
        .from('toi_daily_logs')
        .delete()
        .eq('id', logId);

      if (error) throw error;
      return true;
    } catch (error: any) {
      console.error('Error deleting TOI daily log:', error);
      toast({
        title: 'Error deleting log',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  }, []);

  const deleteLogByDate = useCallback(async (studentId: string, logDate: string) => {
    try {
      const { error } = await supabase
        .from('toi_daily_logs')
        .delete()
        .eq('student_id', studentId)
        .eq('log_date', logDate);

      if (error) throw error;
      return true;
    } catch (error: any) {
      console.error('Error deleting TOI daily log:', error);
      toast({
        title: 'Error deleting log',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  }, []);

  // Bulk upsert for multiple dates
  const bulkUpsert = useCallback(async (inputs: TOIDailyLogInput[]) => {
    if (!user?.id) {
      toast({ title: 'Not authenticated', variant: 'destructive' });
      return { success: 0, failed: 0 };
    }

    let successCount = 0;
    let failedCount = 0;

    // Process in batches to avoid overwhelming the DB
    for (const input of inputs) {
      const result = await upsertLog(input);
      if (result) {
        successCount++;
      } else {
        failedCount++;
      }
    }

    if (successCount > 0) {
      toast({
        title: 'TOI Daily Logs Saved',
        description: `${successCount} entries saved${failedCount > 0 ? `, ${failedCount} failed` : ''}`,
        variant: failedCount > 0 ? 'destructive' : 'default',
      });
    }

    return { success: successCount, failed: failedCount };
  }, [user?.id, upsertLog]);

  // Get log for a specific date
  const getLogForDate = useCallback((dateStr: string): TOIDailyLog | undefined => {
    return logs.find(log => log.log_date === dateStr);
  }, [logs]);

  return {
    logs,
    loading,
    upsertLog,
    deleteLog,
    deleteLogByDate,
    bulkUpsert,
    getLogForDate,
    refetch: fetchLogs,
  };
}
