
-- Enhanced Parent Summary Packets with detailed fields
CREATE TABLE IF NOT EXISTS public.parent_summary_packets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id),
  client_id uuid NOT NULL REFERENCES public.students(id),
  submitted_by uuid NOT NULL,
  source text NOT NULL DEFAULT 'behavior_decoded_import',
  week_start date NOT NULL,
  week_end date NOT NULL,
  -- Detailed summary fields
  abc_count integer DEFAULT 0,
  frequency_total integer,
  duration_minutes_total numeric,
  intensity_avg numeric,
  top_functions jsonb DEFAULT '[]'::jsonb,
  top_triggers jsonb DEFAULT '[]'::jsonb,
  tools_used jsonb DEFAULT '{}'::jsonb,
  engagement jsonb DEFAULT '{}'::jsonb,
  parent_notes text,
  -- Legacy compat
  summary_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  behavior_count integer,
  avg_intensity numeric,
  total_duration_minutes numeric,
  notes text,
  -- Review workflow
  status text NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review','approved','rejected','needs_clarification')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_decision text,
  review_comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.parent_summary_packets ENABLE ROW LEVEL SECURITY;

-- Submitter can view own packets
CREATE POLICY "psp_submitter_select"
ON public.parent_summary_packets FOR SELECT TO authenticated
USING (submitted_by = auth.uid());

-- Agency members can view packets for their agency
CREATE POLICY "psp_agency_select"
ON public.parent_summary_packets FOR SELECT TO authenticated
USING (agency_id IN (
  SELECT agency_id FROM public.agency_memberships WHERE user_id = auth.uid() AND status = 'active'
));

-- Authenticated users can submit packets
CREATE POLICY "psp_insert"
ON public.parent_summary_packets FOR INSERT TO authenticated
WITH CHECK (submitted_by = auth.uid());

-- Agency members can update packet status (review)
CREATE POLICY "psp_agency_update"
ON public.parent_summary_packets FOR UPDATE TO authenticated
USING (agency_id IN (
  SELECT agency_id FROM public.agency_memberships WHERE user_id = auth.uid() AND status = 'active'
));

-- Review audit table
CREATE TABLE IF NOT EXISTS public.parent_summary_packet_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  packet_id uuid NOT NULL REFERENCES public.parent_summary_packets(id) ON DELETE CASCADE,
  reviewer_user_id uuid NOT NULL,
  decision text NOT NULL CHECK (decision IN ('approved','rejected','needs_clarification')),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.parent_summary_packet_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pspr_agency_select"
ON public.parent_summary_packet_reviews FOR SELECT TO authenticated
USING (packet_id IN (
  SELECT id FROM public.parent_summary_packets WHERE agency_id IN (
    SELECT agency_id FROM public.agency_memberships WHERE user_id = auth.uid() AND status = 'active'
  )
));

CREATE POLICY "pspr_insert"
ON public.parent_summary_packet_reviews FOR INSERT TO authenticated
WITH CHECK (reviewer_user_id = auth.uid());

-- RPC: Review a parent summary packet
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

  -- Verify reviewer has agency access
  IF NOT EXISTS (
    SELECT 1 FROM public.agency_memberships
    WHERE user_id = _user_id AND agency_id = _packet.agency_id AND status = 'active'
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

-- Invite code attempt rate limiter table
CREATE TABLE IF NOT EXISTS public.invite_code_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  ip_address text,
  code_tried text,
  success boolean NOT NULL DEFAULT false,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.invite_code_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ica_insert"
ON public.invite_code_attempts FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());
