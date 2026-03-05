
-- Seed aba_intro_parent lessons
-- Module 1: What is Behavior? (031bafc0-583d-49e6-8a56-425d5267bf04)
INSERT INTO public.lms_lessons (module_id, title, lesson_type, order_index, content) VALUES
('031bafc0-583d-49e6-8a56-425d5267bf04', 'Every Action Has a Purpose', 'video', 2,
 '{"description":"Learn why every behavior your child shows is a form of communication — even challenging ones.","video_url":"https://example.com/parent/behavior-purpose.mp4","duration_minutes":5}'::jsonb),
('031bafc0-583d-49e6-8a56-425d5267bf04', 'Common Behavior Myths', 'interactive', 3,
 '{"description":"Bust common myths about why kids misbehave with this interactive quiz.","activity_type":"myth_buster","questions":["My child does this on purpose","Bad behavior means bad parenting","Ignoring it will make it worse"]}'::jsonb),
('031bafc0-583d-49e6-8a56-425d5267bf04', 'Behavior vs. Misbehavior', 'document', 4,
 '{"description":"A downloadable guide explaining the difference between behavior and misbehavior from a science perspective.","file_url":"https://example.com/parent/behavior-vs-misbehavior.pdf"}'::jsonb);

-- Module 2: Why Behavior Happens (29327664-bb6c-4724-82b3-c7aab94bb776)
INSERT INTO public.lms_lessons (module_id, title, lesson_type, order_index, content) VALUES
('29327664-bb6c-4724-82b3-c7aab94bb776', 'The Four Reasons Behind Behavior', 'video', 1,
 '{"description":"Discover the four functions of behavior: Attention, Escape, Access, and Sensory — explained in everyday language.","video_url":"https://example.com/parent/four-functions.mp4","duration_minutes":7}'::jsonb),
('29327664-bb6c-4724-82b3-c7aab94bb776', 'Which Function Is It?', 'interactive', 2,
 '{"description":"Read real-life scenarios and guess the function behind each behavior.","activity_type":"scenario_quiz","scenarios":["Child screams when asked to clean up","Child hits sibling to get the remote","Child covers ears in loud restaurant"]}'::jsonb),
('29327664-bb6c-4724-82b3-c7aab94bb776', 'Behavior Detective Worksheet', 'document', 3,
 '{"description":"Print this worksheet to start tracking what happens before, during, and after your child''s behavior.","file_url":"https://example.com/parent/behavior-detective.pdf"}'::jsonb),
('29327664-bb6c-4724-82b3-c7aab94bb776', 'Understanding Your Child''s Signals', 'video', 4,
 '{"description":"Learn to read the subtle signals that come before a challenging behavior.","video_url":"https://example.com/parent/signals.mp4","duration_minutes":6}'::jsonb);

-- Module 3: How Parents Can Help (e4c380c8-c3bd-43c5-81d8-dfb9eaaa4ab7)
INSERT INTO public.lms_lessons (module_id, title, lesson_type, order_index, content) VALUES
('e4c380c8-c3bd-43c5-81d8-dfb9eaaa4ab7', 'Catching Good Behavior', 'video', 1,
 '{"description":"Learn the power of positive reinforcement — how praising the good can reduce the hard.","video_url":"https://example.com/parent/catching-good.mp4","duration_minutes":5}'::jsonb),
('e4c380c8-c3bd-43c5-81d8-dfb9eaaa4ab7', 'Setting Up for Success', 'video', 2,
 '{"description":"Simple environmental changes that prevent problem behaviors before they start.","video_url":"https://example.com/parent/setup-success.mp4","duration_minutes":6}'::jsonb),
('e4c380c8-c3bd-43c5-81d8-dfb9eaaa4ab7', 'Creating a Reinforcement System at Home', 'interactive', 3,
 '{"description":"Build your own token board or reward chart step by step.","activity_type":"builder","steps":["Choose 3-5 target behaviors","Pick meaningful rewards","Set a schedule","Track with stickers or tokens"]}'::jsonb),
('e4c380c8-c3bd-43c5-81d8-dfb9eaaa4ab7', 'What to Do During a Meltdown', 'video', 4,
 '{"description":"Calm, evidence-based steps for handling emotional meltdowns without escalation.","video_url":"https://example.com/parent/meltdown-response.mp4","duration_minutes":8}'::jsonb),
('e4c380c8-c3bd-43c5-81d8-dfb9eaaa4ab7', 'Replacement Behaviors at Home', 'document', 5,
 '{"description":"A cheat sheet of replacement behaviors for common home challenges like bedtime resistance, mealtime refusal, and sibling conflict.","file_url":"https://example.com/parent/replacement-behaviors-home.pdf"}'::jsonb),
('e4c380c8-c3bd-43c5-81d8-dfb9eaaa4ab7', 'Your Support Plan Template', 'document', 6,
 '{"description":"Downloadable template to create a simple behavior support plan you can share with your child''s team.","file_url":"https://example.com/parent/support-plan-template.pdf"}'::jsonb);
