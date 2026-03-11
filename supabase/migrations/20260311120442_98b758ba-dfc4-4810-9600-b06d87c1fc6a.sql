
-- FIX generate_progression_from_evaluation to match actual criteria_evaluations schema
CREATE OR REPLACE FUNCTION public.generate_progression_from_evaluation(p_evaluation_id uuid)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  ev record;
  t record;
  a record;
  q_id uuid;
  next_phase public.target_phase;
  next_target_id uuid;
BEGIN
  SELECT * INTO ev
  FROM public.criteria_evaluations
  WHERE id = p_evaluation_id;

  IF ev.id IS NULL THEN
    RAISE EXCEPTION 'Evaluation % not found', p_evaluation_id;
  END IF;

  -- Only generate progression on MET results
  IF ev.met_status <> 'met' THEN
    RETURN NULL;
  END IF;

  SELECT * INTO t
  FROM public.targets
  WHERE id = ev.target_id;

  IF t.id IS NULL THEN
    RAISE EXCEPTION 'Target % not found', ev.target_id;
  END IF;

  SELECT * INTO a
  FROM public.resolve_automation_settings(ev.client_id, t.program_id, t.id, NULL)
  LIMIT 1;

  -- Create queue card
  INSERT INTO public.progression_queue (
    student_id,
    client_id,
    target_id,
    program_id,
    trigger_event,
    criteria_evaluation_id,
    status,
    title,
    details,
    evidence
  ) VALUES (
    ev.client_id,
    ev.client_id,
    t.id,
    t.program_id,
    (ev.criteria_type::text || '_met'),
    ev.id,
    CASE
      WHEN a.automation_mode = 'auto_advance' AND a.require_confirmation = false THEN 'approved'::public.queue_status
      WHEN a.automation_mode = 'manual' THEN 'cancelled'::public.queue_status
      ELSE 'pending'::public.queue_status
    END,
    'Criteria met: ' || ev.criteria_type::text,
    'Criteria met for target; ready for next step based on automation settings.',
    ev.evidence
  )
  RETURNING id INTO q_id;

  -- Action 1: phase advance
  IF a.auto_advance_phase = true THEN
    next_phase := public.next_phase_for_criteria(ev.criteria_type);
    INSERT INTO public.progression_actions (
      queue_id, action_type, from_target_id, to_target_id, from_phase, to_phase, payload
    ) VALUES (
      q_id, 'advance_phase', t.id, t.id, t.phase, next_phase,
      jsonb_build_object('reason','criteria_met','criteria_type',ev.criteria_type)
    );
  END IF;

  -- Action 2: next action mode
  IF a.next_action_mode = 'next_target_in_program' THEN
    SELECT id INTO next_target_id
    FROM public.targets
    WHERE program_id = t.program_id
      AND sort_order > t.sort_order
    ORDER BY sort_order ASC
    LIMIT 1;

    IF next_target_id IS NOT NULL THEN
      INSERT INTO public.progression_actions (
        queue_id, action_type, from_target_id, to_target_id, payload
      ) VALUES (
        q_id, 'activate_next_target', t.id, next_target_id,
        jsonb_build_object(
          'sequence_mode', a.sequence_mode,
          'auto_start_phase', coalesce(a.auto_start_phase::text, 'baseline')
        )
      );
    ELSE
      INSERT INTO public.progression_actions (
        queue_id, action_type, from_target_id, to_target_id, payload
      ) VALUES (
        q_id, 'notify_review', t.id, NULL,
        jsonb_build_object('note','No next target found in program.')
      );
    END IF;

  ELSIF a.next_action_mode = 'next_benchmark_stage' THEN
    INSERT INTO public.progression_actions (
      queue_id, action_type, from_target_id, to_target_id, payload
    ) VALUES (
      q_id, 'advance_benchmark', t.id, t.id,
      jsonb_build_object('note','Advance to next benchmark stage.')
    );

  ELSIF a.next_action_mode = 'next_program_in_pathway' THEN
    INSERT INTO public.progression_actions (
      queue_id, action_type, from_program_id, payload
    ) VALUES (
      q_id, 'activate_next_program', t.program_id,
      jsonb_build_object('pathway_id', a.pathway_id)
    );
  END IF;

  -- Auto-apply if no confirmation needed
  IF a.automation_mode = 'auto_advance' AND a.require_confirmation = false THEN
    PERFORM public.apply_progression_queue(q_id, NULL);
  END IF;

  RETURN q_id;
END;
$$;
