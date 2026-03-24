
-- First create the missing behaviors in the behaviors table
INSERT INTO behaviors (id, name) VALUES
  ('4ad8b0bf-561c-427d-ba0b-7f4669493c44', 'Disruption'),
  ('1666bf93-71ed-4191-af6e-909050f6638f', 'Inappropriate Language'),
  ('0a629833-028e-4b66-bfd8-e0a35a08fab4', 'Noncompliance'),
  ('944d87b5-407e-4ec1-a536-d4891a7d79bb', 'Defiance')
ON CONFLICT (id) DO NOTHING;

-- Now insert behavior_session_data for Zeppelin
INSERT INTO behavior_session_data (id, session_id, student_id, behavior_id, data_state, frequency, created_at)
VALUES
  -- 12/17: Disruptive Audible 4
  (gen_random_uuid(), 'b4849b79-689b-47c8-a8c4-217a7b998aef', '3f0f81a8-c139-4420-9620-05378077c653', '4ad8b0bf-561c-427d-ba0b-7f4669493c44', 'measured', 4, '2025-12-17T12:00:00+00'),
  -- 12/17: Sexualized Communication 2
  (gen_random_uuid(), 'b4849b79-689b-47c8-a8c4-217a7b998aef', '3f0f81a8-c139-4420-9620-05378077c653', '1666bf93-71ed-4191-af6e-909050f6638f', 'measured', 2, '2025-12-17T12:00:00+00'),
  -- 1/8: Non-Compliance 4
  (gen_random_uuid(), '6b650520-91fa-44a8-9183-95b8cb81290f', '3f0f81a8-c139-4420-9620-05378077c653', '0a629833-028e-4b66-bfd8-e0a35a08fab4', 'measured', 4, '2026-01-08T12:00:00+00'),
  -- 1/8: Vocal Protest 7 (mapped to Defiance)
  (gen_random_uuid(), '6b650520-91fa-44a8-9183-95b8cb81290f', '3f0f81a8-c139-4420-9620-05378077c653', '944d87b5-407e-4ec1-a536-d4891a7d79bb', 'measured', 7, '2026-01-08T12:00:00+00'),
  -- 1/8: Disruptive/Off-Task 4
  (gen_random_uuid(), '6b650520-91fa-44a8-9183-95b8cb81290f', '3f0f81a8-c139-4420-9620-05378077c653', '4ad8b0bf-561c-427d-ba0b-7f4669493c44', 'measured', 4, '2026-01-08T12:00:00+00'),
  -- 1/23: Sexualized Communication 4
  (gen_random_uuid(), '934137c3-89f5-456d-976e-26188e7b250c', '3f0f81a8-c139-4420-9620-05378077c653', '1666bf93-71ed-4191-af6e-909050f6638f', 'measured', 4, '2026-01-23T12:00:00+00'),
  -- 1/23: Non-Compliance 4
  (gen_random_uuid(), '934137c3-89f5-456d-976e-26188e7b250c', '3f0f81a8-c139-4420-9620-05378077c653', '0a629833-028e-4b66-bfd8-e0a35a08fab4', 'measured', 4, '2026-01-23T12:00:00+00'),
  -- 1/23: Disruptive/Off-Task 3
  (gen_random_uuid(), '934137c3-89f5-456d-976e-26188e7b250c', '3f0f81a8-c139-4420-9620-05378077c653', '4ad8b0bf-561c-427d-ba0b-7f4669493c44', 'measured', 3, '2026-01-23T12:00:00+00'),
  -- 1/30: Sexualized Communication 2
  (gen_random_uuid(), '33f70876-1dcb-4b36-ae03-4dd17162586b', '3f0f81a8-c139-4420-9620-05378077c653', '1666bf93-71ed-4191-af6e-909050f6638f', 'measured', 2, '2026-01-30T12:00:00+00'),
  -- 1/30: Disruptive Audible 3
  (gen_random_uuid(), '33f70876-1dcb-4b36-ae03-4dd17162586b', '3f0f81a8-c139-4420-9620-05378077c653', '4ad8b0bf-561c-427d-ba0b-7f4669493c44', 'measured', 3, '2026-01-30T12:00:00+00');
