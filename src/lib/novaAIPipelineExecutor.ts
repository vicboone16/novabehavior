/**
 * Nova AI Pipeline Executor
 * 
 * Orchestrates the full structured data pipeline:
 * parse → stage → review decision → session check → route → graph → timeline → summary
 * 
 * This replaces the manual "click button to execute" pattern with automatic
 * pipeline execution after the edge function returns tool-call actions.
 */

import type { NovaAction } from '@/components/nova-ai/NovaAIActionButtons';

export interface PipelineResult {
  completed: boolean;
  mode: 'assistant' | 'structured_data' | 'note_generation' | 'mixed';
  steps: PipelineStepResult[];
  summary: string;
  needsReview: boolean;
  needsSession: boolean;
  reviewAction?: NovaAction;
  errors: string[];
}

export interface PipelineStepResult {
  step: string;
  success: boolean;
  detail: string;
}

/**
 * Classify the execution mode from parsed actions.
 */
export function classifyMode(actions: NovaAction[]): PipelineResult['mode'] {
  if (!actions.length) return 'assistant';

  const hasData = actions.some(a => a.type === 'extract_structured_data');
  const hasNote = actions.some(a =>
    a.type === 'generate_soap_note' ||
    a.type === 'generate_narrative_note' ||
    a.type === 'generate_caregiver_note'
  );

  if (hasData && hasNote) return 'mixed';
  if (hasData) return 'structured_data';
  if (hasNote) return 'note_generation';
  return 'assistant';
}

/**
 * Determine if any items in the extract action require user review.
 */
export function itemsNeedReview(action: NovaAction): boolean {
  const behaviors = action.data?.behaviors || [];
  return behaviors.some((b: any) =>
    b.quality?.needs_review ||
    b.target_match?.match_status === 'ambiguous_match_review_needed'
  );
}

/**
 * Determine if structured items require a session_id.
 */
export function itemsNeedSession(action: NovaAction): boolean {
  const behaviors = action.data?.behaviors || [];
  const sessionId = action.data?.session_id;
  if (sessionId) return false;

  return behaviors.some((b: any) =>
    b.item_type !== 'abc_event' && b.target_match?.target_id
  );
}

/**
 * Detect if user input likely contains clinical data that should trigger tool calls.
 * Used as a fallback check when the AI model fails to use tools.
 */
export function inputLikelyContainsData(input: string): boolean {
  const dataPatterns = [
    /\d+\s*(times?|instances?|episodes?|occurrences?)/i,
    /\d+\/\d+/,  // trial data like 8/10
    /\d+\s*(minutes?|mins?|seconds?|secs?|hours?|hrs?)/i,
    /(hit|kicked|bit|scratched|threw|punched|slapped|eloped|tantrum|aggress)/i,
    /(correct|incorrect|independent|prompted|trials?)/i,
    /lasted\s+\d+/i,
    /(frequency|duration|latency|interval)/i,
    /session\s*(note|data|summary)/i,
    /(soap|narrative)\s*note/i,
    /log\s*(this|data|session)/i,
  ];
  return dataPatterns.some(p => p.test(input));
}

/**
 * Build a human-readable completion summary.
 */
export function buildCompletionSummary(result: PipelineResult): string {
  const parts: string[] = [];

  for (const step of result.steps) {
    if (step.success) {
      parts.push(step.detail);
    }
  }

  if (result.needsReview) {
    parts.push('Some items need your review before saving');
  }
  if (result.needsSession) {
    parts.push('Some items are staged — select a session to complete saving');
  }
  if (result.errors.length) {
    parts.push(`${result.errors.length} error(s) occurred`);
  }

  return parts.join(' · ') || 'Pipeline completed';
}

/**
 * Build a detailed markdown summary for display in the chat.
 */
export function buildChatSummary(result: PipelineResult): string {
  const lines: string[] = [];
  
  if (result.mode === 'structured_data' || result.mode === 'mixed') {
    lines.push('**📊 Smart Data Pipeline Results**');
  } else if (result.mode === 'note_generation') {
    lines.push('**📝 Note Generation Results**');
  }

  const successSteps = result.steps.filter(s => s.success);
  const failedSteps = result.steps.filter(s => !s.success);

  if (successSteps.length > 0) {
    for (const step of successSteps) {
      lines.push(`✅ ${step.detail}`);
    }
  }

  if (result.needsReview) {
    lines.push(`⚠️ Some items need your review — check the Review Panel`);
  }
  if (result.needsSession) {
    lines.push(`⏳ Items staged as pending — select or start a session to complete saving`);
  }

  if (failedSteps.length > 0) {
    for (const step of failedSteps) {
      lines.push(`❌ ${step.step}: ${step.detail}`);
    }
  }

  if (result.errors.length > 0) {
    for (const err of result.errors) {
      lines.push(`🔴 ${err}`);
    }
  }

  if (result.completed && !result.needsReview && !result.needsSession) {
    lines.push(`\n✅ **Pipeline completed successfully**`);
  }

  return lines.join('\n');
}

/**
 * Verify that all required pipeline steps completed.
 * Returns list of failed steps.
 */
export function verifyNovaActionComplete(
  result: PipelineResult,
  expectedSteps: string[]
): string[] {
  const completedSteps = new Set(
    result.steps.filter(s => s.success).map(s => s.step)
  );
  return expectedSteps.filter(s => !completedSteps.has(s));
}
