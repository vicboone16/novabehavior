
-- ============================================
-- Enable RLS on all 18 unprotected public tables
-- ============================================

-- ABAS reference/library tables (no owner column - authenticated read, admin write)
ALTER TABLE public.aba_goal_library_srs2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abas_benchmark_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abas_benchmark_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abas_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abas_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abas_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abas_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abas_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abas_program_item_crosswalk ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abas_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abas_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abas_skill_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abas_teaching_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_goal_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_goal_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pecs_library ENABLE ROW LEVEL SECURITY;

-- Client-scoped tables
ALTER TABLE public.abas_item_deficit_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abas_item_results ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies for REFERENCE / LIBRARY tables
-- Authenticated users can SELECT; only admins can INSERT/UPDATE/DELETE
-- ============================================

-- Helper macro: for each reference table, create read + admin-write policies
-- aba_goal_library_srs2
CREATE POLICY "Authenticated users can read aba_goal_library_srs2" ON public.aba_goal_library_srs2 FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage aba_goal_library_srs2" ON public.aba_goal_library_srs2 FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- abas_benchmark_groups
CREATE POLICY "Authenticated users can read abas_benchmark_groups" ON public.abas_benchmark_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage abas_benchmark_groups" ON public.abas_benchmark_groups FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- abas_benchmark_steps
CREATE POLICY "Authenticated users can read abas_benchmark_steps" ON public.abas_benchmark_steps FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage abas_benchmark_steps" ON public.abas_benchmark_steps FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- abas_benchmarks
CREATE POLICY "Authenticated users can read abas_benchmarks" ON public.abas_benchmarks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage abas_benchmarks" ON public.abas_benchmarks FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- abas_domains
CREATE POLICY "Authenticated users can read abas_domains" ON public.abas_domains FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage abas_domains" ON public.abas_domains FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- abas_forms
CREATE POLICY "Authenticated users can read abas_forms" ON public.abas_forms FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage abas_forms" ON public.abas_forms FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- abas_items
CREATE POLICY "Authenticated users can read abas_items" ON public.abas_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage abas_items" ON public.abas_items FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- abas_objectives
CREATE POLICY "Authenticated users can read abas_objectives" ON public.abas_objectives FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage abas_objectives" ON public.abas_objectives FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- abas_program_item_crosswalk
CREATE POLICY "Authenticated users can read abas_program_item_crosswalk" ON public.abas_program_item_crosswalk FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage abas_program_item_crosswalk" ON public.abas_program_item_crosswalk FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- abas_programs
CREATE POLICY "Authenticated users can read abas_programs" ON public.abas_programs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage abas_programs" ON public.abas_programs FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- abas_settings
CREATE POLICY "Authenticated users can read abas_settings" ON public.abas_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage abas_settings" ON public.abas_settings FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- abas_skill_areas
CREATE POLICY "Authenticated users can read abas_skill_areas" ON public.abas_skill_areas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage abas_skill_areas" ON public.abas_skill_areas FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- abas_teaching_strategies
CREATE POLICY "Authenticated users can read abas_teaching_strategies" ON public.abas_teaching_strategies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage abas_teaching_strategies" ON public.abas_teaching_strategies FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- clinical_goal_benchmarks
CREATE POLICY "Authenticated users can read clinical_goal_benchmarks" ON public.clinical_goal_benchmarks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage clinical_goal_benchmarks" ON public.clinical_goal_benchmarks FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- clinical_goal_targets
CREATE POLICY "Authenticated users can read clinical_goal_targets" ON public.clinical_goal_targets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage clinical_goal_targets" ON public.clinical_goal_targets FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- clinical_goals
CREATE POLICY "Authenticated users can read clinical_goals" ON public.clinical_goals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage clinical_goals" ON public.clinical_goals FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- pecs_library
CREATE POLICY "Authenticated users can read pecs_library" ON public.pecs_library FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage pecs_library" ON public.pecs_library FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ============================================
-- RLS Policies for CLIENT-SCOPED tables
-- Access scoped to student access or admin
-- ============================================

-- abas_item_deficit_recommendations (has client_id)
CREATE POLICY "Users with student access can read abas_item_deficit_recommendations" ON public.abas_item_deficit_recommendations FOR SELECT TO authenticated USING (
  public.is_admin(auth.uid()) OR public.has_student_access(client_id, auth.uid())
);
CREATE POLICY "Admins can manage abas_item_deficit_recommendations" ON public.abas_item_deficit_recommendations FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- abas_item_results (has client_id)
CREATE POLICY "Users with student access can read abas_item_results" ON public.abas_item_results FOR SELECT TO authenticated USING (
  public.is_admin(auth.uid()) OR public.has_student_access(client_id, auth.uid())
);
CREATE POLICY "Users with student access can insert abas_item_results" ON public.abas_item_results FOR INSERT TO authenticated WITH CHECK (
  public.is_admin(auth.uid()) OR public.has_student_access(client_id, auth.uid())
);
CREATE POLICY "Admins can manage abas_item_results" ON public.abas_item_results FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete abas_item_results" ON public.abas_item_results FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
