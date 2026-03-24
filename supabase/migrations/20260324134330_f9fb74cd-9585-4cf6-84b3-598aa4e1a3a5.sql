
-- Populate BOPS question bank with real clinical item text
-- Domain: threat (items 1-12)
UPDATE bops_question_bank SET item_text = 'Becomes visibly distressed when routines or expectations change without warning' WHERE item_number = 1;
UPDATE bops_question_bank SET item_text = 'Freezes or shuts down when feeling overwhelmed by demands' WHERE item_number = 2;
UPDATE bops_question_bank SET item_text = 'Avoids new situations or unfamiliar people' WHERE item_number = 3;
UPDATE bops_question_bank SET item_text = 'Shows heightened startle response to unexpected sounds or movements' WHERE item_number = 4;
UPDATE bops_question_bank SET item_text = 'Becomes clingy or seeks proximity to familiar adults when stressed' WHERE item_number = 5;
UPDATE bops_question_bank SET item_text = 'Refuses to enter new environments without extensive preparation' WHERE item_number = 6;
UPDATE bops_question_bank SET item_text = 'Displays hypervigilance or scanning behavior in group settings' WHERE item_number = 7;
UPDATE bops_question_bank SET item_text = 'Overreacts to minor corrections or perceived criticism' WHERE item_number = 8;
UPDATE bops_question_bank SET item_text = 'Physically tenses or braces when approached unexpectedly' WHERE item_number = 9;
UPDATE bops_question_bank SET item_text = 'Needs repeated reassurance that activities are safe before participating' WHERE item_number = 10;
UPDATE bops_question_bank SET item_text = 'Becomes agitated when unable to see or locate a preferred adult' WHERE item_number = 11;
UPDATE bops_question_bank SET item_text = 'Exhibits escape behaviors when perceiving social threat or rejection' WHERE item_number = 12;

-- Domain: withdrawal (items 13-24)
UPDATE bops_question_bank SET item_text = 'Withdraws from group activities even when invited' WHERE item_number = 13;
UPDATE bops_question_bank SET item_text = 'Appears emotionally flat or disengaged during interactions' WHERE item_number = 14;
UPDATE bops_question_bank SET item_text = 'Avoids eye contact or turns away when spoken to' WHERE item_number = 15;
UPDATE bops_question_bank SET item_text = 'Prefers solitary activities over social engagement' WHERE item_number = 16;
UPDATE bops_question_bank SET item_text = 'Rarely initiates conversation or play with peers' WHERE item_number = 17;
UPDATE bops_question_bank SET item_text = 'Becomes unresponsive or dissociative under moderate stress' WHERE item_number = 18;
UPDATE bops_question_bank SET item_text = 'Fails to respond when name is called in group settings' WHERE item_number = 19;
UPDATE bops_question_bank SET item_text = 'Shows limited facial expression or emotional range' WHERE item_number = 20;
UPDATE bops_question_bank SET item_text = 'Passively complies but shows no engagement with tasks' WHERE item_number = 21;
UPDATE bops_question_bank SET item_text = 'Isolates self physically from peers during free time' WHERE item_number = 22;
UPDATE bops_question_bank SET item_text = 'Stops responding to prompts after initial non-response' WHERE item_number = 23;
UPDATE bops_question_bank SET item_text = 'Shuts down or goes silent when emotionally overwhelmed' WHERE item_number = 24;

-- Domain: sensory (items 25-36)
UPDATE bops_question_bank SET item_text = 'Covers ears or becomes distressed with loud or unexpected sounds' WHERE item_number = 25;
UPDATE bops_question_bank SET item_text = 'Seeks intense physical input such as crashing, jumping, or squeezing' WHERE item_number = 26;
UPDATE bops_question_bank SET item_text = 'Avoids certain textures in food, clothing, or materials' WHERE item_number = 27;
UPDATE bops_question_bank SET item_text = 'Becomes overstimulated in visually busy environments' WHERE item_number = 28;
UPDATE bops_question_bank SET item_text = 'Mouths or chews on non-food items frequently' WHERE item_number = 29;
UPDATE bops_question_bank SET item_text = 'Has difficulty transitioning from high-stimulation to calm activities' WHERE item_number = 30;
UPDATE bops_question_bank SET item_text = 'Displays repetitive motor movements such as hand flapping or rocking' WHERE item_number = 31;
UPDATE bops_question_bank SET item_text = 'Resists grooming activities like hair brushing or nail cutting' WHERE item_number = 32;
UPDATE bops_question_bank SET item_text = 'Seeks out or avoids specific smells in the environment' WHERE item_number = 33;
UPDATE bops_question_bank SET item_text = 'Struggles to sit still or remain in one position for expected periods' WHERE item_number = 34;
UPDATE bops_question_bank SET item_text = 'Becomes dysregulated in environments with mixed sensory input' WHERE item_number = 35;
UPDATE bops_question_bank SET item_text = 'Shows strong preference for or avoidance of specific lighting conditions' WHERE item_number = 36;

-- Domain: emotion (items 37-48)
UPDATE bops_question_bank SET item_text = 'Escalates rapidly from calm to intense emotional outbursts' WHERE item_number = 37;
UPDATE bops_question_bank SET item_text = 'Cries or becomes tearful with minimal provocation' WHERE item_number = 38;
UPDATE bops_question_bank SET item_text = 'Has difficulty returning to baseline after emotional upset' WHERE item_number = 39;
UPDATE bops_question_bank SET item_text = 'Emotional intensity does not match the significance of the triggering event' WHERE item_number = 40;
UPDATE bops_question_bank SET item_text = 'Displays frustration through physical actions such as stomping or throwing' WHERE item_number = 41;
UPDATE bops_question_bank SET item_text = 'Becomes emotionally overwhelmed during transitions between activities' WHERE item_number = 42;
UPDATE bops_question_bank SET item_text = 'Shows sudden mood shifts without clear environmental trigger' WHERE item_number = 43;
UPDATE bops_question_bank SET item_text = 'Has difficulty identifying or labeling own emotions' WHERE item_number = 44;
UPDATE bops_question_bank SET item_text = 'Responds to frustration with prolonged screaming or wailing' WHERE item_number = 45;
UPDATE bops_question_bank SET item_text = 'Cannot tolerate losing games or competition without major upset' WHERE item_number = 46;
UPDATE bops_question_bank SET item_text = 'Shows jealousy or distress when attention is given to others' WHERE item_number = 47;
UPDATE bops_question_bank SET item_text = 'Requires extensive adult co-regulation to return to calm state' WHERE item_number = 48;

-- Domain: impulse (items 49-60)
UPDATE bops_question_bank SET item_text = 'Acts before considering consequences of behavior' WHERE item_number = 49;
UPDATE bops_question_bank SET item_text = 'Has difficulty waiting for turns in structured activities' WHERE item_number = 50;
UPDATE bops_question_bank SET item_text = 'Interrupts conversations or activities of others frequently' WHERE item_number = 51;
UPDATE bops_question_bank SET item_text = 'Grabs items from others without asking' WHERE item_number = 52;
UPDATE bops_question_bank SET item_text = 'Blurts out answers before questions are completed' WHERE item_number = 53;
UPDATE bops_question_bank SET item_text = 'Leaves assigned area without permission' WHERE item_number = 54;
UPDATE bops_question_bank SET item_text = 'Engages in unsafe physical behaviors without apparent awareness of risk' WHERE item_number = 55;
UPDATE bops_question_bank SET item_text = 'Has difficulty stopping an activity once started' WHERE item_number = 56;
UPDATE bops_question_bank SET item_text = 'Makes impulsive choices that lead to peer conflict' WHERE item_number = 57;
UPDATE bops_question_bank SET item_text = 'Touches objects or people without considering appropriateness' WHERE item_number = 58;
UPDATE bops_question_bank SET item_text = 'Shifts rapidly between activities without completing tasks' WHERE item_number = 59;
UPDATE bops_question_bank SET item_text = 'Responds to minor frustration with immediate physical action' WHERE item_number = 60;

-- Domain: autonomy (items 61-72)
UPDATE bops_question_bank SET item_text = 'Insists on doing tasks independently even when help is needed' WHERE item_number = 61;
UPDATE bops_question_bank SET item_text = 'Resists adult-directed activities in favor of self-chosen ones' WHERE item_number = 62;
UPDATE bops_question_bank SET item_text = 'Negotiates or bargains excessively before complying with requests' WHERE item_number = 63;
UPDATE bops_question_bank SET item_text = 'Becomes upset when not given a choice in daily activities' WHERE item_number = 64;
UPDATE bops_question_bank SET item_text = 'Refuses to follow group expectations that differ from personal preference' WHERE item_number = 65;
UPDATE bops_question_bank SET item_text = 'Attempts to control the behavior or choices of peers' WHERE item_number = 66;
UPDATE bops_question_bank SET item_text = 'Engages in vocal protest or argument when given a directive' WHERE item_number = 67;
UPDATE bops_question_bank SET item_text = 'Becomes distressed when personal space or belongings are managed by others' WHERE item_number = 68;
UPDATE bops_question_bank SET item_text = 'Requires options or embedded choice to increase compliance' WHERE item_number = 69;
UPDATE bops_question_bank SET item_text = 'Demonstrates passive noncompliance by ignoring or delaying responses' WHERE item_number = 70;
UPDATE bops_question_bank SET item_text = 'Shuts down when given too many instructions at once' WHERE item_number = 71;
UPDATE bops_question_bank SET item_text = 'Tests boundaries repeatedly to determine flexibility of rules' WHERE item_number = 72;

-- Domain: authority (items 73-84)
UPDATE bops_question_bank SET item_text = 'Directly challenges or argues with authority figures' WHERE item_number = 73;
UPDATE bops_question_bank SET item_text = 'Refuses to follow instructions from specific adults' WHERE item_number = 74;
UPDATE bops_question_bank SET item_text = 'Uses profanity or disrespectful language toward staff' WHERE item_number = 75;
UPDATE bops_question_bank SET item_text = 'Deliberately does the opposite of what is asked' WHERE item_number = 76;
UPDATE bops_question_bank SET item_text = 'Becomes hostile when given corrective feedback' WHERE item_number = 77;
UPDATE bops_question_bank SET item_text = 'Threatens adults verbally when limits are set' WHERE item_number = 78;
UPDATE bops_question_bank SET item_text = 'Attempts to embarrass or undermine adults in front of peers' WHERE item_number = 79;
UPDATE bops_question_bank SET item_text = 'Escalates behavior when adult authority is asserted' WHERE item_number = 80;
UPDATE bops_question_bank SET item_text = 'Shows contempt or dismissiveness toward rules and expectations' WHERE item_number = 81;
UPDATE bops_question_bank SET item_text = 'Complies only when specific preferred staff are present' WHERE item_number = 82;
UPDATE bops_question_bank SET item_text = 'Displays power-seeking behavior during structured activities' WHERE item_number = 83;
UPDATE bops_question_bank SET item_text = 'Engages in covert rule-breaking while appearing compliant' WHERE item_number = 84;

-- Domain: rigidity (items 85-96)
UPDATE bops_question_bank SET item_text = 'Insists on following exact routines and becomes upset with deviations' WHERE item_number = 85;
UPDATE bops_question_bank SET item_text = 'Corrects others who do not follow rules precisely' WHERE item_number = 86;
UPDATE bops_question_bank SET item_text = 'Has difficulty accepting alternative solutions to problems' WHERE item_number = 87;
UPDATE bops_question_bank SET item_text = 'Becomes distressed when materials or items are not in expected locations' WHERE item_number = 88;
UPDATE bops_question_bank SET item_text = 'Repeats the same question after already receiving an answer' WHERE item_number = 89;
UPDATE bops_question_bank SET item_text = 'Refuses to try new approaches even when current strategy is failing' WHERE item_number = 90;
UPDATE bops_question_bank SET item_text = 'Fixates on perceived unfairness and cannot let go' WHERE item_number = 91;
UPDATE bops_question_bank SET item_text = 'Requires extensive preparation for any schedule changes' WHERE item_number = 92;
UPDATE bops_question_bank SET item_text = 'Becomes rigid about seating, order of activities, or personal space' WHERE item_number = 93;
UPDATE bops_question_bank SET item_text = 'Shows difficulty with open-ended or unstructured tasks' WHERE item_number = 94;
UPDATE bops_question_bank SET item_text = 'Interprets rules literally and cannot understand exceptions' WHERE item_number = 95;
UPDATE bops_question_bank SET item_text = 'Becomes upset when winning or losing does not follow expected pattern' WHERE item_number = 96;

-- Domain: social (items 97-108)
UPDATE bops_question_bank SET item_text = 'Misreads social cues leading to inappropriate responses' WHERE item_number = 97;
UPDATE bops_question_bank SET item_text = 'Has difficulty maintaining reciprocal conversations' WHERE item_number = 98;
UPDATE bops_question_bank SET item_text = 'Invades personal space of peers without awareness' WHERE item_number = 99;
UPDATE bops_question_bank SET item_text = 'Makes comments that are socially inappropriate for the context' WHERE item_number = 100;
UPDATE bops_question_bank SET item_text = 'Struggles to understand why peers react negatively to behaviors' WHERE item_number = 101;
UPDATE bops_question_bank SET item_text = 'Difficulty sharing materials or taking turns in social play' WHERE item_number = 102;
UPDATE bops_question_bank SET item_text = 'Uses aggression or coercion as primary social strategy' WHERE item_number = 103;
UPDATE bops_question_bank SET item_text = 'Has difficulty reading facial expressions or tone of voice' WHERE item_number = 104;
UPDATE bops_question_bank SET item_text = 'Engages in attention-seeking behaviors that disrupt peers' WHERE item_number = 105;
UPDATE bops_question_bank SET item_text = 'Shows interest in peers but lacks skills to initiate or maintain interaction' WHERE item_number = 106;
UPDATE bops_question_bank SET item_text = 'Misinterprets neutral interactions as hostile or threatening' WHERE item_number = 107;
UPDATE bops_question_bank SET item_text = 'Demonstrates difficulty with cooperative group tasks' WHERE item_number = 108;

-- Domain: context (items 109-120)
UPDATE bops_question_bank SET item_text = 'Behavior changes dramatically based on who is present' WHERE item_number = 109;
UPDATE bops_question_bank SET item_text = 'Performs well in one setting but not in others with similar demands' WHERE item_number = 110;
UPDATE bops_question_bank SET item_text = 'Behavior is significantly worse during transitions between environments' WHERE item_number = 111;
UPDATE bops_question_bank SET item_text = 'Shows different behavioral presentation with different staff members' WHERE item_number = 112;
UPDATE bops_question_bank SET item_text = 'Adapts behavior strategically based on perceived consequences' WHERE item_number = 113;
UPDATE bops_question_bank SET item_text = 'Behavioral challenges emerge primarily during unstructured time' WHERE item_number = 114;
UPDATE bops_question_bank SET item_text = 'Demonstrates context-dependent compliance patterns' WHERE item_number = 115;
UPDATE bops_question_bank SET item_text = 'Shows marked improvement when environmental conditions change' WHERE item_number = 116;
UPDATE bops_question_bank SET item_text = 'Behavior varies based on time of day or fatigue level' WHERE item_number = 117;
UPDATE bops_question_bank SET item_text = 'Performs differently when being observed versus unobserved' WHERE item_number = 118;
UPDATE bops_question_bank SET item_text = 'Responds better to specific types of instructional formats' WHERE item_number = 119;
UPDATE bops_question_bank SET item_text = 'Behavior worsens when environmental predictability decreases' WHERE item_number = 120;

-- Domain: navigator (items 121-128)
UPDATE bops_question_bank SET item_text = 'Uses self-calming strategies independently when frustrated' WHERE item_number = 121;
UPDATE bops_question_bank SET item_text = 'Can identify own emotional state and request support' WHERE item_number = 122;
UPDATE bops_question_bank SET item_text = 'Responds to redirection with appropriate behavior change' WHERE item_number = 123;
UPDATE bops_question_bank SET item_text = 'Recovers from setbacks within a developmentally expected timeframe' WHERE item_number = 124;
UPDATE bops_question_bank SET item_text = 'Uses verbal problem-solving before resorting to physical behavior' WHERE item_number = 125;
UPDATE bops_question_bank SET item_text = 'Accepts feedback and modifies behavior accordingly' WHERE item_number = 126;
UPDATE bops_question_bank SET item_text = 'Demonstrates flexibility when preferred plans or activities change' WHERE item_number = 127;
UPDATE bops_question_bank SET item_text = 'Can delay gratification when given a clear timeline' WHERE item_number = 128;

-- Domain: storm (items 129-136)
UPDATE bops_question_bank SET item_text = 'Exhibits multiple behavior types simultaneously during escalation' WHERE item_number = 129;
UPDATE bops_question_bank SET item_text = 'Requires intensive staff support to manage daily behavioral episodes' WHERE item_number = 130;
UPDATE bops_question_bank SET item_text = 'Displays unpredictable combinations of aggression, withdrawal, and emotional dysregulation' WHERE item_number = 131;
UPDATE bops_question_bank SET item_text = 'Has difficulty functioning across all settings throughout the day' WHERE item_number = 132;
UPDATE bops_question_bank SET item_text = 'Engages in crisis-level behavior multiple times per week' WHERE item_number = 133;
UPDATE bops_question_bank SET item_text = 'Behavioral episodes are resistant to standard intervention strategies' WHERE item_number = 134;
UPDATE bops_question_bank SET item_text = 'Demonstrates global dysregulation affecting academic, social, and daily living skills' WHERE item_number = 135;
UPDATE bops_question_bank SET item_text = 'Requires modified schedule or environment due to severity of behavioral presentation' WHERE item_number = 136;
