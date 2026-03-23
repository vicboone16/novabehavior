
-- Step 3: UNIVERSAL CREATE FORM INSTANCE (corrected for legacy schema)
create or replace function public.create_form_instance(
  p_template_code text,
  p_linked_entity_type text,
  p_linked_entity_id uuid,
  p_completion_mode text default 'internal'
)
returns uuid
language plpgsql
as $$
declare
  v_template_id uuid;
  v_form_definition_id uuid;
  v_student_id uuid;
  v_form_instance_id uuid;
begin
  -- 1. get template
  select id into v_template_id
  from public.form_templates
  where code = p_template_code
  limit 1;

  if v_template_id is null then
    raise exception 'Template not found: %', p_template_code;
  end if;

  -- 2. map student (form_instances.student_id is NOT NULL)
  v_student_id := case
    when p_linked_entity_type = 'student' then p_linked_entity_id
    else p_linked_entity_id -- fallback: use the entity id anyway since column is NOT NULL
  end;

  -- 3. ensure form_definition exists (AUTO SYNC with slug)
  insert into public.form_definitions (
    id, slug, name, description, category, schema_json, target_audience, is_active, created_at, updated_at
  )
  select
    t.id, t.code, t.name, t.description,
    coalesce(t.category, 'questionnaire'),
    '{}'::jsonb, '{}'::text[], t.is_active, now(), now()
  from public.form_templates t
  where t.id = v_template_id
  on conflict (id) do nothing;

  -- 4. get definition id
  select id into v_form_definition_id
  from public.form_definitions
  where id = v_template_id
  limit 1;

  if v_form_definition_id is null then
    -- try by slug
    select id into v_form_definition_id
    from public.form_definitions
    where slug = p_template_code
    limit 1;
  end if;

  if v_form_definition_id is null then
    raise exception 'Could not resolve form_definition for template: %', p_template_code;
  end if;

  -- 5. INSERT into form_instances (all NOT NULL columns satisfied)
  insert into public.form_instances (
    template_id,
    form_definition_id,
    student_id,
    linked_entity_type,
    linked_entity_id,
    completion_mode,
    status,
    source_type,
    delivery_method,
    started_at,
    last_saved_at,
    metadata
  )
  values (
    v_template_id,
    v_form_definition_id,
    v_student_id,
    p_linked_entity_type,
    p_linked_entity_id,
    p_completion_mode,
    'draft',
    'manual',
    'in_app',
    now(),
    now(),
    '{}'::jsonb
  )
  returning id into v_form_instance_id;

  return v_form_instance_id;
end;
$$;

-- Step 4: LEGACY-SAFE SAVE_FORM_ANSWER (form_answers has NO student_id or form_definition_id)
create or replace function public.save_form_answer(
  p_form_instance_id uuid,
  p_field_key text,
  p_value_raw jsonb,
  p_repeat_index integer default 0,
  p_source_type text default 'manual',
  p_source_reference text default null,
  p_confidence_score numeric default null,
  p_ai_generated boolean default false,
  p_manually_edited boolean default false
)
returns uuid
language plpgsql
as $$
declare
  v_template_id uuid;
  v_section_key text;
  v_field_label text;
  v_answer_id uuid;
begin
  -- get template_id from form instance
  select fi.template_id
  into v_template_id
  from public.form_instances fi
  where fi.id = p_form_instance_id;

  if v_template_id is null then
    raise exception 'Form instance % not found', p_form_instance_id;
  end if;

  -- get section_key and field_label
  select s.section_key, f.field_label
  into v_section_key, v_field_label
  from public.form_template_fields f
  join public.form_template_sections s on s.id = f.section_id
  where f.template_id = v_template_id
    and f.field_key = p_field_key
  limit 1;

  if v_field_label is null then
    -- fallback: use field_key as label
    v_field_label := p_field_key;
    v_section_key := 'unknown';
  end if;

  -- form_answers has NO student_id or form_definition_id columns
  insert into public.form_answers (
    form_instance_id,
    section_key,
    field_key,
    field_label,
    repeat_index,
    value_raw,
    value_normalized,
    source_type,
    source_reference,
    confidence_score,
    ai_generated,
    manually_edited,
    updated_at
  )
  values (
    p_form_instance_id,
    v_section_key,
    p_field_key,
    v_field_label,
    coalesce(p_repeat_index, 0),
    p_value_raw,
    p_value_raw,
    coalesce(p_source_type, 'manual'),
    p_source_reference,
    p_confidence_score,
    coalesce(p_ai_generated, false),
    coalesce(p_manually_edited, false),
    now()
  )
  on conflict (form_instance_id, field_key, repeat_index) do update
  set
    section_key = excluded.section_key,
    field_label = excluded.field_label,
    value_raw = excluded.value_raw,
    value_normalized = excluded.value_normalized,
    source_type = excluded.source_type,
    source_reference = excluded.source_reference,
    confidence_score = excluded.confidence_score,
    ai_generated = excluded.ai_generated,
    manually_edited = excluded.manually_edited,
    updated_at = now()
  returning id into v_answer_id;

  -- update form instance last_saved_at
  update public.form_instances
  set
    last_saved_at = now(),
    status = case when status = 'draft' then 'in_progress' when status = 'not_started' then 'in_progress' else status end,
    updated_at = now()
  where id = p_form_instance_id;

  return v_answer_id;
end;
$$;

-- Step 6: LEGACY-SAFE CREATE_FORM_PACKET (no student_id column)
create or replace function public.create_form_packet(
  p_packet_name text,
  p_linked_entity_type text,
  p_linked_entity_id uuid,
  p_recipient_contact_id uuid default null,
  p_sent_by uuid default null,
  p_due_at timestamptz default null,
  p_delivery_method text default 'portal_link',
  p_reminder_schedule jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_packet_id uuid;
begin
  if p_linked_entity_type not in ('student', 'referral') then
    raise exception 'Invalid linked_entity_type: %', p_linked_entity_type;
  end if;

  insert into public.form_packets (
    packet_name,
    linked_entity_type,
    linked_entity_id,
    recipient_contact_id,
    sent_by,
    due_at,
    status,
    delivery_method,
    reminder_schedule
  )
  values (
    p_packet_name,
    p_linked_entity_type,
    p_linked_entity_id,
    p_recipient_contact_id,
    p_sent_by,
    p_due_at,
    'draft',
    p_delivery_method,
    coalesce(p_reminder_schedule, '[]'::jsonb)
  )
  returning id into v_packet_id;

  return v_packet_id;
end;
$$;
