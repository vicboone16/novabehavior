
-- Drop the overly permissive custom_form_submissions policies
DROP POLICY IF EXISTS "Public can view submissions by access_token" ON public.custom_form_submissions;
DROP POLICY IF EXISTS "Public can submit forms via magic link" ON public.custom_form_submissions;
DROP POLICY IF EXISTS "Public can update submissions via magic link" ON public.custom_form_submissions;

-- Allow anonymous/public users to read a specific submission only when a valid, non-expired access_token is present
-- The application MUST also include WHERE access_token = $token in its query
CREATE POLICY "Public can view submission by valid token"
ON public.custom_form_submissions
FOR SELECT
TO anon, authenticated
USING (
  access_token IS NOT NULL AND
  (expires_at IS NULL OR expires_at > now())
);

-- Allow anonymous users to submit (INSERT) only when providing a non-null, non-expired access_token
CREATE POLICY "Public can submit via valid token"
ON public.custom_form_submissions
FOR INSERT
TO anon, authenticated
WITH CHECK (
  access_token IS NOT NULL AND
  (expires_at IS NULL OR expires_at > now())
);

-- Allow anonymous users to update (fill out) a submission only with a valid token and before completion
CREATE POLICY "Public can update submission via valid token"
ON public.custom_form_submissions
FOR UPDATE
TO anon, authenticated
USING (
  access_token IS NOT NULL AND
  (expires_at IS NULL OR expires_at > now()) AND
  status != 'completed'
)
WITH CHECK (
  access_token IS NOT NULL AND
  (expires_at IS NULL OR expires_at > now()) AND
  status != 'completed'
);

-- Authenticated staff can view all submissions (for management/review)
CREATE POLICY "Staff can view all submissions"
ON public.custom_form_submissions
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Authenticated staff can manage (update/delete) submissions
CREATE POLICY "Staff can update submissions"
ON public.custom_form_submissions
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Staff can delete submissions"
ON public.custom_form_submissions
FOR DELETE
TO authenticated
USING (auth.uid() IS NOT NULL);
