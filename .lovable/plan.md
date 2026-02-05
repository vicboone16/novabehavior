
# Insurance Billing Configuration Module with Payer Directory

## Overview

This plan implements a comprehensive payer configuration system with:
1. **Searchable Payer Directory** - Built-in national payer database searchable by name or payer ID
2. **Payer Detail Pages** - Full payer configuration with tabbed interface
3. **Payer Services** - CPT/HCPCS code management with rates, units, and CMS-1500 mapping
4. **Service Detail Pages** - Complete configuration for each billable service
5. **Claim Generation Integration** - Automatic unit calculation and validation

---

## Database Schema

### 1. `payer_directory` Table (Built-in Searchable Payer List)

```sql
CREATE TABLE payer_directory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payer_name TEXT NOT NULL,
  payer_id TEXT NOT NULL,                    -- National payer ID (e.g., "60054" for Aetna)
  source JSONB NOT NULL DEFAULT '{"source_name": "system", "source_type": "embedded_list"}',
  aliases TEXT[] DEFAULT '{}',
  eligibility_supported BOOLEAN DEFAULT true,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(payer_id)
);
```

### 2. Modify Existing `payers` Table

```sql
ALTER TABLE payers
ADD COLUMN payer_id TEXT,                              -- National payer ID
ADD COLUMN directory_payer_id UUID REFERENCES payer_directory(id),
ADD COLUMN directory_link JSONB,                       -- {source_name, payer_directory_key}
ADD COLUMN contact JSONB,                              -- {phone, fax, website, notes}
ADD COLUMN eligibility JSONB,                          -- {supports_270_271, eligibility_notes}
ADD COLUMN agency_id UUID REFERENCES agencies(id),
ADD COLUMN timely_filing_days INTEGER DEFAULT 90,
ADD COLUMN claims_submission_method TEXT DEFAULT 'manual';
```

### 3. `payer_services` Table (Per-Payer Service Configuration)

```sql
CREATE TABLE payer_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payer_id UUID NOT NULL REFERENCES payers(id) ON DELETE CASCADE,
  agency_id UUID REFERENCES agencies(id),
  
  -- Service Identification
  service_name TEXT NOT NULL,
  service_category TEXT DEFAULT 'aba',  -- aba, ot, pt, speech, psych, other
  cpt_hcpcs_code TEXT NOT NULL,
  description TEXT,
  
  -- Modifiers (JSONB object matching schema)
  modifiers JSONB NOT NULL DEFAULT '{
    "modifier_1": null,
    "modifier_2": null,
    "modifier_3": null,
    "modifier_4": null,
    "modifier_required": false,
    "modifier_notes": null
  }',
  
  -- Rate (JSONB object matching schema)
  rate JSONB NOT NULL DEFAULT '{
    "rate_type": "per_unit",
    "rate_amount": 0,
    "currency": "USD",
    "allow_override_on_claim": false
  }',
  
  -- Units (JSONB object matching schema)
  units JSONB NOT NULL DEFAULT '{
    "unit_definition": "15_min",
    "rounding_rule": "nearest"
  }',
  
  -- Authorization (JSONB object matching schema)
  auth JSONB NOT NULL DEFAULT '{
    "auth_required": true,
    "auth_unit_type": "units",
    "auth_period": "per_auth_span",
    "enforcement": "warn"
  }',
  
  -- CMS-1500 Defaults (JSONB object matching schema)
  cms1500_defaults JSONB NOT NULL DEFAULT '{
    "place_of_service_default": "11",
    "diagnosis_pointer_mode": "auto",
    "rendering_provider_required": true,
    "supervising_provider_required": false
  }',
  
  -- Status
  status TEXT DEFAULT 'active',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  
  UNIQUE(payer_id, cpt_hcpcs_code, (modifiers->>'modifier_1'), (modifiers->>'modifier_2'))
);
```

### 4. `payer_auth_rules` Table (Payer-Wide Authorization Rules)

```sql
CREATE TABLE payer_auth_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payer_id UUID NOT NULL REFERENCES payers(id) ON DELETE CASCADE,
  
  rule_name TEXT NOT NULL,
  if_conditions JSONB NOT NULL DEFAULT '{}',    -- {cpt_in: [], place_of_service_in: [], modifier_required: bool}
  then_actions JSONB NOT NULL DEFAULT '{}',     -- {auth_required, auth_unit_type, auth_period, max_units_per_period, enforcement}
  active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 5. Seed Payer Directory Data

Pre-populate with 50+ common payers:

```sql
INSERT INTO payer_directory (payer_name, payer_id, source, aliases, eligibility_supported) VALUES
('Aetna', '60054', '{"source_name": "CAQH CORE", "source_type": "embedded_list", "source_version": "2024.1"}', ARRAY['Aetna Behavioral Health', 'Aetna Better Health'], true),
('Anthem Blue Cross', '47198', '{"source_name": "CAQH CORE", "source_type": "embedded_list"}', ARRAY['Anthem BCBS'], true),
('Blue Cross Blue Shield', '00060', '{"source_name": "CAQH CORE", "source_type": "embedded_list"}', ARRAY['BCBS'], true),
('Cigna', '62308', '{"source_name": "CAQH CORE", "source_type": "embedded_list"}', ARRAY['Cigna Healthcare'], true),
('Humana', '61101', '{"source_name": "CAQH CORE", "source_type": "embedded_list"}', ARRAY[], true),
('Kaiser Permanente', '91617', '{"source_name": "CAQH CORE", "source_type": "embedded_list"}', ARRAY['Kaiser'], true),
('UnitedHealthcare', '87726', '{"source_name": "CAQH CORE", "source_type": "embedded_list"}', ARRAY['UHC', 'Optum'], true),
('Tricare', '99726', '{"source_name": "CAQH CORE", "source_type": "embedded_list"}', ARRAY['Tricare West', 'Tricare East'], true),
('Medicare', '00882', '{"source_name": "CAQH CORE", "source_type": "embedded_list"}', ARRAY['CMS'], true),
('Medicaid - California', 'CAID1', '{"source_name": "state_medicaid", "source_type": "embedded_list"}', ARRAY['Medi-Cal'], true),
('Medicaid - Texas', 'TXMCD', '{"source_name": "state_medicaid", "source_type": "embedded_list"}', ARRAY['Texas Medicaid'], true),
('Medicaid - Florida', 'FLMCD', '{"source_name": "state_medicaid", "source_type": "embedded_list"}', ARRAY['Florida Medicaid'], true),
('Beacon Health Options', '25133', '{"source_name": "CAQH CORE", "source_type": "embedded_list"}', ARRAY['Beacon'], true),
('Magellan Health', '77074', '{"source_name": "CAQH CORE", "source_type": "embedded_list"}', ARRAY['Magellan Behavioral'], true),
('Molina Healthcare', '20149', '{"source_name": "CAQH CORE", "source_type": "embedded_list"}', ARRAY[], true),
('Centene', '68069', '{"source_name": "CAQH CORE", "source_type": "embedded_list"}', ARRAY['WellCare', 'Ambetter'], true),
('Health Net', '95378', '{"source_name": "CAQH CORE", "source_type": "embedded_list"}', ARRAY[], true),
('Oscar Health', 'OSCAR', '{"source_name": "CAQH CORE", "source_type": "embedded_list"}', ARRAY[], true),
('Highmark BCBS', '54154', '{"source_name": "CAQH CORE", "source_type": "embedded_list"}', ARRAY['Highmark'], true),
('Premera Blue Cross', '91080', '{"source_name": "CAQH CORE", "source_type": "embedded_list"}', ARRAY['Premera'], true);
-- ... additional payers
```

---

## TypeScript Types

### New File: `src/types/payerConfig.ts`

```typescript
// ========== Payer Directory ==========
export interface PayerDirectorySource {
  source_name: string;
  source_type: 'embedded_list' | 'file_import' | 'api_sync';
  source_version?: string;
}

export interface PayerDirectoryEntry {
  id: string;
  payer_name: string;
  payer_id: string;
  source: PayerDirectorySource;
  aliases: string[];
  eligibility_supported: boolean;
  active: boolean;
  created_at: string;
}

// ========== Payer ==========
export type PayerType = 'commercial' | 'medicaid' | 'medicare' | 'tricare' | 'other';
export type PayerStatus = 'active' | 'inactive';

export interface PayerDirectoryLink {
  source_name: string;
  payer_directory_key: string;
}

export interface PayerContact {
  phone?: string;
  fax?: string;
  website?: string;
  notes?: string;
}

export interface PayerEligibility {
  supports_270_271?: boolean;
  eligibility_notes?: string;
}

export interface Payer {
  id: string;
  name: string;
  payer_id?: string;
  payer_type: PayerType;
  status: PayerStatus;
  directory_payer_id?: string;
  directory_link?: PayerDirectoryLink;
  contact?: PayerContact;
  eligibility?: PayerEligibility;
  agency_id?: string;
  timely_filing_days?: number;
  claims_submission_method?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ========== Payer Service ==========
export type ServiceCategory = 'aba' | 'ot' | 'pt' | 'speech' | 'psych' | 'other';
export type RateType = 'per_unit' | 'per_hour' | 'flat_fee';
export type UnitDefinition = '15_min' | '30_min' | '60_min' | 'per_session' | 'per_day' | 'per_month';
export type RoundingRule = 'none' | 'nearest' | 'up' | 'down';
export type AuthUnitType = 'units' | 'hours' | 'visits' | 'dollars' | 'monthly_allowance';
export type AuthPeriod = 'per_month' | 'per_week' | 'per_auth_span' | 'per_calendar_year';
export type AuthEnforcement = 'warn' | 'block';
export type DiagnosisPointerMode = 'auto' | 'manual';

export interface ServiceModifiers {
  modifier_1?: string;
  modifier_2?: string;
  modifier_3?: string;
  modifier_4?: string;
  modifier_required: boolean;
  modifier_notes?: string;
}

export interface ServiceRate {
  rate_type: RateType;
  rate_amount: number;
  currency: string;
  effective_start_date?: string;
  effective_end_date?: string;
  allow_override_on_claim: boolean;
}

export interface ServiceUnits {
  unit_definition: UnitDefinition;
  rounding_rule: RoundingRule;
  max_units_per_day?: number;
  max_units_per_auth_period?: number;
  unit_notes?: string;
}

export interface ServiceAuth {
  auth_required: boolean;
  auth_unit_type: AuthUnitType;
  auth_period: AuthPeriod;
  enforcement: AuthEnforcement;
}

export interface ServiceCMS1500Defaults {
  place_of_service_default: string;
  diagnosis_pointer_mode: DiagnosisPointerMode;
  rendering_provider_required: boolean;
  supervising_provider_required: boolean;
}

export interface PayerService {
  id: string;
  payer_id: string;
  agency_id?: string;
  service_name: string;
  service_category: ServiceCategory;
  cpt_hcpcs_code: string;
  description?: string;
  modifiers: ServiceModifiers;
  rate: ServiceRate;
  units: ServiceUnits;
  auth: ServiceAuth;
  cms1500_defaults: ServiceCMS1500Defaults;
  status: 'active' | 'inactive';
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// ========== Auth Rule ==========
export interface AuthRuleConditions {
  cpt_in?: string[];
  place_of_service_in?: string[];
  modifier_required?: boolean;
}

export interface AuthRuleActions {
  auth_required?: boolean;
  auth_unit_type?: AuthUnitType;
  auth_period?: AuthPeriod;
  max_units_per_period?: number;
  enforcement?: AuthEnforcement;
}

export interface PayerAuthRule {
  id: string;
  payer_id: string;
  rule_name: string;
  if_conditions: AuthRuleConditions;
  then_actions: AuthRuleActions;
  active: boolean;
  created_at: string;
}

// ========== Claim Line ==========
export interface ClaimLineAuthReference {
  auth_id: string;
  remaining_units_before: number;
  remaining_units_after: number;
}

export interface ClaimLine {
  id: string;
  payer_id: string;
  service_id: string;
  date_of_service_from: string;
  date_of_service_to: string;
  place_of_service: string;
  cpt_hcpcs_code: string;
  modifiers: string[];
  diagnosis_pointers: number[];
  units: number;
  charge_amount: number;
  rate_used: number;
  unit_definition_used: UnitDefinition;
  rendering_provider_npi?: string;
  supervising_provider_npi?: string;
  auth_reference?: ClaimLineAuthReference;
}

// ========== Constants ==========
export const SERVICE_CATEGORIES: { value: ServiceCategory; label: string }[] = [
  { value: 'aba', label: 'ABA Therapy' },
  { value: 'ot', label: 'Occupational Therapy' },
  { value: 'pt', label: 'Physical Therapy' },
  { value: 'speech', label: 'Speech Therapy' },
  { value: 'psych', label: 'Psychological Services' },
  { value: 'other', label: 'Other' },
];

export const RATE_TYPES: { value: RateType; label: string }[] = [
  { value: 'per_unit', label: 'Per Unit' },
  { value: 'per_hour', label: 'Per Hour' },
  { value: 'flat_fee', label: 'Flat Fee' },
];

export const UNIT_DEFINITIONS: { value: UnitDefinition; label: string; description: string }[] = [
  { value: '15_min', label: '15-Minute Increments', description: 'Units are billed as 15-minute increments' },
  { value: '30_min', label: '30-Minute Increments', description: 'Units are billed as 30-minute increments' },
  { value: '60_min', label: '60-Minute Increments', description: 'Units are billed as hourly increments' },
  { value: 'per_session', label: 'Per Session', description: 'Units are billed per session' },
  { value: 'per_day', label: 'Per Day', description: 'Units are billed per day' },
  { value: 'per_month', label: 'Per Month', description: 'Units are billed monthly' },
];

export const ROUNDING_RULES: { value: RoundingRule; label: string }[] = [
  { value: 'none', label: 'No Rounding' },
  { value: 'nearest', label: 'Round to Nearest' },
  { value: 'up', label: 'Round Up' },
  { value: 'down', label: 'Round Down' },
];

export const AUTH_UNIT_TYPES: { value: AuthUnitType; label: string }[] = [
  { value: 'units', label: 'Units' },
  { value: 'hours', label: 'Hours' },
  { value: 'visits', label: 'Visits' },
  { value: 'dollars', label: 'Dollars' },
  { value: 'monthly_allowance', label: 'Monthly Allowance' },
];

export const AUTH_PERIODS: { value: AuthPeriod; label: string }[] = [
  { value: 'per_month', label: 'Per Month' },
  { value: 'per_week', label: 'Per Week' },
  { value: 'per_auth_span', label: 'Per Authorization Span' },
  { value: 'per_calendar_year', label: 'Per Calendar Year' },
];

export const PAYER_TYPES: { value: PayerType; label: string }[] = [
  { value: 'commercial', label: 'Commercial' },
  { value: 'medicaid', label: 'Medicaid' },
  { value: 'medicare', label: 'Medicare' },
  { value: 'tricare', label: 'Tricare' },
  { value: 'other', label: 'Other' },
];

export const EXTENDED_PLACE_OF_SERVICE_CODES: { code: string; description: string }[] = [
  { code: '02', description: 'Telehealth (Other than Home)' },
  { code: '03', description: 'School' },
  { code: '10', description: 'Telehealth (Patient Home)' },
  { code: '11', description: 'Office' },
  { code: '12', description: 'Home' },
  { code: '13', description: 'Assisted Living Facility' },
  { code: '14', description: 'Group Home' },
  { code: '22', description: 'Outpatient Hospital' },
  { code: '31', description: 'Skilled Nursing Facility' },
  { code: '32', description: 'Nursing Facility' },
  { code: '99', description: 'Other' },
];
```

---

## Page & Component Architecture

### New Routes (Add to `App.tsx`)

```typescript
<Route path="/billing/payers" element={<PayerDirectoryPage />} />
<Route path="/billing/payers/:payerId" element={<PayerDetailPage />} />
<Route path="/billing/payers/:payerId/services/:serviceId" element={<ServiceDetailPage />} />
```

### Component Structure

```
src/
├── pages/
│   └── payers/
│       ├── PayerDirectoryPage.tsx      # /billing/payers
│       ├── PayerDetailPage.tsx         # /billing/payers/:payerId
│       └── ServiceDetailPage.tsx       # /billing/payers/:payerId/services/:serviceId
│
├── components/billing/
│   ├── payer-directory/
│   │   ├── PayerDirectorySearch.tsx    # Search input + filters
│   │   ├── PayerDirectoryTable.tsx     # Results table
│   │   └── AddCustomPayerDialog.tsx    # Create non-directory payer
│   │
│   ├── payer-detail/
│   │   ├── PayerOverviewTab.tsx        # Payer info & settings
│   │   ├── PayerServicesTab.tsx        # Services table
│   │   ├── PayerAuthRulesTab.tsx       # Auth rules config
│   │   ├── PayerCMS1500Tab.tsx         # Global CMS-1500 settings
│   │   └── PayerEligibilityTab.tsx     # Eligibility settings
│   │
│   ├── service-detail/
│   │   ├── ServiceCodeModifiersSection.tsx   # Section A
│   │   ├── ServiceRateSection.tsx            # Section B
│   │   ├── ServiceUnitsSection.tsx           # Section C
│   │   ├── ServiceAuthSection.tsx            # Section D
│   │   ├── ServiceCMS1500Section.tsx         # Section E
│   │   ├── ServiceCMS1500Preview.tsx         # Section F
│   │   └── ServiceValidationWarnings.tsx     # Denial risk warnings
│   │
│   └── shared/
│       ├── DuplicateServiceDialog.tsx
│       └── ImportServiceTemplateDialog.tsx
│
├── hooks/
│   ├── usePayerDirectory.ts            # Directory search
│   ├── usePayerServices.ts             # Services CRUD
│   ├── usePayerAuthRules.ts            # Auth rules CRUD
│   └── useClaimLineCalculation.ts      # Unit calculation
│
└── types/
    └── payerConfig.ts                  # All types above
```

---

## Page Designs

### 1. Payer Directory Page (`/billing/payers`)

```
┌──────────────────────────────────────────────────────────────────┐
│ ← Billing & Claims                                               │
│ Payer Directory                                    [+ Add Custom]│
├──────────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ 🔍 Search payer name or payer ID...                          │ │
│ └──────────────────────────────────────────────────────────────┘ │
│ Showing 20 of 50 payers                                          │
├──────────────────────────────────────────────────────────────────┤
│ Payer Name              │ Payer ID  │ Type       │ Action       │
│─────────────────────────┼───────────┼────────────┼──────────────│
│ Aetna                   │ 60054     │ Commercial │ [+ Add]      │
│ Anthem Blue Cross       │ 47198     │ Commercial │ [Configured] │
│ Blue Cross Blue Shield  │ 00060     │ Commercial │ [+ Add]      │
│ Cigna                   │ 62308     │ Commercial │ [+ Add]      │
│ Medicaid - California   │ CAID1     │ Medicaid   │ [+ Add]      │
│ UnitedHealthcare        │ 87726     │ Commercial │ [Configured] │
└──────────────────────────────────────────────────────────────────┘
```

### 2. Payer Detail Page (`/billing/payers/:payerId`)

```
┌──────────────────────────────────────────────────────────────────┐
│ ← Back to Payers                                                 │
│ Aetna (60054)                                [Edit] [Deactivate] │
├──────────────────────────────────────────────────────────────────┤
│ Overview │ Services │ Auth Rules │ CMS-1500 │ Eligibility        │
├══════════════════════════════════════════════════════════════════┤
│                                                                  │
│ ┌─ Overview Tab ───────────────────────────────────────────────┐ │
│ │ ┌─────────────────────┐ ┌─────────────────────┐              │ │
│ │ │ Payer Information   │ │ Claim Settings      │              │ │
│ │ │ Name: Aetna         │ │ Filing Limit: 90d   │              │ │
│ │ │ ID: 60054           │ │ Method: Electronic  │              │ │
│ │ │ Type: Commercial    │ │ ERA: ✓ Enabled      │              │ │
│ │ │ Status: Active      │ │                     │              │ │
│ │ └─────────────────────┘ └─────────────────────┘              │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌─ Services Tab ───────────────────────────────────────────────┐ │
│ │ Services                    [+ Add Service] [Import Template]│ │
│ │ ──────────────────────────────────────────────────────────── │ │
│ │ Service       │ CPT   │ Mod  │ Rate   │ Units   │ Auth │ ⋮  │ │
│ │───────────────┼───────┼──────┼────────┼─────────┼──────┼────│ │
│ │ ABA Direct    │ 97153 │ HM   │ $15.00 │ 15-min  │ Req  │ ⋮  │ │
│ │ ABA Supervise │ 97155 │ HO   │ $75.00 │ 15-min  │ Req  │ ⋮  │ │
│ │ Assessment    │ 97151 │ HO   │ $100   │ per unit│ Req  │ ⋮  │ │
│ │ Parent Train  │ 97156 │ HO,GT│ $50.00 │ 15-min  │ Req  │ ⋮  │ │
│ └──────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### 3. Service Detail Page (`/billing/payers/:payerId/services/:serviceId`)

```
┌──────────────────────────────────────────────────────────────────┐
│ ← Back to Aetna Services                                         │
│ ABA Direct Therapy (97153)                       [Save] [Delete] │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ┌─ A. Code & Modifiers ────────────────────────────────────────┐ │
│ │ CPT/HCPCS Code*: [97153    ]                                 │ │
│ │ Modifier 1: [HM ▼]  Modifier 2: [   ▼]  3: [   ▼]  4: [   ▼]│ │
│ │ [✓] Modifiers required for billing                          │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌─ B. Rate ────────────────────────────────────────────────────┐ │
│ │ Rate Type: [Per Unit ▼]     Rate Amount: [$15.00    ]        │ │
│ │ [✓] Allow override on claim                                  │ │
│ │ Effective: [01/01/2024] to [12/31/2024] (optional)          │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌─ C. Units & Rounding ────────────────────────────────────────┐ │
│ │ Unit Definition: [15-minute increments ▼]                    │ │
│ │ ℹ️ "Units are billed as 15-minute increments"                │ │
│ │ Rounding Rule: [Round Up ▼]                                  │ │
│ │ Max Units/Day: [32    ] (8 hours)                            │ │
│ │ Max Units/Auth Period: [480   ] (120 hours)                  │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌─ D. Authorization ───────────────────────────────────────────┐ │
│ │ [✓] Authorization required                                   │ │
│ │ Auth Unit Type: [Units ▼]  Auth Period: [Per Month ▼]       │ │
│ │ Enforcement: [○ Warn  ● Block]                               │ │
│ │ ⚠️ Claims exceeding remaining auth units will be blocked    │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌─ E. CMS-1500 Defaults ───────────────────────────────────────┐ │
│ │ Place of Service (Box 24B): [11 - Office ▼]                  │ │
│ │ Diagnosis Pointer Mode: [● Auto  ○ Manual]                   │ │
│ │ [✓] Rendering Provider Required (Box 24J)                    │ │
│ │ [ ] Supervising Provider Required                            │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌─ F. CMS-1500 Line 24 Mapping Preview ────────────────────────┐ │
│ │ This service will generate claim lines as follows:           │ │
│ │ ──────────────────────────────────────────────────────────── │ │
│ │ 24A: Dates of Service    → From session start/end           │ │
│ │ 24B: Place of Service    → 11 (Office) - editable at claim  │ │
│ │ 24D: Procedures/Services → 97153 HM                          │ │
│ │ 24E: Diagnosis Pointer   → Auto-assigned from claim Dx       │ │
│ │ 24F: Charges             → Rate × Units = $15.00 × N         │ │
│ │ 24G: Days or Units       → Calculated from session duration  │ │
│ │                           (duration ÷ 15 min, rounded up)    │ │
│ │ 24J: Rendering Provider  → Required ✓                        │ │
│ │ ──────────────────────────────────────────────────────────── │ │
│ │ ⚠️ Modifiers required: HM must be present                   │ │
│ └──────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

## Business Logic

### Unit Calculation Function

```typescript
// src/lib/claimCalculations.ts

export function calculateUnits(
  sessionDurationMinutes: number,
  service: PayerService
): number {
  const { unit_definition, rounding_rule } = service.units;
  
  let rawUnits: number;
  
  switch (unit_definition) {
    case '15_min':
      rawUnits = sessionDurationMinutes / 15;
      break;
    case '30_min':
      rawUnits = sessionDurationMinutes / 30;
      break;
    case '60_min':
      rawUnits = sessionDurationMinutes / 60;
      break;
    case 'per_session':
    case 'per_day':
    case 'per_month':
      rawUnits = 1;
      break;
    default:
      rawUnits = sessionDurationMinutes / 15;
  }
  
  switch (rounding_rule) {
    case 'up':
      return Math.ceil(rawUnits);
    case 'down':
      return Math.floor(rawUnits);
    case 'nearest':
      return Math.round(rawUnits);
    default:
      return rawUnits;
  }
}

export function calculateCharges(
  units: number,
  service: PayerService
): number {
  if (service.rate.rate_type === 'flat_fee') {
    return service.rate.rate_amount;
  }
  return units * service.rate.rate_amount;
}

export function validateServiceConfig(service: PayerService): string[] {
  const warnings: string[] = [];
  
  if (!service.cpt_hcpcs_code) {
    warnings.push('CPT/HCPCS code is required');
  }
  
  if (service.rate.rate_amount <= 0) {
    warnings.push('Rate amount must be greater than 0');
  }
  
  if (service.modifiers.modifier_required && 
      !service.modifiers.modifier_1) {
    warnings.push('Modifiers are marked required but none specified');
  }
  
  if (service.auth.auth_required && 
      service.auth.enforcement === 'block') {
    warnings.push('Auth enforcement is set to BLOCK - claims will fail without active authorization');
  }
  
  return warnings;
}
```

### Claim Generation Integration

Update `ClaimGenerator.tsx` to:
1. Look up `payer_services` for the selected payer
2. Use service configuration for unit calculation
3. Apply rounding rules
4. Validate authorization requirements
5. Show warnings for missing/expired authorizations

---

## Implementation Phases

### Phase 1: Database & Types
1. Create migration for `payer_directory`, modify `payers`, create `payer_services`, `payer_auth_rules`
2. Seed payer directory with 20+ common payers
3. Create `src/types/payerConfig.ts` with all type definitions
4. Add RLS policies for agency isolation

### Phase 2: Payer Directory Page
1. Create `PayerDirectoryPage.tsx`
2. Create `PayerDirectorySearch.tsx` component
3. Create `PayerDirectoryTable.tsx` with sortable columns
4. Implement "Add Payer" action that creates payer record
5. Create `AddCustomPayerDialog.tsx` for non-directory payers
6. Add route to `App.tsx`
7. Add "Payer Config" tab to Billing page

### Phase 3: Payer Detail Page
1. Create `PayerDetailPage.tsx` with tabs
2. Implement `PayerOverviewTab.tsx`
3. Implement `PayerServicesTab.tsx` with services table
4. Implement service CRUD operations
5. Create hooks: `usePayerServices.ts`

### Phase 4: Service Detail Page
1. Create `ServiceDetailPage.tsx`
2. Create section components (A-F)
3. Implement `ServiceCMS1500Preview.tsx`
4. Add validation warnings
5. Implement "Duplicate Service" functionality
6. Create `ImportServiceTemplateDialog.tsx` with ABA presets

### Phase 5: Claim Integration
1. Update `ClaimGenerator.tsx` to use payer services
2. Implement unit calculation from session duration
3. Add authorization validation (warn/block)
4. Auto-populate claim lines from service defaults

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/types/payerConfig.ts` | All payer/service type definitions |
| `src/pages/payers/PayerDirectoryPage.tsx` | Directory listing page |
| `src/pages/payers/PayerDetailPage.tsx` | Payer detail with tabs |
| `src/pages/payers/ServiceDetailPage.tsx` | Service configuration page |
| `src/components/billing/payer-directory/PayerDirectorySearch.tsx` | Search component |
| `src/components/billing/payer-directory/PayerDirectoryTable.tsx` | Results table |
| `src/components/billing/payer-directory/AddCustomPayerDialog.tsx` | Custom payer form |
| `src/components/billing/payer-detail/PayerOverviewTab.tsx` | Payer info |
| `src/components/billing/payer-detail/PayerServicesTab.tsx` | Services list |
| `src/components/billing/payer-detail/PayerAuthRulesTab.tsx` | Auth rules |
| `src/components/billing/service-detail/ServiceCodeModifiersSection.tsx` | Section A |
| `src/components/billing/service-detail/ServiceRateSection.tsx` | Section B |
| `src/components/billing/service-detail/ServiceUnitsSection.tsx` | Section C |
| `src/components/billing/service-detail/ServiceAuthSection.tsx` | Section D |
| `src/components/billing/service-detail/ServiceCMS1500Section.tsx` | Section E |
| `src/components/billing/service-detail/ServiceCMS1500Preview.tsx` | Section F |
| `src/hooks/usePayerDirectory.ts` | Directory search hook |
| `src/hooks/usePayerServices.ts` | Services CRUD hook |
| `src/hooks/useClaimLineCalculation.ts` | Unit/charge calculation |
| `src/lib/claimCalculations.ts` | Business logic functions |
| Migration SQL | Schema changes + seed data |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/App.tsx` | Add routes for payer pages |
| `src/pages/Billing.tsx` | Add "Payer Config" tab |
| `src/types/billing.ts` | Import/export from payerConfig.ts |
| `src/components/billing/ClaimGenerator.tsx` | Use payer services for unit calculation |

---

## Technical Notes

### Agency Isolation
All payer services are scoped to the current agency via `agency_id` column. RLS policies will enforce:
```sql
CREATE POLICY "Users can view payer services in their agency"
ON payer_services FOR SELECT TO authenticated
USING (
  agency_id IS NULL  -- Global services visible to all
  OR has_agency_access(auth.uid(), agency_id)
  OR is_admin(auth.uid())
);
```

### Validation & Warnings
The Service Detail Page will display real-time warnings for configurations that may cause claim denials:
- Missing required modifiers
- No authorization when `auth_required` is true
- Units exceeding `max_units_per_day`
- Expired effective date range
- Missing rendering provider when required

### Service Templates
Include ABA service templates for quick setup:
- 97151 Assessment ($100/unit)
- 97153 Direct Therapy by RBT ($15/15-min, HM modifier)
- 97155 Supervision by BCBA ($75/15-min, HO modifier)
- 97156 Parent Training ($50/15-min, HO modifier)
