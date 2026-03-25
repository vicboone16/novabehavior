-- Enable RLS on game_tracks with public read for authenticated users
ALTER TABLE public.game_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "game_tracks_read_authenticated"
ON public.game_tracks
FOR SELECT
TO authenticated
USING (true);