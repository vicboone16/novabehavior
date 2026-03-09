drop view if exists public.v_bcba_session_export_core;

create view public.v_bcba_session_export_core as
select
    s.student_id,
    s.timestamp::date as session_date,
    s.created_at as event_time,
    'session_data' as source_table,
    s.behavior_name as behavior,
    s.event_type as measurement_type,
    s.duration_seconds::numeric as value_numeric,
    null::text as value_text,
    null::text as notes
from public.session_data s

union all

select
    a.client_id as student_id,
    a.logged_at::date as session_date,
    a.created_at as event_time,
    'abc_logs' as source_table,
    a.behavior,
    'abc' as measurement_type,
    null::numeric as value_numeric,
    concat('A: ', coalesce(a.antecedent,''), ' | C: ', coalesce(a.consequence,'')) as value_text,
    a.notes
from public.abc_logs a;

create or replace function public.build_bcba_session_export(
    p_student_id uuid,
    p_date_from date,
    p_date_to date
)
returns jsonb
language plpgsql
security definer
as $$
declare
    v_events jsonb;
begin
    select coalesce(
        jsonb_agg(
            jsonb_build_object(
                'session_date', session_date,
                'event_time', event_time,
                'source_table', source_table,
                'behavior', behavior,
                'measurement_type', measurement_type,
                'value_numeric', value_numeric,
                'value_text', value_text,
                'notes', notes
            )
            order by event_time
        ),
        '[]'::jsonb
    )
    into v_events
    from public.v_bcba_session_export_core
    where student_id = p_student_id
      and session_date between p_date_from and p_date_to;

    return jsonb_build_object(
        'student_id', p_student_id,
        'date_from', p_date_from,
        'date_to', p_date_to,
        'events', v_events
    );
end;
$$;