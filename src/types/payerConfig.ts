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
   updated_at: string;
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
 
 export interface ConfiguredPayer {
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
   modifier_1?: string | null;
   modifier_2?: string | null;
   modifier_3?: string | null;
   modifier_4?: string | null;
   modifier_required: boolean;
   modifier_notes?: string | null;
 }
 
 export interface ServiceRate {
   rate_type: RateType;
   rate_amount: number;
   currency: string;
   effective_start_date?: string | null;
   effective_end_date?: string | null;
   allow_override_on_claim: boolean;
 }
 
 export interface ServiceUnits {
   unit_definition: UnitDefinition;
   rounding_rule: RoundingRule;
   max_units_per_day?: number | null;
   max_units_per_auth_period?: number | null;
   unit_notes?: string | null;
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
   created_by?: string;
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
   updated_at: string;
 }
 
 // ========== Claim Line ==========
 export interface ClaimLineAuthReference {
   auth_id: string;
   remaining_units_before: number;
   remaining_units_after: number;
 }
 
 export interface ClaimLineMapping {
   id?: string;
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
 
 export const COMMON_MODIFIERS: { code: string; description: string }[] = [
   { code: 'HM', description: 'Less than Bachelor\'s degree level (RBT)' },
   { code: 'HN', description: 'Bachelor\'s degree level' },
   { code: 'HO', description: 'Master\'s degree level (BCBA)' },
   { code: 'HP', description: 'Doctoral level' },
   { code: 'GT', description: 'Via interactive audio and video telecommunications' },
   { code: 'GO', description: 'Services delivered under an outpatient OT plan' },
   { code: '95', description: 'Synchronous telemedicine service' },
   { code: 'XE', description: 'Separate encounter' },
   { code: 'XP', description: 'Separate practitioner' },
   { code: 'XS', description: 'Separate structure' },
   { code: 'XU', description: 'Unusual non-overlapping service' },
   { code: '59', description: 'Distinct procedural service' },
   { code: '76', description: 'Repeat procedure by same physician' },
   { code: '77', description: 'Repeat procedure by another physician' },
   { code: 'U1', description: 'Medicaid level of care 1' },
   { code: 'U2', description: 'Medicaid level of care 2' },
   { code: 'U3', description: 'Medicaid level of care 3' },
   { code: 'U4', description: 'Medicaid level of care 4' },
 ];
 
 // Default service templates for quick setup
 export const ABA_SERVICE_TEMPLATES: Partial<PayerService>[] = [
   {
     service_name: 'ABA Assessment',
     service_category: 'aba',
     cpt_hcpcs_code: '97151',
     modifiers: { modifier_1: 'HO', modifier_required: true, modifier_2: null, modifier_3: null, modifier_4: null, modifier_notes: null },
     rate: { rate_type: 'per_unit', rate_amount: 100, currency: 'USD', allow_override_on_claim: false },
     units: { unit_definition: '15_min', rounding_rule: 'up' },
     auth: { auth_required: true, auth_unit_type: 'units', auth_period: 'per_auth_span', enforcement: 'warn' },
     cms1500_defaults: { place_of_service_default: '11', diagnosis_pointer_mode: 'auto', rendering_provider_required: true, supervising_provider_required: false },
   },
   {
     service_name: 'ABA Direct Therapy (RBT)',
     service_category: 'aba',
     cpt_hcpcs_code: '97153',
     modifiers: { modifier_1: 'HM', modifier_required: true, modifier_2: null, modifier_3: null, modifier_4: null, modifier_notes: null },
     rate: { rate_type: 'per_unit', rate_amount: 15, currency: 'USD', allow_override_on_claim: false },
     units: { unit_definition: '15_min', rounding_rule: 'up' },
     auth: { auth_required: true, auth_unit_type: 'units', auth_period: 'per_month', enforcement: 'warn' },
     cms1500_defaults: { place_of_service_default: '12', diagnosis_pointer_mode: 'auto', rendering_provider_required: true, supervising_provider_required: true },
   },
   {
     service_name: 'ABA Supervision (BCBA)',
     service_category: 'aba',
     cpt_hcpcs_code: '97155',
     modifiers: { modifier_1: 'HO', modifier_required: true, modifier_2: null, modifier_3: null, modifier_4: null, modifier_notes: null },
     rate: { rate_type: 'per_unit', rate_amount: 75, currency: 'USD', allow_override_on_claim: false },
     units: { unit_definition: '15_min', rounding_rule: 'up' },
     auth: { auth_required: true, auth_unit_type: 'units', auth_period: 'per_month', enforcement: 'warn' },
     cms1500_defaults: { place_of_service_default: '12', diagnosis_pointer_mode: 'auto', rendering_provider_required: true, supervising_provider_required: false },
   },
   {
     service_name: 'Parent/Caregiver Training',
     service_category: 'aba',
     cpt_hcpcs_code: '97156',
     modifiers: { modifier_1: 'HO', modifier_required: true, modifier_2: null, modifier_3: null, modifier_4: null, modifier_notes: null },
     rate: { rate_type: 'per_unit', rate_amount: 50, currency: 'USD', allow_override_on_claim: false },
     units: { unit_definition: '15_min', rounding_rule: 'up' },
     auth: { auth_required: true, auth_unit_type: 'units', auth_period: 'per_auth_span', enforcement: 'warn' },
     cms1500_defaults: { place_of_service_default: '12', diagnosis_pointer_mode: 'auto', rendering_provider_required: true, supervising_provider_required: false },
   },
   {
     service_name: 'Group Therapy (2-8 patients)',
     service_category: 'aba',
     cpt_hcpcs_code: '97158',
     modifiers: { modifier_1: 'HO', modifier_required: true, modifier_2: null, modifier_3: null, modifier_4: null, modifier_notes: null },
     rate: { rate_type: 'per_unit', rate_amount: 25, currency: 'USD', allow_override_on_claim: false },
     units: { unit_definition: '15_min', rounding_rule: 'up' },
     auth: { auth_required: true, auth_unit_type: 'units', auth_period: 'per_auth_span', enforcement: 'warn' },
     cms1500_defaults: { place_of_service_default: '11', diagnosis_pointer_mode: 'auto', rendering_provider_required: true, supervising_provider_required: false },
   },
 ];