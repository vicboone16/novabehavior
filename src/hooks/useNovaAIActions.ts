import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { NovaAction } from '@/components/nova-ai/NovaAIActionButtons';

export function useNovaAIActions(clientId: string | null) {
  const { user } = useAuth();

  const executeAction = useCallback(async (action: NovaAction, destination: string, rawInput?: string) => {
    if (!user) {
      toast.error('You must be logged in to save data');
      return false;
    }

    if (!clientId) {
      toast.error('Please select a client first');
      return false;
    }

    try {
      switch (action.type) {
        case 'generate_soap_note': {
          const noteContent = {
            soap: {
              subjective: action.data.subjective || '',
              objective: action.data.objective || '',
              assessment: action.data.assessment || '',
              plan: action.data.plan || '',
            },
            missing_info: action.data.missing_info || [],
            source: 'nova_ai',
          };

          const { error } = await (supabase as any)
            .from('enhanced_session_notes')
            .insert({
              student_id: clientId,
              note_type: 'soap',
              subtype: 'ai_generated',
              author_user_id: user.id,
              note_content: noteContent,
              status: 'draft',
              start_time: action.data.session_date ? new Date(action.data.session_date).toISOString() : new Date().toISOString(),
              duration_minutes: action.data.session_duration_minutes || null,
            });

          if (error) throw error;
          toast.success('SOAP note saved as draft');
          return true;
        }

        case 'generate_narrative_note': {
          const { error } = await (supabase as any)
            .from('enhanced_session_notes')
            .insert({
              student_id: clientId,
              note_type: 'narrative',
              subtype: action.data.note_type || 'session_summary',
              author_user_id: user.id,
              note_content: { text: action.data.content, source: 'nova_ai' },
              status: 'draft',
              start_time: action.data.session_date ? new Date(action.data.session_date).toISOString() : new Date().toISOString(),
            });

          if (error) throw error;
          toast.success('Narrative note saved as draft');
          return true;
        }

        case 'generate_caregiver_note': {
          const { error } = await (supabase as any)
            .from('caregiver_notes')
            .insert({
              student_id: clientId,
              author_user_id: user.id,
              content: action.data.content,
              note_date: action.data.note_date || new Date().toISOString().split('T')[0],
              tags: action.data.tags || [],
              source: 'nova_ai',
              ai_raw_input: rawInput || null,
              review_status: 'draft',
            });

          if (error) throw error;
          toast.success('Caregiver note saved as draft');
          return true;
        }

        case 'extract_structured_data': {
          // For structured data, we need a session. Log what we can.
          const behaviors = action.data.behaviors || [];
          const skills = action.data.skills || [];

          if (behaviors.length === 0 && skills.length === 0) {
            toast.info('No structured data to save');
            return false;
          }

          // Save extracted data as a narrative note with structured metadata for now
          // Full behavior_session_data upsert requires session_id + behavior_id mapping
          const { error } = await (supabase as any)
            .from('enhanced_session_notes')
            .insert({
              student_id: clientId,
              note_type: 'data_extraction',
              subtype: 'ai_parsed',
              author_user_id: user.id,
              note_content: {
                extracted_data: action.data,
                source: 'nova_ai',
                requires_session_mapping: true,
              },
              status: 'draft',
              start_time: action.data.session_date ? new Date(action.data.session_date).toISOString() : new Date().toISOString(),
            });

          if (error) throw error;
          toast.success(`Extracted ${behaviors.length} behaviors, ${skills.length} skills — saved as draft for review`);
          return true;
        }

        default:
          toast.info('Action not yet supported');
          return false;
      }
    } catch (e) {
      console.error('NovaAI action error:', e);
      toast.error('Failed to save. Please try again.');
      return false;
    }
  }, [user, clientId]);

  const logToAudit = useCallback(async (
    question: string,
    response: string,
    intent?: string,
    actions?: any[],
    structuredOutput?: any
  ) => {
    if (!user) return;
    try {
      await (supabase as any).from('ai_chat_logs').insert({
        user_id: user.id,
        question,
        response,
        category: intent || 'general',
        client_id: clientId || null,
        intent_detected: intent || null,
        actions_taken: actions || [],
        structured_output: structuredOutput || null,
      });
    } catch (err) {
      console.error('Failed to log chat:', err);
    }
  }, [user, clientId]);

  return { executeAction, logToAudit };
}
