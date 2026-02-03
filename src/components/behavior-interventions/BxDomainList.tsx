import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BX_DOMAINS } from '@/types/behaviorIntervention';
import { 
  BookOpen, 
  Heart, 
  Users, 
  Target, 
  RefreshCw, 
  AlertTriangle 
} from 'lucide-react';

const DOMAIN_ICONS: Record<string, React.ReactNode> = {
  'academic_performance_functional_academics': <BookOpen className="w-4 h-4" />,
  'emotional_or_physical_well_being': <Heart className="w-4 h-4" />,
  'social_interaction_communication': <Users className="w-4 h-4" />,
  'behavior_compliance_self_management': <Target className="w-4 h-4" />,
  'transitions_change_tolerance': <RefreshCw className="w-4 h-4" />,
  'safety_high_risk': <AlertTriangle className="w-4 h-4" />,
};

interface BxDomainListProps {
  selectedDomain: string | null;
  onSelectDomain: (domain: string | null) => void;
  problemCounts?: Record<string, number>;
}

export function BxDomainList({ 
  selectedDomain, 
  onSelectDomain,
  problemCounts = {} 
}: BxDomainListProps) {
  return (
    <ScrollArea className="h-full">
      <div className="space-y-1 p-2">
        <button
          onClick={() => onSelectDomain(null)}
          className={cn(
            "w-full text-left px-3 py-2 rounded-lg transition-colors",
            "hover:bg-accent",
            !selectedDomain && "bg-accent"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="font-medium text-sm">All Domains</span>
            <Badge variant="secondary" className="text-xs">
              {Object.values(problemCounts).reduce((a, b) => a + b, 0) || 0}
            </Badge>
          </div>
        </button>

        {BX_DOMAINS.map((domain) => (
          <button
            key={domain.domain}
            onClick={() => onSelectDomain(domain.domain)}
            className={cn(
              "w-full text-left px-3 py-2 rounded-lg transition-colors",
              "hover:bg-accent",
              selectedDomain === domain.domain && "bg-accent"
            )}
          >
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">
                {DOMAIN_ICONS[domain.domain]}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm truncate">
                    {domain.labels[0]}
                  </span>
                  <Badge variant="secondary" className="text-xs ml-2">
                    {problemCounts[domain.domain] || 0}
                  </Badge>
                </div>
                {domain.labels.length > 1 && (
                  <p className="text-xs text-muted-foreground truncate">
                    {domain.labels.slice(1).join(', ')}
                  </p>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </ScrollArea>
  );
}
