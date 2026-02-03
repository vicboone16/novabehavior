
-- Create bx_behavior_checklist_item table for Behavior Checklist feature
CREATE TABLE IF NOT EXISTS public.bx_behavior_checklist_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  checklist_item_id TEXT NOT NULL UNIQUE,
  checklist_id TEXT NOT NULL DEFAULT 'bim-checklist-v1',
  behavior_number INTEGER NOT NULL,
  label TEXT NOT NULL,
  domain TEXT NOT NULL,
  topics TEXT[] DEFAULT '{}',
  linked_problem_id TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_bx_checklist_domain ON public.bx_behavior_checklist_items(domain);
CREATE INDEX IF NOT EXISTS idx_bx_checklist_linked_problem ON public.bx_behavior_checklist_items(linked_problem_id);
CREATE INDEX IF NOT EXISTS idx_bx_checklist_behavior_number ON public.bx_behavior_checklist_items(behavior_number);

-- Enable RLS
ALTER TABLE public.bx_behavior_checklist_items ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read checklist items
CREATE POLICY "Authenticated users can read checklist items" 
ON public.bx_behavior_checklist_items 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Create trigger for updated_at
CREATE TRIGGER update_bx_checklist_items_updated_at
BEFORE UPDATE ON public.bx_behavior_checklist_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
