
-- Add remaining shared fields to iep_drafts if not present
ALTER TABLE public.iep_drafts ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES public.agencies(id);
ALTER TABLE public.iep_drafts ADD COLUMN IF NOT EXISTS draft_type text;
ALTER TABLE public.iep_drafts ADD COLUMN IF NOT EXISTS content text;
ALTER TABLE public.iep_drafts ADD COLUMN IF NOT EXISTS content_json jsonb;
