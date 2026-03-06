
-- 1) Create incident_logs table
CREATE TABLE IF NOT EXISTS public.incident_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id),
  client_id uuid REFERENCES public.students(id),
  logged_by uuid NOT NULL,
  incident_type text NOT NULL DEFAULT 'general',
  severity integer NOT NULL DEFAULT 1,
  title text NOT NULL,
  description text,
  location text,
  witnesses text[],
  actions_taken text,
  follow_up_required boolean DEFAULT false,
  follow_up_notes text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.incident_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view incident logs for their agency"
  ON public.incident_logs FOR SELECT TO authenticated
  USING (
    agency_id IN (
      SELECT agency_id FROM public.agency_memberships WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert incident logs for their agency"
  ON public.incident_logs FOR INSERT TO authenticated
  WITH CHECK (
    agency_id IN (
      SELECT agency_id FROM public.agency_memberships WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update incident logs for their agency"
  ON public.incident_logs FOR UPDATE TO authenticated
  USING (
    agency_id IN (
      SELECT agency_id FROM public.agency_memberships WHERE user_id = auth.uid()
    )
  );

-- 2) Create the incident_to_signal function
CREATE OR REPLACE FUNCTION public.incident_to_signal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create signal for severity >= 3
  IF NEW.severity >= 3 THEN
    INSERT INTO public.ci_signals (
      agency_id,
      client_id,
      signal_type,
      severity,
      title,
      message,
      source,
      context_json
    ) VALUES (
      NEW.agency_id,
      NEW.client_id,
      'severe_incident',
      CASE
        WHEN NEW.severity >= 5 THEN 'critical'
        WHEN NEW.severity >= 4 THEN 'high'
        ELSE 'medium'
      END,
      'Severe Incident: ' || NEW.title,
      COALESCE(NEW.description, 'A severity ' || NEW.severity || ' incident was reported.'),
      'incident_logs',
      jsonb_build_object(
        'incident_id', NEW.id,
        'incident_type', NEW.incident_type,
        'severity', NEW.severity,
        'occurred_at', NEW.occurred_at,
        'logged_by', NEW.logged_by,
        'location', NEW.location
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

-- 3) Create the trigger
CREATE TRIGGER incident_signal_trigger
  AFTER INSERT ON public.incident_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.incident_to_signal();
