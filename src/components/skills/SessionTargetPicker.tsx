import { useState, useMemo } from 'react';
import { Play, Target, ChevronDown, ChevronRight, Zap, Filter } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { SkillProgram, SkillTarget } from '@/types/skillPrograms';
import { SKILL_METHOD_LABELS, PROGRAM_STATUS_LABELS, PROGRAM_STATUS_COLORS } from '@/types/skillPrograms';

interface SessionTargetPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programs: SkillProgram[];
  existingSessionId?: string;
  onStart: (
    selectedTargets: { target: SkillTarget; program: SkillProgram }[],
    linkedSessionId?: string,
  ) => void;
}

export function SessionTargetPicker({
  open, onOpenChange, programs, existingSessionId, onStart,
}: SessionTargetPickerProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedPrograms, setExpandedPrograms] = useState<Set<string>>(new Set());
  const [filterActive, setFilterActive] = useState(true);

  const allTargets = useMemo(() => {
    const targets: { target: SkillTarget; program: SkillProgram }[] = [];
    for (const p of programs) {
      for (const t of p.targets || []) {
        if (!filterActive || (t.active && t.status !== 'discontinued' && t.status !== 'mastered')) {
          targets.push({ target: t, program: p });
        }
      }
    }
    return targets;
  }, [programs, filterActive]);

  const toggleTarget = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAllInProgram = (programId: string) => {
    const program = programs.find(p => p.id === programId);
    if (!program) return;
    const targetIds = (program.targets || [])
      .filter(t => !filterActive || (t.active && t.status !== 'discontinued' && t.status !== 'mastered'))
      .map(t => t.id);
    const allSelected = targetIds.every(id => selectedIds.has(id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allSelected) targetIds.forEach(id => next.delete(id));
      else targetIds.forEach(id => next.add(id));
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(allTargets.map(t => t.target.id)));
  const deselectAll = () => setSelectedIds(new Set());

  const handleStart = () => {
    const selected = allTargets.filter(t => selectedIds.has(t.target.id));
    if (selected.length === 0) return;
    onStart(selected, existingSessionId);
    onOpenChange(false);
    setSelectedIds(new Set());
  };

  const toggleProgramExpanded = (id: string) => {
    setExpandedPrograms(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const expandAll = () => setExpandedPrograms(new Set(programs.map(p => p.id)));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="w-5 h-5 text-primary" />
            Start Skill Acquisition Session
          </DialogTitle>
          <DialogDescription>
            Select targets to work on. You can cycle through them and record data for each one.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-1 items-center">
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={selectAll}>
            <Zap className="w-3 h-3 mr-1" /> Select All
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={deselectAll}>
            Clear
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={expandAll}>
            Expand All
          </Button>
          <Separator orientation="vertical" className="h-4 mx-1" />
          <Button
            variant={filterActive ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setFilterActive(f => !f)}
          >
            <Filter className="w-3 h-3 mr-1" />
            {filterActive ? 'Active Only' : 'Show All'}
          </Button>
        </div>

        <Separator />

        <ScrollArea className="flex-1 max-h-[50vh]">
          <div className="space-y-1 pr-2">
            {programs.map(program => {
              const programTargets = (program.targets || []).filter(
                t => !filterActive || (t.active && t.status !== 'discontinued' && t.status !== 'mastered')
              );
              if (programTargets.length === 0) return null;

              const allChecked = programTargets.every(t => selectedIds.has(t.id));
              const someChecked = programTargets.some(t => selectedIds.has(t.id));
              const isExpanded = expandedPrograms.has(program.id);
              const statusColor = PROGRAM_STATUS_COLORS[program.status as keyof typeof PROGRAM_STATUS_COLORS] || 'bg-slate-500';

              return (
                <Collapsible key={program.id} open={isExpanded} onOpenChange={() => toggleProgramExpanded(program.id)}>
                  <div className="flex items-center gap-2 py-1.5 px-2 hover:bg-muted/40 rounded">
                    <Checkbox
                      checked={allChecked}
                      onCheckedChange={() => toggleAllInProgram(program.id)}
                    />
                    <CollapsibleTrigger className="flex items-center gap-2 flex-1 min-w-0 text-left">
                      {isExpanded ? <ChevronDown className="w-3 h-3 shrink-0" /> : <ChevronRight className="w-3 h-3 shrink-0" />}
                      <span className="text-sm font-medium truncate">{program.name}</span>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {SKILL_METHOD_LABELS[program.method as keyof typeof SKILL_METHOD_LABELS] || program.method}
                      </Badge>
                      <Badge className={`${statusColor} text-white text-[10px] shrink-0`}>
                        {PROGRAM_STATUS_LABELS[program.status as keyof typeof PROGRAM_STATUS_LABELS] || program.status}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                        {programTargets.filter(t => selectedIds.has(t.id)).length}/{programTargets.length}
                      </span>
                    </CollapsibleTrigger>
                  </div>

                  <CollapsibleContent>
                    <div className="ml-8 space-y-0.5 pb-1">
                      {programTargets.map(target => (
                        <div key={target.id} className="flex items-center gap-2 py-1 px-2 hover:bg-muted/30 rounded text-sm">
                          <Checkbox
                            checked={selectedIds.has(target.id)}
                            onCheckedChange={() => toggleTarget(target.id)}
                          />
                          <Target className="w-3 h-3 text-muted-foreground shrink-0" />
                          <span className="truncate">{target.name}</span>
                          {target.phase && (
                            <Badge variant="outline" className="text-[10px] shrink-0">{target.phase}</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}

            {allTargets.length === 0 && (
              <div className="text-center py-8">
                <Target className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-sm font-medium">No targets found</p>
                <p className="text-xs text-muted-foreground">Add programs and targets first</p>
              </div>
            )}
          </div>
        </ScrollArea>

        <Separator />

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <span className="text-xs text-muted-foreground">
            {selectedIds.size} target{selectedIds.size !== 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleStart} disabled={selectedIds.size === 0}>
              <Play className="w-4 h-4 mr-1" />
              Start Session ({selectedIds.size})
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
