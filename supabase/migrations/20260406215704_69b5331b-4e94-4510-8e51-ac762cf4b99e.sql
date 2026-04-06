-- Fix stale start_time values that were set during bulk import
-- and don't match the actual observation date (started_at)
UPDATE public.sessions
SET start_time = started_at
WHERE start_time IS NOT NULL
  AND started_at IS NOT NULL
  AND start_time::date != started_at::date;