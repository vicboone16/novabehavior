
-- Update severity check constraint to include new tiers
ALTER TABLE public.ci_alerts DROP CONSTRAINT IF EXISTS ci_alerts_severity_check;
ALTER TABLE public.ci_alerts ADD CONSTRAINT ci_alerts_severity_check 
  CHECK (severity IN ('critical','action','watch','high','medium','info'));
