
DROP FUNCTION IF EXISTS public.ci_refresh_all(uuid, uuid);

CREATE OR REPLACE FUNCTION public.ci_refresh_all(
  _agency_id uuid DEFAULT NULL,
  _data_source_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $function$
begin
  perform public.ci_refresh_metrics(_agency_id, _data_source_id);
  perform public.ci_refresh_alerts(_agency_id, _data_source_id);
end;
$function$;
