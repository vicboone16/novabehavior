
create index if not exists idx_treatment_intelligence_exports_target
on public.treatment_intelligence_exports(export_target);

drop view if exists public.v_treatment_intelligence_export_history;

create view public.v_treatment_intelligence_export_history as
select
    e.id,
    e.student_id,
    e.source_section,
    e.source_object_id,
    e.export_target,
    e.exported_text,
    e.context_json,
    e.created_by,
    e.created_at
from public.treatment_intelligence_exports e;

select pg_notify('pgrst','reload schema');
