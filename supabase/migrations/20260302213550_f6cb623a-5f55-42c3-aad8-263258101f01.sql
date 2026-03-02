-- Restrict publicly readable clinical template tables to authenticated users

-- prompt_levels
ALTER TABLE public.prompt_levels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read prompt levels" ON public.prompt_levels;
CREATE POLICY "Authenticated can read prompt levels"
ON public.prompt_levels
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- prompt_sets
ALTER TABLE public.prompt_sets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read prompt sets" ON public.prompt_sets;
CREATE POLICY "Authenticated can read prompt sets"
ON public.prompt_sets
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- criteria_templates
ALTER TABLE public.criteria_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read global criteria" ON public.criteria_templates;
CREATE POLICY "Authenticated can read criteria templates"
ON public.criteria_templates
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);