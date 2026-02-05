-- Create links between problems, objectives, and strategies
-- Based on the schema recommendations

-- ===== PROBLEM-OBJECTIVE LINKS =====
-- Link BP-0001 (Help-seeking) to its objectives
INSERT INTO public.bx_problem_objective_links (problem_id, objective_id, priority)
SELECT 
  p.id,
  o.id,
  CASE o.objective_code
    WHEN 'OBJ-0001' THEN 1
    WHEN 'OBJ-0002' THEN 2
    WHEN 'OBJ-0006' THEN 3
    ELSE 10
  END
FROM public.bx_presenting_problems p, public.bx_objectives o
WHERE p.problem_code = 'BP-0001'
  AND o.objective_code IN ('OBJ-0001', 'OBJ-0002', 'OBJ-0006')
ON CONFLICT DO NOTHING;

-- Link BP-0002 (Independent work) to its objectives
INSERT INTO public.bx_problem_objective_links (problem_id, objective_id, priority)
SELECT 
  p.id,
  o.id,
  CASE o.objective_code
    WHEN 'OBJ-0010' THEN 1
    WHEN 'OBJ-0012' THEN 2
    WHEN 'OBJ-0014' THEN 3
    ELSE 10
  END
FROM public.bx_presenting_problems p, public.bx_objectives o
WHERE p.problem_code = 'BP-0002'
  AND o.objective_code IN ('OBJ-0010', 'OBJ-0012', 'OBJ-0014')
ON CONFLICT DO NOTHING;

-- Link BP-0003 (Routines) to its objectives
INSERT INTO public.bx_problem_objective_links (problem_id, objective_id, priority)
SELECT 
  p.id,
  o.id,
  CASE o.objective_code
    WHEN 'OBJ-0020' THEN 1
    WHEN 'OBJ-0022' THEN 2
    ELSE 10
  END
FROM public.bx_presenting_problems p, public.bx_objectives o
WHERE p.problem_code = 'BP-0003'
  AND o.objective_code IN ('OBJ-0020', 'OBJ-0022')
ON CONFLICT DO NOTHING;

-- Link BP-0004 (Group behavior) to its objectives
INSERT INTO public.bx_problem_objective_links (problem_id, objective_id, priority)
SELECT 
  p.id,
  o.id,
  CASE o.objective_code
    WHEN 'OBJ-0030' THEN 1
    WHEN 'OBJ-0032' THEN 2
    WHEN 'OBJ-0042' THEN 3
    ELSE 10
  END
FROM public.bx_presenting_problems p, public.bx_objectives o
WHERE p.problem_code = 'BP-0004'
  AND o.objective_code IN ('OBJ-0030', 'OBJ-0032', 'OBJ-0042')
ON CONFLICT DO NOTHING;

-- Link BP-0005 (Task initiation) to its objectives
INSERT INTO public.bx_problem_objective_links (problem_id, objective_id, priority)
SELECT 
  p.id,
  o.id,
  CASE o.objective_code
    WHEN 'OBJ-0050' THEN 1
    WHEN 'OBJ-0053' THEN 2
    ELSE 10
  END
FROM public.bx_presenting_problems p, public.bx_objectives o
WHERE p.problem_code = 'BP-0005'
  AND o.objective_code IN ('OBJ-0050', 'OBJ-0053')
ON CONFLICT DO NOTHING;

-- ===== OBJECTIVE-STRATEGY LINKS =====
-- Link help-seeking objectives to strategies
INSERT INTO public.bx_objective_strategy_links (objective_id, strategy_id, phase, priority)
SELECT 
  o.id,
  s.id,
  CASE s.strategy_code
    WHEN 'INT-0001' THEN 'reinforcement'
    WHEN 'INT-0003' THEN 'teaching'
    WHEN 'INT-0004' THEN 'prevention'
    WHEN 'INT-0008' THEN 'teaching'
    WHEN 'INT-0010' THEN 'prevention'
    ELSE 'teaching'
  END,
  CASE s.strategy_code
    WHEN 'INT-0001' THEN 1
    WHEN 'INT-0003' THEN 2
    WHEN 'INT-0004' THEN 3
    WHEN 'INT-0008' THEN 4
    WHEN 'INT-0010' THEN 5
    ELSE 10
  END
FROM public.bx_objectives o
CROSS JOIN public.bx_strategies s
WHERE o.objective_code IN ('OBJ-0001', 'OBJ-0002', 'OBJ-0006')
  AND s.strategy_code IN ('INT-0001', 'INT-0003', 'INT-0004', 'INT-0008', 'INT-0010')
ON CONFLICT DO NOTHING;

-- Link independent work objectives to strategies
INSERT INTO public.bx_objective_strategy_links (objective_id, strategy_id, phase, priority)
SELECT 
  o.id,
  s.id,
  CASE s.strategy_code
    WHEN 'INT-0102' THEN 'prevention'
    WHEN 'INT-0104' THEN 'prevention'
    WHEN 'INT-0001' THEN 'reinforcement'
    ELSE 'teaching'
  END,
  CASE s.strategy_code
    WHEN 'INT-0102' THEN 1
    WHEN 'INT-0104' THEN 2
    WHEN 'INT-0001' THEN 3
    ELSE 10
  END
FROM public.bx_objectives o
CROSS JOIN public.bx_strategies s
WHERE o.objective_code IN ('OBJ-0010', 'OBJ-0012', 'OBJ-0014')
  AND s.strategy_code IN ('INT-0102', 'INT-0104', 'INT-0001')
ON CONFLICT DO NOTHING;

-- Link routine objectives to strategies
INSERT INTO public.bx_objective_strategy_links (objective_id, strategy_id, phase, priority)
SELECT 
  o.id,
  s.id,
  CASE s.strategy_code
    WHEN 'INT-0201' THEN 'prevention'
    WHEN 'INT-0204' THEN 'reinforcement'
    ELSE 'teaching'
  END,
  CASE s.strategy_code
    WHEN 'INT-0201' THEN 1
    WHEN 'INT-0204' THEN 2
    ELSE 10
  END
FROM public.bx_objectives o
CROSS JOIN public.bx_strategies s
WHERE o.objective_code IN ('OBJ-0020', 'OBJ-0022')
  AND s.strategy_code IN ('INT-0201', 'INT-0204')
ON CONFLICT DO NOTHING;

-- Link group behavior objectives to strategies
INSERT INTO public.bx_objective_strategy_links (objective_id, strategy_id, phase, priority)
SELECT 
  o.id,
  s.id,
  CASE s.strategy_code
    WHEN 'INT-0301' THEN 'prevention'
    WHEN 'INT-0305' THEN 'prevention'
    WHEN 'INT-0001' THEN 'reinforcement'
    ELSE 'teaching'
  END,
  CASE s.strategy_code
    WHEN 'INT-0301' THEN 1
    WHEN 'INT-0305' THEN 2
    WHEN 'INT-0001' THEN 3
    ELSE 10
  END
FROM public.bx_objectives o
CROSS JOIN public.bx_strategies s
WHERE o.objective_code IN ('OBJ-0030', 'OBJ-0032', 'OBJ-0042')
  AND s.strategy_code IN ('INT-0301', 'INT-0305', 'INT-0001')
ON CONFLICT DO NOTHING;

-- Link task initiation objectives to strategies
INSERT INTO public.bx_objective_strategy_links (objective_id, strategy_id, phase, priority)
SELECT 
  o.id,
  s.id,
  CASE s.strategy_code
    WHEN 'INT-0401' THEN 'prevention'
    WHEN 'INT-0402' THEN 'teaching'
    WHEN 'INT-0403' THEN 'prevention'
    WHEN 'INT-0405' THEN 'reinforcement'
    ELSE 'teaching'
  END,
  CASE s.strategy_code
    WHEN 'INT-0401' THEN 1
    WHEN 'INT-0402' THEN 2
    WHEN 'INT-0403' THEN 3
    WHEN 'INT-0405' THEN 4
    ELSE 10
  END
FROM public.bx_objectives o
CROSS JOIN public.bx_strategies s
WHERE o.objective_code IN ('OBJ-0050', 'OBJ-0053')
  AND s.strategy_code IN ('INT-0401', 'INT-0402', 'INT-0403', 'INT-0405')
ON CONFLICT DO NOTHING;