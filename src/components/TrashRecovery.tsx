import { useState, useEffect } from 'react';
import { Trash2, RotateCcw, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDataStore } from '@/store/dataStore';
import { format } from 'date-fns';

interface TrashItem {
  id: string;
  type: 'frequency' | 'duration' | 'interval' | 'abc' | 'session';
  data: any;
  deletedAt: Date;
  studentName?: string;
  behaviorName?: string;
  description: string;
}

const TRASH_EXPIRY_MS = 20 * 60 * 1000; // 20 minutes

export function TrashRecovery() {
  const { 
    students,
    trash,
    restoreFromTrash,
    clearTrashItem,
    clearExpiredTrash,
  } = useDataStore();

  const [open, setOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState<{ [id: string]: number }>({});

  // Update time left every second
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const newTimeLeft: { [id: string]: number } = {};
      
      (trash || []).forEach((item: TrashItem) => {
        const deletedTime = new Date(item.deletedAt).getTime();
        const remaining = Math.max(0, TRASH_EXPIRY_MS - (now - deletedTime));
        newTimeLeft[item.id] = remaining;
      });
      
      setTimeLeft(newTimeLeft);
      
      // Clear expired items
      clearExpiredTrash?.();
    }, 1000);

    return () => clearInterval(interval);
  }, [trash, clearExpiredTrash]);

  const formatTimeLeft = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const trashItems = trash || [];
  const hasItems = trashItems.length > 0;

  if (!hasItems) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 relative">
          <Trash2 className="w-4 h-4" />
          <span className="hidden sm:inline">Trash</span>
          <Badge 
            variant="secondary" 
            className="absolute -top-2 -right-2 h-5 min-w-5 p-0 flex items-center justify-center text-[10px]"
          >
            {trashItems.length}
          </Badge>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="w-5 h-5" />
            Recently Deleted
            <Badge variant="outline" className="ml-2 text-xs">
              Auto-clears after 20 min
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[400px]">
          <div className="space-y-2">
            {trashItems.map((item: TrashItem) => {
              const remaining = timeLeft[item.id] || 0;
              const isExpiringSoon = remaining < 5 * 60 * 1000; // Less than 5 min

              return (
                <div 
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg border border-border"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-[10px]">
                        {item.type.toUpperCase()}
                      </Badge>
                      {item.studentName && (
                        <span className="text-xs text-muted-foreground truncate">
                          {item.studentName}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium truncate">{item.description}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span className={isExpiringSoon ? 'text-destructive font-medium' : ''}>
                        {formatTimeLeft(remaining)} left
                      </span>
                      <span>•</span>
                      <span>{format(new Date(item.deletedAt), 'HH:mm:ss')}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <Button
                      size="sm"
                      variant="default"
                      className="h-8 gap-1"
                      onClick={() => {
                        restoreFromTrash?.(item.id);
                      }}
                    >
                      <RotateCcw className="w-3 h-3" />
                      Restore
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => clearTrashItem?.(item.id)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {trashItems.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Trash2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>Trash is empty</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
