import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

const profileCache = new Map<string, string>();

export function useProfileNameResolver(userIds: string[]) {
  const [nameMap, setNameMap] = useState<Map<string, string>>(new Map());
  const resolvedRef = useRef(new Set<string>());

  useEffect(() => {
    const toResolve = userIds.filter(id => id && !profileCache.has(id) && !resolvedRef.current.has(id));
    if (toResolve.length === 0) {
      // Use cached
      const map = new Map<string, string>();
      userIds.forEach(id => { if (id && profileCache.has(id)) map.set(id, profileCache.get(id)!); });
      setNameMap(map);
      return;
    }

    toResolve.forEach(id => resolvedRef.current.add(id));

    supabase
      .from('profiles')
      .select('user_id, display_name, first_name, last_name')
      .in('user_id', toResolve)
      .then(({ data }) => {
        (data || []).forEach((p: any) => {
          const name = p.display_name || [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Unknown';
          profileCache.set(p.user_id, name);
        });
        const map = new Map<string, string>();
        userIds.forEach(id => { if (id && profileCache.has(id)) map.set(id, profileCache.get(id)!); });
        setNameMap(map);
      });
  }, [userIds.join(',')]);

  const getName = useCallback((userId: string) => {
    return nameMap.get(userId) || profileCache.get(userId) || null;
  }, [nameMap]);

  return { nameMap, getName };
}

export function useClientNameResolver(clientIds: string[]) {
  const [nameMap, setNameMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    const ids = clientIds.filter(Boolean);
    if (ids.length === 0) return;

    supabase
      .from('students' as any)
      .select('id, first_name, last_name')
      .in('id', ids)
      .then(({ data }) => {
        const map = new Map<string, string>();
        (data || []).forEach((s: any) => {
          map.set(s.id, [s.first_name, s.last_name].filter(Boolean).join(' ') || 'Unknown');
        });
        setNameMap(map);
      });
  }, [clientIds.join(',')]);

  const getName = useCallback((clientId: string) => {
    return nameMap.get(clientId) || null;
  }, [nameMap]);

  return { nameMap, getName };
}
