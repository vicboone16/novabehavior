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
      console.log('[NovaAI] Graph updates enqueued:', rows.length);
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

      if (item.item_type === 'behavior_event' || item.item_type === 'skill_or_behavior_measure') {
        let query = supabase
          .from('behavior_session_data')
          .select('id, frequency, duration_seconds, session_id')
          .eq('student_id', clientId)
          .eq('behavior_id', targetId);

        if (sessionId) {
          query = query.eq('session_id', sessionId);
        } else {
          const eventDate = item.event_date || new Date().toISOString().split('T')[0];
          query = query.gte('created_at', `${eventDate}T00:00:00`)
                       .lte('created_at', `${eventDate}T23:59:59`);
        }

        const { data } = await query.limit(5);

        if (data?.length) {
          for (const existing of data) {
            const ex = existing as any;
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

  // ── Create a new student target from review panel data ────────────────
  const createNewTarget = useCallback(async (
    targetName: string,
    targetType?: string,
    measurementType?: string
  ): Promise<string | null> => {
    if (!user || !clientId) return null;
    try {
      // Check for existing target with same name to prevent duplicates (case-insensitive)
      const { data: existing } = await supabase
        .from('student_targets')
        .select('id')
        .eq('student_id', clientId)
        .ilike('title', targetName)
        .limit(1);

      if (existing?.length) {
        console.log('[NovaAI] Reusing existing target:', existing[0].id, 'for', targetName);
        return existing[0].id;
      }

      const { data, error } = await supabase
        .from('student_targets')
        .insert({
          student_id: clientId,
          title: targetName,
          status: 'active',
          source_type: targetType || 'curriculum',
          data_collection_type: measurementType || 'frequency',
          added_by: user.id,
        })
        .select('id')
        .single();

      if (error) throw error;
      console.log('[NovaAI] Created new target:', data?.id, 'for', targetName);
      return data?.id || null;
    } catch (err) {
      console.error('Failed to create new target:', err);
      return null;
    }
  }, [user, clientId]);

  // ── Auto-create ad-hoc session for data entry ────────────────────────────
  const getOrCreateAdHocSession = useCallback(async (
    eventDate?: string
  ): Promise<string | null> => {
    if (!user || !clientId) return null;
    try {
      const sessionDate = eventDate || new Date().toISOString().split('T')[0];
      const startTime = `${sessionDate}T00:00:00Z`;

      // Check for existing ad-hoc session for this student on this date
      const { data: existing } = await supabase
        .from('sessions')
        .select('id')
        .eq('student_id', clientId)
        .eq('status', 'ad_hoc_data_entry')
        .gte('start_time', `${sessionDate}T00:00:00Z`)
        .lte('start_time', `${sessionDate}T23:59:59Z`)
        .limit(1);

      if (existing?.length) {
        console.log('[NovaAI] Reusing existing ad-hoc session:', existing[0].id);
        return existing[0].id;
      }

      // Create new ad-hoc session
      const { data: newSession, error } = await supabase
        .from('sessions')
        .insert({
          user_id: user.id,
          name: `Nova AI Data Entry – ${sessionDate}`,
          start_time: startTime,
          session_length_minutes: 0,
          interval_length_seconds: 0,
          student_ids: [clientId],
          student_id: clientId,
          status: 'ad_hoc_data_entry',
          service_type: 'data_entry',
          notes: 'Auto-created by Nova AI for historical/ad-hoc data entry',
        })
        .select('id')
        .single();

      if (error) {
        console.error('[NovaAI] Failed to create ad-hoc session:', error);
        return null;
      }
      console.log('[NovaAI] ✅ Created ad-hoc session:', newSession?.id);
      return newSession?.id || null;
    } catch (err) {
      console.error('[NovaAI] Failed to create ad-hoc session:', err);
      return null;
    }
  }, [user, clientId]);

  // ── Route structured items to clinical tables ───────────────────────────
  const routeToClinicalTables = useCallback(async (
    items: any[],
    sessionId: string | null,
    requestId: string | null
  ): Promise<{ saved: number; skipped: number; errors: string[]; pendingSession: number; newTargetsCreated: number }> => {
    if (!user || !clientId) return { saved: 0, skipped: 0, errors: ['No user or client'], pendingSession: 0, newTargetsCreated: 0 };

    const result = { saved: 0, skipped: 0, errors: [] as string[], pendingSession: 0, newTargetsCreated: 0 };

    // Auto-create session if none provided and we have non-ABC items
    let effectiveSessionId = sessionId;
    const hasNonAbcItems = items.some(i => i.item_type !== 'abc_event' && 
      !i.quality?.needs_review && 
      i.target_match?.match_status !== 'ambiguous_match_review_needed');
    
    if (!effectiveSessionId && hasNonAbcItems) {
      // Extract date from first item or use today
      const eventDate = items[0]?.context?.event_date || items[0]?.event_date || undefined;
      console.log('[NovaAI] No session_id provided, auto-creating ad-hoc session for date:', eventDate || 'today');
      effectiveSessionId = await getOrCreateAdHocSession(eventDate);
      if (effectiveSessionId) {
        console.log('[NovaAI] ✅ Using ad-hoc session:', effectiveSessionId);
      }
    }

    for (const item of items) {
      try {
        console.log('[NovaAI] ▶ ROUTING ITEM:', {
          item_id: item.item_id,
          item_type: item.item_type,
          target_name: item.target_match?.target_name,
          target_id: item.target_match?.target_id,
          match_status: item.target_match?.match_status,
          needs_review: item.quality?.needs_review,
          measurement_type: item.measurement?.measurement_type,
          session_id: effectiveSessionId,
        });

        // Skip items that need review (unless user already reviewed them)
        if (item.quality?.needs_review || item.target_match?.match_status === 'ambiguous_match_review_needed') {
          console.log('[NovaAI] Skipping item needing review:', item.item_id, item.target_match?.target_name);
          result.skipped++;
          continue;
        }

        let targetId = item.target_match?.target_id;

        // Handle new target suggestions: auto-create with dedup
        if (
          (item.target_match?.match_status === 'user_confirmed_new_target' ||
           item.target_match?.match_status === 'no_match_new_target_suggested') &&
          !targetId
        ) {
          const newTargetId = await createNewTarget(
            item.target_match.target_name,
            item.target_match.target_type,
            item.measurement?.measurement_type
          );
          if (!newTargetId) {
            result.errors.push(`Failed to create target "${item.target_match.target_name}"`);
            result.skipped++;
            continue;
          }
          targetId = newTargetId;
          result.newTargetsCreated++;
        }

        // ABC events don't need session_id — always route them
        if (item.item_type === 'abc_event') {
          console.log('[NovaAI] ✅ Saving ABC event:', item.raw_text?.slice(0, 50));
          await (supabase as any).from('abc_logs').insert({
            client_id: clientId,
            user_id: user.id,
            session_id: effectiveSessionId || null,
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
          continue;
        }

        // Non-ABC items need session_id — try ad-hoc, else mark pending
        if (!effectiveSessionId) {
          console.log('[NovaAI] Item needs session but auto-create failed:', item.item_id, item.target_match?.target_name);
          result.pendingSession++;
          continue;
        }

        if (!targetId) {
          console.log('[NovaAI] Item has no target_id, skipping:', item.item_id);
          result.skipped++;
          continue;
        }

        if (item.item_type === 'skill_trial') {
          // Route skill trials to target_trials table
          const trialTotal = item.measurement?.trial_total || 1;
          const trialCorrect = item.measurement?.trial_correct || 0;

          console.log('[NovaAI] ✅ Saving skill trial:', item.target_match?.target_name, `${trialCorrect}/${trialTotal}`);

          const trialRows = [];
          for (let t = 0; t < trialTotal; t++) {
            const isCorrect = t < trialCorrect;
            trialRows.push({
              target_id: targetId,
              session_id: effectiveSessionId,
              trial_index: t + 1,
              outcome: isCorrect ? 'correct' : 'incorrect',
              session_type: 'session',
              data_state: 'final',
              recorded_by: user.id,
              recorded_at: new Date().toISOString(),
              notes: t === 0 ? (item.context?.notes || item.raw_text || null) : null,
            });
          }

          const { error } = await (supabase as any)
            .from('target_trials')
            .insert(trialRows);

          if (error) {
            if (error.code === '23505') {
              result.skipped++;
              continue;
            }
            throw error;
          }
          result.saved++;
        } else if (
          item.item_type === 'behavior_event' || 
          item.item_type === 'skill_or_behavior_measure'
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

          console.log('[NovaAI] ✅ Saving behavior data:', item.target_match?.target_name, JSON.stringify(insertData));

          // Use upsert to handle potential duplicates
          const { error } = await (supabase as any)
            .from('behavior_session_data')
            .upsert(insertData, { onConflict: 'session_id,behavior_id' });

          if (error) {
            if (error.code === '23505') {
              result.skipped++;
              continue;
            }
            throw error;
          }
          result.saved++;
        } else {
          console.log('[NovaAI] Unknown item_type, skipping:', item.item_type);
          result.skipped++;
        }
      } catch (err: any) {
        console.error('[NovaAI] Failed to route item:', item.item_id, err);
        result.errors.push(`${item.target_match?.target_name || item.item_id}: ${err.message || 'Unknown error'}`);
      }
    }

    console.log('[NovaAI] ✅ ROUTING COMPLETE:', JSON.stringify(result));
    return result;
  }, [user, clientId, createNewTarget]);

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
      let requestId: string | null = null;
      try {
        requestId = await createStagingRequest(
          rawInput || 'Action executed from UI',
          intent,
          action.data?.intent_confidence || 0.9
        );
      } catch (err) {
        console.error('[NovaAI] Failed to create staging request:', err);
      }

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

          if (requestId) {
            await updateRequestStatus(requestId, 'completed');
          }

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

          if (requestId) {
            await updateRequestStatus(requestId, 'completed');
          }

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

          if (requestId) {
            await updateRequestStatus(requestId, 'completed');
          }

          toast.success('Caregiver note saved as draft');
          return true;
        }

        case 'extract_structured_data': {
          const behaviors = action.data.behaviors || [];

          if (behaviors.length === 0) {
            toast.info('No structured data to save');
            return false;
          }

          console.log('[NovaAI] Processing extract_structured_data with', behaviors.length, 'items');

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

          // Try to get current session_id from the action data or context
          const sessionId = action.data.session_id || null;

          // Route ALL ready items to clinical tables
          let routingResult = { saved: 0, skipped: 0, errors: [] as string[], pendingSession: 0, newTargetsCreated: 0 };

          if (readyItems.length > 0) {
            routingResult = await routeToClinicalTables(readyItems, sessionId, requestId);
          }

          // Save extraction note for audit/reference
          const extractionContent = {
            extracted_data: action.data,
            items_ready: readyItems.length,
            items_need_review: reviewItems.length,
            items_routed_to_clinical: routingResult.saved,
            items_pending_session: routingResult.pendingSession,
            items_new_targets_created: routingResult.newTargetsCreated,
            missing_session_id: routingResult.pendingSession > 0,
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
              status: routingResult.pendingSession > 0 ? 'pending_session' : 'draft',
              start_time: action.data.session_date
                ? new Date(action.data.session_date).toISOString()
                : new Date().toISOString(),
            })
            .select('id')
            .single();

          if (error) throw error;

          // Enqueue graph updates for ALL saved items (not just when graph_updates array exists)
          if (routingResult.saved > 0) {
            const graphUpdates = action.data.graph_updates?.length
              ? action.data.graph_updates
              : readyItems
                  .filter((b: any) => b.target_match?.target_id && b.measurement?.measurement_type)
                  .map((b: any) => ({
                    target_id: b.target_match.target_id,
                    graph_type: b.measurement.measurement_type,
                    trigger_recalculation: true,
                  }));
            
            if (graphUpdates.length > 0) {
              await enqueueGraphUpdates(graphUpdates, requestId || undefined);
            }
          }

          // Add timeline entry
          const timelineParts = [];
          if (routingResult.saved > 0) timelineParts.push(`${routingResult.saved} saved`);
          if (routingResult.newTargetsCreated > 0) timelineParts.push(`${routingResult.newTargetsCreated} new target(s) created`);
          if (reviewItems.length > 0) timelineParts.push(`${reviewItems.length} need review`);
          if (routingResult.pendingSession > 0) timelineParts.push(`${routingResult.pendingSession} pending session`);

          await addTimelineEntry(
            'structured_data_extracted',
            `AI extracted ${behaviors.length} item(s): ${timelineParts.join(', ') || 'processed'}`,
            'enhanced_session_notes',
            noteData?.id,
            requestId || undefined
          );

          // Update request status
          if (requestId) {
            if (routingResult.pendingSession > 0) {
              await updateRequestStatus(requestId, 'pending_session');
            } else if (reviewItems.length > 0) {
              await updateRequestStatus(requestId, 'pending_review');
            } else if (routingResult.errors.length > 0) {
              await updateRequestStatus(requestId, 'failed', routingResult.errors.join('; '));
            } else {
              await updateRequestStatus(requestId, 'completed');
            }
          }

          // Show appropriate toast
          if (routingResult.pendingSession > 0) {
            toast.warning(
              `${routingResult.pendingSession} item(s) need a session to save. Please select or start a session, then re-run.`,
              { duration: 6000 }
            );
          } else if (routingResult.errors.length > 0) {
            toast.error(`${routingResult.errors.length} error(s) during save: ${routingResult.errors[0]}`);
          } else {
            const summaryParts = [];
            if (routingResult.saved > 0) summaryParts.push(`${routingResult.saved} saved`);
            if (routingResult.newTargetsCreated > 0) summaryParts.push(`${routingResult.newTargetsCreated} new target(s)`);
            if (routingResult.skipped > 0) summaryParts.push(`${routingResult.skipped} staged for review`);
            if (reviewItems.length > 0) summaryParts.push(`${reviewItems.length} need review`);
            toast.success(`Data processed — ${summaryParts.join(', ')}`);
          }
          return true;
        }

        default:
          toast.info('Action not yet supported');
          return false;
      }
    } catch (e: any) {
      console.error('[NovaAI] Action error:', e);
      const errorMsg = e?.message || 'Unknown error';
      toast.error(`Failed to save: ${errorMsg}`);
      return false;
    }
  }, [user, clientId, createStagingRequest, stageGeneratedNote, stageParsedItems, addTimelineEntry, enqueueGraphUpdates, routeToClinicalTables, createNewTarget]);

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

  // ── Update staging request status ────────────────────────────────────────
  const updateRequestStatus = useCallback(async (
    requestId: string,
    status: 'completed' | 'failed' | 'pending_review' | 'pending_session',
    errorDetail?: string
  ) => {
    try {
      const update: any = { status };
      if (errorDetail) update.error_detail = errorDetail;
      await (supabase as any)
        .from('nova_ai_requests')
        .update(update)
        .eq('id', requestId);
    } catch (err) {
      console.error('Failed to update request status:', err);
    }
  }, []);

  return {
    executeAction,
    logToAudit,
    // Expose sub-functions for pipeline orchestration
    createStagingRequest,
    stageParsedItems,
    stageGeneratedNote,
    addTimelineEntry,
    enqueueGraphUpdates,
    routeToClinicalTables,
    createNewTarget,
    checkForDuplicates,
    updateRequestStatus,
  };
}
