
-- REACTIVE category (MI-REACT-004 through MI-REACT-050)
DO $$
DECLARE
  lib_id uuid;
  items text[][] := ARRAY[
    ARRAY['MI-REACT-004','Planned Ignoring','Withhold attention for minor attention-maintained behavior while ensuring safety.','Extinction'],
    ARRAY['MI-REACT-005','Redirect to Task','Calmly redirect the learner back to the task with minimal verbal interaction.','Redirection'],
    ARRAY['MI-REACT-006','Offer Break','Offer a break when early escalation signs appear.','De-Escalation'],
    ARRAY['MI-REACT-007','Staff Rotation','Rotate the responding staff member if the current interaction is escalating.','De-Escalation'],
    ARRAY['MI-REACT-008','Reduce Audience','Remove peers from the area or redirect their attention during escalation.','De-Escalation'],
    ARRAY['MI-REACT-009','Protective Stance','Maintain a non-threatening body posture during crisis.','Crisis'],
    ARRAY['MI-REACT-010','Clear the Area','Remove all other students from the area during severe escalation.','Crisis'],
    ARRAY['MI-REACT-011','Wait and Observe','Wait silently at a safe distance allowing the learner to self-regulate.','De-Escalation'],
    ARRAY['MI-REACT-012','Validate Emotion','Briefly validate the emotion without reinforcing the behavior.','De-Escalation'],
    ARRAY['MI-REACT-013','Offer Two Choices','Offer two acceptable choices to restore a sense of control.','De-Escalation'],
    ARRAY['MI-REACT-014','Gestural Prompt Only','Use only a gestural prompt without verbal interaction during mild escalation.','Redirection'],
    ARRAY['MI-REACT-015','Proximity Without Words','Move closer to the learner without speaking to prompt re-engagement.','Redirection'],
    ARRAY['MI-REACT-016','Neutral Affect','Maintain neutral facial expression and tone during problem behavior.','De-Escalation'],
    ARRAY['MI-REACT-017','State Expectation Once','State the expectation once clearly and wait without repeating.','Redirection'],
    ARRAY['MI-REACT-018','Avoid Power Struggle','Disengage from argumentative interactions by stating the expectation and stepping back.','De-Escalation'],
    ARRAY['MI-REACT-019','Recovery Space Transition','Guide the learner to a recovery space when initial de-escalation fails.','Crisis'],
    ARRAY['MI-REACT-020','Document and Debrief','Document the incident and debrief with staff after the event.','Crisis'],
    ARRAY['MI-REACT-021','Re-Entry Plan','Follow a structured re-entry plan after the learner has regulated.','Recovery'],
    ARRAY['MI-REACT-022','Repair Conversation','Facilitate a brief repair conversation after the learner has fully regulated.','Recovery'],
    ARRAY['MI-REACT-023','Response Cost','Remove a previously earned token or privilege contingent on problem behavior.','Consequence'],
    ARRAY['MI-REACT-024','Natural Consequence','Allow a natural consequence to occur when safe and appropriate.','Consequence'],
    ARRAY['MI-REACT-025','Restitution','Guide the learner to repair or restore any damage caused.','Recovery'],
    ARRAY['MI-REACT-026','Social Reinforcement for Recovery','Provide social reinforcement for successful self-regulation and recovery.','Recovery'],
    ARRAY['MI-REACT-027','Brief Reteach','Briefly reteach the replacement behavior after the learner has regulated.','Teaching'],
    ARRAY['MI-REACT-028','Visual Cue to Reset','Show a visual cue card indicating it is time to reset.','Redirection'],
    ARRAY['MI-REACT-029','Countdown for Compliance','Provide a calm countdown to allow processing time for compliance.','Redirection'],
    ARRAY['MI-REACT-030','Contingent Observation','Remove the learner from the reinforcing environment to observe from nearby.','Consequence'],
    ARRAY['MI-REACT-031','Verbal De-Escalation Script','Use a scripted verbal de-escalation sequence during moderate behavior.','De-Escalation'],
    ARRAY['MI-REACT-032','Humor Diffusion','Use light appropriate humor to diffuse tension when clinically indicated.','De-Escalation'],
    ARRAY['MI-REACT-033','Distraction Technique','Introduce a novel or interesting distraction to interrupt escalation.','Redirection'],
    ARRAY['MI-REACT-034','Whisper Technique','Lower voice to a whisper to de-escalate and draw attention.','De-Escalation'],
    ARRAY['MI-REACT-035','Movement Redirect','Redirect the learner to a physical movement activity.','Redirection'],
    ARRAY['MI-REACT-036','Sensory Tool Offer','Offer a sensory tool during mild escalation.','De-Escalation'],
    ARRAY['MI-REACT-037','Drink of Water Offer','Offer a drink of water as a regulatory pause.','De-Escalation'],
    ARRAY['MI-REACT-038','Breathing Prompt','Prompt a specific breathing technique during early escalation.','De-Escalation'],
    ARRAY['MI-REACT-039','Safe Person Check-In','Allow the learner to check in with a designated safe person.','De-Escalation'],
    ARRAY['MI-REACT-040','Parent Contact Protocol','Follow a defined protocol for contacting parents during crisis.','Crisis'],
    ARRAY['MI-REACT-041','Admin Support Call','Follow a defined protocol for requesting administrative support.','Crisis'],
    ARRAY['MI-REACT-042','Post-Crisis Preference Assessment','Conduct a brief preference check after crisis to re-establish rapport.','Recovery'],
    ARRAY['MI-REACT-043','Simplified Demand After Reset','Present a simplified version of the demand after the learner resets.','Recovery'],
    ARRAY['MI-REACT-044','Peer Reintegration Support','Provide structured peer reintegration support after an incident.','Recovery'],
    ARRAY['MI-REACT-045','Staff Self-Regulation Check','Staff completes a brief self-regulation check before responding.','De-Escalation'],
    ARRAY['MI-REACT-046','Incident Summary Form','Complete an incident summary form for data collection.','Crisis'],
    ARRAY['MI-REACT-047','Functional Analysis Note','Record antecedent-behavior-consequence data during the incident.','Crisis'],
    ARRAY['MI-REACT-048','Safety Signal','Use a pre-taught safety signal to indicate danger level.','Crisis'],
    ARRAY['MI-REACT-049','Gradual Demand Reintroduction','Gradually reintroduce demands after crisis resolution.','Recovery'],
    ARRAY['MI-REACT-050','Team Debrief Protocol','Conduct a structured team debrief within 24 hours of a crisis.','Recovery']
  ];
  item text[];
BEGIN
  SELECT id INTO lib_id FROM cl_libraries WHERE slug = 'mastery_interventions';
  FOREACH item SLICE 1 IN ARRAY items LOOP
    INSERT INTO cl_intervention_library (library_id, intervention_code, title, description, category, domain, subdomain, age_band, setting, learner_profile, function_tags, intensity_level)
    VALUES (lib_id, item[1], item[2], item[3], 'reactive', 'Mastery Interventions', item[4], 'all', 'all', ARRAY['all'], ARRAY['emotional_overload','escape'], 'moderate')
    ON CONFLICT (library_id, intervention_code) DO NOTHING;
  END LOOP;
END $$;
