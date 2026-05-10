-- Auto-canonicalize behaviors when student_behavior_map gets a new row
-- Mirrors the Lorenzo manual fix going forward.

CREATE OR REPLACE FUNCTION public.nt_auto_register_canonical_behavior()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_behavior_name TEXT;
  v_canonical_id UUID;
  v_default_domain UUID;
BEGIN
  -- Resolve a name from the bank entry, falling back to subtype
  SELECT COALESCE(NULLIF(TRIM(bbe.name), ''), NULLIF(TRIM(NEW.behavior_subtype), ''))
    INTO v_behavior_name
  FROM behavior_bank_entries bbe
  WHERE bbe.id = NEW.behavior_entry_id;

  IF v_behavior_name IS NULL OR v_behavior_name = '' THEN
    RETURN NEW;
  END IF;

  -- Find or create canonical nt_behaviors row by case-insensitive name match
  SELECT id INTO v_canonical_id
  FROM nt_behaviors
  WHERE LOWER(name) = LOWER(v_behavior_name)
    AND archived_at IS NULL
  LIMIT 1;

  IF v_canonical_id IS NULL THEN
    SELECT id INTO v_default_domain
    FROM nt_behavior_domains
    WHERE LOWER(name) IN ('uncategorized','general','other')
    LIMIT 1;

    INSERT INTO nt_behaviors (id, name, definition, status, is_selectable, domain_id)
    VALUES (gen_random_uuid(), v_behavior_name, NEW.notes, 'active', true, v_default_domain)
    RETURNING id INTO v_canonical_id;
  END IF;

  -- Link to learner if not already linked
  INSERT INTO nt_learner_behavior_assignments (learner_id, behavior_id, resolved_behavior_id, behavior_name_snapshot, status, assigned_at)
  SELECT NEW.student_id, v_canonical_id, v_canonical_id, v_behavior_name, 'active', now()
  WHERE NOT EXISTS (
    SELECT 1 FROM nt_learner_behavior_assignments
    WHERE learner_id = NEW.student_id
      AND behavior_id = v_canonical_id
      AND ended_at IS NULL
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block the parent insert
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sbm_auto_canonical ON public.student_behavior_map;
CREATE TRIGGER trg_sbm_auto_canonical
AFTER INSERT ON public.student_behavior_map
FOR EACH ROW
WHEN (NEW.active = true)
EXECUTE FUNCTION public.nt_auto_register_canonical_behavior();