import { useState, useEffect, useCallback } from 'react';
import { Cloud, CloudOff, Loader2, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  getHistoricalSyncStatus,
  onSyncStatusChanged,
  emitHistoricalDataChanged,
  type HistoricalSyncStatus,
} from '@/lib/historicalDataSync';
import { cn } from '@/lib/utils';

interface HistoricalSyncStatusBadgeProps {
  studentId: string;
  className?: string;
}

export function HistoricalSyncStatusBadge({ studentId, className }: HistoricalSyncStatusBadgeProps) {
  const [status, setStatus] = useState<HistoricalSyncStatus>(() =>
    getHistoricalSyncStatus(studentId)
  );
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Subscribe to status changes for this student
    const unsubscribe = onSyncStatusChanged((changedStudentId, newStatus) => {
      if (changedStudentId === studentId) {
        setStatus(newStatus);
        setVisible(true);

        // Auto-hide "synced" after 4 seconds
        if (newStatus === 'synced') {
          const timer = setTimeout(() => setVisible(false), 4000);
          return () => clearTimeout(timer);
        }
      }
    });
    return unsubscribe;
  }, [studentId]);

  // Also keep status in sync on mount
  useEffect(() => {
    const current = getHistoricalSyncStatus(studentId);
    setStatus(current);
    setVisible(current !== 'idle');
  }, [studentId]);

  const handleRetry = useCallback(() => {
    emitHistoricalDataChanged(studentId);
  }, [studentId]);

  if (!visible || status === 'idle') return null;

  return (
    <div className={cn('inline-flex items-center', className)}>
      {status === 'pending' && (
        <Badge variant="outline" className="gap-1 text-xs text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 dark:text-amber-400">
          <Loader2 className="w-3 h-3 animate-spin" />
          Saving…
        </Badge>
      )}

      {status === 'synced' && (
        <Badge variant="outline" className="gap-1 text-xs text-emerald-600 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-700 dark:text-emerald-400 animate-in fade-in duration-300">
          <Check className="w-3 h-3" />
          Saved
        </Badge>
      )}

      {status === 'error' && (
        <div className="flex items-center gap-1">
          <Badge variant="outline" className="gap-1 text-xs text-destructive border-destructive/30 bg-destructive/10">
            <CloudOff className="w-3 h-3" />
            Save failed
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 px-1.5 text-xs text-destructive hover:text-destructive"
            onClick={handleRetry}
          >
            Retry
          </Button>
        </div>
      )}
    </div>
  );
}
