import { Badge } from '@/components/ui/badge';
import { Layers, Shield, Target } from 'lucide-react';
import type { SupplementalLayers } from '@/hooks/useBehaviorRecommendations';

interface Props {
  supplements: SupplementalLayers;
}

export function SupplementalLayersDisplay({ supplements }: Props) {
  const hasContent =
    supplements.mtss_recommendations.length > 0 ||
    supplements.antecedent_strategies.length > 0 ||
    supplements.teaching_strategies.length > 0 ||
    supplements.reactive_strategies.length > 0 ||
    supplements.linked_goals.length > 0 ||
    supplements.benchmark_goals.length > 0;

  if (!hasContent) return null;

  return (
    <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
      <p className="text-sm font-semibold flex items-center gap-1.5">
        <Layers className="h-4 w-4 text-primary" />
        Supplemental Layers
      </p>

      {/* MTSS Interventions */}
      {supplements.mtss_recommendations.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">MTSS Interventions</p>
          <div className="space-y-1.5">
            {supplements.mtss_recommendations.map((m, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">{m.tier}</Badge>
                <span className="font-medium">{m.intervention_name}</span>
                {m.support_type && <Badge variant="secondary" className="text-[10px] px-1 py-0">{m.support_type}</Badge>}
                {m.setting_scope && <span className="text-xs text-muted-foreground">({m.setting_scope})</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strategy Groups */}
      {(supplements.antecedent_strategies.length > 0 || supplements.teaching_strategies.length > 0 || supplements.reactive_strategies.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {supplements.antecedent_strategies.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                <Shield className="h-3 w-3" /> Antecedent
              </p>
              <ul className="text-xs space-y-0.5">
                {supplements.antecedent_strategies.map((s, i) => <li key={i}>• {s}</li>)}
              </ul>
            </div>
          )}
          {supplements.teaching_strategies.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Teaching</p>
              <ul className="text-xs space-y-0.5">
                {supplements.teaching_strategies.map((s, i) => <li key={i}>• {s}</li>)}
              </ul>
            </div>
          )}
          {supplements.reactive_strategies.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Reactive</p>
              <ul className="text-xs space-y-0.5">
                {supplements.reactive_strategies.map((s, i) => <li key={i}>• {s}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Linked Goals */}
      {supplements.linked_goals.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
            <Target className="h-3 w-3" /> Linked Goals
          </p>
          <div className="space-y-1">
            {supplements.linked_goals.map((g, i) => (
              <div key={i} className="text-xs flex items-center gap-1.5">
                <span>{g.title}</span>
                {g.domain && <Badge variant="outline" className="text-[9px] px-1 py-0">{g.domain}</Badge>}
                {g.support_level && <Badge variant="secondary" className="text-[9px] px-1 py-0">{g.support_level}</Badge>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Benchmark Goals */}
      {supplements.benchmark_goals.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Benchmark Goals</p>
          <ul className="text-xs space-y-0.5">
            {supplements.benchmark_goals.map((b, i) => <li key={i}>• {b}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
