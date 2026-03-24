
-- STEP 4: VOLATILITY + CONTAGION + BALANCE ENGINE

CREATE OR REPLACE FUNCTION refresh_bops_classroom_analytics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO bops_classroom_analytics (
    classroom_id, volatility_index, contagion_risk, balance_score,
    hidden_need_concentration, high_red_state_count, high_yellow_state_count,
    storm_profile_count, power_conflict_cluster_count, sensory_cluster_count,
    notes, updated_at
  )
  WITH classroom_students AS (
    SELECT DISTINCT r.classroom_id::text AS classroom_id, r.student_id
    FROM bops_classroom_rosters r WHERE r.active = true
  ),
  joined AS (
    SELECT cs.classroom_id, cs.student_id,
      o.storm_score, o.escalation_index, o.hidden_need_index,
      o.sensory_load_index, o.power_conflict_index, o.recovery_burden_index,
      cds.day_state AS current_day_state
    FROM classroom_students cs
    LEFT JOIN v_student_bops_overview o ON o.student_id = cs.student_id
    LEFT JOIN v_student_bops_current_day_state cds ON cds.student_id = cs.student_id
  ),
  agg AS (
    SELECT classroom_id,
      round((coalesce(stddev_pop(coalesce(escalation_index,0)),0) +
             coalesce(stddev_pop(coalesce(recovery_burden_index,0)),0) +
             coalesce(stddev_pop(coalesce(power_conflict_index,0)),0)) / 3.0, 4) AS volatility_index,
      round((count(*) FILTER (WHERE coalesce(current_day_state,'')='red')::numeric / nullif(count(*),0)) * 0.4 +
            (count(*) FILTER (WHERE coalesce(storm_score,0) >= 0.70)::numeric / nullif(count(*),0)) * 0.3 +
            (count(*) FILTER (WHERE coalesce(escalation_index,0) >= 0.70)::numeric / nullif(count(*),0)) * 0.3, 4) AS contagion_risk,
      round(1 - (abs(coalesce(avg(power_conflict_index),0) - coalesce(avg(sensory_load_index),0)) +
                 abs(coalesce(avg(hidden_need_index),0) - coalesce(avg(escalation_index),0))) / 2.0, 4) AS balance_score,
      round(avg(coalesce(hidden_need_index,0)), 4) AS hidden_need_concentration,
      count(*) FILTER (WHERE coalesce(current_day_state,'')='red') AS high_red_state_count,
      count(*) FILTER (WHERE coalesce(current_day_state,'')='yellow') AS high_yellow_state_count,
      count(*) FILTER (WHERE coalesce(storm_score,0) >= 0.70) AS storm_profile_count,
      count(*) FILTER (WHERE coalesce(power_conflict_index,0) >= 0.70) AS power_conflict_cluster_count,
      count(*) FILTER (WHERE coalesce(sensory_load_index,0) >= 0.70) AS sensory_cluster_count
    FROM joined GROUP BY classroom_id
  )
  SELECT classroom_id,
    greatest(0, least(1, volatility_index)), greatest(0, least(1, contagion_risk)),
    greatest(0, least(1, balance_score)), greatest(0, least(1, hidden_need_concentration)),
    high_red_state_count, high_yellow_state_count, storm_profile_count,
    power_conflict_cluster_count, sensory_cluster_count,
    'Volatility=escalation/recovery/power spread | Contagion=red+storm+escalation density | Balance=need distribution | HiddenNeed=avg masked burden',
    now()
  FROM agg
  ON CONFLICT (classroom_id) DO UPDATE SET
    volatility_index = excluded.volatility_index, contagion_risk = excluded.contagion_risk,
    balance_score = excluded.balance_score, hidden_need_concentration = excluded.hidden_need_concentration,
    high_red_state_count = excluded.high_red_state_count, high_yellow_state_count = excluded.high_yellow_state_count,
    storm_profile_count = excluded.storm_profile_count, power_conflict_cluster_count = excluded.power_conflict_cluster_count,
    sensory_cluster_count = excluded.sensory_cluster_count, notes = excluded.notes, updated_at = now();
END;
$$;

-- Combined genome + analytics view
CREATE OR REPLACE VIEW v_bops_classroom_analytics WITH (security_invoker = on) AS
SELECT
  g.classroom_id, g.roster_size AS total_students,
  g.fortress_count, g.ghost_count, g.reactor_count, g.volcano_count,
  g.sprinter_count, g.negotiator_count, g.challenger_count,
  g.rule_keeper_count, g.social_explorer_count, g.chameleon_count, g.storm_count,
  g.avg_threat, g.avg_withdrawal, g.avg_sensory, g.avg_emotion,
  g.avg_impulse, g.avg_autonomy, g.avg_authority, g.avg_rigidity,
  g.avg_social, g.avg_context, g.cvi, g.cli, g.hni, g.balance_index,
  a.volatility_index, a.contagion_risk, a.balance_score, a.hidden_need_concentration,
  a.high_red_state_count, a.high_yellow_state_count, a.storm_profile_count,
  a.power_conflict_cluster_count, a.sensory_cluster_count,
  g.updated_at AS genome_updated_at, a.updated_at AS analytics_updated_at
FROM bops_classroom_genome g
LEFT JOIN bops_classroom_analytics a ON a.classroom_id = g.classroom_id::text;

-- STEP 5: REGISTRY CLEANUP

-- Coverage audit (uses correct column: archetype, not archetype_key)
CREATE OR REPLACE VIEW v_bops_profile_program_coverage_audit WITH (security_invoker = on) AS
WITH profile_keys AS (
  SELECT archetype AS profile_key, 'archetype' AS profile_type FROM bops_archetypes WHERE active = true
  UNION ALL
  SELECT training_name AS profile_key, 'dual_constellation' AS profile_type FROM bops_constellations WHERE active = true
  UNION ALL
  SELECT triadic_key AS profile_key, 'triadic' AS profile_type FROM bops_triadic_registry WHERE active = true
  UNION ALL
  SELECT 'complex_default', 'complex'
  UNION ALL
  SELECT 'storm_default', 'storm'
),
program_counts AS (
  SELECT linked_profile_key AS profile_key, count(*) AS total_programs
  FROM bops_master_program_library GROUP BY linked_profile_key
)
SELECT p.profile_type, p.profile_key,
  coalesce(pc.total_programs, 0) AS total_programs,
  CASE WHEN coalesce(pc.total_programs, 0) = 0 THEN true ELSE false END AS missing_programs
FROM profile_keys p
LEFT JOIN program_counts pc ON pc.profile_key = p.profile_key
ORDER BY p.profile_type, p.profile_key;

-- Meta profile registry
CREATE TABLE IF NOT EXISTS bops_meta_profile_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_key text UNIQUE NOT NULL,
  profile_type text NOT NULL,
  training_name text NOT NULL,
  clinical_name text NOT NULL,
  teacher_summary text,
  clinician_summary text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE bops_meta_profile_registry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read meta profiles" ON bops_meta_profile_registry FOR SELECT TO authenticated USING (true);

-- Full profile registry (uses correct columns)
CREATE OR REPLACE VIEW v_bops_full_profile_registry WITH (security_invoker = on) AS
SELECT archetype AS profile_key, 'archetype' AS profile_type,
  archetype AS training_name, clinical_name,
  description AS teacher_summary, description AS clinician_summary, active
FROM bops_archetypes
UNION ALL
SELECT training_name AS profile_key, 'dual_constellation' AS profile_type,
  training_name, clinical_name,
  driver_description AS teacher_summary, expression_description AS clinician_summary, active
FROM bops_constellations
UNION ALL
SELECT triadic_key AS profile_key, 'triadic' AS profile_type,
  training_name, clinical_name, teacher_summary, clinician_summary, active
FROM bops_triadic_registry
UNION ALL
SELECT profile_key, profile_type, training_name, clinical_name,
  teacher_summary, clinician_summary, active
FROM bops_meta_profile_registry;

-- Manual profile seeding helper
CREATE OR REPLACE FUNCTION seed_manual_bops_profile(
  p_student uuid, p_training_name text, p_clinical_name text, p_profile_type text,
  p_primary text, p_secondary text DEFAULT NULL, p_tertiary text DEFAULT NULL,
  p_supporting_drivers jsonb DEFAULT '[]'::jsonb,
  p_storm_score numeric DEFAULT 0, p_escalation_index numeric DEFAULT 0,
  p_hidden_need_index numeric DEFAULT 0, p_sensory_load_index numeric DEFAULT 0,
  p_power_conflict_index numeric DEFAULT 0, p_social_complexity_index numeric DEFAULT 0,
  p_recovery_burden_index numeric DEFAULT 0
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_session uuid;
BEGIN
  INSERT INTO bops_assessment_sessions (id, student_id, status, started_at, completed_at)
  VALUES (gen_random_uuid(), p_student, 'completed', now(), now())
  RETURNING id INTO v_session;

  INSERT INTO student_bops_scores (
    student_id, session_id, assessment_date, storm_score, escalation_index,
    hidden_need_index, sensory_load_index, power_conflict_index,
    social_complexity_index, recovery_burden_index, calculated_profile_type,
    calculated_primary, calculated_secondary, calculated_tertiary,
    calculated_training_name, calculated_clinical_name, supporting_drivers
  ) VALUES (
    p_student, v_session, current_date, p_storm_score, p_escalation_index,
    p_hidden_need_index, p_sensory_load_index, p_power_conflict_index,
    p_social_complexity_index, p_recovery_burden_index, p_profile_type,
    p_primary, p_secondary, p_tertiary, p_training_name, p_clinical_name,
    p_supporting_drivers
  );

  INSERT INTO bops_multi_profile_resolution (
    student_id, session_id, elevated_profile_count, classification_type,
    training_name, clinical_name, primary_archetype, secondary_archetype,
    tertiary_archetype, supporting_drivers
  ) VALUES (
    p_student, v_session,
    CASE WHEN p_tertiary IS NOT NULL THEN 3 WHEN p_secondary IS NOT NULL THEN 2 ELSE 1 END,
    p_profile_type, p_training_name, p_clinical_name,
    p_primary, p_secondary, p_tertiary, p_supporting_drivers
  );

  INSERT INTO student_bops_config (
    student_id, bops_enabled, bops_assessment_status, bops_profile_saved,
    bops_programming_available, bops_programming_active, active_bops_session_id
  ) VALUES (p_student, true, 'profile_saved', true, true, true, v_session)
  ON CONFLICT (student_id) DO UPDATE SET
    bops_enabled = true, bops_assessment_status = 'profile_saved',
    bops_profile_saved = true, bops_programming_available = true,
    bops_programming_active = true, active_bops_session_id = v_session, updated_at = now();

  RETURN v_session;
END;
$$;

-- STEP 6: ADMIN + QA LAYER

CREATE OR REPLACE FUNCTION is_bops_admin(p_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM bops_admin_users WHERE user_id = p_user AND is_admin = true);
$$;

-- Admin dashboard
CREATE OR REPLACE VIEW v_bops_admin_dashboard WITH (security_invoker = on) AS
WITH coverage AS (
  SELECT count(*) AS total_profiles,
    count(*) FILTER (WHERE missing_programs) AS profiles_missing_programs
  FROM v_bops_profile_program_coverage_audit
),
programs AS (SELECT count(*) AS total_programs FROM bops_master_program_library),
students AS (
  SELECT count(*) AS total_bops_students,
    count(*) FILTER (WHERE bops_enabled) AS enabled_students,
    count(*) FILTER (WHERE bops_profile_saved) AS profile_saved_students,
    count(*) FILTER (WHERE bops_programming_active) AS programming_active_students
  FROM student_bops_config
),
banks AS (SELECT count(*) AS total_bank_rows FROM bops_program_bank),
targets AS (SELECT count(*) AS total_bops_targets FROM student_targets WHERE source_type = 'bops'),
classrooms AS (SELECT count(*) AS total_genomes FROM bops_classroom_genome),
analytics AS (SELECT count(*) AS total_analytics FROM bops_classroom_analytics)
SELECT coverage.total_profiles, coverage.profiles_missing_programs, programs.total_programs,
  students.total_bops_students, students.enabled_students, students.profile_saved_students,
  students.programming_active_students, banks.total_bank_rows, targets.total_bops_targets,
  classrooms.total_genomes, analytics.total_analytics
FROM coverage, programs, students, banks, targets, classrooms, analytics;

-- Student operations
CREATE OR REPLACE VIEW v_bops_admin_student_operations WITH (security_invoker = on) AS
SELECT r.student_id, r.student_name, r.bops_enabled, r.bops_assessment_status,
  r.bops_profile_saved, r.bops_programming_available, r.bops_programming_active,
  r.latest_scored_session_id, r.assessment_date, r.calculated_training_name,
  r.calculated_clinical_name, r.best_fit_model_name, r.best_fit_band,
  r.selected_cfi_model_name, r.selected_cfi_override, r.nova_day_state, r.beacon_day_state,
  coalesce(t.total_bops_targets, 0) AS total_bops_targets
FROM v_bops_engine_roster r
LEFT JOIN (SELECT student_id, count(*) AS total_bops_targets FROM student_targets WHERE source_type = 'bops' GROUP BY student_id) t
  ON t.student_id = r.student_id;

-- Refresh-all helper
CREATE OR REPLACE FUNCTION refresh_all_bops_system_views()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM refresh_all_bops_classroom_genomes();
  PERFORM refresh_bops_classroom_analytics();
END;
$$;

-- Student repair helper
CREATE OR REPLACE FUNCTION repair_bops_student_state(p_student uuid, p_added_by uuid DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM sync_bops_programs_to_programming(p_student);
  PERFORM assign_bops_student_programs_to_student_targets(p_student, p_added_by);
END;
$$;

-- System QA view
CREATE OR REPLACE VIEW v_bops_system_qa WITH (security_invoker = on) AS
WITH tc AS (SELECT student_id, count(*) AS cnt FROM student_targets WHERE source_type='bops' GROUP BY student_id),
pc AS (SELECT student_id, count(*) AS cnt FROM bops_program_bank WHERE active GROUP BY student_id)
SELECT c.student_id, c.bops_enabled, c.bops_assessment_status, c.bops_profile_saved,
  c.bops_programming_available, c.bops_programming_active, c.active_bops_session_id,
  coalesce(pc.cnt,0) AS active_bops_program_count, coalesce(tc.cnt,0) AS bops_target_count,
  CASE
    WHEN c.bops_enabled AND c.bops_profile_saved AND coalesce(pc.cnt,0)=0 THEN 'Profile saved but no programs'
    WHEN c.bops_enabled AND coalesce(pc.cnt,0)>0 AND coalesce(tc.cnt,0)=0 THEN 'Programs but no targets'
    WHEN c.bops_enabled AND c.active_bops_session_id IS NULL THEN 'Enabled but no session'
  END AS qa_issue
FROM student_bops_config c
LEFT JOIN pc ON pc.student_id=c.student_id
LEFT JOIN tc ON tc.student_id=c.student_id
WHERE (c.bops_enabled AND c.bops_profile_saved AND coalesce(pc.cnt,0)=0)
   OR (c.bops_enabled AND coalesce(pc.cnt,0)>0 AND coalesce(tc.cnt,0)=0)
   OR (c.bops_enabled AND c.active_bops_session_id IS NULL);

-- RLS
ALTER TABLE bops_admin_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "BOPS admins can view admin users" ON bops_admin_users;
CREATE POLICY "BOPS admins can view admin users" ON bops_admin_users FOR SELECT TO authenticated USING (is_bops_admin(auth.uid()));
DROP POLICY IF EXISTS "BOPS admins can manage admin users" ON bops_admin_users;
CREATE POLICY "BOPS admins can manage admin users" ON bops_admin_users FOR ALL TO authenticated USING (is_bops_admin(auth.uid())) WITH CHECK (is_bops_admin(auth.uid()));

ALTER TABLE bops_classroom_analytics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth can read classroom analytics" ON bops_classroom_analytics;
CREATE POLICY "Auth can read classroom analytics" ON bops_classroom_analytics FOR SELECT TO authenticated USING (true);
