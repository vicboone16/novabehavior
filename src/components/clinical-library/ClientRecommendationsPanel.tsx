import { useMemo } from 'react';
import { Lightbulb, ChevronRight, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useCrosswalkRules, useLibraryRegistry, type CrosswalkRule } from '@/hooks/useLibraryRegistry';
import { useCreateGoalDraft } from '@/hooks/useClientLibrary';
import { toast } from 'sonner';

interface Props {
  clientId: string;
}

/**
 * Shows crosswalk-based recommendations for a client.
 * In a full implementation this would filter by the client's actual assessment scores;
 * for now it surfaces all active crosswalk rules from assigned libraries.
 */
export function ClientRecommendationsPanel({ clientId }: Props) {
  const { data: allRules = [], isLoading } = useCrosswalkRules();
  const { data: libraries = [] } = useLibraryRegistry();
  const createDraft = useCreateGoalDraft();

  const libraryName = (key: string) => libraries.find(l => l.library_key === key)?.library_name ?? key;

  // Group rules by source library
  const grouped = useMemo(() => {
    const map = new Map<string, CrosswalkRule[]>();
    for (const r of allRules) {
      if (!r.is_active) continue;
      const key = r.source_library_key;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return map;
  }, [allRules]);

  const handleAddDraft = (rule: CrosswalkRule) => {
    createDraft.mutate({
      clientId,
      sourceLibraryKey: rule.target_library_key,
      sourceGoalId: '', // No specific goal - recommendation-based
      domainKey: rule.target_domain_key ?? undefined,
      subdomainKey: rule.target_subdomain_key ?? undefined,
      draftGoalTitle: `${libraryName(rule.target_library_key)} — ${rule.target_program_area?.replace(/_/g, ' ') ?? rule.target_domain_key?.replace(/_/g, ' ') ?? 'General'}`,
      draftGoalText: rule.recommendation_text ?? undefined,
      recommendationSource: `crosswalk:${rule.source_library_key}→${rule.target_library_key}`,
    });
  };

  if (isLoading) {
    return <p className="text-xs text-muted-foreground py-6 text-center">Loading recommendations…</p>;
  }

  if (allRules.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Lightbulb className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">No recommendations generated yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Recommendations appear when assessment results identify areas of concern
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Lightbulb className="w-5 h-5 text-amber-500" />
        <h3 className="font-semibold text-sm">Cross-Library Recommendations</h3>
        <Badge variant="secondary" className="text-[10px]">{allRules.length} rules</Badge>
      </div>

      {Array.from(grouped.entries()).map(([sourceKey, rules]) => (
        <div key={sourceKey} className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            From {libraryName(sourceKey)}
          </p>
          {rules.slice(0, 5).map(rule => (
            <Card key={rule.id} className="hover:border-primary/20 transition-colors">
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Badge variant="outline" className="text-[9px]">{rule.score_band}</Badge>
                      <ChevronRight className="w-3 h-3 text-muted-foreground" />
                      <Badge variant="secondary" className="text-[9px]">{libraryName(rule.target_library_key)}</Badge>
                      {rule.target_domain_key && (
                        <Badge variant="outline" className="text-[9px]">{rule.target_domain_key.replace(/_/g, ' ')}</Badge>
                      )}
                    </div>
                    {rule.recommendation_text && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{rule.recommendation_text}</p>
                    )}
                    {rule.target_tags && rule.target_tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {rule.target_tags.slice(0, 4).map(t => (
                          <Badge key={t} variant="outline" className="text-[8px] px-1">{t}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[10px] shrink-0 gap-1"
                    onClick={() => handleAddDraft(rule)}
                  >
                    Add to Drafts
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {rules.length > 5 && (
            <p className="text-[10px] text-muted-foreground pl-2">+ {rules.length - 5} more recommendations</p>
          )}
        </div>
      ))}
    </div>
  );
}
