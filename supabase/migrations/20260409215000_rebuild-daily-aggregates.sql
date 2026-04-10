
-- ============================================================
-- Improved daily aggregate rebuild function
-- Used after behavior merges to ensure Avg/Day and trend
-- data is accurate and doesn't contain stale pre-merge UUIDs.
-- ============================================================

CREATE OR REPLACE FUNCTION public.rebuild_behavior_daily_aggregates(
  p_student_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  rows_inserted integer := 0;
BEGIN
  -- Delete all existing aggregate rows for this student so stale
  -- pre-merge behavior_id UUIDs are fully removed.
  DELETE FROM behavior_daily_aggregates WHERE student_id = p_student_id;

  -- Re-insert fresh aggregates using current behavior_session_data.
  -- Includes all non-no_data states (measured + estimated + observed_zero).
  INSERT INTO behavior_daily_aggregates (
    student_id, behavior_id, behavior_name, service_date,
    total_count, total_duration_seconds, session_count,
    rate_per_hour, setting_breakdown, staff_breakdown, time_of_day_breakdown
  )
  SELECT
    bsd.student_id,
    bsd.behavior_id::text,
    COALESCE(b.name, sbm.behavior_subtype, bsd.behavior_id::text),
    COALESCE(
      (s.started_at AT TIME ZONE 'America/New_York')::date,
      (s.start_time AT TIME ZONE 'America/New_York')::date,
      bsd.created_at::date
    ) AS service_date,
    SUM(CASE WHEN bsd.data_state = 'observed_zero' THEN 0 ELSE COALESCE(bsd.frequency, 0) END) AS total_count,
    SUM(COALESCE(bsd.duration_seconds, 0)) AS total_duration_seconds,
    COUNT(DISTINCT bsd.session_id) AS session_count,
    CASE WHEN SUM(COALESCE(bsd.observation_minutes, 0)) > 0
      THEN ROUND(
        SUM(CASE WHEN bsd.data_state = 'observed_zero' THEN 0 ELSE COALESCE(bsd.frequency, 0) END)::numeric
        / (SUM(COALESCE(bsd.observation_minutes, 0)) / 60.0),
        2
      )
      ELSE NULL
    END AS rate_per_hour,
    '{}'::jsonb AS setting_breakdown,
    '{}'::jsonb AS staff_breakdown,
    '{}'::jsonb AS time_of_day_breakdown
  FROM behavior_session_data bsd
  LEFT JOIN sessions s ON s.id = bsd.session_id
  LEFT JOIN behaviors b ON b.id = bsd.behavior_id::uuid
  LEFT JOIN student_behavior_map sbm
         ON sbm.student_id = bsd.student_id
        AND sbm.behavior_entry_id = bsd.behavior_id::uuid
        AND sbm.active = true
  WHERE bsd.data_state <> 'no_data'
    AND bsd.student_id = p_student_id
  GROUP BY
    bsd.student_id,
    bsd.behavior_id,
    COALESCE(b.name, sbm.behavior_subtype, bsd.behavior_id::text),
    COALESCE(
      (s.started_at AT TIME ZONE 'America/New_York')::date,
      (s.start_time AT TIME ZONE 'America/New_York')::date,
      bsd.created_at::date
    );

  GET DIAGNOSTICS rows_inserted = ROW_COUNT;
  RETURN rows_inserted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rebuild_behavior_daily_aggregates(uuid) TO authenticated;

-- Also grant the original backfill function to authenticated so it's callable via RPC
GRANT EXECUTE ON FUNCTION public.fn_backfill_behavior_daily_aggregates(uuid) TO authenticated;
