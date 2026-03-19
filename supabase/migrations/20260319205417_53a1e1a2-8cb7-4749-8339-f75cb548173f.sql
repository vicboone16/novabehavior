
-- ============================================================
-- PHASE 3b: Expand behavior_support_recommendation_map
-- Add missing function×topography combos
-- ============================================================

INSERT INTO behavior_support_recommendation_map (behavior_function, behavior_topography, severity_level, risk_level, support_code, recommendation_priority, rationale, is_active) VALUES

-- Attention × peer_conflict
('attention', 'peer_conflict', 'moderate', 'low', 'SUP-SOCIAL-STORY', 2,
 $$Social narratives help attention-seeking students understand the impact of peer conflict on others and learn alternative ways to engage.$$, true),
('attention', 'peer_conflict', 'moderate', 'low', 'SUP-PROTO-PEER-MEDIATION', 3,
 $$Structured peer mediation provides an attention-rich, constructive alternative to conflict-based social interaction.$$, true),

-- Escape × dysregulation
('escape', 'dysregulation', 'moderate', 'moderate', 'SUP-EMOTION-THERMOMETER', 1,
 $$An emotion thermometer helps escape-motivated students identify rising distress before it reaches the point of behavioral escalation.$$, true),
('escape', 'dysregulation', 'moderate', 'moderate', 'SUP-SAFE-PERSON', 2,
 $$A designated safe person provides a trusted escape option that is structured, time-limited, and does not fully remove expectations.$$, true),
('escape', 'dysregulation', 'high', 'high', 'SUP-PROTO-DEESCALATION', 1,
 $$A de-escalation protocol is essential for managing high-intensity escape-maintained dysregulation safely.$$, true),

-- Automatic × stereotypy
('automatic', 'stereotypy', 'low', 'low', 'SUP-FIDGET-TOOL', 1,
 $$A sensory fidget tool can serve as a socially acceptable competing response for automatically-maintained stereotypy.$$, true),
('automatic', 'stereotypy', 'moderate', 'low', 'SUP-MOVEMENT-BREAKS', 2,
 $$Scheduled movement breaks provide appropriate sensory input that may reduce the establishing operation for stereotypic behavior.$$, true),

-- Tangible × peer_conflict
('tangible', 'peer_conflict', 'moderate', 'moderate', 'SUP-STRUCTURED-CHOICES', 1,
 $$Structured choice menus reduce peer conflict over tangible items by providing clear access options and turn-taking structure.$$, true),
('tangible', 'peer_conflict', 'moderate', 'moderate', 'SUP-ENV-PEER-FREE-ZONE', 2,
 $$Reduced peer density during high-conflict activities reduces the opportunity for tangible-maintained peer conflicts.$$, true),

-- Escape × off_task
('escape', 'off_task', 'low', 'low', 'SUP-CHUNKED-ASSIGNMENTS', 1,
 $$Breaking assignments into smaller segments reduces the aversiveness of the task and supports sustained engagement.$$, true),
('escape', 'off_task', 'low', 'low', 'SUP-VISUAL-CHECKLIST', 2,
 $$A visual checklist provides clear expectations and incremental completion markers that reduce perceived task difficulty.$$, true),
('escape', 'off_task', 'moderate', 'low', 'SUP-FIRST-THEN-BOARD', 3,
 $$A first-then board provides motivation by clearly connecting current task completion to subsequent preferred activities.$$, true),

-- Attention × tantrum (more supports)
('attention', 'tantrum', 'moderate', 'moderate', 'SUP-PROTO-PLANNED-IGNORE', 1,
 $$Planned ignoring is a primary intervention for attention-maintained tantrums, withholding the reinforcing attention while maintaining safety.$$, true),
('attention', 'tantrum', 'high', 'high', 'SUP-PROTO-CRISIS-PLAN', 1,
 $$A crisis plan ensures staff safety and consistent response during high-intensity attention-maintained tantrums.$$, true),

-- Escape × aggression  
('escape', 'aggression', 'high', 'high', 'SUP-PROTO-CRISIS-PLAN', 1,
 $$Crisis planning is essential for managing high-intensity escape-maintained aggression to ensure student and staff safety.$$, true),
('escape', 'aggression', 'moderate', 'moderate', 'SUP-PRIMING-PREVIEW', 2,
 $$Academic priming reduces the aversiveness of upcoming tasks, decreasing the likelihood of escape-maintained aggression.$$, true),

-- Automatic × dysregulation
('automatic', 'dysregulation', 'moderate', 'moderate', 'SUP-REGULATION-AREA', 1,
 $$A designated regulation area provides a predictable, safe space for students with automatically-maintained dysregulation.$$, true),
('automatic', 'dysregulation', 'moderate', 'moderate', 'SUP-ENV-NOISE-STATION', 2,
 $$Noise reduction supports students whose dysregulation is triggered or maintained by auditory overstimulation.$$, true),

-- Universal supports (null function)
(NULL, NULL, 'low', 'low', 'SUP-CHECK-IN-CHECKOUT', 1,
 $$Check-in/check-out provides daily structure, relationship building, and progress monitoring across all behavioral functions.$$, true),
(NULL, NULL, 'moderate', 'low', 'SUP-PROTO-DAILY-REPORT', 2,
 $$Daily behavior report cards provide consistent monitoring and home-school communication regardless of behavioral function.$$, true),
(NULL, NULL, 'low', 'low', 'SUP-DATA-STRATEGY-FIDELITY', 3,
 $$Fidelity monitoring ensures all recommended strategies are being implemented as designed, supporting treatment integrity.$$, true)

ON CONFLICT DO NOTHING;
