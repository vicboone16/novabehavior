import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Behavior } from '@/types/behavior';

interface MobileBehaviorSelectorProps {
  behaviors: Behavior[];
  currentIndex: number;
  onPrev: () => void;
  onNext: () => void;
  onSelect: (index: number) => void;
}

export function MobileBehaviorSelector({
  behaviors,
  currentIndex,
  onPrev,
  onNext,
  onSelect,
}: MobileBehaviorSelectorProps) {
  return (
    <div className="border-b bg-card">
      {/* Navigation Row */}
      <div className="flex items-center justify-between px-2 py-2">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={onPrev}
          className="h-10 w-10"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>

        <div className="flex-1 overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 justify-center px-2">
            {behaviors.map((behavior, index) => (
              <Badge
                key={behavior.id}
                variant={index === currentIndex ? 'default' : 'outline'}
                className={`cursor-pointer whitespace-nowrap transition-all ${
                  index === currentIndex 
                    ? 'scale-105 shadow-sm' 
                    : 'opacity-70 hover:opacity-100'
                }`}
                onClick={() => onSelect(index)}
              >
                {behavior.name}
              </Badge>
            ))}
          </div>
        </div>

        <Button 
          variant="ghost" 
          size="icon"
          onClick={onNext}
          className="h-10 w-10"
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Indicator dots for many behaviors */}
      {behaviors.length > 5 && (
        <div className="flex justify-center gap-1 pb-2">
          {behaviors.map((_, index) => (
            <div
              key={index}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                index === currentIndex 
                  ? 'bg-primary' 
                  : 'bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
