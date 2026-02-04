import { Hash, Timer, Clock, Grid3X3, FileText, Plus, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DataCollectionMethod } from '@/types/behavior';

export type MobileDataMode = 'frequency' | 'duration' | 'latency' | 'interval' | 'abc';

interface MobileDataToolbarProps {
  currentMode: MobileDataMode;
  onModeChange: (mode: MobileDataMode) => void;
  onAddBehavior: () => void;
  onOpenSettings: () => void;
  availableModes?: DataCollectionMethod[];
}

const MODE_CONFIG: { mode: MobileDataMode; icon: typeof Hash; label: string; method: DataCollectionMethod }[] = [
  { mode: 'frequency', icon: Hash, label: 'Freq', method: 'frequency' },
  { mode: 'duration', icon: Timer, label: 'Dur', method: 'duration' },
  { mode: 'latency', icon: Clock, label: 'Lat', method: 'latency' },
  { mode: 'interval', icon: Grid3X3, label: 'Int', method: 'interval' },
  { mode: 'abc', icon: FileText, label: 'ABC', method: 'abc' },
];

export function MobileDataToolbar({
  currentMode,
  onModeChange,
  onAddBehavior,
  onOpenSettings,
  availableModes,
}: MobileDataToolbarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-40 safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-2">
        {MODE_CONFIG.map(({ mode, icon: Icon, label, method }) => {
          const isAvailable = !availableModes || availableModes.includes(method);
          const isActive = currentMode === mode;
          
          return (
            <Button
              key={mode}
              variant="ghost"
              size="sm"
              className={cn(
                "flex flex-col gap-0.5 h-auto py-2 px-3 min-w-[48px]",
                isActive && "bg-primary/10 text-primary",
                !isAvailable && "opacity-40"
              )}
              onClick={() => onModeChange(mode)}
              disabled={!isAvailable}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </Button>
          );
        })}
        
        <div className="w-px h-8 bg-border" />
        
        <Button
          variant="ghost"
          size="sm"
          className="flex flex-col gap-0.5 h-auto py-2 px-3 min-w-[48px]"
          onClick={onAddBehavior}
        >
          <Plus className="w-5 h-5" />
          <span className="text-[10px] font-medium">Add</span>
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          className="flex flex-col gap-0.5 h-auto py-2 px-3 min-w-[48px]"
          onClick={onOpenSettings}
        >
          <Settings className="w-5 h-5" />
          <span className="text-[10px] font-medium">More</span>
        </Button>
      </div>
    </div>
  );
}
