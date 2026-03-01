
CREATE OR REPLACE FUNCTION public.rpc_update_agency_billing_policy(
  p_agency_id uuid,
  p_utilization_policy text,
  p_allow_mobile_post_hours boolean,
  p_require_note_final_to_post boolean,
  p_auto_post_on_note_finalize boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_agency_admin(auth.uid(), p_agency_id) THEN
    RAISE EXCEPTION 'Unauthorized: agency admin required';
  END IF;

  INSERT INTO public.agency_billing_profiles (
    agency_id, utilization_policy, allow_mobile_post_hours,
    require_note_final_to_post, auto_post_on_note_finalize
  ) VALUES (
    p_agency_id, p_utilization_policy, p_allow_mobile_post_hours,
    p_require_note_final_to_post, p_auto_post_on_note_finalize
  )
  ON CONFLICT (agency_id) DO UPDATE SET
    utilization_policy = EXCLUDED.utilization_policy,
    allow_mobile_post_hours = EXCLUDED.allow_mobile_post_hours,
    require_note_final_to_post = EXCLUDED.require_note_final_to_post,
    auto_post_on_note_finalize = EXCLUDED.auto_post_on_note_finalize,
    updated_at = now();

  RETURN jsonb_build_object('ok', true, 'agency_id', p_agency_id);
END;
$function$;
