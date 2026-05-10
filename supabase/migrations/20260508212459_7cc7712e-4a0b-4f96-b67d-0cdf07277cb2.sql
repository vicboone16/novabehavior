
-- Drafts table for multi-student session resume
CREATE TABLE public.multi_student_session_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  session_id uuid NOT NULL,
  chosen_students jsonb NOT NULL DEFAULT '[]'::jsonb,
  chosen_behaviors jsonb NOT NULL DEFAULT '{}'::jsonb,
  configs jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, session_id)
);

ALTER TABLE public.multi_student_session_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "drafts_select_own" ON public.multi_student_session_drafts
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "drafts_insert_own" ON public.multi_student_session_drafts
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "drafts_update_own" ON public.multi_student_session_drafts
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "drafts_delete_own" ON public.multi_student_session_drafts
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE INDEX idx_msd_user_updated ON public.multi_student_session_drafts (user_id, updated_at DESC);

CREATE TRIGGER trg_msd_touch
  BEFORE UPDATE ON public.multi_student_session_drafts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helper: atomically increment authorization units_used.
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
  SET units_used = COALESCE(units_used, 0) + p_units,
      updated_at = now()
  WHERE id = p_authorization_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_authorization_units(uuid, integer) TO authenticated;

-- Finalize and post a session: posts billable time entries, deducts auth units, marks session billable.
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
    v_rounded := GREATEST(COALESCE(v_te.duration_minutes,
                                    v_session.session_length_minutes, 0), 0);
    v_units := GREATEST(CEIL(v_rounded::numeric / 15.0)::integer, 1);

    IF p_force_billable IS NOT NULL THEN
      v_billable := p_force_billable;
    ELSE
      v_billable := COALESCE(v_te.is_billable, true);
    END IF;

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

    UPDATE public.time_entries
    SET status = 'posted', updated_at = now()
    WHERE id = v_te.id;

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
