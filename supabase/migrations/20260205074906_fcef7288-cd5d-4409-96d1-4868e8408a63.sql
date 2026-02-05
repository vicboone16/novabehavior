-- Create payer_directory table (built-in searchable payer list)
CREATE TABLE payer_directory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payer_name TEXT NOT NULL,
  payer_id TEXT NOT NULL,
  source JSONB NOT NULL DEFAULT '{"source_name": "system", "source_type": "embedded_list"}',
  aliases TEXT[] DEFAULT '{}',
  eligibility_supported BOOLEAN DEFAULT true,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(payer_id)
);

-- Add columns to existing payers table
ALTER TABLE payers
ADD COLUMN IF NOT EXISTS payer_id TEXT,
ADD COLUMN IF NOT EXISTS directory_payer_id UUID REFERENCES payer_directory(id),
ADD COLUMN IF NOT EXISTS directory_link JSONB,
ADD COLUMN IF NOT EXISTS contact JSONB,
ADD COLUMN IF NOT EXISTS eligibility JSONB,
ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES agencies(id),
ADD COLUMN IF NOT EXISTS timely_filing_days INTEGER DEFAULT 90,
ADD COLUMN IF NOT EXISTS claims_submission_method TEXT DEFAULT 'manual';

-- Create payer_services table
CREATE TABLE payer_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payer_id UUID NOT NULL REFERENCES payers(id) ON DELETE CASCADE,
  agency_id UUID REFERENCES agencies(id),
  service_name TEXT NOT NULL,
  service_category TEXT DEFAULT 'aba',
  cpt_hcpcs_code TEXT NOT NULL,
  description TEXT,
  modifiers JSONB NOT NULL DEFAULT '{"modifier_1": null, "modifier_2": null, "modifier_3": null, "modifier_4": null, "modifier_required": false, "modifier_notes": null}',
  rate JSONB NOT NULL DEFAULT '{"rate_type": "per_unit", "rate_amount": 0, "currency": "USD", "allow_override_on_claim": false}',
  units JSONB NOT NULL DEFAULT '{"unit_definition": "15_min", "rounding_rule": "nearest"}',
  auth JSONB NOT NULL DEFAULT '{"auth_required": true, "auth_unit_type": "units", "auth_period": "per_auth_span", "enforcement": "warn"}',
  cms1500_defaults JSONB NOT NULL DEFAULT '{"place_of_service_default": "11", "diagnosis_pointer_mode": "auto", "rendering_provider_required": true, "supervising_provider_required": false}',
  status TEXT DEFAULT 'active',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create payer_auth_rules table
CREATE TABLE payer_auth_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payer_id UUID NOT NULL REFERENCES payers(id) ON DELETE CASCADE,
  rule_name TEXT NOT NULL,
  if_conditions JSONB NOT NULL DEFAULT '{}',
  then_actions JSONB NOT NULL DEFAULT '{}',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_payer_directory_payer_id ON payer_directory(payer_id);
CREATE INDEX idx_payer_directory_name ON payer_directory(payer_name);
CREATE INDEX idx_payer_directory_search ON payer_directory USING gin(to_tsvector('english', payer_name || ' ' || payer_id));
CREATE INDEX idx_payer_services_payer_id ON payer_services(payer_id);
CREATE INDEX idx_payer_services_cpt ON payer_services(cpt_hcpcs_code);
CREATE INDEX idx_payers_agency_id ON payers(agency_id);

-- Enable RLS
ALTER TABLE payer_directory ENABLE ROW LEVEL SECURITY;
ALTER TABLE payer_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE payer_auth_rules ENABLE ROW LEVEL SECURITY;

-- RLS policies for payer_directory (readable by all authenticated users)
CREATE POLICY "Authenticated users can view payer directory"
ON payer_directory FOR SELECT TO authenticated
USING (active = true);

-- RLS policies for payer_services
CREATE POLICY "Users can view payer services in their agency"
ON payer_services FOR SELECT TO authenticated
USING (
  agency_id IS NULL
  OR has_agency_access(auth.uid(), agency_id)
  OR is_admin(auth.uid())
);

CREATE POLICY "Admins can insert payer services"
ON payer_services FOR INSERT TO authenticated
WITH CHECK (is_admin(auth.uid()) OR has_agency_access(auth.uid(), agency_id));

CREATE POLICY "Admins can update payer services"
ON payer_services FOR UPDATE TO authenticated
USING (is_admin(auth.uid()) OR has_agency_access(auth.uid(), agency_id));

CREATE POLICY "Admins can delete payer services"
ON payer_services FOR DELETE TO authenticated
USING (is_admin(auth.uid()) OR has_agency_access(auth.uid(), agency_id));

-- RLS policies for payer_auth_rules
CREATE POLICY "Users can view payer auth rules"
ON payer_auth_rules FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM payers p
    WHERE p.id = payer_auth_rules.payer_id
    AND (p.agency_id IS NULL OR has_agency_access(auth.uid(), p.agency_id) OR is_admin(auth.uid()))
  )
);

CREATE POLICY "Admins can manage payer auth rules"
ON payer_auth_rules FOR ALL TO authenticated
USING (is_admin(auth.uid()));

-- Seed payer directory with common payers (using explicit ARRAY[]::text[] for empty arrays)
INSERT INTO payer_directory (payer_name, payer_id, source, aliases, eligibility_supported) VALUES
('Aetna', '60054', '{"source_name": "CAQH CORE", "source_type": "embedded_list", "source_version": "2024.1"}', ARRAY['Aetna Behavioral Health', 'Aetna Better Health'], true),
('Anthem Blue Cross', '47198', '{"source_name": "CAQH CORE", "source_type": "embedded_list"}', ARRAY['Anthem BCBS', 'Anthem Blue Cross Blue Shield'], true),
('Blue Cross Blue Shield', '00060', '{"source_name": "CAQH CORE", "source_type": "embedded_list"}', ARRAY['BCBS', 'Blue Cross'], true),
('Cigna', '62308', '{"source_name": "CAQH CORE", "source_type": "embedded_list"}', ARRAY['Cigna Healthcare', 'Cigna Behavioral Health'], true),
('Humana', '61101', '{"source_name": "CAQH CORE", "source_type": "embedded_list"}', ARRAY['Humana Behavioral Health'], true),
('Kaiser Permanente', '91617', '{"source_name": "CAQH CORE", "source_type": "embedded_list"}', ARRAY['Kaiser'], true),
('UnitedHealthcare', '87726', '{"source_name": "CAQH CORE", "source_type": "embedded_list"}', ARRAY['UHC', 'Optum', 'United Behavioral Health'], true),
('Tricare', '99726', '{"source_name": "CAQH CORE", "source_type": "embedded_list"}', ARRAY['Tricare West', 'Tricare East', 'Tricare Prime'], true),
('Medicare', '00882', '{"source_name": "CAQH CORE", "source_type": "embedded_list"}', ARRAY['CMS', 'Medicare Part B'], true),
('Medicaid - California', 'CAID1', '{"source_name": "state_medicaid", "source_type": "embedded_list"}', ARRAY['Medi-Cal'], true),
('Medicaid - Texas', 'TXMCD', '{"source_name": "state_medicaid", "source_type": "embedded_list"}', ARRAY['Texas Medicaid', 'STAR', 'CHIP'], true),
('Medicaid - Florida', 'FLMCD', '{"source_name": "state_medicaid", "source_type": "embedded_list"}', ARRAY['Florida Medicaid', 'MediKids'], true),
('Medicaid - New York', 'NYMCD', '{"source_name": "state_medicaid", "source_type": "embedded_list"}', ARRAY['NY Medicaid'], true),
('Medicaid - Pennsylvania', 'PAMCD', '{"source_name": "state_medicaid", "source_type": "embedded_list"}', ARRAY['PA Medicaid', 'Medical Assistance'], true),
('Beacon Health Options', '25133', '{"source_name": "CAQH CORE", "source_type": "embedded_list"}', ARRAY['Beacon', 'Beacon Health Strategies'], true),
('Magellan Health', '77074', '{"source_name": "CAQH CORE", "source_type": "embedded_list"}', ARRAY['Magellan Behavioral', 'Magellan Healthcare'], true),
('Molina Healthcare', '20149', '{"source_name": "CAQH CORE", "source_type": "embedded_list"}', ARRAY['Molina'], true),
('Centene', '68069', '{"source_name": "CAQH CORE", "source_type": "embedded_list"}', ARRAY['WellCare', 'Ambetter', 'Health Net'], true),
('Health Net', '95378', '{"source_name": "CAQH CORE", "source_type": "embedded_list"}', ARRAY[]::text[], true),
('Oscar Health', 'OSCAR', '{"source_name": "CAQH CORE", "source_type": "embedded_list"}', ARRAY['Oscar'], true),
('Highmark BCBS', '54154', '{"source_name": "CAQH CORE", "source_type": "embedded_list"}', ARRAY['Highmark', 'Highmark Blue Cross Blue Shield'], true),
('Premera Blue Cross', '91080', '{"source_name": "CAQH CORE", "source_type": "embedded_list"}', ARRAY['Premera'], true),
('Regence Blue Cross', '00932', '{"source_name": "CAQH CORE", "source_type": "embedded_list"}', ARRAY['Regence', 'Regence BCBS'], true),
('Independence Blue Cross', '23243', '{"source_name": "CAQH CORE", "source_type": "embedded_list"}', ARRAY['IBX', 'Independence BC'], true),
('Horizon BCBS', '22099', '{"source_name": "CAQH CORE", "source_type": "embedded_list"}', ARRAY['Horizon Blue Cross', 'Horizon NJ'], true),
('CareFirst BCBS', '52158', '{"source_name": "CAQH CORE", "source_type": "embedded_list"}', ARRAY['CareFirst', 'CareFirst BlueCross'], true),
('BlueCross BlueShield of Tennessee', '00095', '{"source_name": "CAQH CORE", "source_type": "embedded_list"}', ARRAY['BCBS Tennessee', 'BCBST'], true),
('Florida Blue', '00430', '{"source_name": "CAQH CORE", "source_type": "embedded_list"}', ARRAY['Florida BCBS', 'Blue Cross Blue Shield Florida'], true),
('Amerigroup', '15209', '{"source_name": "CAQH CORE", "source_type": "embedded_list"}', ARRAY['Amerigroup Texas', 'Amerigroup Florida'], true),
('Optum Behavioral Health', '00265', '{"source_name": "CAQH CORE", "source_type": "embedded_list"}', ARRAY['Optum', 'UBH'], true);