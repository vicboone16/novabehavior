-- Add Phase 2 Curriculum Systems

-- ABLLS-R (Assessment of Basic Language and Learning Skills - Revised)
INSERT INTO public.curriculum_systems (name, type, description, publisher, version, age_range_min_months, age_range_max_months, tags, active)
VALUES (
  'ABLLS-R',
  'assessment',
  'The Assessment of Basic Language and Learning Skills - Revised (ABLLS-R) is a criterion-referenced assessment tool, curriculum guide, and skills tracking system for children with autism or other developmental disabilities. It contains 544 skills across 25 skill areas.',
  'Partington Behavior Analysts',
  'Revised',
  12,
  144,
  ARRAY['autism', 'developmental', 'language', 'learning skills'],
  true
);

-- AFLS (Assessment of Functional Living Skills)
INSERT INTO public.curriculum_systems (name, type, description, publisher, version, age_range_min_months, age_range_max_months, tags, active)
VALUES (
  'AFLS',
  'adaptive',
  'The Assessment of Functional Living Skills (AFLS) assesses essential skills for independent living across multiple domains including Basic Living Skills, Home Skills, Community Participation, School Skills, Vocational Skills, and Independent Living Skills.',
  'Partington Behavior Analysts',
  '1.0',
  36,
  264,
  ARRAY['adaptive', 'functional', 'independence', 'life skills'],
  true
);

-- Socially Savvy
INSERT INTO public.curriculum_systems (name, type, description, publisher, version, age_range_min_months, age_range_max_months, tags, active)
VALUES (
  'Socially Savvy',
  'social',
  'Socially Savvy is a social skills curriculum designed to teach critical social and emotional skills. It includes assessment and intervention materials for developing peer relationships, emotional regulation, and social problem-solving.',
  'Different Roads to Learning',
  '1.0',
  36,
  216,
  ARRAY['social skills', 'emotional regulation', 'peer relationships'],
  true
);

-- Vineland-3
INSERT INTO public.curriculum_systems (name, type, description, publisher, version, age_range_min_months, age_range_max_months, tags, active)
VALUES (
  'Vineland-3',
  'assessment',
  'The Vineland Adaptive Behavior Scales, Third Edition (Vineland-3) measures adaptive behavior across Communication, Daily Living Skills, Socialization, and Motor Skills domains. It provides age-based standard scores and adaptive levels.',
  'Pearson',
  '3',
  0,
  1080,
  ARRAY['adaptive behavior', 'standardized', 'norm-referenced'],
  true
);

-- ABAS-3
INSERT INTO public.curriculum_systems (name, type, description, publisher, version, age_range_min_months, age_range_max_months, tags, active)
VALUES (
  'ABAS-3',
  'assessment',
  'The Adaptive Behavior Assessment System, Third Edition (ABAS-3) provides a comprehensive assessment of adaptive skills functioning across Conceptual, Social, and Practical skill areas aligned with DSM-5 and AAIDD criteria.',
  'Pearson',
  '3',
  0,
  1068,
  ARRAY['adaptive', 'DSM-5', 'intellectual disability'],
  true
);

-- SRS-2
INSERT INTO public.curriculum_systems (name, type, description, publisher, version, age_range_min_months, age_range_max_months, tags, active)
VALUES (
  'SRS-2',
  'assessment',
  'The Social Responsiveness Scale, Second Edition (SRS-2) measures social behavior deficits associated with autism spectrum disorder. It provides a quantitative measure of autistic traits across Social Awareness, Social Cognition, Social Communication, Social Motivation, and Restricted Interests/Repetitive Behavior.',
  'Western Psychological Services',
  '2',
  30,
  228,
  ARRAY['autism', 'social responsiveness', 'ASD screening'],
  true
);

-- Add some ABLLS-R curriculum items (sample items for key domains)
INSERT INTO public.curriculum_items (curriculum_system_id, domain_id, level, code, title, description, mastery_criteria, display_order, active)
SELECT 
  cs.id,
  d.id,
  'Basic',
  'A-' || row_number() OVER (ORDER BY d.name),
  'Cooperation - Task ' || row_number() OVER (ORDER BY d.name),
  'Demonstrates cooperative behavior during structured activities',
  'Completes task independently on 3 consecutive trials',
  row_number() OVER (ORDER BY d.name),
  true
FROM public.curriculum_systems cs
CROSS JOIN public.domains d
WHERE cs.name = 'ABLLS-R'
AND d.name IN ('Mand', 'Tact', 'Listener Responding', 'Visual Performance')
LIMIT 20;

-- Add AFLS items (sample)
INSERT INTO public.curriculum_items (curriculum_system_id, domain_id, level, code, title, description, mastery_criteria, display_order, active)
SELECT 
  cs.id,
  d.id,
  'Foundation',
  'BLS-' || row_number() OVER (ORDER BY d.name),
  'Basic Living Skill - ' || d.name || ' ' || row_number() OVER (ORDER BY d.name),
  'Demonstrates functional skill in ' || lower(d.name) || ' domain',
  'Performs skill independently in natural environment',
  row_number() OVER (ORDER BY d.name),
  true
FROM public.curriculum_systems cs
CROSS JOIN public.domains d
WHERE cs.name = 'AFLS'
AND d.name IN ('Self-Care', 'Motor', 'Play', 'Social Skills')
LIMIT 16;

-- Add Socially Savvy items (sample)
INSERT INTO public.curriculum_items (curriculum_system_id, domain_id, level, code, title, description, mastery_criteria, display_order, active)
SELECT 
  cs.id,
  d.id,
  'Level 1',
  'SS-' || row_number() OVER (ORDER BY d.name),
  'Social Skill - ' || d.name || ' Awareness',
  'Recognizes and demonstrates appropriate social behavior in ' || lower(d.name) || ' contexts',
  'Demonstrates skill across 3 different settings with 80% accuracy',
  row_number() OVER (ORDER BY d.name),
  true
FROM public.curriculum_systems cs
CROSS JOIN public.domains d
WHERE cs.name = 'Socially Savvy'
AND d.name IN ('Social Skills', 'Play', 'Group Instruction')
LIMIT 12;