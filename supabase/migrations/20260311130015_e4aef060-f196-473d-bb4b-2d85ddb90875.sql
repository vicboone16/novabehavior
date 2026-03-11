
ALTER TABLE public.behavior_recommendation_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.behavior_recommendation_profile_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.behavior_problem_recommendation_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.behavior_recommendation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.behavior_recommendation_result_strategies ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='behavior_recommendation_profiles_select_auth' AND tablename='behavior_recommendation_profiles') THEN
    CREATE POLICY "behavior_recommendation_profiles_select_auth" ON public.behavior_recommendation_profiles FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='behavior_recommendation_profile_strategies_select_auth' AND tablename='behavior_recommendation_profile_strategies') THEN
    CREATE POLICY "behavior_recommendation_profile_strategies_select_auth" ON public.behavior_recommendation_profile_strategies FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='behavior_recommendation_results_select_auth' AND tablename='behavior_recommendation_results') THEN
    CREATE POLICY "behavior_recommendation_results_select_auth" ON public.behavior_recommendation_results FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='behavior_recommendation_results_insert_auth' AND tablename='behavior_recommendation_results') THEN
    CREATE POLICY "behavior_recommendation_results_insert_auth" ON public.behavior_recommendation_results FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='behavior_recommendation_result_strategies_select_auth' AND tablename='behavior_recommendation_result_strategies') THEN
    CREATE POLICY "behavior_recommendation_result_strategies_select_auth" ON public.behavior_recommendation_result_strategies FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='behavior_recommendation_result_strategies_insert_auth' AND tablename='behavior_recommendation_result_strategies') THEN
    CREATE POLICY "behavior_recommendation_result_strategies_insert_auth" ON public.behavior_recommendation_result_strategies FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;
