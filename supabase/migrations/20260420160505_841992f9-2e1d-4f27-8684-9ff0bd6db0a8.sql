
-- 1. Fix the backfill: derive service_date from the behavior_session_data row's own created_at
--    (falling back to the session's start_time only when BSD created_at is missing). This prevents
--    data from landing on the "merge day" when the underlying session row has a stamped-today
--    start_time.
CREATE OR REPLACE FUNCTION public.fn_backfill_behavior_daily_aggregates(p_student_id uuid DEFAULT NULL::uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  rows_inserted integer := 0;
BEGIN
  INSERT INTO behavior_daily_aggregates (
    student_id, behavior_id, behavior_name, service_date,
    total_count, total_duration_seconds, session_count,
    rate_per_hour, setting_breakdown, staff_breakdown, time_of_day_breakdown
  )
  SELECT
    bsd.student_id,
    bsd.behavior_id::text,
    COALESCE(b.name, 'Unknown'),
    -- Prefer the BSD row's own creation date (this is when the data was actually collected),
    -- fall back to the session start_time for legacy rows without a BSD timestamp.
    COALESCE(
      (bsd.created_at AT TIME ZONE 'America/New_York')::date,
      (s.start_time AT TIME ZONE 'America/New_York')::date
    ) AS service_date,
    SUM(COALESCE(bsd.frequency, 0)) AS total_count,
    SUM(COALESCE(bsd.duration_seconds, 0)) AS total_duration_seconds,
    COUNT(DISTINCT bsd.session_id) AS session_count,
    CASE WHEN SUM(COALESCE(bsd.observation_minutes, 0)) > 0
      THEN ROUND(SUM(COALESCE(bsd.frequency, 0))::numeric / (SUM(COALESCE(bsd.observation_minutes, 0)) / 60.0), 2)
      ELSE NULL
    END AS rate_per_hour,
    '{}'::jsonb AS setting_breakdown,
    '{}'::jsonb AS staff_breakdown,
    '{}'::jsonb AS time_of_day_breakdown
  FROM behavior_session_data bsd
  LEFT JOIN sessions s ON s.id = bsd.session_id
  LEFT JOIN behaviors b ON b.id = bsd.behavior_id
  WHERE bsd.data_state = 'measured'
    AND (p_student_id IS NULL OR bsd.student_id = p_student_id)
  GROUP BY
    bsd.student_id,
    bsd.behavior_id,
    b.name,
    COALESCE(
      (bsd.created_at AT TIME ZONE 'America/New_York')::date,
      (s.start_time AT TIME ZONE 'America/New_York')::date
    )
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS rows_inserted = ROW_COUNT;
  RETURN rows_inserted;
END;
$function$;

-- 2. Add a destructive rebuild for a single student. Wipes that student's aggregate rows and
--    regenerates them from BSD with the corrected date logic. Use this to repair students whose
--    rollups were written with the wrong service_date.
CREATE OR REPLACE FUNCTION public.fn_rebuild_student_behavior_daily_aggregates(p_student_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_deleted int := 0;
  v_inserted int := 0;
BEGIN
  IF p_student_id IS NULL THEN
    RAISE EXCEPTION 'student_id required';
  END IF;

  DELETE FROM behavior_daily_aggregates WHERE student_id = p_student_id;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  INSERT INTO behavior_daily_aggregates (
    student_id, behavior_id, behavior_name, service_date,
    total_count, total_duration_seconds, session_count,
    rate_per_hour, setting_breakdown, staff_breakdown, time_of_day_breakdown
  )
  SELECT
    bsd.student_id,
    bsd.behavior_id::text,
    COALESCE(b.name, 'Unknown'),
    COALESCE(
      (bsd.created_at AT TIME ZONE 'America/New_York')::date,
      (s.start_time AT TIME ZONE 'America/New_York')::date
    ) AS service_date,
    SUM(COALESCE(bsd.frequency, 0)) AS total_count,
    SUM(COALESCE(bsd.duration_seconds, 0)) AS total_duration_seconds,
    COUNT(DISTINCT bsd.session_id) AS session_count,
    CASE WHEN SUM(COALESCE(bsd.observation_minutes, 0)) > 0
      THEN ROUND(SUM(COALESCE(bsd.frequency, 0))::numeric / (SUM(COALESCE(bsd.observation_minutes, 0)) / 60.0), 2)
      ELSE NULL
    END AS rate_per_hour,
    '{}'::jsonb,
    '{}'::jsonb,
    '{}'::jsonb
  FROM behavior_session_data bsd
  LEFT JOIN sessions s ON s.id = bsd.session_id
  LEFT JOIN behaviors b ON b.id = bsd.behavior_id
  WHERE bsd.data_state = 'measured'
    AND bsd.student_id = p_student_id
  GROUP BY
    bsd.student_id, bsd.behavior_id, b.name,
    COALESCE(
      (bsd.created_at AT TIME ZONE 'America/New_York')::date,
      (s.start_time AT TIME ZONE 'America/New_York')::date
    );
  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  RETURN jsonb_build_object(
    'student_id', p_student_id,
    'rows_deleted', v_deleted,
    'rows_inserted', v_inserted
  );
END;
$function$;

-- 3. Upgrade merge_student_behavior_v2 to ALSO migrate aggregates. On collision (same
--    student_id/service_date/target_behavior_id) totals are summed (sum-and-delete strategy),
--    preserving original dates and the target's canonical name.
CREATE OR REPLACE FUNCTION public.merge_student_behavior_v2(
  p_student_id uuid,
  p_source_behavior_id uuid,
  p_target_behavior_id uuid,
  p_mode text DEFAULT 'delete'::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_bsd_count int := 0;
  v_sd_count int := 0;
  v_agg_moved int := 0;
  v_agg_merged int := 0;
  v_target_name text;
BEGIN
  IF p_source_behavior_id = p_target_behavior_id THEN
    RAISE EXCEPTION 'Cannot merge a behavior into itself';
  END IF;

  SELECT COALESCE(b.name, sbm.behavior_subtype, p_target_behavior_id::text)
    INTO v_target_name
    FROM student_behavior_map sbm
    LEFT JOIN behaviors b ON b.id = sbm.behavior_entry_id
   WHERE sbm.student_id = p_student_id
     AND sbm.behavior_entry_id = p_target_behavior_id
   LIMIT 1;

  -- Fallback: look up target name directly from behaviors
  IF v_target_name IS NULL THEN
    SELECT name INTO v_target_name FROM behaviors WHERE id = p_target_behavior_id;
  END IF;

  -- Move BSD rows (preserves created_at / timestamps — only behavior_id changes)
  UPDATE behavior_session_data
     SET behavior_id = p_target_behavior_id, updated_at = now()
   WHERE student_id = p_student_id AND behavior_id = p_source_behavior_id;
  GET DIAGNOSTICS v_bsd_count = ROW_COUNT;

  -- Move session_data (text col)
  UPDATE session_data
     SET behavior_id = p_target_behavior_id::text
   WHERE student_id = p_student_id AND behavior_id = p_source_behavior_id::text;
  GET DIAGNOSTICS v_sd_count = ROW_COUNT;

  -- CRITICAL: migrate daily aggregates (charts read from here).
  -- On collision, sum totals into the target row and delete the source. Otherwise rename the row.
  WITH collisions AS (
    SELECT src.id AS src_id, tgt.id AS tgt_id,
           src.total_count AS src_count,
           src.total_duration_seconds AS src_dur,
           src.session_count AS src_sessions
      FROM behavior_daily_aggregates src
      JOIN behavior_daily_aggregates tgt
        ON tgt.student_id = src.student_id
       AND tgt.service_date = src.service_date
       AND tgt.behavior_id = p_target_behavior_id::text
     WHERE src.student_id = p_student_id
       AND src.behavior_id = p_source_behavior_id::text
  ),
  merged AS (
    UPDATE behavior_daily_aggregates tgt
       SET total_count = tgt.total_count + c.src_count,
           total_duration_seconds = tgt.total_duration_seconds + c.src_dur,
           session_count = tgt.session_count + c.src_sessions,
           updated_at = now()
      FROM collisions c
     WHERE tgt.id = c.tgt_id
     RETURNING tgt.id
  ),
  deleted AS (
    DELETE FROM behavior_daily_aggregates
     WHERE id IN (SELECT src_id FROM collisions)
     RETURNING id
  )
  SELECT COUNT(*) INTO v_agg_merged FROM deleted;

  -- Rename any remaining source aggregate rows to point at the target (no collision).
  UPDATE behavior_daily_aggregates
     SET behavior_id = p_target_behavior_id::text,
         behavior_name = COALESCE(v_target_name, behavior_name),
         updated_at = now()
   WHERE student_id = p_student_id
     AND behavior_id = p_source_behavior_id::text;
  GET DIAGNOSTICS v_agg_moved = ROW_COUNT;

  -- Also refresh behavior_name on target rows so any stale label is cleaned up.
  IF v_target_name IS NOT NULL THEN
    UPDATE behavior_daily_aggregates
       SET behavior_name = v_target_name,
           updated_at = now()
     WHERE student_id = p_student_id
       AND behavior_id = p_target_behavior_id::text
       AND behavior_name IS DISTINCT FROM v_target_name;
  END IF;

  -- Deactivate or archive source
  UPDATE student_behavior_map
     SET active = false,
         archived_at = CASE WHEN p_mode = 'archive' THEN now() ELSE archived_at END,
         archived_reason = CASE WHEN p_mode = 'archive'
            THEN 'Merged into ' || COALESCE(v_target_name, p_target_behavior_id::text)
            ELSE 'merged_deleted' END,
         notes = COALESCE(notes,'') || ' [Merged into ' || COALESCE(v_target_name, p_target_behavior_id::text) || ' on ' || now()::date::text || ']',
         updated_at = now()
   WHERE student_id = p_student_id AND behavior_entry_id = p_source_behavior_id;

  RETURN jsonb_build_object(
    'success', true,
    'target_name', v_target_name,
    'bsd_moved', v_bsd_count,
    'sd_moved', v_sd_count,
    'aggregates_renamed', v_agg_moved,
    'aggregates_merged_on_collision', v_agg_merged,
    'mode', p_mode
  );
END;
$function$;
