
DROP FUNCTION IF EXISTS calculate_vineland_domain_score(text,text,text,integer);
DROP FUNCTION IF EXISTS calculate_vineland_composite_score(text,text,text,integer);
DROP FUNCTION IF EXISTS calculate_vineland_subdomain_vscore(text,text,text,integer);

-- Subdomain v-scale lookup
CREATE FUNCTION calculate_vineland_subdomain_vscore(
  p_form text, p_age_band text, p_subdomain text, p_raw int
)
RETURNS TABLE(v_scale int, age_equivalent text, gsv int)
LANGUAGE sql STABLE SECURITY INVOKER
AS $$
  SELECT v_scale_score, age_equivalent, gsv
  FROM vineland3_norm_lookup_subdomains
  WHERE form_key = p_form AND age_band_key = p_age_band
    AND subdomain_key = p_subdomain AND raw_score = p_raw AND is_active = true
  LIMIT 1;
$$;

-- Domain standard score lookup
CREATE FUNCTION calculate_vineland_domain_score(
  p_form text, p_age_band text, p_domain text, p_vsum int
)
RETURNS TABLE(standard_score int, percentile int, adaptive_level text)
LANGUAGE sql STABLE SECURITY INVOKER
AS $$
  SELECT standard_score, percentile, adaptive_level
  FROM vineland3_norm_lookup_domains
  WHERE form_key = p_form AND age_band_key = p_age_band
    AND domain_key = p_domain AND vscale_sum = p_vsum AND is_active = true
  LIMIT 1;
$$;

-- Composite (ABC) lookup
CREATE FUNCTION calculate_vineland_composite_score(
  p_form text, p_age_band text, p_composite text, p_lookup int
)
RETURNS TABLE(standard_score int, percentile int, adaptive_level text)
LANGUAGE sql STABLE SECURITY INVOKER
AS $$
  SELECT standard_score, percentile, adaptive_level
  FROM vineland3_norm_lookup_composites
  WHERE form_key = p_form AND age_band_key = p_age_band
    AND composite_key = p_composite AND lookup_key = p_lookup AND is_active = true
  LIMIT 1;
$$;
