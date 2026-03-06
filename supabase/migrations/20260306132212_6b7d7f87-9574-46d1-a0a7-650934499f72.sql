
-- ==========================================
-- Client Intervention Plan tables
-- ==========================================

CREATE TABLE IF NOT EXISTS client_intervention_plans (
  plan_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  agency_id uuid REFERENCES agencies(id),
  title text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS client_intervention_plan_items (
  item_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES client_intervention_plans(plan_id) ON DELETE CASCADE,
  intervention_id uuid REFERENCES aba_library_interventions(intervention_id),
  custom_title text,
  custom_steps jsonb DEFAULT '[]',
  custom_scripts jsonb DEFAULT '[]',
  custom_fidelity_checklist jsonb DEFAULT '[]',
  custom_reinforcement jsonb DEFAULT '[]',
  data_collection_method text,
  mastery_criteria jsonb,
  status text NOT NULL DEFAULT 'active',
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS client_plan_fidelity_runs (
  run_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES client_intervention_plan_items(item_id) ON DELETE CASCADE,
  observer_user_id uuid,
  checklist_results jsonb NOT NULL DEFAULT '[]',
  score_pct numeric,
  observed_at timestamptz DEFAULT now(),
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS client_plan_notes (
  note_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid REFERENCES client_intervention_plans(plan_id) ON DELETE CASCADE,
  item_id uuid REFERENCES client_intervention_plan_items(item_id) ON DELETE SET NULL,
  author_user_id uuid,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS client_plan_data_links (
  link_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES client_intervention_plan_items(item_id) ON DELETE CASCADE,
  target_type text NOT NULL, -- 'skill_target', 'behavior'
  target_id uuid NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- RLS for all plan tables
ALTER TABLE client_intervention_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_intervention_plan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_plan_fidelity_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_plan_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_plan_data_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plan_select" ON client_intervention_plans FOR SELECT
USING (public.is_super_admin() OR agency_id = public.current_agency_id());
CREATE POLICY "plan_manage" ON client_intervention_plans FOR ALL
USING (public.is_super_admin() OR agency_id = public.current_agency_id());

CREATE POLICY "plan_items_select" ON client_intervention_plan_items FOR SELECT
USING (EXISTS (SELECT 1 FROM client_intervention_plans p WHERE p.plan_id = client_intervention_plan_items.plan_id AND (public.is_super_admin() OR p.agency_id = public.current_agency_id())));
CREATE POLICY "plan_items_manage" ON client_intervention_plan_items FOR ALL
USING (EXISTS (SELECT 1 FROM client_intervention_plans p WHERE p.plan_id = client_intervention_plan_items.plan_id AND (public.is_super_admin() OR p.agency_id = public.current_agency_id())));

CREATE POLICY "fidelity_runs_select" ON client_plan_fidelity_runs FOR SELECT
USING (EXISTS (SELECT 1 FROM client_intervention_plan_items i JOIN client_intervention_plans p ON p.plan_id = i.plan_id WHERE i.item_id = client_plan_fidelity_runs.item_id AND (public.is_super_admin() OR p.agency_id = public.current_agency_id())));
CREATE POLICY "fidelity_runs_manage" ON client_plan_fidelity_runs FOR ALL
USING (EXISTS (SELECT 1 FROM client_intervention_plan_items i JOIN client_intervention_plans p ON p.plan_id = i.plan_id WHERE i.item_id = client_plan_fidelity_runs.item_id AND (public.is_super_admin() OR p.agency_id = public.current_agency_id())));

CREATE POLICY "plan_notes_select" ON client_plan_notes FOR SELECT
USING (EXISTS (SELECT 1 FROM client_intervention_plans p WHERE p.plan_id = client_plan_notes.plan_id AND (public.is_super_admin() OR p.agency_id = public.current_agency_id())));
CREATE POLICY "plan_notes_manage" ON client_plan_notes FOR ALL
USING (EXISTS (SELECT 1 FROM client_intervention_plans p WHERE p.plan_id = client_plan_notes.plan_id AND (public.is_super_admin() OR p.agency_id = public.current_agency_id())));

CREATE POLICY "data_links_select" ON client_plan_data_links FOR SELECT
USING (EXISTS (SELECT 1 FROM client_intervention_plan_items i JOIN client_intervention_plans p ON p.plan_id = i.plan_id WHERE i.item_id = client_plan_data_links.item_id AND (public.is_super_admin() OR p.agency_id = public.current_agency_id())));
CREATE POLICY "data_links_manage" ON client_plan_data_links FOR ALL
USING (EXISTS (SELECT 1 FROM client_intervention_plan_items i JOIN client_intervention_plans p ON p.plan_id = i.plan_id WHERE i.item_id = client_plan_data_links.item_id AND (public.is_super_admin() OR p.agency_id = public.current_agency_id())));

-- ==========================================
-- Cross-portal publishing tables
-- ==========================================

CREATE TABLE IF NOT EXISTS published_plan_items (
  publish_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES client_intervention_plan_items(item_id) ON DELETE CASCADE,
  client_id uuid NOT NULL,
  agency_id uuid REFERENCES agencies(id),
  published_by uuid,
  target_portal text NOT NULL, -- 'home', 'school', 'both'
  data_collection_mode text NOT NULL DEFAULT 'fyi_only', -- 'fyi_only', 'optional', 'required'
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS published_plan_versions (
  version_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publish_id uuid NOT NULL REFERENCES published_plan_items(publish_id) ON DELETE CASCADE,
  version_num int NOT NULL DEFAULT 1,
  snapshot jsonb NOT NULL, -- full plan item snapshot
  change_summary text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS published_plan_recipients (
  recipient_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publish_id uuid NOT NULL REFERENCES published_plan_items(publish_id) ON DELETE CASCADE,
  user_id uuid,
  recipient_type text NOT NULL, -- 'parent', 'teacher', 'staff'
  acknowledged_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS published_plan_reactions (
  reaction_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publish_id uuid NOT NULL REFERENCES published_plan_items(publish_id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  reaction_type text NOT NULL, -- 'thumbs_up', 'acknowledged', 'question', 'concern'
  comment text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS published_plan_notifications (
  notification_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publish_id uuid REFERENCES published_plan_items(publish_id) ON DELETE CASCADE,
  recipient_user_id uuid NOT NULL,
  client_id uuid,
  agency_id uuid REFERENCES agencies(id),
  notification_type text NOT NULL, -- 'plan_published', 'plan_updated', 'data_collection_requested', 'data_collection_approved', 'data_collection_disabled', 'reaction_received'
  title text NOT NULL,
  body text,
  is_read boolean DEFAULT false,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS published_plan_data_permissions (
  permission_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publish_id uuid NOT NULL REFERENCES published_plan_items(publish_id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'denied', 'disabled'
  requested_by text NOT NULL, -- 'bcba', 'recipient'
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS published_plan_data_logs (
  log_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publish_id uuid NOT NULL REFERENCES published_plan_items(publish_id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  data_type text NOT NULL, -- 'frequency', 'duration', 'abc', 'notes'
  value jsonb NOT NULL,
  recorded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- RLS for publishing tables
ALTER TABLE published_plan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE published_plan_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE published_plan_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE published_plan_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE published_plan_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE published_plan_data_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE published_plan_data_logs ENABLE ROW LEVEL SECURITY;

-- Simplified policies: agency-scoped
CREATE POLICY "pub_items_select" ON published_plan_items FOR SELECT
USING (public.is_super_admin() OR agency_id = public.current_agency_id());
CREATE POLICY "pub_items_manage" ON published_plan_items FOR ALL
USING (public.is_super_admin() OR agency_id = public.current_agency_id());

CREATE POLICY "pub_versions_select" ON published_plan_versions FOR SELECT
USING (EXISTS (SELECT 1 FROM published_plan_items p WHERE p.publish_id = published_plan_versions.publish_id AND (public.is_super_admin() OR p.agency_id = public.current_agency_id())));
CREATE POLICY "pub_versions_manage" ON published_plan_versions FOR ALL
USING (EXISTS (SELECT 1 FROM published_plan_items p WHERE p.publish_id = published_plan_versions.publish_id AND (public.is_super_admin() OR p.agency_id = public.current_agency_id())));

CREATE POLICY "pub_recipients_select" ON published_plan_recipients FOR SELECT
USING (EXISTS (SELECT 1 FROM published_plan_items p WHERE p.publish_id = published_plan_recipients.publish_id AND (public.is_super_admin() OR p.agency_id = public.current_agency_id())));
CREATE POLICY "pub_recipients_manage" ON published_plan_recipients FOR ALL
USING (EXISTS (SELECT 1 FROM published_plan_items p WHERE p.publish_id = published_plan_recipients.publish_id AND (public.is_super_admin() OR p.agency_id = public.current_agency_id())));

CREATE POLICY "pub_reactions_select" ON published_plan_reactions FOR SELECT
USING (EXISTS (SELECT 1 FROM published_plan_items p WHERE p.publish_id = published_plan_reactions.publish_id AND (public.is_super_admin() OR p.agency_id = public.current_agency_id())));
CREATE POLICY "pub_reactions_manage" ON published_plan_reactions FOR ALL
USING (EXISTS (SELECT 1 FROM published_plan_items p WHERE p.publish_id = published_plan_reactions.publish_id AND (public.is_super_admin() OR p.agency_id = public.current_agency_id())));

CREATE POLICY "pub_notif_select" ON published_plan_notifications FOR SELECT
USING (public.is_super_admin() OR recipient_user_id = auth.uid() OR agency_id = public.current_agency_id());
CREATE POLICY "pub_notif_manage" ON published_plan_notifications FOR ALL
USING (public.is_super_admin() OR agency_id = public.current_agency_id());

CREATE POLICY "pub_data_perm_select" ON published_plan_data_permissions FOR SELECT
USING (EXISTS (SELECT 1 FROM published_plan_items p WHERE p.publish_id = published_plan_data_permissions.publish_id AND (public.is_super_admin() OR p.agency_id = public.current_agency_id())));
CREATE POLICY "pub_data_perm_manage" ON published_plan_data_permissions FOR ALL
USING (EXISTS (SELECT 1 FROM published_plan_items p WHERE p.publish_id = published_plan_data_permissions.publish_id AND (public.is_super_admin() OR p.agency_id = public.current_agency_id())));

CREATE POLICY "pub_data_logs_select" ON published_plan_data_logs FOR SELECT
USING (EXISTS (SELECT 1 FROM published_plan_items p WHERE p.publish_id = published_plan_data_logs.publish_id AND (public.is_super_admin() OR p.agency_id = public.current_agency_id())));
CREATE POLICY "pub_data_logs_manage" ON published_plan_data_logs FOR ALL
USING (EXISTS (SELECT 1 FROM published_plan_items p WHERE p.publish_id = published_plan_data_logs.publish_id AND (public.is_super_admin() OR p.agency_id = public.current_agency_id())));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pub_items_client ON published_plan_items(client_id);
CREATE INDEX IF NOT EXISTS idx_pub_items_agency ON published_plan_items(agency_id);
CREATE INDEX IF NOT EXISTS idx_pub_notif_recipient ON published_plan_notifications(recipient_user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_pub_notif_agency ON published_plan_notifications(agency_id);
