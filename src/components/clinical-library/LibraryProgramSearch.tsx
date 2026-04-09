import { useState, useMemo } from 'react';
import { Search, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useProgramDomains, useProgramSubdomains, useProgramTags } from '@/hooks/useProgramDomains';
import { useLibraryPrograms, useLibraryProgramCount } from '@/hooks/useLibraryPrograms';
import type { LibraryProgramFilters } from '@/hooks/useLibraryPrograms';

const DOMAIN_BADGE_COLORS: Record<string, string> = {
  'communication': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'social-play': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  'learning-engagement': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'behavior-regulation': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  'adaptive-living': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  'academic-pre-academic': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  'safety-independence': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  'motor': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
};

function domainSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function LibraryProgramSearch() {
  const [search, setSearch] = useState('');
  const [domainId, setDomainId] = useState<string>('');
  const [subdomainId, setSubdomainId] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: domains = [] } = useProgramDomains();
  const { data: subdomains = [] } = useProgramSubdomains(domainId || undefined);
  const { data: tags = [] } = useProgramTags('framework-tags');
  const { data: totalCount = 0 } = useLibraryProgramCount();

  const filters: LibraryProgramFilters = {
    search: search.length >= 2 ? search : undefined,
    domainId: domainId || undefined,
    subdomainId: subdomainId || undefined,
    tagIds: selectedTags.length > 0 ? selectedTags : undefined,
  };

  const { data: programs = [], isLoading } = useLibraryPrograms(filters);

  const hasFilters = !!search || !!domainId || !!subdomainId || selectedTags.length > 0;

  const clearFilters = () => {
    setSearch('');
    setDomainId('');
    setSubdomainId('');
    setSelectedTags([]);
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId) ? prev.filter(t => t !== tagId) : [...prev, tagId]
    );
  };

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search programs by name…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          <Select
            value={domainId}
            onValueChange={v => {
              setDomainId(v === '__all__' ? '' : v);
              setSubdomainId('');
            }}
          >
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue placeholder="All Domains" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Domains</SelectItem>
              {domains.map(d => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={subdomainId}
            onValueChange={v => setSubdomainId(v === '__all__' ? '' : v)}
            disabled={!domainId}
          >
            <SelectTrigger className="w-[200px] h-9">
              <SelectValue placeholder="All Subdomains" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Subdomains</SelectItem>
              {subdomains.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button variant="ghost" size="sm" className="h-9" onClick={clearFilters}>
              <X className="w-3.5 h-3.5 mr-1" /> Clear
            </Button>
          )}
        </div>

        {/* Tag chips */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map(tag => (
              <Badge
                key={tag.id}
                variant={selectedTags.includes(tag.id) ? 'default' : 'outline'}
                className="cursor-pointer text-[10px] transition-colors"
                onClick={() => toggleTag(tag.id)}
              >
                {tag.name}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Result count */}
      <div className="flex items-center justify-between">
        <Badge variant="secondary" className="text-xs">
          Showing {programs.length} of {totalCount} programs
        </Badge>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Loading programs…</div>
      ) : programs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Search className="w-8 h-8 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No programs match your filters</p>
            <p className="text-xs text-muted-foreground mt-1">
              Try broadening your search or add a new program.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {programs.map(prog => {
            const slug = domainSlug(prog.domain_name);
            const colorClass = DOMAIN_BADGE_COLORS[slug] || 'bg-muted text-muted-foreground';
            const isExpanded = expandedId === prog.id;

            return (
              <Card
                key={prog.id}
                className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all"
                onClick={() => setExpandedId(isExpanded ? null : prog.id)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-sm leading-tight">{prog.name}</p>
                    {isExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <Badge className={`text-[10px] border-0 ${colorClass}`}>
                      {prog.domain_name}
                    </Badge>
                    {prog.subdomain_name && (
                      <span className="text-[10px] text-muted-foreground">{prog.subdomain_name}</span>
                    )}
                    {prog.action_status && (
                      <Badge variant="outline" className="text-[10px]">{prog.action_status}</Badge>
                    )}
                  </div>

                  {isExpanded && (
                    <div className="mt-3 pt-2 border-t space-y-1.5">
                      {prog.description ? (
                        <p className="text-xs text-muted-foreground">{prog.description}</p>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">No description yet.</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
