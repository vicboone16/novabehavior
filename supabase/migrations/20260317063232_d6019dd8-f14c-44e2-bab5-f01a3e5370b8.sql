
ALTER TABLE public.app_command_registry ADD COLUMN IF NOT EXISTS default_branch text NOT NULL DEFAULT 'main';
ALTER TABLE public.app_command_registry ADD COLUMN IF NOT EXISTS project_label text;
