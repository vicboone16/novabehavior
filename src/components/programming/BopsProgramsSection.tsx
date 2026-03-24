import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Shield, Loader2, ChevronDown, ChevronRight, Target, AlertTriangle,
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

function JsonList({ items, label, icon: Icon }: { items: any; label: string; icon: React.ElementType }) {
  if (!items) return null;
  const arr = Array.isArray(items) ? items : typeof items === 'string' ? [items] : [];
  if (arr.length === 0) return null;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <ul className="space-y-0.5 ml-5">
        {arr.map((item: string, i: number) => (
          <li key={i} className="text-xs text-foreground list-disc">{item}</li>
        ))}
      </ul>
    </div>
  );
}

function BopsProgramCard({ program }: { program: any }) {
  const [open, setOpen] = useState(false);
  const state = program.day_state || 'green';
  const meta = STATE_META[state] || STATE_META.green;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className={`border rounded-lg border-l-4 ${meta.borderClass} bg-card`}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-start gap-3 p-3 text-left hover:bg-muted/30 transition-colors rounded-lg">
            <div className="mt-0.5">
              {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold">{program.program_name}</span>
                {program.problem_area && (
                  <Badge variant="outline" className="text-[10px]">{program.problem_area}</Badge>
                )}
                {program.linked_domain && (
                  <Badge variant="secondary" className="text-[10px]">{program.linked_domain}</Badge>
                )}
              </div>
              {program.teacher_friendly_summary && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{program.teacher_friendly_summary}</p>
              )}
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-3 pb-3 pt-0 space-y-3 border-t mx-3">
            {/* Goal */}
            {(program.goal_title || program.goal_description) && (
              <div className="pt-3 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  <Target className="w-3.5 h-3.5" />
                  Goal
                </div>
                {program.goal_title && <p className="text-sm font-medium ml-5">{program.goal_title}</p>}
                {program.goal_description && <p className="text-xs text-muted-foreground ml-5">{program.goal_description}</p>}
              </div>
            )}

            {/* Mastery Criteria */}
            {program.mastery_criteria && (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  <Award className="w-3.5 h-3.5" />
                  Mastery Criteria
                </div>
                <p className="text-xs ml-5">{program.mastery_criteria}</p>
              </div>
            )}

            {/* Target Options */}
            <JsonList items={program.target_options} label="Target Options" icon={Target} />

            {/* Benchmark Ladder */}
            <JsonList items={program.benchmark_ladder} label="Benchmarks" icon={Layers} />

            {/* Antecedent Strategies */}
            <JsonList items={program.antecedent_strategies} label="Antecedent Strategies" icon={Shield} />

            {/* Teaching Strategies */}
            <JsonList items={program.teaching_strategies} label="Teaching Strategies" icon={BookOpen} />

            {/* Reactive Strategies */}
            <JsonList items={program.reactive_strategies} label="Reactive Strategies" icon={Zap} />

            {/* Reinforcement Plan */}
            {program.reinforcement_plan && (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  <HandHelping className="w-3.5 h-3.5" />
                  Reinforcement
                </div>
                <p className="text-xs ml-5">{program.reinforcement_plan}</p>
              </div>
            )}

            {/* Clinician Summary */}
            {program.clinician_summary && (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  <FileText className="w-3.5 h-3.5" />
                  Clinical Notes
                </div>
                <p className="text-xs text-muted-foreground ml-5 italic">{program.clinician_summary}</p>
              </div>
            )}

            {/* Data Collection */}
            {program.data_collection_type && (
              <div className="flex items-center gap-2 pt-1">
                <Badge variant="outline" className="text-[10px]">
                  Data: {program.data_collection_type}
                </Badge>
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
  const [collapsedStates, setCollapsedStates] = useState<Record<string, boolean>>({});

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

  // Group by day_state, then by domain within each state
  const grouped = programs.reduce((acc, p: any) => {
    const state = p.day_state || 'green';
    if (!acc[state]) acc[state] = [];
    acc[state].push(p);
    return acc;
  }, {} as Record<string, any[]>);

  const stateOrder = ['red', 'yellow', 'green', 'blue'];
  const toggleState = (state: string) => {
    setCollapsedStates(prev => ({ ...prev, [state]: !prev[state] }));
  };

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
        {stateOrder.map(state => {
          const items = grouped[state];
          if (!items?.length) return null;
          const meta = STATE_META[state] || STATE_META.green;
          const isCollapsed = collapsedStates[state];

          // Sub-group by domain
          const byDomain = items.reduce((acc: Record<string, any[]>, p: any) => {
            const domain = p.linked_domain || p.problem_area || 'General';
            if (!acc[domain]) acc[domain] = [];
            acc[domain].push(p);
            return acc;
          }, {});

          return (
            <div key={state} className="space-y-2">
              <button
                onClick={() => toggleState(state)}
                className="flex items-center gap-2 w-full text-left hover:bg-muted/30 rounded px-1 py-0.5 transition-colors"
              >
                {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                <div className={`w-2.5 h-2.5 rounded-full ${meta.dotClass}`} />
                <span className="text-sm font-semibold">{meta.label}</span>
                <Badge variant="outline" className="text-[10px]">{items.length}</Badge>
              </button>

              {!isCollapsed && (
                <div className="space-y-3 ml-2">
                  {Object.entries(byDomain).map(([domain, domainPrograms]) => (
                    <div key={domain}>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 ml-1">
                        {domain}
                      </p>
                      <div className="space-y-2">
                        {(domainPrograms as any[]).map((p: any) => (
                          <BopsProgramCard key={p.id} program={p} />
                        ))}
                      </div>
                    </div>
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
