import { useState } from 'react';
import { ArrowLeft, BookOpen, ChevronRight, Target, Layers, Plus, Copy, Check, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import {
  useLibraryDomains,
  useLibrarySubdomains,
  useLibraryGoals,
  useCrosswalkRules,
  type LibraryRegistryEntry,
  type LibraryGoal,
} from '@/hooks/useLibraryRegistry';
import { LibraryGoalDetail } from './LibraryGoalDetail';

interface Props {
  library: LibraryRegistryEntry;
  onBack: () => void;
}

export function LibraryDetailView({ library, onBack }: Props) {
  const { data: domains = [] } = useLibraryDomains(library.library_key);
  const { data: subdomains = [] } = useLibrarySubdomains(library.library_key);
  const { data: goals = [] } = useLibraryGoals(library.library_key);
  const { data: crosswalks = [] } = useCrosswalkRules(library.library_key);
  const [activeTab, setActiveTab] = useState('domains');
  const [search, setSearch] = useState('');
  const [selectedGoal, setSelectedGoal] = useState<LibraryGoal | null>(null);
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());

  const toggleDomain = (key: string) => {
    setExpandedDomains(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const filteredGoals = goals.filter(g =>
    !search || g.goal_title.toLowerCase().includes(search.toLowerCase())
  );

  if (selectedGoal) {
    return (
      <LibraryGoalDetail
        goal={selectedGoal}
        libraryName={library.library_name}
        onBack={() => setSelectedGoal(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h2 className="text-base font-bold">{library.library_name}</h2>
          <p className="text-xs text-muted-foreground">{library.notes}</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-9">
          <TabsTrigger value="domains" className="text-xs gap-1">
            <Layers className="w-3.5 h-3.5" /> Domains
          </TabsTrigger>
          <TabsTrigger value="goals" className="text-xs gap-1">
            <Target className="w-3.5 h-3.5" /> Goal Bank
          </TabsTrigger>
          <TabsTrigger value="crosswalks" className="text-xs gap-1">
            <BookOpen className="w-3.5 h-3.5" /> Crosswalks
          </TabsTrigger>
        </TabsList>

        {/* Domains tab */}
        <TabsContent value="domains" className="mt-4 space-y-2">
          {domains.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No domains configured yet.</p>
          ) : (
            domains.map(domain => {
              const domSubs = subdomains.filter(s => s.domain_key === domain.domain_key);
              const domGoals = goals.filter(g => g.domain_key === domain.domain_key);
              const isOpen = expandedDomains.has(domain.domain_key);
              return (
                <Collapsible key={domain.id} open={isOpen} onOpenChange={() => toggleDomain(domain.domain_key)}>
                  <CollapsibleTrigger asChild>
                    <Card className="cursor-pointer hover:bg-muted/30 transition-colors">
                      <CardContent className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ChevronRight className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                          <span className="font-medium text-sm">{domain.domain_name}</span>
                          <Badge variant="secondary" className="text-[10px]">{domGoals.length} goals</Badge>
                          {domSubs.length > 0 && (
                            <Badge variant="outline" className="text-[10px]">{domSubs.length} subdomains</Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pl-6 space-y-1 mt-1">
                    {domSubs.length > 0 ? (
                      domSubs.map(sub => {
                        const subGoals = domGoals.filter(g => g.subdomain_key === sub.subdomain_key);
                        return (
                          <div key={sub.id} className="flex items-center justify-between p-2 rounded border border-border/50 bg-muted/20">
                            <span className="text-xs font-medium">{sub.subdomain_name}</span>
                            <Badge variant="secondary" className="text-[9px]">{subGoals.length} goals</Badge>
                          </div>
                        );
                      })
                    ) : (
                      domGoals.slice(0, 5).map(g => (
                        <div
                          key={g.id}
                          className="flex items-center justify-between p-2 rounded border border-border/50 bg-muted/20 cursor-pointer hover:bg-muted/40"
                          onClick={() => setSelectedGoal(g)}
                        >
                          <span className="text-xs">{g.goal_title}</span>
                          <ChevronRight className="w-3 h-3 text-muted-foreground" />
                        </div>
                      ))
                    )}
                  </CollapsibleContent>
                </Collapsible>
              );
            })
          )}
        </TabsContent>

        {/* Goal Bank tab */}
        <TabsContent value="goals" className="mt-4 space-y-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search goals..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          {filteredGoals.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No goals found.</p>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {filteredGoals.map(goal => (
                <Card
                  key={goal.id}
                  className="cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => setSelectedGoal(goal)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{goal.goal_title}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          <Badge variant="outline" className="text-[9px]">{goal.domain_key}</Badge>
                          {goal.subdomain_key && (
                            <Badge variant="secondary" className="text-[9px]">{goal.subdomain_key}</Badge>
                          )}
                          {goal.goal_type && (
                            <Badge variant="secondary" className="text-[9px]">{goal.goal_type}</Badge>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground mt-0.5" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Crosswalks tab */}
        <TabsContent value="crosswalks" className="mt-4">
          {crosswalks.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No crosswalk rules configured.</p>
          ) : (
            <div className="space-y-2">
              {crosswalks.map(rule => (
                <Card key={rule.id}>
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2">
                      <Badge variant="outline" className="text-[9px] shrink-0">P{rule.priority_level}</Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs">{rule.recommendation_text}</p>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          <Badge variant="secondary" className="text-[9px]">
                            {rule.source_domain_key}{rule.source_subdomain_key ? ` → ${rule.source_subdomain_key}` : ''}
                          </Badge>
                          <span className="text-[9px] text-muted-foreground">→</span>
                          <Badge className="text-[9px] bg-primary/10 text-primary border-primary/20">
                            {rule.target_library_key}
                          </Badge>
                          <Badge variant="outline" className="text-[9px]">{rule.score_band}</Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
