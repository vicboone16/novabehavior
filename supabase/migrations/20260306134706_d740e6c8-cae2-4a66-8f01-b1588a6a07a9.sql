
-- ============================================================
-- 8) Updated scoring function (using students table directly)
-- ============================================================
CREATE OR REPLACE FUNCTION public.aba_library_top_matches_v2(
  p_client_id uuid,
  p_limit int DEFAULT 12
)
RETURNS TABLE (
  intervention_id uuid,
  title text,
  intervention_type text,
  total_score numeric,
  reasons_json jsonb
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH client_profile AS (
    SELECT s.id AS client_id,
           s.agency_id,
           EXTRACT(YEAR FROM age(COALESCE(s.dob, s.date_of_birth)))::int AS age_years,
           s.communication_level,
           s.diagnosis_cluster,
           s.primary_setting,
           h.function_primary, h.function_secondary
    FROM public.students s
    LEFT JOIN LATERAL (
      SELECT fh.function_primary, fh.function_secondary
      FROM public.fba_hypotheses fh
      WHERE fh.client_id = s.id
        AND (fh.end_date IS NULL OR fh.end_date >= current_date)
      ORDER BY fh.effective_date DESC, fh.created_at DESC
      LIMIT 1
    ) h ON true
    WHERE s.id = p_client_id
  ),
  tag_scores AS (
    SELECT it.intervention_id,
      SUM(CASE
        WHEN t.tag_type = 'function' AND t.tag_key = cp.function_primary THEN 30
        WHEN t.tag_type = 'function' AND t.tag_key = cp.function_secondary THEN 15
        WHEN t.tag_type = 'setting' AND t.tag_key = cp.primary_setting THEN 20
        WHEN t.tag_type = 'communication_level' AND t.tag_key = cp.communication_level THEN 15
        WHEN t.tag_type = 'diagnosis' AND t.tag_key = cp.diagnosis_cluster THEN 10
        WHEN t.tag_type = 'contraindication' THEN -50
        ELSE 0
      END) AS score
    FROM public.aba_library_intervention_tags it
    JOIN public.aba_library_tags t ON t.tag_id = it.tag_id
    CROSS JOIN client_profile cp
    GROUP BY it.intervention_id
  )
  SELECT i.intervention_id, i.title, i.intervention_type,
    COALESCE(ts.score, 0)::numeric AS total_score,
    jsonb_build_object(
      'function_primary', cp.function_primary,
      'function_secondary', cp.function_secondary,
      'setting', cp.primary_setting,
      'communication_level', cp.communication_level,
      'diagnosis_cluster', cp.diagnosis_cluster
    ) AS reasons_json
  FROM public.aba_library_interventions i
  CROSS JOIN client_profile cp
  LEFT JOIN tag_scores ts ON ts.intervention_id = i.intervention_id
  WHERE i.is_active = true
    AND (i.visibility = 'global' OR i.owner_agency_id = cp.agency_id)
    AND COALESCE(ts.score, 0) > 0
  ORDER BY COALESCE(ts.score, 0) DESC
  LIMIT p_limit;
$$;

-- ============================================================
-- 6) Recommendation bridge
-- ============================================================
CREATE OR REPLACE FUNCTION public.refresh_ci_intervention_recs(
  p_agency_id uuid,
  p_client_id uuid DEFAULT NULL,
  p_limit int DEFAULT 10
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int := 0;
  v_row_count int;
  v_cid uuid;
BEGIN
  FOR v_cid IN
    SELECT s.id
    FROM public.students s
    WHERE s.agency_id = p_agency_id
      AND s.active = true
      AND (p_client_id IS NULL OR s.id = p_client_id)
  LOOP
    DELETE FROM public.ci_intervention_recs
    WHERE client_id = v_cid;

    INSERT INTO public.ci_intervention_recs (
      client_id, agency_id, intervention_id, score, reasons_json, status, created_at
    )
    SELECT
      v_cid, p_agency_id, ri.intervention_id, ri.total_score, ri.reasons_json, 'active', now()
    FROM public.aba_library_top_matches_v2(v_cid, p_limit) ri;

    GET DIAGNOSTICS v_row_count = ROW_COUNT;
    v_count := v_count + v_row_count;
  END LOOP;

  RETURN v_count;
END;
$$;

-- ============================================================
-- 7) Legacy migration bridge
-- ============================================================
CREATE OR REPLACE FUNCTION public.process_aba_import_staging(
  p_staging_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staging record;
  v_intervention_id uuid;
  v_payload jsonb;
BEGIN
  SELECT * INTO v_staging FROM public.aba_library_import_staging WHERE staging_id = p_staging_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Staging record not found'; END IF;
  IF v_staging.imported_at IS NOT NULL THEN RAISE EXCEPTION 'Already imported'; END IF;

  v_payload := v_staging.payload::jsonb;

  INSERT INTO public.aba_library_interventions (
    title, intervention_type, summary, operational_definition,
    teaching_steps, scripts, reinforcement_examples, fidelity_checklist,
    contraindications, measurement_recommendations, generalization_ideas,
    troubleshooting, prerequisites, prompt_hierarchy, sources,
    owner_agency_id, visibility, is_template, is_active
  ) VALUES (
    v_staging.title,
    COALESCE(v_staging.intervention_type, 'behavior_reduction'),
    v_payload->>'summary',
    v_payload->>'operational_definition',
    COALESCE(v_payload->'teaching_steps', '[]'::jsonb),
    COALESCE(v_payload->'scripts', '{}'::jsonb),
    COALESCE(v_payload->'reinforcement_examples', '[]'::jsonb),
    COALESCE(v_payload->'fidelity_checklist', '[]'::jsonb),
    COALESCE(v_payload->'contraindications', '[]'::jsonb),
    COALESCE(v_payload->'measurement_recommendations', '[]'::jsonb),
    COALESCE(v_payload->'generalization_ideas', '[]'::jsonb),
    COALESCE(v_payload->'troubleshooting', '[]'::jsonb),
    COALESCE(v_payload->'prerequisites', '[]'::jsonb),
    COALESCE(v_payload->'prompt_hierarchy', '[]'::jsonb),
    COALESCE(v_payload->'sources', '[]'::jsonb),
    v_staging.owner_agency_id,
    CASE WHEN v_staging.owner_agency_id IS NOT NULL THEN 'agency' ELSE 'global' END,
    true, true
  )
  RETURNING intervention_id INTO v_intervention_id;

  IF v_payload ? 'tags' AND jsonb_array_length(v_payload->'tags') > 0 THEN
    INSERT INTO public.aba_library_intervention_tags (intervention_id, tag_id, weight)
    SELECT v_intervention_id, t.tag_id, 1
    FROM jsonb_array_elements_text(v_payload->'tags') AS tag_key
    JOIN public.aba_library_tags t ON t.tag_key = tag_key
    ON CONFLICT DO NOTHING;
  END IF;

  UPDATE public.aba_library_import_staging SET imported_at = now() WHERE staging_id = p_staging_id;
  RETURN v_intervention_id;
END;
$$;

-- ============================================================
-- 9) Publish helper
-- ============================================================
CREATE OR REPLACE FUNCTION public.publish_plan_item(
  p_plan_item_id uuid,
  p_published_by uuid,
  p_target_portal text DEFAULT 'both',
  p_data_collection_mode text DEFAULT 'fyi'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item record;
  v_plan record;
  v_intervention record;
  v_pub_id uuid;
  v_version_id uuid;
  v_recipient record;
  v_portals text[];
BEGIN
  SELECT * INTO v_item FROM public.client_intervention_plan_items WHERE item_id = p_plan_item_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Plan item not found'; END IF;

  SELECT * INTO v_plan FROM public.client_intervention_plans WHERE plan_id = v_item.plan_id;

  v_portals := CASE p_target_portal
    WHEN 'both' THEN ARRAY['parent','teacher']
    WHEN 'parent' THEN ARRAY['parent']
    WHEN 'teacher' THEN ARRAY['teacher']
    ELSE ARRAY['parent','teacher']
  END;

  INSERT INTO public.published_plan_items (
    item_id, client_id, agency_id, published_by, target_portal, data_collection_mode, status
  ) VALUES (
    p_plan_item_id, v_plan.client_id, v_plan.agency_id, p_published_by, p_target_portal, p_data_collection_mode, 'published'
  )
  ON CONFLICT (item_id) DO UPDATE SET
    target_portal = EXCLUDED.target_portal,
    data_collection_mode = EXCLUDED.data_collection_mode,
    status = 'published',
    updated_at = now()
  RETURNING publish_id INTO v_pub_id;

  SELECT * INTO v_intervention
  FROM public.aba_library_interventions
  WHERE intervention_id = v_item.intervention_id;

  INSERT INTO public.published_plan_versions (
    publish_id, version_num, snapshot
  )
  SELECT v_pub_id,
    COALESCE((SELECT MAX(version_num) FROM public.published_plan_versions WHERE publish_id = v_pub_id), 0) + 1,
    jsonb_build_object(
      'title', COALESCE(v_item.custom_title, v_intervention.title),
      'summary', v_intervention.summary,
      'teaching_steps', v_intervention.teaching_steps,
      'scripts', v_intervention.scripts,
      'reinforcement_examples', v_intervention.reinforcement_examples,
      'fidelity_checklist', v_intervention.fidelity_checklist
    )
  RETURNING version_id INTO v_version_id;

  FOR v_recipient IN
    SELECT rr.user_id, rr.portal
    FROM public.resolve_plan_recipients(v_plan.client_id, v_portals) rr
  LOOP
    INSERT INTO public.published_plan_recipients (publish_id, user_id, recipient_type)
    VALUES (v_pub_id, v_recipient.user_id, v_recipient.portal)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.published_plan_data_collection (publish_id, recipient_user_id, mode)
    VALUES (v_pub_id, v_recipient.user_id, p_data_collection_mode)
    ON CONFLICT (publish_id, recipient_user_id) DO UPDATE SET
      mode = EXCLUDED.mode, updated_at = now();

    INSERT INTO public.published_plan_notifications (
      publish_id, recipient_user_id, client_id, agency_id, notification_type, title, body
    ) VALUES (
      v_pub_id, v_recipient.user_id, v_plan.client_id, v_plan.agency_id,
      'plan_published', 'New Plan Update', 'A new intervention plan has been shared with you.'
    );
  END LOOP;

  RETURN v_pub_id;
END;
$$;

-- ============================================================
-- 10) Data collection handshake RPCs
-- ============================================================
CREATE OR REPLACE FUNCTION public.request_data_collection(
  p_publish_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.published_plan_data_collection
  SET recipient_requested_at = now(), updated_at = now()
  WHERE publish_id = p_publish_id AND recipient_user_id = auth.uid();

  INSERT INTO public.published_plan_notifications (
    publish_id, recipient_user_id, client_id, agency_id, notification_type, title, body
  )
  SELECT p_publish_id, ppi.published_by, ppi.client_id, ppi.agency_id,
    'dc_requested', 'Data Collection Requested', 'A recipient has requested to start data collection.'
  FROM public.published_plan_items ppi
  WHERE ppi.publish_id = p_publish_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_data_collection(
  p_publish_id uuid,
  p_recipient_user_id uuid,
  p_approved boolean DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item record;
BEGIN
  UPDATE public.published_plan_data_collection
  SET bcba_approved = p_approved,
      bcba_approved_by = auth.uid(),
      bcba_approved_at = now(),
      recipient_opted_in = p_approved,
      updated_at = now()
  WHERE publish_id = p_publish_id AND recipient_user_id = p_recipient_user_id;

  SELECT client_id, agency_id INTO v_item
  FROM public.published_plan_items WHERE publish_id = p_publish_id;

  INSERT INTO public.published_plan_notifications (
    publish_id, recipient_user_id, client_id, agency_id, notification_type, title, body
  ) VALUES (
    p_publish_id, p_recipient_user_id, v_item.client_id, v_item.agency_id,
    CASE WHEN p_approved THEN 'dc_approved' ELSE 'dc_denied' END,
    CASE WHEN p_approved THEN 'Data Collection Approved' ELSE 'Data Collection Declined' END,
    CASE WHEN p_approved THEN 'You can now collect data for this plan item.' ELSE 'Your data collection request was declined.' END
  );
END;
$$;
