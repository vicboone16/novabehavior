
-- Rollover toggle on authorizations
ALTER TABLE public.authorizations
  ADD COLUMN IF NOT EXISTS allows_rollover BOOLEAN NOT NULL DEFAULT false;

-- Per-code modifier map, e.g. {"97153": "HN", "H2019": "GT"}
ALTER TABLE public.authorizations
  ADD COLUMN IF NOT EXISTS service_code_modifiers JSONB NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.authorizations.allows_rollover
  IS 'Whether unused units roll over into the next authorization period';

-- Tie appointments to an authorization so we can track scheduled (reserved) units
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS authorization_id UUID REFERENCES public.authorizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_authorization_id
  ON public.appointments(authorization_id);

NOTIFY pgrst, 'reload schema';
