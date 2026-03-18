-- Beacon Integration: Missing schema for NovaTrack Core

-- 1. Add agency_id to beacon tables that lack it
ALTER TABLE public.beacon_points_ledger ADD COLUMN IF NOT EXISTS agency_id uuid;
ALTER TABLE public.beacon_reward_redemptions ADD COLUMN IF NOT EXISTS agency_id uuid;
ALTER TABLE public.mayday_alerts ADD COLUMN IF NOT EXISTS agency_id uuid;
ALTER TABLE public.staff_presence_status ADD COLUMN IF NOT EXISTS agency_id uuid;

-- 2. Parent Daily Snapshots
CREATE TABLE IF NOT EXISTS public.parent_daily_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  agency_id uuid,
  classroom_id uuid,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  behaviors_today jsonb DEFAULT '[]'::jsonb,
  points_earned integer DEFAULT 0,
  points_redeemed integer DEFAULT 0,
  engagement_pct numeric,
  highlights text,
  concerns text,
  token text,
  token_expires_at timestamptz,
  generated_by uuid,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id, snapshot_date)
);
ALTER TABLE public.parent_daily_snapshots ENABLE ROW LEVEL SECURITY;

-- 3. Schoolwide Word of the Week
CREATE TABLE IF NOT EXISTS public.schoolwide_word_of_week (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_type text NOT NULL DEFAULT 'agency',
  scope_id uuid,
  word text NOT NULL,
  definition text,
  example_usage text,
  week_start date NOT NULL,
  week_end date NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.schoolwide_word_of_week ENABLE ROW LEVEL SECURITY;

-- 4. Classroom Leaderboards
CREATE TABLE IF NOT EXISTS public.classroom_leaderboards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id uuid NOT NULL,
  agency_id uuid,
  leaderboard_date date NOT NULL DEFAULT CURRENT_DATE,
  scope text NOT NULL DEFAULT 'daily',
  rankings jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_points_awarded integer DEFAULT 0,
  total_points_redeemed integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(classroom_id, leaderboard_date, scope)
);
ALTER TABLE public.classroom_leaderboards ENABLE ROW LEVEL SECURITY;

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_beacon_points_ledger_student ON public.beacon_points_ledger(student_id);
CREATE INDEX IF NOT EXISTS idx_beacon_points_ledger_classroom ON public.beacon_points_ledger(classroom_id);
CREATE INDEX IF NOT EXISTS idx_beacon_points_ledger_created ON public.beacon_points_ledger(created_at);
CREATE INDEX IF NOT EXISTS idx_beacon_reward_redemptions_student ON public.beacon_reward_redemptions(student_id);
CREATE INDEX IF NOT EXISTS idx_mayday_alerts_classroom ON public.mayday_alerts(classroom_id);
CREATE INDEX IF NOT EXISTS idx_mayday_alerts_created ON public.mayday_alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_staff_presence_classroom ON public.staff_presence_status(classroom_id);
CREATE INDEX IF NOT EXISTS idx_parent_snapshots_student ON public.parent_daily_snapshots(student_id);
CREATE INDEX IF NOT EXISTS idx_parent_snapshots_date ON public.parent_daily_snapshots(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_classroom_leaderboards_date ON public.classroom_leaderboards(leaderboard_date);

-- 6. RLS policies

ALTER TABLE public.beacon_points_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agency members can view points" ON public.beacon_points_ledger
  FOR SELECT TO authenticated
  USING (
    public.has_student_access(auth.uid(), student_id)
    OR EXISTS (
      SELECT 1 FROM public.agency_memberships am
      WHERE am.user_id = auth.uid() AND am.agency_id = beacon_points_ledger.agency_id AND am.status = 'active'
    )
  );

ALTER TABLE public.beacon_reward_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agency members can view redemptions" ON public.beacon_reward_redemptions
  FOR SELECT TO authenticated
  USING (
    public.has_student_access(auth.uid(), student_id)
    OR EXISTS (
      SELECT 1 FROM public.agency_memberships am
      WHERE am.user_id = auth.uid() AND am.agency_id = beacon_reward_redemptions.agency_id AND am.status = 'active'
    )
  );

ALTER TABLE public.beacon_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view active rewards" ON public.beacon_rewards
  FOR SELECT TO authenticated
  USING (active = true);

ALTER TABLE public.mayday_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agency members can view mayday alerts" ON public.mayday_alerts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.agency_memberships am
      WHERE am.user_id = auth.uid() AND am.agency_id = mayday_alerts.agency_id AND am.status = 'active'
    )
    OR triggered_by = auth.uid()
  );

ALTER TABLE public.staff_presence_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agency members can view staff presence" ON public.staff_presence_status
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.agency_memberships am
      WHERE am.user_id = auth.uid() AND am.agency_id = staff_presence_status.agency_id AND am.status = 'active'
    )
  );

CREATE POLICY "Agency members can view parent snapshots" ON public.parent_daily_snapshots
  FOR SELECT TO authenticated
  USING (
    public.has_student_access(auth.uid(), student_id)
    OR EXISTS (
      SELECT 1 FROM public.agency_memberships am
      WHERE am.user_id = auth.uid() AND am.agency_id = parent_daily_snapshots.agency_id AND am.status = 'active'
    )
  );

CREATE POLICY "Authenticated can view word of week" ON public.schoolwide_word_of_week
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Agency members can view leaderboards" ON public.classroom_leaderboards
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.agency_memberships am
      WHERE am.user_id = auth.uid() AND am.agency_id = classroom_leaderboards.agency_id AND am.status = 'active'
    )
  );

ALTER TABLE public.schoolwide_contingencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view contingencies" ON public.schoolwide_contingencies
  FOR SELECT TO authenticated
  USING (true);