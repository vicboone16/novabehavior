
-- ============================================================
-- PHASE 2: Expand behavior_function_bip_strategy_map (currently only 4 rows)
-- Add all missing function×phase combos
-- ============================================================

INSERT INTO behavior_function_bip_strategy_map (behavior_function, strategy_phase, strategy_code, strategy_title, strategy_description, replacement_category, response_class, setting_tags, priority, is_active) VALUES

-- ATTENTION × all phases
('attention', 'consequence', 'ATT-CONSEQ-PLANNED-IGNORE', 'Planned Ignoring with Differential Attention',
 $$Withhold social attention following attention-maintained problem behavior while providing immediate, enthusiastic attention contingent on appropriate behavior or communication.$$,
 'communication', 'proactive', '{classroom,recess}', 2, true),
('attention', 'teaching', 'ATT-TEACH-APPROP-ATTENTION', 'Teach Appropriate Attention-Seeking',
 $$Directly teach the student functionally equivalent ways to gain adult or peer attention such as raising hand, approaching calmly, or using a signal system.$$,
 'communication', 'instructional', '{classroom,resource_room}', 3, true),
('attention', 'safety', 'ATT-SAFETY-REDIRECT', 'Redirect with Minimal Attention',
 $$During unsafe attention-maintained behavior, provide only the minimum attention necessary for safety while redirecting to a safe alternative, then reinforce calm behavior.$$,
 'regulation', 'reactive', '{classroom,recess}', 4, true),

-- ESCAPE × consequence, teaching, safety
('escape', 'consequence', 'ESC-CONSEQ-DEMAND-MAINTAIN', 'Maintain Demand with Graduated Support',
 $$Following escape-maintained problem behavior, do not remove the task demand. Instead, provide graduated support to help the student complete a reduced version of the task before accessing a break.$$,
 'compliance', 'proactive', '{classroom,resource_room}', 2, true),
('escape', 'teaching', 'ESC-TEACH-BREAK-REQUEST', 'Teach Break Requesting',
 $$Teach the student a specific, low-effort communication response to request a break from aversive tasks, then honor the request initially and systematically build tolerance.$$,
 'communication', 'instructional', '{classroom,resource_room}', 3, true),
('escape', 'safety', 'ESC-SAFETY-REDUCE-DEMAND', 'Temporary Demand Reduction for Safety',
 $$When escape-maintained behavior escalates to unsafe levels, temporarily reduce demands to the minimum necessary for safety while maintaining physical proximity and calm presence.$$,
 'regulation', 'reactive', '{classroom,resource_room}', 4, true),

-- TANGIBLE × antecedent, consequence, safety
('tangible', 'antecedent', 'TAN-ANTE-SCHEDULE-ACCESS', 'Scheduled Access to Preferred Items',
 $$Provide scheduled, non-contingent access to preferred items or activities at regular intervals throughout the day to reduce the establishing operation for tangible-maintained behavior.$$,
 'regulation', 'proactive', '{classroom,resource_room,home}', 1, true),
('tangible', 'consequence', 'TAN-CONSEQ-DELAY-TRAIN', 'Delay Tolerance Training',
 $$Following tangible-maintained problem behavior, do not provide immediate access to the item. Reinforce appropriate waiting and gradually increase delay tolerance over time.$$,
 'tolerance', 'proactive', '{classroom,resource_room}', 2, true),
('tangible', 'safety', 'TAN-SAFETY-REDIRECT-ALT', 'Redirect to Alternative Preferred Item',
 $$During unsafe tangible-maintained behavior, redirect the student to an alternative preferred item or activity while maintaining safety, then process the original request when calm.$$,
 'regulation', 'reactive', '{classroom}', 4, true),

-- AUTOMATIC × antecedent, consequence, safety
('automatic', 'antecedent', 'AUTO-ANTE-SENSORY-DIET', 'Proactive Sensory Diet',
 $$Implement a scheduled sensory diet that provides the student with appropriate sensory input at regular intervals to reduce the likelihood of automatically-maintained behavior.$$,
 'regulation', 'proactive', '{classroom,resource_room}', 1, true),
('automatic', 'consequence', 'AUTO-CONSEQ-COMPETE-RESPONSE', 'Competing Response Training',
 $$Teach and reinforce a physically incompatible or competing response that provides similar sensory input in a more socially acceptable form.$$,
 'regulation', 'instructional', '{classroom,resource_room}', 2, true),
('automatic', 'safety', 'AUTO-SAFETY-PROTECTIVE', 'Protective Equipment or Response Blocking',
 $$When automatically-maintained behavior poses safety risk, use approved protective equipment or brief, non-aversive response blocking while redirecting to safe alternatives.$$,
 'safety', 'reactive', '{classroom,resource_room}', 4, true)

ON CONFLICT DO NOTHING;
