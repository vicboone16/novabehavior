import { LayoutGrid, List as ListIcon, Columns2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export type WorkspaceLayout = 'grid' | 'list' | 'split';

interface WorkspaceLayoutToggleProps {
  value: WorkspaceLayout;
  onChange: (next: WorkspaceLayout) => void;
}

const OPTIONS: { value: WorkspaceLayout; label: string; icon: typeof LayoutGrid }[] = [
  { value: 'grid', label: 'Grid', icon: LayoutGrid },
  { value: 'list', label: 'List', icon: ListIcon },
  { value: 'split', label: 'Split', icon: Columns2 },
];

export function WorkspaceLayoutToggle({ value, onChange }: WorkspaceLayoutToggleProps) {
  return (
    <TooltipProvider>
      <div className="flex border rounded-md overflow-hidden h-8">
        {OPTIONS.map(({ value: v, label, icon: Icon }) => {
          const active = v === value;
          return (
            <Tooltip key={v}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onChange(v)}
                  className={`px-2.5 inline-flex items-center justify-center transition-colors ${
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background hover:bg-muted text-muted-foreground'
                  }`}
                  aria-pressed={active}
                  aria-label={`${label} layout`}
                >
                  <Icon className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>{label} layout</TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
