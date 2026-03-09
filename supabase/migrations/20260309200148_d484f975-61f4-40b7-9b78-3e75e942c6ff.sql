
ALTER TABLE public.goal_benchmark_criterion_steps
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS is_met boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS met_at timestamptz,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
