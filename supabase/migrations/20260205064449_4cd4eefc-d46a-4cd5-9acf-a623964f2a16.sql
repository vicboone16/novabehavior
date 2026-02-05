-- Seed Data for Behavior Intervention Planner
-- Based on schema v1.0.0

-- ===== BEHAVIOR PROBLEMS (5 items) =====
INSERT INTO public.bx_presenting_problems (
  problem_code, domain, title, definition, examples, risk_level, 
  function_tags, trigger_tags, topics, status, source_origin
) VALUES
(
  'BP-0001', 
  'communication_help_seeking',
  'Has difficulty asking for assistance or clarification, when necessary, after receiving directions and/or attempting work independently',
  'Student does not initiate requests for help when struggling with tasks, instead remaining passive or inactive.',
  ARRAY['doesn''t ask for help', 'won''t ask questions', 'needs clarification', 'sits and waits', 'does nothing after directions'],
  'low',
  ARRAY['escape']::text[],
  ARRAY['unclear directions', 'difficult tasks', 'fear of judgment']::text[],
  ARRAY['help-seeking', 'clarification', 'questions', 'communication', 'independent-work-support']::text[],
  'active',
  'book'
),
(
  'BP-0002',
  'independent_work',
  'Fails to perform tasks or assignments independently',
  'Student requires constant assistance and cannot complete assigned work without adult support.',
  ARRAY['won''t work alone', 'needs constant help', 'dependent on teacher', 'doesn''t complete independently'],
  'low',
  ARRAY['escape', 'attention']::text[],
  ARRAY['task demand', 'novel assignments', 'difficult material']::text[],
  ARRAY['independence', 'task-completion', 'help-seeking', 'on-task', 'work-habits']::text[],
  'active',
  'book'
),
(
  'BP-0003',
  'routines_transitions',
  'Does not demonstrate the ability to follow a routine',
  'Student has difficulty following the established daily schedule and transitions between activities.',
  ARRAY['can''t follow schedule', 'off routine', 'doesn''t follow classroom routine', 'needs reminders for routine'],
  'medium',
  ARRAY['escape']::text[],
  ARRAY['schedule changes', 'unexpected transitions', 'novel routines']::text[],
  ARRAY['routine', 'schedule', 'structure', 'transitions', 'executive-functioning']::text[],
  'active',
  'book'
),
(
  'BP-0004',
  'group_work_behavior',
  'Does not demonstrate appropriate behavior in an academic group setting',
  'Student engages in disruptive or inappropriate behaviors during small group instruction or cooperative learning activities.',
  ARRAY['disrupts small group', 'can''t do group work', 'inappropriate in group', 'won''t participate in group'],
  'medium',
  ARRAY['attention', 'escape']::text[],
  ARRAY['group activities', 'peer interaction', 'shared attention demands']::text[],
  ARRAY['small-group', 'classroom-behavior', 'participation', 'turn-taking', 'voice-level']::text[],
  'active',
  'book'
),
(
  'BP-0005',
  'task_initiation_fear_of_failure',
  'Is reluctant to attempt new assignments or tasks',
  'Student avoids or refuses to begin unfamiliar or challenging work, often due to fear of failure.',
  ARRAY['refuses new work', 'won''t try new tasks', 'avoidant with assignments', 'fear of failure'],
  'low',
  ARRAY['escape']::text[],
  ARRAY['new tasks', 'unfamiliar content', 'challenging work', 'evaluation']::text[],
  ARRAY['task-initiation', 'avoidance', 'fear-of-failure', 'motivation', 'new-tasks']::text[],
  'active',
  'book'
)
ON CONFLICT (problem_code) DO NOTHING;

-- ===== OBJECTIVES (Sample selection linked to goals) =====
INSERT INTO public.bx_objectives (
  objective_code, objective_title, operational_definition, mastery_criteria,
  measurement_recommendations, replacement_skill_tags, status
) VALUES
-- Communication/Help-Seeking Objectives
(
  'OBJ-0001',
  'The student will determine when assistance is required in ___ out of ___ trials.',
  'Student independently identifies situations requiring help and discriminates between tasks they can complete alone vs. with support.',
  '4/5 trials across 3 sessions',
  ARRAY['trial']::text[],
  ARRAY['help-seeking', 'self-monitoring', 'discrimination']::text[],
  'active'
),
(
  'OBJ-0002',
  'The student will ask questions to obtain additional information during structured classroom activities in ___ out of ___ trials.',
  'Student raises hand or uses appropriate signal to ask clarifying questions during direct instruction or guided practice.',
  '4/5 opportunities across 5 days',
  ARRAY['trial', 'frequency']::text[],
  ARRAY['questions', 'classroom', 'clarification']::text[],
  'active'
),
(
  'OBJ-0006',
  'The student will ask for assistance during structured classroom time ___ out of ___ trials.',
  'Student appropriately requests help from teacher or aide during academic instruction.',
  '4/5 opportunities',
  ARRAY['trial']::text[],
  ARRAY['help-seeking', 'classroom']::text[],
  'active'
),
-- Independent Work Objectives
(
  'OBJ-0010',
  'The student will attempt to perform a given assignment before asking for teacher assistance on ___ out of ___ trials.',
  'Student makes at least one attempt at the task before requesting help.',
  '4/5 opportunities',
  ARRAY['trial']::text[],
  ARRAY['independence', 'task-initiation', 'help-seeking']::text[],
  'active'
),
(
  'OBJ-0012',
  'The student will independently complete ___ out of ___ assignments per school day.',
  'Student completes assigned work without direct adult assistance.',
  '4/5 assignments per day for 5 days',
  ARRAY['taskCompletion']::text[],
  ARRAY['task-completion', 'school-day', 'independence']::text[],
  'active'
),
(
  'OBJ-0014',
  'The student will work for ___ minutes without requiring assistance from the teacher on ___ out of ___ trials.',
  'Student engages in independent work for specified duration.',
  '10 minutes across 5 sessions',
  ARRAY['duration']::text[],
  ARRAY['sustained-work', 'duration', 'independence']::text[],
  'active'
),
-- Routine/Transition Objectives
(
  'OBJ-0020',
  'The student will follow a routine, with physical assistance, on ___ out of ___ trials.',
  'Student completes routine steps with physical prompting.',
  '4/5 routine steps',
  ARRAY['trial']::text[],
  ARRAY['routine', 'prompting', 'physical-assistance']::text[],
  'active'
),
(
  'OBJ-0022',
  'The student will independently follow a routine on ___ out of ___ trials.',
  'Student completes all steps of routine without prompting.',
  '4/5 trials across 5 days',
  ARRAY['trial']::text[],
  ARRAY['routine', 'independence']::text[],
  'active'
),
-- Group Work Objectives
(
  'OBJ-0030',
  'The student will work quietly in a small academic group setting on ___ out of ___ trials.',
  'Student uses appropriate voice level during group activities.',
  '4/5 group sessions',
  ARRAY['trial', 'interval']::text[],
  ARRAY['small-group', 'voice-level', 'on-task']::text[],
  'active'
),
(
  'OBJ-0032',
  'The student will remain seated in a small academic group setting on ___ out of ___ trials.',
  'Student stays in assigned seat during group instruction.',
  '15 minutes across 5 group activities',
  ARRAY['duration']::text[],
  ARRAY['seated', 'group', 'behavior']::text[],
  'active'
),
(
  'OBJ-0042',
  'The student will wait his/her turn in a small academic group setting on ___ out of ___ trials.',
  'Student waits appropriately without interrupting during turn-taking activities.',
  '4/5 opportunities',
  ARRAY['trial']::text[],
  ARRAY['turn-taking', 'group', 'social-skills']::text[],
  'active'
),
-- Task Initiation Objectives
(
  'OBJ-0050',
  'The student will attempt new assignments/tasks with physical assistance on ___ out of ___ trials.',
  'Student begins new tasks when provided physical prompting.',
  '4/5 opportunities',
  ARRAY['trial']::text[],
  ARRAY['new-tasks', 'prompting', 'task-initiation']::text[],
  'active'
),
(
  'OBJ-0053',
  'The student will independently attempt new assignments/tasks on ___ out of ___ trials.',
  'Student begins new tasks without prompting.',
  '4/5 opportunities',
  ARRAY['trial']::text[],
  ARRAY['new-tasks', 'independence', 'task-initiation']::text[],
  'active'
)
ON CONFLICT (objective_code) DO NOTHING;

-- ===== STRATEGIES/INTERVENTIONS =====
INSERT INTO public.bx_strategies (
  strategy_code, strategy_name, strategy_type, risk_level, requires_bcba,
  staff_script, implementation_steps, contraindications, status
) VALUES
(
  'INT-0001',
  'Reinforce help-seeking behavior',
  ARRAY['reinforcement']::text[],
  'low',
  false,
  'When the student asks for help appropriately, provide immediate positive reinforcement: "Great job asking for help! That''s exactly what I want you to do when you need support."',
  ARRAY['Identify target help-seeking behavior', 'Determine reinforcer', 'Deliver reinforcement immediately after behavior', 'Track frequency of help-seeking']::text[],
  ARRAY[]::text[],
  'active'
),
(
  'INT-0003',
  'Provide explicit feedback on expectations',
  ARRAY['teaching']::text[],
  'low',
  false,
  'Speak privately with the student: "I noticed you were sitting and waiting. When you''re unsure what to do, you can raise your hand and ask."',
  ARRAY['Pull student aside privately', 'Describe observed behavior', 'State expected behavior clearly', 'Practice if needed']::text[],
  ARRAY[]::text[],
  'active'
),
(
  'INT-0004',
  'Establish classroom rules for help-seeking',
  ARRAY['environmental']::text[],
  'low',
  false,
  'Post and review classroom rules: Work on-task. Work quietly. Request assistance when needed. Remain in your seat.',
  ARRAY['Create visual rules chart', 'Review rules daily', 'Reinforce students following rules', 'Provide consistent reminders']::text[],
  ARRAY[]::text[],
  'active'
),
(
  'INT-0008',
  'Peer model for help-seeking',
  ARRAY['teaching']::text[],
  'low',
  false,
  'Choose a peer who demonstrates appropriate help-seeking to model the behavior for the student.',
  ARRAY['Identify appropriate peer model', 'Arrange for student to observe peer', 'Debrief observation with student', 'Practice modeled behavior']::text[],
  ARRAY[]::text[],
  'active'
),
(
  'INT-0010',
  'Proactive assistance offers',
  ARRAY['antecedent']::text[],
  'low',
  false,
  'Proactively check in with the student: "How are you doing? Do you need any help with this part?"',
  ARRAY['Schedule regular check-ins', 'Use non-intrusive approach', 'Gradually fade frequency as independence increases']::text[],
  ARRAY[]::text[],
  'active'
),
(
  'INT-0102',
  'Set time limits for assignments',
  ARRAY['antecedent']::text[],
  'low',
  false,
  'Set clear time expectations: "You have 15 minutes to complete this task. Let me know if you need help."',
  ARRAY['Determine appropriate time limit', 'Communicate expectation clearly', 'Provide visual timer if helpful', 'Check in before time expires']::text[],
  ARRAY[]::text[],
  'active'
),
(
  'INT-0104',
  'Provide step-by-step written directions',
  ARRAY['environmental']::text[],
  'low',
  false,
  'Provide the student with written task steps they can reference independently.',
  ARRAY['Break task into clear steps', 'Write/print directions', 'Review steps with student', 'Allow student to check off completed steps']::text[],
  ARRAY[]::text[],
  'active'
),
(
  'INT-0201',
  'Visual daily schedule',
  ARRAY['environmental']::text[],
  'low',
  false,
  'Provide the student with a visual schedule showing daily activities and times.',
  ARRAY['Create personalized schedule', 'Review schedule at start of day', 'Reference schedule during transitions', 'Update as needed']::text[],
  ARRAY[]::text[],
  'active'
),
(
  'INT-0204',
  'Reinforce routine following',
  ARRAY['reinforcement']::text[],
  'low',
  false,
  'Provide positive reinforcement when student follows routine: "You did all the steps of our morning routine without any reminders. That''s excellent!"',
  ARRAY['Identify target routine', 'Select reinforcer', 'Deliver reinforcement for compliance', 'Gradually thin schedule']::text[],
  ARRAY[]::text[],
  'active'
),
(
  'INT-0301',
  'DO NOT FORCE group participation',
  ARRAY['antecedent']::text[],
  'low',
  false,
  'Allow student to be present without requiring active participation initially.',
  ARRAY['Allow observation first', 'Gradually increase expectations', 'Reinforce any participation attempts']::text[],
  ARRAY['forcedParticipation']::text[],
  'active'
),
(
  'INT-0305',
  'Strategic peer grouping',
  ARRAY['environmental']::text[],
  'low',
  false,
  'Place student with peers who will be appropriate role models.',
  ARRAY['Identify supportive peers', 'Arrange seating/grouping', 'Monitor group dynamics', 'Adjust as needed']::text[],
  ARRAY[]::text[],
  'active'
),
(
  'INT-0401',
  'Present tasks in engaging manner',
  ARRAY['antecedent']::text[],
  'low',
  false,
  'Present new tasks in the most interesting and attractive manner possible.',
  ARRAY['Identify student interests', 'Connect task to interests', 'Use engaging materials', 'Start with easier components']::text[],
  ARRAY[]::text[],
  'active'
),
(
  'INT-0402',
  'Graduated task support',
  ARRAY['teaching']::text[],
  'low',
  false,
  'Help student with first few items, then gradually reduce assistance.',
  ARRAY['Provide full support initially', 'Complete first items together', 'Gradually fade prompts', 'Reinforce independent attempts']::text[],
  ARRAY[]::text[],
  'active'
),
(
  'INT-0403',
  'Reduce competition emphasis',
  ARRAY['environmental']::text[],
  'low',
  false,
  'Minimize competitive elements that may trigger fear of failure.',
  ARRAY['Remove public comparison', 'Focus on individual growth', 'Use mastery-based grading', 'Celebrate effort and progress']::text[],
  ARRAY[]::text[],
  'active'
),
(
  'INT-0405',
  'Reinforce task attempts',
  ARRAY['reinforcement']::text[],
  'low',
  false,
  'Reinforce the student for attempting new tasks: "I love that you tried that! It doesn''t matter if it''s perfect - trying is what counts."',
  ARRAY['Define what counts as attempt', 'Provide immediate reinforcement', 'Use descriptive praise', 'Track attempts']::text[],
  ARRAY[]::text[],
  'active'
)
ON CONFLICT (strategy_code) DO NOTHING;