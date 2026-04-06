
-- =============================================
-- PHASE 1: Add cleanup columns to legacy domains table
-- =============================================

ALTER TABLE public.domains
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS domain_type text DEFAULT 'legacy',
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS show_in_main_dropdown boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notes text;

-- Backfill slugs
UPDATE public.domains
SET slug = lower(regexp_replace(trim(name), '[^a-zA-Z0-9]+', '-', 'g'))
WHERE slug IS NULL;

-- Mark framework/source rows
UPDATE public.domains
SET
  domain_type = CASE
    WHEN name ILIKE 'ABAS-3%' THEN 'framework'
    WHEN name ILIKE 'VB-MAPP%' THEN 'framework'
    WHEN name ILIKE 'EESA Group%' THEN 'framework'
    ELSE 'legacy'
  END,
  show_in_main_dropdown = false,
  notes = COALESCE(notes, 'Hidden from main dropdown during canonical domain cleanup')
WHERE
  name ILIKE 'ABAS-3%'
  OR name ILIKE 'VB-MAPP%'
  OR name ILIKE 'EESA Group%';

-- Hide skill-level items that shouldn't be top-level
UPDATE public.domains
SET
  show_in_main_dropdown = false,
  domain_type = 'skill_category'
WHERE name IN (
  'Mand', 'Tact', 'Listener Responding',
  'Listener Responding by Function, Feature, and Class',
  'Intraverbal', 'Echoic', 'Independent Play',
  'Social Behavior & Social Play',
  'Visual Perceptual Skills & Matching-to-Sample',
  'Classroom Routines & Group Skills',
  'Linguistic Structure', 'Functional Academics',
  'Functional Pre-Academics', 'Reading', 'Writing', 'Math',
  'Fine Motor', 'Gross Motor', 'Self-Care', 'Leisure', 'Work',
  'Health and Safety', 'Self-Direction', 'Social',
  'Community Use', 'Home Living', 'Vocal Play',
  'Spontaneous Vocal Behavior', 'Motor'
)
AND slug NOT IN (
  'communication', 'social-play', 'learning-engagement',
  'behavior-regulation', 'adaptive-living',
  'academic-preacademic', 'safety-independence', 'motor'
);

-- =============================================
-- PHASE 2: Create library_programs table
-- =============================================

CREATE TABLE IF NOT EXISTS public.library_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id uuid NOT NULL REFERENCES public.program_domains(id) ON DELETE RESTRICT,
  subdomain_id uuid NULL REFERENCES public.program_subdomains(id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text NOT NULL,
  description text NULL,
  sort_order integer NOT NULL DEFAULT 0,
  action_status text NOT NULL DEFAULT 'ADD' CHECK (action_status IN ('KEEP','MOVE','ADD','TAG','ARCHIVE')),
  is_active boolean NOT NULL DEFAULT true,
  is_archived boolean NOT NULL DEFAULT false,
  archived_at timestamptz NULL,
  legacy_label text NULL,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (domain_id, subdomain_id, slug)
);

ALTER TABLE public.library_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Library programs are viewable by authenticated users"
  ON public.library_programs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Library programs are manageable by authenticated users"
  ON public.library_programs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================
-- PHASE 3: Create library_program_objectives table
-- =============================================

CREATE TABLE IF NOT EXISTS public.library_program_objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  library_program_id uuid NOT NULL REFERENCES public.library_programs(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text NULL,
  sort_order integer NOT NULL DEFAULT 0,
  action_status text NOT NULL DEFAULT 'ADD' CHECK (action_status IN ('KEEP','MOVE','ADD','TAG','ARCHIVE')),
  is_active boolean NOT NULL DEFAULT true,
  is_archived boolean NOT NULL DEFAULT false,
  archived_at timestamptz NULL,
  legacy_label text NULL,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (library_program_id, slug)
);

ALTER TABLE public.library_program_objectives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Library objectives viewable by authenticated users"
  ON public.library_program_objectives FOR SELECT TO authenticated USING (true);

CREATE POLICY "Library objectives manageable by authenticated users"
  ON public.library_program_objectives FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================
-- PHASE 4: Create library_objective_targets table
-- =============================================

CREATE TABLE IF NOT EXISTS public.library_objective_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id uuid NOT NULL REFERENCES public.library_program_objectives(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NULL,
  target_type text NULL,
  baseline_value text NULL,
  mastery_criteria jsonb NULL,
  probe_criteria jsonb NULL,
  generalization_criteria jsonb NULL,
  maintenance_criteria jsonb NULL,
  sort_order integer NOT NULL DEFAULT 0,
  action_status text NOT NULL DEFAULT 'ADD' CHECK (action_status IN ('KEEP','MOVE','ADD','TAG','ARCHIVE')),
  is_active boolean NOT NULL DEFAULT true,
  is_archived boolean NOT NULL DEFAULT false,
  archived_at timestamptz NULL,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.library_objective_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Library targets viewable by authenticated users"
  ON public.library_objective_targets FOR SELECT TO authenticated USING (true);

CREATE POLICY "Library targets manageable by authenticated users"
  ON public.library_objective_targets FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================
-- PHASE 5: Add compatibility columns to programs
-- =============================================

ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS canonical_library_program_id uuid NULL REFERENCES public.library_programs(id),
  ADD COLUMN IF NOT EXISTS canonical_objective_id uuid NULL REFERENCES public.library_program_objectives(id),
  ADD COLUMN IF NOT EXISTS canonical_target_id uuid NULL REFERENCES public.library_objective_targets(id),
  ADD COLUMN IF NOT EXISTS legacy_domain_label text NULL,
  ADD COLUMN IF NOT EXISTS legacy_subdomain_label text NULL,
  ADD COLUMN IF NOT EXISTS migration_status text NULL,
  ADD COLUMN IF NOT EXISTS review_status text NULL,
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz NULL;

-- Backfill legacy_domain_label from current domain_id
UPDATE public.programs p
SET
  legacy_domain_label = COALESCE(p.legacy_domain_label, d.name)
FROM public.domains d
WHERE p.domain_id = d.id
  AND p.legacy_domain_label IS NULL;

-- =============================================
-- PHASE 6: Create migration audit table
-- =============================================

CREATE TABLE IF NOT EXISTS public.program_library_migration_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NULL REFERENCES public.programs(id) ON DELETE SET NULL,
  legacy_domain_id uuid NULL,
  legacy_domain_label text NULL,
  canonical_domain_id uuid NULL REFERENCES public.program_domains(id),
  canonical_subdomain_id uuid NULL REFERENCES public.program_subdomains(id),
  canonical_library_program_id uuid NULL REFERENCES public.library_programs(id),
  canonical_objective_id uuid NULL REFERENCES public.library_program_objectives(id),
  canonical_target_id uuid NULL REFERENCES public.library_objective_targets(id),
  action_status text NULL,
  mapping_source text NULL,
  confidence numeric(5,2) NULL,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.program_library_migration_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Migration audit viewable by authenticated users"
  ON public.program_library_migration_audit FOR SELECT TO authenticated USING (true);

CREATE POLICY "Migration audit insertable by authenticated users"
  ON public.program_library_migration_audit FOR INSERT TO authenticated WITH CHECK (true);

-- =============================================
-- PHASE 7: Add new subdomains to program_subdomains
-- =============================================

INSERT INTO public.program_subdomains (domain_id, name, slug, sort_order)
VALUES
  -- Communication - cleaner groupings
  ('d0000001-0000-0000-0000-000000000001', 'Requesting / Functional Communication', 'requesting-functional-communication', 21),
  ('d0000001-0000-0000-0000-000000000001', 'Communication Repair & Advocacy', 'communication-repair-advocacy', 22),

  -- Social & Play
  ('d0000001-0000-0000-0000-000000000002', 'Leisure Independence', 'leisure-independence', 20),

  -- Learning & Engagement
  ('d0000001-0000-0000-0000-000000000003', 'Waiting', 'waiting', 20),
  ('d0000001-0000-0000-0000-000000000003', 'Visual Schedule Use', 'visual-schedule-use', 21),
  ('d0000001-0000-0000-0000-000000000003', 'Transitions', 'transitions', 22),
  ('d0000001-0000-0000-0000-000000000003', 'Independent Work', 'independent-work', 23),
  ('d0000001-0000-0000-0000-000000000003', 'Group Instruction Participation', 'group-instruction-participation', 24),
  ('d0000001-0000-0000-0000-000000000003', 'Persistence', 'persistence', 25),

  -- Behavior & Regulation - restructured
  ('d0000001-0000-0000-0000-000000000004', 'Replacement Behaviors', 'replacement-behaviors', 20),
  ('d0000001-0000-0000-0000-000000000004', 'Tolerance Skills', 'tolerance-skills', 21),
  ('d0000001-0000-0000-0000-000000000004', 'Regulation & Coping', 'regulation-coping', 22),
  ('d0000001-0000-0000-0000-000000000004', 'Cooperation & Compliance', 'cooperation-compliance', 23),
  ('d0000001-0000-0000-0000-000000000004', 'Response to Feedback / Correction', 'response-feedback-correction', 24),
  ('d0000001-0000-0000-0000-000000000004', 'Protest / Advocacy Skills', 'protest-advocacy-skills', 25),
  ('d0000001-0000-0000-0000-000000000004', 'Safety Behaviors', 'safety-behaviors', 26),

  -- Adaptive Living
  ('d0000001-0000-0000-0000-000000000005', 'Handwashing', 'handwashing', 20),
  ('d0000001-0000-0000-0000-000000000005', 'Grooming', 'grooming', 21),
  ('d0000001-0000-0000-0000-000000000005', 'Mealtime Skills', 'mealtime-skills', 22),
  ('d0000001-0000-0000-0000-000000000005', 'Chores', 'chores', 23),
  ('d0000001-0000-0000-0000-000000000005', 'Personal Organization', 'personal-organization', 24),
  ('d0000001-0000-0000-0000-000000000005', 'Daily Schedule Independence', 'daily-schedule-independence', 25),

  -- Academic & Pre-Academic
  ('d0000001-0000-0000-0000-000000000006', 'Pre-writing', 'pre-writing', 20),
  ('d0000001-0000-0000-0000-000000000006', 'Early Literacy', 'early-literacy', 21),
  ('d0000001-0000-0000-0000-000000000006', 'Early Numeracy', 'early-numeracy', 22),
  ('d0000001-0000-0000-0000-000000000006', 'Classroom Readiness', 'classroom-readiness', 23),
  ('d0000001-0000-0000-0000-000000000006', 'Academic Participation', 'academic-participation', 24),

  -- Safety & Independence
  ('d0000001-0000-0000-0000-000000000007', 'Responding to Stop/Wait', 'responding-stop-wait', 20),
  ('d0000001-0000-0000-0000-000000000007', 'Name Response for Safety', 'name-response-safety', 21),
  ('d0000001-0000-0000-0000-000000000007', 'Transition Safety', 'transition-safety', 22),
  ('d0000001-0000-0000-0000-000000000007', 'Safe Walking', 'safe-walking', 23),
  ('d0000001-0000-0000-0000-000000000007', 'Emergency Response Basics', 'emergency-response-basics', 24),

  -- Motor
  ('d0000001-0000-0000-0000-000000000008', 'Visual-Motor Integration', 'visual-motor-integration', 20),
  ('d0000001-0000-0000-0000-000000000008', 'Hand Strength / Coordination', 'hand-strength-coordination', 21),
  ('d0000001-0000-0000-0000-000000000008', 'Bilateral Coordination', 'bilateral-coordination', 22)
ON CONFLICT DO NOTHING;

-- =============================================
-- PHASE 8: Seed library programs
-- =============================================

-- We need subdomain IDs. Use a CTE approach with slug lookups.
WITH sub AS (
  SELECT ps.id, ps.slug, pd.slug AS domain_slug
  FROM public.program_subdomains ps
  JOIN public.program_domains pd ON pd.id = ps.domain_id
)
INSERT INTO public.library_programs (domain_id, subdomain_id, name, slug, action_status, sort_order)
SELECT
  pd.id,
  s.id,
  x.name,
  x.prog_slug,
  x.action_status,
  x.sort_order
FROM (VALUES
  -- Communication / Requesting
  ('communication','requesting-functional-communication','Manding for Help','manding-for-help','ADD',1),
  ('communication','requesting-functional-communication','Spontaneous Requests','spontaneous-requests','ADD',2),
  ('communication','requesting-functional-communication','Request a Break','request-a-break','ADD',3),
  ('communication','requesting-functional-communication','Request Attention Appropriately','request-attention-appropriately','ADD',4),
  ('communication','requesting-functional-communication','Making Choices','making-choices','ADD',5),
  -- Communication / Labeling
  ('communication','labeling','Labeling Items','labeling-items','KEEP',1),
  -- Communication / Responding to Questions
  ('communication','responding-to-questions','Answering What Questions','answering-what-questions','KEEP',1),
  ('communication','responding-to-questions','Answering Where Questions','answering-where-questions','KEEP',2),

  -- Social & Play
  ('social-play','initiating-social-interactions','Initiating Social Interactions','initiating-social-interactions','KEEP',1),
  ('social-play','greeting-skills','Reciprocate Greeting','reciprocate-greeting','KEEP',1),
  ('social-play','flexible-play','Interactive Play','interactive-play','KEEP',1),
  ('social-play','expanding-interests','Expanding Interests','expanding-interests','KEEP',1),
  ('social-play','turn-taking','Turn Taking','turn-taking-program','KEEP',1),

  -- Learning & Engagement
  ('learning-engagement','responding-to-name','Responding to Name','responding-to-name-program','KEEP',1),
  ('learning-engagement','following-directions','Following One-Step Directives','following-one-step-directives','KEEP',1),
  ('learning-engagement','on-task-behavior','On-Task Behavior','on-task-behavior-program','KEEP',1),
  ('learning-engagement','visual-schedule-use','Following a Visual Schedule','following-visual-schedule','KEEP',1),

  -- Behavior & Regulation
  ('behavior-regulation','replacement-behaviors','Functional Communication Training','fct-program','KEEP',1),
  ('behavior-regulation','protest-advocacy-skills','Appropriate Protesting','appropriate-protesting','KEEP',1),
  ('behavior-regulation','tolerance-skills','Tolerate Waiting','tolerate-waiting','KEEP',1),
  ('behavior-regulation','tolerance-skills','Tolerate Being Told No','tolerate-being-told-no','KEEP',2),
  ('behavior-regulation','tolerance-skills','Tolerate Non-Preferred Activity','tolerate-non-preferred-activity','KEEP',3),
  ('behavior-regulation','tolerance-skills','Tolerate Others Presence','tolerate-others-presence','KEEP',4),
  ('behavior-regulation','tolerance-skills','Tolerate Transitions','tolerate-transitions','KEEP',5),
  ('behavior-regulation','tolerance-skills','Delaying Access to Reinforcement','delaying-access-reinforcement','KEEP',6),
  ('behavior-regulation','tolerance-skills','Accepting Denial / Delayed Access','accepting-denial-delayed-access','KEEP',7),
  ('behavior-regulation','cooperation-compliance','Noncompliance Reduction','noncompliance-reduction','KEEP',1),
  ('behavior-regulation','safety-behaviors','Safe Body','safe-body','KEEP',1),
  ('behavior-regulation','safety-behaviors','Safe Transitions','safe-transitions','KEEP',2),
  ('behavior-regulation','behavior-reduction','Aggression Reduction','aggression-reduction','KEEP',1),
  ('behavior-regulation','behavior-reduction','Elopement Reduction','elopement-reduction','KEEP',2),
  ('behavior-regulation','behavior-reduction','Vocal Protest Reduction','vocal-protest-reduction','KEEP',3),

  -- Adaptive Living
  ('adaptive-living','handwashing','Washing Hands','washing-hands','KEEP',1),
  ('adaptive-living','toileting','Toileting Independence','toileting-independence','KEEP',1),
  ('adaptive-living','mealtime-skills','Feeding Independence','feeding-independence','KEEP',1),

  -- Academic & Pre-Academic
  ('academic-pre-academic','core-academics','Reading','reading-program','KEEP',1),
  ('academic-pre-academic','core-academics','Writing','writing-program','KEEP',2),
  ('academic-pre-academic','core-academics','Math','math-program','KEEP',3),

  -- Safety & Independence
  ('safety-independence','responding-stop-wait','Safety Commands','safety-commands-program','KEEP',1),

  -- Motor
  ('motor','fine-motor','Fine Motor Skills','fine-motor-skills','KEEP',1),
  ('motor','gross-motor','Gross Motor Skills','gross-motor-skills','KEEP',1)
) AS x(domain_slug, sub_slug, name, prog_slug, action_status, sort_order)
JOIN public.program_domains pd ON pd.slug = x.domain_slug
LEFT JOIN sub s ON s.domain_slug = x.domain_slug AND s.slug = x.sub_slug
ON CONFLICT (domain_id, subdomain_id, slug) DO UPDATE
SET name = EXCLUDED.name, action_status = EXCLUDED.action_status, sort_order = EXCLUDED.sort_order, updated_at = now();

-- =============================================
-- PHASE 9: Seed default objectives for each library program
-- =============================================

INSERT INTO public.library_program_objectives (library_program_id, name, slug, description, sort_order, action_status)
SELECT lp.id, 'Primary Objective', 'primary-objective', 'Default seeded objective', 1, 'ADD'
FROM public.library_programs lp
WHERE NOT EXISTS (
  SELECT 1 FROM public.library_program_objectives o
  WHERE o.library_program_id = lp.id AND o.slug = 'primary-objective'
);

-- =============================================
-- PHASE 10: Seed default targets for each objective
-- =============================================

INSERT INTO public.library_objective_targets (objective_id, name, description, target_type, mastery_criteria, sort_order, action_status)
SELECT o.id, 'Default Target', 'Default seeded target', 'skill_acquisition',
  '{"type":"percent_independent","threshold":80,"consecutive_sessions":3}'::jsonb,
  1, 'ADD'
FROM public.library_program_objectives o
WHERE NOT EXISTS (
  SELECT 1 FROM public.library_objective_targets t
  WHERE t.objective_id = o.id AND t.name = 'Default Target'
);

-- =============================================
-- PHASE 11: Compatibility views
-- =============================================

-- Clean dropdown view (uses program_domains, not legacy domains)
CREATE OR REPLACE VIEW public.v_main_program_domains WITH (security_invoker = on) AS
SELECT id, name, slug, sort_order
FROM public.program_domains
WHERE is_active = true
ORDER BY sort_order, name;

-- Subdomains with domain info
CREATE OR REPLACE VIEW public.v_program_subdomains_full WITH (security_invoker = on) AS
SELECT
  ps.id,
  ps.domain_id,
  pd.name AS domain_name,
  pd.slug AS domain_slug,
  ps.name,
  ps.slug,
  ps.sort_order
FROM public.program_subdomains ps
JOIN public.program_domains pd ON pd.id = ps.domain_id
WHERE ps.is_active = true
  AND pd.is_active = true
ORDER BY pd.sort_order, ps.sort_order;

-- Full library hierarchy
CREATE OR REPLACE VIEW public.v_library_program_hierarchy WITH (security_invoker = on) AS
SELECT
  pd.name AS top_level_domain,
  pd.slug AS top_level_domain_slug,
  ps.name AS subdomain,
  ps.slug AS subdomain_slug,
  lp.id AS library_program_id,
  lp.name AS program_name,
  lp.slug AS program_slug,
  lp.action_status AS program_action_status,
  o.id AS objective_id,
  o.name AS objective_name,
  t.id AS target_id,
  t.name AS target_name,
  t.target_type,
  t.mastery_criteria
FROM public.library_programs lp
JOIN public.program_domains pd ON pd.id = lp.domain_id
LEFT JOIN public.program_subdomains ps ON ps.id = lp.subdomain_id
LEFT JOIN public.library_program_objectives o ON o.library_program_id = lp.id AND o.is_archived = false
LEFT JOIN public.library_objective_targets t ON t.objective_id = o.id AND t.is_archived = false
WHERE lp.is_archived = false
ORDER BY pd.sort_order, ps.sort_order, lp.sort_order, o.sort_order, t.sort_order;
