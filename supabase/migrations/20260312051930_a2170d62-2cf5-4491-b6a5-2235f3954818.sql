
-- HIPAA PRE-MIGRATION: Enable RLS on all 16 unprotected tables

-- 1. app_navigation_structure — read-only config
ALTER TABLE public.app_navigation_structure ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read nav structure"
  ON public.app_navigation_structure FOR SELECT TO authenticated USING (true);

-- 2. client_programs — scoped by agency_id
ALTER TABLE public.client_programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agency members can manage client programs"
  ON public.client_programs FOR ALL TO authenticated
  USING (public.is_agency_member(auth.uid(), agency_id))
  WITH CHECK (public.is_agency_member(auth.uid(), agency_id));

-- 3. client_program_items — joined via client_programs
ALTER TABLE public.client_program_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agency members can manage client program items"
  ON public.client_program_items FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.client_programs cp
      WHERE cp.id = client_program_items.client_program_id
      AND public.is_agency_member(auth.uid(), cp.agency_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.client_programs cp
      WHERE cp.id = client_program_items.client_program_id
      AND public.is_agency_member(auth.uid(), cp.agency_id)
    )
  );

-- 4. clinical_library_items — scoped by agency_id
ALTER TABLE public.clinical_library_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agency members can manage clinical library items"
  ON public.clinical_library_items FOR ALL TO authenticated
  USING (public.is_agency_member(auth.uid(), agency_id))
  WITH CHECK (public.is_agency_member(auth.uid(), agency_id));

-- 5. clinical_library_reviews — scoped by agency_id
ALTER TABLE public.clinical_library_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agency members can manage clinical library reviews"
  ON public.clinical_library_reviews FOR ALL TO authenticated
  USING (public.is_agency_member(auth.uid(), agency_id))
  WITH CHECK (public.is_agency_member(auth.uid(), agency_id));

-- 6. operations_modules — read-only config (no user/agency column)
ALTER TABLE public.operations_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read operations modules"
  ON public.operations_modules FOR SELECT TO authenticated USING (true);

-- 7. program_templates — scoped by agency_id
ALTER TABLE public.program_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agency members can manage program templates"
  ON public.program_templates FOR ALL TO authenticated
  USING (public.is_agency_member(auth.uid(), agency_id))
  WITH CHECK (public.is_agency_member(auth.uid(), agency_id));

-- 8. program_template_items — joined via program_templates
ALTER TABLE public.program_template_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agency members can manage program template items"
  ON public.program_template_items FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.program_templates pt
      WHERE pt.id = program_template_items.template_id
      AND public.is_agency_member(auth.uid(), pt.agency_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.program_templates pt
      WHERE pt.id = program_template_items.template_id
      AND public.is_agency_member(auth.uid(), pt.agency_id)
    )
  );

-- 9. resource_files — scoped by agency_id
ALTER TABLE public.resource_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agency members can manage resource files"
  ON public.resource_files FOR ALL TO authenticated
  USING (public.is_agency_member(auth.uid(), agency_id))
  WITH CHECK (public.is_agency_member(auth.uid(), agency_id));

-- 10. resource_folders — scoped by agency_id
ALTER TABLE public.resource_folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agency members can manage resource folders"
  ON public.resource_folders FOR ALL TO authenticated
  USING (public.is_agency_member(auth.uid(), agency_id))
  WITH CHECK (public.is_agency_member(auth.uid(), agency_id));

-- 11. resource_upload_confirmations — scoped by agency_id
ALTER TABLE public.resource_upload_confirmations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agency members can manage upload confirmations"
  ON public.resource_upload_confirmations FOR ALL TO authenticated
  USING (public.is_agency_member(auth.uid(), agency_id))
  WITH CHECK (public.is_agency_member(auth.uid(), agency_id));

-- 12. role_module_permissions — scoped by agency_id (read for all members, write for admins)
ALTER TABLE public.role_module_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agency members can read role module permissions"
  ON public.role_module_permissions FOR SELECT TO authenticated
  USING (public.is_agency_member(auth.uid(), agency_id));
CREATE POLICY "Admins can manage role module permissions"
  ON public.role_module_permissions FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND public.is_agency_member(auth.uid(), agency_id));
CREATE POLICY "Admins can update role module permissions"
  ON public.role_module_permissions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND public.is_agency_member(auth.uid(), agency_id))
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND public.is_agency_member(auth.uid(), agency_id));
CREATE POLICY "Admins can delete role module permissions"
  ON public.role_module_permissions FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND public.is_agency_member(auth.uid(), agency_id));

-- 13. service_requests — scoped by agency_id
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agency members can manage service requests"
  ON public.service_requests FOR ALL TO authenticated
  USING (public.is_agency_member(auth.uid(), agency_id))
  WITH CHECK (public.is_agency_member(auth.uid(), agency_id));

-- 14. service_request_types — scoped by agency_id
ALTER TABLE public.service_request_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agency members can manage service request types"
  ON public.service_request_types FOR ALL TO authenticated
  USING (public.is_agency_member(auth.uid(), agency_id))
  WITH CHECK (public.is_agency_member(auth.uid(), agency_id));

-- 15. service_request_updates — scoped by agency_id
ALTER TABLE public.service_request_updates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agency members can manage service request updates"
  ON public.service_request_updates FOR ALL TO authenticated
  USING (public.is_agency_member(auth.uid(), agency_id))
  WITH CHECK (public.is_agency_member(auth.uid(), agency_id));

-- 16. service_request_attachments — scoped by agency_id
ALTER TABLE public.service_request_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agency members can manage service request attachments"
  ON public.service_request_attachments FOR ALL TO authenticated
  USING (public.is_agency_member(auth.uid(), agency_id))
  WITH CHECK (public.is_agency_member(auth.uid(), agency_id));
