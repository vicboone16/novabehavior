import { useState, useMemo } from 'react';
import { ArrowLeft, Search, Layers, ChevronRight, BookOpen, FlaskConical, BarChart3, Brain, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  useUnifiedClinicalDomains,
  useClinicalFrameworks,
  useGoalFrameworkLinks,
  type UnifiedDomain,
  type UnifiedSubdomain,
  type ClinicalFramework,
} from '@/hooks/useUnifiedClinicalDomains';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const FRAMEWORK_TYPE_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  curriculum: { label: 'Curriculum', icon: BookOpen, color: 'text-emerald-600' },
  assessment: { label: 'Assessment', icon: FlaskConical, color: 'text-amber-600' },
  adaptive: { label: 'Adaptive', icon: BarChart3, color: 'text-violet-600' },
  rating_scale: { label: 'Rating Scale', icon: Brain, color: 'text-rose-600' },
};

interface Props {
  onBack: () => void;
}

export function UnifiedDomainsBrowser({ onBack }: Props) {
  const { data: domains = [], isLoading: domainsLoading } = useUnifiedClinicalDomains();
  const { data: frameworks = [] } = useClinicalFrameworks();
  const [search, setSearch] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<UnifiedDomain | null>(null);
  const [frameworkFilter, setFrameworkFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Fetch goal counts per domain via framework links
  const { data: linkCounts = {} } = useQuery({
    queryKey: ['unified-domain-link-counts'],
    queryFn: async () => {
      const { data } = await supabase
        .from('unified_goal_framework_links')
        .select('framework_domain');
      const counts: Record<string, number> = {};
      (data || []).forEach((l: any) => {
        if (l.framework_domain) {
          counts[l.framework_domain] = (counts[l.framework_domain] || 0) + 1;
        }
      });
      return counts;
    },
  });

  const filteredDomains = useMemo(() => {
    if (!search) return domains;
    const q = search.toLowerCase();
    return domains.filter(d =>
      d.title.toLowerCase().includes(q) ||
      d.description?.toLowerCase().includes(q) ||
      d.subdomains.some(s => s.title.toLowerCase().includes(q))
    );
  }, [domains, search]);

  if (domainsLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (selectedDomain) {
    return (
      <DomainDetail
        domain={selectedDomain}
        frameworks={frameworks}
        frameworkFilter={frameworkFilter}
        typeFilter={typeFilter}
        onBack={() => setSelectedDomain(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Layers className="w-5 h-5 text-primary" />
        <div>
          <h2 className="text-base font-semibold">Unified Clinical Domains</h2>
          <p className="text-xs text-muted-foreground">
            Cross-framework clinical domain alignment — {frameworks.length} frameworks, {domains.length} domains
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search domains..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Framework type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="curriculum">Curriculum</SelectItem>
            <SelectItem value="assessment">Assessment</SelectItem>
            <SelectItem value="adaptive">Adaptive</SelectItem>
            <SelectItem value="rating_scale">Rating Scale</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Framework chips */}
      <div className="flex flex-wrap gap-1.5">
        {frameworks.map(fw => {
          const meta = FRAMEWORK_TYPE_META[fw.framework_type] || FRAMEWORK_TYPE_META.curriculum;
          return (
            <Badge
              key={fw.id}
              variant={frameworkFilter === fw.key ? 'default' : 'outline'}
              className="text-[10px] cursor-pointer"
              onClick={() => setFrameworkFilter(frameworkFilter === fw.key ? 'all' : fw.key)}
            >
              {fw.title}
              <span className={`ml-1 ${meta.color}`}>·</span>
              <span className="text-muted-foreground ml-0.5">{meta.label}</span>
            </Badge>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filteredDomains.map(domain => {
          const totalLinks = Object.entries(linkCounts)
            .filter(([k]) => k.toLowerCase().includes(domain.title.toLowerCase().split(' ')[0]))
            .reduce((s, [, v]) => s + v, 0);

          return (
            <Card
              key={domain.id}
              className="cursor-pointer hover:shadow-md hover:border-primary/40 transition-all group"
              onClick={() => setSelectedDomain(domain)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Layers className="w-5 h-5 text-primary" />
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <h3 className="font-semibold text-sm mb-1">{domain.title}</h3>
                {domain.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{domain.description}</p>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-[10px]">{domain.subdomains.length} subdomains</Badge>
                  {totalLinks > 0 && (
                    <Badge variant="secondary" className="text-[10px]">{totalLinks} linked goals</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* ── Domain Detail ──────────────────────────────────────────────────── */

function DomainDetail({
  domain,
  frameworks,
  frameworkFilter,
  typeFilter,
  onBack,
}: {
  domain: UnifiedDomain;
  frameworks: ClinicalFramework[];
  frameworkFilter: string;
  typeFilter: string;
  onBack: () => void;
}) {
  const [selectedSubdomain, setSelectedSubdomain] = useState<UnifiedSubdomain | null>(null);

  // Fetch goals linked to this domain's frameworks
  const { data: linkedGoals = [], isLoading } = useQuery({
    queryKey: ['domain-goals', domain.id, frameworkFilter, typeFilter],
    queryFn: async () => {
      let query = supabase
        .from('unified_goal_framework_links')
        .select('*, clinical_curricula_goals!inner(id, title, goal_code, clinical_goal, is_active), clinical_frameworks!inner(id, key, title, framework_type)');

      // Filter by frameworks relevant to this domain
      if (frameworkFilter !== 'all') {
        query = query.eq('clinical_frameworks.key', frameworkFilter);
      }
      if (typeFilter !== 'all') {
        query = query.eq('clinical_frameworks.framework_type', typeFilter);
      }

      const { data } = await query;
      return (data || []) as any[];
    },
  });

  // Group goals by alignment_type
  const grouped = useMemo(() => {
    const groups: Record<string, any[]> = {
      direct: [],
      related: [],
      supporting: [],
      assessment_only: [],
    };
    linkedGoals.forEach(link => {
      const type = link.alignment_type || 'direct';
      if (!groups[type]) groups[type] = [];
      groups[type].push(link);
    });
    return groups;
  }, [linkedGoals]);

  const alignmentLabels: Record<string, string> = {
    direct: 'Direct Curriculum Alignment',
    related: 'Related Skills',
    supporting: 'Supporting Framework Items',
    assessment_only: 'Assessment Alignment Only',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h2 className="text-base font-semibold">{domain.title}</h2>
          <p className="text-xs text-muted-foreground">{domain.description}</p>
        </div>
      </div>

      {/* Subdomains */}
      {domain.subdomains.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <Badge
            variant={!selectedSubdomain ? 'default' : 'outline'}
            className="text-[10px] cursor-pointer"
            onClick={() => setSelectedSubdomain(null)}
          >
            All
          </Badge>
          {domain.subdomains.map(sd => (
            <Badge
              key={sd.id}
              variant={selectedSubdomain?.id === sd.id ? 'default' : 'outline'}
              className="text-[10px] cursor-pointer"
              onClick={() => setSelectedSubdomain(selectedSubdomain?.id === sd.id ? null : sd)}
            >
              {sd.title}
            </Badge>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : linkedGoals.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Layers className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
            <h3 className="font-medium text-muted-foreground">No linked goals yet</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Framework alignment links will appear here as they are added.
            </p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped)
          .filter(([, items]) => items.length > 0)
          .map(([type, items]) => (
            <div key={type} className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">{alignmentLabels[type] || type}</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {items.map((link: any) => {
                  const goal = link.clinical_curricula_goals;
                  const fw = link.clinical_frameworks;
                  const meta = FRAMEWORK_TYPE_META[fw?.framework_type] || FRAMEWORK_TYPE_META.curriculum;
                  const Icon = meta.icon;

                  return (
                    <Card key={link.id} className="hover:bg-muted/50 transition-colors">
                      <CardContent className="p-3">
                        <div className="flex items-start gap-2">
                          <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${meta.color}`} />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{goal?.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{goal?.clinical_goal}</p>
                            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                              <Badge variant="secondary" className="text-[9px]">{fw?.title}</Badge>
                              {link.framework_domain && (
                                <Badge variant="outline" className="text-[9px]">{link.framework_domain}</Badge>
                              )}
                              <Badge variant="outline" className="text-[9px]">{goal?.goal_code}</Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))
      )}
    </div>
  );
}
