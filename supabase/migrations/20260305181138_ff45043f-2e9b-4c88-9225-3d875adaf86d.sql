
-- Add missing columns to behavior_decision_trees
ALTER TABLE public.behavior_decision_trees ADD COLUMN IF NOT EXISTS trigger_context text;
ALTER TABLE public.behavior_decision_trees ADD COLUMN IF NOT EXISTS function_of_behavior text;
ALTER TABLE public.behavior_decision_trees ADD COLUMN IF NOT EXISTS replacement_behavior text;
ALTER TABLE public.behavior_decision_trees ADD COLUMN IF NOT EXISTS reinforcement_strategy text;
ALTER TABLE public.behavior_decision_trees ADD COLUMN IF NOT EXISTS escalation_protocol text;
ALTER TABLE public.behavior_decision_trees ADD COLUMN IF NOT EXISTS data_to_collect text[];
ALTER TABLE public.behavior_decision_trees ADD COLUMN IF NOT EXISTS audience text DEFAULT 'teacher';
ALTER TABLE public.behavior_decision_trees ADD COLUMN IF NOT EXISTS severity text DEFAULT 'moderate';
ALTER TABLE public.behavior_decision_trees ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.behavior_decision_trees ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Add missing columns to lms_simulations
ALTER TABLE public.lms_simulations ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.lms_simulations ADD COLUMN IF NOT EXISTS difficulty text DEFAULT 'intermediate';
ALTER TABLE public.lms_simulations ADD COLUMN IF NOT EXISTS audience text DEFAULT 'staff';
ALTER TABLE public.lms_simulations ADD COLUMN IF NOT EXISTS scenario_context text;
ALTER TABLE public.lms_simulations ADD COLUMN IF NOT EXISTS estimated_minutes integer DEFAULT 10;
ALTER TABLE public.lms_simulations ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.lms_simulations ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Add missing columns to lms_simulation_steps
ALTER TABLE public.lms_simulation_steps ADD COLUMN IF NOT EXISTS behavior_function text;
