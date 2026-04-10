
-- Link behavior_session_data back to the ABC log that created it
ALTER TABLE public.behavior_session_data
ADD COLUMN IF NOT EXISTS abc_log_id UUID REFERENCES public.abc_logs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bsd_abc_log_id ON public.behavior_session_data(abc_log_id);

-- Link abc_logs to the BSD row it generated (for quick lookup from ABC side)
ALTER TABLE public.abc_logs
ADD COLUMN IF NOT EXISTS bsd_row_id UUID REFERENCES public.behavior_session_data(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_abc_logs_bsd_row_id ON public.abc_logs(bsd_row_id);
