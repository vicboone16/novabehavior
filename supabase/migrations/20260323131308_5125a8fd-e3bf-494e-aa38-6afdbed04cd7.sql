
-- Drop the old overload with extra params
drop function if exists public.create_form_instance(text, text, uuid, text, uuid, uuid, uuid, text, text);

-- Recreate the universal version with all params merged
create or replace function public.create_form_instance(
  p_template_code text,
  p_linked_entity_type text,
  p_linked_entity_id uuid,
  p_completion_mode text default 'internal',
  p_created_by uuid default null,
  p_assigned_contact_id uuid default null,
  p_packet_id uuid default null,
  p_title_override text default null,
  p_source_type text default 'manual'
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
  select id into v_template_id
  from public.form_templates
  where code = p_template_code
  limit 1;

  if v_template_id is null then
    raise exception 'Template not found: %', p_template_code;
  end if;

  v_student_id := case
    when p_linked_entity_type = 'student' then p_linked_entity_id
    else p_linked_entity_id
  end;

  insert into public.form_definitions (
    id, slug, name, description, category, schema_json, target_audience, is_active, created_at, updated_at
  )
  select t.id, t.code, t.name, t.description,
    coalesce(t.category, 'questionnaire'), '{}'::jsonb, '{}'::text[], t.is_active, now(), now()
  from public.form_templates t
  where t.id = v_template_id
  on conflict (id) do nothing;

  select id into v_form_definition_id
  from public.form_definitions
  where id = v_template_id
  limit 1;

  if v_form_definition_id is null then
    select id into v_form_definition_id
    from public.form_definitions
    where slug = p_template_code
    limit 1;
  end if;

  if v_form_definition_id is null then
    raise exception 'Could not resolve form_definition for template: %', p_template_code;
  end if;

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
    metadata,
    created_by,
    assigned_contact_id,
    packet_id,
    title_override
  )
  values (
    v_template_id,
    v_form_definition_id,
    v_student_id,
    p_linked_entity_type,
    p_linked_entity_id,
    p_completion_mode,
    'draft',
    coalesce(p_source_type, 'manual'),
    'in_app',
    now(),
    now(),
    '{}'::jsonb,
    p_created_by,
    p_assigned_contact_id,
    p_packet_id,
    p_title_override
  )
  returning id into v_form_instance_id;

  return v_form_instance_id;
end;
$$;

-- Also drop the 4-param version since the new one covers it
drop function if exists public.create_form_instance(text, text, uuid, text);
