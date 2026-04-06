
-- 1. Insert MCI and PTCE into nova_assessments
INSERT INTO public.nova_assessments (code, name, short_name, assessment_type, description, scoring_model, is_active)
VALUES
  ('MCI', 'Masking & Camouflage Index™', 'MCI', 'rating_scale', 'Measures compensatory masking behaviors across social, cognitive, and emotional domains', 'domain_average', true),
  ('PTCE', 'BCBA Parent Training Competency Evaluator™', 'PTCE', 'rating_scale', 'Evaluates caregiver readiness, skill, and barriers to ABA implementation', 'domain_average', true)
ON CONFLICT DO NOTHING;

-- 2. MCI Domains
WITH a AS (SELECT id FROM public.nova_assessments WHERE code = 'MCI')
INSERT INTO public.nova_assessment_domains (assessment_id, code, name, display_order, priority_order, description, is_profile_driving)
SELECT a.id, x.code, x.name, x.display_order, x.display_order, x.description, true
FROM a CROSS JOIN (VALUES
  ('SI', 'Social Imitation', 1, 'Copying peers to mask differences'),
  ('SRI', 'Scripted & Rehearsed Interaction', 2, 'Using rehearsed scripts in social settings'),
  ('IEM', 'Internal-External Mismatch', 3, 'Discrepancy between visible behavior and internal state'),
  ('SFR', 'Social Fatigue & Recovery', 4, 'Exhaustion from sustained social effort'),
  ('POC', 'Perfectionism & Overcompensation', 5, 'Over-effortful performance to appear typical'),
  ('CC', 'Camouflaged Confusion', 6, 'Hiding comprehension difficulties'),
  ('CBM', 'Compliance-Based Masking', 7, 'Masking through excessive compliance'),
  ('ISHD', 'Identity Strain & Hidden Distress', 8, 'Loss of authentic self and concealed distress')
) AS x(code, name, display_order, description)
ON CONFLICT DO NOTHING;

-- 3. MCI Items (48)
WITH a AS (SELECT id FROM public.nova_assessments WHERE code = 'MCI'),
d AS (SELECT d.id, d.code FROM public.nova_assessment_domains d JOIN a ON a.id = d.assessment_id),
x AS (SELECT * FROM (VALUES
  ('SI',1,'MCI_001','Copies peer behaviors to fit in',false,1),
  ('SI',2,'MCI_002','Imitates social responses observed in others',false,2),
  ('SI',3,'MCI_003','Mirrors tone or body language of peers',false,3),
  ('SI',4,'MCI_004','Adopts interests to match peer group',false,4),
  ('SI',5,'MCI_005','Changes behavior based on who is present',false,5),
  ('SI',6,'MCI_006','Watches others before acting in social situations',false,6),
  ('SRI',7,'MCI_007','Uses rehearsed phrases in conversation',false,7),
  ('SRI',8,'MCI_008','Plans responses before social interactions',false,8),
  ('SRI',9,'MCI_009','Relies on scripts to navigate social exchanges',false,9),
  ('SRI',10,'MCI_010','Practices conversations mentally before they happen',false,10),
  ('SRI',11,'MCI_011','Uses memorized social rules rather than intuition',false,11),
  ('SRI',12,'MCI_012','Appears socially skilled but interaction feels effortful',false,12),
  ('IEM',13,'MCI_013','Appears calm but reports feeling anxious',false,13),
  ('IEM',14,'MCI_014','Shows different emotional presentation across settings',false,14),
  ('IEM',15,'MCI_015','Reports feeling differently than how they appear',false,15),
  ('IEM',16,'MCI_016','Holds together at school but falls apart at home',false,16),
  ('IEM',17,'MCI_017','Suppresses visible emotional reactions',false,17),
  ('IEM',18,'MCI_018','Others are surprised when told child is struggling',false,18),
  ('SFR',19,'MCI_019','Needs recovery time after social interaction',false,19),
  ('SFR',20,'MCI_020','Withdraws or shuts down after sustained social effort',false,20),
  ('SFR',21,'MCI_021','Shows fatigue-related behavior changes across the day',false,21),
  ('SFR',22,'MCI_022','Performance declines as social demands increase',false,22),
  ('SFR',23,'MCI_023','Avoids social situations due to exhaustion',false,23),
  ('SFR',24,'MCI_024','Requires alone time to recharge after group activities',false,24),
  ('POC',25,'MCI_025','Works harder than peers to produce similar outcomes',false,25),
  ('POC',26,'MCI_026','Sets unrealistically high standards for self',false,26),
  ('POC',27,'MCI_027','Becomes distressed by minor mistakes',false,27),
  ('POC',28,'MCI_028','Over-prepares for tasks or interactions',false,28),
  ('POC',29,'MCI_029','Hides errors or avoids tasks where failure is possible',false,29),
  ('POC',30,'MCI_030','Compensates for challenges through excessive effort',false,30),
  ('CC',31,'MCI_031','Nods along without understanding',false,31),
  ('CC',32,'MCI_032','Agrees with others to avoid revealing confusion',false,32),
  ('CC',33,'MCI_033','Follows peers rather than processing instructions independently',false,33),
  ('CC',34,'MCI_034','Avoids asking questions to hide lack of understanding',false,34),
  ('CC',35,'MCI_035','Appears to understand but cannot explain or apply concepts',false,35),
  ('CC',36,'MCI_036','Uses delay tactics when confused rather than seeking help',false,36),
  ('CBM',37,'MCI_037','Complies with all demands regardless of internal state',false,37),
  ('CBM',38,'MCI_038','Suppresses objections or disagreement',false,38),
  ('CBM',39,'MCI_039','Follows rules rigidly to avoid attention',false,39),
  ('CBM',40,'MCI_040','Avoids expressing needs to maintain approval',false,40),
  ('CBM',41,'MCI_041','Accepts unreasonable demands without protest',false,41),
  ('CBM',42,'MCI_042','Prioritizes being good over being authentic',false,42),
  ('ISHD',43,'MCI_043','Reports not knowing who they really are',false,43),
  ('ISHD',44,'MCI_044','Feels different from peers but hides it',false,44),
  ('ISHD',45,'MCI_045','Experiences distress related to maintaining a false self',false,45),
  ('ISHD',46,'MCI_046','Shows signs of anxiety or depression linked to masking',false,46),
  ('ISHD',47,'MCI_047','Expresses exhaustion from trying to appear normal',false,47),
  ('ISHD',48,'MCI_048','Withdraws from relationships due to identity confusion',false,48)
) AS t(domain_code,item_number,item_code,item_text,reverse_scored,display_order))
INSERT INTO public.nova_assessment_items (assessment_id, domain_id, item_number, item_code, item_text, reverse_scored, display_order)
SELECT a.id, d.id, x.item_number, x.item_code, x.item_text, x.reverse_scored, x.display_order
FROM a JOIN x ON true JOIN d ON d.code = x.domain_code
ON CONFLICT DO NOTHING;

-- 4. PTCE Domains (10)
WITH a AS (SELECT id FROM public.nova_assessments WHERE code = 'PTCE')
INSERT INTO public.nova_assessment_domains (assessment_id, code, name, display_order, priority_order, description, is_profile_driving)
SELECT a.id, x.code, x.name, x.display_order, x.display_order, x.description, true
FROM a CROSS JOIN (VALUES
  ('ENG', 'Engagement', 1, 'Caregiver participation and involvement in training'),
  ('COA', 'Coachability', 2, 'Receptiveness to feedback and guidance'),
  ('EMR', 'Emotional Regulation', 3, 'Caregiver ability to manage own emotional responses'),
  ('KNO', 'Knowledge', 4, 'Understanding of ABA principles and strategies'),
  ('IMP', 'Implementation Skill', 5, 'Ability to carry out trained procedures'),
  ('CON', 'Consistency', 6, 'Reliability in applying strategies across time'),
  ('INS', 'Insight', 7, 'Understanding of child behavior functions and needs'),
  ('FID', 'Fidelity', 8, 'Accuracy of procedure implementation'),
  ('CUL', 'Cultural Fit', 9, 'Alignment between intervention and family values'),
  ('CAP', 'Capacity', 10, 'Resources, time, and energy available for implementation')
) AS x(code, name, display_order, description)
ON CONFLICT DO NOTHING;

-- 5. PTCE Items (60)
WITH a AS (SELECT id FROM public.nova_assessments WHERE code = 'PTCE'),
d AS (SELECT d.id, d.code FROM public.nova_assessment_domains d JOIN a ON a.id = d.assessment_id),
x AS (SELECT * FROM (VALUES
  ('ENG',1,'PTCE_001','Attends scheduled training sessions consistently',false,1),
  ('ENG',2,'PTCE_002','Participates actively during training',false,2),
  ('ENG',3,'PTCE_003','Asks relevant questions about strategies',false,3),
  ('ENG',4,'PTCE_004','Completes assigned practice tasks between sessions',false,4),
  ('ENG',5,'PTCE_005','Shows interest in learning new approaches',false,5),
  ('ENG',6,'PTCE_006','Follows through on trainer recommendations',false,6),
  ('COA',7,'PTCE_007','Accepts feedback without becoming defensive',false,7),
  ('COA',8,'PTCE_008','Modifies behavior based on coaching',false,8),
  ('COA',9,'PTCE_009','Seeks clarification when unsure',false,9),
  ('COA',10,'PTCE_010','Demonstrates openness to trying new strategies',false,10),
  ('COA',11,'PTCE_011','Responds positively to constructive criticism',false,11),
  ('COA',12,'PTCE_012','Implements suggested changes between sessions',false,12),
  ('EMR',13,'PTCE_013','Manages frustration during child challenging behavior',false,13),
  ('EMR',14,'PTCE_014','Maintains composure during training scenarios',false,14),
  ('EMR',15,'PTCE_015','Recovers from emotional reactions appropriately',false,15),
  ('EMR',16,'PTCE_016','Does not escalate when child behavior worsens',false,16),
  ('EMR',17,'PTCE_017','Models calm behavior during difficult moments',false,17),
  ('EMR',18,'PTCE_018','Recognizes own emotional triggers',false,18),
  ('KNO',19,'PTCE_019','Understands basic reinforcement principles',false,19),
  ('KNO',20,'PTCE_020','Can explain the function of child behavior',false,20),
  ('KNO',21,'PTCE_021','Differentiates between skill and performance deficits',false,21),
  ('KNO',22,'PTCE_022','Understands prompting hierarchies',false,22),
  ('KNO',23,'PTCE_023','Can describe target behaviors in observable terms',false,23),
  ('KNO',24,'PTCE_024','Understands why consistency matters',false,24),
  ('IMP',25,'PTCE_025','Delivers reinforcement contingently and immediately',false,25),
  ('IMP',26,'PTCE_026','Uses appropriate prompting levels',false,26),
  ('IMP',27,'PTCE_027','Implements antecedent strategies as trained',false,27),
  ('IMP',28,'PTCE_028','Follows planned response to challenging behavior',false,28),
  ('IMP',29,'PTCE_029','Collects data as instructed',false,29),
  ('IMP',30,'PTCE_030','Generalizes strategies to new situations',false,30),
  ('CON',31,'PTCE_031','Applies strategies across different times of day',false,31),
  ('CON',32,'PTCE_032','Maintains intervention procedures over weeks',false,32),
  ('CON',33,'PTCE_033','Does not revert to old patterns under stress',false,33),
  ('CON',34,'PTCE_034','Both caregivers apply strategies similarly',false,34),
  ('CON',35,'PTCE_035','Follows through even when initial results are slow',false,35),
  ('CON',36,'PTCE_036','Maintains routines and structure as trained',false,36),
  ('INS',37,'PTCE_037','Recognizes antecedents to child behavior',false,37),
  ('INS',38,'PTCE_038','Identifies what maintains challenging behavior',false,38),
  ('INS',39,'PTCE_039','Understands child communication attempts',false,39),
  ('INS',40,'PTCE_040','Differentiates between can not and will not',false,40),
  ('INS',41,'PTCE_041','Recognizes progress even when small',false,41),
  ('INS',42,'PTCE_042','Adjusts expectations based on child ability level',false,42),
  ('FID',43,'PTCE_043','Implements procedures as designed without modification',false,43),
  ('FID',44,'PTCE_044','Maintains correct timing for reinforcement delivery',false,44),
  ('FID',45,'PTCE_045','Uses correct prompt levels as specified',false,45),
  ('FID',46,'PTCE_046','Does not add unauthorized consequences',false,46),
  ('FID',47,'PTCE_047','Follows extinction procedures as trained',false,47),
  ('FID',48,'PTCE_048','Records data accurately',false,48),
  ('CUL',49,'PTCE_049','Intervention goals align with family priorities',false,49),
  ('CUL',50,'PTCE_050','Strategies are compatible with family routines',false,50),
  ('CUL',51,'PTCE_051','Caregiver feels respected in the training relationship',false,51),
  ('CUL',52,'PTCE_052','Cultural values are reflected in intervention design',false,52),
  ('CUL',53,'PTCE_053','Discipline philosophy is acknowledged and integrated',false,53),
  ('CUL',54,'PTCE_054','Communication style of trainer matches caregiver preference',false,54),
  ('CAP',55,'PTCE_055','Has sufficient time to implement strategies daily',false,55),
  ('CAP',56,'PTCE_056','Has access to necessary materials and resources',false,56),
  ('CAP',57,'PTCE_057','Physical and mental health supports implementation',false,57),
  ('CAP',58,'PTCE_058','Household demands allow focus on intervention',false,58),
  ('CAP',59,'PTCE_059','Has support from other household members',false,59),
  ('CAP',60,'PTCE_060','Can maintain implementation without professional present',false,60)
) AS t(domain_code,item_number,item_code,item_text,reverse_scored,display_order))
INSERT INTO public.nova_assessment_items (assessment_id, domain_id, item_number, item_code, item_text, reverse_scored, display_order)
SELECT a.id, d.id, x.item_number, x.item_code, x.item_text, x.reverse_scored, x.display_order
FROM a JOIN x ON true JOIN d ON d.code = x.domain_code
ON CONFLICT DO NOTHING;

-- 6. MCI Scoring Function
CREATE OR REPLACE FUNCTION public.nova_assign_mci_profile(p_session_id uuid)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_si numeric; v_sri numeric; v_iem numeric; v_sfr numeric;
  v_poc numeric; v_cc numeric; v_cbm numeric; v_ishd numeric;
  v_total numeric;
  v_profile_key text; v_profile_label text;
  v_sec_key text; v_sec_label text;
BEGIN
  SELECT avg_score INTO v_si FROM public.nova_assessment_results WHERE session_id = p_session_id AND result_scope = 'domain' AND result_key = 'SI';
  SELECT avg_score INTO v_sri FROM public.nova_assessment_results WHERE session_id = p_session_id AND result_scope = 'domain' AND result_key = 'SRI';
  SELECT avg_score INTO v_iem FROM public.nova_assessment_results WHERE session_id = p_session_id AND result_scope = 'domain' AND result_key = 'IEM';
  SELECT avg_score INTO v_sfr FROM public.nova_assessment_results WHERE session_id = p_session_id AND result_scope = 'domain' AND result_key = 'SFR';
  SELECT avg_score INTO v_poc FROM public.nova_assessment_results WHERE session_id = p_session_id AND result_scope = 'domain' AND result_key = 'POC';
  SELECT avg_score INTO v_cc FROM public.nova_assessment_results WHERE session_id = p_session_id AND result_scope = 'domain' AND result_key = 'CC';
  SELECT avg_score INTO v_cbm FROM public.nova_assessment_results WHERE session_id = p_session_id AND result_scope = 'domain' AND result_key = 'CBM';
  SELECT avg_score INTO v_ishd FROM public.nova_assessment_results WHERE session_id = p_session_id AND result_scope = 'domain' AND result_key = 'ISHD';

  v_total := (coalesce(v_si,0)+coalesce(v_sri,0)+coalesce(v_iem,0)+coalesce(v_sfr,0)+coalesce(v_poc,0)+coalesce(v_cc,0)+coalesce(v_cbm,0)+coalesce(v_ishd,0)) * 6;

  DELETE FROM public.nova_assessment_results WHERE session_id = p_session_id AND result_scope IN ('profile','flag','total');

  INSERT INTO public.nova_assessment_results (session_id, result_scope, result_key, result_label, avg_score, band_label)
  VALUES (p_session_id, 'total', 'TOTAL', 'Total Score', v_total,
    CASE WHEN v_total >= 120 THEN 'Very High Masking' WHEN v_total >= 96 THEN 'High Masking' WHEN v_total >= 72 THEN 'Significant Masking' WHEN v_total >= 48 THEN 'Moderate Masking' WHEN v_total >= 24 THEN 'Mild Masking' ELSE 'Minimal Masking' END);

  IF v_total >= 96 OR (v_si*6 >= 15 AND v_cc*6 >= 15) THEN
    INSERT INTO public.nova_assessment_results (session_id, result_scope, result_key, result_label) VALUES (p_session_id, 'flag', 'MISSED_ND_RISK', 'Missed Neurodevelopmental Risk');
  END IF;
  IF v_iem*6 >= 15 AND v_ishd*6 >= 15 THEN
    INSERT INTO public.nova_assessment_results (session_id, result_scope, result_key, result_label) VALUES (p_session_id, 'flag', 'INTERNALIZED_DISTRESS', 'Internalized Distress Risk');
  END IF;
  IF v_cbm*6 >= 15 AND v_poc*6 >= 15 THEN
    INSERT INTO public.nova_assessment_results (session_id, result_scope, result_key, result_label) VALUES (p_session_id, 'flag', 'COMPLIANCE_MASKING', 'Compliance-Based Masking Risk');
  END IF;
  IF v_sri*6 >= 15 AND v_poc*6 >= 15 AND v_cc*6 >= 10 THEN
    INSERT INTO public.nova_assessment_results (session_id, result_scope, result_key, result_label) VALUES (p_session_id, 'flag', 'HIGH_PERFORMING_MASKER', 'High-Performing Masker Flag');
  END IF;
  IF v_iem*6 >= 15 AND v_sfr*6 >= 15 THEN
    INSERT INTO public.nova_assessment_results (session_id, result_scope, result_key, result_label) VALUES (p_session_id, 'flag', 'HOME_SCHOOL_DISCREPANCY', 'Home-School Discrepancy Risk');
  END IF;

  v_profile_key := 'MIXED_MASKING'; v_profile_label := 'Mixed Masking Profile';
  v_sec_key := NULL; v_sec_label := NULL;

  IF v_si*6 >= 15 AND v_cc*6 >= 15 AND v_sri*6 >= 10 THEN
    v_profile_key := 'SOCIAL_CAMOUFLAGE'; v_profile_label := 'Social Camouflage Profile';
  END IF;
  IF v_sri*6 >= 15 AND v_poc*6 >= 15 AND v_cc*6 >= 10 THEN
    IF v_profile_key = 'MIXED_MASKING' THEN v_profile_key := 'HIGH_PERFORMING_MASKER'; v_profile_label := 'High-Performing Masker';
    ELSE v_sec_key := 'HIGH_PERFORMING_MASKER'; v_sec_label := 'High-Performing Masker'; END IF;
  END IF;
  IF v_cbm*6 >= 15 AND v_poc*6 >= 15 AND v_iem*6 >= 10 THEN
    IF v_profile_key = 'MIXED_MASKING' THEN v_profile_key := 'COMPLIANT_CHAMELEON'; v_profile_label := 'Compliant Chameleon';
    ELSIF v_sec_key IS NULL THEN v_sec_key := 'COMPLIANT_CHAMELEON'; v_sec_label := 'Compliant Chameleon'; END IF;
  END IF;
  IF v_sfr*6 >= 15 AND v_iem*6 >= 15 AND v_ishd*6 >= 10 THEN
    IF v_profile_key = 'MIXED_MASKING' THEN v_profile_key := 'EXHAUSTED_MASKER'; v_profile_label := 'Exhausted Masker';
    ELSIF v_sec_key IS NULL THEN v_sec_key := 'EXHAUSTED_MASKER'; v_sec_label := 'Exhausted Masker'; END IF;
  END IF;
  IF v_ishd*6 >= 15 AND v_iem*6 >= 15 THEN
    IF v_profile_key = 'MIXED_MASKING' THEN v_profile_key := 'HIDDEN_DISTRESS'; v_profile_label := 'Hidden Distress Profile';
    ELSIF v_sec_key IS NULL THEN v_sec_key := 'HIDDEN_DISTRESS'; v_sec_label := 'Hidden Distress Profile'; END IF;
  END IF;

  INSERT INTO public.nova_assessment_results (session_id, result_scope, result_key, result_label, is_primary) VALUES (p_session_id, 'profile', v_profile_key, v_profile_label, true);
  IF v_sec_key IS NOT NULL THEN
    INSERT INTO public.nova_assessment_results (session_id, result_scope, result_key, result_label, is_secondary) VALUES (p_session_id, 'profile', v_sec_key, v_sec_label, true);
  END IF;
END;
$$;

-- 7. PTCE Scoring Function
CREATE OR REPLACE FUNCTION public.nova_assign_ptce_profile(p_session_id uuid)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_eng numeric; v_coa numeric; v_emr numeric; v_kno numeric; v_imp numeric;
  v_con numeric; v_ins numeric; v_fid numeric; v_cul numeric; v_cap numeric;
  v_total numeric;
BEGIN
  SELECT avg_score INTO v_eng FROM public.nova_assessment_results WHERE session_id = p_session_id AND result_scope = 'domain' AND result_key = 'ENG';
  SELECT avg_score INTO v_coa FROM public.nova_assessment_results WHERE session_id = p_session_id AND result_scope = 'domain' AND result_key = 'COA';
  SELECT avg_score INTO v_emr FROM public.nova_assessment_results WHERE session_id = p_session_id AND result_scope = 'domain' AND result_key = 'EMR';
  SELECT avg_score INTO v_kno FROM public.nova_assessment_results WHERE session_id = p_session_id AND result_scope = 'domain' AND result_key = 'KNO';
  SELECT avg_score INTO v_imp FROM public.nova_assessment_results WHERE session_id = p_session_id AND result_scope = 'domain' AND result_key = 'IMP';
  SELECT avg_score INTO v_con FROM public.nova_assessment_results WHERE session_id = p_session_id AND result_scope = 'domain' AND result_key = 'CON';
  SELECT avg_score INTO v_ins FROM public.nova_assessment_results WHERE session_id = p_session_id AND result_scope = 'domain' AND result_key = 'INS';
  SELECT avg_score INTO v_fid FROM public.nova_assessment_results WHERE session_id = p_session_id AND result_scope = 'domain' AND result_key = 'FID';
  SELECT avg_score INTO v_cul FROM public.nova_assessment_results WHERE session_id = p_session_id AND result_scope = 'domain' AND result_key = 'CUL';
  SELECT avg_score INTO v_cap FROM public.nova_assessment_results WHERE session_id = p_session_id AND result_scope = 'domain' AND result_key = 'CAP';

  v_total := (coalesce(v_eng,0)+coalesce(v_coa,0)+coalesce(v_emr,0)+coalesce(v_kno,0)+coalesce(v_imp,0)+coalesce(v_con,0)+coalesce(v_ins,0)+coalesce(v_fid,0)+coalesce(v_cul,0)+coalesce(v_cap,0)) * 6;

  DELETE FROM public.nova_assessment_results WHERE session_id = p_session_id AND result_scope IN ('profile','flag','total','barrier','tier','fidelity_risk');

  -- Total
  INSERT INTO public.nova_assessment_results (session_id, result_scope, result_key, result_label, avg_score, band_label)
  VALUES (p_session_id, 'total', 'TOTAL', 'Total Score', v_total,
    CASE WHEN v_total >= 181 THEN 'Low Support / Consultative' WHEN v_total >= 121 THEN 'Structured Support Needed' WHEN v_total >= 61 THEN 'Moderate Support Needed' ELSE 'High Support Needed' END);

  -- Barrier
  IF v_emr*6 <= 11 THEN
    INSERT INTO public.nova_assessment_results (session_id, result_scope, result_key, result_label, is_primary) VALUES (p_session_id, 'barrier', 'EMOTIONAL_REG', 'Emotional Regulation Barrier', true);
  ELSIF v_cap*6 <= 11 AND v_con*6 <= 11 THEN
    INSERT INTO public.nova_assessment_results (session_id, result_scope, result_key, result_label, is_primary) VALUES (p_session_id, 'barrier', 'CAPACITY_LIMIT', 'Capacity Limitation', true);
  ELSIF v_cul*6 <= 11 AND v_coa*6 <= 11 THEN
    INSERT INTO public.nova_assessment_results (session_id, result_scope, result_key, result_label, is_primary) VALUES (p_session_id, 'barrier', 'CULTURAL_MISALIGN', 'Cultural Misalignment', true);
  ELSIF v_kno*6 <= 11 AND v_imp*6 <= 11 THEN
    INSERT INTO public.nova_assessment_results (session_id, result_scope, result_key, result_label, is_primary) VALUES (p_session_id, 'barrier', 'SKILL_DEFICIT', 'Skill Deficit', true);
  ELSIF v_kno*6 >= 15 AND v_imp*6 <= 11 THEN
    INSERT INTO public.nova_assessment_results (session_id, result_scope, result_key, result_label, is_primary) VALUES (p_session_id, 'barrier', 'PERFORMANCE_DEFICIT', 'Performance Deficit', true);
  ELSE
    INSERT INTO public.nova_assessment_results (session_id, result_scope, result_key, result_label, is_primary) VALUES (p_session_id, 'barrier', 'NONE', 'No Primary Barrier Identified', true);
  END IF;

  -- Fidelity risk
  IF v_imp*6 <= 11 OR v_fid*6 <= 11 OR v_con*6 <= 11 OR v_cap*6 <= 11 THEN
    INSERT INTO public.nova_assessment_results (session_id, result_scope, result_key, result_label) VALUES (p_session_id, 'fidelity_risk', 'HIGH', 'High Fidelity Risk');
  ELSIF v_imp*6 <= 14 OR v_con*6 <= 14 THEN
    INSERT INTO public.nova_assessment_results (session_id, result_scope, result_key, result_label) VALUES (p_session_id, 'fidelity_risk', 'MODERATE', 'Moderate Fidelity Risk');
  ELSE
    INSERT INTO public.nova_assessment_results (session_id, result_scope, result_key, result_label) VALUES (p_session_id, 'fidelity_risk', 'LOW', 'Low Fidelity Risk');
  END IF;

  -- Training tier
  IF v_total <= 60 OR v_emr*6 <= 11 OR (v_cap*6 <= 11 AND v_con*6 <= 11) THEN
    INSERT INTO public.nova_assessment_results (session_id, result_scope, result_key, result_label, is_primary) VALUES (p_session_id, 'tier', 'TIER_4', 'Barrier-First Intervention', true);
  ELSIF v_total <= 120 THEN
    INSERT INTO public.nova_assessment_results (session_id, result_scope, result_key, result_label, is_primary) VALUES (p_session_id, 'tier', 'TIER_3', 'Intensive Coaching', true);
  ELSIF v_total <= 180 THEN
    INSERT INTO public.nova_assessment_results (session_id, result_scope, result_key, result_label, is_primary) VALUES (p_session_id, 'tier', 'TIER_2', 'Structured Coaching', true);
  ELSE
    INSERT INTO public.nova_assessment_results (session_id, result_scope, result_key, result_label, is_primary) VALUES (p_session_id, 'tier', 'TIER_1', 'Independent / Consultative', true);
  END IF;
END;
$$;

-- 8. Update master dispatcher
CREATE OR REPLACE FUNCTION public.nova_score_session(p_session_id uuid)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE v_assessment_code text;
BEGIN
  SELECT a.code INTO v_assessment_code
  FROM public.nova_assessment_sessions s
  JOIN public.nova_assessments a ON a.id = s.assessment_id
  WHERE s.id = p_session_id;

  IF v_assessment_code IN ('SBRDS','EFDP','ABRSE','MCI','PTCE') THEN
    PERFORM public.nova_score_domain_assessment(p_session_id);
  END IF;

  IF v_assessment_code = 'SBRDS' THEN PERFORM public.nova_assign_sbrds_profile(p_session_id);
  ELSIF v_assessment_code = 'EFDP' THEN PERFORM public.nova_assign_efdp_profile(p_session_id);
  ELSIF v_assessment_code = 'ABRSE' THEN PERFORM public.nova_assign_abrse_profile(p_session_id);
  ELSIF v_assessment_code = 'NAP' THEN PERFORM public.nova_score_nap(p_session_id);
  ELSIF v_assessment_code = 'MCI' THEN PERFORM public.nova_assign_mci_profile(p_session_id);
  ELSIF v_assessment_code = 'PTCE' THEN PERFORM public.nova_assign_ptce_profile(p_session_id);
  END IF;
END;
$$;

-- 9. Report snippets
WITH x AS (SELECT * FROM (VALUES
  ('MCI_SOCIAL_CAMOUFLAGE','Social Camouflage','The student demonstrates a social camouflage profile characterized by imitation of peer behavior and concealment of comprehension difficulties.','profile_statement'),
  ('MCI_EXHAUSTED','Exhausted Masker','The student demonstrates an exhausted masker profile with significant social fatigue, internal-external mismatch, and identity strain.','profile_statement'),
  ('MCI_COMPLIANT','Compliant Chameleon','The student demonstrates a compliant chameleon profile marked by excessive rule-following and suppression of authentic needs.','profile_statement'),
  ('MCI_HIGH_PERFORMING','High-Performing Masker','The student demonstrates a high-performing masker profile with scripted interactions, perfectionism, and concealed confusion.','profile_statement'),
  ('MCI_HIDDEN_DISTRESS','Hidden Distress','The student demonstrates a hidden distress profile with significant identity strain and internal-external discrepancy.','profile_statement'),
  ('MCI_BURNOUT_RISK','Burnout Risk','The combination of high masking effort and social fatigue suggests elevated risk for autistic burnout.','pattern_insight')
) AS t(snippet_key,snippet_label,snippet_text,snippet_type))
INSERT INTO public.nova_report_snippets (assessment_id, snippet_key, snippet_label, snippet_text, snippet_type)
SELECT a.id, x.snippet_key, x.snippet_label, x.snippet_text, x.snippet_type
FROM public.nova_assessments a JOIN x ON true WHERE a.code = 'MCI'
ON CONFLICT DO NOTHING;

WITH x AS (SELECT * FROM (VALUES
  ('PTCE_TIER4','Barrier-First','Caregiver findings indicate a barrier-first profile suggesting that intervention success depends on addressing regulation, capacity, and feasibility before increasing procedural demands.','profile_statement'),
  ('PTCE_TIER3','Intensive Coaching','Caregiver requires intensive structured coaching with frequent modeling, rehearsal, and feedback cycles.','profile_statement'),
  ('PTCE_SKILL_DEF','Skill Deficit','Implementation challenges appear rooted in knowledge and skill gaps rather than motivation or capacity.','profile_statement'),
  ('PTCE_PERF_DEF','Performance Deficit','Caregiver demonstrates knowledge but struggles to implement consistently, suggesting a performance rather than skill deficit.','profile_statement'),
  ('PTCE_CULTURAL','Cultural Misalignment','Implementation challenges appear influenced by misalignment between intervention style and caregiver values or discipline framework.','profile_statement'),
  ('PTCE_CAPACITY','Capacity Limitation','Implementation is limited by available resources, time, or energy rather than willingness or skill.','profile_statement')
) AS t(snippet_key,snippet_label,snippet_text,snippet_type))
INSERT INTO public.nova_report_snippets (assessment_id, snippet_key, snippet_label, snippet_text, snippet_type)
SELECT a.id, x.snippet_key, x.snippet_label, x.snippet_text, x.snippet_type
FROM public.nova_assessments a JOIN x ON true WHERE a.code = 'PTCE'
ON CONFLICT DO NOTHING;
