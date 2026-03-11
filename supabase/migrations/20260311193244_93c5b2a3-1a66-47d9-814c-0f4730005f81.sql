
-- Personal files table for user-private cloud storage
CREATE TABLE public.personal_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT '',
  file_size BIGINT NOT NULL DEFAULT 0,
  storage_path TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  tags TEXT[] NOT NULL DEFAULT '{}',
  folder TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.personal_files ENABLE ROW LEVEL SECURITY;

-- Only the owner can see/manage their personal files
CREATE POLICY "Users can manage own personal files"
  ON public.personal_files
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Add folder column to shared_library_items for Team Files folder organization
ALTER TABLE public.shared_library_items ADD COLUMN IF NOT EXISTS folder TEXT DEFAULT NULL;

-- Add library_scope and review_status to support Clinical Library personal/org structure
-- We'll use a new table for clinical library item metadata
CREATE TABLE public.clinical_library_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  agency_id UUID REFERENCES public.agencies(id),
  resource_type TEXT NOT NULL DEFAULT 'goal', -- goal, intervention, template, etc.
  resource_id TEXT NOT NULL, -- references the actual resource
  library_scope TEXT NOT NULL DEFAULT 'personal' CHECK (library_scope IN ('personal', 'organization')),
  review_status TEXT NOT NULL DEFAULT 'draft' CHECK (review_status IN ('draft', 'personal', 'pending_review', 'approved', 'rejected', 'published_org')),
  submitted_at TIMESTAMPTZ,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clinical_library_submissions ENABLE ROW LEVEL SECURITY;

-- Users can see their own submissions and published_org items for their agency
CREATE POLICY "Users see own and published org submissions"
  ON public.clinical_library_submissions
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (review_status = 'published_org' AND agency_id IN (
      SELECT agency_id FROM public.agency_memberships WHERE user_id = auth.uid() AND status = 'active'
    ))
  );

CREATE POLICY "Users can insert own submissions"
  ON public.clinical_library_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own draft/personal submissions"
  ON public.clinical_library_submissions
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- Admin delete policy
CREATE POLICY "Admins can delete submissions"
  ON public.clinical_library_submissions
  FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Update shared_library_items delete policy: only admin can delete
-- First drop existing policies that allow non-admin delete
DROP POLICY IF EXISTS "Authenticated users can delete own shared_library_items" ON public.shared_library_items;

CREATE POLICY "Only admins can delete team files"
  ON public.shared_library_items
  FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));
