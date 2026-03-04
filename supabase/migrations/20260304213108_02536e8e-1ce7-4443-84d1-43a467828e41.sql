
-- Create a view for supervision compliance that satellite apps can query
CREATE OR REPLACE VIEW public.v_supervision_compliance
WITH (security_invoker = on)
AS
SELECT
  sr.id AS requirement_id,
  sr.supervisee_user_id,
  sr.supervisor_user_id,
  sr.requirement_type,
  sr.target_percentage,
  sr.billing_period_start,
  sr.billing_period_end,
  sr.is_active,
  COALESCE(p_ee.first_name || ' ' || p_ee.last_name, p_ee.display_name, 'Unknown') AS supervisee_name,
  COALESCE(p_or.first_name || ' ' || p_or.last_name, p_or.display_name, 'Unknown') AS supervisor_name,
  p_ee.credential AS supervisee_credential,
  -- Calculate total supervision hours in the billing period
  COALESCE(
    (SELECT SUM(sl.duration_minutes) / 60.0
     FROM public.supervision_logs sl
     WHERE sl.supervisee_user_id = sr.supervisee_user_id
       AND sl.supervisor_user_id = sr.supervisor_user_id
       AND sl.supervision_date >= sr.billing_period_start
       AND sl.supervision_date <= sr.billing_period_end
       AND sl.status IN ('approved', 'pending')
    ), 0
  ) AS supervision_hours,
  -- Calculate direct/indirect breakdown
  COALESCE(
    (SELECT SUM(sl.duration_minutes) / 60.0
     FROM public.supervision_logs sl
     WHERE sl.supervisee_user_id = sr.supervisee_user_id
       AND sl.supervisor_user_id = sr.supervisor_user_id
       AND sl.supervision_date >= sr.billing_period_start
       AND sl.supervision_date <= sr.billing_period_end
       AND sl.status IN ('approved', 'pending')
       AND sl.supervision_type = 'direct'
    ), 0
  ) AS direct_supervision_hours,
  COALESCE(
    (SELECT SUM(sl.duration_minutes) / 60.0
     FROM public.supervision_logs sl
     WHERE sl.supervisee_user_id = sr.supervisee_user_id
       AND sl.supervisor_user_id = sr.supervisor_user_id
       AND sl.supervision_date >= sr.billing_period_start
       AND sl.supervision_date <= sr.billing_period_end
       AND sl.status IN ('approved', 'pending')
       AND sl.supervision_type = 'indirect'
    ), 0
  ) AS indirect_supervision_hours,
  -- Count total logs
  COALESCE(
    (SELECT COUNT(*)
     FROM public.supervision_logs sl
     WHERE sl.supervisee_user_id = sr.supervisee_user_id
       AND sl.supervisor_user_id = sr.supervisor_user_id
       AND sl.supervision_date >= sr.billing_period_start
       AND sl.supervision_date <= sr.billing_period_end
    ), 0
  ) AS total_logs,
  -- Calculate fieldwork hours
  COALESCE(
    (SELECT SUM(fh.hours)
     FROM public.fieldwork_hours fh
     WHERE fh.trainee_user_id = sr.supervisee_user_id
       AND fh.supervisor_user_id = sr.supervisor_user_id
       AND fh.fieldwork_date >= sr.billing_period_start
       AND fh.fieldwork_date <= sr.billing_period_end
    ), 0
  ) AS total_fieldwork_hours,
  -- Pending approval count
  COALESCE(
    (SELECT COUNT(*)
     FROM public.supervision_logs sl
     WHERE sl.supervisee_user_id = sr.supervisee_user_id
       AND sl.supervisor_user_id = sr.supervisor_user_id
       AND sl.supervision_date >= sr.billing_period_start
       AND sl.supervision_date <= sr.billing_period_end
       AND sl.status = 'pending'
    ), 0
  ) AS pending_approval_count
FROM public.supervision_requirements sr
LEFT JOIN public.profiles p_ee ON p_ee.user_id = sr.supervisee_user_id
LEFT JOIN public.profiles p_or ON p_or.user_id = sr.supervisor_user_id
WHERE sr.is_active = true;

-- Create a view for supervision log details with profile names
CREATE OR REPLACE VIEW public.v_supervision_log_details
WITH (security_invoker = on)
AS
SELECT
  sl.*,
  COALESCE(p_or.first_name || ' ' || p_or.last_name, p_or.display_name) AS supervisor_name,
  COALESCE(p_ee.first_name || ' ' || p_ee.last_name, p_ee.display_name) AS supervisee_name,
  s.first_name || ' ' || s.last_name AS student_name
FROM public.supervision_logs sl
LEFT JOIN public.profiles p_or ON p_or.user_id = sl.supervisor_user_id
LEFT JOIN public.profiles p_ee ON p_ee.user_id = sl.supervisee_user_id
LEFT JOIN public.students s ON s.id = sl.student_id;

-- Enable realtime for messaging tables (if not already)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'staff_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_messages;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'teacher_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.teacher_messages;
  END IF;
END $$;
