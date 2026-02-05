import { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, Cloud, CloudOff, Database, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useOfflineSync } from '@/hooks/useOfflineSync';

export function OfflineIndicator() {
  const {
    isOnline,
    isSyncing,
    pendingCount,
    failedCount,
    syncNow,
    storageAvailable,
    storageUsed,
    storageQuota,
  } = useOfflineSync();

  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  // Update last synced time when sync completes
  useEffect(() => {
    if (!isSyncing && pendingCount === 0 && failedCount === 0 && isOnline) {
      setLastSynced(new Date());
    }
  }, [isSyncing, pendingCount, failedCount, isOnline]);

  const handleSync = async () => {
    await syncNow();
    setLastSynced(new Date());
  };

  // Calculate storage percentage
  const storagePercent = storageQuota && storageUsed 
    ? Math.round((storageUsed / storageQuota) * 100) 
    : null;

  // Format storage size
  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Don't show if online and nothing pending
  if (isOnline && pendingCount === 0 && failedCount === 0 && !isSyncing) {
    return null;
  }

  const totalPending = pendingCount + failedCount;

  return (
    <div 
      className={`px-4 py-2 flex items-center justify-between text-sm ${
        isOnline 
          ? 'bg-muted/50 border-b' 
          : 'bg-destructive/10 border-b border-destructive/20'
      }`}
    >
      <div className="flex items-center gap-3">
        {isOnline ? (
          <>
            <Cloud className="w-4 h-4 text-muted-foreground" />
            {isSyncing ? (
              <span className="text-muted-foreground flex items-center gap-2">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Syncing...
              </span>
            ) : pendingCount > 0 ? (
              <span className="text-muted-foreground">
                {pendingCount} item{pendingCount !== 1 ? 's' : ''} pending sync
              </span>
            ) : failedCount > 0 ? (
              <span className="text-warning flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {failedCount} item{failedCount !== 1 ? 's' : ''} failed to sync
              </span>
            ) : (
              <span className="text-muted-foreground">
                Last synced: {lastSynced ? lastSynced.toLocaleTimeString() : 'Never'}
              </span>
            )}
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4 text-destructive" />
            <span className="text-destructive font-medium">Offline</span>
            {totalPending > 0 && (
              <Badge variant="secondary" className="text-xs">
                {totalPending} pending
              </Badge>
            )}
            {storageAvailable && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Database className="w-3 h-3" />
                    <span className="text-xs">Saved locally</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="space-y-1">
                    <p className="text-xs font-medium">Offline Storage</p>
                    {storagePercent !== null && (
                      <>
                        <Progress value={storagePercent} className="h-1 w-32" />
                        <p className="text-xs text-muted-foreground">
                          {formatBytes(storageUsed!)} / {formatBytes(storageQuota!)}
                        </p>
                      </>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Data will sync when you're back online
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            )}
          </>
        )}
      </div>

      {isOnline && totalPending > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSync}
          disabled={isSyncing}
          className="h-7 text-xs gap-1"
        >
          <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
          Sync Now
        </Button>
      )}
    </div>
  );
}
