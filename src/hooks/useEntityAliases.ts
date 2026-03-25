import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type AliasEntityType = 
  | 'behavior_domain' | 'behavior' 
  | 'program_domain' | 'program' 
  | 'objective' | 'target';

export type AliasKind = 'former_name' | 'merge_source' | 'common_name' | 'imported_label';

export interface EntityAlias {
  id: string;
  entity_type: AliasEntityType;
  entity_id: string;
  alias_text: string;
  alias_kind: AliasKind;
  created_at: string;
}

export function useEntityAliases(entityType: AliasEntityType, entityId: string | null) {
  const [aliases, setAliases] = useState<EntityAlias[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!entityId) { setAliases([]); return; }
    setLoading(true);

    const { data, error } = await supabase
      .from('entity_aliases')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching aliases:', error);
    } else {
      setAliases((data || []) as EntityAlias[]);
    }
    setLoading(false);
  }, [entityType, entityId]);

  useEffect(() => { fetch(); }, [fetch]);

  const addAlias = useCallback(async (aliasText: string, kind: AliasKind = 'common_name') => {
    if (!entityId) return;
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('entity_aliases')
      .insert({
        entity_type: entityType,
        entity_id: entityId,
        alias_text: aliasText,
        alias_kind: kind,
        created_by: user?.id || null,
      } as any);

    if (error) {
      toast.error(`Failed: ${error.message}`);
      return;
    }
    toast.success('Alias added');
    fetch();
  }, [entityType, entityId, fetch]);

  return { aliases, loading, addAlias, refetch: fetch };
}

/** Search across all aliases for a given entity type */
export function useAliasSearch(entityType: AliasEntityType, searchTerm: string) {
  const [results, setResults] = useState<EntityAlias[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!searchTerm || searchTerm.length < 2) {
      setResults([]);
      return;
    }

    const search = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('entity_aliases')
        .select('*')
        .eq('entity_type', entityType)
        .ilike('alias_text', `%${searchTerm}%`)
        .limit(20);

      if (!error) {
        setResults((data || []) as EntityAlias[]);
      }
      setLoading(false);
    };

    const timeout = setTimeout(search, 300);
    return () => clearTimeout(timeout);
  }, [entityType, searchTerm]);

  return { results, loading };
}
