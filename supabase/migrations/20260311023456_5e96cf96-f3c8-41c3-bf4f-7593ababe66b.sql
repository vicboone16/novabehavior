
-- Expand mastery_interventions: ANTECEDENT category (MI-ANT-005 through MI-ANT-050)
DO $$
DECLARE
  lib_id uuid;
  items text[][] := ARRAY[
    ARRAY['MI-ANT-005','First-Then Board','Present a first-then board showing the nonpreferred task followed by a preferred activity.','Predictability'],
    ARRAY['MI-ANT-006','Priming Before Transitions','Preview upcoming transitions verbally or visually 2 minutes before they occur.','Predictability'],
    ARRAY['MI-ANT-007','Social Narrative Before Activity','Read a short social narrative describing expected behavior before the activity.','Social Support'],
    ARRAY['MI-ANT-008','Embedding Preferred Items','Embed preferred items or topics into nonpreferred tasks to increase engagement.','Motivation'],
    ARRAY['MI-ANT-009','Reduced Task Length','Shorten the task to match current tolerance and gradually increase.','Task Modification'],
    ARRAY['MI-ANT-010','Environmental Predictability Setup','Arrange the environment consistently so materials and routines are predictable.','Predictability'],
    ARRAY['MI-ANT-011','Pre-Session Check-In','Conduct a brief emotional or readiness check-in before academic demands.','Self-Awareness'],
    ARRAY['MI-ANT-012','Errorless Teaching Start','Begin with high-probability correct responses to build momentum.','Teaching'],
    ARRAY['MI-ANT-013','Advance Warning of Demands','Provide verbal or visual advance warning of upcoming demands.','Predictability'],
    ARRAY['MI-ANT-014','Choice of Materials','Allow the learner to choose which materials to use for the task.','Choice'],
    ARRAY['MI-ANT-015','Choice of Location','Allow the learner to choose where to complete the task within approved areas.','Choice'],
    ARRAY['MI-ANT-016','Choice of Partner','Allow the learner to choose a work partner when applicable.','Choice'],
    ARRAY['MI-ANT-017','Noncontingent Attention','Provide brief attention at fixed intervals regardless of behavior.','Attention'],
    ARRAY['MI-ANT-018','Pre-Teaching Key Vocabulary','Pre-teach key vocabulary or concepts before the lesson begins.','Teaching'],
    ARRAY['MI-ANT-019','Behavioral Momentum','Present a series of easy requests before a difficult one.','Momentum'],
    ARRAY['MI-ANT-020','Timer for Task Duration','Use a visual timer showing how long the task will last.','Predictability'],
    ARRAY['MI-ANT-021','Calm Corner Availability','Ensure a calm corner is available and previewed before demands.','Environmental'],
    ARRAY['MI-ANT-022','Sensory Diet Pre-Loading','Provide sensory input before high-demand periods.','Sensory'],
    ARRAY['MI-ANT-023','Break Card Introduction','Teach and make available a break card before demands begin.','Communication'],
    ARRAY['MI-ANT-024','Peer Model Seating','Seat the learner near a positive peer model.','Social Support'],
    ARRAY['MI-ANT-025','Reduced Verbal Load','Use fewer words and simpler language when presenting demands.','Communication'],
    ARRAY['MI-ANT-026','Written Directions','Provide written step-by-step directions instead of verbal only.','Task Modification'],
    ARRAY['MI-ANT-027','Warm-Up Activity','Start with a brief warm-up activity related to the task.','Motivation'],
    ARRAY['MI-ANT-028','Interest-Based Hook','Connect the lesson opening to a known interest of the learner.','Motivation'],
    ARRAY['MI-ANT-029','Staff Proximity','Position staff near the learner during high-risk periods.','Environmental'],
    ARRAY['MI-ANT-030','Preferential Seating','Seat the learner in a location that minimizes distractions.','Environmental'],
    ARRAY['MI-ANT-031','Chunked Instructions','Break multi-step instructions into single steps delivered sequentially.','Task Modification'],
    ARRAY['MI-ANT-032','Pre-Correction','State the expected behavior immediately before the situation occurs.','Teaching'],
    ARRAY['MI-ANT-033','Visual Boundary Markers','Use tape or markers to define the learner workspace.','Environmental'],
    ARRAY['MI-ANT-034','Transition Object','Provide a transition object to carry between activities.','Predictability'],
    ARRAY['MI-ANT-035','Countdown to Transition','Use a verbal or visual countdown before transitions.','Predictability'],
    ARRAY['MI-ANT-036','Wait Signal Teaching','Teach a visual or verbal wait signal before requiring waiting.','Communication'],
    ARRAY['MI-ANT-037','Offer Help Before Frustration','Proactively offer help before signs of frustration appear.','Communication'],
    ARRAY['MI-ANT-038','Structured Free Time','Provide structured choices during free time to prevent escalation.','Environmental'],
    ARRAY['MI-ANT-039','Morning Greeting Routine','Establish a consistent morning greeting routine to set positive tone.','Predictability'],
    ARRAY['MI-ANT-040','End-of-Day Preview','Preview the next day schedule at end of day to reduce morning anxiety.','Predictability'],
    ARRAY['MI-ANT-041','Task Difficulty Gradient','Arrange tasks from easiest to hardest within a session.','Task Modification'],
    ARRAY['MI-ANT-042','Novelty Introduction','Introduce novel elements to increase engagement with familiar tasks.','Motivation'],
    ARRAY['MI-ANT-043','Rule Review Before Activity','Review classroom rules immediately before high-risk activities.','Teaching'],
    ARRAY['MI-ANT-044','Positive Self-Talk Prompt','Prompt the learner to use a positive self-talk phrase before starting.','Self-Awareness'],
    ARRAY['MI-ANT-045','Collaborative Goal Setting','Set a small achievable goal with the learner before the task.','Motivation'],
    ARRAY['MI-ANT-046','Fidget Tool Access','Provide a fidget tool during seated work periods.','Sensory'],
    ARRAY['MI-ANT-047','Noise-Reducing Headphones','Offer noise-reducing headphones during loud or overwhelming periods.','Sensory'],
    ARRAY['MI-ANT-048','Visual Checklist','Provide a visual checklist the learner can mark off as steps are completed.','Task Modification'],
    ARRAY['MI-ANT-049','Alternate Response Mode','Allow the learner to respond verbally instead of writing or vice versa.','Task Modification'],
    ARRAY['MI-ANT-050','Scheduled Movement Breaks','Schedule movement breaks at fixed intervals during seated work.','Sensory']
  ];
  item text[];
BEGIN
  SELECT id INTO lib_id FROM cl_libraries WHERE slug = 'mastery_interventions';
  
  FOREACH item SLICE 1 IN ARRAY items LOOP
    INSERT INTO cl_intervention_library (library_id, intervention_code, title, description, category, domain, subdomain, age_band, setting, learner_profile, function_tags, intensity_level)
    VALUES (lib_id, item[1], item[2], item[3], 'antecedent', 'Mastery Interventions', item[4], 'all', 'all', ARRAY['all'], ARRAY['escape','attention'], 'low')
    ON CONFLICT (library_id, intervention_code) DO NOTHING;
  END LOOP;
END $$;
