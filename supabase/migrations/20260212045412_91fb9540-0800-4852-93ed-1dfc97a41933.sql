
-- Create 3 new curriculum systems for Barriers, Transition, and EESA
INSERT INTO public.curriculum_systems (id, name, type, description, publisher, version, tags, active)
VALUES
  ('a0b1c2d3-e4f5-4a6b-8c9d-100000000001', 'VB-MAPP Barriers', 'assessment', 'VB-MAPP Barriers Assessment - 24 barrier categories scored 0-4', 'Mark L. Sundberg', '2008', ARRAY['vb-mapp', 'barriers', 'aba'], true),
  ('a0b1c2d3-e4f5-4a6b-8c9d-200000000001', 'VB-MAPP Transition', 'assessment', 'VB-MAPP Transition Assessment - 18 areas scored 1-5', 'Mark L. Sundberg', '2008', ARRAY['vb-mapp', 'transition', 'aba'], true),
  ('a0b1c2d3-e4f5-4a6b-8c9d-300000000001', 'VB-MAPP EESA', 'assessment', 'Early Echoic Skills Assessment - 100 items scored 0 or 1 in 10 groups', 'Mark L. Sundberg', '2008', ARRAY['vb-mapp', 'eesa', 'echoic', 'aba'], true);

-- Create domains for Barriers (single domain)
INSERT INTO public.domains (id, name, category, description, display_order)
VALUES
  ('a0b1c2d3-e4f5-4a6b-8c9d-100000000010', 'VB-MAPP Barriers', 'barriers', 'Barriers to language and learning', 1);

-- Create domains for Transition (single domain)
INSERT INTO public.domains (id, name, category, description, display_order)
VALUES
  ('a0b1c2d3-e4f5-4a6b-8c9d-200000000010', 'VB-MAPP Transition', 'transition', 'Transition assessment areas', 1);

-- Create domains for EESA (10 groups)
INSERT INTO public.domains (id, name, category, description, display_order)
VALUES
  ('a0b1c2d3-e4f5-4a6b-8c9d-300000000010', 'EESA Group 1', 'eesa', 'Animal sounds & song fill-ins', 1),
  ('a0b1c2d3-e4f5-4a6b-8c9d-300000000020', 'EESA Group 2', 'eesa', 'Name, fill-ins, associations', 2),
  ('a0b1c2d3-e4f5-4a6b-8c9d-300000000030', 'EESA Group 3', 'eesa', 'Simple What questions', 3),
  ('a0b1c2d3-e4f5-4a6b-8c9d-300000000040', 'EESA Group 4', 'eesa', 'Simple Who, Where & age', 4),
  ('a0b1c2d3-e4f5-4a6b-8c9d-300000000050', 'EESA Group 5', 'eesa', 'Categories, function, features', 5),
  ('a0b1c2d3-e4f5-4a6b-8c9d-300000000060', 'EESA Group 6', 'eesa', 'Adjectives, prepositions, adverbs', 6),
  ('a0b1c2d3-e4f5-4a6b-8c9d-300000000070', 'EESA Group 7', 'eesa', 'Multiple-part questions (set 1)', 7),
  ('a0b1c2d3-e4f5-4a6b-8c9d-300000000080', 'EESA Group 8', 'eesa', 'Multiple-part questions (set 2)', 8),
  ('a0b1c2d3-e4f5-4a6b-8c9d-300000000090', 'EESA Group 9', 'eesa', 'Complex questions (set 1)', 9),
  ('a0b1c2d3-e4f5-4a6b-8c9d-300000000100', 'EESA Group 10', 'eesa', 'Complex questions (set 2)', 10);
