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
  ArrowRight,
  FolderInput,
  Play,
  BarChart3,
  Zap,
  Layers,
  ToggleLeft,
  ToggleRight,
  Flag,
  Milestone,
} from 'lucide-react';
import { TargetDataCollectionPanel } from './TargetDataCollectionPanel';
import { TargetGraphView } from './TargetGraphView';
import { TargetSparkline } from './TargetSparkline';
import { SessionTargetPicker } from './SessionTargetPicker';
import { SkillSessionRunner } from './SkillSessionRunner';
import { UnifiedSessionView } from './UnifiedSessionView';
import { useSessionTargetCollection } from '@/hooks/useSessionTargetCollection';
import { useObjectiveActions, useBenchmarkActions } from '@/hooks/useObjectivesAndBenchmarks';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
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
import { MoveTargetDialog } from './MoveTargetDialog';
import { MoveProgramDialog } from './MoveProgramDialog';
import type { SkillProgram, SkillTarget, SkillProgramObjective, TargetBenchmark, ProgramStatus } from '@/types/skillPrograms';
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
  const { addObjective, deleteObjective, assignTargetToObjective } = useObjectiveActions(onRefetch);
  const { addBenchmark, deleteBenchmark, setCurrentBenchmark, toggleProgramObjectives, toggleProgramBenchmarks } = useBenchmarkActions(onRefetch);

  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());
  const [expandedSubdomains, setExpandedSubdomains] = useState<Set<string>>(new Set());
  const [expandedPrograms, setExpandedPrograms] = useState<Set<string>>(new Set());
  const [expandedObjectives, setExpandedObjectives] = useState<Set<string>>(new Set());
  const [expandedTargets, setExpandedTargets] = useState<Set<string>>(new Set());
  const [expandedBenchmarks, setExpandedBenchmarks] = useState<Set<string>>(new Set());
  const [addingTargetTo, setAddingTargetTo] = useState<string | null>(null);
  const [newTargetName, setNewTargetName] = useState('');
  const [newTargetDef, setNewTargetDef] = useState('');
  const [addingObjectiveTo, setAddingObjectiveTo] = useState<string | null>(null);
  const [newObjectiveName, setNewObjectiveName] = useState('');
  const [addingBenchmarkTo, setAddingBenchmarkTo] = useState<string | null>(null);
  const [newBenchmarkName, setNewBenchmarkName] = useState('');
  const [statusChangeProgram, setStatusChangeProgram] = useState<SkillProgram | null>(null);
  const [newStatus, setNewStatus] = useState<ProgramStatus>('acquisition');
  const [statusDate, setStatusDate] = useState(new Date().toISOString().split('T')[0]);
  const [statusNote, setStatusNote] = useState('');

  // Move dialogs
  const [moveTarget, setMoveTarget] = useState<{ id: string; name: string; programId: string } | null>(null);
  const [moveProgram, setMoveProgram] = useState<{ id: string; name: string; domainId: string | null } | null>(null);

  // Target phase/status change
  const [editingTargetForPhase, setEditingTargetForPhase] = useState<SkillTarget | null>(null);
  const [editingTargetForStatus, setEditingTargetForStatus] = useState<SkillTarget | null>(null);

  // Data collection & graphing
  const [recordingTarget, setRecordingTarget] = useState<{ target: SkillTarget; program: SkillProgram } | null>(null);
  const [graphTarget, setGraphTarget] = useState<{ target: SkillTarget; program: SkillProgram } | null>(null);
  const [sparklineKey, setSparklineKey] = useState(0);

  // Session-level skill acquisition
  const [showSessionPicker, setShowSessionPicker] = useState(false);
  const [showUnifiedView, setShowUnifiedView] = useState(false);
  const sessionCollection = useSessionTargetCollection(studentId);

  const toggle = (set: Set<string>, id: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set);
    next.has(id) ? next.delete(id) : next.add(id);
    setter(next);
  };

  // ── Group: Domain → Subdomain → Programs ──
  type SubdomainGroup = { name: string; programs: SkillProgram[] };
  type DomainGroup = { name: string; subdomains: Map<string, SubdomainGroup>; ungrouped: SkillProgram[] };

  const domainGroups = new Map<string, DomainGroup>();
  const noDomain: SkillProgram[] = [];

  for (const p of programs) {
    const domainId = p.top_level_domain_id || p.domain_id;
    if (!domainId) { noDomain.push(p); continue; }

    if (!domainGroups.has(domainId)) {
      domainGroups.set(domainId, {
        name: p.top_level_domain?.name || domains.find(d => d.id === domainId)?.name || 'Unknown',
        subdomains: new Map(),
        ungrouped: [],
      });
    }
    const group = domainGroups.get(domainId)!;

    if (p.subdomain_id && p.subdomain?.name) {
      if (!group.subdomains.has(p.subdomain_id)) {
        group.subdomains.set(p.subdomain_id, { name: p.subdomain.name, programs: [] });
      }
      group.subdomains.get(p.subdomain_id)!.programs.push(p);
    } else {
      group.ungrouped.push(p);
    }
  }

  // ── Benchmark rendering ──
  const renderBenchmark = (bm: TargetBenchmark, target: SkillTarget) => (
    <div key={bm.id} className="ml-16 flex items-center justify-between py-1 px-2 border-l border-dashed border-muted-foreground/30 hover:bg-muted/20 rounded-r text-xs">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <Milestone className="w-3 h-3 text-muted-foreground shrink-0" />
        <span className={`truncate ${bm.is_current ? 'font-semibold text-primary' : 'text-foreground'}`}>{bm.name}</span>
        {bm.is_current && <Badge variant="default" className="text-[9px] h-4">Current</Badge>}
        <Badge className={`${PHASE_COLORS[bm.phase as TargetPhase] || 'bg-slate-500'} text-white text-[9px]`}>
          {PHASE_LABELS[bm.phase as TargetPhase] || bm.phase}
        </Badge>
        {bm.mastery_percent && (
          <span className="text-muted-foreground text-[10px]">{bm.mastery_percent}% mastery</span>
        )}
      </div>
      <div className="flex items-center gap-0.5">
        {!bm.is_current && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setCurrentBenchmark(target.id, bm.id)}>
                <Flag className="w-2.5 h-2.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p className="text-xs">Set as Current</p></TooltipContent>
          </Tooltip>
        )}
        <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => deleteBenchmark(bm.id)}>
          <Trash2 className="w-2.5 h-2.5" />
        </Button>
      </div>
    </div>
  );

  // ── Target rendering ──
  const renderTargetDetails = (target: SkillTarget) => (
    <div className="ml-12 mr-3 mb-2 p-3 bg-muted/40 rounded-lg border border-border/50 space-y-2 text-xs">
      {target.operational_definition && (
        <div><span className="font-semibold text-foreground">Operational Definition:</span>
          <p className="text-muted-foreground mt-0.5">{target.operational_definition}</p></div>
      )}
      {target.mastery_criteria && (
        <div><span className="font-semibold text-foreground">Mastery Criteria:</span>
          <p className="text-muted-foreground mt-0.5">{target.mastery_criteria}</p></div>
      )}
      {target.sd_instructions && (
        <div><span className="font-semibold text-foreground">SD Instructions:</span>
          <p className="text-muted-foreground mt-0.5">{target.sd_instructions}</p></div>
      )}
      {target.prompt_hierarchy && target.prompt_hierarchy.length > 0 && (
        <div><span className="font-semibold text-foreground">Prompt Hierarchy:</span>
          <ol className="list-decimal ml-4 mt-1 space-y-0.5 text-muted-foreground">
            {target.prompt_hierarchy.map((level, i) => <li key={i}>{level}</li>)}
          </ol></div>
      )}
      {target.error_correction && (
        <div><span className="font-semibold text-foreground">Error Correction:</span>
          <p className="text-muted-foreground mt-0.5">{target.error_correction}</p></div>
      )}
      {target.notes && (
        <div><span className="font-semibold text-foreground">Notes:</span>
          <p className="text-muted-foreground mt-0.5">{target.notes}</p></div>
      )}
      <div className="flex flex-wrap gap-3">
        <div><span className="font-semibold text-foreground">Phase:</span>{' '}
          <span className="text-muted-foreground">{PHASE_LABELS[(target as any).phase as TargetPhase] || target.phase || 'N/A'}</span></div>
        <div><span className="font-semibold text-foreground">Status:</span>{' '}
          <span className="text-muted-foreground">{TARGET_STATUS_LABELS[target.status] || target.status}</span></div>
      </div>
      {target.ta_steps && target.ta_steps.length > 0 && (
        <div><span className="font-semibold text-foreground">Task Analysis Steps:</span>
          <ol className="list-decimal ml-4 mt-1 space-y-0.5 text-muted-foreground">
            {target.ta_steps.map(step => <li key={step.id}>{step.step_label}</li>)}
          </ol></div>
      )}
    </div>
  );

  const renderTarget = (target: SkillTarget, program: SkillProgram, indent = 8) => {
    const isExpanded = expandedTargets.has(target.id);
    const hasBenchmarks = program.benchmark_enabled && target.benchmarks && target.benchmarks.length > 0;
    const promptSetting = resolvePromptCountsAsCorrect(target.prompt_counts_as_correct, program.prompt_counts_as_correct, undefined);
    const promptSource = getPromptCorrectnessSource(target.prompt_counts_as_correct, program.prompt_counts_as_correct, undefined);

    return (
      <div key={target.id}>
        <div
          className={`flex items-center justify-between py-1.5 px-3 ml-${indent} border-l-2 border-muted hover:bg-muted/30 rounded-r text-sm cursor-pointer`}
          style={{ marginLeft: `${indent * 4}px` }}
          onClick={() => toggle(expandedTargets, target.id, setExpandedTargets)}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {isExpanded ? <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" /> : <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />}
            <Target className="w-3 h-3 text-muted-foreground shrink-0" />
            <span className="truncate font-medium">{target.name}</span>
            <Badge variant="outline" className="text-[10px] shrink-0">{TARGET_STATUS_LABELS[target.status] || target.status}</Badge>
            {(target as any).phase && (
              <Badge className={`${PHASE_COLORS[(target as any).phase as TargetPhase] || 'bg-slate-500'} text-white text-[10px] shrink-0`}>
                {PHASE_LABELS[(target as any).phase as TargetPhase] || (target as any).phase}
              </Badge>
            )}
            <span className="shrink-0" onClick={e => e.stopPropagation()}>
              <TargetSparkline key={`${target.id}-${sparklineKey}`} targetId={target.id} />
            </span>
            {hasBenchmarks && (
              <Badge variant="secondary" className="text-[9px] shrink-0">
                {target.benchmarks!.length} benchmark{target.benchmarks!.length !== 1 ? 's' : ''}
              </Badge>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className={`text-[10px] shrink-0 cursor-help ${promptSetting ? 'border-amber-500 text-amber-600' : 'border-muted-foreground/30'}`}>
                  {promptSetting ? 'P=✓' : 'P=✗'}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Prompted = {promptSetting ? 'Correct' : 'Incorrect'}<span className="text-muted-foreground"> (from {promptSource})</span></p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-primary" onClick={() => setRecordingTarget({ target, program })}>
                  <Play className="w-3 h-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p className="text-xs">Record Data</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setGraphTarget({ target, program })}>
                  <BarChart3 className="w-3 h-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p className="text-xs">View Graph</p></TooltipContent>
            </Tooltip>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6"><MoreHorizontal className="w-3 h-3" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setRecordingTarget({ target, program })}>
                  <Play className="w-3 h-3 mr-2" /> Record Data
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setGraphTarget({ target, program })}>
                  <BarChart3 className="w-3 h-3 mr-2" /> View Graph
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => {
                  const newName = window.prompt('Rename target:', target.name);
                  if (newName?.trim() && newName.trim() !== target.name) updateTarget(target.id, { name: newName.trim() } as any);
                }}>
                  <Pencil className="w-3 h-3 mr-2" /> Rename
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setEditingTargetForPhase(target)}>
                  <Clock className="w-3 h-3 mr-2" /> Change Phase
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setEditingTargetForStatus(target)}>
                  <Clock className="w-3 h-3 mr-2" /> Change Status
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setMoveTarget({ id: target.id, name: target.name, programId: program.id })}>
                  <ArrowRight className="w-3 h-3 mr-2" /> Move to Program
                </DropdownMenuItem>
                {program.benchmark_enabled && (
                  <DropdownMenuItem onClick={() => setAddingBenchmarkTo(target.id)}>
                    <Milestone className="w-3 h-3 mr-2" /> Add Benchmark
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={() => deleteTarget(target.id)}>
                  <Trash2 className="w-3 h-3 mr-2" /> Archive Target
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        {isExpanded && renderTargetDetails(target)}
        {/* Benchmarks under target */}
        {isExpanded && hasBenchmarks && target.benchmarks!.map(bm => renderBenchmark(bm, target))}
        {/* Add benchmark inline */}
        {addingBenchmarkTo === target.id && (
          <div className="ml-16 p-2 border rounded space-y-2 bg-muted/20">
            <Input value={newBenchmarkName} onChange={e => setNewBenchmarkName(e.target.value)} placeholder="Benchmark name (e.g. Wait 5 seconds with full prompts)" className="text-xs" autoFocus />
            <div className="flex gap-2">
              <Button size="sm" className="h-6 text-xs" onClick={() => {
                if (newBenchmarkName.trim()) {
                  addBenchmark(target.id, newBenchmarkName.trim());
                  setAddingBenchmarkTo(null);
                  setNewBenchmarkName('');
                }
              }}>Add</Button>
              <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => { setAddingBenchmarkTo(null); setNewBenchmarkName(''); }}>Cancel</Button>
            </div>
          </div>
        )}
        {recordingTarget?.target.id === target.id && (
          <TargetDataCollectionPanel target={target} program={program} onClose={() => setRecordingTarget(null)} onDataRecorded={() => { setSparklineKey(k => k + 1); onRefetch(); }} />
        )}
        {graphTarget?.target.id === target.id && (
          <TargetGraphView target={target} program={program} onClose={() => setGraphTarget(null)} />
        )}
      </div>
    );
  };

  // ── Objective rendering ──
  const renderObjective = (obj: SkillProgramObjective, program: SkillProgram) => {
    const isExpanded = expandedObjectives.has(obj.id);
    const objTargets = obj.targets || [];
    return (
      <div key={obj.id} className="ml-6">
        <Collapsible open={isExpanded} onOpenChange={() => toggle(expandedObjectives, obj.id, setExpandedObjectives)}>
          <div className="flex items-center justify-between py-1 px-2 hover:bg-muted/20 rounded group">
            <CollapsibleTrigger className="flex items-center gap-2 flex-1 min-w-0 text-left">
              {isExpanded ? <ChevronDown className="w-3 h-3 shrink-0" /> : <ChevronRight className="w-3 h-3 shrink-0" />}
              <Flag className="w-3 h-3 text-muted-foreground shrink-0" />
              <span className="font-medium text-xs truncate">{obj.name}</span>
              <span className="text-[10px] text-muted-foreground">{objTargets.length} target{objTargets.length !== 1 ? 's' : ''}</span>
            </CollapsibleTrigger>
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
              <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => deleteObjective(obj.id)}>
                <Trash2 className="w-2.5 h-2.5" />
              </Button>
            </div>
          </div>
          <CollapsibleContent>
            {objTargets.map(t => renderTarget(t, program, 10))}
            {objTargets.length === 0 && <p className="ml-12 text-[10px] text-muted-foreground py-1">No targets assigned to this objective</p>}
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  };

  // ── Program rendering ──
  const renderProgram = (program: SkillProgram) => {
    const isExpanded = expandedPrograms.has(program.id);
    const allTargets = program.targets || [];
    const objectives = program.objectives || [];
    const statusColor = PROGRAM_STATUS_COLORS[program.status as ProgramStatus] || 'bg-gray-500';

    // Targets not assigned to any objective
    const unassignedTargets = program.objectives_enabled
      ? allTargets.filter(t => !t.objective_id)
      : allTargets;

    return (
      <div key={program.id} className="ml-4">
        <Collapsible open={isExpanded} onOpenChange={() => toggle(expandedPrograms, program.id, setExpandedPrograms)}>
          <div className="flex items-center justify-between py-2 px-2 hover:bg-muted/40 rounded group">
            <CollapsibleTrigger className="flex items-center gap-2 flex-1 min-w-0 text-left">
              {isExpanded ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
              <ListChecks className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="font-medium text-sm truncate">{program.name}</span>
              <Badge className={`${statusColor} text-white text-[10px] shrink-0`}>{PROGRAM_STATUS_LABELS[program.status as ProgramStatus] || program.status}</Badge>
              <Badge variant="outline" className="text-[10px] shrink-0">{SKILL_METHOD_LABELS[program.method as keyof typeof SKILL_METHOD_LABELS] || program.method}</Badge>
              <span className="text-xs text-muted-foreground shrink-0">{allTargets.length} target{allTargets.length !== 1 ? 's' : ''}</span>
            </CollapsibleTrigger>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setAddingTargetTo(program.id)}>
                <Plus className="w-3 h-3" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6"><MoreHorizontal className="w-3 h-3" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEditProgram(program)}>
                    <Pencil className="w-3 h-3 mr-2" /> Edit Program
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setMoveProgram({ id: program.id, name: program.name, domainId: program.top_level_domain_id || program.domain_id })}>
                    <FolderInput className="w-3 h-3 mr-2" /> Move to Domain
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setStatusChangeProgram(program); setNewStatus(program.status === 'baseline' ? 'acquisition' : 'mastered'); }}>
                    <Clock className="w-3 h-3 mr-2" /> Change Status
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => toggleProgramObjectives(program.id, !program.objectives_enabled)}>
                    {program.objectives_enabled ? <ToggleRight className="w-3 h-3 mr-2" /> : <ToggleLeft className="w-3 h-3 mr-2" />}
                    {program.objectives_enabled ? 'Disable Objectives' : 'Enable Objectives'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toggleProgramBenchmarks(program.id, !program.benchmark_enabled)}>
                    {program.benchmark_enabled ? <ToggleRight className="w-3 h-3 mr-2" /> : <ToggleLeft className="w-3 h-3 mr-2" />}
                    {program.benchmark_enabled ? 'Disable Benchmarks' : 'Enable Benchmarks'}
                  </DropdownMenuItem>
                  {program.objectives_enabled && (
                    <DropdownMenuItem onClick={() => setAddingObjectiveTo(program.id)}>
                      <Flag className="w-3 h-3 mr-2" /> Add Objective
                    </DropdownMenuItem>
                  )}
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
              {/* Feature badges when expanded */}
              {isExpanded && (program.objectives_enabled || program.benchmark_enabled) && (
                <div className="ml-8 flex gap-1 py-1">
                  {program.objectives_enabled && <Badge variant="secondary" className="text-[9px]">Objectives ON</Badge>}
                  {program.benchmark_enabled && <Badge variant="secondary" className="text-[9px]">Benchmarks ON</Badge>}
                </div>
              )}

              {/* Objectives (if enabled) */}
              {program.objectives_enabled && objectives.map(obj => renderObjective(obj, program))}

              {/* Add objective form */}
              {addingObjectiveTo === program.id && (
                <div className="ml-8 p-2 border rounded space-y-2 bg-muted/20">
                  <Input value={newObjectiveName} onChange={e => setNewObjectiveName(e.target.value)} placeholder="Objective name (e.g. Answer 'What' Questions)" className="text-xs" autoFocus />
                  <div className="flex gap-2">
                    <Button size="sm" className="h-6 text-xs" onClick={() => {
                      if (newObjectiveName.trim()) {
                        addObjective(program.id, newObjectiveName.trim());
                        setAddingObjectiveTo(null);
                        setNewObjectiveName('');
                      }
                    }}>Add</Button>
                    <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => { setAddingObjectiveTo(null); setNewObjectiveName(''); }}>Cancel</Button>
                  </div>
                </div>
              )}

              {/* Unassigned targets (or all targets if objectives disabled) */}
              {program.objectives_enabled && unassignedTargets.length > 0 && (
                <div className="ml-6 py-1">
                  <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Unassigned Targets</span>
                </div>
              )}
              {(!program.objectives_enabled ? allTargets : unassignedTargets).map(t => renderTarget(t, program))}

              {allTargets.length === 0 && <p className="ml-12 text-xs text-muted-foreground py-1">No targets yet</p>}

              {/* Add target form */}
              {addingTargetTo === program.id && (
                <div className="ml-8 p-2 border rounded space-y-2 bg-muted/20">
                  <Input value={newTargetName} onChange={e => setNewTargetName(e.target.value)} placeholder="Target name" className="text-sm" autoFocus />
                  <Input value={newTargetDef} onChange={e => setNewTargetDef(e.target.value)} placeholder="Operational definition (optional)" className="text-sm" />
                  <div className="flex gap-2">
                    <Button size="sm" className="h-7 text-xs" onClick={() => {
                      if (newTargetName.trim()) {
                        addTarget(program.id, { name: newTargetName.trim(), operational_definition: newTargetDef || undefined });
                        setAddingTargetTo(null);
                        setNewTargetName('');
                        setNewTargetDef('');
                      }
                    }} disabled={!newTargetName.trim()}>Add</Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setAddingTargetTo(null); setNewTargetName(''); setNewTargetDef(''); }}>Cancel</Button>
                  </div>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  };

  // ── Subdomain rendering ──
  const renderSubdomain = (subdomainId: string, sub: SubdomainGroup) => {
    const isExpanded = expandedSubdomains.has(subdomainId);
    return (
      <div key={subdomainId} className="ml-3">
        <Collapsible open={isExpanded} onOpenChange={() => toggle(expandedSubdomains, subdomainId, setExpandedSubdomains)}>
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center gap-2 py-1.5 px-2 hover:bg-muted/30 rounded cursor-pointer">
              {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{sub.name}</span>
              <span className="text-[10px] text-muted-foreground">{sub.programs.length}</span>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            {sub.programs.map(renderProgram)}
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  };

  // ── Domain rendering ──
  const renderDomainGroup = (domainId: string, group: DomainGroup) => {
    const isExpanded = expandedDomains.has(domainId);
    const totalPrograms = group.ungrouped.length + Array.from(group.subdomains.values()).reduce((s, sub) => s + sub.programs.length, 0);

    return (
      <Card key={domainId}>
        <Collapsible open={isExpanded} onOpenChange={() => toggle(expandedDomains, domainId, setExpandedDomains)}>
          <CollapsibleTrigger className="w-full">
            <CardContent className="py-3 flex items-center gap-3 cursor-pointer hover:bg-muted/30">
              {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              <h3 className="font-semibold text-sm">{group.name}</h3>
              <Badge variant="secondary" className="text-xs">{totalPrograms} program{totalPrograms !== 1 ? 's' : ''}</Badge>
              {group.subdomains.size > 0 && (
                <Badge variant="outline" className="text-[10px]">{group.subdomains.size} subdomain{group.subdomains.size !== 1 ? 's' : ''}</Badge>
              )}
            </CardContent>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="pb-2">
              {Array.from(group.subdomains.entries()).map(([id, sub]) => renderSubdomain(id, sub))}
              {group.ungrouped.length > 0 && group.subdomains.size > 0 && (
                <div className="ml-3 py-1 px-2">
                  <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Other Programs</span>
                </div>
              )}
              {group.ungrouped.map(renderProgram)}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    );
  };

  const handleStatusChange = async () => {
    if (!statusChangeProgram) return;
    await changeProgramStatus(statusChangeProgram.id, statusChangeProgram.status, newStatus, statusDate, statusNote || undefined);
    setStatusChangeProgram(null);
    setStatusNote('');
  };

  if (programs.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <ListChecks className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="font-medium text-lg mb-2">No skill programs yet</h3>
          <p className="text-sm text-muted-foreground">Create a program to start organizing targets by domain and skill area.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {/* Session controls */}
      <div className="flex items-center gap-2 flex-wrap pb-2">
        {!sessionCollection.isSessionActive ? (
          <>
            <Button onClick={() => setShowSessionPicker(true)} className="gap-2" size="sm">
              <Zap className="h-4 w-4" /> Start Session
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowUnifiedView(!showUnifiedView)} className="gap-2">
              <Layers className="h-4 w-4" /> {showUnifiedView ? 'Hide' : 'View'} Session Data
            </Button>
          </>
        ) : (
          <Badge variant="default" className="text-xs">Session Active — {sessionCollection.targetCount} targets</Badge>
        )}
      </div>

      <SessionTargetPicker
        open={showSessionPicker}
        onOpenChange={setShowSessionPicker}
        programs={programs}
        onStart={(selectedTargets, linkedSessionId) => sessionCollection.startSession(selectedTargets, linkedSessionId)}
      />

      {sessionCollection.isSessionActive && (
        <SkillSessionRunner
          targetList={sessionCollection.targetList}
          activeTargetId={sessionCollection.activeTargetId}
          activeIndex={sessionCollection.activeIndex}
          sessionId={sessionCollection.sessionId}
          sessionStartTime={sessionCollection.sessionStartTime}
          onRecordTrial={sessionCollection.recordTrial}
          onUndoTrial={sessionCollection.undoLastTrial}
          onSaveFrequency={sessionCollection.saveFrequency}
          onSaveDuration={sessionCollection.saveDuration}
          onRecordTAStep={sessionCollection.recordTAStep}
          onSetFrequencyCount={sessionCollection.setFrequencyCount}
          onSetTimerState={sessionCollection.setTimerState}
          onSetActiveTarget={sessionCollection.setActiveTargetId}
          onNextTarget={sessionCollection.nextTarget}
          onPrevTarget={sessionCollection.prevTarget}
          onEndSession={sessionCollection.endSession}
          onDataRecorded={() => { setSparklineKey(k => k + 1); onRefetch(); }}
        />
      )}

      {showUnifiedView && !sessionCollection.isSessionActive && <UnifiedSessionView studentId={studentId} />}

      {/* Domain hierarchy */}
      {Array.from(domainGroups.entries()).map(([id, group]) => renderDomainGroup(id, group))}
      {noDomain.length > 0 && renderDomainGroup('__none__', { name: 'Unassigned', subdomains: new Map(), ungrouped: noDomain })}

      {/* Move Target Dialog */}
      {moveTarget && (
        <MoveTargetDialog open={!!moveTarget} onOpenChange={o => !o && setMoveTarget(null)} targetId={moveTarget.id} targetName={moveTarget.name} currentProgramId={moveTarget.programId} programs={programs} onSuccess={onRefetch} />
      )}

      {/* Move Program Dialog */}
      {moveProgram && (
        <MoveProgramDialog open={!!moveProgram} onOpenChange={o => !o && setMoveProgram(null)} programId={moveProgram.id} programName={moveProgram.name} currentDomainId={moveProgram.domainId} onSuccess={onRefetch} />
      )}

      {/* Status Change Dialog */}
      <Dialog open={!!statusChangeProgram} onOpenChange={o => !o && setStatusChangeProgram(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Change Program Status</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="text-sm"><span className="text-muted-foreground">Program:</span>{' '}<span className="font-medium">{statusChangeProgram?.name}</span></div>
            <div className="space-y-2">
              <label className="text-sm font-medium">New Status</label>
              <Select value={newStatus} onValueChange={v => setNewStatus(v as ProgramStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(PROGRAM_STATUS_LABELS).map(([k, label]) => <SelectItem key={k} value={k}>{label}</SelectItem>)}</SelectContent>
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

      {/* Target Phase Change Dialog */}
      <Dialog open={!!editingTargetForPhase} onOpenChange={o => !o && setEditingTargetForPhase(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Change Target Phase</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="text-sm"><span className="text-muted-foreground">Target:</span>{' '}<span className="font-medium">{editingTargetForPhase?.name}</span></div>
            <div className="text-sm">
              <span className="text-muted-foreground">Current Phase:</span>{' '}
              <Badge className={`${PHASE_COLORS[(editingTargetForPhase?.phase as TargetPhase) || 'baseline']} text-white text-xs`}>
                {PHASE_LABELS[(editingTargetForPhase?.phase as TargetPhase) || 'baseline']}
              </Badge>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">New Phase</label>
              <Select defaultValue={editingTargetForPhase?.phase || 'baseline'} onValueChange={async v => {
                if (editingTargetForPhase) { await updateTarget(editingTargetForPhase.id, { phase: v } as any); setEditingTargetForPhase(null); }
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(PHASE_LABELS).map(([k, label]) => <SelectItem key={k} value={k}>{label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setEditingTargetForPhase(null)}>Cancel</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Target Status Change Dialog */}
      <Dialog open={!!editingTargetForStatus} onOpenChange={o => !o && setEditingTargetForStatus(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Change Target Status</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="text-sm"><span className="text-muted-foreground">Target:</span>{' '}<span className="font-medium">{editingTargetForStatus?.name}</span></div>
            <div className="space-y-2">
              <label className="text-sm font-medium">New Status</label>
              <Select defaultValue={editingTargetForStatus?.status || 'not_started'} onValueChange={async v => {
                if (editingTargetForStatus) { await updateTarget(editingTargetForStatus.id, { status: v } as any); setEditingTargetForStatus(null); }
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(TARGET_STATUS_LABELS).map(([k, label]) => <SelectItem key={k} value={k}>{label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setEditingTargetForStatus(null)}>Cancel</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
