import { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, Cloud, CloudOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSync, setPendingSync] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-sync when coming back online
      handleSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check localStorage for pending items
    const checkPending = () => {
      try {
        const pending = localStorage.getItem('pendingSyncQueue');
        if (pending) {
          const queue = JSON.parse(pending);
          setPendingSync(Array.isArray(queue) ? queue.length : 0);
        }
      } catch (e) {
        // Ignore parse errors
      }
    };

    checkPending();
    const interval = setInterval(checkPending, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const handleSync = async () => {
    if (!isOnline || isSyncing) return;

    setIsSyncing(true);
    
    try {
      // Simulate sync process
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Clear pending queue
      localStorage.removeItem('pendingSyncQueue');
      setPendingSync(0);
      setLastSynced(new Date());
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Don't show if online and nothing pending
  if (isOnline && pendingSync === 0 && !isSyncing) {
    return null;
  }

  return (
    <div 
      className={`px-4 py-2 flex items-center justify-between text-sm ${
        isOnline 
          ? 'bg-muted/50 border-b' 
          : 'bg-destructive/10 border-b border-destructive/20'
      }`}
    >
      <div className="flex items-center gap-2">
        {isOnline ? (
          <>
            <Cloud className="w-4 h-4 text-muted-foreground" />
            {pendingSync > 0 ? (
              <span className="text-muted-foreground">
                {pendingSync} item{pendingSync !== 1 ? 's' : ''} pending sync
              </span>
            ) : isSyncing ? (
              <span className="text-muted-foreground">Syncing...</span>
            ) : (
              <span className="text-muted-foreground">
                Last synced: {lastSynced ? lastSynced.toLocaleTimeString() : 'Never'}
              </span>
            )}
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4 text-destructive" />
            <span className="text-destructive">Offline</span>
            {pendingSync > 0 && (
              <Badge variant="secondary" className="text-xs">
                {pendingSync} pending
              </Badge>
            )}
          </>
        )}
      </div>

      {isOnline && pendingSync > 0 && (
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
