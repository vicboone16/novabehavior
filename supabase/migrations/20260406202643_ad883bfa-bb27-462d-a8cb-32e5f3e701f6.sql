
-- =============================================
-- Nova Assessment Engine Part 2
-- =============================================

-- A. Drop views that will be recreated
drop view if exists public.v_nova_master_report cascade;
drop view if exists public.v_nova_master_report_full cascade;
drop view if exists public.v_nova_assessment_report cascade;
drop view if exists public.v_nova_abrse_recommendations cascade;

-- =============================================
-- 1) EFDP full item insert
-- =============================================
with a as (
  select id from public.nova_assessments where code = 'EFDP'
),
d as (
  select d.id, d.code
  from public.nova_assessment_domains d
  join a on a.id = d.assessment_id
),
x as (
  select * from (values
    ('D1', 1,  'EFDP_001', 'Begins tasks promptly after instruction', false, 1),
    ('D1', 2,  'EFDP_002', 'Responds to task directions without extended delay', false, 2),
    ('D1', 3,  'EFDP_003', 'Starts tasks independently without prompts', false, 3),
    ('D1', 4,  'EFDP_004', 'Transitions from instruction to action without assistance', false, 4),
    ('D1', 5,  'EFDP_005', 'Appears able to get started without visible struggle', false, 5),
    ('D1', 6,  'EFDP_006', 'Overcomes initial resistance to beginning tasks', false, 6),
    ('D1', 7,  'EFDP_007', 'Requires repeated prompts to begin tasks', true, 7),
    ('D1', 8,  'EFDP_008', 'Does not initiate without adult cueing', true, 8),
    ('D1', 9,  'EFDP_009', 'Delays starting tasks through distraction or redirection', true, 9),
    ('D1', 10, 'EFDP_010', 'Avoids initiating tasks even when capable', true, 10),
    ('D2', 11, 'EFDP_011', 'Maintains focus on task for appropriate duration', false, 11),
    ('D2', 12, 'EFDP_012', 'Stays engaged without frequent redirection', false, 12),
    ('D2', 13, 'EFDP_013', 'Completes assigned tasks', false, 13),
    ('D2', 14, 'EFDP_014', 'Follows through to task completion', false, 14),
    ('D2', 15, 'EFDP_015', 'Maintains effort across task duration', false, 15),
    ('D2', 16, 'EFDP_016', 'Does not fatigue quickly during tasks', false, 16),
    ('D2', 17, 'EFDP_017', 'Becomes distracted by irrelevant stimuli', true, 17),
    ('D2', 18, 'EFDP_018', 'Shifts attention away from task easily', true, 18),
    ('D2', 19, 'EFDP_019', 'Continues working when tasks become difficult', false, 19),
    ('D2', 20, 'EFDP_020', 'Attempts to problem-solve before disengaging', false, 20),
    ('D3', 21, 'EFDP_021', 'Transitions between activities without resistance', false, 21),
    ('D3', 22, 'EFDP_022', 'Moves between tasks smoothly', false, 22),
    ('D3', 23, 'EFDP_023', 'Adjusts strategies when initial approach does not work', false, 23),
    ('D3', 24, 'EFDP_024', 'Demonstrates flexible thinking', false, 24),
    ('D3', 25, 'EFDP_025', 'Accepts unexpected changes in routine', false, 25),
    ('D3', 26, 'EFDP_026', 'Adapts to new instructions', false, 26),
    ('D3', 27, 'EFDP_027', 'Stops one task and begins another when directed', false, 27),
    ('D3', 28, 'EFDP_028', 'Does not perseverate on prior activity', false, 28),
    ('D3', 29, 'EFDP_029', 'Accepts changes in expectations during tasks', false, 29),
    ('D3', 30, 'EFDP_030', 'Adjusts to increased or altered demands', false, 30),
    ('D4', 31, 'EFDP_031', 'Follows instructions when given', false, 31),
    ('D4', 32, 'EFDP_032', 'Accepts adult direction without resistance', false, 32),
    ('D4', 33, 'EFDP_033', 'Attempts to negotiate or modify demands', true, 33),
    ('D4', 34, 'EFDP_034', 'Seeks to control task expectations', true, 34),
    ('D4', 35, 'EFDP_035', 'Appears compliant but does not engage in task', true, 35),
    ('D4', 36, 'EFDP_036', 'Delays action without direct refusal', true, 36),
    ('D4', 37, 'EFDP_037', 'Refuses tasks verbally or behaviorally', true, 37),
    ('D4', 38, 'EFDP_038', 'Attempts to escape or avoid demands', true, 38),
    ('D4', 39, 'EFDP_039', 'Escalates emotionally when demands are placed', true, 39),
    ('D4', 40, 'EFDP_040', 'Displays challenging behavior in response to expectations', true, 40),
    ('D5', 41, 'EFDP_041', 'Maintains emotional control during tasks', false, 41),
    ('D5', 42, 'EFDP_042', 'Manages frustration appropriately', false, 42),
    ('D5', 43, 'EFDP_043', 'Handles task complexity without becoming overwhelmed', false, 43),
    ('D5', 44, 'EFDP_044', 'Tolerates multi-step or demanding tasks', false, 44),
    ('D5', 45, 'EFDP_045', 'Shows signs of anxiety when tasks are presented', true, 45),
    ('D5', 46, 'EFDP_046', 'Avoids tasks due to stress or worry', true, 46),
    ('D5', 47, 'EFDP_047', 'Stops responding when overwhelmed', true, 47),
    ('D5', 48, 'EFDP_048', 'Appears frozen or disengaged under demand', true, 48),
    ('D5', 49, 'EFDP_049', 'Returns to task after difficulty', false, 49),
    ('D5', 50, 'EFDP_050', 'Recovers from frustration and re-engages', false, 50)
  ) as t(domain_code, item_number, item_code, item_text, reverse_scored, display_order)
)
insert into public.nova_assessment_items (
  assessment_id, domain_id, item_number, item_code, item_text, reverse_scored, display_order
)
select a.id, d.id, x.item_number, x.item_code, x.item_text, x.reverse_scored, x.display_order
from a join x on true join d on d.code = x.domain_code
on conflict do nothing;

-- =============================================
-- 2) ABRSE full item insert
-- =============================================
with a as (
  select id from public.nova_assessments where code = 'ABRSE'
),
d as (
  select d.id, d.code
  from public.nova_assessment_domains d
  join a on a.id = d.assessment_id
),
x as (
  select * from (values
    ('D1', 1,  'ABRSE_001', 'Requests preferred items or activities appropriately', 1),
    ('D1', 2,  'ABRSE_002', 'Requests help when needed', 2),
    ('D1', 3,  'ABRSE_003', 'Requests a break or escape appropriately', 3),
    ('D1', 4,  'ABRSE_004', 'Refuses or says no appropriately without escalation', 4),
    ('D1', 5,  'ABRSE_005', 'Expresses emotions using appropriate communication', 5),
    ('D2', 6,  'ABRSE_006', 'Identifies or signals emotional state', 6),
    ('D2', 7,  'ABRSE_007', 'Uses coping strategies when upset', 7),
    ('D2', 8,  'ABRSE_008', 'Seeks support appropriately during distress', 8),
    ('D2', 9,  'ABRSE_009', 'Returns to baseline after escalation', 9),
    ('D2', 10, 'ABRSE_010', 'Maintains regulation during demands', 10),
    ('D3', 11, 'ABRSE_011', 'Follows simple directions', 11),
    ('D3', 12, 'ABRSE_012', 'Engages in assigned tasks', 12),
    ('D3', 13, 'ABRSE_013', 'Completes tasks', 13),
    ('D3', 14, 'ABRSE_014', 'Requests help instead of disengaging', 14),
    ('D3', 15, 'ABRSE_015', 'Uses appropriate alternatives instead of task refusal', 15),
    ('D4', 16, 'ABRSE_016', 'Gains attention appropriately', 16),
    ('D4', 17, 'ABRSE_017', 'Initiates peer interaction appropriately', 17),
    ('D4', 18, 'ABRSE_018', 'Resolves conflict without maladaptive behavior', 18),
    ('D4', 19, 'ABRSE_019', 'Maintains appropriate social boundaries', 19),
    ('D4', 20, 'ABRSE_020', 'Responds appropriately to correction', 20),
    ('D5', 21, 'ABRSE_021', 'Accepts denial of preferred items or activities', 21),
    ('D5', 22, 'ABRSE_022', 'Waits appropriately', 22),
    ('D5', 23, 'ABRSE_023', 'Transitions between activities', 23),
    ('D5', 24, 'ABRSE_024', 'Engages in non-preferred tasks', 24),
    ('D5', 25, 'ABRSE_025', 'Adapts to changes in expectations', 25)
  ) as t(domain_code, item_number, item_code, item_text, display_order)
)
insert into public.nova_assessment_items (
  assessment_id, domain_id, item_number, item_code, item_text, reverse_scored, display_order
)
select a.id, d.id, x.item_number, x.item_code, x.item_text, false, x.display_order
from a join x on true join d on d.code = x.domain_code
on conflict do nothing;

-- =============================================
-- 3) NAP archetype domains + items
-- =============================================
with a as (
  select id from public.nova_assessments where code = 'NAP'
),
x as (
  select * from (values
    ('MASKER', 'The Masker', 1, 1, 'Performs expected behavior while suppressing internal experience'),
    ('EXTERNALIZER', 'The Externalizer', 2, 2, 'Visible behavioral expression of distress'),
    ('INTERNALIZER', 'The Internalizer', 3, 3, 'Quiet withdrawal and inward distress'),
    ('DEMAND_AVOIDANT_ARCH', 'The Demand-Avoidant', 4, 4, 'Demand-sensitive, autonomy-protective presentation'),
    ('SENSORY', 'The Sensory Seeker / Avoider', 5, 5, 'Sensory-regulation-driven pattern'),
    ('CONTROLLED_PERFORMER', 'The Controlled Performer', 6, 6, 'Performs under structure, struggles without it'),
    ('DYSREGULATED', 'The Dysregulated Reactor', 7, 7, 'Low regulation capacity and rapid escalation')
  ) as t(code, name, display_order, priority_order, description)
)
insert into public.nova_assessment_domains (
  assessment_id, code, name, display_order, priority_order, description, is_profile_driving
)
select a.id, x.code, x.name, x.display_order, x.priority_order, x.description, true
from a join x on true
on conflict do nothing;

-- NAP items
with a as (
  select id from public.nova_assessments where code = 'NAP'
),
d as (
  select d.id, d.code
  from public.nova_assessment_domains d
  join a on a.id = d.assessment_id
),
x as (
  select * from (values
    ('MASKER', 1,  'NAP_001', 'Mimics peer behavior to fit in', 'MASKER', 1),
    ('MASKER', 2,  'NAP_002', 'Suppresses natural responses in social settings', 'MASKER', 2),
    ('MASKER', 3,  'NAP_003', 'Appears socially competent but struggles privately', 'MASKER', 3),
    ('MASKER', 4,  'NAP_004', 'Shows delayed emotional reactions after interaction', 'MASKER', 4),
    ('MASKER', 5,  'NAP_005', 'Demonstrates different behavior across settings', 'MASKER', 5),
    ('EXTERNALIZER', 6,  'NAP_006', 'Expresses frustration through observable behavior', 'EXTERNALIZER', 6),
    ('EXTERNALIZER', 7,  'NAP_007', 'Engages in vocal protest or refusal', 'EXTERNALIZER', 7),
    ('EXTERNALIZER', 8,  'NAP_008', 'Escalates when needs are not met', 'EXTERNALIZER', 8),
    ('EXTERNALIZER', 9,  'NAP_009', 'Uses behavior to communicate needs', 'EXTERNALIZER', 9),
    ('EXTERNALIZER', 10, 'NAP_010', 'Displays outward emotional reactions', 'EXTERNALIZER', 10),
    ('INTERNALIZER', 11, 'NAP_011', 'Withdraws from interaction', 'INTERNALIZER', 11),
    ('INTERNALIZER', 12, 'NAP_012', 'Avoids attention or engagement', 'INTERNALIZER', 12),
    ('INTERNALIZER', 13, 'NAP_013', 'Appears quiet but distressed internally', 'INTERNALIZER', 13),
    ('INTERNALIZER', 14, 'NAP_014', 'Shows limited outward emotional expression', 'INTERNALIZER', 14),
    ('INTERNALIZER', 15, 'NAP_015', 'Struggles without seeking help', 'INTERNALIZER', 15),
    ('DEMAND_AVOIDANT_ARCH', 16, 'NAP_016', 'Resists direct instructions', 'DEMAND_AVOIDANT_ARCH', 16),
    ('DEMAND_AVOIDANT_ARCH', 17, 'NAP_017', 'Attempts to control or negotiate demands', 'DEMAND_AVOIDANT_ARCH', 17),
    ('DEMAND_AVOIDANT_ARCH', 18, 'NAP_018', 'Avoids tasks even when capable', 'DEMAND_AVOIDANT_ARCH', 18),
    ('DEMAND_AVOIDANT_ARCH', 19, 'NAP_019', 'Escalates when pressured', 'DEMAND_AVOIDANT_ARCH', 19),
    ('DEMAND_AVOIDANT_ARCH', 20, 'NAP_020', 'Responds better to indirect requests', 'DEMAND_AVOIDANT_ARCH', 20),
    ('SENSORY', 21, 'NAP_021', 'Seeks sensory input such as movement, touch, or sound', 'SENSORY', 21),
    ('SENSORY', 22, 'NAP_022', 'Avoids sensory stimuli such as noise, light, or touch', 'SENSORY', 22),
    ('SENSORY', 23, 'NAP_023', 'Displays sensory-driven behaviors', 'SENSORY', 23),
    ('SENSORY', 24, 'NAP_024', 'Becomes dysregulated due to sensory input', 'SENSORY', 24),
    ('SENSORY', 25, 'NAP_025', 'Uses repetitive behaviors for regulation', 'SENSORY', 25),
    ('CONTROLLED_PERFORMER', 26, 'NAP_026', 'Performs well in structured environments', 'CONTROLLED_PERFORMER', 26),
    ('CONTROLLED_PERFORMER', 27, 'NAP_027', 'Struggles when structure is removed', 'CONTROLLED_PERFORMER', 27),
    ('CONTROLLED_PERFORMER', 28, 'NAP_028', 'Relies on prompts or routines', 'CONTROLLED_PERFORMER', 28),
    ('CONTROLLED_PERFORMER', 29, 'NAP_029', 'Demonstrates inconsistent independence', 'CONTROLLED_PERFORMER', 29),
    ('CONTROLLED_PERFORMER', 30, 'NAP_030', 'Appears capable but needs support to maintain performance', 'CONTROLLED_PERFORMER', 30),
    ('DYSREGULATED', 31, 'NAP_031', 'Escalates quickly under stress', 'DYSREGULATED', 31),
    ('DYSREGULATED', 32, 'NAP_032', 'Has difficulty recovering after dysregulation', 'DYSREGULATED', 32),
    ('DYSREGULATED', 33, 'NAP_033', 'Shows intense emotional reactions', 'DYSREGULATED', 33),
    ('DYSREGULATED', 34, 'NAP_034', 'Struggles to maintain regulation during demands', 'DYSREGULATED', 34),
    ('DYSREGULATED', 35, 'NAP_035', 'Displays frequent emotional shifts', 'DYSREGULATED', 35)
  ) as t(domain_code, item_number, item_code, item_text, archetype_code, display_order)
)
insert into public.nova_assessment_items (
  assessment_id, domain_id, item_number, item_code, item_text, reverse_scored, archetype_code, display_order
)
select a.id, d.id, x.item_number, x.item_code, x.item_text, false, x.archetype_code, x.display_order
from a join x on true join d on d.code = x.domain_code
on conflict do nothing;

-- =============================================
-- 4) Report snippet seeds
-- =============================================

-- SBRDS snippets
with x as (
  select * from (values
    ('SBRDS_D1_LOW', 'Low Social Initiation', 'Reduced initiation suggests hesitation, avoidance, low confidence, or energy conservation rather than automatically indicating lack of social interest.', 'domain_interpretation'),
    ('SBRDS_D4_LOW', 'Low Relational Safety', 'Lower relational safety scores suggest that trust and comfort with others may be limiting social access.', 'domain_interpretation'),
    ('SBRDS_D5_LOW', 'Low Social Energy', 'Social participation appears effortful and may require recovery time or reduced performance demands.', 'domain_interpretation'),
    ('SBRDS_GUARDED', 'Socially Guarded', 'The student demonstrates a socially guarded presentation in which relational caution appears to limit engagement.', 'profile_statement'),
    ('SBRDS_FATIGUED', 'Socially Fatigued', 'The student demonstrates a socially fatigued presentation in which social engagement appears costly and difficult to sustain.', 'profile_statement')
  ) as t(snippet_key, snippet_label, snippet_text, snippet_type)
)
insert into public.nova_report_snippets (assessment_id, snippet_key, snippet_label, snippet_text, snippet_type)
select a.id, x.snippet_key, x.snippet_label, x.snippet_text, x.snippet_type
from public.nova_assessments a join x on true where a.code = 'SBRDS'
on conflict do nothing;

-- EFDP snippets
with x as (
  select * from (values
    ('EFDP_D1_LOW', 'Low Initiation', 'Difficulty beginning tasks suggests activation barriers, prompt dependence, avoidance, or overwhelm.', 'domain_interpretation'),
    ('EFDP_D4_LOW', 'Demand Difficulty', 'Task performance appears strongly influenced by how demands are delivered and tolerated.', 'domain_interpretation'),
    ('EFDP_D5_LOW', 'Overwhelm', 'Task breakdown appears linked to cognitive or emotional overload rather than lack of ability alone.', 'domain_interpretation'),
    ('EFDP_OVERWHELMED', 'Overwhelmed Executor', 'The student demonstrates an overwhelmed executor pattern in which skills may be present but become inaccessible under demand.', 'profile_statement'),
    ('EFDP_PROMPT_DEP', 'Prompt Dependent', 'The student demonstrates a prompt-dependent pattern in which external support is required to activate task behavior.', 'profile_statement')
  ) as t(snippet_key, snippet_label, snippet_text, snippet_type)
)
insert into public.nova_report_snippets (assessment_id, snippet_key, snippet_label, snippet_text, snippet_type)
select a.id, x.snippet_key, x.snippet_label, x.snippet_text, x.snippet_type
from public.nova_assessments a join x on true where a.code = 'EFDP'
on conflict do nothing;

-- ABRSE snippets
with x as (
  select * from (values
    ('ABRSE_D1_LOW', 'Low Communication', 'Behavior may be serving a communicative function due to limited access to adaptive communication skills.', 'domain_interpretation'),
    ('ABRSE_D2_LOW', 'Low Regulation', 'Regulation difficulties likely reduce access to otherwise teachable skills and should be prioritized.', 'domain_interpretation'),
    ('ABRSE_D5_LOW', 'Low Flexibility', 'Low flexibility and tolerance may contribute to escalation when limits, delays, or change are present.', 'domain_interpretation'),
    ('ABRSE_REGULATION', 'Regulation Deficit Profile', 'The student demonstrates a regulation-driven skill deficit pattern.', 'profile_statement'),
    ('ABRSE_COMMUNICATION', 'Communication Deficit Profile', 'The student demonstrates a communication-driven skill deficit pattern.', 'profile_statement')
  ) as t(snippet_key, snippet_label, snippet_text, snippet_type)
)
insert into public.nova_report_snippets (assessment_id, snippet_key, snippet_label, snippet_text, snippet_type)
select a.id, x.snippet_key, x.snippet_label, x.snippet_text, x.snippet_type
from public.nova_assessments a join x on true where a.code = 'ABRSE'
on conflict do nothing;

-- NAP snippets
with x as (
  select * from (values
    ('NAP_MASKER', 'Masker', 'The student appears to adapt by performing expected behavior while suppressing internal experience or effort.', 'profile_statement'),
    ('NAP_INTERNALIZER', 'Internalizer', 'The student appears to cope through quiet withdrawal, reduced visibility of distress, and internal suppression.', 'profile_statement'),
    ('NAP_DEMAND_AVOIDANT', 'Demand Avoidant', 'The student demonstrates a demand-avoidant pattern marked by sensitivity to externally imposed expectations.', 'profile_statement'),
    ('NAP_DYSREGULATED', 'Dysregulated Reactor', 'The student demonstrates a dysregulated pattern marked by low regulation capacity under stress.', 'profile_statement'),
    ('NAP_BURNOUT_FLAG', 'Burnout Risk', 'The combination of masking and dysregulation suggests elevated risk for burnout or delayed collapse after effortful performance.', 'pattern_insight')
  ) as t(snippet_key, snippet_label, snippet_text, snippet_type)
)
insert into public.nova_report_snippets (assessment_id, snippet_key, snippet_label, snippet_text, snippet_type)
select a.id, x.snippet_key, x.snippet_label, x.snippet_text, x.snippet_type
from public.nova_assessments a join x on true where a.code = 'NAP'
on conflict do nothing;

-- =============================================
-- 5) EFDP demand style scorer
-- =============================================
create or replace function public.nova_assign_efdp_demand_style(p_session_id uuid)
returns void
language plpgsql
as $$
declare
  v_compliance numeric;
  v_negotiation numeric;
  v_passive numeric;
  v_active numeric;
  v_escalation numeric;
  v_top_key text;
  v_top_label text;
begin
  delete from public.nova_assessment_results
  where session_id = p_session_id
    and result_scope = 'demand_style';

  with item_scores as (
    select i.item_code, r.normalized_score, r.raw_score
    from public.nova_assessment_ratings r
    join public.nova_assessment_items i on i.id = r.item_id
    where r.session_id = p_session_id
  )
  select
    round(avg(case when item_code in ('EFDP_031','EFDP_032') then normalized_score end)::numeric, 2),
    round(avg(case when item_code in ('EFDP_033','EFDP_034') then raw_score end)::numeric, 2),
    round(avg(case when item_code in ('EFDP_035','EFDP_036') then raw_score end)::numeric, 2),
    round(avg(case when item_code in ('EFDP_037','EFDP_038') then raw_score end)::numeric, 2),
    round(avg(case when item_code in ('EFDP_039','EFDP_040') then raw_score end)::numeric, 2)
  into v_compliance, v_negotiation, v_passive, v_active, v_escalation
  from item_scores;

  with ranked as (
    select * from (values
      ('COMPLIANT', 'Compliant', coalesce(v_compliance, 0)),
      ('CONTROL_SEEKING', 'Control-Seeking', coalesce(v_negotiation, 0)),
      ('PASSIVE_AVOIDANT', 'Passive Avoidant', coalesce(v_passive, 0)),
      ('ACTIVE_AVOIDANT', 'Active Avoidant', coalesce(v_active, 0)),
      ('ESCALATING', 'Escalating', coalesce(v_escalation, 0))
    ) x(result_key, result_label, score)
    order by score desc, result_label
    limit 1
  )
  select result_key, result_label into v_top_key, v_top_label from ranked;

  insert into public.nova_assessment_results (
    session_id, result_scope, result_key, result_label, avg_score, result_json
  )
  values (
    p_session_id, 'demand_style', v_top_key, v_top_label,
    greatest(coalesce(v_compliance,0), coalesce(v_negotiation,0), coalesce(v_passive,0), coalesce(v_active,0), coalesce(v_escalation,0)),
    jsonb_build_object(
      'compliance', v_compliance, 'negotiation', v_negotiation,
      'passive_avoidance', v_passive, 'active_avoidance', v_active, 'escalation', v_escalation
    )
  );
end;
$$;

-- =============================================
-- 5b) EFDP profile assigner (updated)
-- =============================================
create or replace function public.nova_assign_efdp_profile(p_session_id uuid)
returns void
language plpgsql
as $$
declare
  d1 numeric; d2 numeric; d3 numeric; d4 numeric; d5 numeric;
begin
  select avg_score into d1 from public.nova_assessment_results where session_id = p_session_id and result_scope = 'domain' and result_key = 'D1';
  select avg_score into d2 from public.nova_assessment_results where session_id = p_session_id and result_scope = 'domain' and result_key = 'D2';
  select avg_score into d3 from public.nova_assessment_results where session_id = p_session_id and result_scope = 'domain' and result_key = 'D3';
  select avg_score into d4 from public.nova_assessment_results where session_id = p_session_id and result_scope = 'domain' and result_key = 'D4';
  select avg_score into d5 from public.nova_assessment_results where session_id = p_session_id and result_scope = 'domain' and result_key = 'D5';

  delete from public.nova_assessment_results where session_id = p_session_id and result_scope = 'profile';

  if d1 >= 2.5 and d2 >= 2.5 and d3 >= 1.75 and d4 >= 1.75 and d5 >= 1.75 then
    insert into public.nova_assessment_results(session_id, result_scope, result_key, result_label, is_primary)
    values (p_session_id, 'profile', 'STRUCTURED_INDEPENDENT', 'Structured Independent', true);
  elsif d5 < 1.75 and d1 < 1.75 then
    insert into public.nova_assessment_results(session_id, result_scope, result_key, result_label, is_primary)
    values (p_session_id, 'profile', 'OVERWHELMED_EXECUTOR', 'Overwhelmed Executor', true);
  elsif d3 < 1.75 then
    insert into public.nova_assessment_results(session_id, result_scope, result_key, result_label, is_primary)
    values (p_session_id, 'profile', 'RIGID_INFLEXIBLE', 'Rigid / Inflexible', true);
  elsif d4 < 1.75 and d5 >= 1.75 then
    insert into public.nova_assessment_results(session_id, result_scope, result_key, result_label, is_primary)
    values (p_session_id, 'profile', 'TASK_AVOIDANT', 'Task-Avoidant (Escape-Maintained)', true);
  elsif d4 < 1.75 and d5 < 1.75 then
    insert into public.nova_assessment_results(session_id, result_scope, result_key, result_label, is_primary)
    values (p_session_id, 'profile', 'DEMAND_AVOIDANT', 'Demand-Avoidant (PDA-Informed)', true);
  elsif d1 < 1.75 then
    insert into public.nova_assessment_results(session_id, result_scope, result_key, result_label, is_primary)
    values (p_session_id, 'profile', 'PROMPT_DEPENDENT', 'Prompt-Dependent', true);
  else
    insert into public.nova_assessment_results(session_id, result_scope, result_key, result_label, is_primary)
    values (p_session_id, 'profile', 'INCONSISTENT_PERFORMER', 'Inconsistent Performer', true);
  end if;

  perform public.nova_assign_efdp_demand_style(p_session_id);
end;
$$;

-- =============================================
-- 6) Replacement targets table + seeds
-- =============================================
create table if not exists public.nova_replacement_targets (
  id uuid primary key default gen_random_uuid(),
  assessment_item_id uuid not null references public.nova_assessment_items(id) on delete cascade,
  target_code text not null,
  target_label text not null,
  behavior_function text check (behavior_function in ('attention', 'escape', 'access', 'sensory', 'mixed')),
  replacement_behavior text not null,
  goal_template text,
  strategy_template text,
  reinforcement_template text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assessment_item_id, target_code)
);

alter table public.nova_replacement_targets enable row level security;

create policy "Authenticated users can view replacement targets"
  on public.nova_replacement_targets for select to authenticated using (true);

-- Seed ABRSE replacement targets
with x as (
  select * from (values
    ('ABRSE_001', 'REQ_ACCESS', 'Request Access', 'access', 'Teach requesting preferred items or activities appropriately', 'Student will request preferred items or activities using appropriate communication in 4 of 5 opportunities with minimal prompting.', 'Use immediate prompting and reinforcement for appropriate access requests.', 'Provide rapid access to preferred item following appropriate request.'),
    ('ABRSE_002', 'REQ_HELP', 'Request Help', 'mixed', 'Teach help-seeking instead of disengagement or escalation', 'Student will request help appropriately in 4 of 5 opportunities with minimal prompting.', 'Model help-seeking and reinforce independent requests.', 'Provide assistance and praise immediately following help request.'),
    ('ABRSE_003', 'REQ_BREAK', 'Request Break', 'escape', 'Teach break requests as an alternative to escape behavior', 'Student will request a break appropriately in 4 of 5 opportunities with minimal prompting.', 'Prompt break requests before escalation and honor appropriate requests.', 'Provide brief break access following appropriate break request.'),
    ('ABRSE_004', 'APPROPRIATE_REFUSAL', 'Appropriate Refusal', 'escape', 'Teach safe and appropriate protest or refusal', 'Student will refuse or protest appropriately without escalation in 4 of 5 opportunities.', 'Model acceptable refusal language and reinforce calm refusal.', 'Honor reasonable refusal when appropriate and safe.'),
    ('ABRSE_005', 'EMOTION_EXPRESSION', 'Emotion Expression', 'mixed', 'Teach emotional labeling and communication', 'Student will communicate emotional state using appropriate modality in 4 of 5 opportunities.', 'Use visuals or scripts to support emotional expression.', 'Provide support and validation after emotional communication.'),
    ('ABRSE_007', 'COPING_STRATEGY', 'Use Coping Strategy', 'sensory', 'Teach active coping strategies during distress', 'Student will use a taught coping strategy when upset in 4 of 5 opportunities.', 'Teach and prompt coping routines before escalation.', 'Reinforce use of coping strategy with praise and reduced demands as appropriate.'),
    ('ABRSE_010', 'REGULATE_UNDER_DEMAND', 'Regulate Under Demand', 'escape', 'Teach regulation during non-preferred tasks', 'Student will maintain regulation during task demands for increasing durations across sessions.', 'Use demand fading and co-regulation supports.', 'Reinforce calm participation and recovery.'),
    ('ABRSE_014', 'ASK_HELP_DURING_TASK', 'Ask for Help During Task', 'escape', 'Teach help-seeking during work instead of avoidance', 'Student will request help during tasks in 4 of 5 opportunities.', 'Prompt help before task abandonment.', 'Provide help and specific praise following appropriate request.'),
    ('ABRSE_015', 'TASK_ALTERNATIVE', 'Task Avoidance Alternative', 'escape', 'Teach break request or negotiated alternative instead of refusal', 'Student will use an appropriate alternative to task refusal in 4 of 5 opportunities.', 'Offer visual choices and break cards.', 'Reinforce adaptive alternative immediately.'),
    ('ABRSE_016', 'GAIN_ATTENTION', 'Gain Attention Appropriately', 'attention', 'Teach appropriate attention-seeking bids', 'Student will gain adult or peer attention appropriately in 4 of 5 opportunities.', 'Model and reinforce hand-raising, name-calling, or other approved bids.', 'Provide rapid social attention after appropriate bid.'),
    ('ABRSE_018', 'CONFLICT_RESOLUTION', 'Conflict Resolution', 'attention', 'Teach words or help-seeking instead of aggression during conflict', 'Student will resolve conflict using words or adult support in 4 of 5 opportunities.', 'Teach scripts and role-play conflict situations.', 'Reinforce non-aggressive conflict resolution.'),
    ('ABRSE_021', 'TOLERATE_NO', 'Tolerate No', 'access', 'Teach tolerance for denied access', 'Student will tolerate denied access without escalation in 4 of 5 opportunities.', 'Use delay fading and explicit tolerance teaching.', 'Reinforce calm acceptance and waiting.'),
    ('ABRSE_022', 'WAITING', 'Waiting Skill', 'access', 'Teach waiting and delay tolerance', 'Student will wait appropriately for increasing durations in 4 of 5 opportunities.', 'Use visual timers and countdown supports.', 'Reinforce successful waiting.'),
    ('ABRSE_023', 'TRANSITION', 'Transition Skill', 'mixed', 'Teach adaptive transitions between activities', 'Student will transition between activities without maladaptive behavior in 4 of 5 opportunities.', 'Use warnings, schedules, and transition cues.', 'Reinforce smooth transitions.'),
    ('ABRSE_024', 'NONPREFERRED_TASK', 'Non-Preferred Task Tolerance', 'escape', 'Teach participation in non-preferred work', 'Student will engage in non-preferred tasks for increasing durations across sessions.', 'Use task chunking and reinforcement schedules.', 'Reinforce participation and completion.'),
    ('ABRSE_025', 'FLEXIBILITY', 'Flexibility With Change', 'mixed', 'Teach coping with changed expectations', 'Student will adapt to changes in expectations with appropriate support in 4 of 5 opportunities.', 'Teach flexibility routines and coping scripts.', 'Reinforce adaptive response to change.')
  ) as t(item_code, target_code, target_label, behavior_function, replacement_behavior, goal_template, strategy_template, reinforcement_template)
)
insert into public.nova_replacement_targets (
  assessment_item_id, target_code, target_label, behavior_function, replacement_behavior, goal_template, strategy_template, reinforcement_template
)
select i.id, x.target_code, x.target_label, x.behavior_function::text, x.replacement_behavior, x.goal_template, x.strategy_template, x.reinforcement_template
from public.nova_assessment_items i
join public.nova_assessments a on a.id = i.assessment_id
join x on i.item_code = x.item_code
where a.code = 'ABRSE'
on conflict do nothing;

-- =============================================
-- 7) ABRSE recommendations view
-- =============================================
create view public.v_nova_abrse_recommendations as
select
  s.id as session_id,
  s.student_id,
  i.item_code,
  i.item_text,
  r.raw_score,
  r.normalized_score,
  t.target_code,
  t.target_label,
  t.behavior_function,
  t.replacement_behavior,
  t.goal_template,
  t.strategy_template,
  t.reinforcement_template
from public.nova_assessment_sessions s
join public.nova_assessment_ratings r on r.session_id = s.id
join public.nova_assessment_items i on i.id = r.item_id
join public.nova_assessments a on a.id = s.assessment_id
left join public.nova_replacement_targets t on t.assessment_item_id = i.id
where a.code = 'ABRSE'
  and r.raw_score <= 1;

-- =============================================
-- 8) Assessment summary generator
-- =============================================
create or replace function public.nova_generate_assessment_summary(p_session_id uuid)
returns text
language plpgsql
as $$
declare
  v_assessment_code text;
  v_primary_profile text;
  v_primary_archetype text;
  v_secondary text;
begin
  if p_session_id is null then
    return 'Not yet scored';
  end if;

  select a.code into v_assessment_code
  from public.nova_assessment_sessions s
  join public.nova_assessments a on a.id = s.assessment_id
  where s.id = p_session_id;

  if v_assessment_code is null then
    return 'Not yet scored';
  end if;

  if v_assessment_code = 'NAP' then
    select result_label into v_primary_archetype
    from public.nova_assessment_results
    where session_id = p_session_id and result_scope = 'archetype'
    order by avg_score desc nulls last limit 1;

    select string_agg(result_label, ', ') into v_secondary
    from (
      select result_label from public.nova_assessment_results
      where session_id = p_session_id and result_scope = 'archetype'
      order by avg_score desc nulls last offset 1 limit 2
    ) s;

    return format('Primary archetype: %s. Secondary archetype features: %s.',
      coalesce(v_primary_archetype, 'Not yet scored'), coalesce(v_secondary, 'None noted'));
  else
    select result_label into v_primary_profile
    from public.nova_assessment_results
    where session_id = p_session_id and result_scope = 'profile' and is_primary = true
    limit 1;

    select string_agg(result_label, ', ') into v_secondary
    from public.nova_assessment_results
    where session_id = p_session_id and result_scope = 'profile' and is_secondary = true;

    return format('Primary profile: %s. Secondary profile features: %s.',
      coalesce(v_primary_profile, 'Not yet scored'), coalesce(v_secondary, 'None noted'));
  end if;
end;
$$;

-- =============================================
-- 9) Master summary function
-- =============================================
create or replace function public.nova_generate_master_summary(p_student_id uuid)
returns text
language plpgsql
as $$
declare
  v_archetype text;
  v_ef text;
  v_social text;
  v_skill text;
  v_nap_sid uuid;
  v_efdp_sid uuid;
  v_sbrds_sid uuid;
  v_abrse_sid uuid;
begin
  -- Get latest final sessions
  select s.id into v_nap_sid
  from public.nova_assessment_sessions s
  join public.nova_assessments a on a.id = s.assessment_id
  where s.student_id = p_student_id and a.code = 'NAP' and s.status = 'final'
  order by s.administration_date desc, s.created_at desc limit 1;

  select s.id into v_efdp_sid
  from public.nova_assessment_sessions s
  join public.nova_assessments a on a.id = s.assessment_id
  where s.student_id = p_student_id and a.code = 'EFDP' and s.status = 'final'
  order by s.administration_date desc, s.created_at desc limit 1;

  select s.id into v_sbrds_sid
  from public.nova_assessment_sessions s
  join public.nova_assessments a on a.id = s.assessment_id
  where s.student_id = p_student_id and a.code = 'SBRDS' and s.status = 'final'
  order by s.administration_date desc, s.created_at desc limit 1;

  select s.id into v_abrse_sid
  from public.nova_assessment_sessions s
  join public.nova_assessments a on a.id = s.assessment_id
  where s.student_id = p_student_id and a.code = 'ABRSE' and s.status = 'final'
  order by s.administration_date desc, s.created_at desc limit 1;

  select result_label into v_archetype
  from public.nova_assessment_results
  where session_id = v_nap_sid and result_scope = 'archetype'
  order by avg_score desc nulls last limit 1;

  select result_label into v_ef
  from public.nova_assessment_results
  where session_id = v_efdp_sid and result_scope = 'profile' and is_primary = true
  limit 1;

  select result_label into v_social
  from public.nova_assessment_results
  where session_id = v_sbrds_sid and result_scope = 'profile' and is_primary = true
  limit 1;

  select result_label into v_skill
  from public.nova_assessment_results
  where session_id = v_abrse_sid and result_scope = 'profile' and is_primary = true
  limit 1;

  return format(
    'The student demonstrates a profile most consistent with a %s archetype, paired with a %s EF profile, a %s social profile, and a %s skill profile. This integrated pattern suggests that behavior should be interpreted through the combined lenses of adaptation, executive functioning, social access, and teachable replacement skills rather than through surface-level assumptions alone.',
    coalesce(v_archetype, 'not-yet-scored'),
    coalesce(v_ef, 'not-yet-scored'),
    coalesce(v_social, 'not-yet-scored'),
    coalesce(v_skill, 'not-yet-scored')
  );
end;
$$;

-- =============================================
-- 10) Per-assessment report view
-- =============================================
create view public.v_nova_assessment_report as
select
  s.id as session_id,
  a.code as assessment_code,
  a.name as assessment_name,
  s.student_id,
  s.administration_date,
  s.rater_name,
  s.rater_role,
  s.setting_name,
  s.confidence_level,
  (
    select jsonb_agg(jsonb_build_object(
      'domain_code', r.result_key, 'domain_name', r.result_label,
      'raw_total', r.raw_total, 'avg_score', r.avg_score,
      'band_label', r.band_label, 'meta', r.result_json
    ) order by r.result_key)
    from public.nova_assessment_results r
    where r.session_id = s.id and r.result_scope = 'domain'
  ) as domain_results,
  (
    select jsonb_agg(jsonb_build_object(
      'profile_code', r.result_key, 'profile_name', r.result_label,
      'is_primary', r.is_primary, 'is_secondary', r.is_secondary
    ) order by r.is_primary desc, r.is_secondary desc, r.result_label)
    from public.nova_assessment_results r
    where r.session_id = s.id and r.result_scope = 'profile'
  ) as profiles,
  (
    select jsonb_agg(jsonb_build_object(
      'flag_code', r.result_key, 'flag_name', r.result_label
    ) order by r.result_label)
    from public.nova_assessment_results r
    where r.session_id = s.id and r.result_scope = 'flag'
  ) as flags,
  public.nova_generate_assessment_summary(s.id) as summary_text
from public.nova_assessment_sessions s
join public.nova_assessments a on a.id = s.assessment_id;

-- =============================================
-- 11) Master report view (corrected UUID agg)
-- =============================================
create view public.v_nova_master_report_full as
with latest as (
  select distinct on (s.student_id, a.code)
    s.student_id, a.code as assessment_code, s.id as session_id,
    s.administration_date, s.created_at
  from public.nova_assessment_sessions s
  join public.nova_assessments a on a.id = s.assessment_id
  where s.status = 'final' and a.code in ('SBRDS', 'EFDP', 'ABRSE', 'NAP')
  order by s.student_id, a.code, s.administration_date desc, s.created_at desc
),
joined as (
  select
    l.student_id,
    (array_agg(l.session_id order by l.administration_date desc, l.created_at desc) filter (where l.assessment_code = 'SBRDS'))[1] as sbrds_session_id,
    (array_agg(l.session_id order by l.administration_date desc, l.created_at desc) filter (where l.assessment_code = 'EFDP'))[1] as efdp_session_id,
    (array_agg(l.session_id order by l.administration_date desc, l.created_at desc) filter (where l.assessment_code = 'ABRSE'))[1] as abrse_session_id,
    (array_agg(l.session_id order by l.administration_date desc, l.created_at desc) filter (where l.assessment_code = 'NAP'))[1] as nap_session_id
  from latest l group by l.student_id
)
select
  j.*,
  public.nova_generate_assessment_summary(j.sbrds_session_id) as sbrds_summary,
  public.nova_generate_assessment_summary(j.efdp_session_id) as efdp_summary,
  public.nova_generate_assessment_summary(j.abrse_session_id) as abrse_summary,
  public.nova_generate_assessment_summary(j.nap_session_id) as nap_summary,
  (select jsonb_agg(jsonb_build_object('result_key', r.result_key, 'result_label', r.result_label, 'avg_score', r.avg_score, 'band_label', r.band_label, 'result_scope', r.result_scope) order by r.result_scope, r.result_label) from public.nova_assessment_results r where r.session_id = j.sbrds_session_id and r.result_scope in ('domain', 'profile')) as sbrds_results,
  (select jsonb_agg(jsonb_build_object('result_key', r.result_key, 'result_label', r.result_label, 'avg_score', r.avg_score, 'band_label', r.band_label, 'result_scope', r.result_scope) order by r.result_scope, r.result_label) from public.nova_assessment_results r where r.session_id = j.efdp_session_id and r.result_scope in ('domain', 'profile', 'demand_style')) as efdp_results,
  (select jsonb_agg(jsonb_build_object('result_key', r.result_key, 'result_label', r.result_label, 'avg_score', r.avg_score, 'band_label', r.band_label, 'result_scope', r.result_scope) order by r.result_scope, r.result_label) from public.nova_assessment_results r where r.session_id = j.abrse_session_id and r.result_scope in ('domain', 'profile')) as abrse_results,
  (select jsonb_agg(jsonb_build_object('result_key', r.result_key, 'result_label', r.result_label, 'avg_score', r.avg_score, 'band_label', r.band_label, 'result_scope', r.result_scope) order by r.result_scope, r.result_label) from public.nova_assessment_results r where r.session_id = j.nap_session_id and r.result_scope in ('archetype', 'flag')) as nap_results,
  public.nova_generate_master_summary(j.student_id) as master_summary
from joined j;

create view public.v_nova_master_report as
select * from public.v_nova_master_report_full;

-- =============================================
-- 12) Updated score dispatcher
-- =============================================
create or replace function public.nova_score_session(p_session_id uuid)
returns void
language plpgsql
as $$
declare
  v_assessment_code text;
begin
  select a.code into v_assessment_code
  from public.nova_assessment_sessions s
  join public.nova_assessments a on a.id = s.assessment_id
  where s.id = p_session_id;

  if v_assessment_code in ('SBRDS', 'EFDP', 'ABRSE') then
    perform public.nova_score_domain_assessment(p_session_id);
  end if;

  if v_assessment_code = 'SBRDS' then
    perform public.nova_assign_sbrds_profile(p_session_id);
  elsif v_assessment_code = 'EFDP' then
    perform public.nova_assign_efdp_profile(p_session_id);
  elsif v_assessment_code = 'ABRSE' then
    perform public.nova_assign_abrse_profile(p_session_id);
  elsif v_assessment_code = 'NAP' then
    perform public.nova_score_nap(p_session_id);
  end if;
end;
$$;
