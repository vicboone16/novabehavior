-- BATCH 2: User-scoped and creator-scoped tables

-- ai_chat_logs (user_id)
CREATE POLICY "user_select" ON public.ai_chat_logs FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "user_insert" ON public.ai_chat_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_delete" ON public.ai_chat_logs FOR DELETE TO authenticated USING (user_id = auth.uid());

-- app_notifications (user_id)
CREATE POLICY "user_select" ON public.app_notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "user_update" ON public.app_notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "admin_all" ON public.app_notifications FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- lms_progress (user_id)
CREATE POLICY "user_select" ON public.lms_progress FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "user_insert" ON public.lms_progress FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_update" ON public.lms_progress FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "admin_select" ON public.lms_progress FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- user_feature_access (user_id)
CREATE POLICY "user_select" ON public.user_feature_access FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "admin_all" ON public.user_feature_access FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- training_certification_progress (user_id)
CREATE POLICY "user_select" ON public.training_certification_progress FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "user_insert" ON public.training_certification_progress FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_update" ON public.training_certification_progress FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "admin_all" ON public.training_certification_progress FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Nova AI user-owned tables (user_id)
CREATE POLICY "user_select" ON public.nova_ai_conversations FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "user_insert" ON public.nova_ai_conversations FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_update" ON public.nova_ai_conversations FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_delete" ON public.nova_ai_conversations FOR DELETE TO authenticated USING (user_id = auth.uid());

-- nova_ai_messages (via conversation ownership)
CREATE POLICY "user_select" ON public.nova_ai_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.nova_ai_conversations c WHERE c.id = nova_ai_messages.conversation_id AND c.user_id = auth.uid()));
CREATE POLICY "user_insert" ON public.nova_ai_messages FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.nova_ai_conversations c WHERE c.id = nova_ai_messages.conversation_id AND c.user_id = auth.uid()));

CREATE POLICY "user_select" ON public.nova_ai_reasoning_logs FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "user_insert" ON public.nova_ai_reasoning_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Nova AI tables with user_id
CREATE POLICY "user_select" ON public.nova_ai_case_context_sessions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "user_insert" ON public.nova_ai_case_context_sessions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_update" ON public.nova_ai_case_context_sessions FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_select" ON public.nova_ai_case_quick_action_history FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "user_insert" ON public.nova_ai_case_quick_action_history FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_select" ON public.nova_ai_case_reasoning_outputs FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "user_insert" ON public.nova_ai_case_reasoning_outputs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_select" ON public.nova_ai_fba_drafts FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "user_insert" ON public.nova_ai_fba_drafts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_update" ON public.nova_ai_fba_drafts FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_delete" ON public.nova_ai_fba_drafts FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "user_select" ON public.nova_ai_output_exports FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "user_insert" ON public.nova_ai_output_exports FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_select" ON public.nova_ai_reassessment_drafts FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "user_insert" ON public.nova_ai_reassessment_drafts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_update" ON public.nova_ai_reassessment_drafts FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_select" ON public.nova_ai_saved_clinical_drafts FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "user_insert" ON public.nova_ai_saved_clinical_drafts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_update" ON public.nova_ai_saved_clinical_drafts FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_delete" ON public.nova_ai_saved_clinical_drafts FOR DELETE TO authenticated USING (user_id = auth.uid());

-- BCBA export snapshots (created_by)
CREATE POLICY "creator_select" ON public.bcba_export_snapshots FOR SELECT TO authenticated USING (created_by = auth.uid());
CREATE POLICY "creator_insert" ON public.bcba_export_snapshots FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "admin_select" ON public.bcba_export_snapshots FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- Session note drafts (created_by)
CREATE POLICY "creator_select" ON public.session_note_drafts FOR SELECT TO authenticated USING (created_by = auth.uid());
CREATE POLICY "creator_insert" ON public.session_note_drafts FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "creator_update" ON public.session_note_drafts FOR UPDATE TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "creator_delete" ON public.session_note_drafts FOR DELETE TO authenticated USING (created_by = auth.uid());

-- Reference tables that were misidentified
CREATE POLICY "auth_select" ON public.training_downloads FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.training_downloads FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "auth_select" ON public.graph_presets FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.graph_presets FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));