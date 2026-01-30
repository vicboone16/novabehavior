-- Seed VB-MAPP Milestones (Level 1, 2, 3)
-- Get the VB-MAPP system ID and domain IDs for inserting curriculum items

DO $$
DECLARE
  vbmapp_id UUID;
  mand_id UUID;
  tact_id UUID;
  lr_id UUID;
  vp_id UUID;
  play_id UUID;
  social_id UUID;
  motor_id UUID;
  echoic_id UUID;
  svb_id UUID;
  lrffc_id UUID;
  iv_id UUID;
  group_id UUID;
  ling_id UUID;
  reading_id UUID;
  writing_id UUID;
  math_id UUID;
BEGIN
  -- Get VB-MAPP system ID
  SELECT id INTO vbmapp_id FROM curriculum_systems WHERE name = 'VB-MAPP' LIMIT 1;
  
  -- Get domain IDs
  SELECT id INTO mand_id FROM domains WHERE name = 'Mand' LIMIT 1;
  SELECT id INTO tact_id FROM domains WHERE name = 'Tact' LIMIT 1;
  SELECT id INTO lr_id FROM domains WHERE name = 'Listener Responding' LIMIT 1;
  SELECT id INTO vp_id FROM domains WHERE name = 'Visual Perceptual Skills & Matching-to-Sample' LIMIT 1;
  SELECT id INTO play_id FROM domains WHERE name = 'Independent Play' LIMIT 1;
  SELECT id INTO social_id FROM domains WHERE name = 'Social Behavior & Social Play' LIMIT 1;
  SELECT id INTO motor_id FROM domains WHERE name = 'Motor Imitation' LIMIT 1;
  SELECT id INTO echoic_id FROM domains WHERE name = 'Echoic' LIMIT 1;
  SELECT id INTO svb_id FROM domains WHERE name = 'Spontaneous Vocal Behavior' LIMIT 1;
  SELECT id INTO lrffc_id FROM domains WHERE name = 'Listener Responding by Function, Feature, and Class' LIMIT 1;
  SELECT id INTO iv_id FROM domains WHERE name = 'Intraverbal' LIMIT 1;
  SELECT id INTO group_id FROM domains WHERE name = 'Classroom Routines & Group Skills' LIMIT 1;
  SELECT id INTO ling_id FROM domains WHERE name = 'Linguistic Structure' LIMIT 1;
  SELECT id INTO reading_id FROM domains WHERE name = 'Reading' LIMIT 1;
  SELECT id INTO writing_id FROM domains WHERE name = 'Writing' LIMIT 1;
  SELECT id INTO math_id FROM domains WHERE name = 'Math' LIMIT 1;

  -- VB-MAPP Level 1 Milestones (0-18 months)
  -- Mand Level 1
  INSERT INTO curriculum_items (curriculum_system_id, domain_id, level, code, title, description, mastery_criteria, display_order) VALUES
  (vbmapp_id, mand_id, 'Level 1', 'MAND-1', 'Mand 1', 'Emits 2 words, signs, or PECS, but may require echoic, imitative, or other prompt (e.g., "What do you want?")', '2 different mands with echoic or imitative prompts', 1),
  (vbmapp_id, mand_id, 'Level 1', 'MAND-2', 'Mand 2', 'Emits 4 different mands without prompts (except, What do you want?) the desired item can be present', '4 different unprompted mands', 2),
  (vbmapp_id, mand_id, 'Level 1', 'MAND-3', 'Mand 3', 'Generalizes 6 mands across 2 people, 2 settings, and 2 examples of a desired item', '6 mands generalized', 3),
  (vbmapp_id, mand_id, 'Level 1', 'MAND-4', 'Mand 4', 'Spontaneously emits 5 mands (no verbal prompts) - the desired item can be present', '5 spontaneous mands', 4),
  (vbmapp_id, mand_id, 'Level 1', 'MAND-5', 'Mand 5', 'Emits 10 different mands without prompts (except, What do you want?) the desired item can be present', '10 unprompted mands', 5);

  -- Tact Level 1
  INSERT INTO curriculum_items (curriculum_system_id, domain_id, level, code, title, description, mastery_criteria, display_order) VALUES
  (vbmapp_id, tact_id, 'Level 1', 'TACT-1', 'Tact 1', 'Tacts 2 items (e.g., objects, people, body parts, pictures)', '2 different tacts', 1),
  (vbmapp_id, tact_id, 'Level 1', 'TACT-2', 'Tact 2', 'Tacts 4 items', '4 different tacts', 2),
  (vbmapp_id, tact_id, 'Level 1', 'TACT-3', 'Tact 3', 'Tacts 6 items', '6 different tacts', 3),
  (vbmapp_id, tact_id, 'Level 1', 'TACT-4', 'Tact 4', 'Tacts 10 items', '10 different tacts', 4),
  (vbmapp_id, tact_id, 'Level 1', 'TACT-5', 'Tact 5', 'Tacts 25 items (including common objects, animals, body parts, pictures)', '25 different tacts', 5);

  -- Listener Responding Level 1
  INSERT INTO curriculum_items (curriculum_system_id, domain_id, level, code, title, description, mastery_criteria, display_order) VALUES
  (vbmapp_id, lr_id, 'Level 1', 'LR-1', 'Listener Responding 1', 'Attends to a speakers voice by orienting towards the speaker 5 times', 'Orients to speaker 5 times', 1),
  (vbmapp_id, lr_id, 'Level 1', 'LR-2', 'Listener Responding 2', 'Responds to hearing his own name 5 times', 'Responds to name 5 times', 2),
  (vbmapp_id, lr_id, 'Level 1', 'LR-3', 'Listener Responding 3', 'Looks at, touches, or points to 5 reinforcing items when named by a speaker', 'Identifies 5 reinforcing items', 3),
  (vbmapp_id, lr_id, 'Level 1', 'LR-4', 'Listener Responding 4', 'Performs 4 motor actions on command', 'Performs 4 motor actions', 4),
  (vbmapp_id, lr_id, 'Level 1', 'LR-5', 'Listener Responding 5', 'Selects the correct item from an array of 4, for 20 different objects or pictures', '20 items from array of 4', 5);

  -- VP-MTS Level 1
  INSERT INTO curriculum_items (curriculum_system_id, domain_id, level, code, title, description, mastery_criteria, display_order) VALUES
  (vbmapp_id, vp_id, 'Level 1', 'VP-1', 'VP-MTS 1', 'Tracks moving stimuli for 2 seconds, 5 times', 'Tracks 5 times for 2 seconds', 1),
  (vbmapp_id, vp_id, 'Level 1', 'VP-2', 'VP-MTS 2', 'Attends to and reaches for a desired item 5 times', 'Reaches for items 5 times', 2),
  (vbmapp_id, vp_id, 'Level 1', 'VP-3', 'VP-MTS 3', 'Places 3 items in a container, stacks 3 blocks, or places 3 rings on a peg', 'Completes 3-item tasks', 3),
  (vbmapp_id, vp_id, 'Level 1', 'VP-4', 'VP-MTS 4', 'Matches identical objects or pictures in a 3-item array, 10 items', '10 identical matches', 4),
  (vbmapp_id, vp_id, 'Level 1', 'VP-5', 'VP-MTS 5', 'Matches identical objects or pictures in a 6-item array, 25 items', '25 identical matches in 6-item array', 5);

  -- Independent Play Level 1
  INSERT INTO curriculum_items (curriculum_system_id, domain_id, level, code, title, description, mastery_criteria, display_order) VALUES
  (vbmapp_id, play_id, 'Level 1', 'PLAY-1', 'Play 1', 'Manipulates and explores objects for 1 minute', '1 minute of object exploration', 1),
  (vbmapp_id, play_id, 'Level 1', 'PLAY-2', 'Play 2', 'Shows variation in play by independently interacting with 5 different items', '5 different items explored', 2),
  (vbmapp_id, play_id, 'Level 1', 'PLAY-3', 'Play 3', 'Independently engages in movement play (e.g., swinging, bouncing, climbing) for 2 minutes', '2 minutes of movement play', 3),
  (vbmapp_id, play_id, 'Level 1', 'PLAY-4', 'Play 4', 'Independently engages in cause-and-effect play for 2 minutes', '2 minutes of cause-effect play', 4),
  (vbmapp_id, play_id, 'Level 1', 'PLAY-5', 'Play 5', 'Independently engages with toys in a functional manner for 5 minutes', '5 minutes functional toy play', 5);

  -- Social Behavior Level 1
  INSERT INTO curriculum_items (curriculum_system_id, domain_id, level, code, title, description, mastery_criteria, display_order) VALUES
  (vbmapp_id, social_id, 'Level 1', 'SOC-1', 'Social 1', 'Makes eye contact with a speaker in 5 different interactions', '5 instances of eye contact', 1),
  (vbmapp_id, social_id, 'Level 1', 'SOC-2', 'Social 2', 'Makes eye contact with a speaker as a mand 5 times', '5 eye contact mands', 2),
  (vbmapp_id, social_id, 'Level 1', 'SOC-3', 'Social 3', 'Spontaneously makes eye contact with others to gain attention 2 times', '2 spontaneous eye contacts', 3),
  (vbmapp_id, social_id, 'Level 1', 'SOC-4', 'Social 4', 'Spontaneously smiles at or touches familiar people 2 times', '2 social smiles/touches', 4),
  (vbmapp_id, social_id, 'Level 1', 'SOC-5', 'Social 5', 'Spontaneously imitates another child or adult in play 2 times', '2 spontaneous imitations', 5);

  -- Motor Imitation Level 1
  INSERT INTO curriculum_items (curriculum_system_id, domain_id, level, code, title, description, mastery_criteria, display_order) VALUES
  (vbmapp_id, motor_id, 'Level 1', 'MI-1', 'Motor Imitation 1', 'Imitates 2 gross motor movements', '2 gross motor imitations', 1),
  (vbmapp_id, motor_id, 'Level 1', 'MI-2', 'Motor Imitation 2', 'Imitates 4 motor movements', '4 motor imitations', 2),
  (vbmapp_id, motor_id, 'Level 1', 'MI-3', 'Motor Imitation 3', 'Imitates 8 motor movements', '8 motor imitations', 3),
  (vbmapp_id, motor_id, 'Level 1', 'MI-4', 'Motor Imitation 4', 'Imitates 20 motor movements of any type', '20 motor imitations', 4),
  (vbmapp_id, motor_id, 'Level 1', 'MI-5', 'Motor Imitation 5', 'Spontaneously imitates motor behavior of peers or adults on 5 occasions', '5 spontaneous imitations', 5);

  -- Echoic Level 1
  INSERT INTO curriculum_items (curriculum_system_id, domain_id, level, code, title, description, mastery_criteria, display_order) VALUES
  (vbmapp_id, echoic_id, 'Level 1', 'ECH-1', 'Echoic 1', 'Echoes 5 sounds of any type, vowels or consonants (e.g., ah, ee, mm, da)', '5 sound echoes', 1),
  (vbmapp_id, echoic_id, 'Level 1', 'ECH-2', 'Echoic 2', 'Echoes 10 sounds', '10 sound echoes', 2),
  (vbmapp_id, echoic_id, 'Level 1', 'ECH-3', 'Echoic 3', 'Echoes 15 sounds', '15 sound echoes', 3),
  (vbmapp_id, echoic_id, 'Level 1', 'ECH-4', 'Echoic 4', 'Echoes 25 different sounds or words', '25 sound/word echoes', 4),
  (vbmapp_id, echoic_id, 'Level 1', 'ECH-5', 'Echoic 5', 'Echoes 25 words on first presentation that are scored as 2 on subtest', '25 words scored 2', 5);

  -- VB-MAPP Level 2 Milestones (18-30 months)
  -- Mand Level 2
  INSERT INTO curriculum_items (curriculum_system_id, domain_id, level, code, title, description, mastery_criteria, display_order) VALUES
  (vbmapp_id, mand_id, 'Level 2', 'MAND-6', 'Mand 6', 'Mands for 20 different missing items without prompts (item is not present)', '20 mands for absent items', 6),
  (vbmapp_id, mand_id, 'Level 2', 'MAND-7', 'Mand 7', 'Mands for others to emit 5 different actions (e.g., push me, open it)', '5 action mands', 7),
  (vbmapp_id, mand_id, 'Level 2', 'MAND-8', 'Mand 8', 'Mands with 10 different 2-word combinations (e.g., big ball, my turn)', '10 two-word mand combinations', 8),
  (vbmapp_id, mand_id, 'Level 2', 'MAND-9', 'Mand 9', 'Spontaneously mands for information using a wh-question 2 times (e.g., Where shoe?)', '2 wh-question mands', 9),
  (vbmapp_id, mand_id, 'Level 2', 'MAND-10', 'Mand 10', 'Mands for 50 different items, actions, or information', '50 different mands', 10);

  -- Tact Level 2
  INSERT INTO curriculum_items (curriculum_system_id, domain_id, level, code, title, description, mastery_criteria, display_order) VALUES
  (vbmapp_id, tact_id, 'Level 2', 'TACT-6', 'Tact 6', 'Tacts 50 items', '50 different tacts', 6),
  (vbmapp_id, tact_id, 'Level 2', 'TACT-7', 'Tact 7', 'Tacts 10 actions', '10 action tacts', 7),
  (vbmapp_id, tact_id, 'Level 2', 'TACT-8', 'Tact 8', 'Tacts 50 2-word combinations (noun-verb or verb-noun)', '50 two-word tacts', 8),
  (vbmapp_id, tact_id, 'Level 2', 'TACT-9', 'Tact 9', 'Tacts 200 nouns or verbs, or 100 noun-verb combinations', '200 nouns/verbs or 100 combinations', 9),
  (vbmapp_id, tact_id, 'Level 2', 'TACT-10', 'Tact 10', 'Tacts 4 colors, 4 shapes, and 4 sizes when asked', '4 colors, shapes, sizes', 10);

  -- Listener Responding Level 2
  INSERT INTO curriculum_items (curriculum_system_id, domain_id, level, code, title, description, mastery_criteria, display_order) VALUES
  (vbmapp_id, lr_id, 'Level 2', 'LR-6', 'Listener Responding 6', 'Follows 25 instructions with single word responses', '25 single word instructions', 6),
  (vbmapp_id, lr_id, 'Level 2', 'LR-7', 'Listener Responding 7', 'Selects the correct item from a 10-item array for 200 items', '200 items from 10-item array', 7),
  (vbmapp_id, lr_id, 'Level 2', 'LR-8', 'Listener Responding 8', 'Follows 50 2-component instructions (e.g., get the ball and put it on the table)', '50 two-component instructions', 8),
  (vbmapp_id, lr_id, 'Level 2', 'LR-9', 'Listener Responding 9', 'Selects the correct item given the category, function, or feature', 'Selects by category/function/feature', 9),
  (vbmapp_id, lr_id, 'Level 2', 'LR-10', 'Listener Responding 10', 'Listener responds to 250 different items (including objects, actions, properties)', '250 different LR responses', 10);

  -- VB-MAPP Level 3 Milestones (30-48 months)
  -- Mand Level 3
  INSERT INTO curriculum_items (curriculum_system_id, domain_id, level, code, title, description, mastery_criteria, display_order) VALUES
  (vbmapp_id, mand_id, 'Level 3', 'MAND-11', 'Mand 11', 'Mands with 10 adjective, preposition, or pronoun combinations', '10 complex mand combinations', 11),
  (vbmapp_id, mand_id, 'Level 3', 'MAND-12', 'Mand 12', 'Spontaneously mands with 5 different sentences containing 3 or more words', '5 multi-word sentence mands', 12),
  (vbmapp_id, mand_id, 'Level 3', 'MAND-13', 'Mand 13', 'Mands for information using a wh-question 25 times (who, what, where, when, why, which, how)', '25 wh-question mands', 13),
  (vbmapp_id, mand_id, 'Level 3', 'MAND-14', 'Mand 14', 'Mands with correct articulation so that a new listener understands the mand 90% of the time', '90% articulation clarity', 14),
  (vbmapp_id, mand_id, 'Level 3', 'MAND-15', 'Mand 15', 'Mands for others to attend to their intraverbal behavior 5 times (e.g., Listen to this... Guess what...)', '5 attention mands', 15);

  -- Tact Level 3
  INSERT INTO curriculum_items (curriculum_system_id, domain_id, level, code, title, description, mastery_criteria, display_order) VALUES
  (vbmapp_id, tact_id, 'Level 3', 'TACT-11', 'Tact 11', 'Tacts 1000 items', '1000 tacts', 11),
  (vbmapp_id, tact_id, 'Level 3', 'TACT-12', 'Tact 12', 'Tacts 4-word utterances with correct noun-verb-adjective-preposition syntax', '4-word syntactically correct tacts', 12),
  (vbmapp_id, tact_id, 'Level 3', 'TACT-13', 'Tact 13', 'Tacts 20 different prepositions or pronouns', '20 prepositions/pronouns', 13),
  (vbmapp_id, tact_id, 'Level 3', 'TACT-14', 'Tact 14', 'Tacts with adjective-noun combinations for 100 different stimuli', '100 adjective-noun combinations', 14),
  (vbmapp_id, tact_id, 'Level 3', 'TACT-15', 'Tact 15', 'Tacts with complete sentences containing 5 or more words for 20 different stimuli', '20 complex sentence tacts', 15);

  -- LRFFC Level 2-3
  INSERT INTO curriculum_items (curriculum_system_id, domain_id, level, code, title, description, mastery_criteria, display_order) VALUES
  (vbmapp_id, lrffc_id, 'Level 2', 'LRFFC-6', 'LRFFC 6', 'Selects items from an array of 10 given the function of 25 items', '25 items by function', 1),
  (vbmapp_id, lrffc_id, 'Level 2', 'LRFFC-7', 'LRFFC 7', 'Selects items from an array given the feature of 25 items', '25 items by feature', 2),
  (vbmapp_id, lrffc_id, 'Level 2', 'LRFFC-8', 'LRFFC 8', 'Selects items from an array given the class of 25 items', '25 items by class', 3),
  (vbmapp_id, lrffc_id, 'Level 3', 'LRFFC-11', 'LRFFC 11', 'Selects items given 3 verbal components (e.g., Find the red farm animal that says moo)', '3-component LRFFC', 4),
  (vbmapp_id, lrffc_id, 'Level 3', 'LRFFC-15', 'LRFFC 15', 'Demonstrates 1000 different LRFFC responses', '1000 LRFFC responses', 5);

  -- Intraverbal Level 2-3
  INSERT INTO curriculum_items (curriculum_system_id, domain_id, level, code, title, description, mastery_criteria, display_order) VALUES
  (vbmapp_id, iv_id, 'Level 2', 'IV-6', 'Intraverbal 6', 'Completes 25 different fill-in phrases (e.g., Ready set... go)', '25 fill-ins', 1),
  (vbmapp_id, iv_id, 'Level 2', 'IV-7', 'Intraverbal 7', 'Answers 25 different What questions', '25 what questions', 2),
  (vbmapp_id, iv_id, 'Level 2', 'IV-8', 'Intraverbal 8', 'Answers 25 different Where questions', '25 where questions', 3),
  (vbmapp_id, iv_id, 'Level 2', 'IV-9', 'Intraverbal 9', 'Answers 25 Who or Which questions', '25 who/which questions', 4),
  (vbmapp_id, iv_id, 'Level 3', 'IV-11', 'Intraverbal 11', 'Answers 4 different WH questions about a single topic', '4 WH on same topic', 5),
  (vbmapp_id, iv_id, 'Level 3', 'IV-12', 'Intraverbal 12', 'Describes 25 events, videos, or stories with 8 or more words', '8+ word descriptions', 6),
  (vbmapp_id, iv_id, 'Level 3', 'IV-15', 'Intraverbal 15', 'Can carry on a 5-exchange conversation with another person', '5-exchange conversation', 7);

  -- Group & Classroom Level 2-3
  INSERT INTO curriculum_items (curriculum_system_id, domain_id, level, code, title, description, mastery_criteria, display_order) VALUES
  (vbmapp_id, group_id, 'Level 2', 'GRP-6', 'Group 6', 'Remains in a designated area for 5 minutes', '5 minutes in designated area', 1),
  (vbmapp_id, group_id, 'Level 2', 'GRP-7', 'Group 7', 'Follows 10 group instructions given by a teacher', '10 group instructions', 2),
  (vbmapp_id, group_id, 'Level 2', 'GRP-8', 'Group 8', 'Sits in a 5-person group for 5 minutes', '5 minutes in 5-person group', 3),
  (vbmapp_id, group_id, 'Level 3', 'GRP-11', 'Group 11', 'Works independently at desk for 5 minutes', '5 minutes independent work', 4),
  (vbmapp_id, group_id, 'Level 3', 'GRP-15', 'Group 15', 'Participates in classroom activities for 30 minutes', '30 minutes classroom participation', 5);

  -- Reading Level 3
  INSERT INTO curriculum_items (curriculum_system_id, domain_id, level, code, title, description, mastery_criteria, display_order) VALUES
  (vbmapp_id, reading_id, 'Level 3', 'READ-11', 'Reading 11', 'Matches 10 words to pictures', '10 word-picture matches', 1),
  (vbmapp_id, reading_id, 'Level 3', 'READ-12', 'Reading 12', 'Attends to a story read by an adult for 5 minutes', '5 minutes story attention', 2),
  (vbmapp_id, reading_id, 'Level 3', 'READ-13', 'Reading 13', 'Tacts 10 upper case and 10 lower case letters', '20 letter tacts', 3),
  (vbmapp_id, reading_id, 'Level 3', 'READ-14', 'Reading 14', 'Phonetically sounds out and reads 25 words', '25 words phonetically', 4),
  (vbmapp_id, reading_id, 'Level 3', 'READ-15', 'Reading 15', 'Reads 25 words and demonstrates comprehension', '25 words with comprehension', 5);

  -- Writing Level 3
  INSERT INTO curriculum_items (curriculum_system_id, domain_id, level, code, title, description, mastery_criteria, display_order) VALUES
  (vbmapp_id, writing_id, 'Level 3', 'WRITE-11', 'Writing 11', 'Imitates 10 strokes or shapes', '10 stroke/shape imitations', 1),
  (vbmapp_id, writing_id, 'Level 3', 'WRITE-12', 'Writing 12', 'Traces 10 letters or shapes', '10 traced letters/shapes', 2),
  (vbmapp_id, writing_id, 'Level 3', 'WRITE-13', 'Writing 13', 'Copies 10 letters or shapes', '10 copied letters/shapes', 3),
  (vbmapp_id, writing_id, 'Level 3', 'WRITE-14', 'Writing 14', 'Copies own name without a visual model', 'Writes name from memory', 4),
  (vbmapp_id, writing_id, 'Level 3', 'WRITE-15', 'Writing 15', 'Independently writes 10 words', '10 independent words', 5);

  -- Math Level 3
  INSERT INTO curriculum_items (curriculum_system_id, domain_id, level, code, title, description, mastery_criteria, display_order) VALUES
  (vbmapp_id, math_id, 'Level 3', 'MATH-11', 'Math 11', 'Rote counts to 10', 'Counts to 10', 1),
  (vbmapp_id, math_id, 'Level 3', 'MATH-12', 'Math 12', 'Counts out 10 items with 1:1 correspondence', '1:1 counting to 10', 2),
  (vbmapp_id, math_id, 'Level 3', 'MATH-13', 'Math 13', 'Tacts numbers 1-10', 'Identifies numbers 1-10', 3),
  (vbmapp_id, math_id, 'Level 3', 'MATH-14', 'Math 14', 'Matches number to quantity 1-5', 'Number-quantity matching 1-5', 4),
  (vbmapp_id, math_id, 'Level 3', 'MATH-15', 'Math 15', 'Identifies which group has more or less', 'More/less comparison', 5);

END $$;