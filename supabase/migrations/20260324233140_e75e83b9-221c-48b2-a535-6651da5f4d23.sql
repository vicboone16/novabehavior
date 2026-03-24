-- Fix operations/billing deep sub-routes that use path-style URLs not in App.tsx
-- These should all point to /operations with appropriate tab params
UPDATE app_navigation_structure SET route = '/operations?tab=billing' WHERE nav_key IN (
  'billing_overview', 'billing_claims', 'billing_authorizations', 'billing_payers', 
  'billing_payments', 'billing_revenue', 'billing_timesheets', 'billing_dashboard',
  'billing_ar_readiness', 'billing_needs_review', 'billing_all_claims', 'billing_denials',
  'billing_ready_claim', 'billing_eligibility', 'billing_authorizations_list', 'billing_prior_auth',
  'billing_payer_config', 'billing_contracts', 'billing_clearinghouse', 'billing_era',
  'billing_payments_recon', 'billing_ar_aging', 'billing_claim_performance', 'billing_denial_trends'
) AND route LIKE '/operations/billing/%';