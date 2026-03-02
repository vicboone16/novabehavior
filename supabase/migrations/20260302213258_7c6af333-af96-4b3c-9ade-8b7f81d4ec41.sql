-- Restrict publicly-readable clinical/training/library tables to authenticated users only

-- academy_modules
DROP POLICY IF EXISTS "modules_read_system_or_agency" ON public.academy_modules;
CREATE POLICY "modules_read_system_or_agency"
ON public.academy_modules
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND (
    ((scope = 'system') AND (status = 'active'))
    OR (
      (scope = 'agency')
      AND (status = 'active')
      AND (
        has_agency_admin_access(agency_id)
        OR EXISTS (
          SELECT 1
          FROM public.agency_user_roles r
          WHERE r.user_id = auth.uid()
            AND r.agency_id = academy_modules.agency_id
        )
      )
    )
  )
);

-- academy_module_versions
DROP POLICY IF EXISTS "module_versions_read" ON public.academy_module_versions;
CREATE POLICY "module_versions_read"
ON public.academy_module_versions
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.academy_modules m
    WHERE m.module_id = academy_module_versions.module_id
      AND (
        ((m.scope = 'system') AND (m.status = 'active'))
        OR (
          (m.scope = 'agency')
          AND (m.status = 'active')
          AND (
            has_agency_admin_access(m.agency_id)
            OR EXISTS (
              SELECT 1
              FROM public.agency_user_roles r
              WHERE r.user_id = auth.uid()
                AND r.agency_id = m.agency_id
            )
          )
        )
      )
  )
);

-- academy_paths
DROP POLICY IF EXISTS "paths_read" ON public.academy_paths;
CREATE POLICY "paths_read"
ON public.academy_paths
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND (
    (path_type = 'system_default')
    OR ((path_type = 'agency') AND has_agency_admin_access(agency_id))
    OR ((path_type = 'coach') AND (coach_user_id = auth.uid()))
    OR (
      (path_type = 'learner')
      AND EXISTS (
        SELECT 1
        FROM public.user_student_access usa
        WHERE usa.user_id = auth.uid()
          AND usa.student_id = academy_paths.learner_id
      )
    )
    OR is_super_admin()
  )
);

-- academy_path_modules
DROP POLICY IF EXISTS "path_modules_read" ON public.academy_path_modules;
CREATE POLICY "path_modules_read"
ON public.academy_path_modules
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.academy_paths p
    WHERE p.path_id = academy_path_modules.path_id
      AND (
        (p.path_type = 'system_default')
        OR ((p.path_type = 'agency') AND has_agency_admin_access(p.agency_id))
        OR ((p.path_type = 'coach') AND (p.coach_user_id = auth.uid()))
        OR (
          (p.path_type = 'learner')
          AND EXISTS (
            SELECT 1
            FROM public.user_student_access usa
            WHERE usa.user_id = auth.uid()
              AND usa.student_id = p.learner_id
          )
        )
        OR is_super_admin()
      )
  )
);

-- behavior_lab_games
DROP POLICY IF EXISTS "lab_games_read" ON public.behavior_lab_games;
CREATE POLICY "lab_games_read"
ON public.behavior_lab_games
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND (
    ((scope = 'system') AND (status = 'active'))
    OR (
      (scope = 'agency')
      AND (status = 'active')
      AND (
        has_agency_admin_access(agency_id)
        OR EXISTS (
          SELECT 1
          FROM public.agency_user_roles r
          WHERE r.user_id = auth.uid()
            AND r.agency_id = behavior_lab_games.agency_id
        )
      )
    )
  )
);

-- bx_* link/framework tables previously readable with USING (true)
DROP POLICY IF EXISTS "Users can view goal-objective links" ON public.bx_goal_objective_links;
CREATE POLICY "Users can view goal-objective links"
ON public.bx_goal_objective_links
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can view objective-strategy links" ON public.bx_objective_strategy_links;
CREATE POLICY "Users can view objective-strategy links"
ON public.bx_objective_strategy_links
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can view problem-goal links" ON public.bx_problem_goal_links;
CREATE POLICY "Users can view problem-goal links"
ON public.bx_problem_goal_links
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can view problem-objective links" ON public.bx_problem_objective_links;
CREATE POLICY "Users can view problem-objective links"
ON public.bx_problem_objective_links
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can view replacement goals" ON public.bx_replacement_goals;
CREATE POLICY "Users can view replacement goals"
ON public.bx_replacement_goals
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- bx content tables
DROP POLICY IF EXISTS "Users can view objectives" ON public.bx_objectives;
CREATE POLICY "Users can view objectives"
ON public.bx_objectives
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND (
    agency_id IS NULL
    OR agency_id IN (
      SELECT am.agency_id
      FROM public.agency_memberships am
      WHERE am.user_id = auth.uid()
        AND am.status = 'active'
    )
  )
);

DROP POLICY IF EXISTS "Users can view presenting problems" ON public.bx_presenting_problems;
CREATE POLICY "Users can view presenting problems"
ON public.bx_presenting_problems
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND (
    agency_id IS NULL
    OR agency_id IN (
      SELECT am.agency_id
      FROM public.agency_memberships am
      WHERE am.user_id = auth.uid()
        AND am.status = 'active'
    )
  )
);

DROP POLICY IF EXISTS "Users can view strategies" ON public.bx_strategies;
CREATE POLICY "Users can view strategies"
ON public.bx_strategies
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND (
    agency_id IS NULL
    OR agency_id IN (
      SELECT am.agency_id
      FROM public.agency_memberships am
      WHERE am.user_id = auth.uid()
        AND am.status = 'active'
    )
  )
);

-- student_iep_support_links: prevent anonymous/public read
DROP POLICY IF EXISTS "Users can view student support links" ON public.student_iep_support_links;
CREATE POLICY "Users can view student support links"
ON public.student_iep_support_links
FOR SELECT
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR public.has_student_access(student_id, auth.uid())
  OR public.has_agency_student_access(auth.uid(), student_id)
);