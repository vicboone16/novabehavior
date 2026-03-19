
-- ============================================================
-- PHASE 3: Expand behavior_topography_strategy_map
-- Fill missing topography×function×phase combos
-- ============================================================

INSERT INTO behavior_topography_strategy_map (behavior_function, behavior_topography, strategy_phase, strategy_code, strategy_title, strategy_description, setting_tags, replacement_category, response_class, priority, is_active) VALUES

-- Escape × elopement (consequence, safety)
('escape', 'elopement', 'consequence', 'ELOP-ESC-CONSEQ', 'Return-to-Task Expectation After Elopement',
 $$After safely recovering the student, calmly guide them back to the original demand. Provide minimal verbal engagement during return. Reinforce re-engagement with the task.$$,
 '{classroom,hallway}', 'compliance', 'proactive', 3, true),
('escape', 'elopement', 'safety', 'ELOP-ESC-SAFETY', 'Elopement Safety Response Protocol',
 $$Activate the building elopement protocol including visual monitoring, door security, and calm pursuit. Maintain visual contact without chasing. Use practiced recovery techniques.$$,
 '{classroom,hallway,playground}', 'safety', 'reactive', 5, true),

-- Escape × task_refusal (consequence, safety)
('escape', 'task_refusal', 'consequence', 'TREF-ESC-CONSEQ', 'Graduated Compliance Following Task Refusal',
 $$Following task refusal, reduce the initial demand to a minimal version the student can complete, then gradually rebuild the full demand. Reinforce each increment of compliance.$$,
 '{classroom,resource_room}', 'compliance', 'proactive', 3, true),

-- Escape × aggression (antecedent, consequence)
('escape', 'aggression', 'antecedent', 'AGG-ESC-ANTE', 'Demand Assessment and Modification',
 $$Evaluate current demand levels for difficulty, duration, and novelty. Modify demands to match the student''s current skill level and tolerance while maintaining instructional expectations.$$,
 '{classroom,resource_room}', 'compliance', 'proactive', 1, true),
('escape', 'aggression', 'consequence', 'AGG-ESC-CONSEQ', 'Post-Aggression Demand Maintenance',
 $$After ensuring safety, maintain the original demand expectation in a reduced form. Do not fully remove the demand. Provide maximum support for task completion, then reinforce.$$,
 '{classroom}', 'compliance', 'proactive', 3, true),

-- Attention × aggression (antecedent, consequence)
('attention', 'aggression', 'antecedent', 'AGG-ATT-ANTE', 'Proactive Attention Schedule',
 $$Provide scheduled, non-contingent adult attention at regular intervals (e.g., every 5 minutes) to reduce the establishing operation for attention-maintained aggression.$$,
 '{classroom,recess}', 'communication', 'proactive', 1, true),
('attention', 'aggression', 'consequence', 'AGG-ATT-CONSEQ', 'Minimal Attention Response to Aggression',
 $$Provide only safety-necessary attention during aggressive episodes. Avoid extended verbal processing, lectures, or emotional reactions. Deliver rich attention contingent on calm behavior.$$,
 '{classroom}', 'communication', 'proactive', 3, true),

-- Tangible × aggression (antecedent, consequence, safety)
('tangible', 'aggression', 'antecedent', 'AGG-TAN-ANTE', 'Scheduled Access and Turn-Taking Practice',
 $$Provide scheduled access to high-preference items and teach structured turn-taking routines during calm periods to reduce the likelihood of tangible-maintained aggression.$$,
 '{classroom,recess}', 'tolerance', 'proactive', 1, true),
('tangible', 'aggression', 'consequence', 'AGG-TAN-CONSEQ', 'Withhold Item Access Following Aggression',
 $$Do not provide access to the requested item immediately following aggression. Wait for a period of calm behavior, then provide an opportunity to request appropriately.$$,
 '{classroom}', 'tolerance', 'proactive', 3, true),
('tangible', 'aggression', 'safety', 'AGG-TAN-SAFETY', 'Safety Protocol for Tangible-Maintained Aggression',
 $$Secure the contested item. Create physical distance. Use calm, low verbal engagement. Provide alternative item access only after safety is restored and the student is regulated.$$,
 '{classroom,recess}', 'safety', 'reactive', 5, true),

-- Attention × disruption (antecedent)
('attention', 'disruption', 'antecedent', 'DISR-ATT-ANTE', 'Proactive Attention and Role Assignment',
 $$Assign the student a visible, valued classroom role or job that provides regular positive attention. Pair with frequent specific praise for on-task behavior throughout the day.$$,
 '{classroom}', 'communication', 'proactive', 1, true),

-- Escape × noncompliance (consequence, safety)
('escape', 'noncompliance', 'consequence', 'NONC-ESC-CONSEQ', 'Three-Prompt Compliance Protocol',
 $$Deliver the directive, wait 5-10 seconds, restate with a prompt, wait again, then provide full physical or gestural support to complete the task. Reinforce compliance at any step.$$,
 '{classroom,resource_room}', 'compliance', 'proactive', 3, true),

-- Automatic × dysregulation (consequence, safety)
('automatic', 'dysregulation', 'consequence', 'DYSREG-AUTO-CONSEQ', 'Co-Regulation and Gradual Re-Entry',
 $$During dysregulation recovery, provide co-regulation support (calm voice, reduced stimulation, regulation tools) before gradually re-introducing environmental demands.$$,
 '{classroom,resource_room}', 'regulation', 'reactive', 3, true),
('automatic', 'dysregulation', 'safety', 'DYSREG-AUTO-SAFETY', 'Dysregulation Safety Protocol',
 $$Clear the immediate area of peers and hazards. Maintain a calm, non-threatening presence at a safe distance. Provide access to regulation tools. Do not restrain unless imminent danger.$$,
 '{classroom}', 'safety', 'reactive', 5, true),

-- Tangible × verbal_aggression (antecedent)
('tangible', 'verbal_aggression', 'antecedent', 'VAGG-TAN-ANTE', 'Visual Access Schedule and Request Training',
 $$Post a visual schedule showing when preferred items/activities are available. Pre-teach appropriate requesting phrases. Provide choices within available options.$$,
 '{classroom,resource_room}', 'communication', 'proactive', 1, true),

-- Escape × verbal_aggression (antecedent, safety)
('escape', 'verbal_aggression', 'antecedent', 'VAGG-ESC-ANTE', 'Pre-Correction Before Challenging Tasks',
 $$Before presenting tasks the student finds aversive, deliver a brief pre-correction that reminds the student of the expected response and available supports, paired with encouragement.$$,
 '{classroom,resource_room}', 'communication', 'proactive', 1, true),
('escape', 'verbal_aggression', 'safety', 'VAGG-ESC-SAFETY', 'Verbal Aggression De-Escalation Protocol',
 $$Reduce verbal engagement. Use a calm, low tone. Do not argue or match intensity. Provide space. State simple expectations and available supports. Allow time for regulation.$$,
 '{classroom}', 'regulation', 'reactive', 5, true),

-- Tangible × property_destruction (antecedent, safety)
('tangible', 'property_destruction', 'antecedent', 'PDEST-TAN-ANTE', 'Environmental Safeguarding and Access Clarity',
 $$Remove or secure high-value items that frequently trigger property destruction. Provide clear visual information about when items will be available and how to request access.$$,
 '{classroom}', 'tolerance', 'proactive', 1, true),
('tangible', 'property_destruction', 'safety', 'PDEST-TAN-SAFETY', 'Property Destruction Safety Response',
 $$Secure breakable or valuable items. Clear the immediate area of peers. Do not attempt to retrieve items from the student during active destruction. Wait for de-escalation before cleanup.$$,
 '{classroom}', 'safety', 'reactive', 5, true),

-- Attention × off_task (antecedent)
('attention', 'off_task', 'antecedent', 'OFFT-ATT-ANTE', 'Proximity and Engagement Monitoring',
 $$Increase staff proximity during independent work periods. Use brief, positive check-ins at regular intervals. Provide specific praise for on-task behavior before off-task behavior occurs.$$,
 '{classroom}', 'communication', 'proactive', 1, true),

-- Automatic × self_injury (antecedent, consequence)
('automatic', 'self_injury', 'antecedent', 'SIB-AUTO-ANTE', 'Sensory Substitution and Environmental Enrichment',
 $$Provide regular access to matched sensory alternatives that deliver similar input to the self-injurious behavior. Enrich the environment to reduce understimulation.$$,
 '{classroom,resource_room}', 'regulation', 'proactive', 1, true),
('automatic', 'self_injury', 'consequence', 'SIB-AUTO-CONSEQ', 'Brief Response Interruption and Redirection',
 $$Briefly interrupt the self-injurious response with a gentle physical prompt or verbal redirect, then immediately guide the student to an appropriate sensory alternative and reinforce engagement.$$,
 '{classroom,resource_room}', 'regulation', 'reactive', 3, true)

ON CONFLICT DO NOTHING;
