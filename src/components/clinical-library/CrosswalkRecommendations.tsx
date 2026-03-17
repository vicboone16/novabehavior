import { useState } from 'react';
import { Search, ArrowRight, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useAllCrosswalkRules, useLibraryRegistry } from '@/hooks/useLibraryRegistry';

export function CrosswalkRecommendations() {
  const { data: rules = [], isLoading } = useAllCrosswalkRules();
  const { data: libraries = [] } = useLibraryRegistry();
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const libraryName = (key: string) =>
    libraries.find(l => l.library_key === key)?.library_name ?? key;

  const filtered = rules.filter(r => {
    if (sourceFilter !== 'all' && r.source_library_key !== sourceFilter) return false;
    if (search && !r.recommendation_text?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const uniqueSources = [...new Set(rules.map(r => r.source_library_key))];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search crosswalk rules..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-48 h-9">
            <Filter className="w-3.5 h-3.5 mr-1" />
            <SelectValue placeholder="Source library" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            {uniqueSources.map(src => (
              <SelectItem key={src} value={src}>{libraryName(src)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Loading rules…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">No crosswalk rules found.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(rule => (
            <Card key={rule.id}>
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="text-[9px] shrink-0 mt-0.5">P{rule.priority_level}</Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs mb-2">{rule.recommendation_text}</p>
                    <div className="flex items-center flex-wrap gap-1.5">
                      <Badge className="text-[9px] bg-muted text-foreground">
                        {libraryName(rule.source_library_key)}
                      </Badge>
                      <Badge variant="outline" className="text-[9px]">
                        {rule.source_domain_key}
                        {rule.source_subdomain_key ? ` / ${rule.source_subdomain_key}` : ''}
                      </Badge>
                      <Badge variant="outline" className="text-[9px]">{rule.score_band}</Badge>
                      <ArrowRight className="w-3 h-3 text-muted-foreground" />
                      <Badge className="text-[9px] bg-primary/10 text-primary border-primary/20">
                        {libraryName(rule.target_library_key)}
                      </Badge>
                      {rule.target_domain_key && (
                        <Badge variant="secondary" className="text-[9px]">{rule.target_domain_key}</Badge>
                      )}
                      {rule.target_program_area && (
                        <Badge variant="secondary" className="text-[9px]">{rule.target_program_area}</Badge>
                      )}
                    </div>
                    {(rule.target_tags ?? []).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {rule.target_tags!.map(tag => (
                          <Badge key={tag} variant="outline" className="text-[8px]">{tag}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
