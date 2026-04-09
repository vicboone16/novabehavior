import { useState, useMemo } from 'react';
import { Search, X, ChevronDown, ChevronUp, MoreVertical, BookOpen, ArrowRightLeft, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useProgramDomains, useProgramSubdomains, useProgramTags } from '@/hooks/useProgramDomains';
import { ProgramTagManager } from './ProgramTagManager';
import { MoveProgramDialog, type MoveProgramTarget } from './MoveProgramDialog';
import { EmptyState } from './EmptyState';
import { useLibraryPrograms, useLibraryProgramCount } from '@/hooks/useLibraryPrograms';
import type { LibraryProgramFilters } from '@/hooks/useLibraryPrograms';
import { seedCanonicalLibrary } from '@/utils/seedCanonicalLibrary';
import { toast } from 'sonner';

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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [moveTarget, setMoveTarget] = useState<MoveProgramTarget | MoveProgramTarget[] | null>(null);
  const [seeding, setSeeding] = useState(false);

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

  const { data: programs = [], isLoading, refetch } = useLibraryPrograms(filters);

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

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectedPrograms = useMemo(() =>
    programs.filter(p => selectedIds.has(p.id)).map(p => ({
      id: p.id,
      name: p.name,
      domain_id: p.domain_id,
      subdomain_id: p.subdomain_id,
      domain_name: p.domain_name,
      subdomain_name: p.subdomain_name,
    })),
    [programs, selectedIds]
  );

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const result = await seedCanonicalLibrary();
      toast.success(`Library seeded: ${result.domainsInserted} domains, ${result.subdomainsInserted} subdomains, ${result.programsInserted} programs`);
      refetch();
    } catch (e: any) {
      toast.error('Seed failed: ' + e.message);
    } finally {
      setSeeding(false);
    }
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
      ) : totalCount === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No programs in the library yet"
          description="Seed the canonical library to populate 172 ABA programs across 8 domains, or add programs manually."
          action={{ label: seeding ? 'Seeding…' : 'Seed Canonical Library', onClick: handleSeed }}
        />
      ) : programs.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No programs match your filters"
          description="Try broadening your search, removing filters, or check a different domain."
          action={{ label: 'Clear All Filters', onClick: clearFilters }}
        />
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {programs.map(prog => {
            const slug = domainSlug(prog.domain_name);
            const colorClass = DOMAIN_BADGE_COLORS[slug] || 'bg-muted text-muted-foreground';
            const isExpanded = expandedId === prog.id;
            const isSelected = selectedIds.has(prog.id);

            return (
              <Card
                key={prog.id}
                className={`hover:shadow-md hover:border-primary/30 transition-all ${isSelected ? 'ring-2 ring-primary border-primary' : ''}`}
              >
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelect(prog.id)}
                      className="mt-0.5 shrink-0"
                      onClick={e => e.stopPropagation()}
                    />
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : prog.id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-sm leading-tight">{prog.name}</p>
                        <div className="flex items-center gap-1 shrink-0">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e => e.stopPropagation()}>
                                <MoreVertical className="w-3.5 h-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={e => {
                                e.stopPropagation();
                                setMoveTarget({
                                  id: prog.id,
                                  name: prog.name,
                                  domain_id: prog.domain_id,
                                  subdomain_id: prog.subdomain_id,
                                  domain_name: prog.domain_name,
                                  subdomain_name: prog.subdomain_name,
                                });
                              }}>
                                <ArrowRightLeft className="w-3.5 h-3.5 mr-2" />
                                Move to Domain
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                          )}
                        </div>
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
                          <div className="pt-1">
                            <ProgramTagManager programId={prog.id} programName={prog.name} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-background border rounded-lg shadow-lg px-4 py-2.5 flex items-center gap-3">
          <Badge variant="secondary" className="text-xs">{selectedIds.size} selected</Badge>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1.5"
            onClick={() => setMoveTarget(selectedPrograms)}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" /> Move
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs"
            onClick={() => setSelectedIds(new Set())}
          >
            Clear
          </Button>
        </div>
      )}

      {/* Move dialog */}
      {moveTarget && (
        <MoveProgramDialog
          program={moveTarget}
          open={!!moveTarget}
          onOpenChange={open => { if (!open) setMoveTarget(null); }}
          onMoved={() => { setSelectedIds(new Set()); refetch(); }}
        />
      )}
    </div>
  );
}
