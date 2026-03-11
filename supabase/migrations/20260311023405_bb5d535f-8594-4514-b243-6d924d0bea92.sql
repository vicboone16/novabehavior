
-- Bulk insert benchmarks for all goals missing them
-- Each goal gets 5 progressive benchmarks

DO $$
DECLARE
  r RECORD;
  bm_texts text[];
  bm_titles text[];
  i int;
BEGIN
  FOR r IN
    SELECT g.id as goal_id, g.goal_code, l.slug
    FROM cl_goal_library g
    JOIN cl_libraries l ON l.id = g.library_id
    WHERE (SELECT count(*) FROM cl_goal_benchmarks b WHERE b.goal_id = g.id) < 5
    ORDER BY l.slug, g.goal_code
  LOOP
    -- Generate benchmark texts based on goal domain
    CASE
      WHEN r.goal_code LIKE 'ER-%' THEN
        bm_texts := ARRAY[
          'Uses strategy with full adult support.',
          'Uses strategy with partial prompt.',
          'Uses strategy with verbal cue only.',
          'Uses strategy independently across routines.',
          'Uses strategy proactively before escalation.'
        ];
        bm_titles := ARRAY['Full Support','Partial Prompt','Verbal Cue','Independent','Proactive'];
      WHEN r.goal_code LIKE 'PDA-%' THEN
        bm_texts := ARRAY[
          'Completes target with full prompt and support.',
          'Completes target with partial prompt.',
          'Completes target with verbal cue only.',
          'Completes target independently.',
          'Generalizes target across routines and staff.'
        ];
        bm_titles := ARRAY['Full Prompt','Partial Prompt','Verbal Cue','Independent','Generalization'];
      WHEN r.goal_code LIKE 'SIB-%' THEN
        bm_texts := ARRAY[
          'Uses replacement with full physical or gestural prompt.',
          'Uses replacement with partial prompt.',
          'Uses replacement with verbal reminder.',
          'Uses replacement independently during distress.',
          'Generalizes replacement across environments.'
        ];
        bm_titles := ARRAY['Full Prompt','Partial Prompt','Verbal Reminder','Independent','Generalization'];
      WHEN r.goal_code LIKE 'SEX-%' THEN
        bm_texts := ARRAY[
          'Identifies target skill during structured teaching.',
          'Demonstrates skill during role play with prompts.',
          'Uses skill with verbal cue in natural setting.',
          'Uses skill independently in natural setting.',
          'Generalizes skill across people and settings.'
        ];
        bm_titles := ARRAY['Structured Teaching','Role Play','Verbal Cue','Independent','Generalization'];
      WHEN r.goal_code LIKE 'ELOPE-%' THEN
        bm_texts := ARRAY[
          'Uses replacement with full prompt and proximity.',
          'Uses replacement with partial prompt.',
          'Uses replacement with verbal cue.',
          'Uses replacement independently.',
          'Generalizes replacement across locations and transitions.'
        ];
        bm_titles := ARRAY['Full Prompt','Partial Prompt','Verbal Cue','Independent','Generalization'];
      WHEN r.goal_code LIKE 'VERB-%' THEN
        bm_texts := ARRAY[
          'Identifies target language during structured practice.',
          'Uses replacement language with prompt during conflict.',
          'Uses replacement language with verbal cue.',
          'Uses replacement language independently.',
          'Generalizes safe language across staff and settings.'
        ];
        bm_titles := ARRAY['Structured Practice','Prompted Use','Verbal Cue','Independent','Generalization'];
      WHEN r.goal_code LIKE 'AGG-%' THEN
        bm_texts := ARRAY[
          'Uses replacement with full prompt during frustration.',
          'Uses replacement with partial prompt.',
          'Uses replacement with verbal cue.',
          'Uses replacement independently.',
          'Generalizes replacement across settings and people.'
        ];
        bm_titles := ARRAY['Full Prompt','Partial Prompt','Verbal Cue','Independent','Generalization'];
      WHEN r.goal_code LIKE 'ADHD-%' THEN
        bm_texts := ARRAY[
          'Demonstrates skill with direct adult support.',
          'Demonstrates skill with visual or gestural cue.',
          'Demonstrates skill with verbal reminder.',
          'Demonstrates skill independently.',
          'Generalizes skill across subjects and activities.'
        ];
        bm_titles := ARRAY['Direct Support','Visual Cue','Verbal Reminder','Independent','Generalization'];
      ELSE
        bm_texts := ARRAY[
          'Demonstrates with full support.',
          'Demonstrates with partial support.',
          'Demonstrates with verbal cue.',
          'Demonstrates independently.',
          'Generalizes across settings.'
        ];
        bm_titles := ARRAY['Full Support','Partial','Verbal Cue','Independent','Generalization'];
    END CASE;

    FOR i IN 1..5 LOOP
      INSERT INTO cl_goal_benchmarks (goal_id, benchmark_order, benchmark_title, benchmark_text, mastery_criteria, prompt_level)
      VALUES (
        r.goal_id,
        i,
        bm_titles[i],
        bm_texts[i],
        CASE WHEN i <= 3 THEN '4/5 opportunities' ELSE '80% across 3 sessions' END,
        CASE i
          WHEN 1 THEN 'full'
          WHEN 2 THEN 'partial'
          WHEN 3 THEN 'verbal'
          WHEN 4 THEN 'independent'
          WHEN 5 THEN 'independent'
        END
      )
      ON CONFLICT (goal_id, benchmark_order) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;
