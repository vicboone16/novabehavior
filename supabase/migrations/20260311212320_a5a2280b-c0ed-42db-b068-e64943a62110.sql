
-- Add missing columns
ALTER TABLE public.app_navigation_structure
  ADD COLUMN IF NOT EXISTS icon text,
  ADD COLUMN IF NOT EXISTS required_permission text,
  ADD COLUMN IF NOT EXISTS required_role text,
  ADD COLUMN IF NOT EXISTS feature_flag text,
  ADD COLUMN IF NOT EXISTS badge_source text;

-- Update existing header items with icons and permissions
UPDATE public.app_navigation_structure SET icon = 'UserCheck' WHERE nav_key = 'supervision';
UPDATE public.app_navigation_structure SET icon = 'BookOpen', required_permission = 'clinical_lib:view' WHERE nav_key = 'clinical_library';
UPDATE public.app_navigation_structure SET icon = 'HardDrive', required_permission = 'resource_hub:view' WHERE nav_key = 'resource_hub';
UPDATE public.app_navigation_structure SET icon = 'Briefcase', required_permission = 'operations:view' WHERE nav_key = 'operations';
UPDATE public.app_navigation_structure SET icon = 'BrainCircuit' WHERE nav_key = 'nova_ai';
UPDATE public.app_navigation_structure SET icon = 'Target' WHERE nav_key = 'optimization';
UPDATE public.app_navigation_structure SET icon = 'GraduationCap', feature_flag = 'teacher_mode_access' WHERE nav_key = 'teacher_mode';

-- Insert primary tab-bar items (level 0)
INSERT INTO public.app_navigation_structure (nav_key, parent_key, label, icon, route, level, sort_order, is_visible, required_permission, feature_flag)
VALUES
  ('dashboard', NULL, 'Dashboard', 'LayoutDashboard', '/', 0, 10, true, NULL, NULL),
  ('students', NULL, 'Clients', 'Users', '/students', 0, 20, true, NULL, NULL),
  ('clinical', NULL, 'Clinical', 'Stethoscope', '/clinical', 0, 30, true, NULL, NULL),
  ('reports', NULL, 'Reports', 'FileBarChart', '/reports', 0, 40, true, NULL, NULL),
  ('schedule', NULL, 'Schedule', 'Calendar', '/schedule', 0, 50, true, NULL, NULL),
  ('intelligence', NULL, 'Intelligence', 'Brain', '/intelligence', 0, 60, true, NULL, 'cid_access'),
  ('notes-review', NULL, 'Notes Review', 'FileCheck', '/notes-review', 0, 70, true, 'note:approve', NULL),
  ('teacher-comms', NULL, 'Teacher Comms', 'Inbox', '/teacher-comms', 0, 80, true, NULL, NULL),
  ('advanced-design', NULL, 'Design Lab', 'FlaskConical', '/advanced-design', 0, 90, true, NULL, 'advanced_design_access')
ON CONFLICT (nav_key) DO UPDATE SET icon = EXCLUDED.icon, level = EXCLUDED.level, required_permission = EXCLUDED.required_permission, feature_flag = EXCLUDED.feature_flag;

-- Replace single operations_billing with proper children
DELETE FROM public.app_navigation_structure WHERE nav_key = 'operations_billing';

INSERT INTO public.app_navigation_structure (nav_key, parent_key, label, icon, route, level, sort_order, is_visible, required_permission)
VALUES
  ('ops-referrals', 'operations', 'Referrals', 'UserPlus', '/operations?tab=referrals', 2, 10, true, 'authorization:view'),
  ('ops-billing', 'operations', 'Billing', 'DollarSign', '/operations?tab=billing', 2, 20, true, 'billing:view'),
  ('ops-authorizations', 'operations', 'Authorizations', 'Shield', '/operations?tab=authorizations', 2, 30, true, 'authorization:manage'),
  ('ops-insurance', 'operations', 'Insurance', 'Building2', '/operations?tab=insurance', 2, 40, true, 'billing:view'),
  ('ops-service-requests', 'operations', 'Service Requests', 'ClipboardCheck', '/operations?tab=service-requests', 2, 50, true, 'operations:service_requests')
ON CONFLICT (nav_key) DO NOTHING;

-- Insert billing sub-tabs
INSERT INTO public.app_navigation_structure (nav_key, parent_key, label, icon, route, level, sort_order, is_visible, required_permission)
VALUES
  ('billing-overview', 'ops-billing', 'Overview', 'BarChart3', '/operations?tab=billing&billingPage=overview', 3, 10, true, 'billing:view'),
  ('billing-authorizations', 'ops-billing', 'Authorizations', 'Shield', '/operations?tab=billing&billingPage=authorizations', 3, 20, true, 'authorization:manage'),
  ('billing-claims', 'ops-billing', 'Claims Processing', 'FileText', '/operations?tab=billing&billingPage=claims', 3, 30, true, 'billing:manage'),
  ('billing-payments', 'ops-billing', 'Payments & Reconciliation', 'CreditCard', '/operations?tab=billing&billingPage=payments', 3, 40, true, 'billing:manage'),
  ('billing-contracts', 'ops-billing', 'Contracts & Payers', 'Building2', '/operations?tab=billing&billingPage=contracts', 3, 50, true, 'billing:manage'),
  ('billing-analytics', 'ops-billing', 'Analytics', 'LineChart', '/operations?tab=billing&billingPage=analytics', 3, 60, true, 'billing:view')
ON CONFLICT (nav_key) DO NOTHING;

-- Update child items with icons where missing
UPDATE public.app_navigation_structure SET icon = 'BarChart3' WHERE nav_key = 'supervision_dashboard' AND icon IS NULL;
UPDATE public.app_navigation_structure SET icon = 'Users' WHERE nav_key = 'supervision_caseload' AND icon IS NULL;
UPDATE public.app_navigation_structure SET icon = 'FolderOpen' WHERE nav_key = 'resource_hub_team_files' AND icon IS NULL;
UPDATE public.app_navigation_structure SET icon = 'User' WHERE nav_key = 'resource_hub_personal_files' AND icon IS NULL;
UPDATE public.app_navigation_structure SET icon = 'Building2' WHERE nav_key = 'clinical_library_org' AND icon IS NULL;
UPDATE public.app_navigation_structure SET icon = 'User' WHERE nav_key = 'clinical_library_personal' AND icon IS NULL;
UPDATE public.app_navigation_structure SET icon = 'FileText' WHERE nav_key = 'clinical_library_templates' AND icon IS NULL;
