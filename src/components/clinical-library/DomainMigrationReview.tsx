import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

interface MigrationLogEntry {
  id: string;
  program_id: string;
  old_domain_name: string | null;
  new_domain_name: string | null;
  new_subdomain_name: string | null;
  tags_added: string[] | null;
  confidence: string;
  migration_source: string;
  needs_review: boolean;
  created_at: string;
  program_name?: string;
}

export function DomainMigrationReview() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'needs-review' | 'migrated' | 'unmapped'>('all');

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['domain-migration-log', filter],
    queryFn: async () => {
      let query = supabase
        .from('program_domain_migration_log')
        .select('*')
        .order('created_at', { ascending: false });

      if (filter === 'needs-review') {
        query = query.eq('needs_review', true);
      } else if (filter === 'migrated') {
        query = query.not('new_domain_id', 'is', null);
      } else if (filter === 'unmapped') {
        query = query.is('new_domain_id', null);
      }

      const { data, error } = await query.limit(200);
      if (error) throw error;
      return (data || []) as MigrationLogEntry[];
    },
  });

  const filtered = logs.filter(l =>
    !search ||
    (l.old_domain_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (l.new_domain_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (l.program_name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search migration log..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Tabs value={filter} onValueChange={v => setFilter(v as any)}>
          <TabsList className="h-9">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="needs-review" className="text-xs">Needs Review</TabsTrigger>
            <TabsTrigger value="migrated" className="text-xs">Migrated</TabsTrigger>
            <TabsTrigger value="unmapped" className="text-xs">Unmapped</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading migration log...</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {logs.length === 0 ? 'No migration records yet. Programs will appear here when domains are migrated.' : 'No matching records.'}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2">
          {filtered.map(log => (
            <Card key={log.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {log.needs_review ? (
                        <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      ) : log.new_domain_name ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                      ) : (
                        <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      )}
                      <span className="text-sm font-medium truncate">{log.program_name || log.program_id}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                      {log.old_domain_name && (
                        <>
                          <span>Old: <span className="text-foreground">{log.old_domain_name}</span></span>
                          <span>→</span>
                        </>
                      )}
                      <span>New: <span className="text-foreground">{log.new_domain_name || 'Unmapped'}</span></span>
                      {log.new_subdomain_name && (
                        <Badge variant="secondary" className="text-[10px]">{log.new_subdomain_name}</Badge>
                      )}
                    </div>
                    {log.tags_added && log.tags_added.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {log.tags_added.map((tag, i) => (
                          <Badge key={i} variant="outline" className="text-[10px]">{tag}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge
                      variant={log.confidence === 'high' ? 'default' : log.confidence === 'auto' ? 'secondary' : 'outline'}
                      className="text-[10px]"
                    >
                      {log.confidence}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(log.created_at).toLocaleDateString()}
                    </span>
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
