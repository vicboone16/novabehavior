-- Drop functions with return type conflicts
DROP FUNCTION IF EXISTS public.finalize_form_instance(uuid, uuid);
DROP FUNCTION IF EXISTS public.mark_packet_sent(uuid);
DROP FUNCTION IF EXISTS public.add_template_to_packet(uuid, text, text, integer, boolean, uuid);
DROP FUNCTION IF EXISTS public.save_form_answers_bulk(uuid, jsonb, text, text, boolean, boolean);

-- Recreate finalize_form_instance (returns uuid to match convention)
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
BEGIN
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
    form_instance_id, version_type, snapshot_json, created_by
  )
  VALUES (
    p_form_instance_id, 'finalized', coalesce(v_snapshot, '[]'::jsonb), p_created_by
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

-- Recreate mark_packet_sent (returns text)
CREATE OR REPLACE FUNCTION public.mark_packet_sent(
  p_packet_id uuid
)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.form_packets
  SET status = 'sent', updated_at = now()
  WHERE id = p_packet_id;

  UPDATE public.form_instances
  SET status = 'sent', updated_at = now()
  WHERE packet_id = p_packet_id AND status = 'draft';

  RETURN 'ok';
END;
$$;

-- Recreate add_template_to_packet
CREATE OR REPLACE FUNCTION public.add_template_to_packet(
  p_packet_id uuid,
  p_template_code text,
  p_display_order integer DEFAULT 1,
  p_created_by uuid DEFAULT null,
  p_assignment_mode text DEFAULT 'internal'
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_template_id uuid;
  v_form_definition_id uuid;
  v_item_id uuid;
  v_linked_entity_type text;
  v_linked_entity_id uuid;
  v_instance_id uuid;
BEGIN
  SELECT id INTO v_template_id
  FROM public.form_templates
  WHERE code = p_template_code AND is_active = true
  LIMIT 1;

  IF v_template_id IS NULL THEN
    RAISE EXCEPTION 'Template % not found or inactive', p_template_code;
  END IF;

  SELECT d.id INTO v_form_definition_id
  FROM public.form_definitions d
  WHERE d.id = v_template_id OR d.slug = p_template_code
  LIMIT 1;

  IF v_form_definition_id IS NULL THEN
    RAISE EXCEPTION 'No matching form_definitions row for template %. Run bridge sync.', p_template_code;
  END IF;

  SELECT linked_entity_type, linked_entity_id
  INTO v_linked_entity_type, v_linked_entity_id
  FROM public.form_packets
  WHERE id = p_packet_id;

  INSERT INTO public.form_packet_items (
    packet_id, template_id, display_order
  )
  VALUES (p_packet_id, v_template_id, p_display_order)
  RETURNING id INTO v_item_id;

  INSERT INTO public.form_instances (
    template_id, form_definition_id, student_id,
    packet_id, linked_entity_type, linked_entity_id,
    created_by, owner_user_id, completion_mode, source_type,
    status, delivery_method, started_at, last_saved_at, version, metadata
  )
  VALUES (
    v_template_id, v_form_definition_id, v_linked_entity_id,
    p_packet_id, v_linked_entity_type, v_linked_entity_id,
    p_created_by, p_created_by, p_assignment_mode, 'packet',
    'draft', 'in_app', now(), now(), 1, '{}'::jsonb
  )
  RETURNING id INTO v_instance_id;

  RETURN v_item_id;
END;
$$;

-- Recreate save_form_answers_bulk with matching signature
CREATE OR REPLACE FUNCTION public.save_form_answers_bulk(
  p_form_instance_id uuid,
  p_answers jsonb,
  p_source_type text DEFAULT 'manual',
  p_ai_generated boolean DEFAULT false,
  p_manually_edited boolean DEFAULT false
)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_count integer := 0;
  v_item jsonb;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_answers)
  LOOP
    PERFORM public.save_form_answer(
      p_form_instance_id := p_form_instance_id,
      p_field_key := v_item->>'field_key',
      p_value_raw := CASE
        WHEN v_item->'value_raw' IS NOT NULL THEN v_item->'value_raw'
        ELSE 'null'::jsonb
      END,
      p_repeat_index := coalesce((v_item->>'repeat_index')::integer, 0),
      p_source_type := p_source_type,
      p_ai_generated := p_ai_generated,
      p_manually_edited := p_manually_edited
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;