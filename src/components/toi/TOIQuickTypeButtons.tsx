import { Button } from '@/components/ui/button';
import { TOI_QUICK_TYPE_PRESETS, TOIEventType, TOI_EVENT_LABELS } from '@/types/toi';

interface TOIQuickTypeButtonsProps {
  onQuickStart: (type: TOIEventType, displayLabel: string, defaults?: {
    location?: string;
    contributor?: string;
  }) => void;
  disabled?: boolean;
}

export function TOIQuickTypeButtons({ onQuickStart, disabled }: TOIQuickTypeButtonsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {TOI_QUICK_TYPE_PRESETS.map((preset) => (
        <Button
          key={preset.type}
          variant="outline"
          size="lg"
          disabled={disabled}
          className="h-auto py-3 px-4 flex flex-col items-center gap-1 min-w-[100px]"
          onClick={() => onQuickStart(preset.type, preset.label, {
            location: preset.defaultLocation,
            contributor: preset.defaultContributor,
          })}
        >
          <span className="text-2xl">{preset.icon}</span>
          <span className="text-sm font-medium">{preset.label}</span>
        </Button>
      ))}
    </div>
  );
}
