
-- ============================================================
-- Phase 1: Multi-Agency Curriculum & Clinical Library Schema
-- ============================================================

-- Add agency scoping + archive support to curriculum_systems
ALTER TABLE public.curriculum_systems
  ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS source_tier TEXT NOT NULL DEFAULT 'global' CHECK (source_tier IN ('global', 'agency', 'custom')),
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_by UUID,
  ADD COLUMN IF NOT EXISTS forked_from_id UUID REFERENCES public.curriculum_systems(id),
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS modified_by UUID,
  ADD COLUMN IF NOT EXISTS modified_at TIMESTAMPTZ;

-- Add agency scoping to domains
ALTER TABLE public.domains
  ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS source_tier TEXT NOT NULL DEFAULT 'global' CHECK (source_tier IN ('global', 'agency', 'custom')),
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS modified_by UUID,
  ADD COLUMN IF NOT EXISTS modified_at TIMESTAMPTZ;

-- Add agency scoping + edit tracking to curriculum_items
ALTER TABLE public.curriculum_items
  ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS source_tier TEXT NOT NULL DEFAULT 'global' CHECK (source_tier IN ('global', 'agency', 'custom')),
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  ADD COLUMN IF NOT EXISTS forked_from_id UUID REFERENCES public.curriculum_items(id),
  ADD COLUMN IF NOT EXISTS modified_by UUID,
  ADD COLUMN IF NOT EXISTS modified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS edit_history JSONB DEFAULT '[]'::JSONB;

-- Add agency scoping to org_goal_templates  
ALTER TABLE public.org_goal_templates
  ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS source_tier TEXT NOT NULL DEFAULT 'global' CHECK (source_tier IN ('global', 'agency', 'custom')),
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  ADD COLUMN IF NOT EXISTS forked_from_id UUID REFERENCES public.org_goal_templates(id),
  ADD COLUMN IF NOT EXISTS modified_by UUID,
  ADD COLUMN IF NOT EXISTS modified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS edit_history JSONB DEFAULT '[]'::JSONB;

-- Add archive/edit tracking to student_iep_supports
ALTER TABLE public.student_iep_supports
  ADD COLUMN IF NOT EXISTS modified_by UUID,
  ADD COLUMN IF NOT EXISTS modified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS edit_history JSONB DEFAULT '[]'::JSONB;

-- Add version tracking to curriculum_systems
ALTER TABLE public.curriculum_systems
  ADD COLUMN IF NOT EXISTS import_format TEXT,
  ADD COLUMN IF NOT EXISTS item_count INTEGER DEFAULT 0;

-- Indexes for agency-scoped queries
CREATE INDEX IF NOT EXISTS idx_curriculum_systems_agency ON public.curriculum_systems(agency_id) WHERE agency_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_curriculum_systems_source_tier ON public.curriculum_systems(source_tier, status);
CREATE INDEX IF NOT EXISTS idx_curriculum_items_agency ON public.curriculum_items(agency_id) WHERE agency_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_curriculum_items_source_tier ON public.curriculum_items(source_tier, status);
CREATE INDEX IF NOT EXISTS idx_domains_agency ON public.domains(agency_id) WHERE agency_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_org_goal_templates_agency ON public.org_goal_templates(agency_id) WHERE agency_id IS NOT NULL;

-- ============================================================
-- RLS Policies: Users see global + their agency's items
-- ============================================================

-- curriculum_systems RLS
ALTER TABLE public.curriculum_systems ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view global and agency curriculum systems"
ON public.curriculum_systems FOR SELECT TO authenticated
USING (
  source_tier = 'global'
  OR agency_id IS NULL
  OR public.has_agency_access(auth.uid(), agency_id)
);

CREATE POLICY "Agency admins can insert curriculum systems"
ON public.curriculum_systems FOR INSERT TO authenticated
WITH CHECK (
  agency_id IS NOT NULL
  AND public.is_agency_admin(auth.uid(), agency_id)
);

CREATE POLICY "Agency admins can update their curriculum systems"
ON public.curriculum_systems FOR UPDATE TO authenticated
USING (
  agency_id IS NOT NULL
  AND public.is_agency_admin(auth.uid(), agency_id)
);

CREATE POLICY "Super admins can manage global curriculum systems"
ON public.curriculum_systems FOR ALL TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- curriculum_items RLS
ALTER TABLE public.curriculum_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view global and agency curriculum items"
ON public.curriculum_items FOR SELECT TO authenticated
USING (
  source_tier = 'global'
  OR agency_id IS NULL
  OR public.has_agency_access(auth.uid(), agency_id)
);

CREATE POLICY "Agency admins can insert curriculum items"
ON public.curriculum_items FOR INSERT TO authenticated
WITH CHECK (
  agency_id IS NOT NULL
  AND public.is_agency_admin(auth.uid(), agency_id)
);

CREATE POLICY "Agency admins can update their curriculum items"
ON public.curriculum_items FOR UPDATE TO authenticated
USING (
  agency_id IS NOT NULL
  AND public.is_agency_admin(auth.uid(), agency_id)
);

CREATE POLICY "Super admins can manage global curriculum items"
ON public.curriculum_items FOR ALL TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- domains RLS
ALTER TABLE public.domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view global and agency domains"
ON public.domains FOR SELECT TO authenticated
USING (
  source_tier = 'global'
  OR agency_id IS NULL
  OR public.has_agency_access(auth.uid(), agency_id)
);

CREATE POLICY "Agency admins can insert domains"
ON public.domains FOR INSERT TO authenticated
WITH CHECK (
  agency_id IS NOT NULL
  AND public.is_agency_admin(auth.uid(), agency_id)
);

CREATE POLICY "Agency admins can update their domains"
ON public.domains FOR UPDATE TO authenticated
USING (
  agency_id IS NOT NULL
  AND public.is_agency_admin(auth.uid(), agency_id)
);

CREATE POLICY "Super admins can manage global domains"
ON public.domains FOR ALL TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- org_goal_templates RLS
ALTER TABLE public.org_goal_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view global and agency goal templates"
ON public.org_goal_templates FOR SELECT TO authenticated
USING (
  source_tier = 'global'
  OR agency_id IS NULL
  OR public.has_agency_access(auth.uid(), agency_id)
);

CREATE POLICY "Agency admins can insert goal templates"
ON public.org_goal_templates FOR INSERT TO authenticated
WITH CHECK (
  agency_id IS NOT NULL
  AND public.is_agency_admin(auth.uid(), agency_id)
);

CREATE POLICY "Agency admins can update their goal templates"
ON public.org_goal_templates FOR UPDATE TO authenticated
USING (
  agency_id IS NOT NULL
  AND public.is_agency_admin(auth.uid(), agency_id)
);

CREATE POLICY "Super admins can manage global goal templates"
ON public.org_goal_templates FOR ALL TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- ============================================================
-- Copy-on-write function for agency customization
-- ============================================================

CREATE OR REPLACE FUNCTION public.fork_curriculum_item(_item_id UUID, _agency_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_id UUID;
  original RECORD;
BEGIN
  IF NOT public.is_agency_admin(auth.uid(), _agency_id) THEN
    RAISE EXCEPTION 'Unauthorized: Only agency admins can fork items';
  END IF;

  SELECT * INTO original FROM public.curriculum_items WHERE id = _item_id;
  
  IF original IS NULL THEN
    RAISE EXCEPTION 'Item not found';
  END IF;

  INSERT INTO public.curriculum_items (
    curriculum_system_id, domain_id, level, code, title, description,
    mastery_criteria, teaching_notes, prerequisites, age_band_min, age_band_max,
    keywords, source_reference, display_order, active,
    agency_id, source_tier, forked_from_id
  ) VALUES (
    original.curriculum_system_id, original.domain_id, original.level, original.code,
    original.title, original.description, original.mastery_criteria, original.teaching_notes,
    original.prerequisites, original.age_band_min, original.age_band_max,
    original.keywords, original.source_reference, original.display_order, original.active,
    _agency_id, 'agency', _item_id
  ) RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.fork_curriculum_system(_system_id UUID, _agency_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_id UUID;
  original RECORD;
BEGIN
  IF NOT public.is_agency_admin(auth.uid(), _agency_id) THEN
    RAISE EXCEPTION 'Unauthorized: Only agency admins can fork systems';
  END IF;

  SELECT * INTO original FROM public.curriculum_systems WHERE id = _system_id;
  
  IF original IS NULL THEN
    RAISE EXCEPTION 'System not found';
  END IF;

  INSERT INTO public.curriculum_systems (
    name, type, description, publisher, version,
    age_range_min_months, age_range_max_months, tags, active,
    agency_id, source_tier, forked_from_id
  ) VALUES (
    original.name || ' (Custom)', original.type, original.description, original.publisher,
    original.version, original.age_range_min_months, original.age_range_max_months,
    original.tags, original.active,
    _agency_id, 'agency', _system_id
  ) RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;
