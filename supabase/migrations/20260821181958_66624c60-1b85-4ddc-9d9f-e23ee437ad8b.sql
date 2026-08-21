CREATE OR REPLACE FUNCTION public.request_form_token()
RETURNS text
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT nullif(
    coalesce(
      current_setting('request.headers', true)::json ->> 'x-form-token',
      ''
    ), ''
  );
$$;

REVOKE ALL ON FUNCTION public.request_form_token() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_form_token() TO anon, authenticated, service_role;

-- clinical_form_submissions (access_token is uuid) --------------------------
DROP POLICY IF EXISTS "Public can read submissions by access token" ON public.clinical_form_submissions;
DROP POLICY IF EXISTS "Public can update submissions by access token" ON public.clinical_form_submissions;

CREATE POLICY "Token holder can read clinical submission"
ON public.clinical_form_submissions FOR SELECT TO anon, authenticated
USING (
  access_token IS NOT NULL
  AND access_token::text = public.request_form_token()
  AND (expires_at IS NULL OR expires_at > now())
);

CREATE POLICY "Token holder can update clinical submission"
ON public.clinical_form_submissions FOR UPDATE TO anon, authenticated
USING (
  access_token IS NOT NULL
  AND access_token::text = public.request_form_token()
  AND (expires_at IS NULL OR expires_at > now())
)
WITH CHECK (
  access_token IS NOT NULL
  AND access_token::text = public.request_form_token()
);

-- consent_form_submissions --------------------------------------------------
DROP POLICY IF EXISTS "Public can view submission by token" ON public.consent_form_submissions;
DROP POLICY IF EXISTS "Public can update submission by token for signing" ON public.consent_form_submissions;

CREATE POLICY "Token holder can view consent submission"
ON public.consent_form_submissions FOR SELECT TO anon, authenticated
USING (
  access_token IS NOT NULL
  AND access_token = public.request_form_token()
  AND expires_at > now()
);

CREATE POLICY "Token holder can sign consent submission"
ON public.consent_form_submissions FOR UPDATE TO anon, authenticated
USING (
  access_token IS NOT NULL
  AND access_token = public.request_form_token()
  AND status = 'pending'
  AND expires_at > now()
)
WITH CHECK (
  access_token IS NOT NULL
  AND access_token = public.request_form_token()
);

-- custom_form_submissions ---------------------------------------------------
DROP POLICY IF EXISTS "Public can view submission by valid token" ON public.custom_form_submissions;
DROP POLICY IF EXISTS "Public can update submission via valid token" ON public.custom_form_submissions;

CREATE POLICY "Token holder can view custom submission"
ON public.custom_form_submissions FOR SELECT TO anon, authenticated
USING (
  access_token IS NOT NULL
  AND access_token = public.request_form_token()
  AND (expires_at IS NULL OR expires_at > now())
);

CREATE POLICY "Token holder can update custom submission"
ON public.custom_form_submissions FOR UPDATE TO anon, authenticated
USING (
  access_token IS NOT NULL
  AND access_token = public.request_form_token()
  AND (expires_at IS NULL OR expires_at > now())
)
WITH CHECK (
  access_token IS NOT NULL
  AND access_token = public.request_form_token()
);

-- form_delivery_links -------------------------------------------------------
DROP POLICY IF EXISTS "Public can read delivery_links by token" ON public.form_delivery_links;
DROP POLICY IF EXISTS "Public can update delivery_links" ON public.form_delivery_links;

CREATE POLICY "Token holder can read delivery link"
ON public.form_delivery_links FOR SELECT TO anon, authenticated
USING (token = public.request_form_token());

CREATE POLICY "Staff can read delivery links they created"
ON public.form_delivery_links FOR SELECT TO authenticated
USING (created_by = auth.uid());

CREATE POLICY "Token holder can update delivery link"
ON public.form_delivery_links FOR UPDATE TO anon, authenticated
USING (token = public.request_form_token())
WITH CHECK (token = public.request_form_token());

CREATE POLICY "Staff can update delivery links they created"
ON public.form_delivery_links FOR UPDATE TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- observation_requests ------------------------------------------------------
DROP POLICY IF EXISTS "View by valid token" ON public.observation_requests;
DROP POLICY IF EXISTS "Update by token when not expired" ON public.observation_requests;

CREATE POLICY "Token holder can view observation request"
ON public.observation_requests FOR SELECT TO anon, authenticated
USING (
  access_token IS NOT NULL
  AND access_token = public.request_form_token()
  AND expires_at > now()
  AND status <> 'completed'
);

CREATE POLICY "Token holder can update observation request"
ON public.observation_requests FOR UPDATE TO anon, authenticated
USING (
  access_token IS NOT NULL
  AND access_token = public.request_form_token()
  AND expires_at > now()
  AND status = ANY (ARRAY['pending','sent','opened','in_progress'])
)
WITH CHECK (
  access_token IS NOT NULL
  AND access_token = public.request_form_token()
);

-- invite_codes --------------------------------------------------------------
DROP POLICY IF EXISTS "authenticated_validate_codes" ON public.invite_codes;

CREATE POLICY "Staff can view invite codes they created"
ON public.invite_codes FOR SELECT TO authenticated
USING (created_by = auth.uid());
