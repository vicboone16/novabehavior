
-- ============================================================
-- Nova Parents Integration — Items 2, 3, 4, 5, 6 (RETRY)
-- Fixes beacon_rewards column names: name/cost/active (not title/point_cost/is_active)
-- ============================================================

-- ── user_streaks ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_streaks (
  user_id            uuid PRIMARY KEY,
  current_streak     integer NOT NULL DEFAULT 0,
  longest_streak     integer NOT NULL DEFAULT 0,
  last_activity_date date,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_streaks_self_read ON public.user_streaks;
CREATE POLICY user_streaks_self_read
  ON public.user_streaks FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS user_streaks_self_write ON public.user_streaks;
CREATE POLICY user_streaks_self_write
  ON public.user_streaks FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── coach_engagement_events ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.coach_engagement_events (
  id          uuid PRIMARY KEY,
  user_id     uuid NOT NULL,
  session_id  uuid NOT NULL,
  event_type  text NOT NULL,
  timestamp   timestamptz NOT NULL,
  meta        jsonb NOT NULL DEFAULT '{}'::jsonb,
  received_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cee_user_session ON public.coach_engagement_events (user_id, session_id);
CREATE INDEX IF NOT EXISTS cee_user_ts      ON public.coach_engagement_events (user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS cee_event_type   ON public.coach_engagement_events (event_type);

ALTER TABLE public.coach_engagement_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cee_self_insert ON public.coach_engagement_events;
CREATE POLICY cee_self_insert
  ON public.coach_engagement_events FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS cee_self_read ON public.coach_engagement_events;
CREATE POLICY cee_self_read
  ON public.coach_engagement_events FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS cee_admin_read ON public.coach_engagement_events;
CREATE POLICY cee_admin_read
  ON public.coach_engagement_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role::text IN ('supervisor','agency_admin','super_admin','admin')
    )
  );

-- ── parent_insights RLS ──────────────────────────────────
ALTER TABLE public.parent_insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS parent_insights_parent_select ON public.parent_insights;
CREATE POLICY parent_insights_parent_select
  ON public.parent_insights FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_student_access usa
      WHERE usa.user_id = auth.uid()
        AND usa.student_id = parent_insights.student_id
    )
  );

DROP POLICY IF EXISTS parent_insights_coach_write ON public.parent_insights;
CREATE POLICY parent_insights_coach_write
  ON public.parent_insights FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role::text IN ('coach','supervisor','agency_admin','super_admin','admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role::text IN ('coach','supervisor','agency_admin','super_admin','admin')
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS parent_insights_student_date_uk
  ON public.parent_insights (student_id, insight_date);

-- ── abc_logs RLS (uses client_id) ────────────────────────
ALTER TABLE public.abc_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS abc_logs_owner ON public.abc_logs;
CREATE POLICY abc_logs_owner
  ON public.abc_logs FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS abc_logs_coach_read ON public.abc_logs;
CREATE POLICY abc_logs_coach_read
  ON public.abc_logs FOR SELECT
  USING (
    client_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.user_student_access usa
      WHERE usa.user_id = auth.uid()
        AND usa.student_id = abc_logs.client_id
    )
  );

-- ── agency_feature_flags: parent-app columns ─────────────
ALTER TABLE public.agency_feature_flags
  ADD COLUMN IF NOT EXISTS parent_beacon_rewards_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS parent_behavior_logs_enabled  boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS parent_progress_chart_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS parent_messaging_enabled      boolean NOT NULL DEFAULT false;

-- ── v_beacon_student_available_rewards ───────────────────
-- Aliases beacon_rewards columns to the names the parent app expects.
DROP VIEW IF EXISTS public.v_beacon_student_available_rewards CASCADE;
CREATE VIEW public.v_beacon_student_available_rewards
WITH (security_invoker = true) AS
SELECT
  br.id,
  br.id          AS reward_id,
  br.agency_id,
  s.id           AS student_id,
  br.name        AS title,
  br.description,
  br.cost        AS point_cost,
  br.reward_type AS category,
  br.image_url,
  br.active      AS is_active,
  br.created_at
FROM public.beacon_rewards br
JOIN public.students s
  ON s.agency_id = br.agency_id
WHERE br.active = true
  AND COALESCE(br.is_archived, false) = false
  AND COALESCE(br.is_hidden, false)   = false;

GRANT SELECT ON public.v_beacon_student_available_rewards TO authenticated, anon;

-- ── recover_streak() atomic RPC ──────────────────────────
CREATE OR REPLACE FUNCTION public.recover_streak(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_streak        public.user_streaks%ROWTYPE;
  v_today         date := CURRENT_DATE;
  v_gap           integer;
  v_total_xp      integer := 0;
  v_restored      integer;
  v_new_longest   integer;
  v_remaining     integer := 50;
  v_row           record;
  v_deduct        integer;
BEGIN
  SELECT * INTO v_streak
  FROM public.user_streaks
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'no_streak_found';
  END IF;

  IF v_streak.current_streak > 0 THEN
    RAISE EXCEPTION 'streak_not_broken';
  END IF;

  v_gap := (v_today - v_streak.last_activity_date);
  IF v_gap IS NULL OR v_gap <> 2 THEN
    RAISE EXCEPTION 'recovery_window_expired';
  END IF;

  SELECT COALESCE(SUM(xp_earned), 0) INTO v_total_xp
  FROM public.academy_module_progress
  WHERE coach_user_id = p_user_id;

  IF v_total_xp < 50 THEN
    RAISE EXCEPTION 'insufficient_xp';
  END IF;

  FOR v_row IN
    SELECT progress_id, xp_earned
    FROM public.academy_module_progress
    WHERE coach_user_id = p_user_id AND xp_earned > 0
    ORDER BY completed_at DESC NULLS LAST
    FOR UPDATE
  LOOP
    EXIT WHEN v_remaining <= 0;
    v_deduct := LEAST(v_remaining, v_row.xp_earned);
    UPDATE public.academy_module_progress
       SET xp_earned = xp_earned - v_deduct
     WHERE progress_id = v_row.progress_id;
    v_remaining := v_remaining - v_deduct;
  END LOOP;

  v_restored    := v_streak.longest_streak;
  v_new_longest := GREATEST(v_streak.longest_streak, v_restored);

  UPDATE public.user_streaks SET
    current_streak     = v_restored,
    longest_streak     = v_new_longest,
    last_activity_date = v_today,
    updated_at         = now()
  WHERE user_id = p_user_id;

  RETURN jsonb_build_object(
    'current_streak',     v_restored,
    'longest_streak',     v_new_longest,
    'last_activity_date', v_today::text,
    'xp_deducted',        50
  );
END;
$$;

REVOKE ALL ON FUNCTION public.recover_streak(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recover_streak(uuid) TO service_role;
