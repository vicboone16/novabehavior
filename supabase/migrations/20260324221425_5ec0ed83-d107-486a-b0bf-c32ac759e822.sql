CREATE OR REPLACE FUNCTION public.normalize_behavior_label(value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT lower(trim(regexp_replace(regexp_replace(coalesce(value, ''), '[_\-/]+', ' ', 'g'), '\s+', ' ', 'g')))
$$;

CREATE OR REPLACE FUNCTION public.ensure_behavior_catalog_for_student(_student_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.behaviors (id, name)
  SELECT DISTINCT
    sbm.behavior_entry_id,
    trim(regexp_replace(initcap(replace(sbm.behavior_subtype, '_', ' ')), '\s+', ' ', 'g')) AS name
  FROM public.student_behavior_map sbm
  LEFT JOIN public.behaviors b ON b.id = sbm.behavior_entry_id
  WHERE sbm.student_id = _student_id
    AND sbm.active = true
    AND b.id IS NULL;
$$;

CREATE OR REPLACE FUNCTION public.resolve_canonical_behavior_id(
  _student_id uuid,
  _raw_behavior_id text,
  _behavior_name text
)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resolved uuid;
  parsed_behavior_id uuid;
  normalized_name text := public.normalize_behavior_label(_behavior_name);
BEGIN
  BEGIN
    parsed_behavior_id := _raw_behavior_id::uuid;
  EXCEPTION WHEN others THEN
    parsed_behavior_id := NULL;
  END;

  IF parsed_behavior_id IS NOT NULL THEN
    SELECT sbm.behavior_entry_id
    INTO resolved
    FROM public.student_behavior_map sbm
    WHERE sbm.student_id = _student_id
      AND sbm.active = true
      AND sbm.behavior_entry_id = parsed_behavior_id
    LIMIT 1;

    IF resolved IS NOT NULL THEN
      RETURN resolved;
    END IF;
  END IF;

  IF normalized_name = '' THEN
    RETURN NULL;
  END IF;

  IF normalized_name LIKE '%disruptive audible%' OR normalized_name LIKE '%off task%' OR normalized_name LIKE '%disruptive%' THEN
    SELECT sbm.behavior_entry_id
    INTO resolved
    FROM public.student_behavior_map sbm
    WHERE sbm.student_id = _student_id
      AND sbm.active = true
      AND public.normalize_behavior_label(sbm.behavior_subtype) IN ('disruption', 'disruptive')
    ORDER BY sbm.updated_at DESC
    LIMIT 1;

    IF resolved IS NOT NULL THEN
      RETURN resolved;
    END IF;
  END IF;

  IF normalized_name LIKE '%sexualized communication%' OR normalized_name LIKE '%sexualized%' OR normalized_name LIKE '%inappropriate language%' THEN
    SELECT sbm.behavior_entry_id
    INTO resolved
    FROM public.student_behavior_map sbm
    WHERE sbm.student_id = _student_id
      AND sbm.active = true
      AND public.normalize_behavior_label(sbm.behavior_subtype) = 'inappropriate language'
    ORDER BY sbm.updated_at DESC
    LIMIT 1;

    IF resolved IS NOT NULL THEN
      RETURN resolved;
    END IF;
  END IF;

  IF normalized_name LIKE '%non compliance%' OR normalized_name LIKE '%noncompliance%' OR normalized_name LIKE '%task refusal%' OR normalized_name LIKE '%task avoidance%' OR normalized_name LIKE '%vocal protest%' OR normalized_name LIKE '%defiance%' THEN
    SELECT sbm.behavior_entry_id
    INTO resolved
    FROM public.student_behavior_map sbm
    WHERE sbm.student_id = _student_id
      AND sbm.active = true
      AND public.normalize_behavior_label(sbm.behavior_subtype) IN ('noncompliance', 'task refusal', 'defiance')
    ORDER BY CASE public.normalize_behavior_label(sbm.behavior_subtype)
      WHEN 'noncompliance' THEN 0
      WHEN 'task refusal' THEN 1
      WHEN 'defiance' THEN 2
      ELSE 3
    END, sbm.updated_at DESC
    LIMIT 1;

    IF resolved IS NOT NULL THEN
      RETURN resolved;
    END IF;
  END IF;

  SELECT sbm.behavior_entry_id
  INTO resolved
  FROM public.student_behavior_map sbm
  WHERE sbm.student_id = _student_id
    AND sbm.active = true
    AND public.normalize_behavior_label(sbm.behavior_subtype) = normalized_name
  ORDER BY sbm.updated_at DESC
  LIMIT 1;

  IF resolved IS NOT NULL THEN
    RETURN resolved;
  END IF;

  SELECT sbm.behavior_entry_id
  INTO resolved
  FROM public.student_behavior_map sbm
  WHERE sbm.student_id = _student_id
    AND sbm.active = true
    AND (
      normalized_name LIKE '%' || public.normalize_behavior_label(sbm.behavior_subtype) || '%'
      OR public.normalize_behavior_label(sbm.behavior_subtype) LIKE '%' || normalized_name || '%'
    )
  ORDER BY length(sbm.behavior_subtype) DESC, sbm.updated_at DESC
  LIMIT 1;

  RETURN resolved;
END;
$$;

CREATE OR REPLACE FUNCTION public.rebuild_behavior_session_data_for_session(_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.behavior_session_data
  WHERE session_id = _session_id;

  INSERT INTO public.behaviors (id, name)
  SELECT DISTINCT
    mapped.canonical_behavior_id,
    mapped.canonical_behavior_name
  FROM (
    SELECT
      public.resolve_canonical_behavior_id(sd.student_id, sd.behavior_id, coalesce(sd.behavior_name, '')) AS canonical_behavior_id,
      trim(regexp_replace(initcap(replace(sbm.behavior_subtype, '_', ' ')), '\s+', ' ', 'g')) AS canonical_behavior_name
    FROM public.session_data sd
    JOIN public.student_behavior_map sbm
      ON sbm.student_id = sd.student_id
     AND sbm.active = true
     AND sbm.behavior_entry_id = public.resolve_canonical_behavior_id(sd.student_id, sd.behavior_id, coalesce(sd.behavior_name, ''))
    WHERE sd.session_id = _session_id
  ) mapped
  LEFT JOIN public.behaviors b ON b.id = mapped.canonical_behavior_id
  WHERE mapped.canonical_behavior_id IS NOT NULL
    AND b.id IS NULL;

  INSERT INTO public.behavior_session_data (
    id,
    session_id,
    student_id,
    behavior_id,
    data_state,
    frequency,
    duration_seconds,
    created_at,
    updated_at,
    created_by_ai,
    raw_source_text
  )
  SELECT
    gen_random_uuid(),
    grouped.session_id,
    grouped.student_id,
    grouped.canonical_behavior_id,
    'measured',
    NULLIF(grouped.frequency_count, 0),
    NULLIF(grouped.duration_total, 0),
    grouped.first_created_at,
    now(),
    false,
    grouped.source_behavior_names
  FROM (
    SELECT
      sd.session_id,
      sd.student_id,
      public.resolve_canonical_behavior_id(sd.student_id, sd.behavior_id, coalesce(sd.behavior_name, '')) AS canonical_behavior_id,
      COUNT(*) FILTER (WHERE lower(coalesce(sd.event_type, '')) = 'frequency')::integer AS frequency_count,
      COALESCE(SUM(CASE WHEN lower(coalesce(sd.event_type, '')) = 'duration' THEN COALESCE(sd.duration_seconds, 0) ELSE 0 END), 0)::integer AS duration_total,
      MIN(sd.created_at) AS first_created_at,
      string_agg(DISTINCT coalesce(sd.behavior_name, ''), ', ' ORDER BY coalesce(sd.behavior_name, '')) AS source_behavior_names
    FROM public.session_data sd
    WHERE sd.session_id = _session_id
    GROUP BY
      sd.session_id,
      sd.student_id,
      public.resolve_canonical_behavior_id(sd.student_id, sd.behavior_id, coalesce(sd.behavior_name, ''))
  ) grouped
  WHERE grouped.canonical_behavior_id IS NOT NULL
    AND (grouped.frequency_count > 0 OR grouped.duration_total > 0)
  ON CONFLICT (session_id, behavior_id)
  DO UPDATE SET
    student_id = EXCLUDED.student_id,
    data_state = EXCLUDED.data_state,
    frequency = EXCLUDED.frequency,
    duration_seconds = EXCLUDED.duration_seconds,
    updated_at = now(),
    raw_source_text = EXCLUDED.raw_source_text;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_behavior_session_data_from_session_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.ensure_behavior_catalog_for_student(OLD.student_id);
    PERFORM public.rebuild_behavior_session_data_for_session(OLD.session_id);
    RETURN OLD;
  END IF;

  PERFORM public.ensure_behavior_catalog_for_student(NEW.student_id);
  PERFORM public.rebuild_behavior_session_data_for_session(NEW.session_id);

  IF TG_OP = 'UPDATE' AND OLD.session_id IS DISTINCT FROM NEW.session_id THEN
    PERFORM public.rebuild_behavior_session_data_for_session(OLD.session_id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_behavior_session_data_from_session_data ON public.session_data;

CREATE TRIGGER trg_sync_behavior_session_data_from_session_data
AFTER INSERT OR UPDATE OR DELETE ON public.session_data
FOR EACH ROW
EXECUTE FUNCTION public.sync_behavior_session_data_from_session_data();