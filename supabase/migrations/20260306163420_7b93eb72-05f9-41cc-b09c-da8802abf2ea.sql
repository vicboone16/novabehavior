
-- ============================================================
-- Publication / Distribution Tables
-- ============================================================

-- 1) client_plan_publications: versioned snapshots of plan items published to portals
CREATE TABLE IF NOT EXISTS public.client_plan_publications (
  publication_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_item_id uuid NOT NULL REFERENCES public.client_plan_items(plan_item_id) ON DELETE CASCADE,
  client_id uuid NOT NULL,
  agency_id uuid NOT NULL REFERENCES public.agencies(id),
  published_by uuid NOT NULL,
  target_portal text NOT NULL DEFAULT 'both' CHECK (target_portal IN ('home','school','both')),
  data_collection_mode text NOT NULL DEFAULT 'fyi' CHECK (data_collection_mode IN ('fyi','optional','required')),
  version_num int NOT NULL DEFAULT 1,
  snapshot_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','superseded','retracted')),
  published_at timestamptz NOT NULL DEFAULT now(),
  retracted_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_publications_client ON public.client_plan_publications(client_id, status);
CREATE INDEX IF NOT EXISTS idx_publications_agency ON public.client_plan_publications(agency_id);

-- 2) publication_acknowledgements: parent/teacher acks
CREATE TABLE IF NOT EXISTS public.publication_acknowledgements (
  ack_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id uuid NOT NULL REFERENCES public.client_plan_publications(publication_id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  acknowledged_at timestamptz NOT NULL DEFAULT now(),
  reaction text NULL CHECK (reaction IN ('thumbs_up','thumbs_down','question','heart',null)),
  data_collection_opted_in boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(publication_id, user_id)
);

-- 3) publication_comments: threaded comments on publications
CREATE TABLE IF NOT EXISTS public.publication_comments (
  comment_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id uuid NOT NULL REFERENCES public.client_plan_publications(publication_id) ON DELETE CASCADE,
  parent_comment_id uuid NULL REFERENCES public.publication_comments(comment_id),
  user_id uuid NOT NULL,
  body text NOT NULL,
  is_clinical_note boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pub_comments_pub ON public.publication_comments(publication_id);

-- ============================================================
-- RLS for publication tables
-- ============================================================

ALTER TABLE public.client_plan_publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publication_acknowledgements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publication_comments ENABLE ROW LEVEL SECURITY;

-- Publications: agency members can view; publishers can insert/update
CREATE POLICY "Agency members can view publications"
  ON public.client_plan_publications FOR SELECT TO authenticated
  USING (public.is_same_agency_user(agency_id));

CREATE POLICY "Authenticated users can insert publications"
  ON public.client_plan_publications FOR INSERT TO authenticated
  WITH CHECK (published_by = auth.uid());

CREATE POLICY "Publishers can update own publications"
  ON public.client_plan_publications FOR UPDATE TO authenticated
  USING (published_by = auth.uid());

-- Acknowledgements: users can ack their own
CREATE POLICY "Users can view own acks"
  ON public.publication_acknowledgements FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own acks"
  ON public.publication_acknowledgements FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Also allow publication publisher to see all acks for their publications
CREATE POLICY "Publishers can view acks on their publications"
  ON public.publication_acknowledgements FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.client_plan_publications p
    WHERE p.publication_id = publication_acknowledgements.publication_id
    AND p.published_by = auth.uid()
  ));

-- Comments: agency members can view; authenticated can insert own
CREATE POLICY "Agency members can view comments"
  ON public.publication_comments FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.client_plan_publications p
    WHERE p.publication_id = publication_comments.publication_id
    AND public.is_same_agency_user(p.agency_id)
  ));

CREATE POLICY "Users can insert own comments"
  ON public.publication_comments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own comments"
  ON public.publication_comments FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- View: active publications with ack counts
-- ============================================================
CREATE OR REPLACE VIEW public.v_plan_publications_feed AS
SELECT
  p.publication_id,
  p.plan_item_id,
  p.client_id,
  p.agency_id,
  p.published_by,
  p.target_portal,
  p.data_collection_mode,
  p.version_num,
  p.status,
  p.published_at,
  p.snapshot_json,
  c.full_name AS client_name,
  pi.title AS plan_item_title,
  (SELECT count(*) FROM public.publication_acknowledgements a WHERE a.publication_id = p.publication_id) AS ack_count,
  (SELECT count(*) FROM public.publication_comments cm WHERE cm.publication_id = p.publication_id) AS comment_count
FROM public.client_plan_publications p
JOIN public.clients c ON c.client_id = p.client_id
JOIN public.client_plan_items pi ON pi.plan_item_id = p.plan_item_id
WHERE p.status = 'active';
