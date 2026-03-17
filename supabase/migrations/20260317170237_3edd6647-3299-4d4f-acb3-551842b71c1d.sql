
-- Add unique constraints for upsert support on norm lookup tables
-- Subdomain norms
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'vineland3_subdomain_norm_uq'
  ) THEN
    ALTER TABLE vineland3_norm_lookup_subdomains
      ADD CONSTRAINT vineland3_subdomain_norm_uq
      UNIQUE (form_key, age_band_key, subdomain_key, raw_score);
  END IF;
END $$;

-- Domain norms
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'vineland3_domain_norm_uq'
  ) THEN
    ALTER TABLE vineland3_norm_lookup_domains
      ADD CONSTRAINT vineland3_domain_norm_uq
      UNIQUE (form_key, age_band_key, domain_key, vscale_sum);
  END IF;
END $$;

-- Composite norms
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'vineland3_composite_norm_uq'
  ) THEN
    ALTER TABLE vineland3_norm_lookup_composites
      ADD CONSTRAINT vineland3_composite_norm_uq
      UNIQUE (form_key, age_band_key, composite_key, lookup_key);
  END IF;
END $$;
