-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create students table
CREATE TABLE public.students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  is_archived BOOLEAN NOT NULL DEFAULT false,
  behaviors JSONB DEFAULT '[]'::jsonb,
  custom_antecedents JSONB DEFAULT '[]'::jsonb,
  custom_consequences JSONB DEFAULT '[]'::jsonb,
  goals JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on students
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- Students policies - users can only access their own students
CREATE POLICY "Users can view their own students"
  ON public.students FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own students"
  ON public.students FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own students"
  ON public.students FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own students"
  ON public.students FOR DELETE
  USING (auth.uid() = user_id);

-- Create sessions table
CREATE TABLE public.sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  session_length_minutes INTEGER NOT NULL DEFAULT 30,
  interval_length_seconds INTEGER NOT NULL DEFAULT 15,
  student_ids UUID[] DEFAULT '{}'::uuid[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on sessions
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Sessions policies
CREATE POLICY "Users can view their own sessions"
  ON public.sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sessions"
  ON public.sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
  ON public.sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions"
  ON public.sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Create session_data table for behavior events
CREATE TABLE public.session_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  behavior_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  duration_seconds INTEGER,
  abc_data JSONB,
  interval_index INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on session_data
ALTER TABLE public.session_data ENABLE ROW LEVEL SECURITY;

-- Session data policies
CREATE POLICY "Users can view their own session data"
  ON public.session_data FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own session data"
  ON public.session_data FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own session data"
  ON public.session_data FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own session data"
  ON public.session_data FOR DELETE
  USING (auth.uid() = user_id);

-- Create student_files table for file metadata
CREATE TABLE public.student_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on student_files
ALTER TABLE public.student_files ENABLE ROW LEVEL SECURITY;

-- Student files policies
CREATE POLICY "Users can view their own student files"
  ON public.student_files FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own student files"
  ON public.student_files FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own student files"
  ON public.student_files FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own student files"
  ON public.student_files FOR DELETE
  USING (auth.uid() = user_id);

-- Create storage bucket for student files
INSERT INTO storage.buckets (id, name, public)
VALUES ('student-files', 'student-files', false);

-- Storage policies for student files bucket
CREATE POLICY "Users can view their own files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'student-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'student-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own files"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'student-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'student-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for auto-creating profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_students_updated_at
  BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();