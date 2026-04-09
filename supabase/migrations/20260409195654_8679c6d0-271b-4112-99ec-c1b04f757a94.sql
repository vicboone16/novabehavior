
CREATE OR REPLACE FUNCTION public.merge_student_behavior(
  p_student_id uuid, 
  p_source_behavior_id uuid, 
  p_target_behavior_id uuid, 
  p_performed_by uuid DEFAULT NULL::uuid
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_bsd_count int := 0;
  v_sd_count int := 0;
  v_source_name text;
  v_target_name text;
BEGIN
  IF p_source_behavior_id = p_target_behavior_id THEN
    RAISE EXCEPTION 'Cannot merge a behavior into itself';
  END IF;

  SELECT COALESCE(b.name, sbm.behavior_subtype, p_source_behavior_id::text)
    INTO v_source_name
    FROM student_behavior_map sbm
    LEFT JOIN behaviors b ON b.id = sbm.behavior_entry_id
   WHERE sbm.student_id = p_student_id
     AND sbm.behavior_entry_id = p_source_behavior_id
   LIMIT 1;

  SELECT COALESCE(b.name, sbm.behavior_subtype, p_target_behavior_id::text)
    INTO v_target_name
    FROM student_behavior_map sbm
    LEFT JOIN behaviors b ON b.id = sbm.behavior_entry_id
   WHERE sbm.student_id = p_student_id
     AND sbm.behavior_entry_id = p_target_behavior_id
   LIMIT 1;

  IF v_source_name IS NULL THEN
    v_source_name := p_source_behavior_id::text;
  END IF;
  IF v_target_name IS NULL THEN
    v_target_name := p_target_behavior_id::text;
  END IF;

  -- 1. Repoint behavior_session_data (uuid column)
  UPDATE behavior_session_data
     SET behavior_id = p_target_behavior_id,
         updated_at = now()
   WHERE student_id = p_student_id
     AND behavior_id = p_source_behavior_id;
  GET DIAGNOSTICS v_bsd_count = ROW_COUNT;

  -- 2. Repoint session_data (text column — cast uuid to text)
  UPDATE session_data
     SET behavior_id = p_target_behavior_id::text
   WHERE student_id = p_student_id
     AND behavior_id = p_source_behavior_id::text;
  GET DIAGNOSTICS v_sd_count = ROW_COUNT;

  -- 3. Deactivate source mapping
  UPDATE student_behavior_map
     SET active = false,
         notes = COALESCE(notes, '') || ' [Merged into ' || v_target_name || ' on ' || now()::date::text || ']',
         updated_at = now()
   WHERE student_id = p_student_id
     AND behavior_entry_id = p_source_behavior_id;

  RETURN jsonb_build_object(
    'success', true,
    'source_name', v_source_name,
    'target_name', v_target_name,
    'bsd_moved', v_bsd_count,
    'sd_moved', v_sd_count
  );
END;
$function$;
