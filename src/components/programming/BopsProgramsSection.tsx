import { useEffect, useMemo, useState, type ElementType } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Shield,
  Loader2,
  ChevronDown,
  ChevronRight,
  Target,
  BookOpen,
  Zap,
  HandHelping,
  Award,
  Layers,
  FileText,
  MoreHorizontal,
  FolderTree,
  ListChecks,
  ArrowRightLeft,
  AlertTriangle,
  Heart,
  Repeat,
} from 'lucide-react';
import { toast } from 'sonner';
import { useStudentBopsPrograms } from '@/hooks/useBopsData';
import { useDomains, useStudentTargets, useTargetActions } from '@/hooks/useCurriculum';
import { useSkillPrograms, useSkillProgramActions } from '@/hooks/useSkillPrograms';
import { useProtocols } from '@/hooks/useProtocols';

interface BopsProgramsSectionProps {
  studentId: string;
  onAllocated?: () => void;
}

const STATE_META: Record<string, { label: string; tone: string }> = {
  red: { label: 'Red Day', tone: 'destructive' },
  yellow: { label: 'Yellow Day', tone: 'secondary' },
  green: { label: 'Green Day', tone: 'default' },
  blue: { label: 'Blue Day', tone: 'outline' },
};

function normalize(value?: string | null) {
  return (value || '').toLowerCase().replace(/[_-]/g, ' ').replace(/\s+/g, ' ').trim();
}

function toList(items: unknown): string[] {
  if (!items) return [];
  if (Array.isArray(items)) return items.filter(Boolean).map(String);
  if (typeof items === 'string') return [items];
  return [];
}

function getVisibleStates(program: any): string[] {
  const rawVisibility = Array.isArray(program.state_visibility) ? program.state_visibility.map(String) : [];
  if (rawVisibility.length > 0) return rawVisibility;

  const stateMap = program.state_target_map && typeof program.state_target_map === 'object'
    ? (program.state_target_map as Record<string, any>)
    : {};

  const states = ['red', 'yellow', 'green', 'blue'].filter((state) => stateMap[state]);
  return states.length > 0 ? states : ['green'];
}

function getProgramTargets(program: any): string[] {
  const direct = toList(program.default_target_options);
  const stateMap = program.state_target_map && typeof program.state_target_map === 'object'
    ? (program.state_target_map as Record<string, any>)
    : {};

  const fromStates = Object.values(stateMap).flatMap((payload: any) => {
    if (!payload || typeof payload !== 'object') return [];
    return toList(payload.target_options);
  });

  const unique = [...new Set([...direct, ...fromStates].map((item) => item.trim()).filter(Boolean))];
  return unique;
}

function buildProtocolSteps(program: any) {
  const steps = [
    ...toList(program.antecedent_strategies).map((instruction, index) => ({ id: crypto.randomUUID(), order: index + 1, instruction })),
    ...toList(program.teaching_strategies).map((instruction, index) => ({ id: crypto.randomUUID(), order: index + 101, instruction })),
    ...toList(program.reactive_strategies).map((instruction, index) => ({ id: crypto.randomUUID(), order: index + 201, instruction })),
  ];

  if (steps.length > 0) return steps;

  return [{
    id: crypto.randomUUID(),
    order: 1,
    instruction: program.goal_description || program.teacher_friendly_summary || program.program_name || 'Implement support plan',
  }];
}

function JsonList({ items, label, icon: Icon }: { items: unknown; label: string; icon: ElementType }) {
  const arr = toList(items);
  if (arr.length === 0) return null;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <ul className="space-y-0.5 ml-5">
        {arr.map((item, i) => (
          <li key={`${label}-${i}`} className="text-xs text-foreground list-disc">{item}</li>
        ))}
      </ul>
    </div>
  );
}

function BopsProgramCard({
  program,
  skillImported,
  targetsImported,
  protocolImported,
  onAllocateSkill,
  onAllocateTargets,
  onAllocateProtocol,
  onAllocateBehaviorGoal,
  onAllocateReplacement,
  busy,
}: {
  program: any;
  skillImported: boolean;
  targetsImported: boolean;
  protocolImported: boolean;
  onAllocateSkill: () => void;
  onAllocateTargets: () => void;
  onAllocateProtocol: () => void;
  onAllocateBehaviorGoal: () => void;
  onAllocateReplacement: () => void;
  busy: boolean;
}) {
  const [open, setOpen] = useState(false);
  const visibleStates = getVisibleStates(program);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="border rounded-lg border-l-4 border-l-primary bg-card">
        <div className="flex items-start gap-2 p-3">
          <CollapsibleTrigger asChild>
            <button className="flex-1 flex items-start gap-3 text-left hover:bg-muted/30 transition-colors rounded-lg p-1">
              <div className="mt-0.5">
                {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold">{program.program_name}</span>
                  {program.problem_area && (
                    <Badge variant="outline" className="text-[10px]">{program.problem_area}</Badge>
                  )}
                  {program.domain && (
                    <Badge variant="secondary" className="text-[10px]">{program.domain}</Badge>
                  )}
                  {skillImported && <Badge variant="default" className="text-[10px]">In Programs</Badge>}
                  {targetsImported && <Badge variant="outline" className="text-[10px]">In Individual Targets</Badge>}
                  {protocolImported && <Badge variant="secondary" className="text-[10px]">In Protocols</Badge>}
                </div>
                {program.teacher_friendly_summary && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{program.teacher_friendly_summary}</p>
                )}
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {visibleStates.map((state: string) => {
                    const meta = STATE_META[state] || STATE_META.green;
                    return (
                      <Badge key={state} variant={meta.tone as 'default' | 'secondary' | 'outline' | 'destructive'} className="text-[10px] gap-1">
                        {meta.label}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </button>
          </CollapsibleTrigger>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" disabled={busy}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <MoreHorizontal className="w-4 h-4" />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onAllocateSkill} disabled={busy}>
                <FolderTree className="w-4 h-4 mr-2" />
                Send to Skill Programs
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onAllocateTargets} disabled={busy}>
                <ListChecks className="w-4 h-4 mr-2" />
                Send to Individual Targets
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onAllocateProtocol} disabled={busy}>
                <ArrowRightLeft className="w-4 h-4 mr-2" />
                Send to Interventions
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onAllocateBehaviorGoal} disabled={busy}>
                <AlertTriangle className="w-4 h-4 mr-2" />
                Send to Behavior Goals
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onAllocateReplacement} disabled={busy}>
                <Repeat className="w-4 h-4 mr-2" />
                Send to Replacement Behaviors
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-4 border-t mx-3 pt-3">
            {(program.goal_title || program.goal_description) && (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  <Target className="w-3.5 h-3.5" /> Goal
                </div>
                {program.goal_title && <p className="text-sm font-medium ml-5">{program.goal_title}</p>}
                {program.goal_description && <p className="text-xs text-muted-foreground ml-5">{program.goal_description}</p>}
              </div>
            )}

            {program.mastery_criteria && (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  <Award className="w-3.5 h-3.5" /> Mastery Criteria
                </div>
                <p className="text-xs ml-5">{program.mastery_criteria}</p>
              </div>
            )}

            <JsonList items={program.default_target_options} label="Default Target Options" icon={Target} />
            <JsonList items={program.benchmark_ladder} label="Benchmarks" icon={Layers} />
            <JsonList items={program.antecedent_strategies} label="Antecedent Strategies" icon={Shield} />
            <JsonList items={program.teaching_strategies} label="Teaching Strategies" icon={BookOpen} />
            <JsonList items={program.reactive_strategies} label="Reactive Strategies" icon={Zap} />

            {program.reinforcement_plan && (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  <HandHelping className="w-3.5 h-3.5" /> Reinforcement
                </div>
                <p className="text-xs ml-5">{program.reinforcement_plan}</p>
              </div>
            )}

            {program.clinician_summary && (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  <FileText className="w-3.5 h-3.5" /> Clinical Notes
                </div>
                <p className="text-xs text-muted-foreground ml-5 italic">{program.clinician_summary}</p>
              </div>
            )}

            {program.data_collection_type && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">Data: {program.data_collection_type}</Badge>
              </div>
            )}

            {!!program.state_target_map && typeof program.state_target_map === 'object' && (
              <div className="space-y-3">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Day-State Expectations</div>
                <div className="grid gap-2 md:grid-cols-2">
                  {['red', 'yellow', 'green', 'blue']
                    .filter((state) => (program.state_target_map as Record<string, any>)?.[state])
                    .map((state) => {
                      const meta = STATE_META[state] || STATE_META.green;
                      const payload = (program.state_target_map as Record<string, any>)[state] || {};
                      return (
                        <div key={state} className="rounded-lg border p-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant={meta.tone as 'default' | 'secondary' | 'outline' | 'destructive'} className="text-[10px]">{meta.label}</Badge>
                          </div>
                          {typeof payload === 'string' ? (
                            <p className="text-xs text-muted-foreground">{payload}</p>
                          ) : (
                            <>
                              {payload.benchmark_level && (
                                <p className="text-xs text-muted-foreground">{payload.benchmark_level}</p>
                              )}
                              <JsonList items={payload.target_options} label="Targets" icon={Target} />
                            </>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export function BopsProgramsSection({ studentId, onAllocated }: BopsProgramsSectionProps) {
  const { data: programs, isLoading } = useStudentBopsPrograms(studentId);
  const { domains } = useDomains();
  const { programs: skillPrograms, refetch: refetchSkillPrograms } = useSkillPrograms(studentId);
  const { targets, refetch: refetchTargets } = useStudentTargets(studentId);
  const { addProgram } = useSkillProgramActions(studentId, refetchSkillPrograms);
  const { bulkAddTargets } = useTargetActions(studentId, refetchTargets);
  const {
    templates,
    assignments,
    fetchTemplates,
    fetchAssignments,
    createTemplate,
    assignProtocol,
  } = useProtocols();
  const [collapsedDomains, setCollapsedDomains] = useState<Record<string, boolean>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
    fetchAssignments(studentId);
  }, [fetchAssignments, fetchTemplates, studentId]);

  // Consolidate day-state variants (e.g. "Smart Choices - Red", "Smart Choices - Yellow") into parent program
  const consolidatedPrograms = useMemo(() => {
    if (!programs) return [];
    const parentMap = new Map<string, any[]>();
    
    for (const program of programs as any[]) {
      // Strip day-state suffixes to find the base program name
      const baseName = (program.program_name || '')
        .replace(/\s*-\s*(Red|Yellow|Green|Blue)$/i, '')
        .replace(/\s*\((Red|Yellow|Green|Blue)\)$/i, '')
        .trim();
      
      if (!parentMap.has(baseName)) parentMap.set(baseName, []);
      parentMap.get(baseName)!.push(program);
    }

    // Merge variants into a single consolidated program
    return Array.from(parentMap.entries()).map(([baseName, variants]) => {
      if (variants.length === 1) return variants[0];

      // Pick the most complete variant as primary
      const primary = variants.reduce((best, v) =>
        (v.clinician_summary?.length || 0) > (best.clinician_summary?.length || 0) ? v : best
      , variants[0]);

      // Merge state_target_maps from all variants
      const mergedStateMap: Record<string, any> = {};
      for (const v of variants) {
        if (v.state_target_map && typeof v.state_target_map === 'object') {
          Object.assign(mergedStateMap, v.state_target_map);
        }
      }

      // Merge all unique target options
      const allTargets = [...new Set(variants.flatMap(v => getProgramTargets(v)))];

      return {
        ...primary,
        program_name: baseName,
        state_target_map: Object.keys(mergedStateMap).length > 0 ? mergedStateMap : primary.state_target_map,
        default_target_options: allTargets,
        _variant_count: variants.length,
        _variant_ids: variants.map((v: any) => v.programming_assignment_id),
      };
    });
  }, [programs]);

  const groupedByDomain = useMemo(() => {
    return consolidatedPrograms.reduce((acc: Record<string, any[]>, program: any) => {
      const domain = program.domain || 'General';
      if (!acc[domain]) acc[domain] = [];
      acc[domain].push(program);
      return acc;
    }, {});
  }, [consolidatedPrograms]);

  const resolveDomainId = (domainName?: string | null) => {
    const target = normalize(domainName);
    const exact = domains.find((domain) => normalize(domain.name) === target);
    if (exact) return exact.id;
    const loose = domains.find((domain) => normalize(domain.name).includes(target) || target.includes(normalize(domain.name)));
    return loose?.id || null;
  };

  const handleAllocateSkill = async (program: any) => {
    const key = `skill-${program.programming_assignment_id || program.program_name}`;
    setBusyKey(key);
    try {
      if (skillPrograms.some((existing) => normalize(existing.name) === normalize(program.program_name))) {
        toast.info('This BOPS program is already in Programs');
        return;
      }

      const programTargets = getProgramTargets(program).map((name) => ({
        name,
        operational_definition: program.goal_description || program.teacher_friendly_summary || '',
        mastery_criteria: program.mastery_criteria || '',
      }));

      await addProgram({
        name: program.program_name,
        domain_id: resolveDomainId(program.domain),
        method: (program.data_collection_type as any) || 'discrete_trial',
        status: 'acquisition',
        description: program.goal_description || program.teacher_friendly_summary || undefined,
        default_mastery_criteria: program.mastery_criteria || undefined,
        notes: [program.clinician_summary, program.reinforcement_plan].filter(Boolean).join('\n\n') || undefined,
        targets: programTargets.length > 0 ? programTargets : [{
          name: program.goal_title || program.program_name,
          operational_definition: program.goal_description || '',
          mastery_criteria: program.mastery_criteria || '',
        }],
      });

      onAllocated?.();
      toast.success('BOPS program sent to Programs');
    } finally {
      setBusyKey(null);
    }
  };

  const handleAllocateTargets = async (program: any) => {
    const key = `targets-${program.programming_assignment_id || program.program_name}`;
    setBusyKey(key);
    try {
      const domainId = resolveDomainId(program.domain);
      const existingTitles = new Set(targets.map((target) => normalize(target.title)));
      const bopsTargets = getProgramTargets(program);

      const rows = bopsTargets
        .filter((title) => !existingTitles.has(normalize(title)))
        .map((title) => ({
          title,
          description: program.goal_description || program.teacher_friendly_summary || null,
          mastery_criteria: program.mastery_criteria || null,
          domain_id: domainId,
          data_collection_type: program.data_collection_type || 'discrete_trial',
          priority: 'medium' as const,
          source_type: 'custom' as const,
          notes_for_staff: [program.program_name, program.reinforcement_plan].filter(Boolean).join(' • '),
        }));

      if (rows.length === 0) {
        toast.info('These BOPS targets are already in Individual Targets');
        return;
      }

      await bulkAddTargets(rows);
      onAllocated?.();
      toast.success('BOPS targets sent to Individual Targets');
    } finally {
      setBusyKey(null);
    }
  };

  const handleAllocateProtocol = async (program: any) => {
    const key = `protocol-${program.programming_assignment_id || program.program_name}`;
    setBusyKey(key);
    try {
      let template = templates.find((entry) => normalize(entry.title) === normalize(program.program_name));

      if (!template) {
        template = await createTemplate({
          title: program.program_name,
          description: program.goal_description || program.teacher_friendly_summary || null,
          curriculum_system: 'BOPS',
          domain: program.domain || null,
          data_collection_method: program.data_collection_type || 'frequency',
          steps: buildProtocolSteps(program),
          prompt_hierarchy: [],
          mastery_criteria: { description: program.mastery_criteria || 'See BOPS plan expectations' } as any,
          tags: [program.problem_area, program.domain, 'BOPS'].filter(Boolean),
          status: 'active',
          is_template: true,
        });
      }

      const alreadyAssigned = assignments.some((assignment) => assignment.student_id === studentId && assignment.protocol_template_id === template?.id);
      if (alreadyAssigned) {
        toast.info('This BOPS program is already in Interventions');
        return;
      }

      await assignProtocol({
        student_id: studentId,
        protocol_template_id: template.id,
        status: 'active',
        start_date: new Date().toISOString(),
        assigned_staff: [],
        customizations: {
          source: 'bops',
          problem_area: program.problem_area,
          reinforcement_plan: program.reinforcement_plan,
        },
      });

      await fetchAssignments(studentId);
      onAllocated?.();
      toast.success('BOPS program sent to Interventions');
    } finally {
      setBusyKey(null);
    }
  };

  const handleAllocateBehaviorGoal = async (program: any) => {
    const key = `goal-${program.programming_assignment_id || program.program_name}`;
    setBusyKey(key);
    try {
      const domainId = resolveDomainId(program.domain);
      const existingTitles = new Set(targets.map((t) => normalize(t.title)));
      const goalTitle = program.goal_title || program.program_name;

      if (existingTitles.has(normalize(goalTitle))) {
        toast.info('This behavior goal already exists in targets');
        return;
      }

      await bulkAddTargets([{
        title: goalTitle,
        description: program.goal_description || program.teacher_friendly_summary || null,
        mastery_criteria: program.mastery_criteria || null,
        domain_id: domainId,
        data_collection_type: 'frequency',
        priority: 'high' as const,
        source_type: 'custom' as const,
        notes_for_staff: `[Behavior Goal] ${program.program_name}\n${program.reinforcement_plan || ''}`.trim(),
      }]);

      onAllocated?.();
      toast.success('BOPS program sent to Behavior Goals');
    } finally {
      setBusyKey(null);
    }
  };

  const handleAllocateReplacement = async (program: any) => {
    const key = `replace-${program.programming_assignment_id || program.program_name}`;
    setBusyKey(key);
    try {
      const domainId = resolveDomainId(program.domain);
      const bopsTargets = getProgramTargets(program);
      const existingTitles = new Set(targets.map((t) => normalize(t.title)));

      const rows = bopsTargets
        .filter((title) => !existingTitles.has(normalize(title)))
        .map((title) => ({
          title: `[Replacement] ${title}`,
          description: program.goal_description || program.teacher_friendly_summary || null,
          mastery_criteria: program.mastery_criteria || null,
          domain_id: domainId,
          data_collection_type: program.data_collection_type || 'frequency',
          priority: 'high' as const,
          source_type: 'custom' as const,
          notes_for_staff: `[Replacement Behavior] Source: ${program.program_name}\n${program.reinforcement_plan || ''}`.trim(),
        }));

      if (rows.length === 0) {
        toast.info('These replacement behaviors already exist');
        return;
      }

      await bulkAddTargets(rows);
      onAllocated?.();
      toast.success('BOPS targets sent as Replacement Behaviors');
    } finally {
      setBusyKey(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!programs || programs.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          BOPS Programs
          <Badge variant="secondary" className="text-[10px] ml-1">{consolidatedPrograms.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(groupedByDomain).map(([domain, domainPrograms]) => {
          const isCollapsed = collapsedDomains[domain];
          return (
            <div key={domain} className="space-y-2">
              <button
                onClick={() => setCollapsedDomains((prev) => ({ ...prev, [domain]: !prev[domain] }))}
                className="flex items-center gap-2 w-full text-left hover:bg-muted/30 rounded px-1 py-0.5 transition-colors"
              >
                {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                <span className="text-sm font-semibold">{domain}</span>
                <Badge variant="outline" className="text-[10px]">{domainPrograms.length}</Badge>
              </button>

              {!isCollapsed && (
                <div className="space-y-2 ml-2">
                  {(domainPrograms as any[]).map((program) => {
                    const programTargets = getProgramTargets(program);
                    const skillImported = skillPrograms.some((existing) => normalize(existing.name) === normalize(program.program_name));
                    const targetsImported = programTargets.length > 0 && programTargets.every((title) =>
                      targets.some((target) => normalize(target.title) === normalize(title))
                    );
                    const protocolImported = assignments.some((assignment) => normalize(assignment.protocol_template?.title) === normalize(program.program_name));

                    return (
                      <BopsProgramCard
                        key={program.programming_assignment_id || program.program_name}
                        program={program}
                        skillImported={skillImported}
                        targetsImported={targetsImported}
                        protocolImported={protocolImported}
                        busy={busyKey !== null && busyKey.includes(program.programming_assignment_id || program.program_name)}
                        onAllocateSkill={() => handleAllocateSkill(program)}
                        onAllocateTargets={() => handleAllocateTargets(program)}
                        onAllocateProtocol={() => handleAllocateProtocol(program)}
                        onAllocateBehaviorGoal={() => handleAllocateBehaviorGoal(program)}
                        onAllocateReplacement={() => handleAllocateReplacement(program)}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
