
-- =============================================
-- ANALYTICS: PDI, Metrics, Step Mastery Functions
-- =============================================

-- 1) Function: Calculate target trial metrics (% Independent, Prompted, Incorrect, PDI)
CREATE OR REPLACE FUNCTION public.fn_target_trial_metrics(
  p_target_id UUID,
  p_window_days INT DEFAULT 14
)
RETURNS TABLE(
  target_id UUID,
  total_opportunities BIGINT,
  independent_count BIGINT,
  prompted_count BIGINT,
  incorrect_count BIGINT,
  pct_independent NUMERIC,
  pct_prompted NUMERIC,
  pct_incorrect NUMERIC,
  pct_correct NUMERIC,
  pdi NUMERIC
)
LANGUAGE sql STABLE SECURITY INVOKER
AS $$
  WITH base AS (
    SELECT
      tt.target_id,
      CASE WHEN tt.outcome = '+' AND tt.prompt_level_id IS NULL THEN 1 ELSE 0 END AS indep,
      CASE WHEN tt.outcome = '+' AND tt.prompt_level_id IS NOT NULL THEN 1 ELSE 0 END AS prompted,
      CASE WHEN tt.outcome = '-' THEN 1 ELSE 0 END AS incorrect,
      CASE WHEN tt.outcome IN ('+', '-') THEN 1 ELSE 0 END AS opportunity,
      CASE
        WHEN tt.outcome = '+' AND tt.prompt_level_id IS NULL THEN 0
        WHEN tt.outcome = '+' AND tt.prompt_level_id IS NOT NULL THEN COALESCE(pl.rank, 3)
        WHEN tt.outcome = '-' THEN 5
        ELSE NULL
      END AS prompt_score
    FROM public.target_trials tt
    LEFT JOIN public.prompt_levels pl ON pl.id = tt.prompt_level_id
    WHERE tt.target_id = p_target_id
      AND tt.data_state != 'no_data'
      AND tt.created_at >= NOW() - (p_window_days || ' days')::INTERVAL
  )
  SELECT
    p_target_id AS target_id,
    SUM(opportunity)::BIGINT AS total_opportunities,
    SUM(indep)::BIGINT AS independent_count,
    SUM(prompted)::BIGINT AS prompted_count,
    SUM(incorrect)::BIGINT AS incorrect_count,
    ROUND(100.0 * SUM(indep) / NULLIF(SUM(opportunity), 0), 1) AS pct_independent,
    ROUND(100.0 * SUM(prompted) / NULLIF(SUM(opportunity), 0), 1) AS pct_prompted,
    ROUND(100.0 * SUM(incorrect) / NULLIF(SUM(opportunity), 0), 1) AS pct_incorrect,
    ROUND(100.0 * (SUM(indep) + SUM(prompted)) / NULLIF(SUM(opportunity), 0), 1) AS pct_correct,
    ROUND(AVG(prompt_score)::NUMERIC / 5.0, 3) AS pdi
  FROM base;
$$;

-- 2) Function: Calculate TA step trial metrics  
CREATE OR REPLACE FUNCTION public.fn_step_trial_metrics(
  p_step_id UUID,
  p_window_days INT DEFAULT 14
)
RETURNS TABLE(
  step_id UUID,
  total_opportunities BIGINT,
  independent_count BIGINT,
  prompted_count BIGINT,
  incorrect_count BIGINT,
  pct_independent NUMERIC,
  pdi NUMERIC
)
LANGUAGE sql STABLE SECURITY INVOKER
AS $$
  WITH base AS (
    SELECT
      sd.step_id,
      CASE WHEN sd.outcome = '+' AND sd.prompt_level_id IS NULL THEN 1 ELSE 0 END AS indep,
      CASE WHEN sd.outcome = '+' AND sd.prompt_level_id IS NOT NULL THEN 1 ELSE 0 END AS prompted,
      CASE WHEN sd.outcome = '-' THEN 1 ELSE 0 END AS incorrect,
      CASE WHEN sd.outcome IN ('+', '-') THEN 1 ELSE 0 END AS opportunity,
      CASE
        WHEN sd.outcome = '+' AND sd.prompt_level_id IS NULL THEN 0
        WHEN sd.outcome = '+' AND sd.prompt_level_id IS NOT NULL THEN COALESCE(pl.rank, 3)
        WHEN sd.outcome = '-' THEN 5
        ELSE NULL
      END AS prompt_score
    FROM public.task_analysis_step_data sd
    LEFT JOIN public.prompt_levels pl ON pl.id = sd.prompt_level_id
    WHERE sd.step_id = p_step_id
      AND sd.data_state != 'no_data'
      AND sd.created_at >= NOW() - (p_window_days || ' days')::INTERVAL
  )
  SELECT
    p_step_id AS step_id,
    SUM(opportunity)::BIGINT AS total_opportunities,
    SUM(indep)::BIGINT AS independent_count,
    SUM(prompted)::BIGINT AS prompted_count,
    SUM(incorrect)::BIGINT AS incorrect_count,
    ROUND(100.0 * SUM(indep) / NULLIF(SUM(opportunity), 0), 1) AS pct_independent,
    ROUND(AVG(prompt_score)::NUMERIC / 5.0, 3) AS pdi
  FROM base;
$$;

-- 3) Function: Check step mastery (consecutive sessions with independent success)
-- Returns true if step meets mastery criteria
CREATE OR REPLACE FUNCTION public.fn_check_step_mastery(
  p_step_id UUID,
  p_consecutive_sessions INT DEFAULT 3,
  p_threshold NUMERIC DEFAULT 80.0
)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY INVOKER
AS $$
DECLARE
  v_met BOOLEAN := FALSE;
  v_session RECORD;
  v_consecutive INT := 0;
BEGIN
  FOR v_session IN
    SELECT 
      sd.session_id,
      ROUND(100.0 * SUM(CASE WHEN sd.outcome = '+' AND sd.prompt_level_id IS NULL THEN 1 ELSE 0 END)::NUMERIC
        / NULLIF(SUM(CASE WHEN sd.outcome IN ('+', '-') THEN 1 ELSE 0 END), 0), 1) AS pct_indep
    FROM public.task_analysis_step_data sd
    WHERE sd.step_id = p_step_id
      AND sd.data_state != 'no_data'
      AND sd.session_id IS NOT NULL
    GROUP BY sd.session_id
    ORDER BY MIN(sd.recorded_at) DESC
  LOOP
    IF v_session.pct_indep >= p_threshold THEN
      v_consecutive := v_consecutive + 1;
    ELSE
      EXIT;
    END IF;
    
    IF v_consecutive >= p_consecutive_sessions THEN
      v_met := TRUE;
      EXIT;
    END IF;
  END LOOP;
  
  RETURN v_met;
END;
$$;

-- 4) Function: Auto-update step mastery status
CREATE OR REPLACE FUNCTION public.fn_auto_update_step_mastery()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_step RECORD;
  v_mastered BOOLEAN;
BEGIN
  -- Get the step info
  SELECT * INTO v_step FROM public.task_analysis_steps WHERE id = NEW.step_id;
  
  -- Only check if step is not already mastered
  IF v_step IS NOT NULL AND v_step.step_status != 'closed' AND v_step.mastered_at IS NULL THEN
    v_mastered := public.fn_check_step_mastery(NEW.step_id, 3, 80.0);
    
    IF v_mastered THEN
      UPDATE public.task_analysis_steps
      SET step_status = 'maintenance',
          mastered_at = NOW()
      WHERE id = NEW.step_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for auto step mastery check
DROP TRIGGER IF EXISTS trg_auto_step_mastery ON public.task_analysis_step_data;
CREATE TRIGGER trg_auto_step_mastery
  AFTER INSERT ON public.task_analysis_step_data
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_auto_update_step_mastery();
