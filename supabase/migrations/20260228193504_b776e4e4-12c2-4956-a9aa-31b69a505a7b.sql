
-- Coach Evidence Packets
CREATE TABLE public.coach_evidence_packets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID REFERENCES public.agencies(id),
  student_id UUID NOT NULL REFERENCES public.students(id),
  coach_user_id UUID NOT NULL,
  caregiver_name TEXT NOT NULL,
  caregiver_relationship TEXT,
  program_id UUID REFERENCES public.caregiver_training_programs(id),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'follow_up', 'rejected')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewer_id UUID,
  reviewer_notes TEXT,
  active_seconds INTEGER DEFAULT 0,
  completion_count INTEGER DEFAULT 0,
  integrity_score NUMERIC(5,2),
  integrity_flags JSONB DEFAULT '[]'::jsonb,
  evidence_summary TEXT,
  soap_note_draft_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Coach Evidence Items
CREATE TABLE public.coach_evidence_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  packet_id UUID NOT NULL REFERENCES public.coach_evidence_packets(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL,
  label TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_coach_evidence_packets_student ON public.coach_evidence_packets(student_id);
CREATE INDEX idx_coach_evidence_packets_status ON public.coach_evidence_packets(status);
CREATE INDEX idx_coach_evidence_packets_agency ON public.coach_evidence_packets(agency_id);
CREATE INDEX idx_coach_evidence_items_packet ON public.coach_evidence_items(packet_id);

-- Updated_at trigger
CREATE TRIGGER set_coach_evidence_packets_updated_at
  BEFORE UPDATE ON public.coach_evidence_packets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.coach_evidence_packets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_evidence_items ENABLE ROW LEVEL SECURITY;

-- Coaches can see their own packets (no billing/integrity fields via app-level filtering)
CREATE POLICY "coaches_own_packets" ON public.coach_evidence_packets
  FOR ALL USING (coach_user_id = auth.uid());

-- Agency staff can see packets for students in their agency
CREATE POLICY "agency_staff_view_packets" ON public.coach_evidence_packets
  FOR SELECT USING (public.has_agency_student_access(auth.uid(), student_id));

-- Agency admins/supervisors can update packets (approve/reject)
CREATE POLICY "supervisors_update_packets" ON public.coach_evidence_packets
  FOR UPDATE USING (public.has_agency_student_access(auth.uid(), student_id));

-- Items: viewable if user can see the packet
CREATE POLICY "view_evidence_items" ON public.coach_evidence_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.coach_evidence_packets p
      WHERE p.id = packet_id
      AND (p.coach_user_id = auth.uid() OR public.has_agency_student_access(auth.uid(), p.student_id))
    )
  );

-- Items: coaches can insert into their own packets
CREATE POLICY "coaches_insert_items" ON public.coach_evidence_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.coach_evidence_packets p
      WHERE p.id = packet_id AND p.coach_user_id = auth.uid()
    )
  );
