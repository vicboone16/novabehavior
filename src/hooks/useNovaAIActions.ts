import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { NovaAction } from '@/components/nova-ai/NovaAIActionButtons';

export function useNovaAIActions(clientId: string | null) {
  const { user } = useAuth();

  // ── Create a staging request record ──────────────────────────────────────
  const createStagingRequest = useCallback(async (
    rawInput: string,
    intent: string,
    intentConfidence: number,
    clarificationNeeded: boolean = false
  ): Promise<string | null> => {
    if (!user) return null;
    try {
      const { data, error } = await (supabase as any)
        .from('nova_ai_requests')
        .insert({
          user_id: user.id,
          client_id: clientId,
          intent,
          intent_confidence: intentConfidence,
          raw_input_text: rawInput,
          source_type: 'chat_message',
          clarification_needed: clarificationNeeded,
          status: 'processing',
        })
        .select('id')
        .single();

      if (error) throw error;
      return data?.id || null;
    } catch (err) {
      console.error('Failed to create staging request:', err);
      return null;
    }
  }, [user, clientId]);

  // ── Stage parsed items ──────────────────────────────────────────────────
  const stageParsedItems = useCallback(async (
    requestId: string,
    items: any[]
  ) => {
    if (!user || !items?.length) return;
    try {
      const rows = items.map((item: any) => ({
        request_id: requestId,
        client_id: clientId,
        item_type: item.item_type,
        raw_text: item.raw_text,
        parsed_data: item,
        target_match: item.target_match || null,
        measurement_type: item.measurement?.measurement_type || null,
        measurement_values: item.measurement || null,
        prompting: item.prompting || null,
        context: item.context || null,
        confidence: item.quality?.confidence || 0,
        is_inferred: item.quality?.is_inferred || false,
        review_status: item.quality?.needs_review ? 'needs_review' : 'pending',
        warning_codes: item.quality?.warning_codes || [],
      }));

      await (supabase as any).from('nova_ai_parsed_items').insert(rows);
    } catch (err) {
      console.error('Failed to stage parsed items:', err);
    }
  }, [user, clientId]);

  // ── Stage generated note ────────────────────────────────────────────────
  const stageGeneratedNote = useCallback(async (
    requestId: string,
    action: NovaAction
  ) => {
    if (!user) return;
    try {
      const d = action.data;
      await (supabase as any).from('nova_ai_generated_notes').insert({
        request_id: requestId,
        client_id: clientId,
        note_type: action.type === 'generate_soap_note' ? 'soap'
          : action.type === 'generate_narrative_note' ? 'narrative'
          : 'caregiver',
        note_subtype: d.note_subtype || null,
        title: d.title || `AI-Generated ${action.type === 'generate_soap_note' ? 'SOAP' : action.type === 'generate_narrative_note' ? 'Narrative' : 'Caregiver'} Note`,
        note_content: d.content || d,
        recommended_destination: d.posting_recommendation?.recommended_destination || null,
        confidence: d.quality?.confidence || 0,
        is_incomplete: d.quality?.is_incomplete || false,
        missing_info: d.quality?.missing_info || [],
        status: 'draft',
        warning_codes: d.quality?.warning_codes || [],
      });
    } catch (err) {
      console.error('Failed to stage generated note:', err);
    }
  }, [user, clientId]);

  // ── Post to client timeline (dual-write for visibility) ──────────────────
  const addTimelineEntry = useCallback(async (
    eventType: string,
    summary: string,
    referenceTable?: string,
    referenceId?: string,
    requestId?: string
  ) => {
    if (!user || !clientId) return;
    try {
      // Write to client_timeline (AI audit trail)
      await (supabase as any).from('client_timeline').insert({
        client_id: clientId,
        event_type: eventType,
        reference_table: referenceTable || null,
        reference_id: referenceId || null,
        summary,
        source: 'nova_ai',
        source_request_id: requestId || null,
        created_by: user.id,
      });

      // Also write to student_timeline_entries so the existing UI reader surfaces it
      await supabase.from('student_timeline_entries').insert({
        student_id: clientId,
        user_id: user.id,
        entry_time: new Date().toISOString(),
        content: `[Nova AI] ${summary}`,
        entry_type: eventType,
      });
    } catch (err) {
      console.error('Failed to add timeline entry:', err);
    }
  }, [user, clientId]);

  // ── Enqueue graph updates ───────────────────────────────────────────────
  const enqueueGraphUpdates = useCallback(async (
    graphUpdates: any[],
    requestId?: string
  ) => {
    if (!clientId || !graphUpdates?.length) return;
    try {
      const rows = graphUpdates.map((g: any) => ({
        client_id: clientId,
        target_id: g.target_id || null,
        graph_type: g.graph_type,
        event_date: g.event_date || new Date().toISOString().split('T')[0],
        source_request_id: requestId || null,
      }));
      await (supabase as any).from('graph_update_queue').insert(rows);
    } catch (err) {
      console.error('Failed to enqueue graph updates:', err);
    }
  }, [clientId]);

  // ── Check for duplicate entries ─────────────────────────────────────────
  const checkForDuplicates = useCallback(async (
    item: any,
    sessionId?: string
  ): Promise<boolean> => {
    if (!clientId) return false;
    try {
      const targetId = item.target_match?.target_id;
      if (!targetId) return false;

      // Check behavior_session_data for similar entries
      if (item.item_type === 'behavior_event' || item.item_type === 'skill_or_behavior_measure') {
        let query = supabase
          .from('behavior_session_data')
          .select('id, frequency, duration_seconds, session_id')
          .eq('student_id', clientId)
          .eq('behavior_id', targetId);

        // Primary filter: session_id when available (most precise)
        if (sessionId) {
          query = query.eq('session_id', sessionId);
        } else {
          // Fallback: filter by event date to avoid cross-session false positives
          const eventDate = item.event_date || new Date().toISOString().split('T')[0];
          query = query.gte('created_at', `${eventDate}T00:00:00`)
                       .lte('created_at', `${eventDate}T23:59:59`);
        }

        const { data } = await query.limit(5);

        if (data?.length) {
          for (const existing of data) {
            const ex = existing as any;
            // Check if values match closely
            if (item.measurement?.frequency_count != null && ex.frequency === item.measurement.frequency_count) {
              return true;
            }
            if (item.measurement?.duration_seconds != null && ex.duration_seconds === item.measurement.duration_seconds) {
              return true;
            }
          }
        }
      }

      return false;
    } catch {
      return false;
    }
  }, [clientId]);

  // ── Route structured items to clinical tables ───────────────────────────
  const routeToClinicialTables = useCallback(async (
    items: any[],
    sessionId: string | null,
    requestId: string | null
  ): Promise<{ saved: number; skipped: number; errors: string[] }> => {
    if (!user || !clientId) return { saved: 0, skipped: 0, errors: ['No user or client'] };

    const result = { saved: 0, skipped: 0, errors: [] as string[] };

    for (const item of items) {
      try {
        // Skip items that need review
        if (item.quality?.needs_review || item.target_match?.match_status === 'ambiguous_match_review_needed') {
          result.skipped++;
          continue;
        }

        const targetId = item.target_match?.target_id;

        if (item.item_type === 'abc_event') {
          // Route to abc_logs
          await (supabase as any).from('abc_logs').insert({
            client_id: clientId,
            user_id: user.id,
            session_id: sessionId || null,
            antecedent: item.context?.antecedent || '',
            behavior: item.context?.behavior_description || item.raw_text || '',
            consequence: item.context?.consequence || '',
            behavior_category: item.target_match?.target_name || null,
            intensity: null,
            duration_seconds: item.measurement?.duration_seconds || null,
            notes: item.context?.notes || null,
            logged_at: new Date().toISOString(),
            source_request_id: requestId,
            created_by_ai: true,
            raw_source_text: item.raw_text,
          });
          result.saved++;
        } else if (
          (item.item_type === 'behavior_event' || item.item_type === 'skill_trial' || item.item_type === 'skill_or_behavior_measure') &&
          targetId && sessionId
        ) {
          // Route to behavior_session_data
          const insertData: any = {
            session_id: sessionId,
            student_id: clientId,
            behavior_id: targetId,
            data_state: 'final',
            source_request_id: requestId,
            created_by_ai: true,
            raw_source_text: item.raw_text,
          };

          if (item.measurement?.frequency_count != null) {
            insertData.frequency = item.measurement.frequency_count;
          }
          if (item.measurement?.duration_seconds != null) {
            insertData.duration_seconds = item.measurement.duration_seconds;
          }
          if (item.measurement?.latency_seconds != null) {
            insertData.latency_seconds = item.measurement.latency_seconds;
          }
          if (item.measurement?.observation_window_minutes != null) {
            insertData.observation_minutes = item.measurement.observation_window_minutes;
          }
          if (item.context?.notes) {
            insertData.notes = item.context.notes;
          }

          // Use upsert to handle potential duplicates
          const { error } = await (supabase as any)
            .from('behavior_session_data')
            .upsert(insertData, { onConflict: 'session_id,behavior_id' });

          if (error) {
            // If unique constraint violation, try insert without conflict
            if (error.code === '23505') {
              result.skipped++;
              continue;
            }
            throw error;
          }
          result.saved++;
        } else if (!sessionId && targetId) {
          // No session — save as extraction note for later routing
          result.skipped++;
        } else {
          result.skipped++;
        }
      } catch (err: any) {
        console.error('Failed to route item:', err);
        result.errors.push(err.message || 'Unknown error');
      }
    }

    return result;
  }, [user, clientId]);

  // ── Execute action (save to final tables) ───────────────────────────────
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
      // Create staging request for audit trail
      const intent = action.type.replace('generate_', '').replace('extract_', '');
      const requestId = await createStagingRequest(
        rawInput || 'Action executed from UI',
        intent,
        action.data?.intent_confidence || 0.9
      );

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
              parser_version: 'nova_ingestion_v1',
              note_generator_version: 'nova_soap_v1',
              source_request_id: requestId,
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

          const { data: noteData, error } = await (supabase as any)
            .from('enhanced_session_notes')
            .insert(insertData)
            .select('id')
            .single();

          if (error) throw error;

          if (requestId) await stageGeneratedNote(requestId, action);

          await addTimelineEntry(
            'soap_note_created',
            'AI-generated SOAP note saved as draft',
            'enhanced_session_notes',
            noteData?.id,
            requestId || undefined
          );

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
              parser_version: 'nova_ingestion_v1',
              source_request_id: requestId,
            },
          };

          const { data: noteData, error } = await (supabase as any)
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
            })
            .select('id')
            .single();

          if (error) throw error;

          if (requestId) await stageGeneratedNote(requestId, action);

          await addTimelineEntry(
            'narrative_note_created',
            'AI-generated narrative note saved as draft',
            'enhanced_session_notes',
            noteData?.id,
            requestId || undefined
          );

          toast.success('Narrative note saved as draft');
          return true;
        }

        case 'generate_caregiver_note': {
          const content = action.data.content || { body: action.data.content || '' };

          const { data: noteData, error } = await (supabase as any)
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
            })
            .select('id')
            .single();

          if (error) throw error;

          if (requestId) await stageGeneratedNote(requestId, action);

          await addTimelineEntry(
            'caregiver_note_created',
            'AI-generated caregiver note saved as draft',
            'caregiver_notes',
            noteData?.id,
            requestId || undefined
          );

          toast.success('Caregiver note saved as draft');
          return true;
        }

        case 'extract_structured_data': {
          const behaviors = action.data.behaviors || [];

          if (behaviors.length === 0) {
            toast.info('No structured data to save');
            return false;
          }

          // Stage all parsed items for audit
          if (requestId) await stageParsedItems(requestId, behaviors);

          // Separate items by review status
          const readyItems = behaviors.filter((b: any) =>
            !b.quality?.needs_review &&
            b.target_match?.match_status !== 'ambiguous_match_review_needed'
          );
          const reviewItems = behaviors.filter((b: any) =>
            b.quality?.needs_review ||
            b.target_match?.match_status === 'ambiguous_match_review_needed'
          );

          // Route ready items to clinical tables if a session context exists
          let routingResult = { saved: 0, skipped: 0, errors: [] as string[] };

          // Try to get current session_id from the action data or context
          const sessionId = action.data.session_id || null;

          if (readyItems.length > 0) {
            routingResult = await routeToClinicialTables(readyItems, sessionId, requestId);
          }

          // Also save as extraction note for reference
          const extractionContent = {
            extracted_data: action.data,
            items_ready: readyItems.length,
            items_need_review: reviewItems.length,
            items_routed_to_clinical: routingResult.saved,
            items_pending_session: routingResult.skipped,
            source: 'nova_ai',
            audit: {
              created_by: 'nova_ai',
              created_at: new Date().toISOString(),
              parser_version: 'nova_ingestion_v1',
              raw_input_retained: true,
              review_status: reviewItems.length > 0 ? 'pending_user_review' : 'approved',
              inferred_fields: behaviors
                .filter((b: any) => b.quality?.is_inferred)
                .map((b: any) => b.item_id),
              source_request_id: requestId,
            },
            graph_updates: action.data.graph_updates || [],
          };

          const { data: noteData, error } = await (supabase as any)
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
            })
            .select('id')
            .single();

          if (error) throw error;

          // Enqueue graph updates
          if (action.data.graph_updates?.length && routingResult.saved > 0) {
            await enqueueGraphUpdates(action.data.graph_updates, requestId || undefined);
          }

          // Add timeline entry
          await addTimelineEntry(
            'structured_data_extracted',
            `AI extracted ${behaviors.length} item(s): ${routingResult.saved} saved to clinical tables, ${reviewItems.length} need review`,
            'enhanced_session_notes',
            noteData?.id,
            requestId || undefined
          );

          const summaryParts = [];
          if (routingResult.saved > 0) summaryParts.push(`${routingResult.saved} saved to clinical data`);
          if (routingResult.skipped > 0) summaryParts.push(`${routingResult.skipped} staged for review`);
          if (reviewItems.length > 0) summaryParts.push(`${reviewItems.length} need review`);
          if (!sessionId && readyItems.length > 0) summaryParts.push('select a session to route data');

          toast.success(`Structured data processed — ${summaryParts.join(', ')}`);
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
  }, [user, clientId, createStagingRequest, stageGeneratedNote, stageParsedItems, addTimelineEntry, enqueueGraphUpdates, routeToClinicialTables]);

  // ── Log to audit ────────────────────────────────────────────────────────
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
