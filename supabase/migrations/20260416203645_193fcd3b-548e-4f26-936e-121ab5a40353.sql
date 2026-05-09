-- Remove the standalone top-level Teacher Comms nav entry since it now lives inside the Review Queue page (as a tab next to SMS Settings).
DELETE FROM public.app_navigation_structure
WHERE route = '/teacher-comms' AND parent_key IS NULL;