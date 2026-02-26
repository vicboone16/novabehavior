import { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Pencil,
  MoreHorizontal,
  Trash2,
  Target,
  ListChecks,
  Clock,
  Info,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSkillProgramActions } from '@/hooks/useSkillPrograms';
import type { SkillProgram, SkillTarget, ProgramStatus } from '@/types/skillPrograms';
import {
  PROGRAM_STATUS_LABELS,
  PROGRAM_STATUS_COLORS,
  SKILL_METHOD_LABELS,
  TARGET_STATUS_LABELS,
  resolvePromptCountsAsCorrect,
  getPromptCorrectnessSource,
} from '@/types/skillPrograms';
import { PHASE_LABELS, PHASE_COLORS, type TargetPhase } from '@/types/criteriaEngine';
import type { Domain } from '@/types/curriculum';

interface ProgramHierarchyViewProps {
  programs: SkillProgram[];
  domains: Domain[];
  studentId: string;
  onRefetch: () => void;
  onEditProgram: (program: SkillProgram) => void;
}

export function ProgramHierarchyView({
  programs,
  domains,
  studentId,
  onRefetch,
  onEditProgram,
}: ProgramHierarchyViewProps) {
  const { changeProgramStatus, deleteProgram, addTarget, updateTarget, deleteTarget } =
    useSkillProgramActions(studentId, onRefetch);

  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());
  const [expandedPrograms, setExpandedPrograms] = useState<Set<string>>(new Set());
  const [addingTargetTo, setAddingTargetTo] = useState<string | null>(null);
  const [newTargetName, setNewTargetName] = useState('');
  const [newTargetDef, setNewTargetDef] = useState('');
  const [statusChangeProgram, setStatusChangeProgram] = useState<SkillProgram | null>(null);
  const [newStatus, setNewStatus] = useState<ProgramStatus>('acquisition');
  const [statusDate, setStatusDate] = useState(new Date().toISOString().split('T')[0]);
  const [statusNote, setStatusNote] = useState('');

  // Group programs by domain
  const grouped = new Map<string, SkillProgram[]>();
  const noDomain: SkillProgram[] = [];

  for (const p of programs) {
    if (p.domain_id) {
      if (!grouped.has(p.domain_id)) grouped.set(p.domain_id, []);
      grouped.get(p.domain_id)!.push(p);
    } else {
      noDomain.push(p);
    }
  }

  const toggleDomain = (id: string) => {
    setExpandedDomains(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleProgram = (id: string) => {
    setExpandedPrograms(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleAddTarget = async (programId: string) => {
    if (!newTargetName.trim()) return;
    await addTarget(programId, {
      name: newTargetName.trim(),
      operational_definition: newTargetDef || undefined,
    });
    setAddingTargetTo(null);
    setNewTargetName('');
    setNewTargetDef('');
  };

  const handleStatusChange = async () => {
    if (!statusChangeProgram) return;
    await changeProgramStatus(
      statusChangeProgram.id,
      statusChangeProgram.status,
      newStatus,
      statusDate,
      statusNote || undefined
    );
    setStatusChangeProgram(null);
    setStatusNote('');
  };

  const renderTarget = (target: SkillTarget, program: SkillProgram) => {
    const promptSetting = resolvePromptCountsAsCorrect(
      target.prompt_counts_as_correct,
      program.prompt_counts_as_correct,
      undefined // student level would come from parent
    );
    const promptSource = getPromptCorrectnessSource(
      target.prompt_counts_as_correct,
      program.prompt_counts_as_correct,
      undefined
    );

    return (
      <div
        key={target.id}
        className="flex items-center justify-between py-1.5 px-3 ml-8 border-l-2 border-muted hover:bg-muted/30 rounded-r text-sm"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Target className="w-3 h-3 text-muted-foreground shrink-0" />
          <span className="truncate">{target.name}</span>
          <Badge variant="outline" className="text-[10px] shrink-0">
            {TARGET_STATUS_LABELS[target.status] || target.status}
          </Badge>
          {(target as any).phase && (
            <Badge className={`${PHASE_COLORS[(target as any).phase as TargetPhase] || 'bg-slate-500'} text-white text-[10px] shrink-0`}>
              {PHASE_LABELS[(target as any).phase as TargetPhase] || (target as any).phase}
            </Badge>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className={`text-[10px] shrink-0 cursor-help ${promptSetting ? 'border-amber-500 text-amber-600' : 'border-muted-foreground/30'}`}
              >
                {promptSetting ? 'P=✓' : 'P=✗'}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">
                Prompted = {promptSetting ? 'Correct' : 'Incorrect'}
                <span className="text-muted-foreground"> (from {promptSource})</span>
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <MoreHorizontal className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => {
              const current = target.prompt_counts_as_correct;
              const next = current === null ? true : current === true ? false : null;
              updateTarget(target.id, { prompt_counts_as_correct: next } as any);
            }}>
              <Info className="w-3 h-3 mr-2" />
              {target.prompt_counts_as_correct === null
                ? 'Set: Prompted = Correct'
                : target.prompt_counts_as_correct
                  ? 'Set: Prompted = Incorrect'
                  : 'Reset to inherit'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={() => deleteTarget(target.id)}>
              <Trash2 className="w-3 h-3 mr-2" /> Archive Target
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  const renderProgram = (program: SkillProgram) => {
    const isExpanded = expandedPrograms.has(program.id);
    const targetCount = program.targets?.length || 0;
    const statusColor = PROGRAM_STATUS_COLORS[program.status as ProgramStatus] || 'bg-gray-500';

    return (
      <div key={program.id} className="ml-4">
        <Collapsible open={isExpanded} onOpenChange={() => toggleProgram(program.id)}>
          <div className="flex items-center justify-between py-2 px-2 hover:bg-muted/40 rounded group">
            <CollapsibleTrigger className="flex items-center gap-2 flex-1 min-w-0 text-left">
              {isExpanded ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
              <ListChecks className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="font-medium text-sm truncate">{program.name}</span>
              <Badge className={`${statusColor} text-white text-[10px] shrink-0`}>
                {PROGRAM_STATUS_LABELS[program.status as ProgramStatus] || program.status}
              </Badge>
              <Badge variant="outline" className="text-[10px] shrink-0">
                {SKILL_METHOD_LABELS[program.method as keyof typeof SKILL_METHOD_LABELS] || program.method}
              </Badge>
              <span className="text-xs text-muted-foreground shrink-0">
                {targetCount} target{targetCount !== 1 ? 's' : ''}
              </span>
            </CollapsibleTrigger>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setAddingTargetTo(program.id)}>
                <Plus className="w-3 h-3" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <MoreHorizontal className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEditProgram(program)}>
                    <Pencil className="w-3 h-3 mr-2" /> Edit Program
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    setStatusChangeProgram(program);
                    setNewStatus(program.status === 'baseline' ? 'acquisition' : 'mastered');
                  }}>
                    <Clock className="w-3 h-3 mr-2" /> Change Status
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive" onClick={() => deleteProgram(program.id)}>
                    <Trash2 className="w-3 h-3 mr-2" /> Archive Program
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <CollapsibleContent>
            <div className="space-y-0.5 pb-2">
              {program.targets && program.targets.map(t => renderTarget(t, program))}
              {targetCount === 0 && (
                <p className="ml-12 text-xs text-muted-foreground py-1">No targets yet</p>
              )}

              {addingTargetTo === program.id && (
                <div className="ml-8 p-2 border rounded space-y-2 bg-muted/20">
                  <Input
                    value={newTargetName}
                    onChange={e => setNewTargetName(e.target.value)}
                    placeholder="Target name"
                    className="text-sm"
                    autoFocus
                  />
                  <Input
                    value={newTargetDef}
                    onChange={e => setNewTargetDef(e.target.value)}
                    placeholder="Operational definition (optional)"
                    className="text-sm"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" className="h-7 text-xs" onClick={() => handleAddTarget(program.id)} disabled={!newTargetName.trim()}>
                      Add
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setAddingTargetTo(null); setNewTargetName(''); setNewTargetDef(''); }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  };

  const renderDomainGroup = (domainId: string, domainPrograms: SkillProgram[]) => {
    const domain = domains.find(d => d.id === domainId);
    const isExpanded = expandedDomains.has(domainId);

    return (
      <Card key={domainId}>
        <Collapsible open={isExpanded} onOpenChange={() => toggleDomain(domainId)}>
          <CollapsibleTrigger className="w-full">
            <CardContent className="py-3 flex items-center gap-3 cursor-pointer hover:bg-muted/30">
              {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              <h3 className="font-semibold text-sm">{domain?.name || 'Unknown Domain'}</h3>
              <Badge variant="secondary" className="text-xs">
                {domainPrograms.length} program{domainPrograms.length !== 1 ? 's' : ''}
              </Badge>
            </CardContent>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="pb-2">
              {domainPrograms.map(renderProgram)}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    );
  };

  if (programs.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <ListChecks className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="font-medium text-lg mb-2">No skill programs yet</h3>
          <p className="text-sm text-muted-foreground">
            Create a program to start organizing targets by domain and skill area.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {Array.from(grouped.entries()).map(([domainId, progs]) =>
        renderDomainGroup(domainId, progs)
      )}
      {noDomain.length > 0 && renderDomainGroup('__none__', noDomain)}

      {/* Status Change Dialog */}
      <Dialog open={!!statusChangeProgram} onOpenChange={(o) => !o && setStatusChangeProgram(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Program Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="text-sm">
              <span className="text-muted-foreground">Program:</span>{' '}
              <span className="font-medium">{statusChangeProgram?.name}</span>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">New Status</label>
              <Select value={newStatus} onValueChange={v => setNewStatus(v as ProgramStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PROGRAM_STATUS_LABELS).map(([k, label]) => (
                    <SelectItem key={k} value={k}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Effective Date *</label>
              <Input type="date" value={statusDate} onChange={e => setStatusDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Note (optional)</label>
              <Input value={statusNote} onChange={e => setStatusNote(e.target.value)} placeholder="Reason for change..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusChangeProgram(null)}>Cancel</Button>
            <Button onClick={handleStatusChange}>Change Status</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
