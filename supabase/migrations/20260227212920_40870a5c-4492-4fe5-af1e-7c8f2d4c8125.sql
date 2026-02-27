
DROP FUNCTION IF EXISTS public.ci_refresh_all(uuid, uuid);

CREATE OR REPLACE FUNCTION public.ci_refresh_all(
  _agency_id uuid DEFAULT NULL,
  _data_source_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  _run_id uuid;
  _start timestamptz;
  _metrics_count integer := 0;
  _alerts_count integer := 0;
  _resolved_count integer := 0;
  _err_msg text;
  _err_detail text;
BEGIN
  _start := clock_timestamp();

  INSERT INTO public.ci_compute_runs (started_at, status, agency_id, data_source_id)
  VALUES (_start, 'running', _agency_id, _data_source_id)
  RETURNING run_id INTO _run_id;

  BEGIN
    PERFORM public.ci_refresh_metrics(_agency_id, _data_source_id);

    SELECT count(*) INTO _metrics_count
    FROM public.ci_client_metrics
    WHERE (_agency_id IS NULL OR agency_id = _agency_id)
      AND (_data_source_id IS NULL OR data_source_id IS NOT DISTINCT FROM _data_source_id);

    PERFORM public.ci_refresh_alerts(_agency_id, _data_source_id);

    SELECT count(*) INTO _alerts_count
    FROM public.ci_alerts
    WHERE resolved_at IS NULL
      AND (_agency_id IS NULL OR agency_id = _agency_id)
      AND (_data_source_id IS NULL OR data_source_id IS NOT DISTINCT FROM _data_source_id);

    SELECT count(*) INTO _resolved_count
    FROM public.ci_alerts
    WHERE resolved_at >= _start
      AND (_agency_id IS NULL OR agency_id = _agency_id)
      AND (_data_source_id IS NULL OR data_source_id IS NOT DISTINCT FROM _data_source_id);

    UPDATE public.ci_compute_runs
    SET finished_at = clock_timestamp(),
        status = 'success',
        metrics_upserted_count = _metrics_count,
        alerts_upserted_count = _alerts_count,
        alerts_resolved_count = _resolved_count,
        duration_ms = EXTRACT(MILLISECONDS FROM clock_timestamp() - _start)::integer
    WHERE run_id = _run_id;

  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS _err_msg = MESSAGE_TEXT, _err_detail = PG_EXCEPTION_DETAIL;

    UPDATE public.ci_compute_runs
    SET finished_at = clock_timestamp(),
        status = 'error',
        duration_ms = EXTRACT(MILLISECONDS FROM clock_timestamp() - _start)::integer,
        errors_json = jsonb_build_object('message', _err_msg, 'detail', _err_detail)
    WHERE run_id = _run_id;
  END;

  RETURN _run_id;
END;
$function$;
