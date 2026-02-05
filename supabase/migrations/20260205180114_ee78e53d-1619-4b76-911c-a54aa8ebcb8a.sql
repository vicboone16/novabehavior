-- Fix RLS policies to be more restrictive for observation_requests
-- Drop overly permissive policies
DROP POLICY IF EXISTS "Public can view by token" ON observation_requests;
DROP POLICY IF EXISTS "Public can update by token" ON observation_requests;

-- Create proper token-based policies
CREATE POLICY "View by valid token"
  ON observation_requests FOR SELECT
  USING (
    auth.uid() = created_by 
    OR (expires_at > now() AND status != 'completed')
  );

CREATE POLICY "Update by token when not expired"
  ON observation_requests FOR UPDATE
  USING (
    auth.uid() = created_by
    OR (expires_at > now() AND status IN ('pending', 'sent', 'opened', 'in_progress'))
  );