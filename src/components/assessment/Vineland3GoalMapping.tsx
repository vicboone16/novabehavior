import { useState, useEffect, useMemo } from 'react';
import {
  Target, Loader2, BookOpen, AlertTriangle, Users,
  Copy, Check, X, ChevronDown, ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Vineland3Domain, Vineland3DerivedScore } from '@/hooks/useVineland3';

interface Vineland3GoalMappingProps {
  assessmentId: string;
  domains: Vineland3Domain[];
  derivedScores: Vineland3DerivedScore[];
}

interface CrosswalkRule {
  id: string;
  domain_key: string;
  subdomain_key: string | null;
  score_band: string;
  recommendation_type: string;
  recommended_library: string | null;
  recommended_program_area: string | null;
  recommended_tags: string[] | null;
  recommendation_text: string;
  priority_level: number;
}

interface GroupedRecommendations {
  priority_areas: CrosswalkRule[];
  curricula: CrosswalkRule[];
  goal_themes: CrosswalkRule[];
  parent_training: CrosswalkRule[];
  behavior_support: CrosswalkRule[];
}

const BAND_COLORS: Record<string, string> = {
  high_need: 'destructive',
  moderate_need: 'secondary',
  mild_need: 'outline',
  monitor_only: 'outline',
};

const TYPE_ICONS: Record<string, typeof Target> = {
  priority_area: AlertTriangle,
  curriculum: BookOpen,
  goal_theme: Target,
  parent_training: Users,
  behavior_support: AlertTriangle,
};

function getScoreBand(standardScore: number | null, vScale: number | null, level: 'domain' | 'subdomain'): string {
  if (level === 'domain') {
    if (standardScore == null) return 'monitor_only';
    if (standardScore <= 70) return 'high_need';
    if (standardScore <= 85) return 'moderate_need';
    if (standardScore <= 99) return 'mild_need';
    return 'monitor_only';
  }
  // subdomain v-scale
  if (vScale == null) return 'monitor_only';
  if (vScale <= 9) return 'high_need';
  if (vScale <= 12) return 'moderate_need';
  if (vScale <= 14) return 'mild_need';
  return 'monitor_only';
}

export function Vineland3GoalMapping({ assessmentId, domains, derivedScores }: Vineland3GoalMappingProps) {
  const [crosswalkRules, setCrosswalkRules] = useState<CrosswalkRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [expandedTypes, setExpandedTypes] = useState<Record<string, boolean>>({
    priority_areas: true, curricula: true, goal_themes: true,
    parent_training: true, behavior_support: true,
  });

  const domainScores = useMemo(() => derivedScores.filter(d => d.score_level === 'domain'), [derivedScores]);
  const subdomainScores = useMemo(() => derivedScores.filter(d => d.score_level === 'subdomain'), [derivedScores]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('vineland3_goal_crosswalks')
        .select('*')
        .eq('is_active', true)
        .order('priority_level');
      setCrosswalkRules((data || []) as unknown as CrosswalkRule[]);
      setLoading(false);
    })();
  }, []);

  // Match scored domains/subdomains against crosswalk rules
  const matchedRules = useMemo(() => {
    const matched: CrosswalkRule[] = [];
    const seen = new Set<string>();

    for (const ds of domainScores) {
      const band = getScoreBand(ds.standard_score, null, 'domain');
      if (band === 'monitor_only') continue;

      const domainRules = crosswalkRules.filter(r =>
        r.domain_key === ds.domain_key && !r.subdomain_key && r.score_band === band
      );
      for (const r of domainRules) {
        if (!seen.has(r.id)) { seen.add(r.id); matched.push(r); }
      }
    }

    for (const ss of subdomainScores) {
      const band = getScoreBand(null, ss.v_scale_score, 'subdomain');
      if (band === 'monitor_only') continue;

      const subRules = crosswalkRules.filter(r =>
        r.domain_key === ss.domain_key && r.subdomain_key === ss.subdomain_key && r.score_band === band
      );
      for (const r of subRules) {
        if (!seen.has(r.id)) { seen.add(r.id); matched.push(r); }
      }
    }

    return matched.sort((a, b) => a.priority_level - b.priority_level);
  }, [domainScores, subdomainScores, crosswalkRules]);

  const grouped: GroupedRecommendations = useMemo(() => ({
    priority_areas: matchedRules.filter(r => r.recommendation_type === 'priority_area' && !dismissed.has(r.id)),
    curricula: matchedRules.filter(r => r.recommendation_type === 'curriculum' && !dismissed.has(r.id)),
    goal_themes: matchedRules.filter(r => r.recommendation_type === 'goal_theme' && !dismissed.has(r.id)),
    parent_training: matchedRules.filter(r => r.recommendation_type === 'parent_training' && !dismissed.has(r.id)),
    behavior_support: matchedRules.filter(r => r.recommendation_type === 'behavior_support' && !dismissed.has(r.id)),
  }), [matchedRules, dismissed]);

  const dismiss = (id: string) => setDismissed(prev => new Set(prev).add(id));

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (derivedScores.length === 0) {
    return (
      <Card><CardContent className="py-8 text-center">
        <Target className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
        <p className="text-sm font-medium mb-1">Goal Recommendations</p>
        <p className="text-xs text-muted-foreground">Score the assessment first to generate recommendations.</p>
      </CardContent></Card>
    );
  }

  if (matchedRules.length === 0) {
    return (
      <Card><CardContent className="py-8 text-center">
        <Check className="w-10 h-10 mx-auto mb-3 text-primary/30" />
        <p className="text-sm font-medium mb-1">No Priority Recommendations</p>
        <p className="text-xs text-muted-foreground">All domain and subdomain scores fall within adequate or above ranges.</p>
      </CardContent></Card>
    );
  }

  // Score band summary
  const bandSummary = domainScores.map(ds => {
    const dom = domains.find(d => d.domain_key === ds.domain_key);
    return { name: dom?.domain_name || ds.domain_key, band: getScoreBand(ds.standard_score, null, 'domain'), ss: ds.standard_score };
  }).filter(s => s.band !== 'monitor_only');

  const sections: Array<{ key: keyof GroupedRecommendations; label: string; icon: typeof Target }> = [
    { key: 'priority_areas', label: 'Priority Areas', icon: AlertTriangle },
    { key: 'curricula', label: 'Suggested Curriculum Libraries', icon: BookOpen },
    { key: 'goal_themes', label: 'Draft Goal Themes', icon: Target },
    { key: 'parent_training', label: 'Parent Training Priorities', icon: Users },
    { key: 'behavior_support', label: 'Behavior Support Implications', icon: AlertTriangle },
  ];

  return (
    <div className="space-y-4">
      {/* Score Band Overview */}
      {bandSummary.length > 0 && (
        <Card>
          <CardHeader className="py-2 px-4"><CardTitle className="text-sm">Adaptive Profile Summary</CardTitle></CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="flex flex-wrap gap-2">
              {bandSummary.map(s => (
                <Badge key={s.name} variant={BAND_COLORS[s.band] as any} className="text-xs">
                  {s.name}: SS={s.ss} ({s.band.replace(/_/g, ' ')})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendation Sections */}
      {sections.map(({ key, label, icon: Icon }) => {
        const items = grouped[key];
        if (items.length === 0) return null;
        const expanded = expandedTypes[key] ?? true;
        return (
          <Card key={key}>
            <CardHeader className="py-2 px-4">
              <button onClick={() => setExpandedTypes(prev => ({ ...prev, [key]: !prev[key] }))} className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <CardTitle className="text-sm">{label}</CardTitle>
                  <Badge variant="secondary" className="text-[10px]">{items.length}</Badge>
                </div>
                {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </button>
            </CardHeader>
            {expanded && (
              <CardContent className="px-4 pb-3 space-y-2">
                {items.map(rule => (
                  <div key={rule.id} className="p-3 border border-border rounded-md">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={BAND_COLORS[rule.score_band] as any} className="text-[10px]">{rule.score_band.replace(/_/g, ' ')}</Badge>
                          <span className="text-[10px] text-muted-foreground">{rule.domain_key}{rule.subdomain_key ? ` › ${rule.subdomain_key}` : ''}</span>
                        </div>
                        <p className="text-xs text-foreground">{rule.recommendation_text}</p>
                        {rule.recommended_library && (
                          <span className="text-[10px] text-muted-foreground mt-1 inline-block">Library: {rule.recommended_library}</span>
                        )}
                        {rule.recommended_tags?.length ? (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {rule.recommended_tags.map(t => <Badge key={t} variant="outline" className="text-[9px]">{t}</Badge>)}
                          </div>
                        ) : null}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => copyText(rule.recommendation_text)}>
                          <Copy className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => dismiss(rule.id)}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
