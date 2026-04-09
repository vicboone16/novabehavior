
-- ============================================================
-- Fix: behavior duplication, graph data, and merge improvements
-- ============================================================

-- 1. Drop old version of merge function to avoid signature conflicts
DROP FUNCTION IF EXISTS public.merge_student_behavior(uuid, uuid, uuid, uuid);

-- 2. Improved merge_student_behavior
--    Handles behaviors that exist only in behavior_session_data (no student_behavior_map entry).
--    Returns rows moved and resolved names for UI feedback.
CREATE OR REPLACE FUNCTION public.merge_student_behavior(
  p_student_id        uuid,
  p_source_behavior_id uuid,
  p_target_behavior_id uuid,
  p_performed_by      uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_bsd_count   int := 0;
  v_sd_count    int := 0;
  v_source_name text;
  v_target_name text;
BEGIN
  IF p_source_behavior_id = p_target_behavior_id THEN
    RAISE EXCEPTION 'Cannot merge a behavior into itself';
  END IF;

  -- Resolve source name: try student_behavior_map → behaviors table → UUID fallback
  SELECT COALESCE(b.name, sbm.behavior_subtype, p_source_behavior_id::text)
    INTO v_source_name
    FROM student_behavior_map sbm
    LEFT JOIN behaviors b ON b.id = sbm.behavior_entry_id
   WHERE sbm.student_id = p_student_id
     AND sbm.behavior_entry_id = p_source_behavior_id
   LIMIT 1;

  IF v_source_name IS NULL THEN
    SELECT COALESCE(name, p_source_behavior_id::text) INTO v_source_name
      FROM behaviors WHERE id = p_source_behavior_id LIMIT 1;
  END IF;
  IF v_source_name IS NULL THEN
    v_source_name := p_source_behavior_id::text;
  END IF;

  -- Resolve target name: try student_behavior_map → behaviors table → UUID fallback
  SELECT COALESCE(b.name, sbm.behavior_subtype, p_target_behavior_id::text)
    INTO v_target_name
    FROM student_behavior_map sbm
    LEFT JOIN behaviors b ON b.id = sbm.behavior_entry_id
   WHERE sbm.student_id = p_student_id
     AND sbm.behavior_entry_id = p_target_behavior_id
   LIMIT 1;

  IF v_target_name IS NULL THEN
    SELECT COALESCE(name, p_target_behavior_id::text) INTO v_target_name
      FROM behaviors WHERE id = p_target_behavior_id LIMIT 1;
  END IF;
  IF v_target_name IS NULL THEN
    v_target_name := p_target_behavior_id::text;
  END IF;

  -- Step 1: Repoint behavior_session_data rows to target
  UPDATE behavior_session_data
     SET behavior_id = p_target_behavior_id,
         updated_at  = now()
   WHERE student_id  = p_student_id
     AND behavior_id = p_source_behavior_id;
  GET DIAGNOSTICS v_bsd_count = ROW_COUNT;

  -- Step 2: Repoint raw session_data events (text column)
  UPDATE session_data
     SET behavior_id = p_target_behavior_id::text
   WHERE student_id  = p_student_id
     AND behavior_id = p_source_behavior_id::text;
  GET DIAGNOSTICS v_sd_count = ROW_COUNT;

  -- Step 3: Deactivate the source mapping (no-op if source had no student_behavior_map entry)
  UPDATE student_behavior_map
     SET active     = false,
         notes      = COALESCE(notes, '') || ' [Merged into ' || v_target_name || ' on ' || now()::date::text || ']',
         updated_at = now()
   WHERE student_id       = p_student_id
     AND behavior_entry_id = p_source_behavior_id;

  -- Step 4: Collapse any duplicate behavior_session_data rows that now exist for the same
  --         session + target behavior (can happen after merging two behaviors recorded in the same session).
  --         Keep the row with the highest frequency; delete extras.
  DELETE FROM behavior_session_data
   WHERE id IN (
     SELECT id FROM (
       SELECT id,
              ROW_NUMBER() OVER (
                PARTITION BY session_id, behavior_id
                ORDER BY COALESCE(frequency, 0) DESC, created_at
              ) AS rn
         FROM behavior_session_data
        WHERE student_id  = p_student_id
          AND behavior_id = p_target_behavior_id
     ) ranked
      WHERE rn > 1
   );

  RETURN jsonb_build_object(
    'success',      true,
    'source_name',  v_source_name,
    'target_name',  v_target_name,
    'bsd_moved',    v_bsd_count,
    'sd_moved',     v_sd_count
  );
END;
$$;

-- 3. Helper: deduplicate behavior_session_data for a student
--    Collapses rows that share (student_id, session_id, behavior_id) by keeping the one
--    with the highest frequency (or the earliest-created if tied).
--    Returns number of duplicate rows removed.
CREATE OR REPLACE FUNCTION public.deduplicate_behavior_session_data(
  p_student_id uuid
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_deleted int := 0;
BEGIN
  DELETE FROM behavior_session_data
   WHERE id IN (
     SELECT id FROM (
       SELECT id,
              ROW_NUMBER() OVER (
                PARTITION BY session_id, behavior_id
                ORDER BY COALESCE(frequency, 0) DESC, created_at
              ) AS rn
         FROM behavior_session_data
        WHERE student_id = p_student_id
          AND session_id IS NOT NULL
     ) ranked
      WHERE rn > 1
   );

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- 4. Helper: find candidate duplicate behaviors for a student
--    Returns groups of behavior_ids that resolve to the same normalized name.
--    Useful for the frontend to auto-suggest merges.
CREATE OR REPLACE FUNCTION public.find_duplicate_student_behaviors(
  p_student_id uuid
)
RETURNS TABLE(
  normalized_name text,
  behavior_ids    uuid[],
  behavior_names  text[],
  total_events    int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH behavior_names AS (
    -- Collect all behavior_ids for this student with resolved names
    SELECT DISTINCT
      bsd.behavior_id,
      COALESCE(b.name, sbm.behavior_subtype, bsd.behavior_id::text) AS resolved_name,
      COUNT(*)::int AS event_count
    FROM behavior_session_data bsd
    LEFT JOIN student_behavior_map sbm
           ON sbm.student_id = p_student_id
          AND sbm.behavior_entry_id = bsd.behavior_id
          AND sbm.active = true
    LEFT JOIN behaviors b ON b.id = bsd.behavior_id
    WHERE bsd.student_id = p_student_id
      AND bsd.data_state <> 'no_data'
    GROUP BY bsd.behavior_id, b.name, sbm.behavior_subtype
  ),
  normalized AS (
    SELECT
      behavior_id,
      resolved_name,
      event_count,
      -- Normalize: lowercase, remove non-alphanumeric chars
      LOWER(REGEXP_REPLACE(resolved_name, '[^a-zA-Z0-9]', '', 'g')) AS norm_name
    FROM behavior_names
    WHERE resolved_name !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  ),
  grouped AS (
    SELECT
      norm_name,
      ARRAY_AGG(behavior_id ORDER BY event_count DESC) AS behavior_ids,
      ARRAY_AGG(resolved_name ORDER BY event_count DESC) AS behavior_names,
      SUM(event_count)::int AS total_events
    FROM normalized
    GROUP BY norm_name
    HAVING COUNT(*) >= 2
  )
  SELECT * FROM grouped ORDER BY total_events DESC;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.merge_student_behavior(uuid, uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.deduplicate_behavior_session_data(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_duplicate_student_behaviors(uuid) TO authenticated;
