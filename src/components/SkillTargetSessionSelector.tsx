import { useState } from 'react';
import { Target, Check, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { SkillTarget } from '@/types/behavior';

interface SkillTargetSessionSelectorProps {
  skillTargets: SkillTarget[];
  activeTargetIds: string[];
  onToggleTarget: (targetId: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

export function SkillTargetSessionSelector({
  skillTargets,
  activeTargetIds,
  onToggleTarget,
  onSelectAll,
  onDeselectAll,
}: SkillTargetSessionSelectorProps) {
  const [open, setOpen] = useState(false);

  const activeCount = activeTargetIds.length;
  const totalCount = skillTargets.length;

  if (totalCount === 0) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-6 gap-1 text-xs">
          <Target className="w-3 h-3" />
          Skills
          <Badge variant="secondary" className="text-[9px] px-1">
            {activeCount}/{totalCount}
          </Badge>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Session Skill Targets</span>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-5 px-2 text-[10px]"
                onClick={onSelectAll}
              >
                All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 px-2 text-[10px]"
                onClick={onDeselectAll}
              >
                None
              </Button>
            </div>
          </div>

          <div className="space-y-1 max-h-48 overflow-y-auto">
            {skillTargets.map((target) => (
              <div
                key={target.id}
                className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50"
              >
                <Checkbox
                  id={`target-${target.id}`}
                  checked={activeTargetIds.includes(target.id)}
                  onCheckedChange={() => onToggleTarget(target.id)}
                />
                <Label
                  htmlFor={`target-${target.id}`}
                  className="text-xs cursor-pointer flex-1 truncate"
                >
                  {target.name}
                </Label>
                <Badge variant="outline" className="text-[9px] shrink-0">
                  {target.method.toUpperCase()}
                </Badge>
              </div>
            ))}
          </div>

          <p className="text-[10px] text-muted-foreground">
            Select which skill targets to collect data on this session
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
