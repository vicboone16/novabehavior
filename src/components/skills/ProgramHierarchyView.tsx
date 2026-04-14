import { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Pencil,
  MoreHorizontal,
  Trash2,
  Info,
  ArrowRight,
  FolderInput,
  Play,
  BarChart3,
  Clock,
} from 'lucide-react';
import { TargetDataCollectionPanel } from './TargetDataCollectionPanel';
import { TargetGraphView } from './TargetGraphView';
import { TargetSparkline } from './TargetSparkline';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
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
import { Badge } from '@/components/ui/badge';
import { useSkillProgramActions } from '@/hooks/useSkillPrograms';
import { MoveTargetDialog } from './MoveTargetDialog';
import { MoveProgramDialog } from './MoveProgramDialog';
import type { SkillProgram, SkillTarget, ProgramStatus } from '@/types/skillPrograms';
import {
  PROGRAM_STATUS_LABELS,
  SKILL_METHOD_LABELS,
  TARGET_STATUS_LABELS,
} from '@/types/skillPrograms';
import { PHASE_LABELS, PHASE_COLORS, type TargetPhase } from '@/types/criteriaEngine';
import type { Domain } from '@/types/curriculum';

// Program status → left border accent color
const PROGRAM_BORDER: Record<string, string> = {
  baseline: 'border-l-amber-400',
  acquisition: 'border-l-blue-500',
  fluency: 'border-l-sky-400',
  generalization: 'border-l-violet-500',
  maintenance: 'border-l-teal-500',
  mastered: 'border-l-green-500',
  on_hold: 'border-l-gray-400',
  discontinued: 'border-l-gray-300',
};

// Target status → dot color
const TARGET_DOT: Record<string, string> = {
  not_started: 'bg-slate-300',
  in_progress: 'bg-blue-500',
  mastered: 'bg-green-500',
  on_hold: 'bg-yellow-400',
  discontinued: 'bg-gray-400',
};

// Method → short display label
const METHOD_SHORT: Record<string, string> = {
  discrete_trial: 'DTT',
  net: 'NET',
  task_analysis: 'TA',
  probe: 'Probe',
};

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

  const [expandedPrograms, setExpandedPrograms] = useState<Set<string>>(new Set());
  const [expandedTargets, setExpandedTargets] = useState<Set<string>>(new Set());
  const [addingTargetTo, setAddingTargetTo] = useState<string | null>(null);
  const [newTargetName, setNewTargetName] = useState('');
  const [newTargetDef, setNewTargetDef] = useState('');
  const [statusChangeProgram, setStatusChangeProgram] = useState<SkillProgram | null>(null);
  const [newStatus, setNewStatus] = useState<ProgramStatus>('acquisition');
  const [statusDate, setStatusDate] = useState(new Date().toISOString().split('T')[0]);
  const [statusNote, setStatusNote] = useState('');

  const [moveTarget, setMoveTarget] = useState<{ id: string; name: string; programId: string } | null>(null);
  const [moveProgram, setMoveProgram] = useState<{ id: string; name: string; domainId: string | null } | null>(null);
  const [editingTargetForPhase, setEditingTargetForPhase] = useState<SkillTarget | null>(null);
  const [editingTargetForStatus, setEditingTargetForStatus] = useState<SkillTarget | null>(null);
  const [recordingTarget, setRecordingTarget] = useState<{ target: SkillTarget; program: SkillProgram } | null>(null);
  const [graphTarget, setGraphTarget] = useState<{ target: SkillTarget; program: SkillProgram } | null>(null);
  const [sparklineKey, setSparklineKey] = useState(0);

  // Group programs by domain
  const grouped = new Map<string, SkillProgram[]>();
  const noDomain: SkillProgram[] = [];
  for (const p of programs) {
    const effectiveDomainId = p.top_level_domain_id || p.domain_id;
    if (effectiveDomainId) {
      if (!grouped.has(effectiveDomainId)) grouped.set(effectiveDomainId, []);
      grouped.get(effectiveDomainId)!.push(p);
    } else {
      noDomain.push(p);
    }
  }

  const toggleProgram = (id: string) =>
    setExpandedPrograms(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleTarget = (id: string) =>
    setExpandedTargets(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const openAddTarget = (programId: string) => {
    setAddingTargetTo(programId);
    if (!expandedPrograms.has(programId)) toggleProgram(programId);
  };

  const cancelAddTarget = () => {
    setAddingTargetTo(null);
    setNewTargetName('');
    setNewTargetDef('');
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

  // ─── Target expanded details ───────────────────────────────────────────────
  const renderTargetDetails = (target: SkillTarget) => (
    <div className="ml-12 mr-3 mb-2 p-3 bg-muted/40 rounded-lg border border-border/50 space-y-2 text-xs">
      {target.operational_definition && (
        <div>
          <span className="font-semibold">Operational Definition:</span>
          <p className="text-muted-foreground mt-0.5">{target.operational_definition}</p>
        </div>
      )}
      {target.mastery_criteria && (
        <div>
          <span className="font-semibold">Mastery Criteria:</span>
          <p className="text-muted-foreground mt-0.5">{target.mastery_criteria}</p>
        </div>
      )}
      {target.sd_instructions && (
        <div>
          <span className="font-semibold">SD:</span>
          <p className="text-muted-foreground mt-0.5">{target.sd_instructions}</p>
        </div>
      )}
      {target.prompt_hierarchy && target.prompt_hierarchy.length > 0 && (
        <div>
          <span className="font-semibold">Prompt Hierarchy:</span>
          <ol className="list-decimal ml-4 mt-1 space-y-0.5 text-muted-foreground">
            {target.prompt_hierarchy.map((level: string, i: number) => (
              <li key={i}>{level}</li>
            ))}
          </ol>
        </div>
      )}
      {target.error_correction && (
        <div>
          <span className="font-semibold">Error Correction:</span>
          <p className="text-muted-foreground mt-0.5">{target.error_correction}</p>
        </div>
      )}
      {target.notes && (
        <div>
          <span className="font-semibold">Notes:</span>
          <p className="text-muted-foreground mt-0.5">{target.notes}</p>
        </div>
      )}
      <div className="flex flex-wrap gap-4 pt-1">
        <div>
          <span className="font-semibold">Phase:</span>{' '}
          <span className="text-muted-foreground">
            {PHASE_LABELS[(target as any).phase as TargetPhase] || (target as any).phase || 'N/A'}
          </span>
        </div>
        <div>
          <span className="font-semibold">Status:</span>{' '}
          <span className="text-muted-foreground">{TARGET_STATUS_LABELS[target.status] || target.status}</span>
        </div>
        {target.prompt_counts_as_correct !== null && (
          <div>
            <span className="font-semibold">Prompted counts as:</span>{' '}
            <span className="text-muted-foreground">
              {target.prompt_counts_as_correct ? 'Correct' : 'Incorrect'}
            </span>
          </div>
        )}
      </div>
      {target.ta_steps && target.ta_steps.length > 0 && (
        <div>
          <span className="font-semibold">Task Analysis Steps:</span>
          <ol className="list-decimal ml-4 mt-1 space-y-0.5 text-muted-foreground">
            {target.ta_steps.map(step => (
              <li key={step.id}>{step.step_label}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );

  // ─── Target row ────────────────────────────────────────────────────────────
  const renderTarget = (target: SkillTarget, program: SkillProgram, index: number) => {
    const isExpanded = expandedTargets.has(target.id);
    const dotColor = TARGET_DOT[target.status] || 'bg-slate-300';
    const phaseLabel = (target as any).phase
      ? PHASE_LABELS[(target as any).phase as TargetPhase] || (target as any).phase
      : null;
    const objLabel = `Obj. ${index + 1}`;

    return (
      <div key={target.id}>
        <div
          className="flex items-center gap-2.5 py-2 pl-4 pr-2 rounded-md hover:bg-muted/40 group cursor-pointer"
          onClick={() => toggleTarget(target.id)}
        >
          {/* Objective number */}
          <span className="text-[10px] font-medium text-muted-foreground shrink-0 w-8 tabular-nums">
            {objLabel}
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">
                {TARGET_STATUS_LABELS[target.status] || target.status}
                {phaseLabel ? ` · ${phaseLabel}` : ''}
              </p>
            </TooltipContent>
          </Tooltip>

          <span className="flex-1 text-sm truncate">{target.name}</span>

          {phaseLabel && (
            <span className="text-[11px] text-muted-foreground shrink-0 hidden sm:inline">
              {phaseLabel}
            </span>
          )}

          <span className="shrink-0" onClick={e => e.stopPropagation()}>
            <TargetSparkline key={`${target.id}-${sparklineKey}`} targetId={target.id} />
          </span>

          {/* Record button — visible on hover */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={e => { e.stopPropagation(); setRecordingTarget({ target, program }); }}
              >
                <Play className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p className="text-xs">Record Trial</p></TooltipContent>
          </Tooltip>

          {/* Graph button — visible on hover */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={e => { e.stopPropagation(); setGraphTarget({ target, program }); }}
              >
                <BarChart3 className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p className="text-xs">View Graph</p></TooltipContent>
          </Tooltip>

          {/* Three-dot menu — visible on hover */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={e => e.stopPropagation()}
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setRecordingTarget({ target, program })}>
                <Play className="w-4 h-4 mr-2" /> Record Trial
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setGraphTarget({ target, program })}>
                <BarChart3 className="w-4 h-4 mr-2" /> View Graph
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => {
                const n = window.prompt('Rename target:', target.name);
                if (n && n.trim() && n.trim() !== target.name) updateTarget(target.id, { name: n.trim() } as any);
              }}>
                <Pencil className="w-4 h-4 mr-2" /> Rename
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                const d = window.prompt('Operational definition:', target.operational_definition || '');
                if (d !== null) updateTarget(target.id, { operational_definition: d || null } as any);
              }}>
                <Info className="w-4 h-4 mr-2" /> Edit Definition
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                const current = target.prompt_counts_as_correct;
                const next = current === null ? true : current === true ? false : null;
                updateTarget(target.id, { prompt_counts_as_correct: next } as any);
              }}>
                <Info className="w-4 h-4 mr-2" />
                {target.prompt_counts_as_correct === null
                  ? 'Set: Prompted = Correct'
                  : target.prompt_counts_as_correct
                    ? 'Set: Prompted = Incorrect'
                    : 'Reset to program default'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setEditingTargetForPhase(target)}>
                <Clock className="w-4 h-4 mr-2" /> Change Phase
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setEditingTargetForStatus(target)}>
                <Clock className="w-4 h-4 mr-2" /> Change Status
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setMoveTarget({ id: target.id, name: target.name, programId: program.id })}>
                <ArrowRight className="w-4 h-4 mr-2" /> Move to Program
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => deleteTarget(target.id)}>
                <Trash2 className="w-4 h-4 mr-2" /> Archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {isExpanded && renderTargetDetails(target)}

        {recordingTarget?.target.id === target.id && (
          <div className="ml-4 mr-2 mb-2">
            <TargetDataCollectionPanel
              target={target}
              program={program}
              onClose={() => setRecordingTarget(null)}
              onDataRecorded={() => { setSparklineKey(k => k + 1); onRefetch(); }}
            />
          </div>
        )}
        {graphTarget?.target.id === target.id && (
          <div className="ml-4 mr-2 mb-2">
            <TargetGraphView
              target={target}
              program={program}
              onClose={() => setGraphTarget(null)}
            />
          </div>
        )}
      </div>
    );
  };

  // ─── Program card ──────────────────────────────────────────────────────────
  const renderProgram = (program: SkillProgram) => {
    const isExpanded = expandedPrograms.has(program.id);
    const targetCount = program.targets?.length || 0;
    const masteredCount = program.targets?.filter(t => t.status === 'mastered').length || 0;
    const borderColor = PROGRAM_BORDER[program.status] || 'border-l-gray-300';
    const methodLabel = METHOD_SHORT[program.method] || program.method;
    const statusLabel = PROGRAM_STATUS_LABELS[program.status as ProgramStatus] || program.status;

    return (
      <Card key={program.id} className={`border-l-4 ${borderColor} shadow-none`}>
        <CardContent className="py-0 px-0">
          {/* Program header row */}
          <div
            className="flex items-center justify-between px-4 py-3 cursor-pointer select-none"
            onClick={() => toggleProgram(program.id)}
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              {isExpanded
                ? <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />
                : <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />}
              <span className="font-semibold text-sm truncate">{program.name}</span>
              {/* Method tag */}
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                {methodLabel}
              </span>
              {/* Status — plain muted text, no badge */}
              <span className="text-xs text-muted-foreground shrink-0 hidden sm:inline">
                {statusLabel}
              </span>
            </div>

            {/* Right: progress + actions */}
            <div
              className="flex items-center gap-2 ml-2 shrink-0"
              onClick={e => e.stopPropagation()}
            >
              {targetCount > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all duration-300"
                      style={{ width: `${(masteredCount / targetCount) * 100}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    {masteredCount}/{targetCount}
                  </span>
                </div>
              )}

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={() => openAddTarget(program.id)}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p className="text-xs">Add Objective</p></TooltipContent>
              </Tooltip>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEditProgram(program)}>
                    <Pencil className="w-4 h-4 mr-2" /> Edit Program
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setMoveProgram({ id: program.id, name: program.name, domainId: program.top_level_domain_id || program.domain_id })}>
                    <FolderInput className="w-4 h-4 mr-2" /> Move to Domain
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    setStatusChangeProgram(program);
                    setNewStatus(program.status === 'baseline' ? 'acquisition' : 'mastered');
                  }}>
                    <Clock className="w-4 h-4 mr-2" /> Change Phase / Status
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive" onClick={() => deleteProgram(program.id)}>
                    <Trash2 className="w-4 h-4 mr-2" /> Archive Program
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Target list */}
          {isExpanded && (
            <div className="px-2 pb-3 border-t border-border/40 pt-3">
              {/* Goal statement from program description */}
              {program.description && (
                <div className="ml-4 mr-2 mb-3 text-xs text-muted-foreground bg-muted/40 rounded-md px-3 py-2">
                  <span className="font-semibold text-foreground">Goal: </span>
                  {program.description}
                </div>
              )}

              {/* Objectives label */}
              {(targetCount > 0 || addingTargetTo === program.id) && (
                <div className="flex items-center gap-2 ml-4 mb-1.5">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Objectives
                  </span>
                  <div className="flex-1 h-px bg-border/60" />
                </div>
              )}

              <div className="space-y-0.5">
                {program.targets?.map((t, i) => renderTarget(t, program, i))}
              </div>

              {/* Inline "add objective" form or prompt */}
              {addingTargetTo === program.id ? (
                <div className="ml-4 mr-2 mt-2 p-3 border rounded-lg bg-muted/30 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    New Objective {targetCount + 1}
                  </p>
                  <Input
                    value={newTargetName}
                    onChange={e => setNewTargetName(e.target.value)}
                    placeholder="Objective name"
                    className="text-sm h-8"
                    autoFocus
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleAddTarget(program.id);
                      if (e.key === 'Escape') cancelAddTarget();
                    }}
                  />
                  <Input
                    value={newTargetDef}
                    onChange={e => setNewTargetDef(e.target.value)}
                    placeholder="Operational definition (optional)"
                    className="text-sm h-8"
                    onKeyDown={e => { if (e.key === 'Escape') cancelAddTarget(); }}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => handleAddTarget(program.id)}
                      disabled={!newTargetName.trim()}
                    >
                      Save Objective
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={cancelAddTarget}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  className="w-full text-left text-xs text-muted-foreground py-2 pl-4 pr-2 rounded-md hover:bg-muted/40 hover:text-foreground flex items-center gap-1.5 transition-colors mt-1"
                  onClick={() => openAddTarget(program.id)}
                >
                  <Plus className="w-3 h-3" />
                  {targetCount === 0 ? 'Add first objective' : `Add objective ${targetCount + 1}`}
                </button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // ─── Domain section header ─────────────────────────────────────────────────
  const renderDomainGroup = (domainId: string, domainPrograms: SkillProgram[]) => {
    const legacyDomain = domains.find(d => d.id === domainId);
    const firstProg = domainPrograms[0];
    const domainName = firstProg?.top_level_domain?.name || legacyDomain?.name || 'Unassigned';

    return (
      <div key={domainId} className="space-y-2">
        {/* Domain header — not collapsible, just a visual section divider */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest whitespace-nowrap">
            {domainName}
          </span>
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {domainPrograms.length} program{domainPrograms.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="space-y-2">
          {domainPrograms.map(renderProgram)}
        </div>
      </div>
    );
  };

  // ─── Empty state ───────────────────────────────────────────────────────────
  if (programs.length === 0) {
    return (
      <div className="py-16 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
          <Plus className="w-6 h-6 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium">No programs yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Add a program above to start organizing skill targets by domain.
          </p>
        </div>
      </div>
    );
  }

  // ─── Main render ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {Array.from(grouped.entries()).map(([domainId, progs]) =>
        renderDomainGroup(domainId, progs)
      )}
      {noDomain.length > 0 && renderDomainGroup('__none__', noDomain)}

      {/* ── Move Target Dialog ── */}
      {moveTarget && (
        <MoveTargetDialog
          open={!!moveTarget}
          onOpenChange={(o) => !o && setMoveTarget(null)}
          targetId={moveTarget.id}
          targetName={moveTarget.name}
          currentProgramId={moveTarget.programId}
          programs={programs}
          onSuccess={onRefetch}
        />
      )}

      {/* ── Move Program Dialog ── */}
      {moveProgram && (
        <MoveProgramDialog
          open={!!moveProgram}
          onOpenChange={(o) => !o && setMoveProgram(null)}
          programId={moveProgram.id}
          programName={moveProgram.name}
          currentDomainId={moveProgram.domainId}
          onSuccess={onRefetch}
        />
      )}

      {/* ── Change Program Phase / Status Dialog ── */}
      <Dialog open={!!statusChangeProgram} onOpenChange={(o) => !o && setStatusChangeProgram(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Program Phase</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Program: <span className="font-medium text-foreground">{statusChangeProgram?.name}</span>
            </p>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">New Phase</label>
              <Select value={newStatus} onValueChange={v => setNewStatus(v as ProgramStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PROGRAM_STATUS_LABELS).map(([k, label]) => (
                    <SelectItem key={k} value={k}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Effective Date</label>
              <Input type="date" value={statusDate} onChange={e => setStatusDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Note <span className="text-muted-foreground">(optional)</span></label>
              <Input
                value={statusNote}
                onChange={e => setStatusNote(e.target.value)}
                placeholder="Reason for change..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusChangeProgram(null)}>Cancel</Button>
            <Button onClick={handleStatusChange}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Change Target Phase Dialog ── */}
      <Dialog open={!!editingTargetForPhase} onOpenChange={(o) => !o && setEditingTargetForPhase(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Target Phase</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Target: <span className="font-medium text-foreground">{editingTargetForPhase?.name}</span>
            </p>
            {editingTargetForPhase?.phase && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Current:</span>
                <Badge className={`${PHASE_COLORS[(editingTargetForPhase.phase as TargetPhase) || 'baseline']} text-white text-xs`}>
                  {PHASE_LABELS[(editingTargetForPhase.phase as TargetPhase) || 'baseline']}
                </Badge>
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">New Phase</label>
              <Select
                defaultValue={(editingTargetForPhase as any)?.phase || 'baseline'}
                onValueChange={async (v) => {
                  if (editingTargetForPhase) {
                    await updateTarget(editingTargetForPhase.id, { phase: v } as any);
                    setEditingTargetForPhase(null);
                  }
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PHASE_LABELS).map(([k, label]) => (
                    <SelectItem key={k} value={k}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTargetForPhase(null)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Change Target Status Dialog ── */}
      <Dialog open={!!editingTargetForStatus} onOpenChange={(o) => !o && setEditingTargetForStatus(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Target Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Target: <span className="font-medium text-foreground">{editingTargetForStatus?.name}</span>
            </p>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">New Status</label>
              <Select
                defaultValue={editingTargetForStatus?.status || 'not_started'}
                onValueChange={async (v) => {
                  if (editingTargetForStatus) {
                    await updateTarget(editingTargetForStatus.id, { status: v } as any);
                    setEditingTargetForStatus(null);
                  }
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TARGET_STATUS_LABELS).map(([k, label]) => (
                    <SelectItem key={k} value={k}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTargetForStatus(null)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
