
-- Move Zeppelin's data: reassign specific session_data rows
-- Zeppelin ID: 3f0f81a8-c139-4420-9620-05378077c653

-- 1/8: Non-Compliance 4
UPDATE session_data SET student_id = '3f0f81a8-c139-4420-9620-05378077c653'
WHERE id IN (
  SELECT id FROM session_data
  WHERE timestamp::date = '2026-01-08'
    AND student_id != '3f0f81a8-c139-4420-9620-05378077c653'
    AND behavior_name = 'Non-Compliance/Task Avoidance'
  ORDER BY timestamp LIMIT 4
);

-- 1/8: Vocal Protest 7
UPDATE session_data SET student_id = '3f0f81a8-c139-4420-9620-05378077c653'
WHERE id IN (
  SELECT id FROM session_data
  WHERE timestamp::date = '2026-01-08'
    AND student_id != '3f0f81a8-c139-4420-9620-05378077c653'
    AND behavior_name = 'Vocal Protest'
  ORDER BY timestamp LIMIT 7
);

-- 1/8: Disruptive/Off-Task 4
UPDATE session_data SET student_id = '3f0f81a8-c139-4420-9620-05378077c653'
WHERE id IN (
  SELECT id FROM session_data
  WHERE timestamp::date = '2026-01-08'
    AND student_id != '3f0f81a8-c139-4420-9620-05378077c653'
    AND behavior_name = 'Disruptive/Off-Task'
  ORDER BY timestamp LIMIT 4
);

-- 1/23: Sexualized Communication 4
UPDATE session_data SET student_id = '3f0f81a8-c139-4420-9620-05378077c653'
WHERE id IN (
  SELECT id FROM session_data
  WHERE timestamp::date = '2026-01-23'
    AND student_id != '3f0f81a8-c139-4420-9620-05378077c653'
    AND behavior_name = 'Sexualized Communication'
  ORDER BY timestamp LIMIT 4
);

-- 1/23: Non-Compliance 4
UPDATE session_data SET student_id = '3f0f81a8-c139-4420-9620-05378077c653'
WHERE id IN (
  SELECT id FROM session_data
  WHERE timestamp::date = '2026-01-23'
    AND student_id != '3f0f81a8-c139-4420-9620-05378077c653'
    AND behavior_name = 'Non-Compliance/Task Avoidance'
  ORDER BY timestamp LIMIT 4
);

-- 1/23: Disruptive/Off-Task 3
UPDATE session_data SET student_id = '3f0f81a8-c139-4420-9620-05378077c653'
WHERE id IN (
  SELECT id FROM session_data
  WHERE timestamp::date = '2026-01-23'
    AND student_id != '3f0f81a8-c139-4420-9620-05378077c653'
    AND behavior_name = 'Disruptive/Off-Task'
  ORDER BY timestamp LIMIT 3
);

-- 1/30: Sexualized Communication 2
UPDATE session_data SET student_id = '3f0f81a8-c139-4420-9620-05378077c653'
WHERE id IN (
  SELECT id FROM session_data
  WHERE timestamp::date = '2026-01-30'
    AND student_id != '3f0f81a8-c139-4420-9620-05378077c653'
    AND behavior_name = 'Sexualized Communication'
  ORDER BY timestamp LIMIT 2
);

-- 1/30: Disruptive Audible Behavior 3
UPDATE session_data SET student_id = '3f0f81a8-c139-4420-9620-05378077c653'
WHERE id IN (
  SELECT id FROM session_data
  WHERE timestamp::date = '2026-01-30'
    AND student_id != '3f0f81a8-c139-4420-9620-05378077c653'
    AND behavior_name = 'Disruptive Audible Behavior'
  ORDER BY timestamp LIMIT 3
);

-- 12/17: Sexualized Communication 2
UPDATE session_data SET student_id = '3f0f81a8-c139-4420-9620-05378077c653'
WHERE id IN (
  SELECT id FROM session_data
  WHERE timestamp::date = '2025-12-17'
    AND student_id != '3f0f81a8-c139-4420-9620-05378077c653'
    AND behavior_name = 'Sexualized Communication'
  ORDER BY timestamp LIMIT 2
);

-- 12/17: Disruptive Audible Behavior 4
UPDATE session_data SET student_id = '3f0f81a8-c139-4420-9620-05378077c653'
WHERE id IN (
  SELECT id FROM session_data
  WHERE timestamp::date = '2025-12-17'
    AND student_id != '3f0f81a8-c139-4420-9620-05378077c653'
    AND behavior_name = 'Disruptive Audible Behavior'
  ORDER BY timestamp LIMIT 4
);
