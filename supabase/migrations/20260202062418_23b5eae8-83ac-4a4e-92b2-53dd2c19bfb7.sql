-- VB-MAPP Form Templates (Milestones and Barriers assessments)
CREATE TABLE public.vbmapp_form_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  form_code TEXT NOT NULL,
  form_name TEXT NOT NULL,
  form_type TEXT NOT NULL, -- 'milestones' or 'barriers'
  description TEXT,
  level TEXT, -- Level 1, 2, 3 for milestones
  age_range TEXT,
  domains JSONB NOT NULL DEFAULT '[]'::jsonb,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  scoring_info JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- VB-MAPP Assessments (linking assessments to students)
CREATE TABLE public.vbmapp_assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  form_template_id UUID REFERENCES public.vbmapp_form_templates(id),
  invitation_id UUID REFERENCES public.questionnaire_invitations(id),
  date_administered DATE NOT NULL DEFAULT CURRENT_DATE,
  administered_by UUID,
  respondent_name TEXT,
  respondent_relationship TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  raw_responses JSONB,
  domain_scores JSONB,
  milestone_scores JSONB,
  barrier_scores JSONB,
  notes TEXT,
  scored_at TIMESTAMPTZ,
  scored_by UUID,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Socially Savvy Form Templates
CREATE TABLE public.socially_savvy_form_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  form_code TEXT NOT NULL,
  form_name TEXT NOT NULL,
  description TEXT,
  domains JSONB NOT NULL DEFAULT '[]'::jsonb,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  scoring_info JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Socially Savvy Assessments
CREATE TABLE public.socially_savvy_assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  form_template_id UUID REFERENCES public.socially_savvy_form_templates(id),
  invitation_id UUID REFERENCES public.questionnaire_invitations(id),
  date_administered DATE NOT NULL DEFAULT CURRENT_DATE,
  administered_by UUID,
  respondent_name TEXT,
  respondent_relationship TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  raw_responses JSONB,
  domain_scores JSONB,
  notes TEXT,
  scored_at TIMESTAMPTZ,
  scored_by UUID,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vbmapp_form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vbmapp_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.socially_savvy_form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.socially_savvy_assessments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for form templates (readable by all authenticated users)
CREATE POLICY "Form templates viewable by authenticated users" 
ON public.vbmapp_form_templates FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Socially savvy templates viewable by authenticated users" 
ON public.socially_savvy_form_templates FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- RLS Policies for assessments (based on student access)
CREATE POLICY "Users can view VB-MAPP assessments for their students" 
ON public.vbmapp_assessments FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.students 
    WHERE id = student_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert VB-MAPP assessments for their students" 
ON public.vbmapp_assessments FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.students 
    WHERE id = student_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can update VB-MAPP assessments for their students" 
ON public.vbmapp_assessments FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.students 
    WHERE id = student_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete VB-MAPP assessments for their students" 
ON public.vbmapp_assessments FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.students 
    WHERE id = student_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can view Socially Savvy assessments for their students" 
ON public.socially_savvy_assessments FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.students 
    WHERE id = student_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert Socially Savvy assessments for their students" 
ON public.socially_savvy_assessments FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.students 
    WHERE id = student_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can update Socially Savvy assessments for their students" 
ON public.socially_savvy_assessments FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.students 
    WHERE id = student_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete Socially Savvy assessments for their students" 
ON public.socially_savvy_assessments FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.students 
    WHERE id = student_id AND user_id = auth.uid()
  )
);

-- Insert VB-MAPP form templates with the parsed milestone/barrier data
INSERT INTO public.vbmapp_form_templates (form_code, form_name, form_type, level, age_range, description, domains, questions, scoring_info)
VALUES 
  -- VB-MAPP Milestones Level 1
  ('VBMAPP-M1', 'VB-MAPP Milestones - Level 1', 'milestones', 'Level 1', '0-18 months', 
   'Milestones assessment for developmental level equivalent to 0-18 months',
   '["Mand", "Tact", "Listener Responding", "Visual Perceptual Skills/Match-to-Sample", "Independent Play", "Social Behavior and Social Play", "Motor Imitation", "Echoic", "Vocal Behavior"]'::jsonb,
   '[
     {"code": "MAND-1", "domain": "Mand", "text": "Emits 2 words, signs, or PECS, but may require echoic, imitative, or other prompts but no physical prompts", "milestone": 1},
     {"code": "MAND-2", "domain": "Mand", "text": "Emits 4 different mands without prompts (except What do you want?) — the desired item can be present", "milestone": 2},
     {"code": "MAND-3", "domain": "Mand", "text": "Generalizes 6 mands across 2 people, 2 settings, and 2 different examples of a reinforcer", "milestone": 3},
     {"code": "MAND-4", "domain": "Mand", "text": "Spontaneously emits (no verbal prompts) 5 mands — the desired item can be present", "milestone": 4},
     {"code": "MAND-5", "domain": "Mand", "text": "Emits 10 different mands without prompts (except What do you want?) — the desired item can be present", "milestone": 5},
     {"code": "TACT-1", "domain": "Tact", "text": "Tacts 2 reinforcing items (e.g., people, pets, characters, or favorite objects)", "milestone": 1},
     {"code": "TACT-2", "domain": "Tact", "text": "Tacts any 4 items (e.g., people, pets, characters, or other objects)", "milestone": 2},
     {"code": "TACT-3", "domain": "Tact", "text": "Tacts 6 non-reinforcing items (e.g., shoe, hat, spoon, car, cup, bed)", "milestone": 3},
     {"code": "TACT-4", "domain": "Tact", "text": "Spontaneously tacts (no verbal prompts) 2 different items", "milestone": 4},
     {"code": "TACT-5", "domain": "Tact", "text": "Tacts 10 items (e.g., common objects, people, body parts, or pictures)", "milestone": 5}
   ]'::jsonb,
   '{"max_score_per_milestone": 1, "scoring_method": "0, 0.5, 1"}'::jsonb),

  -- VB-MAPP Milestones Level 2
  ('VBMAPP-M2', 'VB-MAPP Milestones - Level 2', 'milestones', 'Level 2', '18-30 months',
   'Milestones assessment for developmental level equivalent to 18-30 months',
   '["Mand", "Tact", "Listener Responding", "Visual Perceptual Skills/Match-to-Sample", "Independent Play", "Social Behavior and Social Play", "Motor Imitation", "Echoic", "Listener Responding by Function, Feature, Class", "Intraverbal", "Classroom Routines and Group Skills", "Linguistic Structure"]'::jsonb,
   '[
     {"code": "MAND-6", "domain": "Mand", "text": "Mands for 20 different missing items without prompts (except What do you need?)", "milestone": 6},
     {"code": "MAND-7", "domain": "Mand", "text": "Mands for others to emit 5 different actions without prompts", "milestone": 7},
     {"code": "MAND-8", "domain": "Mand", "text": "Mands for 5 different actions, items, or information using 2-word phrases", "milestone": 8},
     {"code": "MAND-9", "domain": "Mand", "text": "Spontaneously emits 15 different mands", "milestone": 9},
     {"code": "MAND-10", "domain": "Mand", "text": "Mands using 100 different words, signs, or phrases", "milestone": 10}
   ]'::jsonb,
   '{"max_score_per_milestone": 1, "scoring_method": "0, 0.5, 1"}'::jsonb),

  -- VB-MAPP Milestones Level 3
  ('VBMAPP-M3', 'VB-MAPP Milestones - Level 3', 'milestones', 'Level 3', '30-48 months',
   'Milestones assessment for developmental level equivalent to 30-48 months',
   '["Mand", "Tact", "Listener Responding", "Visual Perceptual Skills/Match-to-Sample", "Independent Play", "Social Behavior and Social Play", "Reading", "Writing", "Listener Responding by Function, Feature, Class", "Intraverbal", "Classroom Routines and Group Skills", "Linguistic Structure", "Math"]'::jsonb,
   '[
     {"code": "MAND-11", "domain": "Mand", "text": "Spontaneously emits mands that contain 2 or more words (other than no) 5 times per hour", "milestone": 11},
     {"code": "MAND-12", "domain": "Mand", "text": "Mands for information using a WH question 2 times", "milestone": 12},
     {"code": "MAND-13", "domain": "Mand", "text": "Mands for 10 different items, actions, or information using an adjective, preposition, or adverb", "milestone": 13},
     {"code": "MAND-14", "domain": "Mand", "text": "Mands for information using 7 different WH questions", "milestone": 14},
     {"code": "MAND-15", "domain": "Mand", "text": "Mands with 10 different mand frames: Can you..., Do you have..., Will you..., etc.", "milestone": 15}
   ]'::jsonb,
   '{"max_score_per_milestone": 1, "scoring_method": "0, 0.5, 1"}'::jsonb),

  -- VB-MAPP Barriers Assessment
  ('VBMAPP-B', 'VB-MAPP Barriers Assessment', 'barriers', NULL, 'All ages',
   'Assessment of learning and language acquisition barriers',
   '["Negative Behaviors", "Instructional Control", "Mand Repertoire", "Tact Repertoire", "Echoic Repertoire", "Imitation Repertoire", "Visual Perceptual Skills", "Listener Repertoire", "Intraverbal Repertoire", "Social Skills", "Prompt Dependency", "Scrolling", "Scanning", "Conditional Discriminations", "Failure to Generalize", "Weak Motivators", "Response Requirements", "Reinforcer Dependency", "Self-Stimulation", "Articulation", "Obsessive-Compulsive", "Hyperactive", "Failure to Make Eye Contact", "Sensory Defensiveness"]'::jsonb,
   '[
     {"code": "B1", "domain": "Negative Behaviors", "text": "Does not demonstrate any significant negative behaviors", "score_level": 0},
     {"code": "B1", "domain": "Negative Behaviors", "text": "Engages in some minor negative behaviors weekly, but recovery is quick", "score_level": 1},
     {"code": "B1", "domain": "Negative Behaviors", "text": "Emits a variety of minor negative behaviors daily (e.g., crying, verbal refusal, falling to the floor)", "score_level": 2},
     {"code": "B1", "domain": "Negative Behaviors", "text": "Emits more severe negative behavior daily (e.g., tantrums, throwing things, property destruction)", "score_level": 3},
     {"code": "B1", "domain": "Negative Behaviors", "text": "Often emits severe negative behavior that is a danger to himself or others (e.g., aggression, self-injury)", "score_level": 4},
     {"code": "B2", "domain": "Instructional Control", "text": "Typically cooperative with adult instructions and demands", "score_level": 0},
     {"code": "B2", "domain": "Instructional Control", "text": "Some demands will evoke minor noncompliant behavior, but recovery is quick", "score_level": 1},
     {"code": "B2", "domain": "Instructional Control", "text": "Emits noncompliant behavior a few times a day, with minor tantrums, or other minor behaviors", "score_level": 2},
     {"code": "B2", "domain": "Instructional Control", "text": "Emits noncompliant behavior several times a day, with longer tantrums and more severe behaviors", "score_level": 3},
     {"code": "B2", "domain": "Instructional Control", "text": "Noncompliant behavior dominates the child day, negative behaviors can be severe and dangerous", "score_level": 4}
   ]'::jsonb,
   '{"score_range": "0-4", "scoring_key": "0 = No problem; 1 = Occasional problem; 2 = Moderate problem; 3 = Persistent problem; 4 = Severe problem"}'::jsonb);

-- Insert Socially Savvy form templates
INSERT INTO public.socially_savvy_form_templates (form_code, form_name, description, domains, questions, scoring_info)
VALUES 
  ('SS-FULL', 'Socially Savvy Checklist - Complete', 
   'Comprehensive social skills assessment across all domains',
   '["Joint Attending", "Social Play", "Self-Regulation", "Social/Emotional", "Social Language", "Classroom/Group Behavior", "Nonverbal Social Language"]'::jsonb,
   '[
     {"code": "JA1", "domain": "Joint Attending", "text": "Orients (e.g. looks or makes a related response) when an object is presented"},
     {"code": "JA2", "domain": "Joint Attending", "text": "Repeats own behavior to maintain social interaction"},
     {"code": "JA3", "domain": "Joint Attending", "text": "Repeats action with toy to maintain social interaction"},
     {"code": "JA4", "domain": "Joint Attending", "text": "Uses eye gaze to maintain social interaction"},
     {"code": "JA5", "domain": "Joint Attending", "text": "Follows point or gesture to objects"},
     {"code": "JA6", "domain": "Joint Attending", "text": "Follows eye gaze to objects"},
     {"code": "JA7", "domain": "Joint Attending", "text": "Shows others objects and makes eye contact to share interest"},
     {"code": "JA8", "domain": "Joint Attending", "text": "Points to objects and makes eye contact to share interest"},
     {"code": "JA9", "domain": "Joint Attending", "text": "Comments on what self or others are doing"},
     {"code": "SP1", "domain": "Social Play", "text": "Engages in social interactive games (e.g. Peek-a-Boo, tickling game)"},
     {"code": "SP2", "domain": "Social Play", "text": "Plays parallel for five to ten minutes, close to peers with close-ended toys"},
     {"code": "SP3", "domain": "Social Play", "text": "Plays parallel for five to ten minutes, close to peers with open-ended toys"},
     {"code": "SP4", "domain": "Social Play", "text": "Shares toys/materials"},
     {"code": "SP5", "domain": "Social Play", "text": "Plays cooperatively for five to ten minutes with close-ended toys"},
     {"code": "SP6", "domain": "Social Play", "text": "Plays cooperatively for five to ten minutes with open-ended toys"},
     {"code": "SP7", "domain": "Social Play", "text": "Takes turns as part of a structured game and sustains attention until completion"},
     {"code": "SP8", "domain": "Social Play", "text": "Plays outdoor games with a group until completion"},
     {"code": "SP9", "domain": "Social Play", "text": "Stops action when requested by a peer"},
     {"code": "SP10", "domain": "Social Play", "text": "Ends structured play/game with peer appropriately"},
     {"code": "SP11", "domain": "Social Play", "text": "Takes roles in imaginative play and sustains it for up to three to five actions"},
     {"code": "SP12", "domain": "Social Play", "text": "Trades toys/materials"},
     {"code": "SP13", "domain": "Social Play", "text": "Invites peer to play in a preferred activity"},
     {"code": "SP14", "domain": "Social Play", "text": "Approaches peers and appropriately joins in the ongoing activity"},
     {"code": "SP15", "domain": "Social Play", "text": "Accepts invitation to play in an activity of peer choice"},
     {"code": "SP16", "domain": "Social Play", "text": "Accepts losing games or getting called out"},
     {"code": "SP17", "domain": "Social Play", "text": "Remains appropriately engaged during unstructured times"},
     {"code": "SP18", "domain": "Social Play", "text": "Follows changes in play ideas of others and sustains the changes"},
     {"code": "SP19", "domain": "Social Play", "text": "Appropriately plays games involving a person being it"},
     {"code": "SP20", "domain": "Social Play", "text": "Demonstrates flexibility in following changes in game rules"},
     {"code": "SP21", "domain": "Social Play", "text": "Plans a play scheme with a peer and follows it through"},
     {"code": "SP22", "domain": "Social Play", "text": "Identifies children who are their friends and can explain why"},
     {"code": "SP23", "domain": "Social Play", "text": "Appropriately accepts that others likes may be different from their own"},
     {"code": "SP24", "domain": "Social Play", "text": "Wins without making bragging comments/gestures"},
     {"code": "SR1", "domain": "Self-Regulation", "text": "Demonstrates flexibility with new tasks/activities"},
     {"code": "SR2", "domain": "Self-Regulation", "text": "Appropriately handles denied requests"},
     {"code": "SR3", "domain": "Self-Regulation", "text": "Raises hand and waits to be called before speaking"},
     {"code": "SR4", "domain": "Self-Regulation", "text": "Responds to calming strategies prompted by an adult"},
     {"code": "SR5", "domain": "Self-Regulation", "text": "Identifies when upset/frustrated and asks for a break or calming item"},
     {"code": "SR6", "domain": "Self-Regulation", "text": "Follows classroom expectations and demonstrates flexibility during transitions"},
     {"code": "SR7", "domain": "Self-Regulation", "text": "Demonstrates flexibility when things are different than planned"},
     {"code": "SR8", "domain": "Self-Regulation", "text": "Demonstrates flexibility when preferred activities are interrupted"},
     {"code": "SR9", "domain": "Self-Regulation", "text": "Responds to feedback/correction without exhibiting challenging behaviors"},
     {"code": "SR10", "domain": "Self-Regulation", "text": "Responds to mistakes made by self or others without challenging behaviors"},
     {"code": "SR11", "domain": "Self-Regulation", "text": "Demonstrates awareness of own and others space"},
     {"code": "SR12", "domain": "Self-Regulation", "text": "Modifies behavior in response to feedback"},
     {"code": "SR13", "domain": "Self-Regulation", "text": "Uses appropriate words and voice tone to turn down requests"},
     {"code": "SR14", "domain": "Self-Regulation", "text": "Advocates for oneself without exhibiting challenging behaviors"},
     {"code": "SR15", "domain": "Self-Regulation", "text": "Asks for help during novel or challenging activities"},
     {"code": "SR16", "domain": "Self-Regulation", "text": "Waits for help or requested item for up to one minute without challenging behaviors"},
     {"code": "SR17", "domain": "Self-Regulation", "text": "Avoids perseveration on a topic or question"},
     {"code": "SR18", "domain": "Self-Regulation", "text": "Uses conversational voice level and tone when speaking"},
     {"code": "SE1", "domain": "Social/Emotional", "text": "Recognizes emotions in others and self"},
     {"code": "SE2", "domain": "Social/Emotional", "text": "Gives a simple explanation for the emotional state of self and others"},
     {"code": "SE3", "domain": "Social/Emotional", "text": "Shows empathy toward others"},
     {"code": "SE4", "domain": "Social/Emotional", "text": "Expresses negative emotions without exhibiting challenging behaviors"},
     {"code": "SE5", "domain": "Social/Emotional", "text": "Expresses appropriate level of enthusiasm about actions or belongings of others"},
     {"code": "SE6", "domain": "Social/Emotional", "text": "Anticipates how a peer might respond to their behavior and responds accordingly"},
     {"code": "SL1", "domain": "Social Language", "text": "Responds to greetings/partings"},
     {"code": "SL2", "domain": "Social Language", "text": "Follows directions involving names of adults or peers"},
     {"code": "SL3", "domain": "Social Language", "text": "Initiates greetings/parting"},
     {"code": "SL4", "domain": "Social Language", "text": "Addresses peers by name"},
     {"code": "SL5", "domain": "Social Language", "text": "Answers social questions"},
     {"code": "SL6", "domain": "Social Language", "text": "Asks social questions"},
     {"code": "SL7", "domain": "Social Language", "text": "Asks concrete questions about items or information shared by others"},
     {"code": "SL8", "domain": "Social Language", "text": "Requests attention appropriately"},
     {"code": "SL9", "domain": "Social Language", "text": "Gains listener attention appropriately"},
     {"code": "SL10", "domain": "Social Language", "text": "Responds to initiations from others"},
     {"code": "SL11", "domain": "Social Language", "text": "Answers questions about ongoing activities"},
     {"code": "SL12", "domain": "Social Language", "text": "Shares information about self, family, and major events"},
     {"code": "SL13", "domain": "Social Language", "text": "Answers more than five questions on a preferred topic"},
     {"code": "SL14", "domain": "Social Language", "text": "Makes reciprocal comments"},
     {"code": "SL15", "domain": "Social Language", "text": "Shares information about immediate past or future events"},
     {"code": "SL16", "domain": "Social Language", "text": "Answers questions, asks questions, or makes comments for three to four exchanges"},
     {"code": "SL17", "domain": "Social Language", "text": "Responds appropriately when a peer changes topic"},
     {"code": "SL18", "domain": "Social Language", "text": "Directs body and eyes toward social partner when speaking"},
     {"code": "SL19", "domain": "Social Language", "text": "Directs body and eyes toward social partner when listening"},
     {"code": "SL20", "domain": "Social Language", "text": "Speaks using polite phrases"},
     {"code": "SL21", "domain": "Social Language", "text": "Accepts people who are different"},
     {"code": "SL22", "domain": "Social Language", "text": "Seeks to repair or clarify breakdowns in social interactions"},
     {"code": "SL23", "domain": "Social Language", "text": "Converses on age-appropriate topics"},
     {"code": "SL24", "domain": "Social Language", "text": "Uses contextually appropriate language/introduces topic"},
     {"code": "CG1", "domain": "Classroom/Group Behavior", "text": "Follows schedule and classroom rules"},
     {"code": "CG2", "domain": "Classroom/Group Behavior", "text": "Follows verbal directions as part of classroom routines"},
     {"code": "CG3", "domain": "Classroom/Group Behavior", "text": "Recognizes belonging of own, others, and group"},
     {"code": "CG4", "domain": "Classroom/Group Behavior", "text": "Keeps toys/materials in designated locations"},
     {"code": "CG5", "domain": "Classroom/Group Behavior", "text": "Responds to teacher by looking or coming when cued"},
     {"code": "CG6", "domain": "Classroom/Group Behavior", "text": "Imitates a peer who is leading songs/activities"},
     {"code": "CG7", "domain": "Classroom/Group Behavior", "text": "Responds to indirect cueing"},
     {"code": "CG8", "domain": "Classroom/Group Behavior", "text": "Uses playground equipment appropriately"},
     {"code": "CG9", "domain": "Classroom/Group Behavior", "text": "Helps others, both spontaneously and when asked"},
     {"code": "CG10", "domain": "Classroom/Group Behavior", "text": "Remains in place in a group until called by teacher"},
     {"code": "CG11", "domain": "Classroom/Group Behavior", "text": "Prepares for activity by locating area/materials"},
     {"code": "CG12", "domain": "Classroom/Group Behavior", "text": "Follows directions during novel activities"},
     {"code": "CG13", "domain": "Classroom/Group Behavior", "text": "Gives directions during novel activities"},
     {"code": "CG14", "domain": "Classroom/Group Behavior", "text": "Stays in place when walking in line and maintaining pace"},
     {"code": "CG15", "domain": "Classroom/Group Behavior", "text": "Repeats words/actions from a song, book, or play activity"},
     {"code": "CG16", "domain": "Classroom/Group Behavior", "text": "Accepts that some peers may follow different rules or schedules"},
     {"code": "CG17", "domain": "Classroom/Group Behavior", "text": "Asks permission to use others possessions"},
     {"code": "CG18", "domain": "Classroom/Group Behavior", "text": "Attends to small-group, teacher-led, hands-on activity for ten minutes"},
     {"code": "CG19", "domain": "Classroom/Group Behavior", "text": "Sits quietly in circle for ten minutes"},
     {"code": "CG20", "domain": "Classroom/Group Behavior", "text": "Attends to small-group, teacher-led listening activity for ten minutes"},
     {"code": "CG21", "domain": "Classroom/Group Behavior", "text": "Responds together with group to teacher or peer leading activity"},
     {"code": "CG22", "domain": "Classroom/Group Behavior", "text": "Follows basic two to three step verbal directions in a group"},
     {"code": "CG23", "domain": "Classroom/Group Behavior", "text": "Passes items to peers"},
     {"code": "NV1", "domain": "Nonverbal Social Language", "text": "Reciprocates nonverbal interactions"},
     {"code": "NV2", "domain": "Nonverbal Social Language", "text": "Initiates nonverbal interactions with appropriate adults and peers"},
     {"code": "NV3", "domain": "Nonverbal Social Language", "text": "Identifies basic actions without words"},
     {"code": "NV4", "domain": "Nonverbal Social Language", "text": "Demonstrates appropriate level of affection based on relationship"},
     {"code": "NV5", "domain": "Nonverbal Social Language", "text": "Follows basic gestures and nonverbal cues"},
     {"code": "NV6", "domain": "Nonverbal Social Language", "text": "Modifies own behavior based on body language, actions, or eye gaze of others"}
   ]'::jsonb,
   '{"score_range": "0-3", "scoring_key": "0 = rarely or never; 1 = only on a few occasions; 2 = not consistently; 3 = consistently demonstrates; N/A = not applicable"}'::jsonb);