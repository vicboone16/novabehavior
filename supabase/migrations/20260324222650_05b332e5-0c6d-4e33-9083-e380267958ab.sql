
-- ============================================================
-- STEP 1: Deduplicate shared session_ids  
-- ============================================================
DO $$
DECLARE
  shared_sid uuid;
  stud_id uuid;
  new_sid uuid;
  orig_start timestamptz;
  orig_end timestamptz;
  orig_user uuid;
  is_first boolean;
BEGIN
  FOR shared_sid IN 
    SELECT session_id FROM session_data GROUP BY session_id 
    HAVING COUNT(DISTINCT student_id) > 1
  LOOP
    SELECT user_id, start_time, end_time INTO orig_user, orig_start, orig_end
    FROM sessions WHERE id = shared_sid;
    
    IF orig_user IS NULL THEN CONTINUE; END IF;
    
    is_first := true;
    FOR stud_id IN 
      SELECT DISTINCT student_id FROM session_data WHERE session_id = shared_sid ORDER BY student_id
    LOOP
      IF is_first THEN
        is_first := false;
      ELSE
        new_sid := gen_random_uuid();
        INSERT INTO sessions (id, user_id, name, start_time, end_time, session_length_minutes, interval_length_seconds, student_ids, status)
        VALUES (new_sid, orig_user, 'Historical Session', orig_start, COALESCE(orig_end, orig_start + interval '1 hour'), 60, 15, ARRAY[stud_id], 'ended');
        UPDATE session_data SET session_id = new_sid WHERE session_id = shared_sid AND student_id = stud_id;
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- ============================================================
-- STEP 2: Normalize behavior_ids for ALL students using name matching
-- Map behavior_name → canonical behavior_entry_id from student_behavior_map
-- ============================================================

-- Disruptive Audible Behavior / Disruptive/Off-Task → student's Disruption/disruptive mapping
UPDATE session_data sd
SET behavior_id = sbm.behavior_entry_id::text
FROM student_behavior_map sbm
WHERE sd.student_id = sbm.student_id
  AND lower(sbm.behavior_subtype) IN ('disruption', 'disruptive')
  AND (sd.behavior_name ILIKE '%disruptive%' OR sd.behavior_name ILIKE '%off-task%')
  AND sd.behavior_id != sbm.behavior_entry_id::text;

-- Sexualized Communication → Inappropriate Language
UPDATE session_data sd
SET behavior_id = sbm.behavior_entry_id::text
FROM student_behavior_map sbm
WHERE sd.student_id = sbm.student_id
  AND lower(sbm.behavior_subtype) IN ('inappropriate language')
  AND sd.behavior_name ILIKE '%sexual%'
  AND sd.behavior_id != sbm.behavior_entry_id::text;

-- Non-Compliance/Task Avoidance / Vocal Protest / Defiance → Noncompliance/Task Refusal
UPDATE session_data sd
SET behavior_id = sbm.behavior_entry_id::text
FROM student_behavior_map sbm
WHERE sd.student_id = sbm.student_id
  AND lower(sbm.behavior_subtype) IN ('noncompliance', 'task refusal')
  AND (sd.behavior_name ILIKE '%non-compliance%' OR sd.behavior_name ILIKE '%noncompliance%' 
       OR sd.behavior_name ILIKE '%task avoidance%' OR sd.behavior_name ILIKE '%vocal protest%'
       OR sd.behavior_name ILIKE '%defiance%')
  AND sd.behavior_id != sbm.behavior_entry_id::text;

-- Physical Aggression
UPDATE session_data sd
SET behavior_id = sbm.behavior_entry_id::text
FROM student_behavior_map sbm
WHERE sd.student_id = sbm.student_id
  AND lower(sbm.behavior_subtype) = 'physical aggression'
  AND sd.behavior_name ILIKE '%physical aggression%'
  AND sd.behavior_id != sbm.behavior_entry_id::text;

-- Property Destruction
UPDATE session_data sd
SET behavior_id = sbm.behavior_entry_id::text
FROM student_behavior_map sbm
WHERE sd.student_id = sbm.student_id
  AND lower(sbm.behavior_subtype) = 'property destruction'
  AND sd.behavior_name ILIKE '%property destruct%'
  AND sd.behavior_id != sbm.behavior_entry_id::text;

-- Verbal Aggression
UPDATE session_data sd
SET behavior_id = sbm.behavior_entry_id::text
FROM student_behavior_map sbm
WHERE sd.student_id = sbm.student_id
  AND lower(sbm.behavior_subtype) = 'verbal aggression'
  AND sd.behavior_name ILIKE '%verbal aggress%'
  AND sd.behavior_id != sbm.behavior_entry_id::text;

-- Elopement
UPDATE session_data sd
SET behavior_id = sbm.behavior_entry_id::text
FROM student_behavior_map sbm
WHERE sd.student_id = sbm.student_id
  AND lower(sbm.behavior_subtype) = 'elopement'
  AND sd.behavior_name ILIKE '%elopement%'
  AND sd.behavior_id != sbm.behavior_entry_id::text;

-- Tantrum
UPDATE session_data sd
SET behavior_id = sbm.behavior_entry_id::text
FROM student_behavior_map sbm
WHERE sd.student_id = sbm.student_id
  AND lower(sbm.behavior_subtype) = 'tantrum'
  AND sd.behavior_name ILIKE '%tantrum%'
  AND sd.behavior_id != sbm.behavior_entry_id::text;

-- Motor Stereotypy  
UPDATE session_data sd
SET behavior_id = sbm.behavior_entry_id::text
FROM student_behavior_map sbm
WHERE sd.student_id = sbm.student_id
  AND lower(sbm.behavior_subtype) ILIKE '%stereotyp%'
  AND sd.behavior_name ILIKE '%stereotyp%'
  AND sd.behavior_id != sbm.behavior_entry_id::text;

-- Unsafe Behavior
UPDATE session_data sd
SET behavior_id = sbm.behavior_entry_id::text
FROM student_behavior_map sbm
WHERE sd.student_id = sbm.student_id
  AND lower(sbm.behavior_subtype) = 'unsafe behavior'
  AND sd.behavior_name ILIKE '%unsafe%'
  AND sd.behavior_id != sbm.behavior_entry_id::text;

-- Peer Conflict
UPDATE session_data sd
SET behavior_id = sbm.behavior_entry_id::text
FROM student_behavior_map sbm
WHERE sd.student_id = sbm.student_id
  AND lower(sbm.behavior_subtype) = 'peer conflict'
  AND sd.behavior_name ILIKE '%peer conflict%'
  AND sd.behavior_id != sbm.behavior_entry_id::text;

-- ============================================================
-- STEP 3: Rebuild behavior_session_data for ALL students
-- Only insert rows where behavior_id exists in behaviors table
-- ============================================================
DELETE FROM behavior_session_data;

INSERT INTO behavior_session_data (id, session_id, student_id, behavior_id, frequency, duration_seconds, data_state, created_at)
SELECT 
  gen_random_uuid(),
  sd.session_id,
  sd.student_id,
  sd.behavior_id::uuid,
  COUNT(*) FILTER (WHERE sd.event_type = 'frequency')::int,
  COALESCE(SUM(sd.duration_seconds) FILTER (WHERE sd.event_type = 'duration'), 0)::int,
  'measured',
  MIN(sd.created_at)
FROM session_data sd
INNER JOIN behaviors b ON b.id = sd.behavior_id::uuid
WHERE sd.behavior_id IS NOT NULL
  AND sd.behavior_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND sd.event_type IN ('frequency', 'duration')
GROUP BY sd.session_id, sd.student_id, sd.behavior_id;
