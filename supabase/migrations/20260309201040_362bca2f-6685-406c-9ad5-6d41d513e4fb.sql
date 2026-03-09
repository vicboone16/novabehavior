
-- Enable RLS and add policies for tables missing them
ALTER TABLE public.progression_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progression_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mts_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mts_interval_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mts_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage progression_groups" ON public.progression_groups FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage progression_steps" ON public.progression_steps FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage mts_sessions" ON public.mts_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage mts_interval_data" ON public.mts_interval_data FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage mts_definitions" ON public.mts_definitions FOR ALL TO authenticated USING (true) WITH CHECK (true);
