CREATE TABLE IF NOT EXISTS public.faq_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  display_order int NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.glossary_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  term text NOT NULL,
  definition text NOT NULL,
  category text NOT NULL DEFAULT 'clinical',
  related_route text,
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.faq_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.glossary_terms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "faq_items_read" ON public.faq_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "glossary_terms_read" ON public.glossary_terms FOR SELECT TO authenticated USING (true);

INSERT INTO public.faq_items (question, answer, category, display_order) VALUES
('What is a narrative note?', 'A narrative note is a flexible, non-session-specific note used for observations, updates, or clinical summaries.', 'Documentation', 1),
('How do teacher inputs reach the clinical team?', 'Teachers submit observations through the Teacher App or Teacher Mode. This data flows into the learner profile and can inform FBAs, session planning, and school consult notes.', 'Cross-App', 2),
('What happens when an authorization expires?', 'The system generates an alert when authorizations are within 30 days of expiry. Billing is blocked for expired authorizations until renewal is processed.', 'Billing', 3),
('How do I review a completed assessment?', 'Navigate to the learner profile → Assessments tab. Completed assessments show scores and can be marked as reviewed by a supervisor.', 'Assessments', 4),
('What is the difference between draft and signed notes?', 'Draft notes are still being edited and cannot be billed. Signed notes are finalized and locked — they become eligible for billing submission.', 'Documentation', 5),
('How does parent training data connect?', 'Caregiver data submitted through Behavior Decoded appears in the learner profile. Parent training notes can reference this data to show how coaching addresses reported behaviors.', 'Cross-App', 6);

INSERT INTO public.glossary_terms (term, definition, category, display_order) VALUES
('FBA', 'Functional Behavior Assessment — a structured process to identify the function of behavior using interviews, observations, and ABC data.', 'Clinical', 1),
('BIP', 'Behavior Intervention Plan — a plan derived from FBA results outlining strategies, supports, and replacement behaviors.', 'Clinical', 2),
('ABC Data', 'Antecedent-Behavior-Consequence recording — a method of documenting what happens before, during, and after a behavior.', 'Clinical', 3),
('Authorization', 'Approval from a payer for a specific number of service units within a defined time period.', 'Billing', 4),
('CPT Code', 'Current Procedural Terminology — standardized codes used to describe medical and behavioral health services for billing.', 'Billing', 5),
('SOAP Note', 'Subjective, Objective, Assessment, Plan — a structured clinical note format.', 'Documentation', 6),
('RBT', 'Registered Behavior Technician — a paraprofessional who implements ABA treatment plans under BCBA supervision.', 'Roles', 7),
('BCBA', 'Board Certified Behavior Analyst — a certified professional who designs and oversees ABA treatment programs.', 'Roles', 8),
('Mastery Criteria', 'The specific performance threshold a learner must meet before a skill is considered mastered.', 'Clinical', 9),
('Generalization', 'The ability to demonstrate a learned skill across different settings, people, and materials.', 'Clinical', 10);