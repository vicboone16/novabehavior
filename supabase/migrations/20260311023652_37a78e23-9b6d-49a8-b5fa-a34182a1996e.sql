
-- Auto-generate 3 steps for all mastery interventions missing steps
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT i.id, i.intervention_code, i.category, i.title
    FROM cl_intervention_library i
    JOIN cl_libraries l ON l.id = i.library_id
    WHERE l.slug = 'mastery_interventions'
    AND (SELECT count(*) FROM cl_intervention_steps s WHERE s.intervention_id = i.id) = 0
    ORDER BY i.intervention_code
  LOOP
    INSERT INTO cl_intervention_steps (intervention_id, step_order, step_text)
    VALUES
      (r.id, 1, 'Identify the appropriate time and context to implement ' || r.title || '.'),
      (r.id, 2, 'Implement the strategy consistently as described in the protocol.'),
      (r.id, 3, 'Monitor learner response and adjust intensity or frequency as needed.')
    ON CONFLICT (intervention_id, step_order) DO NOTHING;
  END LOOP;
END $$;
