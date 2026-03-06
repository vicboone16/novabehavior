import { useState, useEffect } from 'react';
import { Search, AlertTriangle, Shield, AlertCircle, Info, UserPlus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { InlineNameEditor } from '@/components/behavior-library/InlineNameEditor';
import { TagManager } from '@/components/behavior-library/TagManager';
import { useBxTags } from '@/hooks/useBxTags';
import type { BxPresentingProblem, RiskLevel } from '@/types/behaviorIntervention';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const RISK_CONFIG: Record<RiskLevel, { icon: React.ReactNode; color: string }> = {
  low: { icon: <Info className="w-3 h-3" />, color: 'text-green-600 bg-green-100 dark:bg-green-900/30' },
  medium: { icon: <AlertCircle className="w-3 h-3" />, color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30' },
  high: { icon: <AlertTriangle className="w-3 h-3" />, color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30' },
  crisis: { icon: <Shield className="w-3 h-3" />, color: 'text-red-600 bg-red-100 dark:bg-red-900/30' },
};

interface BxProblemListProps {
  problems: BxPresentingProblem[];
  loading: boolean;
  selectedProblem: BxPresentingProblem | null;
  onSelectProblem: (problem: BxPresentingProblem) => void;
  onAddToStudent?: (problem: BxPresentingProblem) => void;
}

export function BxProblemList({ 
  problems, 
  loading, 
  selectedProblem, 
  onSelectProblem,
  onAddToStudent
}: BxProblemListProps) {
  const [search, setSearch] = useState('');

  const filtered = problems.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.problem_code.toLowerCase().includes(search.toLowerCase()) ||
    (p.definition && p.definition.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search problems..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No presenting problems found.
            </div>
          ) : (
            filtered.map((problem) => {
              const risk = RISK_CONFIG[problem.risk_level];
              return (
                <div
                  key={problem.id}
                  className={cn(
                    "w-full text-left p-3 rounded-lg transition-colors",
                    "hover:bg-accent border border-transparent",
                    selectedProblem?.id === problem.id && "bg-accent border-border"
                  )}
                >
                  <button
                    onClick={() => onSelectProblem(problem)}
                    className="w-full text-left"
                  >
                    <div className="flex items-start gap-2">
                      <Badge 
                        variant="outline" 
                        className={cn("text-xs shrink-0", risk.color)}
                      >
                        {risk.icon}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground">
                            {problem.problem_code}
                          </span>
                        </div>
                        <h4 className="font-medium text-sm truncate">{problem.title}</h4>
                        {problem.function_tags && problem.function_tags.length > 0 && (
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {problem.function_tags.slice(0, 3).map(tag => (
                              <Badge key={tag} variant="secondary" className="text-xs capitalize">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                  {onAddToStudent && (
                    <div className="mt-2 flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddToStudent(problem);
                        }}
                      >
                        <UserPlus className="w-3 h-3 mr-1" />
                        Add to Student
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
