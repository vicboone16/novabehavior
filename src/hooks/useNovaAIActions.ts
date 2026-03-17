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
          const content = action.data.content || {
            subjective: action.data.subjective || '',
            objective: action.data.objective || '',
            assessment: action.data.assessment || '',
            plan: action.data.plan || '',
          };

          const noteContent = {
            soap: content,
            quality: action.data.quality || {},
            posting_recommendation: action.data.posting_recommendation || {},
            source: 'nova_ai',
            audit: {
              created_by: 'nova_ai',
              created_at: new Date().toISOString(),
              raw_input_retained: true,
              review_status: 'pending_user_review',
            },
          };

          const insertData: any = {
            student_id: clientId,
            note_type: 'soap',
            subtype: 'ai_generated',
            author_user_id: user.id,
            note_content: noteContent,
            status: 'draft',
            start_time: action.data.session_date 
              ? new Date(action.data.session_date).toISOString() 
              : new Date().toISOString(),
          };

          if (action.data.session_duration_minutes) {
            insertData.duration_minutes = action.data.session_duration_minutes;
          }

          const { error } = await (supabase as any)
            .from('enhanced_session_notes')
            .insert(insertData);

          if (error) throw error;
          toast.success('SOAP note saved as draft to Session Notes');
          return true;
        }

        case 'generate_narrative_note': {
          const content = action.data.content || { body: action.data.content || '' };
          
          const noteContent = {
            text: content.body || content,
            note_subtype: action.data.note_subtype || 'session_summary',
            quality: action.data.quality || {},
            posting_recommendation: action.data.posting_recommendation || {},
            source: 'nova_ai',
            audit: {
              created_by: 'nova_ai',
              created_at: new Date().toISOString(),
              raw_input_retained: true,
              review_status: 'pending_user_review',
            },
          };

          const { error } = await (supabase as any)
            .from('enhanced_session_notes')
            .insert({
              student_id: clientId,
              note_type: 'narrative',
              subtype: action.data.note_subtype || 'session_summary',
              author_user_id: user.id,
              note_content: noteContent,
              status: 'draft',
              start_time: action.data.session_date 
                ? new Date(action.data.session_date).toISOString() 
                : new Date().toISOString(),
            });

          if (error) throw error;
          toast.success('Narrative note saved as draft');
          return true;
        }

        case 'generate_caregiver_note': {
          const content = action.data.content || { body: action.data.content || '' };
          
          const { error } = await (supabase as any)
            .from('caregiver_notes')
            .insert({
              student_id: clientId,
              author_user_id: user.id,
              content: content.body || content,
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
          const behaviors = action.data.behaviors || [];

          if (behaviors.length === 0) {
            toast.info('No structured data to save');
            return false;
          }

          // Separate items by review status
          const readyItems = behaviors.filter((b: any) => !b.quality?.needs_review && b.target_match?.match_status !== 'ambiguous_match_review_needed');
          const reviewItems = behaviors.filter((b: any) => b.quality?.needs_review || b.target_match?.match_status === 'ambiguous_match_review_needed');

          // Save all extracted data as a structured extraction note for now
          // Full behavior_session_data upsert requires session_id + behavior_id mapping
          const extractionContent = {
            extracted_data: action.data,
            items_ready: readyItems.length,
            items_need_review: reviewItems.length,
            source: 'nova_ai',
            requires_session_mapping: true,
            audit: {
              created_by: 'nova_ai',
              created_at: new Date().toISOString(),
              parser_version: 'nova_ingestion_v1',
              raw_input_retained: true,
              review_status: reviewItems.length > 0 ? 'pending_user_review' : 'approved',
              inferred_fields: behaviors
                .filter((b: any) => b.quality?.is_inferred)
                .map((b: any) => b.item_id),
            },
            graph_updates: action.data.graph_updates || [],
          };

          const { error } = await (supabase as any)
            .from('enhanced_session_notes')
            .insert({
              student_id: clientId,
              note_type: 'data_extraction',
              subtype: 'ai_parsed',
              author_user_id: user.id,
              note_content: extractionContent,
              status: 'draft',
              start_time: action.data.session_date 
                ? new Date(action.data.session_date).toISOString() 
                : new Date().toISOString(),
            });

          if (error) throw error;

          const summary = [];
          summary.push(`${readyItems.length} item(s) ready`);
          if (reviewItems.length > 0) summary.push(`${reviewItems.length} need review`);
          toast.success(`Structured data saved as draft — ${summary.join(', ')}`);
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
