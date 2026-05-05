
-- Hide top-level Help and Optimization (moving Help to user dropdown, Optimization under Clinical)
UPDATE public.app_navigation_structure
SET is_visible = false
WHERE nav_key IN ('help', 'optimization', 'teacher-comms')
  AND parent_key IS NULL;

-- Also hide the now-orphaned optimization sub-items (we'll surface a single Optimization header inside Clinical)
UPDATE public.app_navigation_structure
SET is_visible = false
WHERE parent_key = 'optimization';

-- Add Optimization as a sub-header under Clinical (so Clinical page can show it)
INSERT INTO public.app_navigation_structure
  (nav_key, parent_key, label, icon, route, level, sort_order, is_visible)
VALUES
  ('clinical_optimization', 'clinical', 'Optimization', 'BrainCircuit', '/clinical?tab=optimization', 1, 40, true)
ON CONFLICT (nav_key) DO UPDATE
SET parent_key = EXCLUDED.parent_key,
    label = EXCLUDED.label,
    icon = EXCLUDED.icon,
    route = EXCLUDED.route,
    level = EXCLUDED.level,
    sort_order = EXCLUDED.sort_order,
    is_visible = true;
