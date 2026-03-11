import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission, type PermissionContext } from '@/lib/permissions';
import { useFeaturePermissions } from '@/hooks/useFeaturePermissions';
import { useClinicalIntelligenceAccess } from '@/hooks/useClinicalIntelligence';
import { useAdvancedDesignAccess } from '@/hooks/useAdvancedDesignAccess';

export interface NavItem {
  id: string;
  nav_key: string;
  parent_key: string | null;
  label: string;
  icon: string | null;
  route: string | null;
  level: number;
  sort_order: number;
  is_visible: boolean;
  required_permission: string | null;
  required_role: string | null;
  feature_flag: string | null;
  badge_source: string | null;
  children?: NavItem[];
}

async function fetchNavigation(): Promise<NavItem[]> {
  const { data, error } = await supabase
    .from('app_navigation_structure')
    .select('*')
    .eq('is_visible', true)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching navigation:', error);
    return [];
  }
  return (data || []) as unknown as NavItem[];
}

/**
 * Build a tree of NavItems where children are nested under their parent.
 */
function buildTree(items: NavItem[]): NavItem[] {
  const map = new Map<string, NavItem>();
  const roots: NavItem[] = [];

  for (const item of items) {
    map.set(item.nav_key, { ...item, children: [] });
  }

  for (const item of items) {
    const node = map.get(item.nav_key)!;
    if (item.parent_key && map.has(item.parent_key)) {
      map.get(item.parent_key)!.children!.push(node);
    } else if (!item.parent_key) {
      roots.push(node);
    }
  }

  return roots;
}

export function useAppNavigation() {
  const { userRole, user } = useAuth();
  const featurePerms = useFeaturePermissions();
  const { hasCIDAccess } = useClinicalIntelligenceAccess();
  const { hasAccess: hasAdvancedDesignAccess } = useAdvancedDesignAccess();

  const permContext: PermissionContext = {
    userRole: userRole as any,
    userId: user?.id || null,
  };

  const { data: allItems = [], isLoading } = useQuery({
    queryKey: ['app-navigation'],
    queryFn: fetchNavigation,
    staleTime: 5 * 60 * 1000, // 5 min cache
  });

  // Feature flag resolver
  const checkFeatureFlag = (flag: string | null): boolean => {
    if (!flag) return true;
    switch (flag) {
      case 'teacher_mode_access':
        return !!featurePerms.teacher_mode_access;
      case 'cid_access':
        return hasCIDAccess;
      case 'advanced_design_access':
        return hasAdvancedDesignAccess;
      default:
        return true;
    }
  };

  // Filter items by permission/role/feature flag
  const filteredItems = allItems.filter(item => {
    if (!item.is_visible) return false;

    // Permission check
    if (item.required_permission) {
      if (!hasPermission(permContext, item.required_permission as any)) return false;
    }

    // Role check
    if (item.required_role) {
      if (userRole !== item.required_role && userRole !== 'super_admin') return false;
    }

    // Feature flag check
    if (!checkFeatureFlag(item.feature_flag)) return false;

    return true;
  });

  const tree = buildTree(filteredItems);

  // Helpers to get items by level or parent
  const getItemsByLevel = (level: number) =>
    tree.filter(item => item.level === level);

  const getChildrenOf = (parentKey: string) =>
    filteredItems
      .filter(item => item.parent_key === parentKey)
      .sort((a, b) => a.sort_order - b.sort_order);

  // Convenience: primary tab bar (level 0), header buttons (level 1)
  const primaryTabs = getItemsByLevel(0);
  const headerButtons = getItemsByLevel(1);

  return {
    allItems: filteredItems,
    tree,
    primaryTabs,
    headerButtons,
    getChildrenOf,
    getItemsByLevel,
    isLoading,
    permContext,
  };
}
