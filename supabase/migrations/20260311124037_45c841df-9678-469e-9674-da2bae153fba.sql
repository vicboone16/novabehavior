
DROP VIEW IF EXISTS public.v_lms_modules_with_counts;

CREATE VIEW public.v_lms_modules_with_counts AS
SELECT
  m.id,
  m.course_id,
  m.title,
  m.order_index,
  m.estimated_minutes,
  count(distinct l.id) AS lesson_count
FROM public.lms_modules m
LEFT JOIN public.lms_lessons l ON l.module_id = m.id
GROUP BY m.id, m.course_id, m.title, m.order_index, m.estimated_minutes;

-- RLS policies (the ALTER TABLE + policies from above likely applied partially; re-run idempotently)
ALTER TABLE public.behavior_library_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.behavior_recommendation_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.behavior_strategy_training_links ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='behavior_library_tags_select_auth' AND tablename='behavior_library_tags') THEN
    CREATE POLICY "behavior_library_tags_select_auth" ON public.behavior_library_tags FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='behavior_recommendation_bundles_select_auth' AND tablename='behavior_recommendation_bundles') THEN
    CREATE POLICY "behavior_recommendation_bundles_select_auth" ON public.behavior_recommendation_bundles FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='behavior_recommendation_bundles_insert_auth' AND tablename='behavior_recommendation_bundles') THEN
    CREATE POLICY "behavior_recommendation_bundles_insert_auth" ON public.behavior_recommendation_bundles FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='behavior_recommendation_bundles_update_auth' AND tablename='behavior_recommendation_bundles') THEN
    CREATE POLICY "behavior_recommendation_bundles_update_auth" ON public.behavior_recommendation_bundles FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='behavior_strategy_training_links_select_auth' AND tablename='behavior_strategy_training_links') THEN
    CREATE POLICY "behavior_strategy_training_links_select_auth" ON public.behavior_strategy_training_links FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='behavior_strategy_training_links_insert_auth' AND tablename='behavior_strategy_training_links') THEN
    CREATE POLICY "behavior_strategy_training_links_insert_auth" ON public.behavior_strategy_training_links FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;
