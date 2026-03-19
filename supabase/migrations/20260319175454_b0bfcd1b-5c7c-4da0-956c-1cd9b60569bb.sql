-- Fix autosave_form_instance to use correct column names
CREATE OR REPLACE FUNCTION public.autosave_form_instance(
  p_form_instance_id uuid,
  p_created_by uuid DEFAULT null
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_version_id uuid;
  v_snapshot jsonb;
  v_next_version integer;
BEGIN
  SELECT coalesce(max(version_no), 0) + 1
  INTO v_next_version
  FROM public.form_versions
  WHERE form_instance_id = p_form_instance_id;

  SELECT jsonb_agg(jsonb_build_object(
    'field_key', fa.field_key,
    'section_key', fa.section_key,
    'value_raw', fa.value_raw,
    'repeat_index', fa.repeat_index
  ))
  INTO v_snapshot
  FROM public.form_answers fa
  WHERE fa.form_instance_id = p_form_instance_id;

  INSERT INTO public.form_versions (
    form_instance_id, version_no, snapshot_type, snapshot_json, created_by
  )
  VALUES (
    p_form_instance_id, v_next_version, 'autosave', coalesce(v_snapshot, '[]'::jsonb), p_created_by
  )
  RETURNING id INTO v_version_id;

  UPDATE public.form_instances
  SET last_saved_at = now(), updated_at = now()
  WHERE id = p_form_instance_id;

  RETURN v_version_id;
END;
$$;

-- Fix submit_form_instance
CREATE OR REPLACE FUNCTION public.submit_form_instance(
  p_form_instance_id uuid,
  p_created_by uuid DEFAULT null
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_version_id uuid;
  v_snapshot jsonb;
  v_next_version integer;
BEGIN
  SELECT coalesce(max(version_no), 0) + 1
  INTO v_next_version
  FROM public.form_versions
  WHERE form_instance_id = p_form_instance_id;

  SELECT jsonb_agg(jsonb_build_object(
    'field_key', fa.field_key,
    'section_key', fa.section_key,
    'value_raw', fa.value_raw,
    'repeat_index', fa.repeat_index
  ))
  INTO v_snapshot
  FROM public.form_answers fa
  WHERE fa.form_instance_id = p_form_instance_id;

  INSERT INTO public.form_versions (
    form_instance_id, version_no, snapshot_type, snapshot_json, created_by
  )
  VALUES (
    p_form_instance_id, v_next_version, 'submitted', coalesce(v_snapshot, '[]'::jsonb), p_created_by
  )
  RETURNING id INTO v_version_id;

  UPDATE public.form_instances
  SET status = 'submitted',
      submitted_at = now(),
      last_saved_at = now(),
      updated_at = now()
  WHERE id = p_form_instance_id;

  RETURN v_version_id;
END;
$$;

-- Fix finalize_form_instance
DROP FUNCTION IF EXISTS public.finalize_form_instance(uuid, uuid);
CREATE OR REPLACE FUNCTION public.finalize_form_instance(
  p_form_instance_id uuid,
  p_created_by uuid DEFAULT null
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_version_id uuid;
  v_snapshot jsonb;
  v_next_version integer;
BEGIN
  SELECT coalesce(max(version_no), 0) + 1
  INTO v_next_version
  FROM public.form_versions
  WHERE form_instance_id = p_form_instance_id;

  SELECT jsonb_agg(jsonb_build_object(
    'field_key', fa.field_key,
    'section_key', fa.section_key,
    'value_raw', fa.value_raw,
    'repeat_index', fa.repeat_index
  ))
  INTO v_snapshot
  FROM public.form_answers fa
  WHERE fa.form_instance_id = p_form_instance_id;

  INSERT INTO public.form_versions (
    form_instance_id, version_no, snapshot_type, snapshot_json, created_by
  )
  VALUES (
    p_form_instance_id, v_next_version, 'finalized', coalesce(v_snapshot, '[]'::jsonb), p_created_by
  )
  RETURNING id INTO v_version_id;

  UPDATE public.form_instances
  SET status = 'finalized',
      finalized_at = now(),
      locked_at = now(),
      last_saved_at = now(),
      updated_at = now()
  WHERE id = p_form_instance_id;

  RETURN v_version_id;
END;
$$;