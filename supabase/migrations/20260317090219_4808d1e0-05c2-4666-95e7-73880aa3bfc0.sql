
-- ============================================================
-- Nova AI Staging Layer + Timeline + Graph Queue
-- ============================================================

-- 1. AI Request Layer (staging for raw user input + intent)
CREATE TABLE public.nova_ai_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  client_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  intent TEXT NOT NULL DEFAULT 'general_assistant',
  intent_confidence NUMERIC DEFAULT 0,
  raw_input_text TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'chat_message',
  source_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  review_required BOOLEAN NOT NULL DEFAULT false,
  clarification_needed BOOLEAN NOT NULL DEFAULT false,
  clarification_questions JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.nova_ai_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own AI requests"
  ON public.nova_ai_requests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own AI requests"
  ON public.nova_ai_requests FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own AI requests"
  ON public.nova_ai_requests FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- 2. Parsed Item Layer (staging for extracted structured items)
CREATE TABLE public.nova_ai_parsed_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.nova_ai_requests(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  item_type TEXT NOT NULL,
  raw_text TEXT NOT NULL,
  parsed_data JSONB NOT NULL DEFAULT '{}',
  target_match JSONB,
  measurement_type TEXT,
  measurement_values JSONB,
  prompting JSONB,
  context JSONB,
  confidence NUMERIC DEFAULT 0,
  is_inferred BOOLEAN NOT NULL DEFAULT false,
  review_status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  destination_table TEXT,
  destination_record_id UUID,
  warning_codes TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.nova_ai_parsed_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view parsed items via request"
  ON public.nova_ai_parsed_items FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.nova_ai_requests r WHERE r.id = request_id AND r.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert parsed items"
  ON public.nova_ai_parsed_items FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.nova_ai_requests r WHERE r.id = request_id AND r.user_id = auth.uid()
  ));

CREATE POLICY "Users can update parsed items"
  ON public.nova_ai_parsed_items FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.nova_ai_requests r WHERE r.id = request_id AND r.user_id = auth.uid()
  ));

-- 3. Generated Note Layer (staging for AI-generated notes)
CREATE TABLE public.nova_ai_generated_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.nova_ai_requests(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  note_type TEXT NOT NULL,
  note_subtype TEXT,
  title TEXT,
  note_content JSONB NOT NULL DEFAULT '{}',
  recommended_destination TEXT,
  confidence NUMERIC DEFAULT 0,
  is_incomplete BOOLEAN NOT NULL DEFAULT false,
  missing_info TEXT[],
  status TEXT NOT NULL DEFAULT 'draft',
  posted_to_table TEXT,
  posted_record_id UUID,
  posted_at TIMESTAMPTZ,
  posted_by UUID,
  warning_codes TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.nova_ai_generated_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view generated notes via request"
  ON public.nova_ai_generated_notes FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.nova_ai_requests r WHERE r.id = request_id AND r.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert generated notes"
  ON public.nova_ai_generated_notes FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.nova_ai_requests r WHERE r.id = request_id AND r.user_id = auth.uid()
  ));

CREATE POLICY "Users can update generated notes"
  ON public.nova_ai_generated_notes FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.nova_ai_requests r WHERE r.id = request_id AND r.user_id = auth.uid()
  ));

-- 4. Client Timeline (activity feed)
CREATE TABLE public.client_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  reference_table TEXT,
  reference_id UUID,
  event_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  summary TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  source_request_id UUID REFERENCES public.nova_ai_requests(id) ON DELETE SET NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.client_timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view timeline"
  ON public.client_timeline FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert timeline"
  ON public.client_timeline FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 5. Graph Update Queue
CREATE TABLE public.graph_update_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  target_id UUID,
  graph_type TEXT NOT NULL,
  event_date DATE NOT NULL DEFAULT CURRENT_DATE,
  source_request_id UUID REFERENCES public.nova_ai_requests(id) ON DELETE SET NULL,
  processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.graph_update_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view graph queue"
  ON public.graph_update_queue FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert graph queue"
  ON public.graph_update_queue FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update graph queue"
  ON public.graph_update_queue FOR UPDATE
  TO authenticated
  USING (true);

-- Indexes for performance
CREATE INDEX idx_nova_ai_requests_user ON public.nova_ai_requests(user_id);
CREATE INDEX idx_nova_ai_requests_client ON public.nova_ai_requests(client_id);
CREATE INDEX idx_nova_ai_parsed_items_request ON public.nova_ai_parsed_items(request_id);
CREATE INDEX idx_nova_ai_parsed_items_review ON public.nova_ai_parsed_items(review_status);
CREATE INDEX idx_nova_ai_generated_notes_request ON public.nova_ai_generated_notes(request_id);
CREATE INDEX idx_client_timeline_client ON public.client_timeline(client_id, event_date DESC);
CREATE INDEX idx_graph_update_queue_unprocessed ON public.graph_update_queue(processed, created_at) WHERE NOT processed;
