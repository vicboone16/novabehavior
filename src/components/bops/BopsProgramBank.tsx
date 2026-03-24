import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useStudentAcceptedPrograms } from '@/hooks/useBopsData';
import { Loader2, AlertTriangle, Sun, Leaf } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';

const STATE_CONFIG = {
  red: { label: 'Red – Regulation', icon: AlertTriangle, color: 'text-red-600 bg-red-50 border-red-200' },
  yellow: { label: 'Yellow – Supported', icon: Sun, color: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
  green: { label: 'Green – Skill Building', icon: Leaf, color: 'text-green-700 bg-green-50 border-green-200' },
};

export function BopsProgramBank({ studentId }: { studentId: string }) {
  const [filter, setFilter] = useState<string>('all');
  const { data: programs, isLoading } = useStudentAcceptedPrograms(studentId);

  if (isLoading) return <Loader2 className="animate-spin mx-auto mt-8" />;

  const filtered = filter === 'all' ? programs : programs?.filter(p => p.day_state === filter);
  const grouped = (filtered || []).reduce((acc, p) => {
    const state = p.day_state || 'unknown';
    if (!acc[state]) acc[state] = [];
    acc[state].push(p);
    return acc;
  }, {} as Record<string, typeof filtered>);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Program Bank</CardTitle>
          <ToggleGroup type="single" value={filter} onValueChange={v => v && setFilter(v)} className="bg-muted rounded-lg p-0.5">
            <ToggleGroupItem value="all" className="text-xs px-3">All</ToggleGroupItem>
            <ToggleGroupItem value="red" className="text-xs px-3">🔴 Red</ToggleGroupItem>
            <ToggleGroupItem value="yellow" className="text-xs px-3">🟡 Yellow</ToggleGroupItem>
            <ToggleGroupItem value="green" className="text-xs px-3">🟢 Green</ToggleGroupItem>
          </ToggleGroup>
        </div>
      </CardHeader>
      <CardContent>
        {(!programs || programs.length === 0) ? (
          <p className="text-center text-muted-foreground py-8">No programs found for this student.</p>
        ) : (
          <ScrollArea className="h-[600px]">
            <div className="space-y-4">
              {(['red', 'yellow', 'green'] as const).map(state => {
                const items = grouped[state];
                if (!items?.length) return null;
                const cfg = STATE_CONFIG[state];
                const Icon = cfg.icon;
                return (
                  <div key={state} className={`rounded-lg border p-3 ${cfg.color}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <Icon className="w-4 h-4" />
                      <span className="font-semibold text-sm">{cfg.label}</span>
                      <Badge variant="outline" className="text-xs">{items.length} programs</Badge>
                    </div>
                    <div className="space-y-2">
                      {items.map(p => (
                        <Collapsible key={p.id}>
                          <CollapsibleTrigger className="w-full">
                            <div className="flex items-center justify-between bg-background/80 rounded-md p-2.5 hover:bg-background cursor-pointer">
                              <div className="text-left">
                                <p className="font-medium text-sm">{p.program_name}</p>
                                <p className="text-xs text-muted-foreground">{p.problem_area} • {p.linked_domain}</p>
                              </div>
                              <ChevronDown className="w-4 h-4 shrink-0" />
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="bg-background/80 rounded-md p-3 mt-1 space-y-3 text-sm">
                              <div>
                                <p className="text-xs font-medium text-muted-foreground">Goal</p>
                                <p>{p.goal_title}</p>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-muted-foreground">Targets</p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {(Array.isArray(p.target_options) ? p.target_options : []).map((t: any, i: number) => (
                                    <Badge key={i} variant="outline" className="text-xs">{String(t)}</Badge>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-muted-foreground">Benchmarks</p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {(Array.isArray(p.benchmark_ladder) ? p.benchmark_ladder : []).map((b: any, i: number) => (
                                    <Badge key={i} variant="secondary" className="text-xs">{String(b)}</Badge>
                                  ))}
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground">Antecedent Strategies</p>
                                  <ul className="text-xs mt-1 list-disc list-inside">
                                    {(Array.isArray(p.antecedent_strategies) ? p.antecedent_strategies : []).map((a: any, i: number) => (
                                      <li key={i}>{String(a)}</li>
                                    ))}
                                  </ul>
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground">Reactive Strategies</p>
                                  <ul className="text-xs mt-1 list-disc list-inside">
                                    {(Array.isArray(p.reactive_strategies) ? p.reactive_strategies : []).map((r: any, i: number) => (
                                      <li key={i}>{String(r)}</li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-muted-foreground">Reinforcement</p>
                                <p className="text-xs">{p.reinforcement_plan}</p>
                              </div>
                              <div className="bg-muted/50 p-2 rounded text-xs">
                                <p className="font-medium">Teacher View:</p>
                                <p>{p.teacher_friendly_summary}</p>
                              </div>
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
