
-- reward_transactions RLS
ALTER TABLE public.reward_transactions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'rt_select_agency' AND tablename = 'reward_transactions') THEN
    EXECUTE 'CREATE POLICY rt_select_agency ON public.reward_transactions FOR SELECT TO authenticated USING (agency_id IN (SELECT agency_id FROM public.staff_assignments WHERE user_id = auth.uid()))';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'rt_insert_agency' AND tablename = 'reward_transactions') THEN
    EXECUTE 'CREATE POLICY rt_insert_agency ON public.reward_transactions FOR INSERT TO authenticated WITH CHECK (agency_id IN (SELECT agency_id FROM public.staff_assignments WHERE user_id = auth.uid()))';
  END IF;
END $$;

-- reward_economy_settings RLS
ALTER TABLE public.reward_economy_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'res_select_agency' AND tablename = 'reward_economy_settings') THEN
    EXECUTE 'CREATE POLICY res_select_agency ON public.reward_economy_settings FOR SELECT TO authenticated USING (agency_id IN (SELECT agency_id FROM public.staff_assignments WHERE user_id = auth.uid()))';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'res_all_agency' AND tablename = 'reward_economy_settings') THEN
    EXECUTE 'CREATE POLICY res_all_agency ON public.reward_economy_settings FOR ALL TO authenticated USING (agency_id IN (SELECT agency_id FROM public.staff_assignments WHERE user_id = auth.uid()))';
  END IF;
END $$;

-- reward_inventory RLS
ALTER TABLE public.reward_inventory ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ri_select_agency' AND tablename = 'reward_inventory') THEN
    EXECUTE 'CREATE POLICY ri_select_agency ON public.reward_inventory FOR SELECT TO authenticated USING (agency_id IN (SELECT agency_id FROM public.staff_assignments WHERE user_id = auth.uid()))';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ri_all_agency' AND tablename = 'reward_inventory') THEN
    EXECUTE 'CREATE POLICY ri_all_agency ON public.reward_inventory FOR ALL TO authenticated USING (agency_id IN (SELECT agency_id FROM public.staff_assignments WHERE user_id = auth.uid()))';
  END IF;
END $$;

-- reward_dynamic_prices RLS
ALTER TABLE public.reward_dynamic_prices ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'rdp_select_agency' AND tablename = 'reward_dynamic_prices') THEN
    EXECUTE 'CREATE POLICY rdp_select_agency ON public.reward_dynamic_prices FOR SELECT TO authenticated USING (agency_id IN (SELECT agency_id FROM public.staff_assignments WHERE user_id = auth.uid()))';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'rdp_insert_agency' AND tablename = 'reward_dynamic_prices') THEN
    EXECUTE 'CREATE POLICY rdp_insert_agency ON public.reward_dynamic_prices FOR INSERT TO authenticated WITH CHECK (agency_id IN (SELECT agency_id FROM public.staff_assignments WHERE user_id = auth.uid()))';
  END IF;
END $$;
