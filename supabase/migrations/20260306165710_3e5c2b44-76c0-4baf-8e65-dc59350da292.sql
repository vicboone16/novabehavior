
-- ============================================================
-- Phase 3: Acknowledgement RPCs, Enhanced Rec Bridge, Legacy Bulk Migration
-- ============================================================

-- ============================================================
-- 1) Acknowledge publication RPC (with notification)
-- ============================================================
CREATE OR REPLACE FUNCTION public.acknowledge_publication(
  p_publication_id uuid,
  p_reaction text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ack_id uuid;
  v_pub record;
BEGIN
  -- Upsert acknowledgement
  INSERT INTO public.publication_acknowledgements (publication_id, user_id, reaction)
  VALUES (p_publication_id, auth.uid(), p_reaction)
  ON CONFLICT (publication_id, user_id) DO UPDATE
    SET reaction = COALESCE(EXCLUDED.reaction, publication_acknowledgements.reaction),
        acknowledged_at = now()
  RETURNING ack_id INTO v_ack_id;

  -- Get publication info for notification
  SELECT p.published_by, p.client_id, p.agency_id
  INTO v_pub
  FROM public.client_plan_publications p
  WHERE p.publication_id = p_publication_id;

  -- Notify publisher
  IF v_pub.published_by IS NOT NULL AND v_pub.published_by <> auth.uid() THEN
    INSERT INTO public.published_plan_notifications (
      publish_id, recipient_user_id, client_id, agency_id,
      notification_type, title, body
    ) VALUES (
      NULL, v_pub.published_by, v_pub.client_id, v_pub.agency_id,
      'publication_acknowledged',
      'Plan Item Acknowledged',
      'A recipient has acknowledged your published plan item.'
    );
  END IF;

  RETURN v_ack_id;
END;
$$;

-- ============================================================
-- 2) Add comment to publication RPC (with notification)
-- ============================================================
CREATE OR REPLACE FUNCTION public.add_publication_comment(
  p_publication_id uuid,
  p_body text,
  p_parent_comment_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_comment_id uuid;
  v_pub record;
BEGIN
  INSERT INTO public.publication_comments (publication_id, user_id, body, parent_comment_id)
  VALUES (p_publication_id, auth.uid(), p_body, p_parent_comment_id)
  RETURNING comment_id INTO v_comment_id;

  SELECT p.published_by, p.client_id, p.agency_id
  INTO v_pub
  FROM public.client_plan_publications p
  WHERE p.publication_id = p_publication_id;

  -- Notify publisher if commenter is not the publisher
  IF v_pub.published_by IS NOT NULL AND v_pub.published_by <> auth.uid() THEN
    INSERT INTO public.published_plan_notifications (
      publish_id, recipient_user_id, client_id, agency_id,
      notification_type, title, body
    ) VALUES (
      NULL, v_pub.published_by, v_pub.client_id, v_pub.agency_id,
      'publication_comment',
      'New Comment on Plan',
      LEFT(p_body, 100)
    );
  END IF;

  -- If replying, also notify original comment author
  IF p_parent_comment_id IS NOT NULL THEN
    INSERT INTO public.published_plan_notifications (
      publish_id, recipient_user_id, client_id, agency_id,
      notification_type, title, body
    )
    SELECT NULL, pc.user_id, v_pub.client_id, v_pub.agency_id,
      'comment_reply', 'Reply to Your Comment', LEFT(p_body, 100)
    FROM public.publication_comments pc
    WHERE pc.comment_id = p_parent_comment_id
      AND pc.user_id <> auth.uid();
  END IF;

  RETURN v_comment_id;
END;
$$;

-- ============================================================
-- 3) Revoke data collection RPC (BCBA action)
-- ============================================================
CREATE OR REPLACE FUNCTION public.revoke_data_collection(
  p_publish_id uuid,
  p_recipient_user_id uuid
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
  SET bcba_approved = false,
      recipient_opted_in = false,
      updated_at = now()
  WHERE publish_id = p_publish_id AND recipient_user_id = p_recipient_user_id;

  SELECT client_id, agency_id INTO v_item
  FROM public.published_plan_items WHERE publish_id = p_publish_id;

  INSERT INTO public.published_plan_notifications (
    publish_id, recipient_user_id, client_id, agency_id,
    notification_type, title, body
  ) VALUES (
    p_publish_id, p_recipient_user_id, v_item.client_id, v_item.agency_id,
    'dc_revoked', 'Data Collection Revoked',
    'Data collection has been revoked for this plan item.'
  );
END;
$$;

-- ============================================================
-- 4) Enhanced recommendation bridge with detailed reasons_json
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
    WHERE client_id = v_cid AND agency_id = p_agency_id;

    INSERT INTO public.ci_intervention_recs (
      client_id, agency_id, intervention_id, score, reasons_json, status, created_at
    )
    SELECT
      v_cid, p_agency_id, ri.intervention_id, ri.total_score,
      jsonb_build_object(
        'match_tags', ri.reasons_json,
        'total_score', ri.total_score,
        'contraindication_penalty', CASE WHEN ri.total_score < 0 THEN ri.total_score ELSE 0 END,
        'refreshed_at', now()::text
      ),
      'active', now()
    FROM public.aba_library_top_matches_v2(v_cid, p_limit) ri;

    GET DIAGNOSTICS v_row_count = ROW_COUNT;
    v_count := v_count + v_row_count;
  END LOOP;

  RETURN v_count;
END;
$$;

-- ============================================================
-- 5) Legacy bulk migration: stage multiple rows from behavior_interventions
-- ============================================================
CREATE OR REPLACE FUNCTION public.bulk_stage_legacy_interventions(
  p_agency_id uuid,
  p_source_table text DEFAULT 'behavior_interventions'
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int := 0;
  v_rec record;
  v_source_id uuid;
BEGIN
  -- Get or create legacy source
  SELECT legacy_source_id INTO v_source_id
  FROM public.aba_legacy_sources
  WHERE source_table = p_source_table AND source_name = p_source_table
  LIMIT 1;

  IF v_source_id IS NULL THEN
    INSERT INTO public.aba_legacy_sources (source_name, source_table, is_active)
    VALUES (p_source_table, p_source_table, true)
    RETURNING legacy_source_id INTO v_source_id;
  END IF;

  -- Stage each legacy record that hasn't been staged yet
  FOR v_rec IN
    SELECT bi.id, bi.name, bi.description, bi.intervention_type,
           bi.strategies, bi.data_collection_methods,
           bi.reinforcement_strategies, bi.generalization_plan,
           bi.fidelity_criteria
    FROM public.behavior_interventions bi
    WHERE bi.agency_id = p_agency_id
      AND NOT EXISTS (
        SELECT 1 FROM public.aba_legacy_migration_map m
        WHERE m.legacy_source_id = v_source_id
          AND m.legacy_record_key = bi.id::text
      )
  LOOP
    INSERT INTO public.aba_library_import_staging (
      title, intervention_type, owner_agency_id,
      payload
    ) VALUES (
      v_rec.name,
      COALESCE(v_rec.intervention_type, 'behavior_reduction'),
      p_agency_id,
      jsonb_build_object(
        'summary', v_rec.description,
        'operational_definition', v_rec.description,
        'teaching_steps', COALESCE(v_rec.strategies, '[]'::jsonb),
        'fidelity_checklist', COALESCE(v_rec.fidelity_criteria, '[]'::jsonb),
        'reinforcement_examples', COALESCE(v_rec.reinforcement_strategies, '[]'::jsonb),
        'measurement_recommendations', COALESCE(v_rec.data_collection_methods, '[]'::jsonb),
        'generalization_ideas', COALESCE(v_rec.generalization_plan, '[]'::jsonb),
        'legacy_id', v_rec.id
      )
    )
    ON CONFLICT DO NOTHING;

    -- Track in migration map
    INSERT INTO public.aba_legacy_migration_map (
      legacy_source_id, legacy_record_key, staging_id
    )
    SELECT v_source_id, v_rec.id::text, s.staging_id
    FROM public.aba_library_import_staging s
    WHERE s.title = v_rec.name AND s.owner_agency_id = p_agency_id
    ORDER BY s.created_at DESC LIMIT 1
    ON CONFLICT DO NOTHING;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- ============================================================
-- 6) Bulk process all staged imports for an agency
-- ============================================================
CREATE OR REPLACE FUNCTION public.bulk_process_staged_imports(
  p_agency_id uuid
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int := 0;
  v_staging record;
  v_intervention_id uuid;
BEGIN
  FOR v_staging IN
    SELECT staging_id
    FROM public.aba_library_import_staging
    WHERE owner_agency_id = p_agency_id
      AND imported_at IS NULL
    ORDER BY created_at ASC
  LOOP
    BEGIN
      SELECT public.process_aba_import_staging(v_staging.staging_id) INTO v_intervention_id;

      -- Update migration map with the resulting intervention_id
      UPDATE public.aba_legacy_migration_map
      SET intervention_id = v_intervention_id, migrated_at = now()
      WHERE staging_id = v_staging.staging_id;

      v_count := v_count + 1;
    EXCEPTION WHEN OTHERS THEN
      -- Skip already-imported or errored rows; continue
      NULL;
    END;
  END LOOP;

  RETURN v_count;
END;
$$;
