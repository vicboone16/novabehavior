
-- Helper: atomically increment authorization units_used.
-- Safe to call concurrently; ignores missing auth IDs.
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

-- Core billing RPC: promotes draft time_entries for a session to
-- session_postings (ready_for_claim), marks entries as posted, and
-- deducts units from the matched authorization.
--
-- p_authorization_id  – override; if NULL, uses student's active default auth
-- p_force_billable    – override is_billable flag on the time_entry
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
  v_uid        uuid := auth.uid();
  v_session    RECORD;
  v_te         RECORD;
  v_auth_id    uuid;
  v_units      integer;
  v_rounded    integer;
  v_billable   boolean;
  v_posted     integer := 0;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO v_session FROM public.sessions WHERE id = p_session_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'session_not_found');
  END IF;

  FOR v_te IN
    SELECT * FROM public.time_entries
    WHERE session_id = p_session_id
      AND status IN ('draft', 'reserved')
  LOOP
    -- Duration in whole minutes
    v_rounded := GREATEST(COALESCE(v_te.duration_minutes,
                                    v_session.session_length_minutes, 0), 0);
    -- 15-minute billing units (ceiling)
    v_units := GREATEST(CEIL(v_rounded::numeric / 15.0)::integer, 1);

    -- Billable flag
    IF p_force_billable IS NOT NULL THEN
      v_billable := p_force_billable;
    ELSE
      v_billable := COALESCE(v_te.is_billable, true);
    END IF;

    -- Resolve authorization: caller override > student's active default
    v_auth_id := p_authorization_id;
    IF v_auth_id IS NULL AND v_te.student_id IS NOT NULL THEN
      SELECT id INTO v_auth_id
      FROM public.authorizations
      WHERE student_id = v_te.student_id
        AND COALESCE(status, 'active') = 'active'
        AND is_default IS TRUE
        AND start_date <= CURRENT_DATE
        AND end_date   >= CURRENT_DATE
      ORDER BY start_date DESC
      LIMIT 1;
    END IF;

    -- Create session_posting (skip if one already exists for this time_entry)
    INSERT INTO public.session_postings (
      session_id, student_id, time_entry_id,
      agency_id, appointment_id,
      cpt_code, modifier,
      minutes, rounded_minutes, units,
      is_billable, post_status,
      posted_by, authorization_id
    )
    SELECT
      p_session_id,
      v_te.student_id,
      v_te.id,
      v_te.agency_id,
      v_session.appointment_id,
      v_te.cpt_code,
      v_te.modifier,
      v_rounded, v_rounded, v_units,
      v_billable,
      'ready_for_claim',
      v_uid,
      v_auth_id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.session_postings
      WHERE time_entry_id = v_te.id
    );

    -- Promote time_entry
    UPDATE public.time_entries
    SET status = 'posted', updated_at = now()
    WHERE id = v_te.id;

    -- Deduct units from authorization
    IF v_auth_id IS NOT NULL AND v_billable AND v_units > 0 THEN
      PERFORM public.increment_authorization_units(v_auth_id, v_units);

      INSERT INTO public.unit_deduction_ledger (
        session_id, authorization_id, student_id,
        units_deducted, deduction_reason, performed_by
      ) VALUES (
        p_session_id, v_auth_id, v_te.student_id,
        v_units, 'auto', v_uid
      );
    END IF;

    v_posted := v_posted + 1;
  END LOOP;

  -- Reflect new billing status on session
  UPDATE public.sessions
  SET billing_status = 'billable', updated_at = now()
  WHERE id = p_session_id;

  RETURN jsonb_build_object(
    'ok', true,
    'session_id', p_session_id,
    'entries_posted', v_posted
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_finalize_and_post_session(uuid, uuid, boolean) TO authenticated;

NOTIFY pgrst, 'reload schema';
