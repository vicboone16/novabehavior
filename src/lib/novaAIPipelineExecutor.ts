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
  debug: PipelineDebugReport;
}

export interface PipelineDebugReport {
  mode: string;
  parsedItemCount: number;
  needsReview: boolean;
  savedCount: number;
  skippedCount: number;
  newTargetsCreated: number;
  sessionMissing: boolean;
  graphUpdatesQueued: number;
  timelineWritten: boolean;
  notesGenerated: boolean;
  failedStep: string | null;
  failedReason: string | null;
  pendingSessionCount: number;
  errors: string[];
  stepTrace: string[];
}

export interface PipelineStepResult {
  step: string;
  success: boolean;
  detail: string;
}

function createDebugReport(): PipelineDebugReport {
  return {
    mode: 'unknown',
    parsedItemCount: 0,
    needsReview: false,
    savedCount: 0,
    skippedCount: 0,
    newTargetsCreated: 0,
    sessionMissing: false,
    graphUpdatesQueued: 0,
    timelineWritten: false,
    notesGenerated: false,
    failedStep: null,
    failedReason: null,
    pendingSessionCount: 0,
    errors: [],
    stepTrace: [],
  };
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
 * Build a detailed markdown summary for display in the chat — includes DEBUG REPORT.
 */
export function buildChatSummary(result: PipelineResult): string {
  const lines: string[] = [];
  const d = result.debug;
  
  // Header
  if (result.mode === 'structured_data' || result.mode === 'mixed') {
    lines.push('**📊 Nova AI Smart Data Pipeline Results**');
  } else if (result.mode === 'note_generation') {
    lines.push('**📝 Note Generation Results**');
  }

  // Step results
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

  // DEBUG REPORT
  lines.push('');
  lines.push('<details>');
  lines.push('<summary>🔍 Debug Report</summary>');
  lines.push('');
  lines.push(`| Step | Value |`);
  lines.push(`|------|-------|`);
  lines.push(`| Mode | ${d.mode} |`);
  lines.push(`| Parsed items | ${d.parsedItemCount} |`);
  lines.push(`| Needs review | ${d.needsReview} |`);
  lines.push(`| Saved | ${d.savedCount} |`);
  lines.push(`| Skipped | ${d.skippedCount} |`);
  lines.push(`| New targets | ${d.newTargetsCreated} |`);
  lines.push(`| Session missing | ${d.sessionMissing} |`);
  lines.push(`| Pending session | ${d.pendingSessionCount} |`);
  lines.push(`| Graph queued | ${d.graphUpdatesQueued} |`);
  lines.push(`| Timeline written | ${d.timelineWritten} |`);
  lines.push(`| Notes generated | ${d.notesGenerated} |`);
  if (d.failedStep) {
    lines.push(`| **FAILED STEP** | **${d.failedStep}** |`);
    lines.push(`| **REASON** | **${d.failedReason}** |`);
  }
  lines.push('');
  lines.push('**Step Trace:**');
  for (const t of d.stepTrace) {
    lines.push(`- ${t}`);
  }
  if (d.errors.length > 0) {
    lines.push('');
    lines.push('**Errors:**');
    for (const e of d.errors) {
      lines.push(`- 🔴 ${e}`);
    }
  }
  lines.push('</details>');

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

export { createDebugReport };
