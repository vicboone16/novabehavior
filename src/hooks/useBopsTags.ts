import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ============ Types ============

export interface BopsTag {
  id: string;
  tag_code: string | null;
  name: string;
  category: string | null;
  description: string | null;
  is_active: boolean;
}

export type TaggableEntityType =
  | 'behavior_domain'
  | 'behavior'
  | 'behavior_profile'
  | 'program_domain'
  | 'program'
  | 'objective'
  | 'target'
  | 'learner_behavior_assignment'
  | 'learner_program_assignment'
  | 'learner_objective_assignment'
  | 'learner_target_assignment';

export interface EntityBopsTag {
  id: string;
  entity_type: TaggableEntityType;
  entity_id: string;
  tag_id: string;
  is_primary: boolean;
  confidence_score: number | null;
  source: 'manual' | 'ai' | 'inferred' | 'imported';
  tag?: BopsTag;
}

// ============ Hook: Available Tags ============

export function useBopsTags() {
  const [tags, setTags] = useState<BopsTag[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('bops_tags')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching BOPS tags:', error);
    } else {
      setTags((data || []) as BopsTag[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { tags, loading, refetch: fetch };
}

// ============ Hook: Entity Tags ============

export function useEntityBopsTags(entityType: TaggableEntityType, entityId: string | null) {
  const [entityTags, setEntityTags] = useState<EntityBopsTag[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!entityId) { setEntityTags([]); return; }
    setLoading(true);

    const { data, error } = await supabase
      .from('entity_bops_tags')
      .select('*, tag:bops_tags(*)')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId);

    if (error) {
      console.error('Error fetching entity tags:', error);
    } else {
      setEntityTags((data || []) as unknown as EntityBopsTag[]);
    }
    setLoading(false);
  }, [entityType, entityId]);

  useEffect(() => { fetch(); }, [fetch]);

  const addTag = useCallback(async (tagId: string, source: EntityBopsTag['source'] = 'manual', isPrimary = false) => {
    if (!entityId) return;
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('entity_bops_tags')
      .insert({
        entity_type: entityType,
        entity_id: entityId,
        tag_id: tagId,
        source,
        is_primary: isPrimary,
        created_by: user?.id || null,
      } as any);

    if (error) {
      if (error.code === '23505') {
        toast.info('Tag already applied');
      } else {
        toast.error(`Failed to add tag: ${error.message}`);
      }
      return;
    }
    toast.success('Tag added');
    fetch();
  }, [entityType, entityId, fetch]);

  const removeTag = useCallback(async (entityBopsTagId: string) => {
    const { error } = await supabase
      .from('entity_bops_tags')
      .delete()
      .eq('id', entityBopsTagId);

    if (error) {
      toast.error(`Failed to remove tag: ${error.message}`);
      return;
    }
    toast.success('Tag removed');
    fetch();
  }, [fetch]);

  return { entityTags, loading, addTag, removeTag, refetch: fetch };
}
