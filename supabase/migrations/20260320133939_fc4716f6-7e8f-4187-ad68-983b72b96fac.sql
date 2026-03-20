-- Behavior Intervention Library (antecedent/reactive/teaching strategies per behavior)
CREATE TABLE IF NOT EXISTS public.behavior_intervention_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  behavior_key text NOT NULL,
  intervention_type text NOT NULL,
  strategy text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bil_behavior_key ON public.behavior_intervention_library(behavior_key);

-- Behavior Goals Library (BIP/IEP-ready measurable objectives)
CREATE TABLE IF NOT EXISTS public.behavior_goals_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  behavior_key text NOT NULL,
  goal_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Behavior Replacement Library
CREATE TABLE IF NOT EXISTS public.behavior_replacement_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  behavior_key text NOT NULL,
  replacement_behavior text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Behavior Benchmark Steps (scaffolded skill progression)
CREATE TABLE IF NOT EXISTS public.behavior_benchmark_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  behavior_key text NOT NULL,
  step_number int NOT NULL,
  benchmark_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bbs_behavior_key ON public.behavior_benchmark_steps(behavior_key);

-- Universal Behavior Strategies (reusable across all behaviors)
CREATE TABLE IF NOT EXISTS public.universal_behavior_strategies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_type text NOT NULL,
  strategy text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.behavior_intervention_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.behavior_goals_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.behavior_replacement_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.behavior_benchmark_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.universal_behavior_strategies ENABLE ROW LEVEL SECURITY;

-- Read policies
CREATE POLICY "read_behavior_intervention_library" ON public.behavior_intervention_library FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_behavior_goals_library" ON public.behavior_goals_library FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_behavior_replacement_library" ON public.behavior_replacement_library FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_behavior_benchmark_steps" ON public.behavior_benchmark_steps FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_universal_behavior_strategies" ON public.universal_behavior_strategies FOR SELECT TO authenticated USING (true);