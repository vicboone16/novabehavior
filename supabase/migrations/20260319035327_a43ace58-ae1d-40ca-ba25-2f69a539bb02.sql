
DROP VIEW IF EXISTS public.v_teacher_abc_recent;

CREATE VIEW public.v_classroom_presence_today WITH (security_invoker=on) AS
SELECT DISTINCT ON (cph.student_id)
  cph.classroom_id, cph.student_id, cph.status,
  cph.changed_at, cph.changed_by, cph.agency_id
FROM public.classroom_presence_history cph
WHERE cph.changed_at >= CURRENT_DATE
ORDER BY cph.student_id, cph.changed_at DESC;

CREATE VIEW public.v_beacon_student_reward_summary WITH (security_invoker=on) AS
SELECT
  bpl.student_id, bpl.agency_id,
  SUM(CASE WHEN bpl.points_delta > 0 THEN bpl.points_delta ELSE 0 END) AS total_earned,
  SUM(CASE WHEN bpl.points_delta < 0 THEN ABS(bpl.points_delta) ELSE 0 END) AS total_spent,
  SUM(bpl.points_delta) AS balance,
  COUNT(*) FILTER (WHERE bpl.created_at >= CURRENT_DATE) AS transactions_today,
  COALESCE(SUM(bpl.points_delta) FILTER (WHERE bpl.created_at >= CURRENT_DATE AND bpl.points_delta > 0), 0) AS earned_today,
  COALESCE(SUM(ABS(bpl.points_delta)) FILTER (WHERE bpl.created_at >= CURRENT_DATE AND bpl.points_delta < 0), 0) AS spent_today
FROM public.beacon_points_ledger bpl
GROUP BY bpl.student_id, bpl.agency_id;

CREATE VIEW public.v_teacher_abc_recent WITH (security_invoker=on) AS
SELECT
  tae.event_id AS id, tae.client_id AS student_id,
  tae.antecedent, tae.behavior, tae.consequence,
  tae.intensity, tae.setting, tae.notes,
  tae.occurred_at, tae.agency_id
FROM public.teacher_abc_events tae
WHERE tae.occurred_at >= (CURRENT_DATE - INTERVAL '30 days')
ORDER BY tae.occurred_at DESC;
