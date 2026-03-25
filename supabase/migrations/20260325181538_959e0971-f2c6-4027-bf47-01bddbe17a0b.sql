
-- Fix orphaned behavior references by inserting missing behaviors into nt_behaviors
INSERT INTO public.nt_behaviors (id, domain_id, name, definition, status, is_selectable, created_at)
SELECT DISTINCT sbm.behavior_entry_id, 
  (SELECT id FROM public.nt_behavior_domains WHERE lower(name) = 'externalizing' LIMIT 1),
  initcap(replace(sbm.behavior_subtype, '_', ' ')),
  null,
  'active', true, now()
FROM public.student_behavior_map sbm
WHERE sbm.behavior_entry_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM public.nt_behaviors nb WHERE nb.id = sbm.behavior_entry_id)
ON CONFLICT (id) DO NOTHING;
