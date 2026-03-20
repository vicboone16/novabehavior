import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ClinicalFramework {
  id: string;
  key: string;
  title: string;
  framework_type: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface UnifiedSubdomain {
  id: string;
  domain_id: string;
  key: string;
  title: string;
  description: string | null;
  sort_order: number;
}

export interface UnifiedDomain {
  id: string;
  key: string;
  title: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  subdomains: UnifiedSubdomain[];
}

export interface GoalFrameworkLink {
  id: string;
  goal_id: string;
  framework_id: string;
  framework_domain: string | null;
  framework_subdomain: string | null;
  framework_item_code: string | null;
  framework_item_title: string | null;
  alignment_type: string;
  notes: string | null;
  framework?: ClinicalFramework;
}

export function useUnifiedClinicalDomains() {
  return useQuery({
    queryKey: ['unified-clinical-domains'],
    queryFn: async () => {
      const [{ data: domains }, { data: subdomains }] = await Promise.all([
        supabase.from('unified_clinical_domains').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('unified_clinical_subdomains').select('*').order('sort_order'),
      ]);

      const subMap = new Map<string, UnifiedSubdomain[]>();
      (subdomains || []).forEach((s: any) => {
        const list = subMap.get(s.domain_id) || [];
        list.push(s);
        subMap.set(s.domain_id, list);
      });

      return (domains || []).map((d: any) => ({
        ...d,
        subdomains: subMap.get(d.id) || [],
      })) as UnifiedDomain[];
    },
  });
}

export function useClinicalFrameworks() {
  return useQuery({
    queryKey: ['clinical-frameworks'],
    queryFn: async () => {
      const { data } = await supabase
        .from('clinical_frameworks')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      return (data || []) as ClinicalFramework[];
    },
  });
}

export function useGoalFrameworkLinks(goalIds: string[]) {
  return useQuery({
    queryKey: ['goal-framework-links', goalIds],
    enabled: goalIds.length > 0,
    queryFn: async () => {
      const { data: links } = await supabase
        .from('unified_goal_framework_links')
        .select('*')
        .in('goal_id', goalIds);

      if (!links || links.length === 0) return [];

      const fwIds = [...new Set((links as any[]).map(l => l.framework_id))];
      const { data: frameworks } = await supabase
        .from('clinical_frameworks')
        .select('*')
        .in('id', fwIds);

      const fwMap = new Map<string, ClinicalFramework>();
      (frameworks || []).forEach((f: any) => fwMap.set(f.id, f));

      return (links as any[]).map(l => ({
        ...l,
        framework: fwMap.get(l.framework_id),
      })) as GoalFrameworkLink[];
    },
  });
}
