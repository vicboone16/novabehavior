
create or replace function public.finalize_form_instance(
  p_form_instance_id uuid,
  p_created_by uuid default null
)
returns uuid
language plpgsql
as $$
declare
  v_version_id uuid;
  v_snapshot jsonb;
  v_next_version integer;
begin
  select coalesce(max(version_no), 0) + 1
  into v_next_version
  from public.form_versions
  where form_instance_id = p_form_instance_id;

  select jsonb_agg(jsonb_build_object(
    'field_key', fa.field_key,
    'section_key', fa.section_key,
    'value_raw', fa.value_raw,
    'repeat_index', fa.repeat_index
  ))
  into v_snapshot
  from public.form_answers fa
  where fa.form_instance_id = p_form_instance_id;

  insert into public.form_versions (
    form_instance_id, version_no, snapshot_type, snapshot_json, created_by
  )
  values (
    p_form_instance_id, v_next_version, 'finalize', coalesce(v_snapshot, '[]'::jsonb), p_created_by
  )
  returning id into v_version_id;

  update public.form_instances
  set status = 'finalized',
      finalized_at = now(),
      locked_at = now(),
      last_saved_at = now(),
      updated_at = now()
  where id = p_form_instance_id;

  return v_version_id;
end;
$$;
