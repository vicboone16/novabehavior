
CREATE TABLE IF NOT EXISTS public.bx_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_key text NOT NULL,
  tag_label text NOT NULL,
  tag_type text NOT NULL DEFAULT 'general',
  description text,
  is_active boolean DEFAULT true,
  agency_id uuid REFERENCES public.agencies(id),
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_bx_tags_unique ON public.bx_tags(tag_key, COALESCE(agency_id, '00000000-0000-0000-0000-000000000000'::uuid));

CREATE TABLE IF NOT EXISTS public.bx_item_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id uuid NOT NULL REFERENCES public.bx_tags(id) ON DELETE CASCADE,
  item_id uuid NOT NULL,
  item_type text NOT NULL,
  weight numeric DEFAULT 1.0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(tag_id, item_id, item_type)
);

CREATE INDEX IF NOT EXISTS idx_bx_item_tags_item ON public.bx_item_tags(item_id, item_type);
CREATE INDEX IF NOT EXISTS idx_bx_item_tags_tag ON public.bx_item_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_bx_tags_key ON public.bx_tags(tag_key);
CREATE INDEX IF NOT EXISTS idx_bx_tags_type ON public.bx_tags(tag_type);

ALTER TABLE public.bx_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bx_item_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bx_tags_select_auth" ON public.bx_tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "bx_tags_insert_auth" ON public.bx_tags FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "bx_tags_update_auth" ON public.bx_tags FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "bx_tags_delete_auth" ON public.bx_tags FOR DELETE TO authenticated USING (true);

CREATE POLICY "bx_item_tags_select_auth" ON public.bx_item_tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "bx_item_tags_insert_auth" ON public.bx_item_tags FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "bx_item_tags_delete_auth" ON public.bx_item_tags FOR DELETE TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.search_bx_items_by_tags(
  p_tag_keys text[],
  p_item_type text DEFAULT NULL
)
RETURNS TABLE(
  item_id uuid,
  item_type text,
  match_count bigint,
  matched_tags text[]
)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    it.item_id,
    it.item_type,
    count(*) AS match_count,
    array_agg(t.tag_label ORDER BY t.tag_label) AS matched_tags
  FROM public.bx_item_tags it
  JOIN public.bx_tags t ON t.id = it.tag_id
  WHERE t.tag_key = ANY(p_tag_keys)
    AND t.is_active = true
    AND (p_item_type IS NULL OR it.item_type = p_item_type)
  GROUP BY it.item_id, it.item_type
  ORDER BY count(*) DESC, it.item_id;
$$;
