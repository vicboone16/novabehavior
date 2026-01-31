-- Create table to track daily TOI observation status
-- This records whether TOI was observed on a given day and the result
CREATE TABLE public.toi_daily_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('observed_none', 'not_observed')),
  -- 'observed_none' = Observed, no TOI occurred
  -- 'not_observed' = No observation taken
  -- Note: If TOI occurred, it's recorded in context_barriers_events, not here
  notes TEXT,
  created_by_user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- One log per student per day
  UNIQUE(student_id, log_date)
);

-- Enable RLS
ALTER TABLE public.toi_daily_logs ENABLE ROW LEVEL SECURITY;

-- Policies - using same pattern as context_barriers_events
CREATE POLICY "Users can view TOI daily logs"
ON public.toi_daily_logs
FOR SELECT
USING (true);

CREATE POLICY "Users can insert TOI daily logs"
ON public.toi_daily_logs
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update TOI daily logs"
ON public.toi_daily_logs
FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete TOI daily logs"
ON public.toi_daily_logs
FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Create trigger for updated_at
CREATE TRIGGER update_toi_daily_logs_updated_at
BEFORE UPDATE ON public.toi_daily_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.toi_daily_logs;