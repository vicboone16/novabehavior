/**
 * Criteria Evaluation Engine
 * 
 * Computes met/not_met for each criteria_type against trial data,
 * produces evidence objects, and recommended actions.
 */

import type {
  CriteriaRuleJson,
  CriteriaType,
  TargetPhase,
  WindowType,
} from '@/types/criteriaEngine';

// ── Types ──

export interface SessionAggregate {
  session_id: string;
  session_date: string;
  session_type: 'teaching' | 'probe' | 'any';
  total_opportunities: number;
  independent_count: number;
  prompted_count: number;
  incorrect_count: number;
  pct_correct: number;
  pct_independent: number;
  // For generalization
  person_id?: string | null;
  setting_id?: string | null;
  material_id?: string | null;
}

export interface EvaluationResult {
  criteria_type: CriteriaType;
  met_status: boolean;
  met_at: string | null;
  metric_value: number | null;
  window_used: Record<string, any>;
  filters_applied: Record<string, any>;
  evidence: Record<string, any>;
  recommended_action: string | null;
}

// ── Phase → recommended next phase map ──
const PHASE_TRANSITION_MAP: Partial<Record<CriteriaType, { nextPhase: TargetPhase; label: string }>> = {
  mastery: { nextPhase: 'probe', label: 'Mastery met → ready for Probe' },
  probe: { nextPhase: 'generalization', label: 'Probe met → ready for Generalization' },
  generalization: { nextPhase: 'maintenance', label: 'Generalization met → ready for Maintenance' },
  maintenance: { nextPhase: 'closed', label: 'Maintenance met → eligible to Close' },
};

// ── Core evaluation dispatcher ──

export function evaluateCriteria(
  rule: CriteriaRuleJson,
  criteriaType: CriteriaType,
  sessions: SessionAggregate[],
): EvaluationResult {
  if (sessions.length === 0) {
    return makeResult(criteriaType, false, null, null, rule, sessions, 'No session data available');
  }

  // Filter by session_type
  const filteredSessions = filterSessions(sessions, rule);

  switch (rule.window.type) {
    case 'consecutive_sessions':
      return evaluateConsecutiveSessions(rule, criteriaType, filteredSessions);
    case 'rolling_window':
      return evaluateRollingWindow(rule, criteriaType, filteredSessions);
    case 'within_time_period':
      return evaluateWithinTimePeriod(rule, criteriaType, filteredSessions);
    case 'scheduled_frequency':
      return evaluateScheduledFrequency(rule, criteriaType, filteredSessions);
    case 'per_condition':
      return evaluatePerCondition(rule, criteriaType, filteredSessions);
    case 'consecutive_opportunities':
      return evaluateConsecutiveOpportunities(rule, criteriaType, filteredSessions);
    default:
      return makeResult(criteriaType, false, null, null, rule, filteredSessions, `Unsupported window type: ${rule.window.type}`);
  }
}

// ── Window evaluators ──

function evaluateConsecutiveSessions(
  rule: CriteriaRuleJson,
  type: CriteriaType,
  sessions: SessionAggregate[],
): EvaluationResult {
  const n = rule.window.n || 3;
  const threshold = rule.threshold;
  const minOpp = rule.window.min_opportunities_per_session || 0;

  // Sort by date descending to get most recent
  const sorted = [...sessions].sort((a, b) => b.session_date.localeCompare(a.session_date));

  // Filter by min opportunities
  const eligible = sorted.filter(s => s.total_opportunities >= minOpp);

  if (eligible.length < n) {
    return makeResult(type, false, null, null, rule, sessions,
      `Need ${n} eligible sessions, have ${eligible.length}`);
  }

  // Check if the most recent n sessions all meet threshold
  const window = eligible.slice(0, n);
  const metric = getSessionMetric(rule, window);
  const allMet = window.every(s => getSessionMetric(rule, [s]) >= threshold);

  if (allMet) {
    const avgMetric = metric;
    return makeResult(type, true, new Date().toISOString(), avgMetric, rule, sessions,
      null, { sessions_checked: window.map(s => ({ id: s.session_id, date: s.session_date, metric: getSessionMetric(rule, [s]) })) });
  }

  return makeResult(type, false, null, metric, rule, sessions,
    `${window.filter(s => getSessionMetric(rule, [s]) >= threshold).length}/${n} sessions met threshold`);
}

function evaluateRollingWindow(
  rule: CriteriaRuleJson,
  type: CriteriaType,
  sessions: SessionAggregate[],
): EvaluationResult {
  const n = rule.window.n || 10;
  const sorted = [...sessions].sort((a, b) => b.session_date.localeCompare(a.session_date));
  const window = sorted.slice(0, n);

  if (window.length === 0) {
    return makeResult(type, false, null, null, rule, sessions, 'No sessions in window');
  }

  const metric = getSessionMetric(rule, window);
  const met = metric >= rule.threshold;

  return makeResult(type, met, met ? new Date().toISOString() : null, metric, rule, sessions,
    met ? null : `${metric.toFixed(1)}% < ${rule.threshold}% threshold`);
}

function evaluateWithinTimePeriod(
  rule: CriteriaRuleJson,
  type: CriteriaType,
  sessions: SessionAggregate[],
): EvaluationResult {
  const days = rule.window.days || 14;
  const requiredSuccesses = rule.window.required_successes || 2;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const inWindow = sessions.filter(s => new Date(s.session_date) >= cutoff);
  const successfulSessions = inWindow.filter(s => getSessionMetric(rule, [s]) >= rule.threshold);

  const met = successfulSessions.length >= requiredSuccesses;
  const metric = inWindow.length > 0 ? getSessionMetric(rule, inWindow) : null;

  return makeResult(type, met, met ? new Date().toISOString() : null, metric, rule, sessions,
    met ? null : `${successfulSessions.length}/${requiredSuccesses} successful sessions within ${days} days`);
}

function evaluateScheduledFrequency(
  rule: CriteriaRuleJson,
  type: CriteriaType,
  sessions: SessionAggregate[],
): EvaluationResult {
  const weeks = rule.window.duration_weeks || 4;
  const minSuccesses = rule.window.min_successes || weeks;
  const now = new Date();

  let successfulWeeks = 0;
  for (let w = 0; w < weeks; w++) {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - (w + 1) * 7);
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() - w * 7);

    const weekSessions = sessions.filter(s => {
      const d = new Date(s.session_date);
      return d >= weekStart && d < weekEnd;
    });

    const hasSuccess = weekSessions.some(s => getSessionMetric(rule, [s]) >= rule.threshold);
    if (hasSuccess) successfulWeeks++;
  }

  const met = successfulWeeks >= minSuccesses;
  const metric = (successfulWeeks / weeks) * 100;

  return makeResult(type, met, met ? new Date().toISOString() : null, metric, rule, sessions,
    met ? null : `${successfulWeeks}/${minSuccesses} successful weeks`);
}

function evaluatePerCondition(
  rule: CriteriaRuleJson,
  type: CriteriaType,
  sessions: SessionAggregate[],
): EvaluationResult {
  const peopleReq = rule.filters.people_required || 0;
  const settingsReq = rule.filters.settings_required || 0;
  const materialsReq = rule.filters.materials_required || 0;

  // Find unique conditions that meet threshold
  const successfulSessions = sessions.filter(s => getSessionMetric(rule, [s]) >= rule.threshold);

  const uniquePeople = new Set(successfulSessions.map(s => s.person_id).filter(Boolean));
  const uniqueSettings = new Set(successfulSessions.map(s => s.setting_id).filter(Boolean));
  const uniqueMaterials = new Set(successfulSessions.map(s => s.material_id).filter(Boolean));

  const peopleMet = uniquePeople.size >= peopleReq;
  const settingsMet = uniqueSettings.size >= settingsReq;
  const materialsMet = uniqueMaterials.size >= materialsReq;

  const met = peopleMet && settingsMet && materialsMet;
  const metric = successfulSessions.length > 0 ? getSessionMetric(rule, successfulSessions) : null;

  const evidence = {
    people: { required: peopleReq, found: uniquePeople.size, met: peopleMet },
    settings: { required: settingsReq, found: uniqueSettings.size, met: settingsMet },
    materials: { required: materialsReq, found: uniqueMaterials.size, met: materialsMet },
  };

  return makeResult(type, met, met ? new Date().toISOString() : null, metric, rule, sessions,
    met ? null : 'Condition requirements not fully met', evidence);
}

function evaluateConsecutiveOpportunities(
  rule: CriteriaRuleJson,
  type: CriteriaType,
  sessions: SessionAggregate[],
): EvaluationResult {
  // This is a simplified version - consecutive independent successes
  const n = rule.window.n || 3;
  const sorted = [...sessions].sort((a, b) => b.session_date.localeCompare(a.session_date));

  let consecutive = 0;
  let maxConsecutive = 0;
  for (const s of sorted) {
    if (getSessionMetric(rule, [s]) >= rule.threshold) {
      consecutive++;
      maxConsecutive = Math.max(maxConsecutive, consecutive);
    } else {
      consecutive = 0;
    }
  }

  const met = maxConsecutive >= n;
  return makeResult(type, met, met ? new Date().toISOString() : null, maxConsecutive, rule, sessions,
    met ? null : `${maxConsecutive}/${n} consecutive opportunities met`);
}

// ── Helpers ──

function filterSessions(sessions: SessionAggregate[], rule: CriteriaRuleJson): SessionAggregate[] {
  const sessionType = rule.filters.session_type;
  if (!sessionType || sessionType === 'any') return sessions;
  return sessions.filter(s => s.session_type === sessionType);
}

function getSessionMetric(rule: CriteriaRuleJson, sessions: SessionAggregate[]): number {
  const countPrompted = rule.success_definition.count_prompted_as_correct;
  const maxRank = rule.success_definition.max_prompt_rank_allowed;

  let totalOpp = 0;
  let totalSuccess = 0;

  for (const s of sessions) {
    totalOpp += s.total_opportunities;
    if (countPrompted) {
      // Count independent + prompted as success
      // If max_prompt_rank_allowed is set, we'd need per-trial data
      // For now, count all correct (independent + prompted)
      totalSuccess += s.independent_count + s.prompted_count;
    } else {
      // Independent only
      totalSuccess += s.independent_count;
    }
  }

  return totalOpp > 0 ? (totalSuccess / totalOpp) * 100 : 0;
}

function makeResult(
  criteriaType: CriteriaType,
  met: boolean,
  metAt: string | null,
  metric: number | null,
  rule: CriteriaRuleJson,
  sessions: SessionAggregate[],
  reason?: string | null,
  extraEvidence?: Record<string, any>,
): EvaluationResult {
  const transition = PHASE_TRANSITION_MAP[criteriaType];

  return {
    criteria_type: criteriaType,
    met_status: met,
    met_at: metAt,
    metric_value: metric,
    window_used: {
      type: rule.window.type,
      n: rule.window.n,
      sessions_count: sessions.length,
    },
    filters_applied: {
      session_type: rule.filters.session_type || 'any',
      count_prompted_as_correct: rule.success_definition.count_prompted_as_correct,
    },
    evidence: {
      threshold: rule.threshold,
      metric_value: metric,
      rule_applied: `≥${rule.threshold}% ${rule.window.type.replace(/_/g, ' ')}`,
      ...(reason ? { reason } : {}),
      ...(extraEvidence || {}),
    },
    recommended_action: met && transition ? transition.label : (met ? `${criteriaType} criteria met` : null),
  };
}
