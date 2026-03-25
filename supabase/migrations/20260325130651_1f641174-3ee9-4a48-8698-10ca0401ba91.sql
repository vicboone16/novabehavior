-- Add missing columns to existing staff_presence table
ALTER TABLE public.staff_presence
  ADD COLUMN IF NOT EXISTS is_present boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS staff_name text,
  ADD COLUMN IF NOT EXISTS role text,
  ADD COLUMN IF NOT EXISTS availability text NOT NULL DEFAULT 'offline',
  ADD COLUMN IF NOT EXISTS status_note text,
  ADD COLUMN IF NOT EXISTS current_classroom_id uuid,
  ADD COLUMN IF NOT EXISTS current_room_name text,
  ADD COLUMN IF NOT EXISTS last_activity_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_check_in_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_check_out_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_by uuid;

-- Availability validation trigger
CREATE OR REPLACE FUNCTION public.trg_validate_staff_availability()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.availability NOT IN ('available','nearby','assigned','busy','offline') THEN
    RAISE EXCEPTION 'Invalid availability value: %', NEW.availability;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_staff_presence_validate_availability ON public.staff_presence;
CREATE TRIGGER trg_staff_presence_validate_availability
  BEFORE INSERT OR UPDATE ON public.staff_presence
  FOR EACH ROW EXECUTE FUNCTION public.trg_validate_staff_availability();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_staff_presence_agency_availability
  ON public.staff_presence (agency_id, availability, is_present);
CREATE INDEX IF NOT EXISTS idx_staff_presence_classroom
  ON public.staff_presence (current_classroom_id, availability);

-- Updated-at trigger
DROP TRIGGER IF EXISTS trg_staff_presence_updated_at ON public.staff_presence;
CREATE TRIGGER trg_staff_presence_updated_at
  BEFORE UPDATE ON public.staff_presence
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Staff movement log
CREATE TABLE IF NOT EXISTS public.staff_movement_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  user_id uuid NOT NULL,
  moved_by uuid,
  from_classroom_id uuid,
  to_classroom_id uuid,
  from_room_name text,
  to_room_name text,
  move_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_staff_movement_log_user ON public.staff_movement_log (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_staff_movement_log_agency ON public.staff_movement_log (agency_id, created_at DESC);
ALTER TABLE public.staff_movement_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members can view movement logs" ON public.staff_movement_log FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM agency_memberships am WHERE am.user_id = auth.uid() AND am.agency_id = staff_movement_log.agency_id AND am.status = 'active'));

CREATE POLICY "Staff can insert own movement logs" ON public.staff_movement_log FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role) OR user_id = auth.uid());

-- Staff coverage alerts
CREATE TABLE IF NOT EXISTS public.staff_coverage_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  classroom_id uuid,
  alert_type text NOT NULL,
  title text NOT NULL,
  description text,
  severity text NOT NULL DEFAULT 'medium',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE OR REPLACE FUNCTION public.trg_validate_coverage_severity()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.severity NOT IN ('low','medium','high','critical') THEN
    RAISE EXCEPTION 'Invalid severity: %', NEW.severity;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_staff_coverage_alerts_severity ON public.staff_coverage_alerts;
CREATE TRIGGER trg_staff_coverage_alerts_severity BEFORE INSERT OR UPDATE ON public.staff_coverage_alerts FOR EACH ROW EXECUTE FUNCTION public.trg_validate_coverage_severity();
ALTER TABLE public.staff_coverage_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members can view coverage alerts" ON public.staff_coverage_alerts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM agency_memberships am WHERE am.user_id = auth.uid() AND am.agency_id = staff_coverage_alerts.agency_id AND am.status = 'active'));

CREATE POLICY "Admins can manage coverage alerts" ON public.staff_coverage_alerts FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- RPCs
CREATE OR REPLACE FUNCTION public.upsert_staff_presence(
  p_agency_id uuid, p_user_id uuid, p_staff_name text DEFAULT NULL, p_role text DEFAULT NULL,
  p_is_present boolean DEFAULT true, p_availability text DEFAULT 'available',
  p_status_note text DEFAULT NULL, p_current_classroom_id uuid DEFAULT NULL,
  p_current_room_name text DEFAULT NULL, p_updated_by uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.staff_presence (agency_id, user_id, staff_name, role, is_present, availability, status_note, current_classroom_id, current_room_name, last_activity_at, last_check_in_at, updated_by)
  VALUES (p_agency_id, p_user_id, p_staff_name, p_role, p_is_present, p_availability, p_status_note, p_current_classroom_id, p_current_room_name, now(), CASE WHEN p_is_present THEN now() ELSE NULL END, p_updated_by)
  ON CONFLICT (agency_id, user_id) DO UPDATE SET
    staff_name = COALESCE(EXCLUDED.staff_name, staff_presence.staff_name),
    role = COALESCE(EXCLUDED.role, staff_presence.role),
    is_present = EXCLUDED.is_present,
    availability = EXCLUDED.availability,
    status_note = EXCLUDED.status_note,
    current_classroom_id = EXCLUDED.current_classroom_id,
    current_room_name = EXCLUDED.current_room_name,
    last_activity_at = now(),
    last_check_in_at = CASE WHEN EXCLUDED.is_present = true AND staff_presence.is_present = false THEN now() ELSE staff_presence.last_check_in_at END,
    last_check_out_at = CASE WHEN EXCLUDED.is_present = false AND staff_presence.is_present = true THEN now() ELSE staff_presence.last_check_out_at END,
    updated_by = EXCLUDED.updated_by
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('ok', true, 'presence_id', v_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.move_staff_to_classroom(
  p_agency_id uuid, p_user_id uuid, p_to_classroom_id uuid DEFAULT NULL,
  p_to_room_name text DEFAULT NULL, p_moved_by uuid DEFAULT NULL, p_move_reason text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_prev record;
BEGIN
  SELECT current_classroom_id, current_room_name INTO v_prev FROM public.staff_presence WHERE agency_id = p_agency_id AND user_id = p_user_id LIMIT 1;
  UPDATE public.staff_presence SET current_classroom_id = p_to_classroom_id, current_room_name = p_to_room_name,
    availability = CASE WHEN is_present = false THEN 'offline' WHEN p_to_classroom_id IS NOT NULL THEN 'assigned' ELSE 'available' END,
    last_activity_at = now(), updated_by = p_moved_by
  WHERE agency_id = p_agency_id AND user_id = p_user_id;
  INSERT INTO public.staff_movement_log (agency_id, user_id, moved_by, from_classroom_id, to_classroom_id, from_room_name, to_room_name, move_reason)
  VALUES (p_agency_id, p_user_id, p_moved_by, v_prev.current_classroom_id, p_to_classroom_id, v_prev.current_room_name, p_to_room_name, p_move_reason);
  RETURN jsonb_build_object('ok', true, 'user_id', p_user_id, 'to_classroom_id', p_to_classroom_id, 'to_room_name', p_to_room_name);
END;
$$;

CREATE OR REPLACE FUNCTION public.set_staff_availability(
  p_agency_id uuid, p_user_id uuid, p_availability text,
  p_status_note text DEFAULT NULL, p_updated_by uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.staff_presence SET availability = p_availability, status_note = p_status_note, last_activity_at = now(), updated_by = p_updated_by
  WHERE agency_id = p_agency_id AND user_id = p_user_id;
  RETURN jsonb_build_object('ok', true, 'user_id', p_user_id, 'availability', p_availability);
END;
$$;

CREATE OR REPLACE FUNCTION public.check_out_staff_presence(
  p_agency_id uuid, p_user_id uuid, p_updated_by uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.staff_presence SET is_present = false, availability = 'offline', current_classroom_id = NULL, current_room_name = NULL,
    last_check_out_at = now(), last_activity_at = now(), updated_by = p_updated_by
  WHERE agency_id = p_agency_id AND user_id = p_user_id;
  RETURN jsonb_build_object('ok', true, 'user_id', p_user_id);
END;
$$;

-- Views
CREATE OR REPLACE VIEW public.v_whos_here WITH (security_invoker = on) AS
SELECT sp.id, sp.agency_id, sp.user_id, sp.staff_name, sp.role, sp.is_present, sp.availability, sp.status_note,
  sp.current_classroom_id, sp.current_room_name, sp.last_activity_at, sp.last_check_in_at, sp.last_check_out_at, sp.updated_at
FROM public.staff_presence sp WHERE sp.is_present = true
ORDER BY CASE sp.availability WHEN 'available' THEN 1 WHEN 'nearby' THEN 2 WHEN 'assigned' THEN 3 WHEN 'busy' THEN 4 ELSE 5 END, sp.staff_name NULLS LAST;

CREATE OR REPLACE VIEW public.v_mayday_candidates WITH (security_invoker = on) AS
SELECT sp.agency_id, sp.user_id, sp.staff_name, sp.role, sp.availability, sp.current_classroom_id, sp.current_room_name, sp.last_activity_at
FROM public.staff_presence sp WHERE sp.is_present = true
ORDER BY CASE sp.availability WHEN 'available' THEN 1 WHEN 'nearby' THEN 2 WHEN 'assigned' THEN 3 WHEN 'busy' THEN 4 ELSE 5 END, sp.last_activity_at DESC NULLS LAST;

-- Realtime
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_presence; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
