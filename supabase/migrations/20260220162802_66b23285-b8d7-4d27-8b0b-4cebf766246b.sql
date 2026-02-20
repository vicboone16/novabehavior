
-- Add teacher mode permission columns to feature_permissions
ALTER TABLE public.feature_permissions 
  ADD COLUMN IF NOT EXISTS teacher_mode_access boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS teacher_mode_only boolean DEFAULT false;

COMMENT ON COLUMN public.feature_permissions.teacher_mode_access IS 'Whether user can access Teacher Mode';
COMMENT ON COLUMN public.feature_permissions.teacher_mode_only IS 'If true, user is restricted to Teacher Mode only (no full app access)';
