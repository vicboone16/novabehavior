/**
 * SessionTargetPicker
 * 
 * Dialog that lets the user start a skill acquisition session by picking
 * which targets to collect data on.
 */

import { useState, useMemo } from 'react';
import {
  Play,
  Target,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Zap,
  Filter,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import type { SkillProgram, SkillTarget } from '@/types/skillPrograms';
import { SKILL_METHOD_LABELS, PROGRAM_STATUS_LABELS } from '@/types/skillPrograms';

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
  open,
  onOpenChange,
  programs,
  existingSessionId,
  onStart,
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
      if (next.has(id)) next.delete(id);
      else next.add(id);
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
      if (allSelected) {
        targetIds.forEach(id => next.delete(id));
      } else {
        targetIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(allTargets.map(t => t.target.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

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
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedPrograms(new Set(programs.map(p => p.id)));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Start Skill Acquisition Session
          </DialogTitle>
          <DialogDescription>
            Select which targets to work on during this session. You can cycle through them and record data for each one.
          </DialogDescription>
        </DialogHeader>

        {/* Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={selectAll}>
            <CheckSquare className="h-3.5 w-3.5 mr-1" />
            Select All
          </Button>
          <Button variant="outline" size="sm" onClick={deselectAll}>
            Clear
          </Button>
          <Button variant="outline" size="sm" onClick={expandAll}>
            <Zap className="h-3.5 w-3.5 mr-1" />
            Expand All
          </Button>
          <div className="flex-1" />
          <Button
            variant={filterActive ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterActive(f => !f)}
          >
            <Filter className="h-3.5 w-3.5 mr-1" />
            {filterActive ? 'Active Only' : 'Show All'}
          </Button>
        </div>

        <Separator />

        {/* Target list */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="space-y-1 pr-4">
            {programs.map(program => {
              const programTargets = (program.targets || []).filter(
                t => !filterActive || (t.active && t.status !== 'discontinued' && t.status !== 'mastered')
              );
              if (programTargets.length === 0) return null;

              const allChecked = programTargets.every(t => selectedIds.has(t.id));
              const someChecked = programTargets.some(t => selectedIds.has(t.id));
              const isExpanded = expandedPrograms.has(program.id);

              return (
                <Collapsible
                  key={program.id}
                  open={isExpanded}
                  onOpenChange={() => toggleProgramExpanded(program.id)}
                >
                  <div className="flex items-center gap-2 py-2 px-2 rounded-md hover:bg-muted/50">
                    <Checkbox
                      checked={allChecked}
                      onCheckedChange={() => toggleAllInProgram(program.id)}
                    />
                    <CollapsibleTrigger className="flex items-center gap-2 flex-1 text-left">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="font-medium text-sm">{program.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {SKILL_METHOD_LABELS[program.method as keyof typeof SKILL_METHOD_LABELS] || program.method}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {PROGRAM_STATUS_LABELS[program.status as keyof typeof PROGRAM_STATUS_LABELS] || program.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {programTargets.filter(t => selectedIds.has(t.id)).length}/{programTargets.length}
                      </span>
                    </CollapsibleTrigger>
                  </div>

                  <CollapsibleContent>
                    <div className="ml-10 space-y-1 pb-2">
                      {programTargets.map(target => (
                        <div key={target.id} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/30">
                          <Checkbox
                            checked={selectedIds.has(target.id)}
                            onCheckedChange={() => toggleTarget(target.id)}
                          />
                          <Target className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm">{target.name}</span>
                          {target.phase && (
                            <Badge variant="outline" className="text-xs">
                              {target.phase}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}

            {allTargets.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="font-medium">No targets found</p>
                <p className="text-sm">Add programs and targets first</p>
              </div>
            )}
          </div>
        </ScrollArea>

        <Separator />

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <span className="text-sm text-muted-foreground">
            {selectedIds.size} target{selectedIds.size !== 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleStart} disabled={selectedIds.size === 0}>
              <Play className="h-4 w-4 mr-1" />
              Start Session ({selectedIds.size})
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
