import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Archive, ArchiveRestore, Search, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useProgramDomains, useProgramSubdomains } from '@/hooks/useProgramDomains';
import type { ProgramDomain } from '@/hooks/useProgramDomains';

export function DomainManager() {
  const { data: domains = [], isLoading: loading, refetch } = useProgramDomains();
  const [search, setSearch] = useState('');

  const filtered = domains.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search domains..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Badge variant="secondary" className="text-xs">
          {domains.length} canonical domains
        </Badge>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No domains found</CardContent></Card>
      ) : (
        <div className="grid gap-2">
          {filtered.map(d => (
            <DomainRow key={d.id} domain={d} />
          ))}
        </div>
      )}
    </div>
  );
}

function DomainRow({ domain }: { domain: ProgramDomain }) {
  const [expanded, setExpanded] = useState(false);
  const { data: subdomains = [] } = useProgramSubdomains(expanded ? domain.id : undefined);

  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="p-3">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Layers className="w-4 h-4 text-primary shrink-0" />
            <span className="font-medium text-sm">{domain.name}</span>
            <Badge variant="outline" className="text-[10px]">canonical</Badge>
          </div>
          <span className="text-xs text-muted-foreground">{expanded ? '▾' : '▸'}</span>
        </div>
        {expanded && subdomains.length > 0 && (
          <div className="mt-2 pl-6 flex flex-wrap gap-1">
            {subdomains.map(s => (
              <Badge key={s.id} variant="secondary" className="text-[10px]">
                {s.name}
              </Badge>
            ))}
          </div>
        )}
        {expanded && subdomains.length === 0 && (
          <div className="mt-2 pl-6 text-xs text-muted-foreground">No subdomains</div>
        )}
      </CardContent>
    </Card>
  );
}
