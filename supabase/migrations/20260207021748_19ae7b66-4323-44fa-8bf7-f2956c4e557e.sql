
-- Seed curriculum_systems entries for AFLS and ABLLS-R
INSERT INTO public.curriculum_systems (name, type, description, publisher, active)
VALUES 
  ('AFLS', 'assessment', 'Assessment of Functional Living Skills - 6 module comprehensive adaptive skills assessment (0-4 scoring)', 'Partington Behavior Analysts', true),
  ('ABLLS-R', 'assessment', 'Assessment of Basic Language and Learning Skills - Revised (variable max scoring per item)', 'Partington Behavior Analysts', true)
ON CONFLICT DO NOTHING;
