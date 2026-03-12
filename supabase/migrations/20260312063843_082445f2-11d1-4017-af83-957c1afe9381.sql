
CREATE UNIQUE INDEX IF NOT EXISTS abas_domains_domain_name_key ON public.abas_domains (domain_name);
CREATE UNIQUE INDEX IF NOT EXISTS abas_skill_areas_domain_skill_key ON public.abas_skill_areas (domain_id, skill_area_name);
