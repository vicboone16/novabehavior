
-- Fix 1: Tighten IEP library RLS to restrict access to agency members only
-- Drop any existing overly-permissive policies on iep_library_items
DO $$
BEGIN
  -- Drop existing permissive SELECT policies if they exist
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'iep_library_items' AND schemaname = 'public'
  ) THEN
    -- Drop all existing policies on the table so we can replace them cleanly
    EXECUTE (
      SELECT string_agg('DROP POLICY IF EXISTS ' || quote_ident(policyname) || ' ON public.iep_library_items;', ' ')
      FROM pg_policies
      WHERE tablename = 'iep_library_items' AND schemaname = 'public'
    );
  END IF;
END $$;

-- Re-enable RLS (ensure it's on)
ALTER TABLE public.iep_library_items ENABLE ROW LEVEL SECURITY;

-- Allow super admins and admins to see all active library items
CREATE POLICY "Admins can view all active library items"
  ON public.iep_library_items
  FOR SELECT
  USING (
    status = 'active'
    AND public.is_admin(auth.uid())
  );

-- Allow agency members to view library items belonging to their agency
CREATE POLICY "Agency members can view their agency library items"
  ON public.iep_library_items
  FOR SELECT
  USING (
    status = 'active'
    AND agency_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.agency_memberships am
      WHERE am.user_id = auth.uid()
        AND am.agency_id = iep_library_items.agency_id
        AND am.status = 'active'
    )
  );

-- Allow agency members to view global (null agency_id) items
CREATE POLICY "Agency members can view global library items"
  ON public.iep_library_items
  FOR SELECT
  USING (
    status = 'active'
    AND agency_id IS NULL
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.agency_memberships am
      WHERE am.user_id = auth.uid()
        AND am.status = 'active'
    )
  );

-- Admins can insert/update/delete library items
CREATE POLICY "Admins can manage library items"
  ON public.iep_library_items
  FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));


-- Fix 2: Tighten storage bucket policies for client-documents, consent-forms, report-logos

-- === client-documents: restrict to agency members who have access to the student ===
DROP POLICY IF EXISTS "Staff can upload client documents" ON storage.objects;
DROP POLICY IF EXISTS "Staff can view client documents" ON storage.objects;
DROP POLICY IF EXISTS "Staff can delete client documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload client documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view client documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete client documents" ON storage.objects;

CREATE POLICY "Agency staff can view client documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'client-documents'
    AND auth.uid() IS NOT NULL
    AND (
      public.is_admin(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.students s
        JOIN public.agency_memberships am ON am.agency_id = s.agency_id
        WHERE s.id::text = (storage.foldername(name))[1]
          AND am.user_id = auth.uid()
          AND am.status = 'active'
      )
      OR EXISTS (
        SELECT 1 FROM public.user_student_access usa
        WHERE usa.student_id::text = (storage.foldername(name))[1]
          AND usa.user_id = auth.uid()
          AND usa.permission_level <> 'none'
      )
    )
  );

CREATE POLICY "Agency staff can upload client documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'client-documents'
    AND auth.uid() IS NOT NULL
    AND (
      public.is_admin(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.students s
        JOIN public.agency_memberships am ON am.agency_id = s.agency_id
        WHERE s.id::text = (storage.foldername(name))[1]
          AND am.user_id = auth.uid()
          AND am.status = 'active'
      )
    )
  );

CREATE POLICY "Agency staff can delete client documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'client-documents'
    AND auth.uid() IS NOT NULL
    AND (
      public.is_admin(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.students s
        JOIN public.agency_memberships am ON am.agency_id = s.agency_id
        WHERE s.id::text = (storage.foldername(name))[1]
          AND am.user_id = auth.uid()
          AND am.status = 'active'
      )
    )
  );

-- === consent-forms: restrict to agency members ===
DROP POLICY IF EXISTS "Staff can upload consent forms" ON storage.objects;
DROP POLICY IF EXISTS "Staff can view consent forms" ON storage.objects;
DROP POLICY IF EXISTS "Staff can delete consent forms" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload consent forms" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view consent forms" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete consent forms" ON storage.objects;

CREATE POLICY "Agency staff can view consent forms"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'consent-forms'
    AND auth.uid() IS NOT NULL
    AND (
      public.is_admin(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.agency_memberships am
        WHERE am.user_id = auth.uid()
          AND am.status = 'active'
      )
    )
  );

CREATE POLICY "Agency staff can upload consent forms"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'consent-forms'
    AND auth.uid() IS NOT NULL
    AND (
      public.is_admin(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.agency_memberships am
        WHERE am.user_id = auth.uid()
          AND am.status = 'active'
      )
    )
  );

CREATE POLICY "Agency staff can delete consent forms"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'consent-forms'
    AND auth.uid() IS NOT NULL
    AND public.is_admin(auth.uid())
  );

-- === report-logos: restrict uploads/deletes to admins, keep read open (it's a public bucket) ===
DROP POLICY IF EXISTS "Anyone can view report logos" ON storage.objects;
DROP POLICY IF EXISTS "Staff can upload report logos" ON storage.objects;
DROP POLICY IF EXISTS "Staff can delete report logos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage report logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload report logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete report logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view report logos" ON storage.objects;

CREATE POLICY "Public can view report logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'report-logos');

CREATE POLICY "Admins can upload report logos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'report-logos'
    AND public.is_admin(auth.uid())
  );

CREATE POLICY "Admins can delete report logos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'report-logos'
    AND public.is_admin(auth.uid())
  );
