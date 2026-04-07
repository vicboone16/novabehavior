
-- Create a comprehensive safe merge function that handles ALL tables
CREATE OR REPLACE FUNCTION public.safe_merge_behavior(
  p_old_behavior_id uuid,
  p_new_behavior_id uuid,
  p_merge_reason text DEFAULT NULL,
  p_created_by uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_name text;
  v_new_name text;
  v_bsd_updated int := 0;
  v_bsd_conflict_merged int := 0;
  v_sbm_updated int := 0;
  v_bbe_updated int := 0;
BEGIN
  IF p_old_behavior_id = p_new_behavior_id THEN
    RAISE EXCEPTION 'Cannot merge a behavior into itself';
  END IF;

  -- Get names for logging
  SELECT name INTO v_old_name FROM behaviors WHERE id = p_old_behavior_id;
  SELECT name INTO v_new_name FROM behaviors WHERE id = p_new_behavior_id;

  IF v_old_name IS NULL THEN
    RAISE EXCEPTION 'Old behavior ID % not found', p_old_behavior_id;
  END IF;
  IF v_new_name IS NULL THEN
    RAISE EXCEPTION 'New behavior ID % not found', p_new_behavior_id;
  END IF;

  -- STEP 1: Handle behavior_session_data conflicts first
  -- Where both old and new behavior exist in same session, sum frequencies into new and delete old
  WITH conflicts AS (
    SELECT old_bsd.id as old_id, new_bsd.id as new_id,
           COALESCE(old_bsd.frequency, 0) as old_freq,
           COALESCE(new_bsd.frequency, 0) as new_freq,
           GREATEST(COALESCE(old_bsd.duration_seconds, 0), COALESCE(new_bsd.duration_seconds, 0)) as max_dur
    FROM behavior_session_data old_bsd
    JOIN behavior_session_data new_bsd 
      ON old_bsd.session_id = new_bsd.session_id 
      AND old_bsd.student_id = new_bsd.student_id
    WHERE old_bsd.behavior_id = p_old_behavior_id
      AND new_bsd.behavior_id = p_new_behavior_id
  ),
  updated_new AS (
    UPDATE behavior_session_data bsd
    SET frequency = COALESCE(bsd.frequency, 0) + c.old_freq,
        duration_seconds = GREATEST(COALESCE(bsd.duration_seconds, 0), c.max_dur)
    FROM conflicts c
    WHERE bsd.id = c.new_id
    RETURNING bsd.id
  ),
  deleted_old AS (
    DELETE FROM behavior_session_data
    WHERE id IN (SELECT old_id FROM conflicts)
    RETURNING id
  )
  SELECT COUNT(*) INTO v_bsd_conflict_merged FROM deleted_old;

  -- STEP 2: Re-point remaining (non-conflict) behavior_session_data
  UPDATE behavior_session_data
  SET behavior_id = p_new_behavior_id
  WHERE behavior_id = p_old_behavior_id;
  GET DIAGNOSTICS v_bsd_updated = ROW_COUNT;

  -- STEP 3: Update student_behavior_map
  -- Delete maps that would create duplicates (student already has new behavior)
  DELETE FROM student_behavior_map
  WHERE behavior_entry_id = p_old_behavior_id::text
    AND student_id IN (
      SELECT student_id FROM student_behavior_map WHERE behavior_entry_id = p_new_behavior_id::text
    );
  -- Update remaining
  UPDATE student_behavior_map
  SET behavior_entry_id = p_new_behavior_id::text
  WHERE behavior_entry_id = p_old_behavior_id::text;
  GET DIAGNOSTICS v_sbm_updated = ROW_COUNT;

  -- STEP 4: Update behavior_bank_entries
  UPDATE behavior_bank_entries
  SET behavior_id = p_new_behavior_id::text
  WHERE behavior_id = p_old_behavior_id::text;
  GET DIAGNOSTICS v_bbe_updated = ROW_COUNT;

  -- STEP 5: Also update nt_ tables if they exist
  UPDATE nt_learner_behavior_assignments
  SET resolved_behavior_id = p_new_behavior_id,
      status = CASE WHEN status = 'active' THEN 'replaced' ELSE status END
  WHERE behavior_id = p_old_behavior_id
    AND ended_at IS NULL;

  -- STEP 6: Record the merge
  INSERT INTO behavior_merge_map (old_behavior_id, new_behavior_id, merge_reason, migrated_assignments, created_by)
  VALUES (p_old_behavior_id, p_new_behavior_id, p_merge_reason, true, p_created_by)
  ON CONFLICT (old_behavior_id) DO UPDATE
    SET new_behavior_id = EXCLUDED.new_behavior_id,
        merge_reason = EXCLUDED.merge_reason,
        created_by = EXCLUDED.created_by;

  -- STEP 7: Mark old behavior
  UPDATE nt_behaviors
  SET status = 'merged', successor_id = p_new_behavior_id, is_selectable = false,
      archived_at = now(), archived_by = p_created_by
  WHERE id = p_old_behavior_id;

  -- STEP 8: Record alias
  INSERT INTO entity_aliases (entity_type, entity_id, alias_text, alias_kind, created_by)
  VALUES ('behavior', p_new_behavior_id, v_old_name, 'merge_source', p_created_by)
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object(
    'merged_from', v_old_name,
    'merged_into', v_new_name,
    'bsd_repointed', v_bsd_updated,
    'bsd_conflicts_summed', v_bsd_conflict_merged,
    'sbm_updated', v_sbm_updated,
    'bbe_updated', v_bbe_updated
  );
END;
$$;

-- Also override nt_merge_behavior to call the safe version
CREATE OR REPLACE FUNCTION public.nt_merge_behavior(
  p_old_behavior_id uuid,
  p_new_behavior_id uuid,
  p_merge_reason text DEFAULT NULL,
  p_created_by uuid DEFAULT NULL,
  p_migrate_active_assignments boolean DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.safe_merge_behavior(p_old_behavior_id, p_new_behavior_id, p_merge_reason, p_created_by);
END;
$$;
