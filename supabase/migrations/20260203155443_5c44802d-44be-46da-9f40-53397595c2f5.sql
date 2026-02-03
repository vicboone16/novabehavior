-- IEP Accommodations & Modifications Library Tables

-- Global IEP Library Items
CREATE TABLE public.iep_library_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_type TEXT NOT NULL CHECK (item_type IN ('accommodation', 'modification')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  implementation_notes JSONB DEFAULT '[]'::jsonb,
  domains TEXT[] NOT NULL DEFAULT '{}',
  disability_tags TEXT[] NOT NULL DEFAULT '{}',
  grade_band TEXT[] NOT NULL DEFAULT '{}',
  setting_tags TEXT[] NOT NULL DEFAULT '{}',
  topics TEXT[] DEFAULT '{}',
  contraindications TEXT[] DEFAULT '{}',
  idea_compliance_level TEXT DEFAULT 'safe' CHECK (idea_compliance_level IN ('safe', 'caution', 'modification')),
  export_language JSONB DEFAULT '{"iep": "", "parent": ""}'::jsonb,
  evidence_notes TEXT,
  source_reference TEXT[],
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  usage_count INTEGER DEFAULT 0,
  acceptance_rate NUMERIC(5,2) DEFAULT 0,
  agency_id UUID REFERENCES public.agencies(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Student IEP Supports (linking library items to students)
CREATE TABLE public.student_iep_supports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  library_item_id UUID REFERENCES public.iep_library_items(id),
  custom_title TEXT,
  custom_description TEXT,
  item_type TEXT NOT NULL CHECK (item_type IN ('accommodation', 'modification')),
  student_status TEXT NOT NULL DEFAULT 'considering' CHECK (student_status IN ('existing', 'considering', 'not_using')),
  source TEXT NOT NULL DEFAULT 'clinician_added' CHECK (source IN ('from_iep_document', 'clinician_added', 'teacher_reported', 'recommended_by_system')),
  notes TEXT,
  start_date DATE,
  review_date DATE,
  is_primary_support BOOLEAN DEFAULT false,
  domains_override TEXT[],
  setting_tags_override TEXT[],
  linked_goal_ids UUID[] DEFAULT '{}',
  last_reviewed_by UUID,
  last_reviewed_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- IEP Recommendation Logs (tracking recommendation acceptance)
CREATE TABLE public.iep_recommendation_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  library_item_id UUID NOT NULL REFERENCES public.iep_library_items(id) ON DELETE CASCADE,
  recommended_reason TEXT,
  confidence INTEGER DEFAULT 50 CHECK (confidence >= 0 AND confidence <= 100),
  user_action TEXT CHECK (user_action IN ('accepted', 'dismissed', 'saved_for_later')),
  actioned_by UUID,
  actioned_at TIMESTAMPTZ,
  student_profile_snapshot JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Student IEP Support Audit Log
CREATE TABLE public.student_iep_support_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  support_id UUID NOT NULL REFERENCES public.student_iep_supports(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT,
  changed_by UUID,
  change_details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_iep_library_items_status ON public.iep_library_items(status);
CREATE INDEX idx_iep_library_items_item_type ON public.iep_library_items(item_type);
CREATE INDEX idx_iep_library_items_domains ON public.iep_library_items USING GIN(domains);
CREATE INDEX idx_iep_library_items_disability_tags ON public.iep_library_items USING GIN(disability_tags);
CREATE INDEX idx_iep_library_items_grade_band ON public.iep_library_items USING GIN(grade_band);
CREATE INDEX idx_iep_library_items_setting_tags ON public.iep_library_items USING GIN(setting_tags);
CREATE INDEX idx_iep_library_items_topics ON public.iep_library_items USING GIN(topics);
CREATE INDEX idx_iep_library_items_search ON public.iep_library_items USING GIN(to_tsvector('english', title || ' ' || description));

CREATE INDEX idx_student_iep_supports_student ON public.student_iep_supports(student_id);
CREATE INDEX idx_student_iep_supports_status ON public.student_iep_supports(student_status);
CREATE INDEX idx_student_iep_supports_library_item ON public.student_iep_supports(library_item_id);

CREATE INDEX idx_iep_recommendation_logs_student ON public.iep_recommendation_logs(student_id);
CREATE INDEX idx_iep_recommendation_logs_library_item ON public.iep_recommendation_logs(library_item_id);

-- Enable RLS
ALTER TABLE public.iep_library_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_iep_supports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.iep_recommendation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_iep_support_audit ENABLE ROW LEVEL SECURITY;

-- RLS Policies for iep_library_items
CREATE POLICY "Users can view active library items"
  ON public.iep_library_items FOR SELECT
  USING (status = 'active' OR auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create library items"
  ON public.iep_library_items FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own library items or admins"
  ON public.iep_library_items FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- RLS Policies for student_iep_supports
CREATE POLICY "Users can view student supports"
  ON public.student_iep_supports FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create student supports"
  ON public.student_iep_supports FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update student supports"
  ON public.student_iep_supports FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete student supports"
  ON public.student_iep_supports FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- RLS Policies for recommendation logs
CREATE POLICY "Users can view recommendation logs"
  ON public.iep_recommendation_logs FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create recommendation logs"
  ON public.iep_recommendation_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update recommendation logs"
  ON public.iep_recommendation_logs FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- RLS Policies for audit logs
CREATE POLICY "Users can view audit logs"
  ON public.student_iep_support_audit FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can create audit logs"
  ON public.student_iep_support_audit FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Trigger to update updated_at
CREATE TRIGGER update_iep_library_items_updated_at
  BEFORE UPDATE ON public.iep_library_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_student_iep_supports_updated_at
  BEFORE UPDATE ON public.student_iep_supports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to create audit log on student support changes
CREATE OR REPLACE FUNCTION public.audit_student_iep_support_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.student_iep_support_audit (support_id, action, new_status, changed_by, change_details)
    VALUES (NEW.id, 'created', NEW.student_status, NEW.created_by, jsonb_build_object('item_type', NEW.item_type, 'source', NEW.source));
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.student_status IS DISTINCT FROM NEW.student_status THEN
      INSERT INTO public.student_iep_support_audit (support_id, action, previous_status, new_status, changed_by, change_details)
      VALUES (NEW.id, 'status_changed', OLD.student_status, NEW.student_status, auth.uid(), jsonb_build_object('notes', NEW.notes));
    ELSE
      INSERT INTO public.student_iep_support_audit (support_id, action, previous_status, new_status, changed_by, change_details)
      VALUES (NEW.id, 'updated', OLD.student_status, NEW.student_status, auth.uid(), jsonb_build_object('notes', NEW.notes));
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.student_iep_support_audit (support_id, action, previous_status, changed_by, change_details)
    VALUES (OLD.id, 'deleted', OLD.student_status, auth.uid(), jsonb_build_object('title', COALESCE(OLD.custom_title, '')));
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER audit_student_iep_supports
  AFTER INSERT OR UPDATE OR DELETE ON public.student_iep_supports
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_student_iep_support_changes();