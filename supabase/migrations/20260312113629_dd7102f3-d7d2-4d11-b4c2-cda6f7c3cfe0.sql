
-- 1. Create crosswalk tables
CREATE TABLE IF NOT EXISTS public.clinical_crosswalk_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_category text NOT NULL,
  system_name text NOT NULL,
  tag_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tag_category, system_name, tag_name)
);

ALTER TABLE public.clinical_crosswalk_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read" ON public.clinical_crosswalk_tags FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.clinical_goal_crosswalk (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES public.clinical_curricula_goals(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.clinical_crosswalk_tags(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (goal_id, tag_id)
);

ALTER TABLE public.clinical_goal_crosswalk ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read" ON public.clinical_goal_crosswalk FOR SELECT TO authenticated USING (true);

-- 2. Insert crosswalk tags
INSERT INTO public.clinical_crosswalk_tags (tag_category, system_name, tag_name) VALUES
  ('curriculum', 'VB-MAPP', 'Mand'),
  ('curriculum', 'VB-MAPP', 'Early Manding'),
  ('curriculum', 'VB-MAPP', 'Mand Generalization'),
  ('curriculum', 'VB-MAPP', 'Spontaneous Manding'),
  ('curriculum', 'VB-MAPP', 'Mand Discrimination'),
  ('curriculum', 'VB-MAPP', 'Expanded Manding'),
  ('curriculum', 'VB-MAPP', 'Phrase-Length Requesting'),
  ('curriculum', 'VB-MAPP', 'Early Intraverbal'),
  ('curriculum', 'VB-MAPP', 'Tact'),
  ('curriculum', 'VB-MAPP', 'Social Language'),
  ('curriculum', 'ABLLS-R', 'Requests'),
  ('curriculum', 'ABLLS-R', 'Discrimination'),
  ('curriculum', 'ABLLS-R', 'Sentence Requests'),
  ('curriculum', 'ABLLS-R', 'Question Responding'),
  ('curriculum', 'ABLLS-R', 'Social Communication'),
  ('curriculum', 'AFLS', 'Basic Communication'),
  ('curriculum', 'AFLS', 'Functional Communication'),
  ('curriculum', 'AFLS', 'Communication'),
  ('curriculum', 'AFLS', 'Social Interaction')
ON CONFLICT DO NOTHING;

-- 3. Remove existing PECS functional-area goals & benchmarks (replace with phase-based)
DELETE FROM public.clinical_curricula_benchmarks WHERE goal_id IN (
  SELECT id FROM public.clinical_curricula_goals WHERE domain_id = 'b7c8bca6-34f7-4562-949a-8eb30bb25ae5'
);
DELETE FROM public.clinical_curricula_goals WHERE domain_id = 'b7c8bca6-34f7-4562-949a-8eb30bb25ae5';

-- 4. Insert PECS phase-based goals
INSERT INTO public.clinical_curricula_goals (id, domain_id, key, title, clinical_goal, objective_text, skill_tags, setting_tags, sort_order, benchmark_count, is_active) VALUES
  ('a1000001-0001-4000-8000-000000000001', 'b7c8bca6-34f7-4562-949a-8eb30bb25ae5', 'pecs-phase1', 'PECS Phase 1 – Physical Exchange',
   'Learner picks up a picture and hands it to a communication partner to request a desired item.',
   'Given a single picture and a highly preferred item, learner independently initiates exchange within 5 seconds across 80% of opportunities over 3 consecutive sessions.',
   ARRAY['modality:pecs','function:requesting','access:low-tech','phase:1'], ARRAY['clinic','home','school','community'], 1, 5, true),

  ('a1000001-0001-4000-8000-000000000002', 'b7c8bca6-34f7-4562-949a-8eb30bb25ae5', 'pecs-phase2', 'PECS Phase 2 – Distance and Persistence',
   'Learner travels to the communication book, retrieves a picture, and exchanges it with a partner at increasing distances.',
   'Learner independently travels to book and partner across varying distances (up to 15 ft) and exchanges picture in 80% of opportunities over 3 sessions.',
   ARRAY['modality:pecs','function:requesting','access:low-tech','phase:2'], ARRAY['clinic','home','school','community'], 2, 5, true),

  ('a1000001-0001-4000-8000-000000000003', 'b7c8bca6-34f7-4562-949a-8eb30bb25ae5', 'pecs-phase3', 'PECS Phase 3 – Picture Discrimination',
   'Learner discriminates between pictures to select the one representing the desired item.',
   'Given an array of 5+ pictures, learner selects the correct picture and exchanges it for the corresponding item in 80% of opportunities across 3 sessions.',
   ARRAY['modality:pecs','function:requesting','function:discrimination','access:low-tech','phase:3'], ARRAY['clinic','home','school'], 3, 5, true),

  ('a1000001-0001-4000-8000-000000000004', 'b7c8bca6-34f7-4562-949a-8eb30bb25ae5', 'pecs-phase4', 'PECS Phase 4 – Sentence Structure',
   'Learner constructs a sentence strip ("I want ___") to make requests.',
   'Learner independently constructs and exchanges a sentence strip with "I want" + item picture in 80% of opportunities over 3 sessions, with verbal model provided by partner.',
   ARRAY['modality:pecs','function:requesting','function:sentence-construction','access:low-tech','phase:4'], ARRAY['clinic','home','school'], 4, 5, true),

  ('a1000001-0001-4000-8000-000000000005', 'b7c8bca6-34f7-4562-949a-8eb30bb25ae5', 'pecs-phase5', 'PECS Phase 5 – Responding to Questions',
   'Learner responds to "What do you want?" by constructing a sentence strip.',
   'When asked "What do you want?", learner constructs and exchanges sentence strip within 5 seconds in 80% of opportunities across 3 sessions.',
   ARRAY['modality:pecs','function:requesting','function:responding','access:low-tech','phase:5'], ARRAY['clinic','home','school'], 5, 5, true),

  ('a1000001-0001-4000-8000-000000000006', 'b7c8bca6-34f7-4562-949a-8eb30bb25ae5', 'pecs-phase6', 'PECS Phase 6 – Commenting',
   'Learner uses pictures to comment on items and events in the environment.',
   'Learner spontaneously comments using "I see/hear/feel" + picture in response to environmental stimuli in 80% of opportunities across 3 sessions.',
   ARRAY['modality:pecs','function:commenting','function:social-communication','access:low-tech','phase:6'], ARRAY['clinic','home','school','community'], 6, 5, true);

-- 5. Insert benchmarks for each PECS phase
INSERT INTO public.clinical_curricula_benchmarks (goal_id, benchmark_order, benchmark_text) VALUES
  -- Phase 1
  ('a1000001-0001-4000-8000-000000000001', 1, 'Learner picks up picture with full physical prompt and releases into partner''s open hand.'),
  ('a1000001-0001-4000-8000-000000000001', 2, 'Learner picks up picture with partial physical prompt (wrist/elbow) and exchanges.'),
  ('a1000001-0001-4000-8000-000000000001', 3, 'Learner independently picks up picture and exchanges without physical prompts.'),
  ('a1000001-0001-4000-8000-000000000001', 4, 'Learner exchanges picture across 3+ different reinforcers.'),
  ('a1000001-0001-4000-8000-000000000001', 5, 'Learner exchanges independently with 2+ communication partners.'),
  -- Phase 2
  ('a1000001-0001-4000-8000-000000000002', 1, 'Learner travels 3 feet to exchange picture with stationary partner.'),
  ('a1000001-0001-4000-8000-000000000002', 2, 'Learner travels 6–8 feet to partner to complete exchange.'),
  ('a1000001-0001-4000-8000-000000000002', 3, 'Learner retrieves picture from communication book within arm''s reach and exchanges.'),
  ('a1000001-0001-4000-8000-000000000002', 4, 'Learner travels to communication book (5+ ft away), retrieves picture, and exchanges.'),
  ('a1000001-0001-4000-8000-000000000002', 5, 'Learner persists by tapping partner or following when partner turns away.'),
  -- Phase 3
  ('a1000001-0001-4000-8000-000000000003', 1, 'Learner discriminates preferred vs blank/non-preferred with 80% accuracy.'),
  ('a1000001-0001-4000-8000-000000000003', 2, 'Learner discriminates between 2 preferred items with correspondence check.'),
  ('a1000001-0001-4000-8000-000000000003', 3, 'Learner discriminates between 3–4 pictures with 80% accuracy.'),
  ('a1000001-0001-4000-8000-000000000003', 4, 'Learner discriminates from array of 5+ pictures.'),
  ('a1000001-0001-4000-8000-000000000003', 5, 'Learner scans full communication book page to locate target picture.'),
  -- Phase 4
  ('a1000001-0001-4000-8000-000000000004', 1, 'Learner places "I want" icon on sentence strip with physical guidance.'),
  ('a1000001-0001-4000-8000-000000000004', 2, 'Learner independently places "I want" + item picture on strip and exchanges.'),
  ('a1000001-0001-4000-8000-000000000004', 3, 'Learner points to each icon on strip while partner reads aloud.'),
  ('a1000001-0001-4000-8000-000000000004', 4, 'Learner adds attribute pictures (color, size) to sentence strip.'),
  ('a1000001-0001-4000-8000-000000000004', 5, 'Learner constructs 3+ word sentences using strip across varied contexts.'),
  -- Phase 5
  ('a1000001-0001-4000-8000-000000000005', 1, 'Learner responds to "What do you want?" with 0-second delay prompt.'),
  ('a1000001-0001-4000-8000-000000000005', 2, 'Learner responds to "What do you want?" with 2-second delay.'),
  ('a1000001-0001-4000-8000-000000000005', 3, 'Learner responds independently to "What do you want?" without delay prompt.'),
  ('a1000001-0001-4000-8000-000000000005', 4, 'Learner discriminates between spontaneous requests and responding to questions.'),
  ('a1000001-0001-4000-8000-000000000005', 5, 'Learner responds to "What do you want?" across 3+ environments.'),
  -- Phase 6
  ('a1000001-0001-4000-8000-000000000006', 1, 'Learner uses "I see" + picture to comment on visible item with prompt.'),
  ('a1000001-0001-4000-8000-000000000006', 2, 'Learner independently uses "I see" + picture to comment.'),
  ('a1000001-0001-4000-8000-000000000006', 3, 'Learner uses "I hear" or "I feel" sentence starters to comment.'),
  ('a1000001-0001-4000-8000-000000000006', 4, 'Learner spontaneously comments without adult prompt across 3+ contexts.'),
  ('a1000001-0001-4000-8000-000000000006', 5, 'Learner discriminates between requesting and commenting within same interaction.');

-- 6. Insert crosswalk mapping: Phase 1 → VB-MAPP Mand
INSERT INTO public.clinical_goal_crosswalk (goal_id, tag_id)
SELECT 'a1000001-0001-4000-8000-000000000001'::uuid, t.id
FROM public.clinical_crosswalk_tags t
WHERE t.system_name = 'VB-MAPP' AND t.tag_name = 'Mand'
ON CONFLICT DO NOTHING;

-- Additional crosswalk mappings for remaining phases
INSERT INTO public.clinical_goal_crosswalk (goal_id, tag_id)
SELECT 'a1000001-0001-4000-8000-000000000002'::uuid, t.id
FROM public.clinical_crosswalk_tags t
WHERE (t.system_name = 'VB-MAPP' AND t.tag_name = 'Early Manding')
   OR (t.system_name = 'ABLLS-R' AND t.tag_name = 'Requests')
   OR (t.system_name = 'AFLS' AND t.tag_name = 'Basic Communication')
ON CONFLICT DO NOTHING;

INSERT INTO public.clinical_goal_crosswalk (goal_id, tag_id)
SELECT 'a1000001-0001-4000-8000-000000000003'::uuid, t.id
FROM public.clinical_crosswalk_tags t
WHERE (t.system_name = 'VB-MAPP' AND t.tag_name = 'Mand Discrimination')
   OR (t.system_name = 'ABLLS-R' AND t.tag_name = 'Discrimination')
ON CONFLICT DO NOTHING;

INSERT INTO public.clinical_goal_crosswalk (goal_id, tag_id)
SELECT 'a1000001-0001-4000-8000-000000000004'::uuid, t.id
FROM public.clinical_crosswalk_tags t
WHERE (t.system_name = 'VB-MAPP' AND t.tag_name = 'Phrase-Length Requesting')
   OR (t.system_name = 'ABLLS-R' AND t.tag_name = 'Sentence Requests')
ON CONFLICT DO NOTHING;

INSERT INTO public.clinical_goal_crosswalk (goal_id, tag_id)
SELECT 'a1000001-0001-4000-8000-000000000005'::uuid, t.id
FROM public.clinical_crosswalk_tags t
WHERE (t.system_name = 'VB-MAPP' AND t.tag_name = 'Early Intraverbal')
   OR (t.system_name = 'ABLLS-R' AND t.tag_name = 'Question Responding')
ON CONFLICT DO NOTHING;

INSERT INTO public.clinical_goal_crosswalk (goal_id, tag_id)
SELECT 'a1000001-0001-4000-8000-000000000006'::uuid, t.id
FROM public.clinical_crosswalk_tags t
WHERE (t.system_name = 'VB-MAPP' AND t.tag_name = 'Tact')
   OR (t.system_name = 'VB-MAPP' AND t.tag_name = 'Social Language')
   OR (t.system_name = 'ABLLS-R' AND t.tag_name = 'Social Communication')
   OR (t.system_name = 'AFLS' AND t.tag_name = 'Social Interaction')
ON CONFLICT DO NOTHING;
