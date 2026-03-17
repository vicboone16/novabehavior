import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { differenceInMonths, differenceInYears } from 'date-fns';

// Types
export interface Vineland3Domain {
  id: string;
  domain_key: string;
  domain_name: string;
  display_order: number;
  subdomains: Vineland3Subdomain[];
}

export interface Vineland3Subdomain {
  id: string;
  subdomain_key: string;
  subdomain_name: string;
  display_order: number;
  domain_id: string;
}

export interface Vineland3Item {
  id: string;
  item_code: string;
  item_number: number;
  display_label: string;
  score_min: number;
  score_max: number;
  domain_id: string;
  subdomain_id: string;
  display_order: number;
}

export interface Vineland3FormType {
  form_key: string;
  form_name: string;
  description: string;
}

export interface Vineland3Assessment {
  id: string;
  student_id: string;
  form_key: string;
  status: string;
  assessor_name: string | null;
  respondent_name: string | null;
  respondent_relationship: string | null;
  administration_date: string;
  chronological_age_months: number | null;
  chronological_age_display: string | null;
  age_band_key: string | null;
  notes: string | null;
  locked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Vineland3ItemScore {
  id: string;
  student_assessment_id: string;
  item_id: string;
  entered_score: number | null;
  response_note: string | null;
}

export interface Vineland3RawScore {
  domain_key: string;
  subdomain_key: string;
  raw_score: number | null;
  items_scored: number;
  items_missing: number;
  completion_status: string;
}

export interface Vineland3DerivedScore {
  score_level: string;
  domain_key: string;
  subdomain_key: string;
  composite_key: string;
  raw_score: number | null;
  v_scale_score: number | null;
  standard_score: number | null;
  percentile: number | null;
  adaptive_level: string | null;
  age_equivalent: string | null;
  gsv: number | null;
}

export interface Vineland3PairwiseComparison {
  id: string;
  comparison_level: string;
  comparison_label: string;
  score_1_key: string;
  score_2_key: string;
  score_1_value: number | null;
  score_2_value: number | null;
  difference_value: number | null;
  significant_difference: boolean | null;
  base_rate: string | null;
}

export interface Vineland3ScoringStatus {
  overall_scoring_status: string;
  age_resolution_status: string | null;
  raw_score_status: string | null;
  subdomain_lookup_status: string | null;
  domain_score_status: string | null;
  composite_score_status: string | null;
  comparison_status: string | null;
  status_notes: string | null;
  last_scored_at: string | null;
}
function resolveAgeBand(ageMonths: number): string {
  if (ageMonths < 12) return '0y_0m_to_0y_11m';
  if (ageMonths < 24) return '1y_0m_to_1y_11m';
  if (ageMonths < 36) return '2y_0m_to_2y_11m';
  if (ageMonths < 42) return '3y_0m_to_3y_5m';
  if (ageMonths < 48) return '3y_6m_to_3y_11m';
  if (ageMonths < 54) return '4y_0m_to_4y_5m';
  if (ageMonths < 60) return '4y_6m_to_4y_11m';
  if (ageMonths < 66) return '5y_0m_to_5y_5m';
  if (ageMonths < 72) return '5y_6m_to_5y_11m';
  if (ageMonths < 84) return '6y_0m_to_6y_11m';
  if (ageMonths < 96) return '7y_0m_to_7y_11m';
  if (ageMonths < 108) return '8y_0m_to_8y_11m';
  if (ageMonths < 120) return '9y_0m_to_9y_11m';
  if (ageMonths < 132) return '10y_0m_to_10y_11m';
  if (ageMonths < 144) return '11y_0m_to_11y_11m';
  if (ageMonths < 156) return '12y_0m_to_12y_11m';
  if (ageMonths < 168) return '13y_0m_to_13y_11m';
  if (ageMonths < 180) return '14y_0m_to_14y_11m';
  if (ageMonths < 192) return '15y_0m_to_15y_11m';
  if (ageMonths < 204) return '16y_0m_to_16y_11m';
  if (ageMonths < 216) return '17y_0m_to_17y_11m';
  if (ageMonths < 228) return '18y_0m_to_18y_11m';
  if (ageMonths < 264) return '19y_0m_to_21y_11m';
  return '22y_plus';
}

function formatAge(dob: string, adminDate: string): { months: number; display: string } {
  const d = new Date(dob);
  const a = new Date(adminDate);
  const totalMonths = differenceInMonths(a, d);
  const years = differenceInYears(a, d);
  const months = totalMonths - (years * 12);
  return { months: totalMonths, display: `${years}y ${months}m` };
}

// Domain keys that contribute to the Adaptive Behavior Composite
const ABC_DOMAIN_KEYS = ['communication', 'daily_living_skills', 'socialization'];
// Subdomains per domain for v-scale summing
const DOMAIN_SUBDOMAINS: Record<string, string[]> = {
  communication: ['receptive', 'expressive', 'written'],
  daily_living_skills: ['personal', 'domestic', 'community'],
  socialization: ['interpersonal_relationships', 'play_and_leisure', 'coping_skills'],
  motor_skills: ['gross_motor', 'fine_motor'],
};

export function useVineland3(studentId: string, studentDob?: string) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [domains, setDomains] = useState<Vineland3Domain[]>([]);
  const [items, setItems] = useState<Vineland3Item[]>([]);
  const [formTypes, setFormTypes] = useState<Vineland3FormType[]>([]);
  const [assessments, setAssessments] = useState<Vineland3Assessment[]>([]);

  // Load template data + student assessments
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [domainRes, subdomainRes, itemRes, formRes, assessmentRes] = await Promise.all([
        supabase.from('vineland3_domains').select('*').eq('is_active', true).order('display_order'),
        supabase.from('vineland3_subdomains').select('*').eq('is_active', true).order('display_order'),
        supabase.from('vineland3_items').select('*').eq('is_active', true).order('display_order'),
        supabase.from('vineland3_form_types').select('*').eq('is_active', true),
        supabase.from('vineland3_student_assessments').select('*').eq('student_id', studentId).order('administration_date', { ascending: false }),
      ]);

      const subs = (subdomainRes.data || []) as unknown as Vineland3Subdomain[];
      const doms = ((domainRes.data || []) as unknown as Vineland3Domain[]).map(d => ({
        ...d,
        subdomains: subs.filter(s => s.domain_id === d.id).sort((a, b) => a.display_order - b.display_order),
      }));

      setDomains(doms);
      setItems((itemRes.data || []) as unknown as Vineland3Item[]);
      setFormTypes((formRes.data || []) as unknown as Vineland3FormType[]);
      setAssessments((assessmentRes.data || []) as unknown as Vineland3Assessment[]);
    } catch (err) {
      console.error('Error loading Vineland-3 data:', err);
      toast.error('Failed to load Vineland-3 data');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => { loadData(); }, [loadData]);

  // Create new assessment
  const createAssessment = async (formKey: string, respondentName?: string, respondentRelationship?: string) => {
    const adminDate = new Date().toISOString().split('T')[0];
    let ageMonths: number | undefined;
    let ageDisplay: string | undefined;
    let ageBand: string | undefined;

    if (studentDob) {
      const age = formatAge(studentDob, adminDate);
      ageMonths = age.months;
      ageDisplay = age.display;
      ageBand = resolveAgeBand(age.months);
    }

    const { data, error } = await supabase
      .from('vineland3_student_assessments')
      .insert({
        student_id: studentId,
        form_key: formKey,
        assessor_user_id: user?.id,
        respondent_name: respondentName || null,
        respondent_relationship: respondentRelationship || null,
        administration_date: adminDate,
        chronological_age_months: ageMonths ?? null,
        chronological_age_display: ageDisplay ?? null,
        age_band_key: ageBand ?? null,
        created_by: user?.id,
      })
      .select('*')
      .single();

    if (error) { toast.error('Failed to create assessment'); throw error; }
    const row = data as unknown as Vineland3Assessment;
    setAssessments(prev => [row, ...prev]);
    toast.success('Vineland-3 assessment created');
    return row;
  };

  // Delete assessment
  const deleteAssessment = async (assessmentId: string) => {
    const { error } = await supabase.from('vineland3_student_assessments').delete().eq('id', assessmentId);
    if (error) { toast.error('Failed to delete'); throw error; }
    setAssessments(prev => prev.filter(a => a.id !== assessmentId));
    toast.success('Assessment deleted');
  };

  // Load item scores for an assessment
  const loadItemScores = async (assessmentId: string): Promise<Record<string, Vineland3ItemScore>> => {
    const { data } = await supabase
      .from('vineland3_item_scores')
      .select('*')
      .eq('student_assessment_id', assessmentId);
    const map: Record<string, Vineland3ItemScore> = {};
    (data || []).forEach((s: any) => { map[s.item_id] = s as Vineland3ItemScore; });
    return map;
  };

  // Save a single item score (upsert)
  const saveItemScore = async (
    assessmentId: string,
    item: Vineland3Item,
    domain: Vineland3Domain,
    subdomain: Vineland3Subdomain,
    score: number | null,
    note?: string
  ) => {
    const { error } = await supabase
      .from('vineland3_item_scores')
      .upsert({
        student_assessment_id: assessmentId,
        item_id: item.id,
        item_code_snapshot: item.item_code,
        item_number_snapshot: item.item_number,
        domain_key_snapshot: domain.domain_key,
        subdomain_key_snapshot: subdomain.subdomain_key,
        display_label_snapshot: item.display_label,
        entered_score: score,
        response_note: note || null,
        entered_by: user?.id,
        entered_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'student_assessment_id,item_id' });

    if (error) throw error;
  };

  // Calculate raw scores for an assessment
  const calculateRawScores = async (assessmentId: string): Promise<Vineland3RawScore[]> => {
    const scores = await loadItemScores(assessmentId);
    const results: Vineland3RawScore[] = [];

    for (const domain of domains) {
      for (const sub of domain.subdomains) {
        const subItems = items.filter(i => i.subdomain_id === sub.id);
        const scoredItems = subItems.filter(i => scores[i.id]?.entered_score != null);
        const rawScore = scoredItems.reduce((sum, i) => sum + (scores[i.id]?.entered_score || 0), 0);
        const missing = subItems.length - scoredItems.length;

        const result: Vineland3RawScore = {
          domain_key: domain.domain_key,
          subdomain_key: sub.subdomain_key,
          raw_score: scoredItems.length > 0 ? rawScore : null,
          items_scored: scoredItems.length,
          items_missing: missing,
          completion_status: missing === 0 ? 'complete' : scoredItems.length > 0 ? 'partial' : 'incomplete',
        };
        results.push(result);

        await supabase.from('vineland3_raw_scores').upsert({
          student_assessment_id: assessmentId,
          domain_key: domain.domain_key,
          subdomain_key: sub.subdomain_key,
          raw_score: result.raw_score,
          items_scored: result.items_scored,
          items_missing: result.items_missing,
          completion_status: result.completion_status,
          calculated_at: new Date().toISOString(),
        }, { onConflict: 'student_assessment_id,subdomain_key' });
      }
    }
    return results;
  };

  /**
   * Score Full Assessment via server-side RPC orchestrator.
   * Calls score_vineland_assessment which runs all stages:
   *   resolve_age_band → raw_scores → subdomain → domain → composite → pairwise → status
   * Then reloads all results from the DB.
   */
  const scoreFullAssessment = async (assessmentId: string): Promise<{
    status: string;
    rawScores: Vineland3RawScore[];
    derivedScores: Vineland3DerivedScore[];
    pairwise: Vineland3PairwiseComparison[];
    scoringStatus: Vineland3ScoringStatus | null;
  }> => {
    // Call the master orchestrator RPC
    const { data: rpcResult, error: rpcError } = await supabase.rpc('score_vineland_assessment', {
      p_student_assessment_id: assessmentId,
    });

    if (rpcError) {
      console.error('score_vineland_assessment RPC error:', rpcError);
      throw rpcError;
    }

    // Reload all results from DB in parallel
    const [rawRes, derivedRes, pairwiseRes, statusRes, assessmentRes] = await Promise.all([
      supabase.from('vineland3_raw_scores').select('*').eq('student_assessment_id', assessmentId),
      supabase.from('vineland3_derived_scores').select('*').eq('student_assessment_id', assessmentId),
      supabase.from('vineland3_pairwise_comparisons').select('*').eq('student_assessment_id', assessmentId),
      supabase.from('vineland3_scoring_status').select('*').eq('student_assessment_id', assessmentId).maybeSingle(),
      supabase.from('vineland3_student_assessments').select('*').eq('id', assessmentId).single(),
    ]);

    const rawScores: Vineland3RawScore[] = (rawRes.data || []).map((r: any) => ({
      domain_key: r.domain_key,
      subdomain_key: r.subdomain_key,
      raw_score: r.raw_score,
      items_scored: r.items_scored,
      items_missing: r.items_missing,
      completion_status: r.completion_status,
    }));

    const derivedScores: Vineland3DerivedScore[] = (derivedRes.data || []).map((d: any) => ({
      score_level: d.score_level,
      domain_key: d.domain_key,
      subdomain_key: d.subdomain_key,
      composite_key: d.composite_key,
      raw_score: d.raw_score,
      v_scale_score: d.v_scale_score,
      standard_score: d.standard_score,
      percentile: d.percentile,
      adaptive_level: d.adaptive_level,
      age_equivalent: d.age_equivalent,
      gsv: d.gsv,
    }));

    const pairwise: Vineland3PairwiseComparison[] = (pairwiseRes.data || []).map((p: any) => ({
      id: p.id,
      comparison_level: p.comparison_level,
      comparison_label: p.comparison_label,
      score_1_key: p.score_1_key,
      score_2_key: p.score_2_key,
      score_1_value: p.score_1_value,
      score_2_value: p.score_2_value,
      difference_value: p.difference_value,
      significant_difference: p.significant_difference,
      base_rate: p.base_rate,
    }));

    const scoringStatus: Vineland3ScoringStatus | null = statusRes.data ? {
      overall_scoring_status: (statusRes.data as any).overall_scoring_status,
      age_resolution_status: (statusRes.data as any).age_resolution_status,
      raw_score_status: (statusRes.data as any).raw_score_status,
      subdomain_lookup_status: (statusRes.data as any).subdomain_lookup_status,
      domain_score_status: (statusRes.data as any).domain_score_status,
      composite_score_status: (statusRes.data as any).composite_score_status,
      comparison_status: (statusRes.data as any).comparison_status,
      status_notes: (statusRes.data as any).status_notes,
      last_scored_at: (statusRes.data as any).last_scored_at,
    } : null;

    // Update the assessment in local state (age band, scored_at, etc.)
    if (assessmentRes.data) {
      const updated = assessmentRes.data as unknown as Vineland3Assessment;
      setAssessments(prev => prev.map(a => a.id === assessmentId ? updated : a));
    }

    const overallStatus = scoringStatus?.overall_scoring_status || 'unknown';
    return { status: overallStatus, rawScores, derivedScores, pairwise, scoringStatus };
  };

  /**
   * Legacy client-side derived score calculation (kept for fallback).
   */
  const calculateDerivedScores = async (assessmentId: string): Promise<{ status: string; scores: Vineland3DerivedScore[] }> => {
    const assessment = assessments.find(a => a.id === assessmentId);
    if (!assessment) return { status: 'error', scores: [] };

    const rawScores = await calculateRawScores(assessmentId);
    const derivedScores: Vineland3DerivedScore[] = [];
    let lookupFound = 0;
    let lookupMissing = 0;

    const vScaleMap: Record<string, number> = {};

    for (const raw of rawScores) {
      if (raw.raw_score == null) continue;
      const { data: normData } = await supabase.rpc('calculate_vineland_subdomain_vscore', {
        p_form: assessment.form_key,
        p_age_band: assessment.age_band_key || '',
        p_subdomain: raw.subdomain_key,
        p_raw: raw.raw_score,
      });
      const norm = normData?.[0] as any;
      if (norm) {
        lookupFound++;
        vScaleMap[raw.subdomain_key] = norm.v_scale;
        derivedScores.push({ score_level: 'subdomain', domain_key: raw.domain_key, subdomain_key: raw.subdomain_key, composite_key: '', raw_score: raw.raw_score, v_scale_score: norm.v_scale, standard_score: null, percentile: null, adaptive_level: null, age_equivalent: norm.age_equivalent, gsv: norm.gsv });
        await supabase.from('vineland3_derived_scores').upsert({ student_assessment_id: assessmentId, score_level: 'subdomain', domain_key: raw.domain_key, subdomain_key: raw.subdomain_key, composite_key: '', raw_score: raw.raw_score, v_scale_score: norm.v_scale, standard_score: null, percentile: null, adaptive_level: null, age_equivalent: norm.age_equivalent, gsv: norm.gsv, calculated_at: new Date().toISOString() }, { onConflict: 'student_assessment_id,score_level,domain_key,subdomain_key,composite_key' });
      } else { lookupMissing++; }
    }

    const domainStandardScores: Record<string, number> = {};
    for (const [domainKey, subKeys] of Object.entries(DOMAIN_SUBDOMAINS)) {
      if (!subKeys.every(sk => vScaleMap[sk] != null)) continue;
      const vScaleSum = subKeys.reduce((sum, sk) => sum + (vScaleMap[sk] || 0), 0);
      const { data: domainData } = await supabase.rpc('calculate_vineland_domain_score', { p_form: assessment.form_key, p_age_band: assessment.age_band_key || '', p_domain: domainKey, p_vsum: vScaleSum });
      const domNorm = domainData?.[0] as any;
      if (domNorm) {
        lookupFound++;
        domainStandardScores[domainKey] = domNorm.standard_score;
        derivedScores.push({ score_level: 'domain', domain_key: domainKey, subdomain_key: '', composite_key: '', raw_score: vScaleSum, v_scale_score: vScaleSum, standard_score: domNorm.standard_score, percentile: domNorm.percentile, adaptive_level: domNorm.adaptive_level, age_equivalent: null, gsv: null });
        await supabase.from('vineland3_derived_scores').upsert({ student_assessment_id: assessmentId, score_level: 'domain', domain_key: domainKey, subdomain_key: '', composite_key: '', raw_score: vScaleSum, v_scale_score: vScaleSum, standard_score: domNorm.standard_score, percentile: domNorm.percentile, adaptive_level: domNorm.adaptive_level, age_equivalent: null, gsv: null, calculated_at: new Date().toISOString() }, { onConflict: 'student_assessment_id,score_level,domain_key,subdomain_key,composite_key' });
      } else { lookupMissing++; }
    }

    if (ABC_DOMAIN_KEYS.every(dk => domainStandardScores[dk] != null)) {
      const compositeSum = ABC_DOMAIN_KEYS.reduce((sum, dk) => sum + (domainStandardScores[dk] || 0), 0);
      const { data: compData } = await supabase.rpc('calculate_vineland_composite_score', { p_form: assessment.form_key, p_age_band: assessment.age_band_key || '', p_composite: 'adaptive_behavior_composite', p_lookup: compositeSum });
      const compNorm = compData?.[0] as any;
      if (compNorm) {
        lookupFound++;
        derivedScores.push({ score_level: 'composite', domain_key: '', subdomain_key: '', composite_key: 'adaptive_behavior_composite', raw_score: compositeSum, v_scale_score: null, standard_score: compNorm.standard_score, percentile: compNorm.percentile, adaptive_level: compNorm.adaptive_level, age_equivalent: null, gsv: null });
        await supabase.from('vineland3_derived_scores').upsert({ student_assessment_id: assessmentId, score_level: 'composite', domain_key: '', subdomain_key: '', composite_key: 'adaptive_behavior_composite', raw_score: compositeSum, v_scale_score: null, standard_score: compNorm.standard_score, percentile: compNorm.percentile, adaptive_level: compNorm.adaptive_level, age_equivalent: null, gsv: null, calculated_at: new Date().toISOString() }, { onConflict: 'student_assessment_id,score_level,domain_key,subdomain_key,composite_key' });
      } else { lookupMissing++; }
    }

    const status = lookupFound === 0 ? 'lookup_missing' : lookupMissing > 0 ? 'partial_lookup' : 'complete';
    return { status, scores: derivedScores };
  };

  // Update assessment status
  const updateAssessmentStatus = async (assessmentId: string, status: string) => {
    const updates: any = { status, updated_at: new Date().toISOString() };
    if (status === 'completed') updates.date_completed = new Date().toISOString();
    if (status === 'locked') updates.locked_at = new Date().toISOString();

    const { error } = await supabase
      .from('vineland3_student_assessments')
      .update(updates)
      .eq('id', assessmentId);

    if (error) throw error;
    setAssessments(prev => prev.map(a => a.id === assessmentId ? { ...a, ...updates } : a));
  };

  return {
    loading,
    domains,
    items,
    formTypes,
    assessments,
    createAssessment,
    deleteAssessment,
    loadItemScores,
    saveItemScore,
    calculateRawScores,
    calculateDerivedScores,
    updateAssessmentStatus,
    refresh: loadData,
  };
}
