
-- ============================================================
-- PHASE 1: Expand bip_support_library (40+ new entries)
-- ============================================================

-- === NEW ACCOMMODATIONS (15 net-new) ===
INSERT INTO bip_support_library (support_code, support_title, support_type, category, support_description, implementation_notes, function_tags, topography_tags, setting_tags, sort_order, is_active) VALUES

-- Social/Emotional accommodations
('SUP-SOCIAL-STORY', 'Social Story or Narrative Support', 'accommodation', 'social',
 $$Provide individualized social narratives that describe expected behaviors, perspectives of others, and appropriate responses for specific social situations the student finds challenging.$$,
 $$Develop stories collaboratively with the student when possible. Review before anticipated challenging situations. Use visuals to supplement text. Update as the student progresses.$$,
 '{attention,escape}', '{peer_conflict,disruption,verbal_aggression}', '{classroom,recess,cafeteria}', 100, true),

('SUP-EMOTION-THERMOMETER', 'Emotion Thermometer or Zones Check-In', 'accommodation', 'regulation',
 $$Provide a visual rating scale or zones-based system that allows the student to self-identify current emotional state and access corresponding regulation strategies.$$,
 $$Post visual in the student''s workspace. Pair each level with a pre-taught coping strategy. Use as a non-verbal check-in tool throughout the day.$$,
 '{automatic,escape}', '{dysregulation,tantrum,aggression}', '{classroom,counseling,resource_room}', 101, true),

('SUP-CHUNKED-ASSIGNMENTS', 'Chunked or Segmented Assignments', 'accommodation', 'academic',
 $$Break multi-step or lengthy assignments into smaller, clearly defined segments with check-in points to reduce task avoidance and promote sustained engagement.$$,
 $$Provide one section at a time when appropriate. Allow submission of segments independently. Pair with reinforcement at each checkpoint.$$,
 '{escape}', '{task_refusal,noncompliance,off_task}', '{classroom,resource_room}', 102, true),

('SUP-FIRST-THEN-BOARD', 'First-Then Visual Board', 'accommodation', 'transitions',
 $$Use a portable or posted first-then visual board that shows the current expected activity followed by a preferred or reinforcing activity to increase compliance and motivation.$$,
 $$Update throughout the day. Allow student input on the then item when clinically appropriate. Use real photos or icons matched to learner preference.$$,
 '{escape,tangible}', '{noncompliance,task_refusal}', '{classroom,resource_room,home}', 103, true),

('SUP-ALTERNATIVE-RESPONSE', 'Alternative Response Method', 'accommodation', 'academic',
 $$Allow the student to demonstrate understanding through alternative methods such as verbal responses, drawings, dictation, or typed responses instead of traditional written output.$$,
 $$Match response method to the student''s strengths. Ensure the alternative still assesses the target skill. Document accommodations in the IEP.$$,
 '{escape}', '{task_refusal,noncompliance}', '{classroom,resource_room}', 104, true),

('SUP-PRIMING-PREVIEW', 'Academic Priming or Preview', 'accommodation', 'academic',
 $$Provide the student with a brief preview of upcoming lesson content, key vocabulary, or task expectations before the lesson begins to reduce anxiety and increase readiness.$$,
 $$Can be delivered the day before or morning of. Use visuals, outlines, or brief verbal summaries. Particularly effective before novel or challenging content.$$,
 '{escape,automatic}', '{task_refusal,dysregulation,noncompliance}', '{classroom,resource_room}', 105, true),

('SUP-FIDGET-TOOL', 'Approved Sensory or Fidget Tool', 'accommodation', 'sensory',
 $$Provide access to an approved sensory or fidget tool that the student can use during instruction to support regulation and sustained attention without disrupting others.$$,
 $$Establish clear expectations for use. Rotate tools to maintain effectiveness. Remove if the tool becomes a distractor rather than a support.$$,
 '{automatic}', '{off_task,dysregulation,stereotypy}', '{classroom}', 106, true),

('SUP-VISUAL-CHECKLIST', 'Visual Task Checklist', 'accommodation', 'academic',
 $$Provide a visual or written checklist that breaks down multi-step tasks or routines into sequential, checkable steps the student can follow independently.$$,
 $$Laminate for reuse. Include both text and icons. Fade as independence increases. Use for academic tasks, daily routines, and transition sequences.$$,
 '{escape}', '{task_refusal,noncompliance,off_task}', '{classroom,resource_room,home}', 107, true),

('SUP-NONVERBAL-SIGNAL', 'Private Nonverbal Signal System', 'accommodation', 'communication',
 $$Establish a private, pre-agreed nonverbal signal between the student and staff to communicate needs such as help, a break, or dysregulation without drawing peer attention.$$,
 $$Practice the signal during calm times. Respond consistently when the student uses it. Can include hand signals, colored cards, or small objects placed on the desk.$$,
 '{attention,escape}', '{dysregulation,disruption,verbal_aggression}', '{classroom}', 108, true),

('SUP-SAFE-PERSON', 'Designated Safe Person', 'accommodation', 'regulation',
 $$Identify a trusted adult in the school building whom the student can access during times of elevated distress for brief check-ins, co-regulation, or emotional support.$$,
 $$Ensure the safe person is available during high-risk periods. Establish a protocol for how the student accesses the person. Communicate plan to all staff.$$,
 '{automatic,escape}', '{dysregulation,elopement,aggression}', '{classroom,hallway,counseling}', 109, true),

('SUP-REDUCED-TRANSITIONS', 'Reduced Number of Transitions', 'accommodation', 'transitions',
 $$Minimize the number of transitions the student must make throughout the day by consolidating activities, using consistent locations, or reducing unnecessary movement between settings.$$,
 $$Coordinate with the student''s full schedule. Prioritize reducing transitions during known high-risk times. Pair with transition supports for remaining transitions.$$,
 '{escape,automatic}', '{elopement,dysregulation,aggression}', '{classroom,hallway}', 110, true),

('SUP-PREDICTABLE-ADULT', 'Consistent Adult Assignment', 'accommodation', 'social',
 $$Assign a consistent set of adults to work with the student to build rapport, increase predictability, and reduce anxiety associated with unfamiliar staff interactions.$$,
 $$Minimize staff rotation for the student when possible. Introduce new staff gradually. Brief substitute staff on the student''s support plan.$$,
 '{automatic,attention}', '{dysregulation,aggression,noncompliance}', '{classroom,resource_room}', 111, true),

('SUP-STRUCTURED-CHOICES', 'Structured Choice Menu', 'accommodation', 'engagement',
 $$Provide the student with a visual menu of 2-3 acceptable choices for tasks, materials, seating, or activities to increase autonomy and reduce power struggles.$$,
 $$All choices should be acceptable to staff. Present choices before the student refuses. Increase options as the student demonstrates responsible decision-making.$$,
 '{escape,tangible}', '{noncompliance,task_refusal,verbal_aggression}', '{classroom,resource_room}', 112, true),

('SUP-ERRORLESS-LEARNING', 'Errorless or High-Success Task Design', 'accommodation', 'academic',
 $$Structure initial task presentations to minimize errors and maximize success by providing prompts, models, or simplified versions before fading to independent performance.$$,
 $$Intersperse mastered tasks with new content. Provide immediate feedback. Gradually increase complexity as the student builds confidence and momentum.$$,
 '{escape}', '{task_refusal,noncompliance,off_task}', '{classroom,resource_room}', 113, true),

('SUP-QUIET-WORKSPACE', 'Designated Quiet Workspace', 'accommodation', 'environmental',
 $$Provide access to a designated quiet workspace or study carrel where the student can work with reduced sensory input during independent work periods.$$,
 $$Ensure the space is not used as punishment. Allow student-initiated access. Monitor to prevent isolation. Pair with task completion expectations.$$,
 '{automatic,escape}', '{off_task,dysregulation,task_refusal}', '{classroom,resource_room}', 114, true),

-- === NEW ENVIRONMENTAL SUPPORTS (8 net-new) ===
('SUP-ENV-ARRIVAL-ROUTINE', 'Structured Arrival Routine', 'environmental_support', 'transitions',
 $$Establish a predictable, visually supported arrival routine that provides the student with clear expectations and activities from the moment they enter the school or classroom.$$,
 $$Include a visual checklist of morning steps. Provide a preferred activity upon completion. Greet the student warmly and predictably each day.$$,
 '{escape,automatic}', '{noncompliance,dysregulation,elopement}', '{classroom,hallway}', 200, true),

('SUP-ENV-END-OF-DAY', 'Structured Dismissal Routine', 'environmental_support', 'transitions',
 $$Create a consistent end-of-day routine with visual supports and clear steps to reduce anxiety and behavioral escalation during dismissal transitions.$$,
 $$Begin dismissal routine at a consistent time. Include a brief positive review of the day. Provide advance warning of any schedule changes for the next day.$$,
 '{escape,automatic}', '{dysregulation,elopement,aggression}', '{classroom}', 201, true),

('SUP-ENV-VISUAL-RULES', 'Posted Visual Expectations', 'environmental_support', 'engagement',
 $$Display clearly stated, positively worded behavioral expectations in visual format at the student''s eye level in all relevant settings.$$,
 $$Use icons paired with text. Limit to 3-5 rules. Reference during precorrection. Review and practice regularly.$$,
 '{attention,escape}', '{noncompliance,disruption,off_task}', '{classroom,cafeteria,recess}', 202, true),

('SUP-ENV-MOVEMENT-PATH', 'Designated Movement Path', 'environmental_support', 'safety',
 $$Establish and mark a designated path the student may use for movement breaks or transitions to reduce wandering, elopement risk, and disruption to others.$$,
 $$Use floor tape or visual markers. Practice the path during calm times. Pair with a movement break pass or timer system.$$,
 '{escape,automatic}', '{elopement,off_task,dysregulation}', '{classroom,hallway}', 203, true),

('SUP-ENV-NOISE-STATION', 'Noise-Reduction Station', 'environmental_support', 'sensory',
 $$Provide a designated area or toolkit with noise-canceling headphones, white noise options, or acoustic barriers for students who are sensitive to auditory stimulation.$$,
 $$Allow student-initiated access. Monitor for over-reliance. Pair with instruction on self-advocacy for sensory needs.$$,
 '{automatic}', '{dysregulation,off_task,stereotypy}', '{classroom}', 204, true),

('SUP-ENV-REENTRY-SPACE', 'Re-Entry Transition Space', 'environmental_support', 'transitions',
 $$Designate a transition space where the student can briefly regroup before re-entering the classroom after a break, regulation time, or behavioral incident.$$,
 $$Keep the space calm and low-stimulation. Provide a brief re-entry checklist. Staff should use a neutral, welcoming tone during re-entry.$$,
 '{escape,automatic}', '{dysregulation,aggression,elopement}', '{hallway,classroom}', 205, true),

('SUP-ENV-PEER-FREE-ZONE', 'Reduced Peer Density Option', 'environmental_support', 'social',
 $$Provide access to a workspace or activity area with reduced peer density during times when the student is most likely to experience peer-related behavioral triggers.$$,
 $$Use proactively rather than reactively. Gradually increase peer exposure as social skills develop. Do not frame as exclusion.$$,
 '{attention,tangible}', '{peer_conflict,aggression,verbal_aggression}', '{classroom,recess,cafeteria}', 206, true),

('SUP-ENV-NEUTRAL-ZONE', 'Staff Neutral Response Zone', 'environmental_support', 'staff_response',
 $$Establish a physical area where staff can briefly step to regulate their own response before re-engaging with a student during or after a behavioral episode.$$,
 $$Train staff on the purpose and use. Ensure another adult can cover student supervision. Model calm re-engagement.$$,
 '{attention,escape}', '{aggression,verbal_aggression,tantrum}', '{classroom}', 207, true),

-- === NEW PROTOCOLS (8 net-new) ===
('SUP-PROTO-ESCAPE-EXTINCTION', 'Escape Extinction with Demand Fading', 'protocol', 'staff_response',
 $$Implement a structured protocol where task demands are not removed following problem behavior, combined with systematic fading of demand difficulty to build tolerance.$$,
 $$Begin with low-effort demands the student can reliably complete. Gradually increase complexity. Ensure consistent implementation across all staff. Pair with high rates of reinforcement for compliance.$$,
 '{escape}', '{noncompliance,task_refusal,aggression}', '{classroom,resource_room}', 300, true),

('SUP-PROTO-FUNCTIONAL-COMM', 'Functional Communication Training Protocol', 'protocol', 'staff_response',
 $$Implement a structured FCT protocol where the student is taught and reinforced for using a communicative alternative to problem behavior that serves the same function.$$,
 $$Identify the specific function. Teach the replacement communication form during calm states. Reinforce immediately and consistently. Gradually thin the reinforcement schedule.$$,
 '{attention,escape,tangible}', '{aggression,tantrum,verbal_aggression,noncompliance}', '{classroom,resource_room,home}', 301, true),

('SUP-PROTO-SAFETY-SIGNAL', 'Safety Signal or All-Clear Protocol', 'protocol', 'safety',
 $$Establish a discrete signal system among staff members to communicate safety concerns, request additional support, or indicate that a situation has de-escalated without alarming the student or peers.$$,
 $$Train all relevant staff. Practice during drills. Ensure the signal is simple and unambiguous. Include a protocol for who responds and how.$$,
 '{automatic,escape}', '{aggression,elopement,self_injury,unsafe_behavior}', '{classroom,hallway,recess}', 302, true),

('SUP-PROTO-STRUCTURED-BREAK', 'Structured Break Protocol', 'protocol', 'staff_response',
 $$Define a clear protocol for break requests including: how the student requests, maximum duration, what activities are available during the break, and expectations for return to task.$$,
 $$Post the protocol visually. Practice during calm times. Differentiate between earned breaks and function-based break access. Track break frequency as data.$$,
 '{escape}', '{task_refusal,noncompliance,dysregulation}', '{classroom,resource_room}', 303, true),

('SUP-PROTO-PEER-MEDIATION', 'Peer Conflict Resolution Protocol', 'protocol', 'engagement',
 $$Implement a structured peer mediation or conflict resolution protocol that provides a predictable sequence for addressing interpersonal conflicts before they escalate.$$,
 $$Teach the protocol to all students. Use visual cue cards. Provide adult facilitation initially, then fade. Practice with role-play scenarios.$$,
 '{attention,tangible}', '{peer_conflict,verbal_aggression,aggression}', '{classroom,recess,cafeteria}', 304, true),

('SUP-PROTO-TRANSITION-COUNTDOWN', 'Transition Countdown Protocol', 'protocol', 'staff_response',
 $$Implement a consistent countdown or multi-step warning protocol before all transitions, providing the student with predictable time markers to prepare for activity changes.$$,
 $$Use visual timers, verbal countdowns, or both. Begin with 5-3-1 minute warnings. Maintain consistency across all staff and settings. Pair with positive acknowledgment for smooth transitions.$$,
 '{escape,automatic}', '{dysregulation,noncompliance,elopement}', '{classroom,hallway}', 305, true),

('SUP-PROTO-BEHAVIORAL-MOMENTUM', 'Behavioral Momentum Protocol', 'protocol', 'staff_response',
 $$Use a high-probability request sequence (2-3 easy or preferred tasks) immediately before presenting a low-probability demand to build compliance momentum and reduce task refusal.$$,
 $$Select high-p tasks the student reliably completes. Deliver in quick succession. Reinforce each completion. Present the target demand immediately after the high-p sequence.$$,
 '{escape}', '{noncompliance,task_refusal}', '{classroom,resource_room}', 306, true),

('SUP-PROTO-DAILY-REPORT', 'Daily Behavior Report Card Protocol', 'protocol', 'staff_response',
 $$Implement a daily report card system that tracks 2-4 specific target behaviors across the school day, with clear criteria, visual ratings, and home-school communication.$$,
 $$Define behaviors in observable terms. Use a simple rating scale. Send home daily. Pair with home-based reinforcement when possible. Review and adjust targets regularly.$$,
 '{attention,escape}', '{noncompliance,off_task,disruption,task_refusal}', '{classroom,home}', 307, true),

-- === NEW DATA RECOMMENDATIONS (5 net-new) ===
('SUP-DATA-REPLACEMENT-RATE', 'Track Replacement Behavior Rate', 'data_recommendation', 'data',
 $$Collect data on the frequency or rate of the student''s use of identified replacement behaviors to evaluate whether functional alternatives are being acquired and used spontaneously.$$,
 $$Track alongside problem behavior data. Note prompted vs. independent use. Graph both to show inverse relationship over time.$$,
 '{attention,escape,tangible,automatic}', '{noncompliance,aggression,task_refusal,disruption}', '{classroom,resource_room}', 400, true),

('SUP-DATA-PRECURSOR', 'Track Precursor Behaviors', 'data_recommendation', 'data',
 $$Identify and systematically track precursor behaviors (early warning signs) that reliably precede more intense behavioral episodes to support proactive intervention.$$,
 $$Define 2-3 specific precursors. Track timing and context. Use data to adjust antecedent supports. Share precursor list with all staff.$$,
 '{automatic,escape}', '{aggression,self_injury,dysregulation,tantrum}', '{classroom,resource_room}', 401, true),

('SUP-DATA-RECOVERY-TIME', 'Track Recovery Time', 'data_recommendation', 'data',
 $$Measure the duration from peak behavioral escalation to return to baseline or task engagement to evaluate the effectiveness of de-escalation strategies over time.$$,
 $$Define what return to baseline looks like. Use a timer or estimate in minutes. Graph trends weekly. Consider recovery time as a primary outcome measure.$$,
 '{automatic,escape}', '{aggression,tantrum,dysregulation,self_injury}', '{classroom,resource_room}', 402, true),

('SUP-DATA-STRATEGY-FIDELITY', 'Track Strategy Implementation Fidelity', 'data_recommendation', 'data',
 $$Collect periodic fidelity data on whether staff are implementing recommended strategies as designed, including antecedent supports, reinforcement schedules, and response protocols.$$,
 $$Use a simple checklist format. Collect weekly or biweekly. Share results with the team. Use for coaching and problem-solving, not evaluation.$$,
 '{attention,escape,tangible,automatic}', '{noncompliance,aggression,task_refusal,disruption}', '{classroom,resource_room}', 403, true),

('SUP-DATA-GENERALIZATION', 'Track Generalization Across Settings', 'data_recommendation', 'data',
 $$Collect comparison data across multiple settings, staff, or time periods to evaluate whether behavioral improvements are generalizing beyond the primary intervention setting.$$,
 $$Use consistent measurement across settings. Compare with baseline data. Identify settings where generalization has not occurred for targeted intervention.$$,
 '{attention,escape,tangible,automatic}', '{noncompliance,aggression,off_task}', '{classroom,recess,cafeteria,resource_room}', 404, true),

-- === NEW CAREGIVER SUPPORTS (3 net-new) ===
('SUP-CARE-DAILY-REPORT', 'Home-School Daily Report Exchange', 'caregiver_support', 'home_carryover',
 $$Establish a daily communication system between school and home that shares behavioral data, successes, and strategies used so caregivers can reinforce progress and maintain consistency.$$,
 $$Keep the format simple and strengths-based. Include 1-2 target behaviors and the day''s rating. Provide space for caregiver notes. Can be paper or digital.$$,
 '{attention,escape}', '{noncompliance,disruption,off_task}', '{home,classroom}', 500, true),

('SUP-CARE-CRISIS-PLAN', 'Caregiver Crisis Response Guide', 'caregiver_support', 'home_carryover',
 $$Provide caregivers with a clear, step-by-step guide for responding to behavioral crises at home, including de-escalation strategies, safety priorities, and when to seek additional support.$$,
 $$Write in plain language. Include specific actions, not just principles. Review and practice with the family. Update as the student''s needs change.$$,
 '{automatic,escape}', '{aggression,self_injury,elopement,tantrum}', '{home}', 501, true),

('SUP-CARE-REGULATION-TOOLKIT', 'Home Regulation Toolkit Guide', 'caregiver_support', 'home_carryover',
 $$Provide caregivers with a curated set of regulation strategies that mirror school-based approaches, including sensory tools, visual supports, and calming routines for use in the home environment.$$,
 $$Include visuals and step-by-step instructions. Recommend commercially available tools when applicable. Schedule periodic check-ins to troubleshoot and update.$$,
 '{automatic}', '{dysregulation,tantrum,self_injury}', '{home}', 502, true),

-- === NEW CONTRAINDICATIONS (3 net-new) ===
('SUP-AVOID-FORCED-APOLOGY', 'Avoid Forced or Scripted Apologies', 'contraindication', 'avoid_response_pattern',
 $$Do not require the student to immediately apologize or perform a scripted apology during or immediately after a behavioral episode, as this can escalate the situation and does not build genuine social repair skills.$$,
 $$Allow time for regulation before addressing repair. Teach apology and repair skills during calm instructional times. Support genuine, student-initiated repair when ready.$$,
 '{attention,escape}', '{aggression,verbal_aggression,peer_conflict}', '{classroom,recess}', 600, true),

('SUP-AVOID-PEER-COMPARISON', 'Avoid Public Peer Comparisons', 'contraindication', 'avoid_response_pattern',
 $$Do not compare the student''s behavior to peers as a motivational strategy, as this can increase shame, damage self-concept, and escalate problem behavior rather than promote change.$$,
 $$Use individualized goal-setting instead. Compare the student''s performance to their own baseline. Celebrate personal progress privately.$$,
 '{attention,escape}', '{disruption,noncompliance,verbal_aggression}', '{classroom}', 601, true),

('SUP-AVOID-CONTINGENT-REMOVAL', 'Avoid Contingent Removal of Regulation Tools', 'contraindication', 'avoid_response_pattern',
 $$Do not remove access to regulation tools, sensory supports, or calming spaces as a consequence for problem behavior, as this removes the student''s ability to self-regulate and may escalate behavior.$$,
 $$Regulation supports are not privileges. Maintain access regardless of behavior. Address the behavior separately from the student''s regulatory needs.$$,
 '{automatic,escape}', '{dysregulation,aggression,self_injury}', '{classroom,resource_room}', 602, true)

ON CONFLICT (support_code) DO NOTHING;
