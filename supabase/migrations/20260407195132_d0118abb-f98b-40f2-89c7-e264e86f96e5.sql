
-- Create missing behavior_bank_entries with created_by set to Victoria's user ID
INSERT INTO behavior_bank_entries (id, agency_id, entry_type, behavior_id, name, category, is_global, created_by, created_at, updated_at)
VALUES
  ('215902f7-6e73-4b1c-b9cf-40a7b62f26ed', '8c64165c-bb56-465b-b981-a165f356a870', 'custom', 'task-avoidance', 'Non-Compliance/Task Avoidance', 'externalizing', false, '98e3f44c-895e-44bd-b79e-d5c7b85a9f1a', now(), now()),
  ('c8c2ada4-831c-482d-b666-41720479a8f6', '8c64165c-bb56-465b-b981-a165f356a870', 'custom', 'off-task', 'Disruptive/Off-Task', 'externalizing', false, '98e3f44c-895e-44bd-b79e-d5c7b85a9f1a', now(), now())
ON CONFLICT (id) DO NOTHING;

-- Now add all 4 missing behaviors to Ruben's student_behavior_map
INSERT INTO student_behavior_map (student_id, behavior_entry_id, behavior_domain, behavior_subtype, active)
VALUES
  ('41d5747c-af52-4a05-847e-c553d0fbfdec', '1666bf93-71ed-4191-af6e-909050f6638f', 'externalizing', 'Inappropriate Language', true),
  ('41d5747c-af52-4a05-847e-c553d0fbfdec', '215902f7-6e73-4b1c-b9cf-40a7b62f26ed', 'externalizing', 'Non-Compliance/Task Avoidance', true),
  ('41d5747c-af52-4a05-847e-c553d0fbfdec', '0a629833-028e-4b66-bfd8-e0a35a08fab4', 'externalizing', 'Non-Compliance/Task Refusal', true),
  ('41d5747c-af52-4a05-847e-c553d0fbfdec', 'c8c2ada4-831c-482d-b666-41720479a8f6', 'externalizing', 'Disruptive/Off-Task', true)
ON CONFLICT DO NOTHING;
