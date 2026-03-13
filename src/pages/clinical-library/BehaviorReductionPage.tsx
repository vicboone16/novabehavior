import { useNavigate } from 'react-router-dom';
import {
  Shield, Zap, Target, BookOpen, AlertTriangle,
  ExternalLink
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const SECTIONS = [
  {
    key: 'behavior-reduction-goals',
    label: 'Behavior Reduction Goals',
    description: 'Function-based goals for aggression, elopement, SIB, noncompliance, and more.',
    icon: Shield,
    route: null,
  },
  {
    key: 'intervention-protocols',
    label: 'Intervention Protocols',
    description: 'Evidence-based intervention strategies — FCT, DRA, DRO, antecedent modifications, de-escalation.',
    icon: Zap,
    route: null,
  },
  {
    key: 'replacement-behaviors',
    label: 'Replacement Behaviors',
    description: 'Functionally equivalent replacement behaviors mapped to maintaining variables.',
    icon: Target,
    route: null,
  },
  {
    key: 'crisis-protocols',
    label: 'Crisis Protocols',
    description: 'Emergency response procedures and safety plans for high-risk behaviors.',
    icon: AlertTriangle,
    route: null,
  },
  {
    key: 'strategy-library',
    label: 'Strategy Library',
    description: 'Searchable library of 130+ behavior strategies with teacher quick-use guides and fidelity checklists.',
    icon: BookOpen,
    route: null,
  },
];

export default function BehaviorReductionPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">Behavior Reduction & Interventions</h2>
        <p className="text-xs text-muted-foreground">Function-based goals, intervention protocols, replacement behaviors & crisis plans</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map(section => (
          <Card
            key={section.key}
            className={`transition-all group ${
              section.route
                ? 'cursor-pointer hover:shadow-md hover:border-primary/40'
                : 'opacity-70'
            }`}
            onClick={() => section.route && navigate(section.route)}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <section.icon className="w-5 h-5 text-primary" />
                </div>
                {section.route && (
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </div>
              <h3 className="font-semibold text-sm mb-1">{section.label}</h3>
              <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{section.description}</p>
              {!section.route && (
                <Badge variant="outline" className="text-[10px] text-muted-foreground">Coming soon</Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
