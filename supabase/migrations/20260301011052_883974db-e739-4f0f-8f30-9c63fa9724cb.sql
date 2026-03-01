
DROP FUNCTION IF EXISTS public.submit_parent_summary_packets(uuid, jsonb);

CREATE OR REPLACE FUNCTION public.submit_parent_summary_packets(
  _client_id uuid,
  _packets jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_id uuid;
  _agency_id uuid;
  _pkt jsonb;
  _inserted int := 0;
  _skipped int := 0;
BEGIN
  _user_id := auth.uid();
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  SELECT uca.agency_id INTO _agency_id
  FROM public.user_client_access uca
  WHERE uca.user_id = _user_id AND uca.client_id = _client_id
  LIMIT 1;

  IF _agency_id IS NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.user_student_access
      WHERE user_id = _user_id AND student_id = _client_id
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'No access to this learner');
    END IF;
    SELECT s.agency_id INTO _agency_id FROM public.students s WHERE s.id = _client_id;
  END IF;

  IF _agency_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Could not determine agency for this learner');
  END IF;

  FOR _pkt IN SELECT * FROM jsonb_array_elements(_packets)
  LOOP
    IF EXISTS (
      SELECT 1 FROM public.parent_summary_packets
      WHERE client_id = _client_id
        AND week_start = (_pkt->>'week_start')::date
        AND submitted_by = _user_id
    ) THEN
      _skipped := _skipped + 1;
      CONTINUE;
    END IF;

    INSERT INTO public.parent_summary_packets (
      agency_id, client_id, submitted_by, source, status,
      week_start, week_end,
      abc_count, frequency_total, duration_minutes_total, intensity_avg,
      top_functions, top_triggers, tools_used, engagement, parent_notes
    ) VALUES (
      _agency_id, _client_id, _user_id, 'parent_app', 'pending_review',
      (_pkt->>'week_start')::date, (_pkt->>'week_end')::date,
      (_pkt->>'abc_count')::int, (_pkt->>'frequency_total')::int,
      (_pkt->>'duration_minutes_total')::numeric, (_pkt->>'intensity_avg')::numeric,
      COALESCE(_pkt->'top_functions', '[]'::jsonb),
      COALESCE(_pkt->'top_triggers', '[]'::jsonb),
      COALESCE(_pkt->'tools_used', '{}'::jsonb),
      COALESCE(_pkt->'engagement', '{}'::jsonb),
      _pkt->>'parent_notes'
    );
    _inserted := _inserted + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'inserted', _inserted, 'skipped_duplicates', _skipped);
END;
$$;
