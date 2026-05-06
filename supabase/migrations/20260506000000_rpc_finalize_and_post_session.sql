
CREATE OR REPLACE FUNCTION public.increment_authorization_units(
  p_authorization_id uuid,
  p_units integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.authorizations
  SET units_used = units_used + p_units,
      updated_at = now()
  WHERE id = p_authorization_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_authorization_units(uuid, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.rpc_finalize_and_post_session(
  p_session_id        uuid,
  p_authorization_id  uuid    DEFAULT NULL,
  p_force_billable    boolean DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_uid      uuid := auth.uid();
  rec_session     RECORD;
  rec_entry       RECORD;
  resolved_auth   uuid;
  unit_count      integer;
  minute_count    integer;
  billable_flag   boolean;
  posted_count    integer := 0;
BEGIN
  IF caller_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO rec_session FROM public.sessions WHERE id = p_session_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'session_not_found');
  END IF;

  FOR rec_entry IN
    SELECT * FROM public.time_entries
    WHERE session_id = p_session_id
      AND status IN ('draft', 'reserved')
  LOOP
    minute_count := GREATEST(COALESCE(rec_entry.duration_minutes, rec_session.session_length_minutes, 0), 0);
    unit_count   := GREATEST(CEIL(minute_count::numeric / 15.0)::integer, 1);

    IF p_force_billable IS NOT NULL THEN
      billable_flag := p_force_billable;
    ELSE
      billable_flag := COALESCE(rec_entry.is_billable, true);
    END IF;

    resolved_auth := p_authorization_id;
    IF resolved_auth IS NULL AND rec_entry.student_id IS NOT NULL THEN
      SELECT id INTO resolved_auth
      FROM public.authorizations
      WHERE student_id = rec_entry.student_id
        AND COALESCE(status, 'active') = 'active'
        AND is_default IS TRUE
        AND start_date <= CURRENT_DATE
        AND end_date   >= CURRENT_DATE
      ORDER BY start_date DESC
      LIMIT 1;
    END IF;

    INSERT INTO public.session_postings (
      session_id,
      student_id,
      time_entry_id,
      agency_id,
      appointment_id,
      cpt_code,
      modifier,
      minutes,
      rounded_minutes,
      units,
      is_billable,
      post_status,
      posted_by,
      authorization_id
    )
    SELECT
      p_session_id,
      rec_entry.student_id,
      rec_entry.id,
      rec_entry.agency_id,
      rec_session.appointment_id,
      rec_entry.cpt_code,
      rec_entry.modifier,
      minute_count,
      minute_count,
      unit_count,
      billable_flag,
      'ready_for_claim',
      caller_uid,
      resolved_auth
    WHERE NOT EXISTS (
      SELECT 1 FROM public.session_postings sp2
      WHERE sp2.time_entry_id = rec_entry.id
    );

    UPDATE public.time_entries
    SET status = 'posted', updated_at = now()
    WHERE id = rec_entry.id;

    IF resolved_auth IS NOT NULL AND billable_flag AND unit_count > 0 THEN
      PERFORM public.increment_authorization_units(resolved_auth, unit_count);

      INSERT INTO public.unit_deduction_ledger (
        session_id,
        authorization_id,
        student_id,
        units_deducted,
        deduction_reason,
        performed_by
      ) VALUES (
        p_session_id,
        resolved_auth,
        rec_entry.student_id,
        unit_count,
        'auto',
        caller_uid
      );
    END IF;

    posted_count := posted_count + 1;
  END LOOP;

  UPDATE public.sessions
  SET billing_status = 'billable', updated_at = now()
  WHERE id = p_session_id;

  RETURN jsonb_build_object(
    'ok', true,
    'session_id', p_session_id,
    'entries_posted', posted_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_finalize_and_post_session(uuid, uuid, boolean) TO authenticated;

NOTIFY pgrst, 'reload schema';
