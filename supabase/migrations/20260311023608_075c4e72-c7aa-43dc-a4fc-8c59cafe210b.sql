
-- REINFORCEMENT category (MI-REINF-004 through MI-REINF-050)
DO $$
DECLARE
  lib_id uuid;
  items text[][] := ARRAY[
    ARRAY['MI-REINF-004','Token Economy','Use a token board with defined exchange ratio for earned reinforcement.','Token Systems'],
    ARRAY['MI-REINF-005','Choice Board Reinforcement','Allow the learner to choose from a visual choice board after earning tokens.','Choice'],
    ARRAY['MI-REINF-006','Social Praise Pairing','Pair social praise with tangible reinforcement to build conditioned reinforcers.','Praise'],
    ARRAY['MI-REINF-007','Activity Reinforcement','Allow access to a preferred activity contingent on target behavior.','Activity'],
    ARRAY['MI-REINF-008','Break as Reinforcement','Provide a brief break as reinforcement for task completion.','Break'],
    ARRAY['MI-REINF-009','Self-Monitoring Reward','Allow the learner to self-monitor and self-deliver earned reinforcement.','Self-Management'],
    ARRAY['MI-REINF-010','Group Contingency','Use a group contingency where the whole group earns reinforcement.','Group'],
    ARRAY['MI-REINF-011','DRA Schedule','Deliver reinforcement for alternative replacement behavior on a fixed schedule.','Differential Reinforcement'],
    ARRAY['MI-REINF-012','DRO Schedule','Deliver reinforcement for the absence of problem behavior during intervals.','Differential Reinforcement'],
    ARRAY['MI-REINF-013','DRI Schedule','Deliver reinforcement for a behavior physically incompatible with the target.','Differential Reinforcement'],
    ARRAY['MI-REINF-014','DRL Schedule','Deliver reinforcement when the behavior occurs at or below a set rate.','Differential Reinforcement'],
    ARRAY['MI-REINF-015','High-P Reinforcement','Reinforce compliance with high-probability requests to build momentum.','Momentum'],
    ARRAY['MI-REINF-016','Natural Reinforcement','Use naturally occurring consequences as reinforcement.','Natural'],
    ARRAY['MI-REINF-017','Delayed Reinforcement','Gradually delay reinforcement to build tolerance for waiting.','Delay Tolerance'],
    ARRAY['MI-REINF-018','Thinning Schedule','Systematically thin the reinforcement schedule as mastery increases.','Schedule Thinning'],
    ARRAY['MI-REINF-019','Visual Progress Chart','Use a visual chart showing progress toward a goal.','Visual Feedback'],
    ARRAY['MI-REINF-020','Surprise Reinforcement','Deliver unexpected reinforcement for spontaneous positive behavior.','Motivation'],
    ARRAY['MI-REINF-021','Peer Reinforcement','Train peers to deliver social reinforcement for target behaviors.','Social'],
    ARRAY['MI-REINF-022','Home-School Report Card','Send a daily behavior report card home with reinforcement at home.','Home-School'],
    ARRAY['MI-REINF-023','Special Helper Role','Assign a special helper role as reinforcement for positive behavior.','Activity'],
    ARRAY['MI-REINF-024','Preferred Seating Earned','Allow preferred seating as a reinforcement for meeting goals.','Activity'],
    ARRAY['MI-REINF-025','Tech Time Earned','Provide earned technology time contingent on behavior targets.','Activity'],
    ARRAY['MI-REINF-026','First-Then Reinforcement','Use first-then language linking the demand to the reinforcer.','Visual Feedback'],
    ARRAY['MI-REINF-027','Reinforcement Inventory Update','Regularly update the reinforcement inventory through preference assessments.','Assessment'],
    ARRAY['MI-REINF-028','Free Operant Preference','Conduct free operant preference assessments to identify current reinforcers.','Assessment'],
    ARRAY['MI-REINF-029','Multiple Stimulus Preference','Use MSWO preference assessments for reinforcer hierarchy.','Assessment'],
    ARRAY['MI-REINF-030','Reinforcement Fading Plan','Create a written plan for systematic reinforcement fading.','Schedule Thinning'],
    ARRAY['MI-REINF-031','Non-Removal Reinforcement','Maintain reinforcement access for task completion without removal for behavior.','Motivation'],
    ARRAY['MI-REINF-032','Edible Pairing','Pair edible reinforcers with social praise to condition social reinforcement.','Pairing'],
    ARRAY['MI-REINF-033','Sticker Chart','Use a sticker chart with defined criteria and exchange schedule.','Token Systems'],
    ARRAY['MI-REINF-034','Mystery Motivator','Use a mystery motivator envelope to increase anticipation and engagement.','Motivation'],
    ARRAY['MI-REINF-035','Level System','Implement a level system with increasing privileges at each level.','Token Systems'],
    ARRAY['MI-REINF-036','Behavior Contract','Create a written behavior contract with agreed-upon reinforcers.','Self-Management'],
    ARRAY['MI-REINF-037','Earned Free Choice Time','Provide earned free choice time at the end of sessions.','Activity'],
    ARRAY['MI-REINF-038','Visual Token Board','Use a visual token board with clear tokens-to-reinforcer ratio.','Token Systems'],
    ARRAY['MI-REINF-039','Class Dojo Points','Use a digital point system for tracking and reinforcing behavior.','Token Systems'],
    ARRAY['MI-REINF-040','Positive Note Home','Send a positive note home as social reinforcement.','Home-School'],
    ARRAY['MI-REINF-041','Lunch With Preferred Adult','Offer lunch with a preferred adult as earned reinforcement.','Activity'],
    ARRAY['MI-REINF-042','Music Access','Provide music access during independent work as reinforcement.','Activity'],
    ARRAY['MI-REINF-043','Drawing Time','Allow brief drawing time as reinforcement between tasks.','Activity'],
    ARRAY['MI-REINF-044','Leadership Opportunity','Provide a leadership opportunity as reinforcement.','Activity'],
    ARRAY['MI-REINF-045','Sensory Reinforcement','Provide sensory-based reinforcement matched to learner preference.','Sensory'],
    ARRAY['MI-REINF-046','Social Story Achievement','Create a social story celebrating the learner achievement.','Social'],
    ARRAY['MI-REINF-047','Photo Board Progress','Add photos to a progress board showing accomplishments.','Visual Feedback'],
    ARRAY['MI-REINF-048','Earned Movement Break','Provide an earned movement break after sustained on-task behavior.','Break'],
    ARRAY['MI-REINF-049','Verbal Affirmation Script','Use a specific verbal affirmation script matched to learner preference.','Praise'],
    ARRAY['MI-REINF-050','Shared Reinforcement','Allow the learner to share earned reinforcement with a peer.','Social']
  ];
  item text[];
BEGIN
  SELECT id INTO lib_id FROM cl_libraries WHERE slug = 'mastery_interventions';
  FOREACH item SLICE 1 IN ARRAY items LOOP
    INSERT INTO cl_intervention_library (library_id, intervention_code, title, description, category, domain, subdomain, age_band, setting, learner_profile, function_tags, intensity_level)
    VALUES (lib_id, item[1], item[2], item[3], 'reinforcement', 'Mastery Interventions', item[4], 'all', 'all', ARRAY['all'], ARRAY['attention','escape'], 'low')
    ON CONFLICT (library_id, intervention_code) DO NOTHING;
  END LOOP;
END $$;
