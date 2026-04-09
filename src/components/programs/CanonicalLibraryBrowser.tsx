import { useState, useMemo } from 'react';
import { Search, ChevronRight, ChevronDown, Plus, Check, Layers, FolderOpen } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { useProgramDomains, useProgramSubdomains } from '@/hooks/useProgramDomains';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { ProgramDomain, ProgramSubdomain } from '@/hooks/useProgramDomains';

interface CanonicalLibraryBrowserProps {
  onSelect?: (domain: ProgramDomain, subdomain: ProgramSubdomain | null, programName: string) => void;
  onCreateCustom?: () => void;
}

const DOMAIN_COLORS: Record<string, string> = {
  'communication': 'border-l-blue-500',
  'social-play': 'border-l-purple-500',
  'learning-engagement': 'border-l-green-500',
  'behavior-regulation': 'border-l-red-500',
  'adaptive-living': 'border-l-orange-500',
  'academic-pre-academic': 'border-l-yellow-500',
  'safety-independence': 'border-l-cyan-500',
  'motor': 'border-l-pink-500',
};

export function CanonicalLibraryBrowser({ onSelect, onCreateCustom }: CanonicalLibraryBrowserProps) {
  const { data: domains = [], isLoading } = useProgramDomains();
  const [search, setSearch] = useState('');
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());
  const [addingDomain, setAddingDomain] = useState(false);
  const [newDomainName, setNewDomainName] = useState('');
  const queryClient = useQueryClient();

  const toggleDomain = (id: string) => {
    setExpandedDomains(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filteredDomains = useMemo(() => {
    if (!search.trim()) return domains;
    const q = search.toLowerCase();
    return domains.filter(d => d.name.toLowerCase().includes(q));
  }, [domains, search]);

  const handleAddDomain = async () => {
    if (!newDomainName.trim()) return;
    const slug = newDomainName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const { error } = await supabase.from('program_domains').insert({
      name: newDomainName.trim(),
      slug,
      sort_order: domains.length + 1,
      is_active: true,
    });
    if (error) {
      toast.error('Failed to add domain');
    } else {
      toast.success('Domain added');
      queryClient.invalidateQueries({ queryKey: ['program-domains'] });
      setNewDomainName('');
      setAddingDomain(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search domains, subdomains, programs…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {onCreateCustom && (
          <Button variant="outline" size="sm" onClick={onCreateCustom}>
            Create Custom
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground text-sm">Loading library…</div>
      ) : (
        <div className="space-y-1">
          {filteredDomains.map(domain => (
            <DomainSection
              key={domain.id}
              domain={domain}
              search={search}
              expanded={expandedDomains.has(domain.id) || !!search.trim()}
              onToggle={() => toggleDomain(domain.id)}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}

      {/* Add Domain */}
      {addingDomain ? (
        <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/30">
          <Input
            value={newDomainName}
            onChange={e => setNewDomainName(e.target.value)}
            placeholder="New domain name"
            className="flex-1 h-8 text-sm"
            autoFocus
            onKeyDown={e => e.key === 'Enter' && handleAddDomain()}
          />
          <Button size="sm" variant="default" className="h-8" onClick={handleAddDomain} disabled={!newDomainName.trim()}>Save</Button>
          <Button size="sm" variant="ghost" className="h-8" onClick={() => { setAddingDomain(false); setNewDomainName(''); }}>Cancel</Button>
        </div>
      ) : (
        <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={() => setAddingDomain(true)}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Add Domain
        </Button>
      )}
    </div>
  );
}

function DomainSection({
  domain,
  search,
  expanded,
  onToggle,
  onSelect,
}: {
  domain: ProgramDomain;
  search: string;
  expanded: boolean;
  onToggle: () => void;
  onSelect?: CanonicalLibraryBrowserProps['onSelect'];
}) {
  const { data: subdomains = [] } = useProgramSubdomains(expanded ? domain.id : undefined);
  const colorClass = DOMAIN_COLORS[domain.slug] || 'border-l-primary';

  const filteredSubs = useMemo(() => {
    if (!search.trim()) return subdomains;
    const q = search.toLowerCase();
    return subdomains.filter(s => s.name.toLowerCase().includes(q) || domain.name.toLowerCase().includes(q));
  }, [subdomains, search, domain.name]);

  return (
    <div className={`border-l-4 ${colorClass} rounded-md border bg-card`}>
      <button
        className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors text-left"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <Layers className="w-4 h-4 text-primary" />
          <span className="font-medium text-sm">{highlightMatch(domain.name, search)}</span>
        </div>
        <Badge variant="secondary" className="text-[10px]">
          {filteredSubs.length} subdomains
        </Badge>
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-1">
          {filteredSubs.map(sub => (
            <SubdomainRow
              key={sub.id}
              domain={domain}
              subdomain={sub}
              search={search}
              onSelect={onSelect}
            />
          ))}
          <AddSubdomainInline domainId={domain.id} />
        </div>
      )}
    </div>
  );
}

function SubdomainRow({
  domain,
  subdomain,
  search,
  onSelect,
}: {
  domain: ProgramDomain;
  subdomain: ProgramSubdomain;
  search: string;
  onSelect?: CanonicalLibraryBrowserProps['onSelect'];
}) {
  const [expanded, setExpanded] = useState(!!search.trim());
  const [addingProgram, setAddingProgram] = useState(false);
  const [newProgName, setNewProgName] = useState('');

  // For now, programs within subdomains come from skill_programs library or
  // can be added inline. We show the subdomain as selectable.
  return (
    <div className="ml-6">
      <div className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/30 transition-colors">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <FolderOpen className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="text-sm">{highlightMatch(subdomain.name, search)}</span>
        </div>
        {onSelect && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onSelect(domain, subdomain, subdomain.name)}
          >
            <Check className="w-3 h-3 mr-1" /> Select
          </Button>
        )}
      </div>

      {/* Add Program inline */}
      {addingProgram ? (
        <div className="ml-6 flex items-center gap-2 py-1">
          <Input
            value={newProgName}
            onChange={e => setNewProgName(e.target.value)}
            placeholder="Program name"
            className="flex-1 h-7 text-xs"
            autoFocus
            onKeyDown={e => {
              if (e.key === 'Enter' && newProgName.trim() && onSelect) {
                onSelect(domain, subdomain, newProgName.trim());
                setNewProgName('');
                setAddingProgram(false);
              }
            }}
          />
          <Button
            size="sm"
            variant="default"
            className="h-7 text-xs"
            disabled={!newProgName.trim()}
            onClick={() => {
              if (newProgName.trim() && onSelect) {
                onSelect(domain, subdomain, newProgName.trim());
                setNewProgName('');
                setAddingProgram(false);
              }
            }}
          >
            Add
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setAddingProgram(false); setNewProgName(''); }}>
            Cancel
          </Button>
        </div>
      ) : (
        <button
          className="ml-6 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 py-0.5"
          onClick={() => setAddingProgram(true)}
        >
          <Plus className="w-3 h-3" /> Add Program
        </button>
      )}
    </div>
  );
}

function AddSubdomainInline({ domainId }: { domainId: string }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const queryClient = useQueryClient();

  const handleSave = async () => {
    if (!name.trim()) return;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const { error } = await supabase.from('program_subdomains').insert({
      domain_id: domainId,
      name: name.trim(),
      slug,
      sort_order: 99,
      is_active: true,
    });
    if (error) {
      toast.error('Failed to add subdomain');
    } else {
      toast.success('Subdomain added');
      queryClient.invalidateQueries({ queryKey: ['program-subdomains', domainId] });
      setName('');
      setAdding(false);
    }
  };

  if (adding) {
    return (
      <div className="ml-6 flex items-center gap-2 py-1">
        <Input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Subdomain name"
          className="flex-1 h-7 text-xs"
          autoFocus
          onKeyDown={e => e.key === 'Enter' && handleSave()}
        />
        <Button size="sm" variant="default" className="h-7 text-xs" onClick={handleSave} disabled={!name.trim()}>Save</Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setAdding(false); setName(''); }}>Cancel</Button>
      </div>
    );
  }

  return (
    <button
      className="ml-6 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 py-1"
      onClick={() => setAdding(true)}
    >
      <Plus className="w-3 h-3" /> Add Subdomain
    </button>
  );
}

function highlightMatch(text: string, query: string) {
  if (!query.trim()) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}
