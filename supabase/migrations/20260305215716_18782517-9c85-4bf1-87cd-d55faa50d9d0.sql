
-- Dashboard layout persistence table
CREATE TABLE public.dashboard_layouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  widgets text[] NOT NULL DEFAULT '{}',
  layouts jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.dashboard_layouts ENABLE ROW LEVEL SECURITY;

-- Users can only access their own layout
CREATE POLICY "Users manage own dashboard layout"
  ON public.dashboard_layouts
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
