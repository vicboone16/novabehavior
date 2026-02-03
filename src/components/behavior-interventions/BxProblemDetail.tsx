import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Target, 
  Lightbulb, 
  AlertTriangle, 
  FileText,
  CheckCircle2,
  Clock,
  Zap
} from 'lucide-react';
import { useProblemObjectives, useObjectiveStrategies } from '@/hooks/useBehaviorInterventions';
import type { BxPresentingProblem, BxObjective, StrategyPhase } from '@/types/behaviorIntervention';
import { BX_DOMAINS } from '@/types/behaviorIntervention';
import { cn } from '@/lib/utils';

const PHASE_CONFIG: Record<StrategyPhase, { label: string; icon: React.ReactNode; color: string }> = {
  prevention: { label: 'Prevention', icon: <Clock className="w-3 h-3" />, color: 'bg-primary/10 text-primary' },
  teaching: { label: 'Teaching', icon: <Lightbulb className="w-3 h-3" />, color: 'bg-accent text-accent-foreground' },
  reinforcement: { label: 'Reinforcement', icon: <CheckCircle2 className="w-3 h-3" />, color: 'bg-secondary text-secondary-foreground' },
  maintenance: { label: 'Maintenance', icon: <Target className="w-3 h-3" />, color: 'bg-muted text-muted-foreground' },
  crisis: { label: 'Crisis', icon: <Zap className="w-3 h-3" />, color: 'bg-destructive/10 text-destructive' },
};

interface BxProblemDetailProps {
  problem: BxPresentingProblem;
}

function ObjectiveStrategiesView({ objective }: { objective: BxObjective }) {
  const { strategies, loading } = useObjectiveStrategies(objective.id);

  // Group by phase
  const byPhase = strategies.reduce((acc, s) => {
    const phase = s.phase as StrategyPhase;
    if (!acc[phase]) acc[phase] = [];
    acc[phase].push(s);
    return acc;
  }, {} as Record<StrategyPhase, typeof strategies>);

  if (loading) {
    return <p className="text-sm text-muted-foreground p-2">Loading strategies...</p>;
  }

  if (strategies.length === 0) {
    return <p className="text-sm text-muted-foreground p-2">No strategies linked.</p>;
  }

  return (
    <div className="space-y-4">
      {(Object.keys(PHASE_CONFIG) as StrategyPhase[]).map(phase => {
        const phaseStrategies = byPhase[phase];
        if (!phaseStrategies || phaseStrategies.length === 0) return null;
        
        const config = PHASE_CONFIG[phase];
        
        return (
          <div key={phase}>
            <div className="flex items-center gap-2 mb-2">
              <Badge className={cn("text-xs", config.color)}>
                {config.icon}
                <span className="ml-1">{config.label}</span>
              </Badge>
              <span className="text-xs text-muted-foreground">
                {phaseStrategies.length} strateg{phaseStrategies.length === 1 ? 'y' : 'ies'}
              </span>
            </div>
            <div className="space-y-2 ml-4">
              {phaseStrategies.map(strategy => (
                <Card key={strategy.id} className="p-3">
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-mono text-muted-foreground">
                      {strategy.strategy_code}
                    </span>
                    <div className="flex-1">
                      <h5 className="font-medium text-sm">{strategy.strategy_name}</h5>
                      {strategy.requires_bcba && (
                        <Badge variant="outline" className="text-xs mt-1 text-destructive">
                          Requires BCBA
                        </Badge>
                      )}
                      {strategy.implementation_steps && strategy.implementation_steps.length > 0 && (
                        <ul className="mt-2 text-xs text-muted-foreground list-disc list-inside">
                          {strategy.implementation_steps.slice(0, 3).map((step, i) => (
                            <li key={i}>{step}</li>
                          ))}
                          {strategy.implementation_steps.length > 3 && (
                            <li className="text-primary">+{strategy.implementation_steps.length - 3} more steps</li>
                          )}
                        </ul>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function BxProblemDetail({ problem }: BxProblemDetailProps) {
  const { objectives, loading: loadingObjectives } = useProblemObjectives(problem.id);
  const [selectedObjective, setSelectedObjective] = useState<BxObjective | null>(null);
  
  const domainInfo = BX_DOMAINS.find(d => d.domain === problem.domain);

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="outline" className="text-xs font-mono">
            {problem.problem_code}
          </Badge>
          <Badge variant="secondary" className="text-xs capitalize">
            {problem.risk_level}
          </Badge>
          {problem.source_origin !== 'internal' && (
            <Badge variant="outline" className="text-xs">
              {problem.source_origin}
            </Badge>
          )}
        </div>
        <h2 className="text-lg font-bold">{problem.title}</h2>
        {domainInfo && (
          <p className="text-sm text-muted-foreground mt-1">
            {domainInfo.labels.join(' / ')}
          </p>
        )}
      </div>

      <Tabs defaultValue="overview" className="flex-1 flex flex-col">
        <div className="px-4 border-b">
          <TabsList className="h-9">
            <TabsTrigger value="overview" className="text-xs">
              <FileText className="w-3 h-3 mr-1" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="objectives" className="text-xs">
              <Target className="w-3 h-3 mr-1" />
              Objectives ({objectives.length})
            </TabsTrigger>
            <TabsTrigger value="strategies" className="text-xs">
              <Lightbulb className="w-3 h-3 mr-1" />
              Strategies
            </TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="flex-1">
          <TabsContent value="overview" className="p-4 m-0 space-y-4">
            {problem.definition && (
              <div>
                <h4 className="text-sm font-medium mb-1">Definition</h4>
                <p className="text-sm text-muted-foreground">{problem.definition}</p>
              </div>
            )}

            {problem.examples && problem.examples.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-1">Examples</h4>
                <ul className="text-sm text-muted-foreground list-disc list-inside">
                  {problem.examples.map((ex, i) => (
                    <li key={i}>{ex}</li>
                  ))}
                </ul>
              </div>
            )}

            {problem.function_tags && problem.function_tags.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-1">Common Functions</h4>
                <div className="flex gap-1 flex-wrap">
                  {problem.function_tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs capitalize">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {problem.trigger_tags && problem.trigger_tags.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-1">Common Triggers</h4>
                <div className="flex gap-1 flex-wrap">
                  {problem.trigger_tags.map(tag => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {problem.contraindications && problem.contraindications.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-1 flex items-center gap-1 text-destructive">
                  <AlertTriangle className="w-3 h-3" />
                  Contraindications
                </h4>
                <ul className="text-sm text-muted-foreground list-disc list-inside">
                  {problem.contraindications.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}
          </TabsContent>

          <TabsContent value="objectives" className="p-4 m-0 space-y-3">
            {loadingObjectives ? (
              <p className="text-sm text-muted-foreground">Loading objectives...</p>
            ) : objectives.length === 0 ? (
              <p className="text-sm text-muted-foreground">No objectives linked to this problem.</p>
            ) : (
              objectives.map(obj => (
                <Card 
                  key={obj.id}
                  className={cn(
                    "cursor-pointer transition-colors",
                    selectedObjective?.id === obj.id && "ring-2 ring-primary"
                  )}
                  onClick={() => setSelectedObjective(
                    selectedObjective?.id === obj.id ? null : obj
                  )}
                >
                  <CardHeader className="p-3 pb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs font-mono">
                        {obj.objective_code}
                      </Badge>
                    </div>
                    <CardTitle className="text-sm">{obj.objective_title}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    {obj.operational_definition && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {obj.operational_definition}
                      </p>
                    )}
                    {obj.mastery_criteria && (
                      <p className="text-xs mt-1">
                        <span className="font-medium">Mastery:</span>{' '}
                        <span className="text-muted-foreground">{obj.mastery_criteria}</span>
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="strategies" className="p-4 m-0">
            {!selectedObjective ? (
              <p className="text-sm text-muted-foreground">
                Select an objective from the Objectives tab to view linked strategies.
              </p>
            ) : (
              <div>
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground">
                    Strategies for objective:
                  </p>
                  <p className="font-medium text-sm">{selectedObjective.objective_title}</p>
                </div>
                <ObjectiveStrategiesView objective={selectedObjective} />
              </div>
            )}
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
