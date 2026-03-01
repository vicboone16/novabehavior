
-- Drop old RLS policies on parent_summary_packets
DROP POLICY IF EXISTS "psp_submitter_select" ON public.parent_summary_packets;
DROP POLICY IF EXISTS "psp_agency_select" ON public.parent_summary_packets;
DROP POLICY IF EXISTS "psp_insert" ON public.parent_summary_packets;
DROP POLICY IF EXISTS "psp_agency_update" ON public.parent_summary_packets;

-- Drop old RLS policies on parent_summary_packet_reviews
DROP POLICY IF EXISTS "pspr_agency_select" ON public.parent_summary_packet_reviews;
DROP POLICY IF EXISTS "pspr_insert" ON public.parent_summary_packet_reviews;

-- =============================================================
-- parent_summary_packets: NEW POLICIES
-- =============================================================

-- 1. Parent (submitter) can view own packets
CREATE POLICY "psp_submitter_select"
ON public.parent_summary_packets FOR SELECT TO authenticated
USING (submitted_by = auth.uid());

-- 2. Agency staff can view packets for learners in their agency
--    Derives agency from students.agency_id, checks via agency_memberships
CREATE POLICY "psp_agency_staff_select"
ON public.parent_summary_packets FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.students s
    JOIN public.agency_memberships am ON am.agency_id = s.agency_id
    WHERE s.id = parent_summary_packets.client_id
      AND am.user_id = auth.uid()
      AND am.status = 'active'
  )
);

-- 3. Parent can insert packets for learners they have access to via user_student_access
CREATE POLICY "psp_parent_insert"
ON public.parent_summary_packets FOR INSERT TO authenticated
WITH CHECK (
  submitted_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.user_student_access
    WHERE user_id = auth.uid()
      AND student_id = parent_summary_packets.client_id
  )
);

-- 4. Agency staff can update packets (review) for learners in their agency
CREATE POLICY "psp_agency_staff_update"
ON public.parent_summary_packets FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.students s
    JOIN public.agency_memberships am ON am.agency_id = s.agency_id
    WHERE s.id = parent_summary_packets.client_id
      AND am.user_id = auth.uid()
      AND am.status = 'active'
  )
);

-- =============================================================
-- parent_summary_packet_reviews: NEW POLICIES
-- =============================================================

-- Agency staff can view reviews for packets of learners in their agency
CREATE POLICY "pspr_agency_staff_select"
ON public.parent_summary_packet_reviews FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.parent_summary_packets psp
    JOIN public.students s ON s.id = psp.client_id
    JOIN public.agency_memberships am ON am.agency_id = s.agency_id
    WHERE psp.id = parent_summary_packet_reviews.packet_id
      AND am.user_id = auth.uid()
      AND am.status = 'active'
  )
);

CREATE POLICY "pspr_insert"
ON public.parent_summary_packet_reviews FOR INSERT TO authenticated
WITH CHECK (reviewer_user_id = auth.uid());

-- =============================================================
-- Update review_parent_summary_packet RPC to derive agency from students
-- =============================================================
CREATE OR REPLACE FUNCTION public.review_parent_summary_packet(
  _packet_id uuid,
  _decision text,
  _comment text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_id uuid;
  _packet parent_summary_packets;
  _student_agency_id uuid;
BEGIN
  _user_id := auth.uid();
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  IF _decision NOT IN ('approved', 'rejected', 'needs_clarification') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid decision');
  END IF;

  SELECT * INTO _packet FROM public.parent_summary_packets WHERE id = _packet_id;
  IF _packet IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Packet not found');
  END IF;

  -- Derive agency from the learner (students table), not from the packet
  SELECT agency_id INTO _student_agency_id
  FROM public.students WHERE id = _packet.client_id;

  -- Verify reviewer is an active member of the learner's agency
  IF NOT EXISTS (
    SELECT 1 FROM public.agency_memberships
    WHERE user_id = _user_id
      AND agency_id = _student_agency_id
      AND status = 'active'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Update packet
  UPDATE public.parent_summary_packets
  SET status = _decision,
      reviewed_by = _user_id,
      reviewed_at = now(),
      review_decision = _decision,
      review_comment = _comment,
      updated_at = now()
  WHERE id = _packet_id;

  -- Insert review audit record
  INSERT INTO public.parent_summary_packet_reviews (packet_id, reviewer_user_id, decision, comment)
  VALUES (_packet_id, _user_id, _decision, _comment);

  RETURN jsonb_build_object('success', true, 'packet_id', _packet_id, 'decision', _decision);
END;
$$;
