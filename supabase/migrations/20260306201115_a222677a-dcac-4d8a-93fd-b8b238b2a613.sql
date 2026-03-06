
-- Auto-provision Behavior Decoded access when staff joins an agency
CREATE OR REPLACE FUNCTION public.auto_provision_behavior_decoded_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'active' THEN
    INSERT INTO public.user_app_access (user_id, app_slug, role, agency_id, is_active, granted_at)
    VALUES (NEW.user_id, 'behavior_decoded', 'staff', NEW.agency_id, true, now())
    ON CONFLICT (user_id, app_slug, agency_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_provision_behavior_decoded
  AFTER INSERT OR UPDATE OF status ON public.agency_memberships
  FOR EACH ROW
  WHEN (NEW.status = 'active')
  EXECUTE FUNCTION public.auto_provision_behavior_decoded_access();

-- Backfill existing active staff
INSERT INTO public.user_app_access (user_id, app_slug, role, agency_id, is_active, granted_at)
SELECT am.user_id, 'behavior_decoded', 'staff', am.agency_id, true, now()
FROM public.agency_memberships am
WHERE am.status = 'active'
ON CONFLICT (user_id, app_slug, agency_id) DO NOTHING;
