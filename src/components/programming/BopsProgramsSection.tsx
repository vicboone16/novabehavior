import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Shield, Loader2, ChevronDown, ChevronRight, Target,
  BookOpen, Zap, HandHelping, Award, Layers, FileText
} from 'lucide-react';
import { useStudentBopsPrograms } from '@/hooks/useBopsData';

interface BopsProgramsSectionProps {
  studentId: string;
}

const STATE_META: Record<string, { label: string; dotClass: string; borderClass: string }> = {
  red: { label: 'Red Day', dotClass: 'bg-destructive', borderClass: 'border-l-destructive' },
  yellow: { label: 'Yellow Day', dotClass: 'bg-yellow-500', borderClass: 'border-l-yellow-500' },
  green: { label: 'Green Day', dotClass: 'bg-emerald-500', borderClass: 'border-l-emerald-500' },
  blue: { label: 'Blue Day', dotClass: 'bg-blue-500', borderClass: 'border-l-blue-500' },
};

function toList(items: any): string[] {
  if (!items) return [];
  if (Array.isArray(items)) return items.filter(Boolean).map(String);
  if (typeof items === 'string') return [items];
  return [];
}

function JsonList({ items, label, icon: Icon }: { items: any; label: string; icon: React.ElementType }) {
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

function BopsProgramCard({ program }: { program: any }) {
  const [open, setOpen] = useState(false);
  const visibleStates = Array.isArray(program.state_visibility)
    ? program.state_visibility
    : ['red', 'yellow', 'green', 'blue'].filter((state) => program.state_target_map?.[state]);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="border rounded-lg border-l-4 border-l-primary bg-card">
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-start gap-3 p-3 text-left hover:bg-muted/30 transition-colors rounded-lg">
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
              </div>
              {program.teacher_friendly_summary && (
                <p className="text-xs text-muted-foreground line-clamp-2">{program.teacher_friendly_summary}</p>
              )}
              <div className="flex flex-wrap gap-1 pt-0.5">
                {visibleStates.map((state: string) => {
                  const meta = STATE_META[state] || STATE_META.green;
                  return (
                    <Badge key={state} variant="outline" className="text-[10px] gap-1">
                      <span className={`w-2 h-2 rounded-full ${meta.dotClass}`} />
                      {meta.label}
                    </Badge>
                  );
                })}
              </div>
            </div>
          </button>
        </CollapsibleTrigger>

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

            {!!program.state_target_map && (
              <div className="space-y-3">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Day-State Expectations</div>
                <div className="grid gap-2 md:grid-cols-2">
                  {['red', 'yellow', 'green', 'blue'].filter((state) => program.state_target_map?.[state]).map((state) => {
                    const meta = STATE_META[state] || STATE_META.green;
                    const payload = program.state_target_map[state] || {};
                    return (
                      <div key={state} className="rounded-lg border p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${meta.dotClass}`} />
                          <span className="text-sm font-medium">{meta.label}</span>
                        </div>
                        {payload.benchmark_level && (
                          <p className="text-xs text-muted-foreground">{payload.benchmark_level}</p>
                        )}
                        <JsonList items={payload.target_options} label="Targets" icon={Target} />
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

export function BopsProgramsSection({ studentId }: BopsProgramsSectionProps) {
  const { data: programs, isLoading } = useStudentBopsPrograms(studentId);
  const [collapsedDomains, setCollapsedDomains] = useState<Record<string, boolean>>({});

  const groupedByDomain = useMemo(() => {
    if (!programs) return {} as Record<string, any[]>;
    return programs.reduce((acc: Record<string, any[]>, program: any) => {
      const domain = program.domain || 'General';
      if (!acc[domain]) acc[domain] = [];
      acc[domain].push(program);
      return acc;
    }, {});
  }, [programs]);

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
          <Badge variant="secondary" className="text-[10px] ml-1">{programs.length}</Badge>
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
                  {(domainPrograms as any[]).map((program) => (
                    <BopsProgramCard key={program.programming_assignment_id || program.id} program={program} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
