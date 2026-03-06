import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface BxTag {
  id: string;
  tag_key: string;
  tag_label: string;
  tag_type: string;
  description?: string;
  is_active: boolean;
  agency_id?: string;
  created_at: string;
}

export interface BxItemTag {
  id: string;
  tag_id: string;
  item_id: string;
  item_type: string;
  weight: number;
  created_at: string;
}

export interface AISearchResult {
  id: string;
  type: string;
  name: string;
  tags: string[];
  description: string;
  relevance_score: number;
  reason: string;
}

export function useBxTags() {
  const [tags, setTags] = useState<BxTag[]>([]);
  const [itemTags, setItemTags] = useState<BxItemTag[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTags = useCallback(async () => {
    setIsLoading(true);
    try {
      const [tagsRes, itemTagsRes] = await Promise.all([
        (supabase.from as any)('bx_tags').select('*').eq('is_active', true).order('tag_label'),
        (supabase.from as any)('bx_item_tags').select('*'),
      ]);
      setTags((tagsRes.data || []) as BxTag[]);
      setItemTags((itemTagsRes.data || []) as BxItemTag[]);
    } catch (err: any) {
      console.error('Failed to load tags:', err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getTagsForItem = useCallback((itemId: string, itemType: string): BxTag[] => {
    const tagIds = itemTags
      .filter(it => it.item_id === itemId && it.item_type === itemType)
      .map(it => it.tag_id);
    return tags.filter(t => tagIds.includes(t.id));
  }, [tags, itemTags]);

  const createTag = useCallback(async (tagLabel: string, tagType: string = 'general', description?: string) => {
    const tagKey = tagLabel.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    const { data, error } = await (supabase.from as any)('bx_tags').insert({
      tag_key: tagKey,
      tag_label: tagLabel,
      tag_type: tagType,
      description,
    }).select().single();
    if (error) {
      // Might be duplicate — try to find existing
      const { data: existing } = await (supabase.from as any)('bx_tags')
        .select('*')
        .eq('tag_key', tagKey)
        .single();
      if (existing) return existing as BxTag;
      toast.error('Failed to create tag: ' + error.message);
      return null;
    }
    await fetchTags();
    return data as BxTag;
  }, [fetchTags]);

  const addTagToItem = useCallback(async (tagId: string, itemId: string, itemType: string) => {
    const { error } = await (supabase.from as any)('bx_item_tags').insert({
      tag_id: tagId,
      item_id: itemId,
      item_type: itemType,
    });
    if (error && !error.message.includes('duplicate')) {
      toast.error('Failed to add tag: ' + error.message);
      return;
    }
    await fetchTags();
  }, [fetchTags]);

  const removeTagFromItem = useCallback(async (tagId: string, itemId: string, itemType: string) => {
    const link = itemTags.find(it => it.tag_id === tagId && it.item_id === itemId && it.item_type === itemType);
    if (!link) return;
    const { error } = await (supabase.from as any)('bx_item_tags').delete().eq('id', link.id);
    if (error) {
      toast.error('Failed to remove tag: ' + error.message);
      return;
    }
    await fetchTags();
  }, [itemTags, fetchTags]);

  const addNewTagToItem = useCallback(async (tagLabel: string, itemId: string, itemType: string, tagType: string = 'general') => {
    const tag = await createTag(tagLabel, tagType);
    if (tag) {
      await addTagToItem(tag.id, itemId, itemType);
    }
  }, [createTag, addTagToItem]);

  // AI Search
  const [searchResults, setSearchResults] = useState<AISearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const aiSearch = useCallback(async (query: string, itemType?: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('bx-ai-search', {
        body: { query, item_type: itemType || null },
      });
      if (error) throw error;
      setSearchResults((data?.results || []) as AISearchResult[]);
    } catch (err: any) {
      console.error('AI search error:', err.message);
      toast.error('Search failed: ' + (err.message || 'Unknown error'));
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  return {
    tags, itemTags, isLoading, fetchTags,
    getTagsForItem, createTag, addTagToItem, removeTagFromItem, addNewTagToItem,
    searchResults, isSearching, aiSearch,
  };
}
