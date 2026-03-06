
-- Drop existing functions with incompatible return types
DROP FUNCTION IF EXISTS public.auto_refresh_intervention_outcomes_all();
DROP FUNCTION IF EXISTS public.ci_enrich_intervention_recs_all();

-- Recreate auto_refresh_intervention_outcomes_all
CREATE OR REPLACE FUNCTION public.auto_refresh_intervention_outcomes_all()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agency record;
  v_total int := 0;
  v_count int;
BEGIN
  FOR v_agency IN
    SELECT DISTINCT agency_id FROM public.client_intervention_runs
    WHERE implementation_status IN ('active','monitoring')
  LOOP
    SELECT public.compute_all_intervention_outcomes(v_agency.agency_id) INTO v_count;
    v_total := v_total + v_count;
  END LOOP;
  RETURN v_total;
END;
$$;

-- Recreate ci_enrich_intervention_recs_all
CREATE OR REPLACE FUNCTION public.ci_enrich_intervention_recs_all()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client record;
  v_total int := 0;
  v_enriched record;
BEGIN
  FOR v_client IN
    SELECT DISTINCT client_id FROM public.ci_intervention_recs WHERE status = 'active'
  LOOP
    FOR v_enriched IN
      SELECT e.intervention_id, e.enriched_reasons
      FROM public.enrich_intervention_recs_with_effectiveness(v_client.client_id) e
    LOOP
      UPDATE public.ci_intervention_recs
      SET reasons_json = v_enriched.enriched_reasons
      WHERE client_id = v_client.client_id
        AND intervention_id = v_enriched.intervention_id;
      v_total := v_total + 1;
    END LOOP;
  END LOOP;
  RETURN v_total;
END;
$$;
