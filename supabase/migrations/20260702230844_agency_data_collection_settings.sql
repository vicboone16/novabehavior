-- Agency-level data collection settings: lets each agency independently tune
-- thresholds/defaults that were previously hardcoded constants shared by every
-- agency on the platform (IOA threshold, fidelity threshold, rate/hour fallback
-- session length, default mastery criteria, session-context enforcement).
CREATE TABLE IF NOT EXISTS public.agency_data_collection_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  ioa_threshold_percent INTEGER NOT NULL DEFAULT 80,
  fidelity_threshold_percent INTEGER NOT NULL DEFAULT 80,
  default_session_length_minutes INTEGER NOT NULL DEFAULT 30,
  require_session_type BOOLEAN NOT NULL DEFAULT false,
  default_mastery_type TEXT NOT NULL DEFAULT 'percent_correct',
  default_mastery_percent INTEGER NOT NULL DEFAULT 80,
  default_mastery_consecutive_sessions INTEGER NOT NULL DEFAULT 3,
  default_mastery_min_trials INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT agency_data_collection_settings_agency_unique UNIQUE (agency_id),
  CONSTRAINT ioa_threshold_range CHECK (ioa_threshold_percent BETWEEN 1 AND 100),
  CONSTRAINT fidelity_threshold_range CHECK (fidelity_threshold_percent BETWEEN 1 AND 100),
  CONSTRAINT default_mastery_percent_range CHECK (default_mastery_percent BETWEEN 1 AND 100),
  CONSTRAINT default_session_length_positive CHECK (default_session_length_minutes > 0),
  CONSTRAINT default_mastery_type_valid CHECK (default_mastery_type IN ('percent_correct', 'consecutive_sessions', 'trend_stability'))
);

-- Enable RLS
ALTER TABLE public.agency_data_collection_settings ENABLE ROW LEVEL SECURITY;

-- Any active member of the agency can read its data collection settings
CREATE POLICY "Users can view data collection settings of their agencies"
  ON public.agency_data_collection_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.agency_memberships am
      WHERE am.agency_id = agency_data_collection_settings.agency_id
        AND am.user_id = auth.uid()
        AND am.status = 'active'
    )
  );

-- Only agency owners/admins can create or change the settings
CREATE POLICY "Agency admins can manage data collection settings"
  ON public.agency_data_collection_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.agency_memberships am
      WHERE am.agency_id = agency_data_collection_settings.agency_id
        AND am.user_id = auth.uid()
        AND am.status = 'active'
        AND am.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.agency_memberships am
      WHERE am.agency_id = agency_data_collection_settings.agency_id
        AND am.user_id = auth.uid()
        AND am.status = 'active'
        AND am.role IN ('owner', 'admin')
    )
  );

CREATE INDEX idx_agency_data_collection_settings_agency_id ON public.agency_data_collection_settings(agency_id);

CREATE TRIGGER update_agency_data_collection_settings_updated_at
  BEFORE UPDATE ON public.agency_data_collection_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
