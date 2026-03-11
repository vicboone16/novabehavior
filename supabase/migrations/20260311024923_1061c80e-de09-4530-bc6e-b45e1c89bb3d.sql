
-- Populate cl_tags from function_tags and learner_profile arrays across goals and interventions
-- Then map them back

DO $$
DECLARE
  tag_val text;
  tag_uuid uuid;
  r RECORD;
BEGIN
  -- 1. Extract unique function_tags from goals
  FOR tag_val IN
    SELECT DISTINCT unnest(function_tags) FROM cl_goal_library
    UNION
    SELECT DISTINCT unnest(function_tags) FROM cl_intervention_library
  LOOP
    INSERT INTO cl_tags (tag_type, tag_value)
    VALUES ('function', tag_val)
    ON CONFLICT (tag_type, normalized_tag) DO NOTHING;
  END LOOP;

  -- 2. Extract unique learner_profile tags from goals
  FOR tag_val IN
    SELECT DISTINCT unnest(learner_profile) FROM cl_goal_library
    UNION
    SELECT DISTINCT unnest(learner_profile) FROM cl_intervention_library
  LOOP
    INSERT INTO cl_tags (tag_type, tag_value)
    VALUES ('learner_profile', tag_val)
    ON CONFLICT (tag_type, normalized_tag) DO NOTHING;
  END LOOP;

  -- 3. Map goal function_tags
  FOR r IN
    SELECT g.id as goal_id, unnest(g.function_tags) as tv
    FROM cl_goal_library g
  LOOP
    SELECT id INTO tag_uuid FROM cl_tags WHERE tag_type = 'function' AND normalized_tag = lower(trim(r.tv));
    IF tag_uuid IS NOT NULL THEN
      INSERT INTO cl_goal_tag_map (goal_id, tag_id) VALUES (r.goal_id, tag_uuid) ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  -- 4. Map goal learner_profile tags
  FOR r IN
    SELECT g.id as goal_id, unnest(g.learner_profile) as tv
    FROM cl_goal_library g
  LOOP
    SELECT id INTO tag_uuid FROM cl_tags WHERE tag_type = 'learner_profile' AND normalized_tag = lower(trim(r.tv));
    IF tag_uuid IS NOT NULL THEN
      INSERT INTO cl_goal_tag_map (goal_id, tag_id) VALUES (r.goal_id, tag_uuid) ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  -- 5. Map intervention function_tags
  FOR r IN
    SELECT i.id as intervention_id, unnest(i.function_tags) as tv
    FROM cl_intervention_library i
  LOOP
    SELECT id INTO tag_uuid FROM cl_tags WHERE tag_type = 'function' AND normalized_tag = lower(trim(r.tv));
    IF tag_uuid IS NOT NULL THEN
      INSERT INTO cl_intervention_tag_map (intervention_id, tag_id) VALUES (r.intervention_id, tag_uuid) ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  -- 6. Map intervention learner_profile tags
  FOR r IN
    SELECT i.id as intervention_id, unnest(i.learner_profile) as tv
    FROM cl_intervention_library i
  LOOP
    SELECT id INTO tag_uuid FROM cl_tags WHERE tag_type = 'learner_profile' AND normalized_tag = lower(trim(r.tv));
    IF tag_uuid IS NOT NULL THEN
      INSERT INTO cl_intervention_tag_map (intervention_id, tag_id) VALUES (r.intervention_id, tag_uuid) ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END $$;
