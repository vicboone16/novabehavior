-- Enable realtime for students table
ALTER PUBLICATION supabase_realtime ADD TABLE public.students;

-- Enable realtime for sessions table
ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;

-- Enable realtime for session_data table
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_data;