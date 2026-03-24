-- Enable realtime for beacon tables
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.beacon_points_ledger;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.mayday_alerts;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_presence_status;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- Move BOPS nav items under clinical
UPDATE app_navigation_structure 
SET parent_key = 'clinical', sort_order = 35, level = 1
WHERE nav_key = 'bops-engine';

-- Hide standalone BOPS Admin nav (now integrated into Clinical tab)
UPDATE app_navigation_structure 
SET is_visible = false
WHERE nav_key = 'bops-admin';