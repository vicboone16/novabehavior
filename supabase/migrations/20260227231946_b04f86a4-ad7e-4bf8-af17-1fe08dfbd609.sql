-- Seed the handshake row for NovaTrack if not present
INSERT INTO public.app_handshake (id, app_slug, environment_name, updated_at)
VALUES (1, 'novatrack', 'production', now())
ON CONFLICT (id) DO UPDATE SET app_slug = 'novatrack', updated_at = now();