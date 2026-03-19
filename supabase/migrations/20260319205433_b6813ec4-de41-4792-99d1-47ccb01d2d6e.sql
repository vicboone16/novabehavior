
-- ============================================================
-- PHASE 3c: Expand behavior_replacement_map
-- Add missing function×topography replacement combos
-- ============================================================

INSERT INTO behavior_replacement_map (behavior_function, behavior_topography, severity_level, risk_level, replacement_code, replacement_priority, rationale, is_active) VALUES

-- Attention × peer_conflict → appropriate social initiation
('attention', 'peer_conflict', 'moderate', 'low', 'RG-0027', 1,
 $$Teaching appropriate peer interaction skills provides the student with effective ways to gain peer attention without conflict.$$, true),
('attention', 'peer_conflict', 'moderate', 'low', 'RG-0016', 2,
 $$Requesting attention appropriately replaces attention-seeking through peer conflict with a functionally equivalent social skill.$$, true),

-- Escape × dysregulation → break requesting + regulation
('escape', 'dysregulation', 'moderate', 'moderate', 'RG-0006', 1,
 $$Break requesting gives the student a functional escape alternative before dysregulation escalates.$$, true),
('escape', 'dysregulation', 'moderate', 'moderate', 'RG-0011', 2,
 $$Coping and regulation strategies allow the student to manage escape-related distress without behavioral escalation.$$, true),

-- Attention × off_task → appropriate attention-seeking
('attention', 'off_task', 'low', 'low', 'RG-0016', 1,
 $$Appropriate attention-requesting replaces off-task behavior that functions to gain adult attention and redirection.$$, true),

-- Escape × verbal_aggression → appropriate protest
('escape', 'verbal_aggression', 'moderate', 'moderate', 'RG-0013', 1,
 $$Appropriate protest skills replace verbal aggression as a functionally equivalent escape response.$$, true),
('escape', 'verbal_aggression', 'moderate', 'moderate', 'RG-0006', 2,
 $$Break requesting provides a structured escape pathway that replaces the need for verbal aggression.$$, true),

-- Tangible × verbal_aggression → appropriate requesting
('tangible', 'verbal_aggression', 'moderate', 'low', 'RG-0017', 1,
 $$Teaching appropriate requesting for preferred items replaces verbal aggression as a means to obtain tangibles.$$, true),
('tangible', 'verbal_aggression', 'moderate', 'low', 'RG-0007', 2,
 $$Waiting tolerance reduces the intensity of responses when tangible access is delayed.$$, true),

-- Automatic × stereotypy → competing response
('automatic', 'stereotypy', 'low', 'low', 'RG-0028', 1,
 $$Functional communication replaces non-communicative stereotypy by providing an alternative that addresses underlying needs.$$, true),

-- Escape × elopement → remaining in area + break requesting
('escape', 'elopement', 'high', 'high', 'RG-0020', 1,
 $$Teaching the student to remain in assigned areas directly addresses the topography of elopement with a clear replacement expectation.$$, true),
('escape', 'elopement', 'high', 'high', 'RG-0006', 2,
 $$Break requesting provides a structured, safe escape alternative that eliminates the need for elopement.$$, true),

-- Tangible × tantrum → appropriate requesting + waiting
('tangible', 'tantrum', 'moderate', 'moderate', 'RG-0017', 1,
 $$Appropriate requesting replaces tantrum behavior as a more effective way to access preferred items.$$, true),
('tangible', 'tantrum', 'moderate', 'moderate', 'RG-0018', 2,
 $$Delay tolerance training teaches the student to manage frustration when tangible access is not immediately available.$$, true),

-- Attention × verbal_aggression → appropriate attention-seeking
('attention', 'verbal_aggression', 'moderate', 'moderate', 'RG-0016', 1,
 $$Appropriate attention-requesting replaces verbal aggression as a means to gain adult engagement and interaction.$$, true),
('attention', 'verbal_aggression', 'moderate', 'moderate', 'RG-0022', 2,
 $$Appropriate language use directly targets the topography of verbal aggression with a replacement communication skill.$$, true)

ON CONFLICT DO NOTHING;
