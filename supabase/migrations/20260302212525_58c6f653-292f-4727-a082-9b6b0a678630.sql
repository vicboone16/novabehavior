
-- ========================================================
-- SECURITY FIX: Enable RLS + add policies on 12 tables
-- SECURITY FIX: Set security_invoker=on for 12 views
-- ========================================================

-- ===================== admin_master_codes =====================
ALTER TABLE public.admin_master_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can read master codes"
  ON public.admin_master_codes FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can insert master codes"
  ON public.admin_master_codes FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can update master codes"
  ON public.admin_master_codes FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can delete master codes"
  ON public.admin_master_codes FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- ===================== agency_invite_codes =====================
ALTER TABLE public.agency_invite_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency admins can read invite codes"
  ON public.agency_invite_codes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.agency_memberships am
      WHERE am.user_id = auth.uid()
        AND am.agency_id = agency_invite_codes.agency_id
        AND am.status = 'active'
        AND am.role IN ('owner', 'admin')
    ) OR public.is_admin(auth.uid())
  );

CREATE POLICY "Agency admins can insert invite codes"
  ON public.agency_invite_codes FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.agency_memberships am
      WHERE am.user_id = auth.uid()
        AND am.agency_id = agency_invite_codes.agency_id
        AND am.status = 'active'
        AND am.role IN ('owner', 'admin')
    ) OR public.is_admin(auth.uid())
  );

CREATE POLICY "Agency admins can update invite codes"
  ON public.agency_invite_codes FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.agency_memberships am
      WHERE am.user_id = auth.uid()
        AND am.agency_id = agency_invite_codes.agency_id
        AND am.status = 'active'
        AND am.role IN ('owner', 'admin')
    ) OR public.is_admin(auth.uid())
  );

-- ===================== parent_invite_codes =====================
ALTER TABLE public.parent_invite_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency staff can read parent invite codes"
  ON public.parent_invite_codes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.agency_memberships am
      WHERE am.user_id = auth.uid()
        AND am.agency_id = parent_invite_codes.agency_id
        AND am.status = 'active'
    ) OR public.is_admin(auth.uid())
  );

CREATE POLICY "Agency staff can insert parent invite codes"
  ON public.parent_invite_codes FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.agency_memberships am
      WHERE am.user_id = auth.uid()
        AND am.agency_id = parent_invite_codes.agency_id
        AND am.status = 'active'
    ) OR public.is_admin(auth.uid())
  );

CREATE POLICY "Agency staff can update parent invite codes"
  ON public.parent_invite_codes FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.agency_memberships am
      WHERE am.user_id = auth.uid()
        AND am.agency_id = parent_invite_codes.agency_id
        AND am.status = 'active'
    ) OR public.is_admin(auth.uid())
  );

-- ===================== session_postings =====================
ALTER TABLE public.session_postings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency billing admins can view session postings"
  ON public.session_postings FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.agency_memberships am
      WHERE am.user_id = auth.uid()
        AND am.agency_id = session_postings.agency_id
        AND am.status = 'active'
        AND am.role IN ('owner', 'admin')
    ) OR public.is_admin(auth.uid())
  );

CREATE POLICY "Agency billing admins can insert session postings"
  ON public.session_postings FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.agency_memberships am
      WHERE am.user_id = auth.uid()
        AND am.agency_id = session_postings.agency_id
        AND am.status = 'active'
        AND am.role IN ('owner', 'admin')
    ) OR public.is_admin(auth.uid())
  );

CREATE POLICY "Agency billing admins can update session postings"
  ON public.session_postings FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.agency_memberships am
      WHERE am.user_id = auth.uid()
        AND am.agency_id = session_postings.agency_id
        AND am.status = 'active'
        AND am.role IN ('owner', 'admin')
    ) OR public.is_admin(auth.uid())
  );

-- ===================== time_blocks =====================
ALTER TABLE public.time_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own time blocks"
  ON public.time_blocks FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Users can insert own time blocks"
  ON public.time_blocks FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Users can update own time blocks"
  ON public.time_blocks FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Users can delete own time blocks"
  ON public.time_blocks FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- ===================== clinical_authorizations =====================
ALTER TABLE public.clinical_authorizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members can view clinical authorizations"
  ON public.clinical_authorizations FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.agency_memberships am
      WHERE am.user_id = auth.uid()
        AND am.agency_id = clinical_authorizations.agency_id
        AND am.status = 'active'
    ) OR public.is_admin(auth.uid())
  );

CREATE POLICY "Agency admins can insert clinical authorizations"
  ON public.clinical_authorizations FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.agency_memberships am
      WHERE am.user_id = auth.uid()
        AND am.agency_id = clinical_authorizations.agency_id
        AND am.status = 'active'
        AND am.role IN ('owner', 'admin')
    ) OR public.is_admin(auth.uid())
  );

CREATE POLICY "Agency admins can update clinical authorizations"
  ON public.clinical_authorizations FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.agency_memberships am
      WHERE am.user_id = auth.uid()
        AND am.agency_id = clinical_authorizations.agency_id
        AND am.status = 'active'
        AND am.role IN ('owner', 'admin')
    ) OR public.is_admin(auth.uid())
  );

-- ===================== esign_envelopes =====================
ALTER TABLE public.esign_envelopes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Envelope creators and org members can view"
  ON public.esign_envelopes FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Authenticated can insert envelopes"
  ON public.esign_envelopes FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Envelope creators can update"
  ON public.esign_envelopes FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.is_admin(auth.uid()));

-- ===================== esign_recipients =====================
ALTER TABLE public.esign_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Envelope owners can view recipients"
  ON public.esign_recipients FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.esign_envelopes e
      WHERE e.id = esign_recipients.envelope_id
        AND (e.created_by = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

CREATE POLICY "Envelope owners can insert recipients"
  ON public.esign_recipients FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.esign_envelopes e
      WHERE e.id = esign_recipients.envelope_id
        AND e.created_by = auth.uid()
    )
  );

CREATE POLICY "Envelope owners can update recipients"
  ON public.esign_recipients FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.esign_envelopes e
      WHERE e.id = esign_recipients.envelope_id
        AND (e.created_by = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

-- ===================== esign_audit_log =====================
ALTER TABLE public.esign_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Envelope owners can view audit log"
  ON public.esign_audit_log FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.esign_envelopes e
      WHERE e.id = esign_audit_log.envelope_id
        AND (e.created_by = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

-- ===================== esign_document_templates =====================
-- Uses org_id, not created_by
ALTER TABLE public.esign_document_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view templates"
  ON public.esign_document_templates FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.agency_memberships am
      WHERE am.user_id = auth.uid()
        AND am.agency_id = esign_document_templates.org_id
        AND am.status = 'active'
    ) OR public.is_admin(auth.uid())
  );

CREATE POLICY "Org admins can insert templates"
  ON public.esign_document_templates FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.agency_memberships am
      WHERE am.user_id = auth.uid()
        AND am.agency_id = esign_document_templates.org_id
        AND am.status = 'active'
        AND am.role IN ('owner', 'admin')
    ) OR public.is_admin(auth.uid())
  );

CREATE POLICY "Org admins can update templates"
  ON public.esign_document_templates FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.agency_memberships am
      WHERE am.user_id = auth.uid()
        AND am.agency_id = esign_document_templates.org_id
        AND am.status = 'active'
        AND am.role IN ('owner', 'admin')
    ) OR public.is_admin(auth.uid())
  );

-- ===================== esign_signed_files =====================
ALTER TABLE public.esign_signed_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Envelope owners can view signed files"
  ON public.esign_signed_files FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.esign_envelopes e
      WHERE e.id = esign_signed_files.envelope_id
        AND (e.created_by = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

-- ===================== documents =====================
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Document creators can view"
  ON public.documents FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Authenticated can insert documents"
  ON public.documents FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Document creators can update"
  ON public.documents FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Document creators can delete"
  ON public.documents FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.is_admin(auth.uid()));

-- ========================================================
-- SECURITY FIX: Set security_invoker=on for views
-- ========================================================

ALTER VIEW public.user_client_access SET (security_invoker = on);
ALTER VIEW public.v_active_agency SET (security_invoker = on);
ALTER VIEW public.v_authorization_utilization SET (security_invoker = on);
ALTER VIEW public.v_clinical_schedule_events_norm SET (security_invoker = on);
ALTER VIEW public.v_clinical_service_logs_norm SET (security_invoker = on);
ALTER VIEW public.v_iep_drafts_recent SET (security_invoker = on);
ALTER VIEW public.v_staff_packets_needing_review SET (security_invoker = on);
ALTER VIEW public.v_teacher_abc_recent SET (security_invoker = on);
ALTER VIEW public.v_teacher_roster SET (security_invoker = on);
ALTER VIEW public.v_teacher_roster_sources SET (security_invoker = on);
ALTER VIEW public.v_weekly_snapshots_queue SET (security_invoker = on);
ALTER VIEW public.weekly_snapshots SET (security_invoker = on);
