
-- Grant insert/update on bops_classroom_genome so the refresh function works
ALTER TABLE bops_classroom_genome ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read on bops_classroom_genome"
  ON bops_classroom_genome FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated insert on bops_classroom_genome"
  ON bops_classroom_genome FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update on bops_classroom_genome"
  ON bops_classroom_genome FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

-- Recreate function as SECURITY DEFINER so it can write
CREATE OR REPLACE FUNCTION refresh_bops_classroom_genome()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO bops_classroom_genome (
    id,
    classroom_id,
    roster_size,
    updated_at
  )
  SELECT
    gen_random_uuid(),
    r.classroom_id::text,
    count(DISTINCT r.student_id)::int,
    now()
  FROM bops_classroom_rosters r
  WHERE r.active = true
    AND r.classroom_id IS NOT NULL
  GROUP BY r.classroom_id
  ON CONFLICT (classroom_id)
  DO UPDATE SET
    roster_size = excluded.roster_size,
    updated_at = now();
END;
$$;
