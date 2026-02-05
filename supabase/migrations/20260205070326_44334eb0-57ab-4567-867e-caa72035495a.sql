
-- Create the bx_replacement_goals table
CREATE TABLE IF NOT EXISTS public.bx_replacement_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_code TEXT NOT NULL UNIQUE,
  goal_title TEXT NOT NULL,
  domain TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active',
  agency_id UUID REFERENCES public.agencies(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create goal-objective links table
CREATE TABLE IF NOT EXISTS public.bx_goal_objective_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID NOT NULL REFERENCES public.bx_replacement_goals(id) ON DELETE CASCADE,
  objective_id UUID NOT NULL REFERENCES public.bx_objectives(id) ON DELETE CASCADE,
  priority INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(goal_id, objective_id)
);

-- Create problem-goal links table
CREATE TABLE IF NOT EXISTS public.bx_problem_goal_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  problem_id UUID NOT NULL REFERENCES public.bx_presenting_problems(id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES public.bx_replacement_goals(id) ON DELETE CASCADE,
  priority INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(problem_id, goal_id)
);

-- Enable RLS
ALTER TABLE public.bx_replacement_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bx_goal_objective_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bx_problem_goal_links ENABLE ROW LEVEL SECURITY;

-- RLS policies for bx_replacement_goals
CREATE POLICY "Users can view replacement goals" ON public.bx_replacement_goals
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage replacement goals" ON public.bx_replacement_goals
  FOR ALL USING (public.is_admin(auth.uid()));

-- RLS policies for bx_goal_objective_links
CREATE POLICY "Users can view goal-objective links" ON public.bx_goal_objective_links
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage goal-objective links" ON public.bx_goal_objective_links
  FOR ALL USING (public.is_admin(auth.uid()));

-- RLS policies for bx_problem_goal_links
CREATE POLICY "Users can view problem-goal links" ON public.bx_problem_goal_links
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage problem-goal links" ON public.bx_problem_goal_links
  FOR ALL USING (public.is_admin(auth.uid()));

-- Insert the 5 Replacement Goals
INSERT INTO public.bx_replacement_goals (goal_code, goal_title, domain, tags) VALUES
('RG-0001', 'The student will ask for assistance when appropriate.', 'communication_help_seeking', ARRAY['help-seeking', 'clarification', 'communication']),
('RG-0002', 'The student will independently perform assignments.', 'independent_work', ARRAY['independence', 'task-completion', 'work-habits']),
('RG-0003', 'The student will demonstrate the ability to follow a routine.', 'routines_transitions', ARRAY['routine', 'schedule', 'structure']),
('RG-0004', 'The student will demonstrate appropriate behavior in an academic group setting.', 'group_work_behavior', ARRAY['small-group', 'participation', 'classroom-behavior']),
('RG-0005', 'The student will attempt new assignments and new tasks.', 'task_initiation_fear_of_failure', ARRAY['task-initiation', 'motivation', 'new-tasks'])
ON CONFLICT (goal_code) DO NOTHING;

-- Insert all missing objectives
INSERT INTO public.bx_objectives (objective_code, objective_title, operational_definition, measurement_recommendations, status) VALUES
('OBJ-0001', 'The student will determine when assistance is required in ___ out of ___ trials.', 'Student identifies situations requiring help before or during task attempts', ARRAY['trial', '___/___ trials across ___ sessions'], 'active'),
('OBJ-0002', 'The student will ask questions to obtain additional information during structured classroom activities in ___ out of ___ trials.', 'Student verbally requests clarification during teacher-led or structured activities', ARRAY['trial', '___/___ opportunities across ___ days'], 'active'),
('OBJ-0003', 'The student will ask questions to obtain additional information during everyday activities in ___ out of ___ trials.', 'Student asks clarifying questions across natural settings', ARRAY['trial', '___/___ opportunities across ___ settings'], 'active'),
('OBJ-0004', 'The student will demonstrate the ability to determine if the answer he/she received to a question is adequate with ___% accuracy.', 'Student evaluates received answers for sufficiency', ARRAY['taskCompletion', '___% across ___ probes'], 'active'),
('OBJ-0005', 'The student will demonstrate the ability to ask a question on ___ out of ___ trials.', 'Student formulates and asks relevant questions', ARRAY['trial', '___/___ trials across ___ sessions'], 'active'),
('OBJ-0006', 'The student will ask for assistance during structured classroom time ___ out of ___ trials.', 'Student requests help during academic instruction periods', ARRAY['trial', '___/___ opportunities'], 'active'),
('OBJ-0007', 'The student will ask for assistance during everyday activities on ___ out of ___ trials.', 'Student requests help during non-academic routines', ARRAY['trial', '___/___ opportunities across ___ settings'], 'active'),
('OBJ-0008', 'The student will ask for assistance only when necessary when performing tasks on ___ out of ___ trials.', 'Student discriminates when help is truly needed vs. when to work independently', ARRAY['trial', '___/___ opportunities'], 'active'),
('OBJ-0010', 'The student will attempt to perform a given assignment before asking for teacher assistance on ___ out of ___ trials.', 'Student makes independent attempt before seeking help', ARRAY['trial', '___/___ opportunities'], 'active'),
('OBJ-0011', 'The student will read necessary directions, instructions, explanations, etc., before asking for teacher assistance on ___ out of ___ trials.', 'Student reads provided instructions before requesting help', ARRAY['trial', '___/___ opportunities'], 'active'),
('OBJ-0012', 'The student will independently complete ___ out of ___ assignments per school day.', 'Student finishes assigned work without direct assistance', ARRAY['taskCompletion', '___/___ assignments per day for ___ days'], 'active'),
('OBJ-0013', 'The student will ask for teacher assistance only when necessary when performing assignments on ___ out of ___ trials.', 'Student limits help requests to genuine need situations', ARRAY['trial', '___/___ opportunities'], 'active'),
('OBJ-0014', 'The student will work for ___ minutes without requiring assistance from the teacher on ___ out of ___ trials.', 'Student sustains independent work for specified duration', ARRAY['duration', '___ minutes across ___ sessions'], 'active'),
('OBJ-0020', 'The student will follow a routine, with physical assistance, on ___ out of ___ trials.', 'Student completes routine steps with physical prompts', ARRAY['trial', '___/___ routine steps'], 'active'),
('OBJ-0021', 'The student will follow a routine, with verbal reminders, on ___ out of ___ trials.', 'Student completes routine steps with verbal cues only', ARRAY['trial', '___/___ routine steps'], 'active'),
('OBJ-0022', 'The student will independently follow a routine on ___ out of ___ trials.', 'Student completes routine without prompts', ARRAY['trial', '___/___ trials across ___ days'], 'active'),
('OBJ-0023', 'The student will rely on environmental cues to follow a routine on ___ out of ___ trials.', 'Student uses schedules, bells, clocks to transition independently', ARRAY['trial', '___/___ opportunities'], 'active'),
('OBJ-0030', 'The student will work quietly in a small academic group setting on ___ out of ___ trials.', 'Student maintains appropriate voice level during group work', ARRAY['trial', '___/___ group sessions'], 'active'),
('OBJ-0031', 'The student will raise his/her hand in a small academic group setting on ___ out of ___ trials.', 'Student uses hand-raising to participate appropriately', ARRAY['frequency', '___ instances per ___ sessions'], 'active'),
('OBJ-0032', 'The student will remain seated in a small academic group setting on ___ out of ___ trials.', 'Student stays in designated seat during group activities', ARRAY['duration', '___ minutes across ___ group activities'], 'active'),
('OBJ-0033', 'The student will verbally participate in a small academic group setting on ___ out of ___ trials.', 'Student contributes verbal responses during group work', ARRAY['frequency', '___ contributions per ___ sessions'], 'active'),
('OBJ-0034', 'The student will physically participate in a small academic group setting on ___ out of ___ trials.', 'Student engages in hands-on group activities', ARRAY['trial', '___/___ opportunities'], 'active'),
('OBJ-0035', 'The student will follow directions in a small academic group setting on ___ out of ___ trials.', 'Student complies with group activity instructions', ARRAY['trial', '___/___ opportunities'], 'active'),
('OBJ-0036', 'The student will begin working on a task in a small academic group setting on ___ out of ___ trials.', 'Student initiates work within expected timeframe', ARRAY['trial', '___/___ opportunities'], 'active'),
('OBJ-0037', 'The student will work continuously on a task in a small academic group setting on ___ out of ___ trials.', 'Student maintains on-task behavior throughout group work', ARRAY['duration', '___ minutes across ___ sessions'], 'active'),
('OBJ-0038', 'The student will complete assignments in a small academic group setting on ___ out of ___ trials.', 'Student finishes assigned group work', ARRAY['taskCompletion', '___/___ assignments across ___ sessions'], 'active'),
('OBJ-0039', 'The student will ask for assistance when necessary in a small academic group setting on ___ out of ___ trials.', 'Student appropriately requests help during group activities', ARRAY['trial', '___/___ opportunities'], 'active'),
('OBJ-0040', 'The student will work independently in a small academic group setting on ___ out of ___ trials.', 'Student completes individual portions without excessive support', ARRAY['trial', '___/___ opportunities'], 'active'),
('OBJ-0041', 'The student will talk in a quiet voice in a small academic group setting on ___ out of ___ trials.', 'Student uses indoor/quiet voice during group work', ARRAY['interval', '___% of intervals across ___ sessions'], 'active'),
('OBJ-0042', 'The student will wait his/her turn in a small academic group setting on ___ out of ___ trials.', 'Student demonstrates turn-taking without interrupting', ARRAY['trial', '___/___ opportunities'], 'active'),
('OBJ-0050', 'The student will attempt new assignments/tasks with physical assistance on ___ out of ___ trials.', 'Student engages with novel tasks when given physical prompts', ARRAY['trial', '___/___ opportunities'], 'active'),
('OBJ-0051', 'The student will attempt new assignments/tasks with verbal prompts on ___ out of ___ trials.', 'Student engages with novel tasks when given verbal encouragement', ARRAY['trial', '___/___ opportunities'], 'active'),
('OBJ-0052', 'The student will attempt new assignments/tasks with peer assistance on ___ out of ___ trials.', 'Student engages with novel tasks when supported by peers', ARRAY['trial', '___/___ opportunities'], 'active'),
('OBJ-0053', 'The student will independently attempt new assignments/tasks on ___ out of ___ trials.', 'Student initiates novel tasks without prompts', ARRAY['trial', '___/___ opportunities'], 'active'),
('OBJ-0054', 'The student will attempt new assignments/tasks within ___ (indicate a given time period).', 'Student begins novel tasks within specified latency', ARRAY['duration', 'within ___ minutes across ___ opportunities'], 'active'),
('OBJ-0055', 'The student will attempt new tasks (general) on ___ out of ___ trials.', 'Student generalizes task initiation across settings', ARRAY['trial', '___/___ opportunities across ___ settings'], 'active')
ON CONFLICT (objective_code) DO UPDATE SET
  objective_title = EXCLUDED.objective_title,
  operational_definition = EXCLUDED.operational_definition,
  measurement_recommendations = EXCLUDED.measurement_recommendations;

-- Insert all missing strategies/interventions
INSERT INTO public.bx_strategies (strategy_code, strategy_name, strategy_type, risk_level, implementation_steps, status) VALUES
('INT-0001', 'Reinforce the student for seeking assistance rather than remaining inactive: (a) give the student a tangible reward (e.g., classroom privileges, line leading, passing out materials, five minutes free time, etc.) or (b) give the student an intangible reward (e.g., praise, handshake, smile, etc.).', ARRAY['reinforcement'], 'low', ARRAY['Identify target behavior', 'Select reinforcer', 'Deliver immediately after behavior'], 'active'),
('INT-0002', 'Reinforce the student for performing assignments independently.', ARRAY['reinforcement'], 'low', ARRAY['Define independent work criteria', 'Monitor performance', 'Deliver reinforcement'], 'active'),
('INT-0003', 'Speak to the student to explain (a) what he/she is doing wrong (e.g., sitting and waiting, doing nothing, etc.) and (b) what he/she should be doing (e.g., beginning an activity, asking for assistance if necessary, etc.).', ARRAY['teaching'], 'low', ARRAY['Pull student aside privately', 'Describe current behavior', 'Model expected behavior'], 'active'),
('INT-0004', 'Establish classroom rules: Work on-task. Work quietly. Request assistance when needed. Remain in your seat. Finish task. Meet task expectations. Review rules often. Reinforce students for following the rules.', ARRAY['environmental'], 'low', ARRAY['Post rules visibly', 'Review daily', 'Reinforce compliance'], 'active'),
('INT-0005', 'Reinforce those students in the classroom who find things to do, remain active, ask for assistance, etc.', ARRAY['reinforcement'], 'low', ARRAY['Identify peer models', 'Publicly praise appropriate behavior', 'Use as teaching opportunity'], 'active'),
('INT-0006', 'Write a contract with the student specifying what behavior is expected (e.g., seeking assistance when needed, etc.) and what reinforcement will be made available when the terms of the contract have been met.', ARRAY['reinforcement'], 'low', ARRAY['Draft contract with student input', 'Define criteria clearly', 'Review and sign together'], 'active'),
('INT-0007', 'Communicate with the parents (e.g., notes home, phone calls, etc.) to share information concerning the student progress. The parents may reinforce the student at home for remaining active and seeking assistance at school.', ARRAY['teaching'], 'low', ARRAY['Establish communication method', 'Send regular updates', 'Coordinate home reinforcement'], 'active'),
('INT-0008', 'Choose a peer to model seeking assistance when appropriate for the student.', ARRAY['teaching'], 'low', ARRAY['Select appropriate peer', 'Brief peer on role', 'Monitor interactions'], 'active'),
('INT-0009', 'Encourage the student to question any directions, explanations or instructions he/she does not understand.', ARRAY['teaching'], 'low', ARRAY['Create safe environment for questions', 'Praise question-asking', 'Never criticize questions'], 'active'),
('INT-0010', 'Offer the student assistance frequently throughout the day.', ARRAY['antecedent'], 'low', ARRAY['Schedule check-ins', 'Approach student proactively', 'Model how to accept help'], 'active'),
('INT-0011', 'Make certain that directions, explanations, and instructions are delivered on the student ability level.', ARRAY['antecedent'], 'low', ARRAY['Assess student level', 'Modify language as needed', 'Check for understanding'], 'active'),
('INT-0012', 'Structure the environment so the student is not required to rely on others for information about assignments.', ARRAY['environmental'], 'low', ARRAY['Provide written instructions', 'Use visual supports', 'Ensure accessibility'], 'active'),
('INT-0013', 'Teach the student communication skills to be used in the classroom (e.g., hand-raising, expressing needs in written and/or verbal forms, etc.).', ARRAY['teaching'], 'low', ARRAY['Model communication skills', 'Practice in safe settings', 'Reinforce use'], 'active'),
('INT-0014', 'Teach the student to communicate his/her needs in an appropriate manner (e.g., raise hand, use a normal tone of voice when speaking, verbally express problems, etc.).', ARRAY['teaching'], 'low', ARRAY['Define appropriate communication', 'Role-play scenarios', 'Provide feedback'], 'active'),
('INT-0101', 'Establish classroom rules: Stay on-task. Work quietly. Request assistance when needed. Remain in your seat. Finish task. Meet task expectations. Review rules often. Reinforce students for following the rules.', ARRAY['environmental'], 'low', ARRAY['Post rules visibly', 'Review regularly', 'Reinforce compliance'], 'active'),
('INT-0102', 'Set time limits for completing assignments.', ARRAY['antecedent'], 'low', ARRAY['Determine reasonable time', 'Communicate clearly', 'Use visual timer'], 'active'),
('INT-0103', 'Reinforce the student for performing assignments independently.', ARRAY['reinforcement'], 'low', ARRAY['Define criteria', 'Monitor', 'Reinforce immediately'], 'active'),
('INT-0104', 'Provide the student with step-by-step written directions for assignments.', ARRAY['environmental'], 'low', ARRAY['Break task into steps', 'Write clearly', 'Include checkboxes'], 'active'),
('INT-0105', 'Reduce distracting stimuli (e.g., place the student in the front row, provide a carrel or quiet place away from distractions, etc.).', ARRAY['environmental'], 'low', ARRAY['Assess environment', 'Modify seating', 'Monitor effectiveness'], 'active'),
('INT-0201', 'Provide the student with a schedule of daily events which identifies the daily activities and the times at which they occur.', ARRAY['environmental'], 'low', ARRAY['Create visual schedule', 'Review at start of day', 'Reference throughout day'], 'active'),
('INT-0202', 'Maintain a consistent daily routine in the classroom.', ARRAY['environmental'], 'low', ARRAY['Establish predictable schedule', 'Minimize unexpected changes', 'Prepare for transitions'], 'active'),
('INT-0203', 'Limit the number of changes in the student established routine. As the student demonstrates success, gradually increase the number of changes in the routine.', ARRAY['antecedent'], 'low', ARRAY['Start with minimal changes', 'Introduce changes gradually', 'Reinforce flexibility'], 'active'),
('INT-0204', 'Reinforce the student for demonstrating the ability to follow a routine.', ARRAY['reinforcement'], 'low', ARRAY['Identify target steps', 'Observe performance', 'Deliver reinforcement'], 'active'),
('INT-0301', 'DO NOT FORCE the student to participate in a small academic group setting.', ARRAY['antecedent'], 'low', ARRAY['Respect student limits', 'Offer choices', 'Build gradually'], 'active'),
('INT-0302', 'Try various groupings to determine the situation in which the student is most comfortable.', ARRAY['antecedent'], 'low', ARRAY['Experiment with group sizes', 'Note preferences', 'Optimize arrangements'], 'active'),
('INT-0303', 'Review group rules/expectations at the beginning of each group activity.', ARRAY['environmental'], 'low', ARRAY['State rules clearly', 'Check for understanding', 'Post visual reminders'], 'active'),
('INT-0304', 'Allow the student to be present during small group activities without requiring active participation. As the student demonstrates success, require more involvement.', ARRAY['antecedent'], 'low', ARRAY['Start with observation only', 'Gradually increase expectations', 'Reinforce participation'], 'active'),
('INT-0305', 'Place the student with peers who will be appropriate role models and are likely to facilitate his/her academic and behavioral success.', ARRAY['environmental'], 'low', ARRAY['Identify positive peers', 'Arrange seating strategically', 'Monitor interactions'], 'active'),
('INT-0401', 'Present the task in the most interesting and attractive manner possible.', ARRAY['antecedent'], 'low', ARRAY['Identify student interests', 'Incorporate engaging elements', 'Vary presentation methods'], 'active'),
('INT-0402', 'Help the student with the first few items on a task. Gradually reduce the amount of help over time.', ARRAY['teaching'], 'low', ARRAY['Provide initial support', 'Fade prompts systematically', 'Reinforce independence'], 'active'),
('INT-0403', 'Reduce emphasis on competition (e.g., academic or social). Fear of failure may cause the student to refuse to attempt new assignments or tasks.', ARRAY['environmental'], 'low', ARRAY['Minimize competitive elements', 'Focus on personal growth', 'Celebrate effort'], 'active'),
('INT-0404', 'Have the student attempt the new assignment/task in a private place (e.g., carrel, office, quiet study area, etc.).', ARRAY['environmental'], 'low', ARRAY['Identify private space', 'Reduce audience anxiety', 'Build confidence gradually'], 'active'),
('INT-0405', 'Reinforce the student for attempting a new assignment/task.', ARRAY['reinforcement'], 'low', ARRAY['Recognize effort', 'Deliver reinforcement for attempts', 'Build confidence'], 'active')
ON CONFLICT (strategy_code) DO UPDATE SET
  strategy_name = EXCLUDED.strategy_name,
  strategy_type = EXCLUDED.strategy_type,
  implementation_steps = EXCLUDED.implementation_steps;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bx_replacement_goals_domain ON public.bx_replacement_goals(domain);
CREATE INDEX IF NOT EXISTS idx_bx_goal_objective_links_goal_id ON public.bx_goal_objective_links(goal_id);
CREATE INDEX IF NOT EXISTS idx_bx_goal_objective_links_objective_id ON public.bx_goal_objective_links(objective_id);
CREATE INDEX IF NOT EXISTS idx_bx_problem_goal_links_problem_id ON public.bx_problem_goal_links(problem_id);
CREATE INDEX IF NOT EXISTS idx_bx_problem_goal_links_goal_id ON public.bx_problem_goal_links(goal_id);
