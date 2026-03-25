/**
 * NovaTrack Summary Logic Engine
 * 
 * Data-informed clinical language generation.
 * Hierarchy: What happened → What it may suggest → What it means for intervention → What staff should do.
 * 
 * NEVER generates fake certainty. Always ties wording to actual data patterns.
 */

import type { BehaviorSummaryRow } from './types';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ToneProfile = 'clinical' | 'teacher_friendly' | 'parent_friendly' | 'concise' | 'detailed';

export type FunctionHypothesis = 'escape' | 'attention' | 'mixed' | 'automatic' | 'unknown';

export type ConfidenceTier = 'low' | 'moderate' | 'high';

export interface ABCContext {
  antecedents: { label: string; count: number }[];
  consequences: { label: string; count: number }[];
  settings: { label: string; count: number }[];
  timeOfDay: { label: string; count: number }[];
}

export interface SummaryInput {
  rows: BehaviorSummaryRow[];
  studentName: string;
  tone: ToneProfile;
  dateRangeLabel: string;
  totalDays: number;
  daysWithData: number;
  abcContext?: ABCContext | null;
  /** known preferred items/activities */
  preferredItems?: string[];
}

export interface GeneratedSummary {
  behaviorPercentages: BehaviorPercentageEntry[];
  topBehaviors: BehaviorSummaryRow[];
  fbaSummary: string;
  functionHypothesis: FunctionHypothesis;
  confidenceTier: ConfidenceTier;
  escalationChain: string | null;
  antecedents: string;
  consequences: string;
  replacementSkills: string[];
  interventionFocus: string[];
  staffResponse: { prevent: string; teach: string; respond: string };
  reinforcementNotes: string | null;
  trendSummaries: TrendNote[];
  dataCompletenessNote: string | null;
}

export interface BehaviorPercentageEntry {
  behaviorId: string;
  behaviorName: string;
  count: number;
  pct: number;
}

export interface TrendNote {
  behaviorName: string;
  type: 'increase' | 'decrease' | 'stable_high' | 'new_emergence';
  text: string;
}

// ─── Escape / Attention keyword sets ─────────────────────────────────────────

const ESCAPE_KEYWORDS = [
  'noncompliance', 'refusal', 'task refusal', 'off task', 'off-task', 'elopement',
  'vocal protest', 'work avoidance', 'task avoidance', 'escape', 'tantrum',
  'work refusal', 'defiance', 'leaving area', 'running away',
];

const ATTENTION_KEYWORDS = [
  'disruption', 'verbal aggression', 'inappropriate language', 'attention',
  'calling out', 'clowning', 'making noise', 'sexualized communication',
  'property destruction', 'social escalation', 'yelling', 'screaming',
];

const AGGRESSION_KEYWORDS = [
  'aggression', 'physical aggression', 'verbal aggression', 'hitting',
  'kicking', 'biting', 'throwing', 'property destruction',
];

const ELOPEMENT_KEYWORDS = [
  'elopement', 'leaving area', 'running', 'bolting', 'absconding',
];

// ─── Confidence language maps ────────────────────────────────────────────────

const CONFIDENCE_LANGUAGE: Record<ConfidenceTier, { suggests: string; consistent: string; indicates: string }> = {
  low: { suggests: 'may indicate', consistent: 'could suggest', indicates: 'pattern is somewhat consistent with' },
  moderate: { suggests: 'suggests', consistent: 'is consistent with', indicates: 'appears to reflect' },
  high: { suggests: 'data strongly suggests', consistent: 'pattern is strongly consistent with', indicates: 'data strongly indicates' },
};

// ─── 1. Behavior Percentage Logic ────────────────────────────────────────────

export function computeBehaviorPercentages(rows: BehaviorSummaryRow[], showAll = false): BehaviorPercentageEntry[] {
  const totalCount = rows.reduce((s, r) => s + r.totalCount, 0);
  if (totalCount === 0) return [];

  const filtered = showAll ? rows : rows.filter(r => r.totalCount > 0);
  return filtered.map(r => ({
    behaviorId: r.behaviorId,
    behaviorName: r.behaviorName,
    count: r.totalCount,
    pct: Math.round((r.totalCount / totalCount) * 100),
  })).sort((a, b) => b.pct - a.pct);
}

// ─── 2. Top Behavior Logic ──────────────────────────────────────────────────

export function selectTopBehaviors(rows: BehaviorSummaryRow[]): BehaviorSummaryRow[] {
  const nonZero = rows.filter(r => r.totalCount > 0).sort((a, b) => {
    if (b.totalCount !== a.totalCount) return b.totalCount - a.totalCount;
    // tie-break: severity flags first
    const flagOrder = { spike: 0, increasing: 1, priority: 2, stable: 3, decreasing: 4 };
    const aFlag = a.clinicalFlag ? (flagOrder[a.clinicalFlag] ?? 5) : 5;
    const bFlag = b.clinicalFlag ? (flagOrder[b.clinicalFlag] ?? 5) : 5;
    if (aFlag !== bFlag) return aFlag - bFlag;
    // recency
    if (a.lastOccurrence !== b.lastOccurrence) return b.lastOccurrence.localeCompare(a.lastOccurrence);
    return a.behaviorName.localeCompare(b.behaviorName);
  });

  if (nonZero.length <= 3) return nonZero;
  if (nonZero.length <= 6) return nonZero.slice(0, 4);
  return nonZero.slice(0, 5);
}

// ─── 3. Function Hypothesis Detection ────────────────────────────────────────

function matchesKeywords(name: string, keywords: string[]): boolean {
  const lower = name.toLowerCase();
  return keywords.some(k => lower.includes(k));
}

export function detectFunctionHypothesis(rows: BehaviorSummaryRow[]): FunctionHypothesis {
  const total = rows.reduce((s, r) => s + r.totalCount, 0);
  if (total === 0) return 'unknown';

  let escapePct = 0;
  let attentionPct = 0;

  rows.forEach(r => {
    const pct = total > 0 ? r.totalCount / total : 0;
    if (matchesKeywords(r.behaviorName, ESCAPE_KEYWORDS)) escapePct += pct;
    if (matchesKeywords(r.behaviorName, ATTENTION_KEYWORDS)) attentionPct += pct;
  });

  if (escapePct >= 0.55) return 'escape';
  if (attentionPct >= 0.55) return 'attention';
  if (escapePct >= 0.25 && attentionPct >= 0.25) return 'mixed';
  if (escapePct < 0.15 && attentionPct < 0.15) return 'automatic';
  return 'unknown';
}

// ─── 4. Confidence Tier ──────────────────────────────────────────────────────

export function determineConfidence(
  rows: BehaviorSummaryRow[],
  totalDays: number,
  daysWithData: number,
  hasABC: boolean,
): ConfidenceTier {
  const totalCount = rows.reduce((s, r) => s + r.totalCount, 0);
  const dataRatio = daysWithData / Math.max(totalDays, 1);
  const hasTrends = rows.some(r => r.trendPct !== null && rows.length >= 4);

  if (hasABC && totalCount >= 20 && dataRatio >= 0.6 && hasTrends) return 'high';
  if (totalCount >= 10 && dataRatio >= 0.4) return 'moderate';
  return 'low';
}

// ─── 5. FBA-Style Summary ────────────────────────────────────────────────────

function buildFBASummary(input: SummaryInput, top: BehaviorSummaryRow[], hyp: FunctionHypothesis, confidence: ConfidenceTier): string {
  const { studentName, tone, dateRangeLabel } = input;
  const lang = CONFIDENCE_LANGUAGE[confidence];
  const totalCount = input.rows.reduce((s, r) => s + r.totalCount, 0);

  if (totalCount === 0) {
    return `No target behavior incidents were recorded for ${studentName} in the selected range.`;
  }

  const firstName = studentName.split(' ')[0];
  const topName = top[0]?.behaviorName || '';
  const topPct = top[0]?.pctOfTotal || 0;

  // Sentence 1: dominant behaviors
  let s1: string;
  if (tone === 'parent_friendly') {
    s1 = `During ${dateRangeLabel}, ${firstName} had ${totalCount} total behavior incidents recorded, with ${topName} being the most frequent at ${topPct}% of all incidents.`;
  } else {
    s1 = `${firstName} demonstrates a high frequency of ${top.slice(0, 3).map(t => t.behaviorName.toLowerCase()).join(', ')} across the selected range, with ${topName.toLowerCase()} accounting for ${topPct}% of ${totalCount} recorded incidents.`;
  }

  // Sentence 2: function pattern
  let s2 = '';
  const functionDescriptions: Record<FunctionHypothesis, string> = {
    escape: 'a strong escape-related pattern, consistent with task-avoidance responding during nonpreferred demands',
    attention: 'an attention-maintained component, consistent with attempts to recruit peer or adult attention in structured settings',
    mixed: 'a mixed pattern with both escape and attention features, suggesting behavior may be reinforced by both task removal and social response',
    automatic: 'a pattern that may include a sensory or automatic component, though frequency data alone is not sufficient to confirm function',
    unknown: 'a pattern that does not clearly align with a single maintaining function based on available data',
  };

  if (tone === 'parent_friendly') {
    const parentFriendly: Record<FunctionHypothesis, string> = {
      escape: `${firstName} may be having the most difficulty when asked to do tasks that are hard or not preferred`,
      attention: `${firstName} may be seeking more interaction or attention from adults or peers`,
      mixed: `the data suggests ${firstName} may be responding to both difficult tasks and a need for more attention`,
      automatic: `the pattern may relate to sensory needs, though more observation would help clarify`,
      unknown: `more data would help identify what might be driving these behaviors`,
    };
    s2 = `This ${lang.suggests} ${parentFriendly[hyp]}.`;
  } else {
    s2 = `This pattern ${lang.consistent} ${functionDescriptions[hyp]}.`;
  }

  // Sentence 3: escalation (brief inline)
  let s3 = '';
  const increasing = input.rows.filter(r => r.clinicalFlag === 'increasing' || r.clinicalFlag === 'spike');
  if (increasing.length > 0 && tone !== 'concise') {
    const names = increasing.map(r => r.behaviorName.toLowerCase()).join(', ');
    s3 = ` Data is consistent with an escalating pattern in ${names}.`;
  }

  // Sentence 4: intervention implication
  let s4 = '';
  if (tone !== 'concise') {
    if (hyp === 'escape') {
      s4 = ' Intervention planning should prioritize early interruption at the protest stage and reinforcement for appropriate break and help requests.';
    } else if (hyp === 'attention') {
      s4 = ' Intervention planning should focus on scheduled attention, reinforcing appropriate bids, and minimizing payoff for disruptive attention-seeking.';
    } else if (hyp === 'mixed') {
      s4 = ' Intervention planning should combine demand support with proactive adult contact and reinforce appropriate communication.';
    } else {
      s4 = ' Intervention planning should prioritize further functional analysis and reinforcement of replacement communication.';
    }
  }

  return `${s1} ${s2}${s3}${s4}`.trim();
}

// ─── 6. Escalation Chain Detection ──────────────────────────────────────────

const ESCALATION_LADDERS: string[][] = [
  ['vocal protest', 'noncompliance', 'elopement'],
  ['off task', 'disruption', 'verbal aggression'],
  ['refusal', 'tantrum', 'aggression'],
  ['vocal protest', 'noncompliance', 'aggression'],
  ['off task', 'noncompliance', 'elopement'],
  ['disruption', 'property destruction', 'aggression'],
];

export function detectEscalationChain(rows: BehaviorSummaryRow[], confidence: ConfidenceTier): string | null {
  const names = new Set(rows.filter(r => r.totalCount > 0).map(r => r.behaviorName.toLowerCase()));
  const lang = CONFIDENCE_LANGUAGE[confidence];

  for (const ladder of ESCALATION_LADDERS) {
    const matched = ladder.filter(step => {
      for (const name of names) {
        if (name.includes(step) || step.includes(name)) return true;
      }
      return false;
    });
    if (matched.length >= 2) {
      const chain = matched.map(m => m.split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')).join(' → ');
      if (confidence === 'high') {
        return `Data ${lang.suggests} a likely escalation chain of ${chain}, indicating that early protest may serve as the most useful interruption point for intervention.`;
      }
      return `A possible escalation sequence of ${chain} ${lang.consistent} the observed pattern. Early-stage interruption may be valuable.`;
    }
  }
  return null;
}

// ─── 7. Antecedent Summary ──────────────────────────────────────────────────

export function generateAntecedentSummary(abc: ABCContext | null | undefined, hyp: FunctionHypothesis, tone: ToneProfile): string {
  if (abc && abc.antecedents.length > 0) {
    const topAntecedents = abc.antecedents.sort((a, b) => b.count - a.count).slice(0, 5);
    const labels = topAntecedents.map(a => a.label.toLowerCase());

    if (tone === 'concise') {
      return labels.join(', ');
    }
    if (tone === 'parent_friendly') {
      return `The most common situations before these behaviors include ${labels.join(', ')}. Understanding these patterns can help us prepare your child for success.`;
    }
    return `Common antecedent patterns in the selected range include ${labels.join(', ')}. Incidents appear more likely during ${labels.slice(0, 2).join(' and ')} conditions.`;
  }

  // Inferred from function hypothesis
  const inferred: Record<FunctionHypothesis, string> = {
    escape: 'The available pattern suggests increased behavior during demand-heavy or transition-heavy periods, though antecedent data is limited in the selected range.',
    attention: 'Behavior appears more likely during structured or low-attention periods, though direct antecedent data is limited.',
    mixed: 'The available pattern suggests behavior may occur across both demand and social contexts, though antecedent data is limited in the selected range.',
    automatic: 'No clear environmental antecedent pattern could be identified. Behavior may occur across settings.',
    unknown: 'No clear antecedent pattern could be identified from the available data in the selected range.',
  };

  return inferred[hyp];
}

// ─── 8. Consequence Summary ─────────────────────────────────────────────────

export function generateConsequenceSummary(abc: ABCContext | null | undefined, hyp: FunctionHypothesis, tone: ToneProfile): string {
  if (abc && abc.consequences.length > 0) {
    const topConsequences = abc.consequences.sort((a, b) => b.count - a.count).slice(0, 4);
    const labels = topConsequences.map(c => c.label.toLowerCase());

    if (tone === 'concise') return labels.join(', ');
    return `Common outcomes following behavior include ${labels.join(', ')}. This pattern may reinforce the observed behavioral function.`;
  }

  const inferred: Record<FunctionHypothesis, string> = {
    escape: 'Behavior may be followed by reductions in task demand or pauses in activity, which could reinforce avoidance patterns if replacement communication is not required.',
    attention: 'Behavior appears likely to produce increased adult interaction or peer attention, which may strengthen recurrence in social contexts.',
    mixed: 'Available outcome patterns suggest that both task interruption and adult attention may be maintaining variables.',
    automatic: 'No clear consequence pattern could be identified. Behavior may be maintained by internal reinforcement.',
    unknown: 'No consistent consequence pattern could be identified from the available data.',
  };

  return inferred[hyp];
}

// ─── 9. Replacement Skills ──────────────────────────────────────────────────

export function generateReplacementSkills(rows: BehaviorSummaryRow[], hyp: FunctionHypothesis): string[] {
  const skills: string[] = [];
  const hasAggression = rows.some(r => matchesKeywords(r.behaviorName, AGGRESSION_KEYWORDS) && r.totalCount > 0);
  const hasElopement = rows.some(r => matchesKeywords(r.behaviorName, ELOPEMENT_KEYWORDS) && r.totalCount > 0);

  if (hyp === 'escape' || hyp === 'mixed') {
    skills.push('Request a break appropriately');
    skills.push('Request help before disengaging');
    skills.push('Tolerate short task demands');
    if (rows.some(r => matchesKeywords(r.behaviorName, ['task', 'work', 'off task'])))
      skills.push('Task initiation with visual support');
  }

  if (hyp === 'attention' || hyp === 'mixed') {
    skills.push('Appropriate bid for adult attention');
    skills.push('Raise hand or use signal for interaction');
    if (!skills.includes('Request help before disengaging'))
      skills.push('Tolerate delayed attention');
  }

  if (hasAggression) {
    skills.push('Identify and label emotions');
    skills.push('Use safe protest language');
    skills.push('Engage coping or de-escalation routine');
  }

  if (hasElopement) {
    skills.push('Stay in designated area');
    skills.push('Ask to leave appropriately');
    skills.push('Transition tolerance');
  }

  if (hyp === 'automatic') {
    skills.push('Functional communication');
    skills.push('Self-monitoring');
    skills.push('Coping strategy use');
  }

  if (hyp === 'unknown' && skills.length === 0) {
    skills.push('Functional communication');
    skills.push('Self-monitoring');
    skills.push('Coping strategy use');
  }

  // Deduplicate and limit to 5
  return [...new Set(skills)].slice(0, 5);
}

// ─── 10. Intervention Focus ─────────────────────────────────────────────────

export function generateInterventionFocus(rows: BehaviorSummaryRow[], hyp: FunctionHypothesis, confidence: ConfidenceTier): string[] {
  const focus: string[] = [];
  const increasing = rows.filter(r => r.clinicalFlag === 'increasing' || r.clinicalFlag === 'spike');

  if (hyp === 'escape') {
    focus.push('Break tasks into smaller, manageable chunks');
    focus.push('Pre-correct before nonpreferred work');
    focus.push('Reinforce task initiation immediately');
    focus.push('Prompt replacement communication at first signs of protest');
    focus.push('Use first/then and visual supports');
  } else if (hyp === 'attention') {
    focus.push('Schedule frequent, brief positive attention');
    focus.push('Reinforce appropriate attention bids');
    focus.push('Minimize payoff for disruptive attention-seeking');
    focus.push('Increase active engagement and teacher contact');
  } else if (hyp === 'mixed') {
    focus.push('Combine reinforcement for appropriate communication with demand support');
    focus.push('Reduce power struggles');
    focus.push('Increase proactive adult contact');
    focus.push('Define early-stage response procedures');
  } else {
    focus.push('Prioritize further functional analysis');
    focus.push('Reinforce replacement communication');
    focus.push('Monitor data trends weekly');
  }

  if (increasing.length > 0) {
    focus.unshift('Interrupt escalation patterns early');
  }

  const hasElopement = rows.some(r => matchesKeywords(r.behaviorName, ELOPEMENT_KEYWORDS) && r.totalCount > 0);
  if (hasElopement) {
    focus.push('Environmental supports and transition preparation');
    focus.push('Movement schedule with reinforcement for staying in area');
  }

  return [...new Set(focus)].slice(0, 6);
}

// ─── 11. Staff Response ─────────────────────────────────────────────────────

export function generateStaffResponse(hyp: FunctionHypothesis, rows: BehaviorSummaryRow[], tone: ToneProfile): { prevent: string; teach: string; respond: string } {
  const base: Record<FunctionHypothesis, { prevent: string; teach: string; respond: string }> = {
    escape: {
      prevent: 'Pre-correct before demands and offer clear first/then structure',
      teach: 'Prompt "break" or "help" before escalation',
      respond: 'Keep protest neutral, redirect to replacement response, reinforce appropriate communication immediately',
    },
    attention: {
      prevent: 'Provide scheduled positive attention and check-ins before behavior occurs',
      teach: 'Prompt appropriate attention-seeking (raise hand, tap shoulder)',
      respond: 'Minimize verbal interaction during disruptive behavior, reinforce appropriate bids immediately',
    },
    mixed: {
      prevent: 'Pre-correct before demands and schedule regular positive check-ins',
      teach: 'Prompt break/help requests and appropriate attention bids',
      respond: 'Redirect neutrally, reinforce replacement behaviors with attention and demand support',
    },
    automatic: {
      prevent: 'Observe and document conditions under which behavior occurs',
      teach: 'Provide sensory alternatives or functional communication if applicable',
      respond: 'Redirect without social reinforcement, document setting events',
    },
    unknown: {
      prevent: 'Maintain predictable routines and provide advance notice of changes',
      teach: 'Prompt general coping and communication strategies',
      respond: 'Redirect calmly, reinforce any appropriate alternative behavior',
    },
  };

  return base[hyp];
}

// ─── 12. Reinforcement Notes ────────────────────────────────────────────────

export function generateReinforcementNotes(hyp: FunctionHypothesis, preferredItems?: string[]): string | null {
  const parts: string[] = [];

  if (hyp === 'escape') {
    parts.push('Reinforcement appears likely to be most effective when delivered immediately for task initiation, break requests, and remaining in area.');
  } else if (hyp === 'attention') {
    parts.push('Reinforcement should prioritize social interaction and adult attention for appropriate bids.');
  } else if (hyp === 'mixed') {
    parts.push('Reinforcement should address both task-based and social reinforcement needs.');
  }

  parts.push('High-frequency reinforcement may be needed during early intervention phases.');

  if (preferredItems && preferredItems.length > 0) {
    parts.push(`Likely effective reinforcers include ${preferredItems.join(', ')}.`);
  }

  return parts.length > 0 ? parts.join(' ') : null;
}

// ─── 13. Trend Summaries ────────────────────────────────────────────────────

export function generateTrendNotes(rows: BehaviorSummaryRow[]): TrendNote[] {
  const notes: TrendNote[] = [];

  rows.forEach(r => {
    if (r.trendPct === null) return;

    if (r.trendPct > 50) {
      notes.push({
        behaviorName: r.behaviorName,
        type: 'increase',
        text: `${r.behaviorName} showed a significant increase (+${r.trendPct}%) compared with the prior period, suggesting this behavior may require more immediate review.`,
      });
    } else if (r.trendPct > 20) {
      notes.push({
        behaviorName: r.behaviorName,
        type: 'increase',
        text: `${r.behaviorName} showed the largest increase (+${r.trendPct}%) compared with the prior period, suggesting this behavior may require more immediate review.`,
      });
    } else if (r.trendPct < -20) {
      notes.push({
        behaviorName: r.behaviorName,
        type: 'decrease',
        text: `${r.behaviorName} decreased (${r.trendPct}%) during the selected range, which may reflect improving tolerance or response to supports.`,
      });
    } else if (r.totalCount > 0 && r.avgPerDay > 3 && Math.abs(r.trendPct) <= 20) {
      notes.push({
        behaviorName: r.behaviorName,
        type: 'stable_high',
        text: `${r.behaviorName} remains consistently elevated across the selected period, indicating an ongoing priority area.`,
      });
    }
  });

  return notes;
}

// ─── 14. Data Completeness ──────────────────────────────────────────────────

export function generateDataCompletenessNote(totalDays: number, daysWithData: number, totalCount: number): string | null {
  const ratio = daysWithData / Math.max(totalDays, 1);

  if (totalCount === 0) return 'No target behavior incidents were recorded in the selected range.';
  if (totalCount < 5) return 'Low incident totals limit confidence in broader pattern interpretation.';
  if (ratio < 0.4) return 'There are significant data gaps in the selected period. Trend interpretation may be incomplete.';
  if (ratio < 0.7) return 'Interpretation should be considered cautiously due to limited data in the selected range.';
  return null; // sufficient data, no clutter
}

// ─── MASTER GENERATOR ───────────────────────────────────────────────────────

export function generateFullSummary(input: SummaryInput): GeneratedSummary {
  const { rows, tone, totalDays, daysWithData, abcContext, preferredItems } = input;

  const percentages = computeBehaviorPercentages(rows);
  const topBehaviors = selectTopBehaviors(rows);
  const hyp = detectFunctionHypothesis(rows);
  const hasABC = !!(abcContext && abcContext.antecedents.length > 0);
  const confidence = determineConfidence(rows, totalDays, daysWithData, hasABC);

  const fbaSummary = buildFBASummary(input, topBehaviors, hyp, confidence);
  const escalationChain = detectEscalationChain(rows, confidence);
  const antecedents = generateAntecedentSummary(abcContext, hyp, tone);
  const consequences = generateConsequenceSummary(abcContext, hyp, tone);
  const replacementSkills = generateReplacementSkills(rows, hyp);
  const interventionFocus = generateInterventionFocus(rows, hyp, confidence);
  const staffResponse = generateStaffResponse(hyp, rows, tone);
  const reinforcementNotes = generateReinforcementNotes(hyp, preferredItems);
  const trendSummaries = generateTrendNotes(rows);
  const totalCount = rows.reduce((s, r) => s + r.totalCount, 0);
  const dataCompletenessNote = generateDataCompletenessNote(totalDays, daysWithData, totalCount);

  return {
    behaviorPercentages: percentages,
    topBehaviors,
    fbaSummary,
    functionHypothesis: hyp,
    confidenceTier: confidence,
    escalationChain,
    antecedents,
    consequences,
    replacementSkills,
    interventionFocus,
    staffResponse,
    reinforcementNotes,
    trendSummaries,
    dataCompletenessNote,
  };
}

// ─── Section-level regeneration ─────────────────────────────────────────────

export function regenerateSection(sectionKey: string, input: SummaryInput): string {
  const summary = generateFullSummary(input);

  switch (sectionKey) {
    case 'behavior_percentages':
      if (summary.behaviorPercentages.length === 0) return 'No target behavior incidents recorded in selected range.';
      return summary.behaviorPercentages.map(p => `${p.behaviorName}: ${p.pct}%`).join('\n');

    case 'fba_summary':
    case 'clinical_interpretation':
      return summary.fbaSummary;

    case 'escalation_chain':
      return summary.escalationChain || 'No clear escalation pattern could be identified from the available data.';

    case 'antecedents':
      return summary.antecedents;

    case 'consequences':
      return summary.consequences;

    case 'replacement_skills':
      return summary.replacementSkills.map(s => `• ${s}`).join('\n');

    case 'intervention_focus':
      return summary.interventionFocus.map(s => `• ${s}`).join('\n');

    case 'staff_response':
      return `Prevent: ${summary.staffResponse.prevent}\nTeach: ${summary.staffResponse.teach}\nRespond: ${summary.staffResponse.respond}`;

    case 'reinforcement_focus':
      return summary.reinforcementNotes || 'No reinforcement data available for the selected range.';

    case 'data_quality_note':
      return summary.dataCompletenessNote || 'Data quality appears adequate for the selected range.';

    case 'recommendations':
    case 'next_steps':
      return summary.interventionFocus.slice(0, 3).map(s => `• ${s}`).join('\n') +
        '\n• Monitor data trends weekly' +
        '\n• Review replacement skill targets with team';

    case 'key_trends':
    case 'top_behaviors':
      if (summary.trendSummaries.length === 0) return 'Insufficient data to identify trends.';
      return summary.trendSummaries.map(t => t.text).join(' ');

    case 'setting_events':
      if (input.abcContext?.settings && input.abcContext.settings.length > 0) {
        return `Common settings include ${input.abcContext.settings.map(s => s.label).join(', ')}.`;
      }
      return 'No setting event data available for the selected range.';

    default:
      return '';
  }
}
