-- Temporarily update password for Victoria's account via admin
-- This uses a direct auth.users update with a bcrypt hash
SELECT auth.uid(); -- just a no-op; we can't reset passwords via SQL migration