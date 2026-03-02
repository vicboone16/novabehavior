
-- 1. Student app visibility: auto-populate when student is created
CREATE TABLE IF NOT EXISTS public.student_app_visibility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  app_slug text NOT NULL CHECK (app_slug IN ('novatrack','student_connect','behavior_decoded','teacher_hub')),
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, app_slug)
);

ALTER TABLE public.student_app_visibility ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view student app visibility"
  ON public.student_app_visibility FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage student app visibility"
  ON public.student_app_visibility FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin')
    )
  );

-- Auto-populate trigger: when student is created, add all 4 apps as active
CREATE OR REPLACE FUNCTION public.auto_populate_student_app_visibility()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.student_app_visibility (student_id, app_slug, is_active)
  VALUES
    (NEW.id, 'novatrack', true),
    (NEW.id, 'student_connect', true),
    (NEW.id, 'behavior_decoded', true),
    (NEW.id, 'teacher_hub', true)
  ON CONFLICT (student_id, app_slug) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_populate_student_app_visibility
  AFTER INSERT ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_populate_student_app_visibility();

-- Backfill existing students
INSERT INTO public.student_app_visibility (student_id, app_slug, is_active)
SELECT s.id, app.slug, true
FROM public.students s
CROSS JOIN (VALUES ('novatrack'), ('student_connect'), ('behavior_decoded'), ('teacher_hub')) AS app(slug)
ON CONFLICT (student_id, app_slug) DO NOTHING;

-- 2. Non-staff invite codes table
CREATE TABLE IF NOT EXISTS public.collaborator_invite_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  student_id uuid REFERENCES public.students(id) ON DELETE CASCADE,
  student_ids uuid[] DEFAULT '{}',
  recipient_type text NOT NULL CHECK (recipient_type IN ('parent','teacher','collaborator','supervisor','custom')),
  recipient_label text,
  app_access text[] NOT NULL DEFAULT '{behavior_decoded}',
  role text NOT NULL DEFAULT 'viewer',
  max_uses int NOT NULL DEFAULT 1,
  uses int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  permissions jsonb DEFAULT '{}',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.collaborator_invite_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view collaborator invite codes"
  ON public.collaborator_invite_codes FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage collaborator invite codes"
  ON public.collaborator_invite_codes FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin')
    )
  );

-- Generate code function for collaborator codes
CREATE OR REPLACE FUNCTION public.generate_collaborator_invite_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  result text;
BEGIN
  result := 'INV-' || upper(substr(md5(random()::text), 1, 4)) || '-' || upper(substr(md5(random()::text), 1, 4));
  RETURN result;
END;
$$;
