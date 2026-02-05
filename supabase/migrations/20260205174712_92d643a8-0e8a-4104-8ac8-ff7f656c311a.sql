-- Add push notification preferences to profiles (if not exists)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS push_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS push_preferences JSONB DEFAULT '{
  "session_reminders": true,
  "supervision_alerts": true,
  "questionnaire_responses": true,
  "approval_requests": true,
  "schedule_changes": true
}'::jsonb;