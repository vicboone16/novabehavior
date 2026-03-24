-- Ensure Physical Aggression behavior exists in behaviors table
INSERT INTO public.behaviors (id, name, description)
VALUES ('347fad3e-b1a2-43d8-a079-efc37bae8c8f', 'Physical Aggression', 'Any instance of hitting, kicking, biting, scratching, or throwing objects at another person')
ON CONFLICT (id) DO NOTHING;

-- Insert sessions and behavior data for Ranger Dan
DO $$
DECLARE
  uid uuid := '98d214f1-7375-40ac-a905-579fa805d739';
  sid uuid := 'bdbfeb6d-b66a-4bf5-998c-5711aea2bb5c';
  bid uuid := '347fad3e-b1a2-43d8-a079-efc37bae8c8f';
  dates timestamptz[] := ARRAY[
    '2026-03-10 09:30:00+00','2026-03-11 10:00:00+00','2026-03-12 09:45:00+00',
    '2026-03-13 11:00:00+00','2026-03-14 10:30:00+00','2026-03-17 09:15:00+00',
    '2026-03-18 10:45:00+00','2026-03-19 09:00:00+00','2026-03-20 11:30:00+00',
    '2026-03-21 10:00:00+00','2026-03-24 09:30:00+00'
  ];
  freqs int[] := ARRAY[3,5,2,7,4,1,6,3,4,2,5];
  i int;
  sess_id uuid;
BEGIN
  FOR i IN 1..array_length(dates, 1) LOOP
    sess_id := gen_random_uuid();
    INSERT INTO public.sessions (id, user_id, name, start_time, end_time, session_length_minutes, interval_length_seconds, student_ids, status, student_id, started_at, ended_at, created_at)
    VALUES (sess_id, uid, 'Ranger Dan Session', dates[i], dates[i] + interval '60 minutes', 60, 30, ARRAY[sid], 'ended', sid, dates[i], dates[i] + interval '60 minutes', dates[i]);
    
    INSERT INTO public.behavior_session_data (session_id, student_id, behavior_id, data_state, frequency, created_at)
    VALUES (sess_id, sid, bid, 'measured', freqs[i], dates[i]);
  END LOOP;
END $$