
-- Intervention Engine: Ranking RPC
CREATE OR REPLACE FUNCTION public.rank_interventions(
  _client_id uuid,
  _limit int DEFAULT 12
)
RETURNS TABLE (
  intervention_id uuid,
  name text,
  score numeric,
  category_bucket text,
  function_match int,
  setting_match int,
  age_match int,
  evidence_rating int,
  complexity_level int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH c AS (
    SELECT client_id, agency_id, age_years, primary_setting, communication_level, diagnosis_cluster
    FROM canon_clients WHERE client_id = _client_id
  ),
  h AS (
    SELECT hypothesis_id, function_primary, function_secondary
    FROM canon_hypotheses
    WHERE client_id = _client_id AND status = 'active'
      AND (end_date IS NULL OR end_date >= current_date)
    ORDER BY effective_date DESC, hypothesis_id DESC
    LIMIT 1
  ),
  cand AS (
    SELECT im.*
    FROM interventions_master im
    WHERE im.active = true
      AND (
        (SELECT function_primary FROM h) IS NULL
        OR im.functions @> ARRAY[(SELECT function_primary FROM h)]
        OR (
          (SELECT function_secondary FROM h) IS NOT NULL
          AND im.functions @> ARRAY[(SELECT function_secondary FROM h)]
        )
      )
  ),
  scored AS (
    SELECT
      c.client_id,
      cand.intervention_id,
      cand.name,
      -- Function match (0..25)
      CASE
        WHEN (SELECT function_primary FROM h) IS NOT NULL AND cand.functions @> ARRAY[(SELECT function_primary FROM h)] THEN 25
        WHEN (SELECT function_secondary FROM h) IS NOT NULL AND cand.functions @> ARRAY[(SELECT function_secondary FROM h)] THEN 15
        ELSE 8
      END AS function_match,
      -- Setting match (0..10)
      CASE
        WHEN cand.setting_tags IS NULL THEN 6
        WHEN cand.setting_tags @> ARRAY[c.primary_setting] THEN 10
        ELSE 3
      END AS setting_match,
      -- Age match (0..10)
      CASE
        WHEN cand.age_min IS NULL AND cand.age_max IS NULL THEN 6
        WHEN c.age_years IS NULL THEN 5
        WHEN (cand.age_min IS NULL OR c.age_years >= cand.age_min)
         AND (cand.age_max IS NULL OR c.age_years <= cand.age_max) THEN 10
        ELSE 2
      END AS age_match,
      -- Comm match (0..5)
      CASE
        WHEN cand.communication_levels IS NULL THEN 3
        WHEN cand.communication_levels @> ARRAY[c.communication_level] THEN 5
        ELSE 1
      END AS comm_match,
      COALESCE(cand.evidence_rating, 3) AS evidence_rating,
      COALESCE(cand.complexity_level, 3) AS complexity_level,
      CASE WHEN cand.contraindications IS NOT NULL AND length(cand.contraindications) > 0 THEN -5 ELSE 0 END AS contra_penalty
    FROM c CROSS JOIN cand
  ),
  final AS (
    SELECT
      s.intervention_id,
      s.name,
      public.ci_intervention_score(
        s.function_match, s.setting_match, s.age_match, s.comm_match,
        s.evidence_rating, s.complexity_level, s.contra_penalty
      ) AS score,
      s.function_match, s.setting_match, s.age_match, s.evidence_rating, s.complexity_level
    FROM scored s
  ),
  tagged AS (
    SELECT f.*, COALESCE(it.tag, 'category:other') AS tag
    FROM final f LEFT JOIN interventions_tags it ON it.intervention_id = f.intervention_id
  ),
  ranked AS (
    SELECT *,
      row_number() OVER (PARTITION BY tag ORDER BY score DESC) AS cat_rank
    FROM tagged
  )
  SELECT
    r.intervention_id, r.name, r.score, r.tag AS category_bucket,
    r.function_match, r.setting_match, r.age_match, r.evidence_rating, r.complexity_level
  FROM ranked r
  WHERE r.cat_rank <= 2
  ORDER BY r.score DESC
  LIMIT _limit;
$$;
