import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { 
  ClinicalExtractionRequest,
  ClinicalExtractionResponse,
  DocumentExtractionResult,
  ReviewDecision,
  AppliedChange,
  ProposedAction,
} from '@/types/documentExtraction';
import { findBestClientMatch, type ExistingClient } from '@/lib/clientMatcher';

export function useClinicalExtraction() {
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionResult, setExtractionResult] = useState<DocumentExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const extractDocument = useCallback(async (
    request: ClinicalExtractionRequest
  ): Promise<ClinicalExtractionResponse> => {
    setIsExtracting(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const { data, error: invokeError } = await supabase.functions.invoke('clinical-extract', {
        body: request,
      });

      if (invokeError) {
        throw new Error(invokeError.message || 'Extraction failed');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Extraction failed');
      }

      setExtractionResult(data.result);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsExtracting(false);
    }
  }, []);

  const matchToStudent = useCallback(async (
    extractedName: string,
    extractedDob?: string
  ) => {
    try {
      // Fetch existing students for matching
      const { data: students, error } = await supabase
        .from('students')
        .select('id, name, first_name, last_name, date_of_birth, school, grade')
        .eq('is_archived', false);

      if (error) throw error;

      const existingClients: ExistingClient[] = (students || []).map(s => ({
        id: s.id,
        name: s.name,
        first_name: s.first_name,
        last_name: s.last_name,
        date_of_birth: s.date_of_birth,
        school: s.school,
        grade: s.grade,
      }));

      return findBestClientMatch(
        { full_name: extractedName, dob: extractedDob },
        existingClients
      );
    } catch (err) {
      console.error('Student matching error:', err);
      return null;
    }
  }, []);

  const clearResult = useCallback(() => {
    setExtractionResult(null);
    setError(null);
  }, []);

  return {
    isExtracting,
    extractionResult,
    error,
    extractDocument,
    matchToStudent,
    clearResult,
  };
}

// ============ Review Workflow Hook ============

export function useExtractionReview() {
  const [decisions, setDecisions] = useState<Map<string, ReviewDecision>>(new Map());
  const [appliedChanges, setAppliedChanges] = useState<AppliedChange[]>([]);
  const [isApplying, setIsApplying] = useState(false);

  const makeDecision = useCallback((
    actionId: string,
    status: ReviewDecision['status'],
    modifiedValue?: unknown,
    notes?: string
  ) => {
    setDecisions(prev => {
      const next = new Map(prev);
      next.set(actionId, {
        action_id: actionId,
        status,
        modified_value: modifiedValue,
        reviewer_notes: notes,
        reviewed_at: new Date().toISOString(),
        reviewed_by: '', // Will be filled on apply
      });
      return next;
    });
  }, []);

  const approveAction = useCallback((actionId: string) => {
    makeDecision(actionId, 'approved');
  }, [makeDecision]);

  const rejectAction = useCallback((actionId: string, reason?: string) => {
    makeDecision(actionId, 'rejected', undefined, reason);
  }, [makeDecision]);

  const modifyAction = useCallback((actionId: string, newValue: unknown) => {
    makeDecision(actionId, 'modified', newValue);
  }, [makeDecision]);

  const applyApprovedChanges = useCallback(async (
    result: DocumentExtractionResult,
    studentId: string
  ): Promise<{ success: boolean; applied: number; errors: string[] }> => {
    setIsApplying(true);
    const applied: AppliedChange[] = [];
    const errors: string[] = [];

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      for (const action of result.proposed_actions) {
        const decision = decisions.get(action.action_id);
        if (!decision || decision.status === 'rejected') continue;

        const valueToApply = decision.status === 'modified' 
          ? decision.modified_value 
          : getActionValue(action, result);

        try {
          switch (action.action_type) {
            case 'CREATE_PROGRAM_ITEM':
              if (action.target === 'skill_target') {
                await createSkillTarget(studentId, valueToApply, user.id);
              } else if (action.target === 'behavior_program') {
                await createBehaviorProgram(studentId, valueToApply);
              }
              break;
            // Add more action types as needed
          }

          applied.push({
            action_id: action.action_id,
            action_type: action.action_type,
            target_id: studentId,
            applied_at: new Date().toISOString(),
            applied_by: user.id,
            audit_trail: {
              extraction_id: result.document.document_id,
              original_source: { page: 1, snippet: '' },
              confidence_at_application: result.confidence.overall,
            },
          });
        } catch (err) {
          errors.push(`Failed to apply ${action.action_type}: ${err}`);
        }
      }

      setAppliedChanges(applied);
      return { success: errors.length === 0, applied: applied.length, errors };
    } finally {
      setIsApplying(false);
    }
  }, [decisions]);

  const resetReview = useCallback(() => {
    setDecisions(new Map());
    setAppliedChanges([]);
  }, []);

  return {
    decisions,
    appliedChanges,
    isApplying,
    approveAction,
    rejectAction,
    modifyAction,
    applyApprovedChanges,
    resetReview,
    getDecision: (id: string) => decisions.get(id),
    getPendingCount: () => {
      let pending = 0;
      decisions.forEach(d => {
        if (d.status === 'pending') pending++;
      });
      return pending;
    },
  };
}

// ============ Helper Functions ============

function getActionValue(action: ProposedAction, result: DocumentExtractionResult): unknown {
  const payload = result.entities.doc_payload;
  
  if ('data' in payload) {
    if (action.target === 'skill_target' && 'goals' in payload.data) {
      return (payload.data as { goals?: unknown[] }).goals?.[0];
    }
    if (action.target === 'behavior_program' && 'target_behaviors' in payload.data) {
      return (payload.data as { target_behaviors?: unknown[] }).target_behaviors?.[0];
    }
  }
  
  return null;
}

async function createSkillTarget(
  studentId: string,
  data: unknown,
  userId: string
): Promise<void> {
  const goal = data as Record<string, unknown>;
  
  await supabase.from('student_targets').insert({
    student_id: studentId,
    title: goal.goal_text as string || 'Imported Goal',
    description: goal.goal_text as string,
    status: 'active',
    source_type: 'curriculum',
    mastery_criteria: goal.mastery_criteria as string,
    data_collection_type: goal.measurement_type as string,
    added_by: userId,
  });
}

async function createBehaviorProgram(
  studentId: string,
  data: unknown
): Promise<void> {
  const behavior = data as Record<string, unknown>;
  
  // Get current student behaviors
  const { data: student } = await supabase
    .from('students')
    .select('behaviors')
    .eq('id', studentId)
    .single();

  const currentBehaviors = (student?.behaviors as Array<Record<string, string | string[] | boolean>>) || [];
  
  const newBehavior = {
    id: crypto.randomUUID(),
    name: behavior.behavior_name as string || 'Imported Behavior',
    definition: behavior.operational_definition as string || '',
    functions: (behavior.hypothesized_function as string[]) || [],
    antecedents: (behavior.antecedents as string[]) || [],
    consequences: (behavior.consequences as string[]) || [],
    status: 'active',
    imported: true,
    import_source: 'document_extraction',
    created_at: new Date().toISOString(),
  };

  await supabase
    .from('students')
    .update({ behaviors: [...currentBehaviors, newBehavior] as unknown as null })
    .eq('id', studentId);
}
