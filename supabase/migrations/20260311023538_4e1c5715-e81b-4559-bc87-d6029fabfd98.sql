
-- ENVIRONMENTAL category (MI-ENV-004 through MI-ENV-050)
DO $$
DECLARE
  lib_id uuid;
  items text[][] := ARRAY[
    ARRAY['MI-ENV-004','Clear Workspace','Remove unnecessary items from the workspace to reduce distractions.','Distraction Reduction'],
    ARRAY['MI-ENV-005','Defined Personal Space','Use tape or markers to define personal space boundaries.','Space'],
    ARRAY['MI-ENV-006','Calm Area Setup','Designate and equip a calm-down area with sensory tools.','Safety'],
    ARRAY['MI-ENV-007','Reduced Visual Clutter','Minimize wall displays and visual clutter near the learner.','Distraction Reduction'],
    ARRAY['MI-ENV-008','Lighting Adjustment','Reduce fluorescent lighting or provide alternative lighting.','Sensory'],
    ARRAY['MI-ENV-009','Sound Buffer','Use white noise or sound buffers to reduce auditory distractions.','Sensory'],
    ARRAY['MI-ENV-010','Proximity to Instruction','Position the learner close to the point of instruction.','Positioning'],
    ARRAY['MI-ENV-011','Away From Door Seating','Seat the learner away from exits and high-traffic areas.','Safety'],
    ARRAY['MI-ENV-012','Separate Work Station','Provide a separate work station for independent work.','Space'],
    ARRAY['MI-ENV-013','Visual Schedule Posted','Post a visual schedule in a consistent visible location.','Predictability'],
    ARRAY['MI-ENV-014','Material Organization System','Organize materials in labeled bins or folders.','Organization'],
    ARRAY['MI-ENV-015','Transition Path Clear','Keep transition paths clear and predictable.','Safety'],
    ARRAY['MI-ENV-016','Reinforcement Display','Display available reinforcers visually for the learner.','Motivation'],
    ARRAY['MI-ENV-017','Peer Seating Arrangement','Arrange seating to maximize positive peer influence.','Social'],
    ARRAY['MI-ENV-018','Staff Positioning Plan','Position staff strategically during high-risk routines.','Safety'],
    ARRAY['MI-ENV-019','Sensory Corner Access','Provide access to a sensory corner with regulation tools.','Sensory'],
    ARRAY['MI-ENV-020','Reduced Group Size','Reduce group size during high-demand activities.','Task Modification'],
    ARRAY['MI-ENV-021','Consistent Room Layout','Maintain a consistent room layout across days.','Predictability'],
    ARRAY['MI-ENV-022','Emergency Kit Location','Place emergency safety materials in an accessible but secure location.','Safety'],
    ARRAY['MI-ENV-023','Visual Boundary for Group','Use floor markers to define group activity boundaries.','Space'],
    ARRAY['MI-ENV-024','Hallway Visual Supports','Place visual cues in hallways for transition expectations.','Predictability'],
    ARRAY['MI-ENV-025','Breakout Space Available','Ensure a breakout space is available for de-escalation.','Safety'],
    ARRAY['MI-ENV-026','Temperature Comfort','Monitor and adjust room temperature for comfort.','Sensory'],
    ARRAY['MI-ENV-027','Secure Sharp Objects','Secure scissors and sharp objects during high-risk periods.','Safety'],
    ARRAY['MI-ENV-028','Privacy Screen','Provide a privacy screen or study carrel for independent work.','Distraction Reduction'],
    ARRAY['MI-ENV-029','Communication Board Posted','Post a communication board with common requests.','Communication'],
    ARRAY['MI-ENV-030','Visual Timer Displayed','Display a visual timer showing time remaining for tasks.','Predictability'],
    ARRAY['MI-ENV-031','Color-Coded Areas','Use color coding to define different activity areas.','Organization'],
    ARRAY['MI-ENV-032','Flexible Seating Options','Provide alternative seating options such as wobble chairs or standing desks.','Sensory'],
    ARRAY['MI-ENV-033','Staff Walkie Access','Ensure staff have communication devices during supervision.','Safety'],
    ARRAY['MI-ENV-034','Reduce Crowding','Reduce the number of students in proximity during transitions.','Safety'],
    ARRAY['MI-ENV-035','Visual Rules Posted','Post visual rules at the point of performance.','Predictability'],
    ARRAY['MI-ENV-036','Structured Arrival Routine','Set up a structured arrival area with clear steps.','Predictability'],
    ARRAY['MI-ENV-037','Departure Routine Setup','Set up a structured departure routine with visual steps.','Predictability'],
    ARRAY['MI-ENV-038','Noise Level Indicator','Use a visual noise level indicator in the classroom.','Sensory'],
    ARRAY['MI-ENV-039','Weighted Items Available','Make weighted lap pads or vests available.','Sensory'],
    ARRAY['MI-ENV-040','Movement Path Defined','Define an approved movement path for sensory breaks.','Sensory'],
    ARRAY['MI-ENV-041','Snack Access Plan','Ensure healthy snack access for learners with regulation needs.','Safety'],
    ARRAY['MI-ENV-042','Water Access','Ensure easy water access to prevent escalation from thirst.','Safety'],
    ARRAY['MI-ENV-043','Bathroom Pass System','Implement a visual bathroom pass system to reduce disruption.','Communication'],
    ARRAY['MI-ENV-044','Headphone Station','Set up a headphone station for auditory breaks.','Sensory'],
    ARRAY['MI-ENV-045','Peer Buddy Proximity','Assign and seat a peer buddy near the learner.','Social'],
    ARRAY['MI-ENV-046','Reduced Wall Text','Reduce text-heavy wall displays to minimize overstimulation.','Distraction Reduction'],
    ARRAY['MI-ENV-047','Exit Supervision Plan','Ensure exits are supervised during high-risk periods.','Safety'],
    ARRAY['MI-ENV-048','Playground Structure','Provide structured recess activities as an option.','Social'],
    ARRAY['MI-ENV-049','Lunch Seating Plan','Arrange lunch seating to minimize social conflict.','Social'],
    ARRAY['MI-ENV-050','Afterschool Transition Setup','Set up a structured afterschool transition space.','Predictability']
  ];
  item text[];
BEGIN
  SELECT id INTO lib_id FROM cl_libraries WHERE slug = 'mastery_interventions';
  FOREACH item SLICE 1 IN ARRAY items LOOP
    INSERT INTO cl_intervention_library (library_id, intervention_code, title, description, category, domain, subdomain, age_band, setting, learner_profile, function_tags, intensity_level)
    VALUES (lib_id, item[1], item[2], item[3], 'environmental', 'Mastery Interventions', item[4], 'all', 'school', ARRAY['all'], ARRAY['escape','sensory'], 'moderate')
    ON CONFLICT (library_id, intervention_code) DO NOTHING;
  END LOOP;
END $$;
