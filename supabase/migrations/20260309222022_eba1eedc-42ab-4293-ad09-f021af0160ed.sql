-- Search text trigger function
CREATE OR REPLACE FUNCTION public.set_clinical_curricula_goal_search_text()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  new.search_text :=
    setweight(to_tsvector('simple', coalesce(new.title,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(new.clinical_goal,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(new.objective_text,'')), 'B') ||
    setweight(to_tsvector('simple', coalesce(array_to_string(new.younger_examples,' '),'')), 'C') ||
    setweight(to_tsvector('simple', coalesce(array_to_string(new.older_examples,' '),'')), 'C') ||
    setweight(to_tsvector('simple', coalesce(array_to_string(new.skill_tags,' '),'')), 'B') ||
    setweight(to_tsvector('simple', coalesce(array_to_string(new.setting_tags,' '),'')), 'C') ||
    setweight(to_tsvector('simple', coalesce(array_to_string(new.age_group_tags,' '),'')), 'C');
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_clinical_curricula_goal_search_text ON public.clinical_curricula_goals;
CREATE TRIGGER trg_set_clinical_curricula_goal_search_text
BEFORE INSERT OR UPDATE ON public.clinical_curricula_goals
FOR EACH ROW
EXECUTE FUNCTION public.set_clinical_curricula_goal_search_text();

-- VB-MAPP view
CREATE OR REPLACE VIEW public.v_curricula_vbmapp AS
SELECT
  c.key AS collection_key,
  c.title AS collection_title,
  d.key AS domain_key,
  d.title AS domain_title,
  g.id AS goal_id,
  g.key AS goal_key,
  g.title AS goal_title,
  g.clinical_goal,
  g.objective_text,
  g.vbmapp_domain,
  g.vbmapp_level,
  g.younger_examples,
  g.older_examples,
  g.age_group_tags,
  g.setting_tags,
  g.skill_tags,
  g.sort_order AS goal_sort_order,
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'order', b.benchmark_order,
        'text', b.benchmark_text
      )
      ORDER BY b.benchmark_order
    )
    FROM public.clinical_curricula_benchmarks b
    WHERE b.goal_id = g.id
  ) AS benchmarks
FROM public.clinical_curricula_collections c
JOIN public.clinical_curricula_domains d ON d.collection_id = c.id
JOIN public.clinical_curricula_goals g ON g.domain_id = d.id
WHERE c.key = 'vbmapp' AND c.is_active = true AND g.is_active = true;

-- Enhanced search function
CREATE OR REPLACE FUNCTION public.search_vbmapp_curricula(
  p_query text DEFAULT NULL,
  p_domain text DEFAULT NULL,
  p_level int DEFAULT NULL,
  p_age_tag text DEFAULT NULL
)
RETURNS TABLE (
  goal_id uuid,
  domain_title text,
  goal_title text,
  clinical_goal text,
  objective_text text,
  vbmapp_level int,
  younger_examples text[],
  older_examples text[],
  age_group_tags text[],
  setting_tags text[],
  skill_tags text[],
  benchmarks jsonb
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    v.goal_id,
    v.domain_title,
    v.goal_title,
    v.clinical_goal,
    v.objective_text,
    v.vbmapp_level,
    v.younger_examples,
    v.older_examples,
    v.age_group_tags,
    v.setting_tags,
    v.skill_tags,
    v.benchmarks
  FROM public.v_curricula_vbmapp v
  JOIN public.clinical_curricula_goals g ON g.id = v.goal_id
  WHERE
    (p_domain IS NULL OR v.domain_title = p_domain)
    AND (p_level IS NULL OR v.vbmapp_level = p_level)
    AND (p_age_tag IS NULL OR p_age_tag = ANY(v.age_group_tags))
    AND (
      p_query IS NULL
      OR g.search_text @@ plainto_tsquery('simple', p_query)
      OR v.goal_title ILIKE '%' || p_query || '%'
      OR coalesce(v.objective_text,'') ILIKE '%' || p_query || '%'
      OR EXISTS (
        SELECT 1
        FROM public.clinical_curricula_benchmarks b
        WHERE b.goal_id = v.goal_id
          AND b.benchmark_text ILIKE '%' || p_query || '%'
      )
    )
  ORDER BY v.domain_title, v.vbmapp_level NULLS FIRST, v.goal_title;
$$;