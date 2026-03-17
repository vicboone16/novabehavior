-- Create app_command_registry table
CREATE TABLE IF NOT EXISTS public.app_command_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_slug text NOT NULL UNIQUE,
  repo_owner text NOT NULL,
  repo_name text NOT NULL,
  allowed_commands text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_command_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only for app_command_registry"
  ON public.app_command_registry
  FOR ALL
  USING (false);

-- Add missing columns to command_tasks
ALTER TABLE public.command_tasks
  ADD COLUMN IF NOT EXISTS repo_owner text,
  ADD COLUMN IF NOT EXISTS repo_name text,
  ADD COLUMN IF NOT EXISTS github_issue_number integer,
  ADD COLUMN IF NOT EXISTS github_issue_url text,
  ADD COLUMN IF NOT EXISTS error_message text,
  ADD COLUMN IF NOT EXISTS task_file_path text;
