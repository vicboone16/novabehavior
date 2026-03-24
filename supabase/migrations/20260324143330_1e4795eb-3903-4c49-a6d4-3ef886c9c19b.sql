
-- =============================================
-- STEP 2A: ALTER bops_triadic_registry to add missing columns
-- =============================================
ALTER TABLE bops_triadic_registry
  ADD COLUMN IF NOT EXISTS archetype_1 text,
  ADD COLUMN IF NOT EXISTS archetype_2 text,
  ADD COLUMN IF NOT EXISTS archetype_3 text,
  ADD COLUMN IF NOT EXISTS domain_1 text,
  ADD COLUMN IF NOT EXISTS domain_2 text,
  ADD COLUMN IF NOT EXISTS domain_3 text,
  ADD COLUMN IF NOT EXISTS classification_type text NOT NULL DEFAULT 'triadic',
  ADD COLUMN IF NOT EXISTS teacher_summary text,
  ADD COLUMN IF NOT EXISTS clinician_summary text,
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Add unique constraint if not exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bops_triadic_registry_triadic_key_key'
  ) THEN
    ALTER TABLE bops_triadic_registry ADD CONSTRAINT bops_triadic_registry_triadic_key_key UNIQUE (triadic_key);
  END IF;
END $$;

-- =============================================
-- STEP 2B: Add program_type to master program library
-- =============================================
ALTER TABLE bops_master_program_library
  ADD COLUMN IF NOT EXISTS program_type text;

-- =============================================
-- STEP 2C: Triadic lookup view
-- =============================================
CREATE OR REPLACE VIEW v_bops_triadic_registry AS
SELECT
  id,
  triadic_key,
  training_name,
  clinical_name,
  archetype_1,
  archetype_2,
  archetype_3,
  domain_1,
  domain_2,
  domain_3,
  classification_type,
  teacher_summary,
  clinician_summary,
  active,
  created_at,
  updated_at
FROM bops_triadic_registry
WHERE active = true
ORDER BY training_name;

-- =============================================
-- STEP 2F: Resolver function for triadic keys
-- =============================================
CREATE OR REPLACE FUNCTION resolve_bops_triadic_key(
  p_archetype_1 text,
  p_archetype_2 text,
  p_archetype_3 text
)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_sorted text[];
  v_key text;
BEGIN
  v_sorted := ARRAY(
    SELECT unnest(ARRAY[p_archetype_1, p_archetype_2, p_archetype_3])
    ORDER BY 1
  );
  v_key := lower(v_sorted[1] || '_' || v_sorted[2] || '_' || v_sorted[3]);
  RETURN v_key;
END;
$$;

-- =============================================
-- STEP 3: Classroom genome refresh function
-- =============================================
CREATE OR REPLACE FUNCTION refresh_bops_classroom_genome()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO bops_classroom_genome (
    id,
    classroom_id,
    roster_size,
    updated_at
  )
  SELECT
    gen_random_uuid(),
    r.classroom_id::text,
    count(DISTINCT r.student_id)::int,
    now()
  FROM bops_classroom_rosters r
  WHERE r.active = true
    AND r.classroom_id IS NOT NULL
  GROUP BY r.classroom_id
  ON CONFLICT (classroom_id)
  DO UPDATE SET
    roster_size = excluded.roster_size,
    updated_at = now();
END;
$$;

-- =============================================
-- STEP 3E: Classroom genome UI view
-- =============================================
CREATE OR REPLACE VIEW v_bops_classroom_genome AS
SELECT
  id,
  classroom_id,
  roster_size,
  fortress_count,
  ghost_count,
  reactor_count,
  volcano_count,
  sprinter_count,
  negotiator_count,
  challenger_count,
  rule_keeper_count,
  social_explorer_count,
  chameleon_count,
  storm_count,
  avg_threat,
  avg_withdrawal,
  avg_sensory,
  avg_emotion,
  avg_impulse,
  avg_autonomy,
  avg_authority,
  avg_rigidity,
  avg_social,
  avg_context,
  total_contagion,
  cvi,
  cli,
  hni,
  balance_index,
  updated_at
FROM bops_classroom_genome;
