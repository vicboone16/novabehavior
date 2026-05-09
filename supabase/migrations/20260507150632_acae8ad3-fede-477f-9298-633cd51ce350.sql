
-- 1. Enable RLS + policies on unprotected public tables

-- Reference/library tables (read for authenticated, write admin-only)
ALTER TABLE public.assessment_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assessment_catalog read" ON public.assessment_catalog FOR SELECT TO authenticated USING (true);
CREATE POLICY "assessment_catalog admin write" ON public.assessment_catalog FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

ALTER TABLE public.assessment_domains ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assessment_domains read" ON public.assessment_domains FOR SELECT TO authenticated USING (true);
CREATE POLICY "assessment_domains admin write" ON public.assessment_domains FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

ALTER TABLE public.assessment_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assessment_items read" ON public.assessment_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "assessment_items admin write" ON public.assessment_items FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

ALTER TABLE public.bops_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bops_tags read" ON public.bops_tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "bops_tags admin write" ON public.bops_tags FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

ALTER TABLE public.cosmetic_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cosmetic_catalog read" ON public.cosmetic_catalog FOR SELECT TO authenticated USING (true);
CREATE POLICY "cosmetic_catalog admin write" ON public.cosmetic_catalog FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

ALTER TABLE public.classroom_quest_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "classroom_quest_templates read" ON public.classroom_quest_templates FOR SELECT TO authenticated USING (agency_id IS NULL OR public.has_agency_access(agency_id, auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "classroom_quest_templates admin write" ON public.classroom_quest_templates FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

ALTER TABLE public.launch_readiness_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "launch_readiness_checks admin only" ON public.launch_readiness_checks FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Classroom/agency-scoped quests
ALTER TABLE public.classroom_daily_quests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "classroom_daily_quests agency access" ON public.classroom_daily_quests FOR SELECT TO authenticated USING (public.has_agency_access(agency_id, auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "classroom_daily_quests admin write" ON public.classroom_daily_quests FOR ALL TO authenticated USING (public.is_admin(auth.uid()) OR public.has_agency_access(agency_id, auth.uid())) WITH CHECK (public.is_admin(auth.uid()) OR public.has_agency_access(agency_id, auth.uid()));

-- Student-scoped tables
ALTER TABLE public.classroom_team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "classroom_team_members student access" ON public.classroom_team_members FOR ALL TO authenticated
  USING (public.has_student_access(student_id, auth.uid()) OR public.is_admin(auth.uid()))
  WITH CHECK (public.has_student_access(student_id, auth.uid()) OR public.is_admin(auth.uid()));

ALTER TABLE public.game_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "game_events student access" ON public.game_events FOR ALL TO authenticated
  USING (public.has_student_access(student_id, auth.uid()) OR public.is_admin(auth.uid()))
  WITH CHECK (public.has_student_access(student_id, auth.uid()) OR public.is_admin(auth.uid()));

ALTER TABLE public.student_cosmetic_loadout ENABLE ROW LEVEL SECURITY;
CREATE POLICY "student_cosmetic_loadout student access" ON public.student_cosmetic_loadout FOR ALL TO authenticated
  USING (public.has_student_access(student_id, auth.uid()) OR public.is_admin(auth.uid()))
  WITH CHECK (public.has_student_access(student_id, auth.uid()) OR public.is_admin(auth.uid()));

ALTER TABLE public.student_cosmetic_unlocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "student_cosmetic_unlocks student access" ON public.student_cosmetic_unlocks FOR ALL TO authenticated
  USING (public.has_student_access(student_id, auth.uid()) OR public.is_admin(auth.uid()))
  WITH CHECK (public.has_student_access(student_id, auth.uid()) OR public.is_admin(auth.uid()));

ALTER TABLE public.student_daily_quest_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "student_daily_quest_progress student access" ON public.student_daily_quest_progress FOR ALL TO authenticated
  USING (public.has_student_access(student_id, auth.uid()) OR public.is_admin(auth.uid()))
  WITH CHECK (public.has_student_access(student_id, auth.uid()) OR public.is_admin(auth.uid()));

ALTER TABLE public.student_quests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "student_quests student access" ON public.student_quests FOR ALL TO authenticated
  USING (public.has_student_access(student_id, auth.uid()) OR public.is_admin(auth.uid()))
  WITH CHECK (public.has_student_access(student_id, auth.uid()) OR public.is_admin(auth.uid()));

-- 2. Switch SECURITY DEFINER views to security_invoker=on
ALTER VIEW public.v_bops_cfi_best_fit SET (security_invoker = on);
ALTER VIEW public.v_bops_cfi_ranked_results SET (security_invoker = on);
ALTER VIEW public.v_bops_engine_roster SET (security_invoker = on);
ALTER VIEW public.v_bops_report_section_versions SET (security_invoker = on);
ALTER VIEW public.v_bops_report_workspace SET (security_invoker = on);
ALTER VIEW public.v_bops_reports SET (security_invoker = on);
ALTER VIEW public.v_bops_reports_session_locked SET (security_invoker = on);
ALTER VIEW public.v_bops_reports_with_session_context SET (security_invoker = on);
ALTER VIEW public.v_classroom_archetype_density SET (security_invoker = on);
ALTER VIEW public.v_classroom_genome SET (security_invoker = on);
ALTER VIEW public.v_launch_readiness_score SET (security_invoker = on);
ALTER VIEW public.v_nova_abrse_recommendations SET (security_invoker = on);
ALTER VIEW public.v_nova_assessment_report SET (security_invoker = on);
ALTER VIEW public.v_nova_master_report SET (security_invoker = on);
ALTER VIEW public.v_nova_master_report_full SET (security_invoker = on);
ALTER VIEW public.v_student_bops_profile SET (security_invoker = on);
ALTER VIEW public.v_student_bops_session_history SET (security_invoker = on);

-- 3. Lock down realtime.messages so authenticated users cannot subscribe to arbitrary channels.
-- Postgres-changes (CDC) subscriptions still flow through underlying table RLS.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='realtime' AND c.relname='messages') THEN
    EXECUTE 'ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY';
    BEGIN
      EXECUTE 'DROP POLICY IF EXISTS "deny_all_authenticated_broadcast" ON realtime.messages';
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    EXECUTE 'CREATE POLICY "deny_all_authenticated_broadcast" ON realtime.messages FOR SELECT TO authenticated USING (false)';
  END IF;
END$$;
