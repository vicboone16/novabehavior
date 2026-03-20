-- Enable RLS on intake form tables and add permissive policies for authenticated users
ALTER TABLE public.form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_template_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_template_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_delivery_links ENABLE ROW LEVEL SECURITY;

-- form_templates: readable by all authenticated users
CREATE POLICY "Authenticated can read form_templates"
  ON public.form_templates FOR SELECT TO authenticated USING (true);

-- form_template_sections: readable by all authenticated users  
CREATE POLICY "Authenticated can read form_template_sections"
  ON public.form_template_sections FOR SELECT TO authenticated USING (true);

-- form_template_fields: readable by all authenticated users
CREATE POLICY "Authenticated can read form_template_fields"
  ON public.form_template_fields FOR SELECT TO authenticated USING (true);

-- form_instances: users can read instances they created, are assigned to, or own
CREATE POLICY "Users can read form_instances"
  ON public.form_instances FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR assigned_to = auth.uid()
    OR owner_user_id = auth.uid()
    OR assigned_by = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "Users can insert form_instances"
  ON public.form_instances FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update form_instances"
  ON public.form_instances FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR assigned_to = auth.uid()
    OR owner_user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );

-- form_answers: follow instance access
CREATE POLICY "Users can read form_answers"
  ON public.form_answers FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert form_answers"
  ON public.form_answers FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can update form_answers"
  ON public.form_answers FOR UPDATE TO authenticated USING (true);

-- form_signatures: follow instance access
CREATE POLICY "Users can read form_signatures"
  ON public.form_signatures FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert form_signatures"
  ON public.form_signatures FOR INSERT TO authenticated WITH CHECK (true);

-- form_delivery_links: public read for token-based access + authenticated management
CREATE POLICY "Public can read delivery_links by token"
  ON public.form_delivery_links FOR SELECT USING (true);

CREATE POLICY "Public can update delivery_links"
  ON public.form_delivery_links FOR UPDATE USING (true);

CREATE POLICY "Authenticated can insert delivery_links"
  ON public.form_delivery_links FOR INSERT TO authenticated WITH CHECK (true);