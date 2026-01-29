
-- Phase 1: Database Setup for Teacher Mode & Questionnaire System

-- 1. Daily Summaries table for Teacher Mode
CREATE TABLE public.daily_summaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  summary_date DATE NOT NULL DEFAULT CURRENT_DATE,
  day_rating TEXT CHECK (day_rating IN ('good', 'ok', 'hard')),
  comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, user_id, summary_date)
);

-- 2. Questionnaire Templates table
CREATE TABLE public.questionnaire_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Questionnaire Invitations table
CREATE TABLE public.questionnaire_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.questionnaire_templates(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('teacher', 'parent', 'caregiver', 'other')),
  access_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
  sent_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '30 days'),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Questionnaire Responses table
CREATE TABLE public.questionnaire_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invitation_id UUID NOT NULL REFERENCES public.questionnaire_invitations(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  responses JSONB NOT NULL DEFAULT '{}'::jsonb,
  respondent_info JSONB DEFAULT '{}'::jsonb,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  data JSONB DEFAULT '{}'::jsonb,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.daily_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questionnaire_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questionnaire_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questionnaire_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for daily_summaries
CREATE POLICY "Users can insert their own summaries"
ON public.daily_summaries FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own summaries"
ON public.daily_summaries FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can view summaries for accessible students"
ON public.daily_summaries FOR SELECT
USING (
  auth.uid() = user_id 
  OR is_student_owner(student_id, auth.uid())
  OR has_student_access(student_id, auth.uid())
  OR has_tag_based_access(auth.uid(), student_id)
  OR is_admin(auth.uid())
);

-- RLS Policies for questionnaire_templates
CREATE POLICY "Users can manage their own templates"
ON public.questionnaire_templates FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all templates"
ON public.questionnaire_templates FOR SELECT
USING (is_admin(auth.uid()));

-- RLS Policies for questionnaire_invitations
CREATE POLICY "Users can manage their own invitations"
ON public.questionnaire_invitations FOR ALL
USING (auth.uid() = created_by);

CREATE POLICY "Admins can view all invitations"
ON public.questionnaire_invitations FOR SELECT
USING (is_admin(auth.uid()));

-- RLS Policies for questionnaire_responses (special: public insert with valid token)
CREATE POLICY "Anyone can insert responses with valid token"
ON public.questionnaire_responses FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.questionnaire_invitations
    WHERE id = invitation_id
    AND status = 'pending'
    AND expires_at > now()
  )
);

CREATE POLICY "Users can view responses for their invitations"
ON public.questionnaire_responses FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.questionnaire_invitations qi
    WHERE qi.id = invitation_id
    AND qi.created_by = auth.uid()
  )
  OR is_admin(auth.uid())
);

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

-- Create updated_at triggers
CREATE TRIGGER update_daily_summaries_updated_at
BEFORE UPDATE ON public.daily_summaries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_questionnaire_templates_updated_at
BEFORE UPDATE ON public.questionnaire_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_daily_summaries_student_date ON public.daily_summaries(student_id, summary_date);
CREATE INDEX idx_questionnaire_invitations_token ON public.questionnaire_invitations(access_token);
CREATE INDEX idx_questionnaire_invitations_status ON public.questionnaire_invitations(status);
CREATE INDEX idx_notifications_user_read ON public.notifications(user_id, read);
