

# Nova AI Clinical Copilot Upgrade Plan

## Summary

Upgrade Nova AI from a general Q&A assistant into a context-aware clinical copilot with intent detection, smart data ingestion, note generation (SOAP/narrative/caregiver), clarification workflows, and note routing -- all while preserving every existing capability.

## Current State

- **Edge function**: `nova-ai-chat/index.ts` -- single system prompt, streaming SSE, no tool calling, no client context
- **Frontend**: `AskNovaAI.tsx` -- simple chat UI with evidence mode toggle and quick prompts
- **Data layer**: Zustand `dataStore.ts` manages students, behaviors, narrative notes, sessions in-memory with Supabase sync
- **DB tables**: `sessions`, `session_notes`, `enhanced_session_notes`, `behavior_session_data`, `student_targets`, `ai_chat_logs`
- **Narrative notes**: In-memory via `NarrativeNote` type on student objects (not a standalone DB table)
- **No caregiver notes table exists** -- this needs to be created
- **Existing Nova AI components**: `NovaAILauncher`, `NovaAIOptimizationActions`, `CaseAwareReasoningSection`, `ClinicalReasoningSection`

## Architecture

The upgrade uses **AI tool calling** (not hardcoded routing). The LLM itself decides which tools to invoke based on user intent, keeping general Q&A as the default behavior.

```text
┌─────────────────────────────────────────┐
│           AskNovaAI.tsx (UI)            │
│  - Client selector (new)                │
│  - Chat + streaming                     │
│  - Action buttons on AI responses       │
│  - Confirmation dialogs before saves    │
└──────────────┬──────────────────────────┘
               │ POST /nova-ai-chat
               │ { messages, client_id, evidence_mode }
┌──────────────▼──────────────────────────┐
│     nova-ai-chat edge function          │
│  1. Auth check (existing)               │
│  2. Load client context if client_id    │
│  3. Build system prompt (upgraded)      │
│  4. Call AI gateway with tools defined  │
│  5. Process tool calls server-side      │
│  6. Stream response back                │
└─────────────────────────────────────────┘
```

## Phased Implementation

### Phase 1: Backend -- Context Loading & Upgraded Prompt

**Edge function changes** (`nova-ai-chat/index.ts`):

1. Accept optional `client_id` in request body
2. When `client_id` is provided, query Supabase for:
   - Student profile (name, DOB, diagnosis)
   - Active behavior targets from `student_targets` where `status = 'active'`
   - Recent `behavior_session_data` (last 5 sessions)
   - Recent `enhanced_session_notes` (last 3)
   - Recent narrative notes from student JSON profile
3. Inject this context into the system prompt as a structured `CLIENT CONTEXT` block
4. Replace the current rigid response format with the master copilot prompt (provided by user), keeping evidence mode logic
5. Define AI tools for structured output:
   - `extract_structured_data` -- returns parsed behaviors, skills, measurements
   - `generate_soap_note` -- returns SOAP sections
   - `generate_narrative_note` -- returns note content
   - `generate_caregiver_note` -- returns caregiver note content
   - `request_clarification` -- returns questions to ask user
6. Process tool calls: when the AI calls a tool, capture the structured JSON and embed it in the response as a special marker (e.g., `<!--NOVA_ACTION:{"type":"soap_note","data":{...}}-->`) that the frontend can parse

### Phase 2: Database -- Caregiver Notes Table & Chat Log Enhancement

1. **New table**: `caregiver_notes`
   - `id`, `student_id`, `author_user_id`, `content` (text), `note_date`, `tags` (text[]), `source` (enum: 'manual', 'nova_ai'), `ai_raw_input` (text, nullable), `review_status` (draft/final), `created_at`, `updated_at`
   - RLS: scoped via `has_student_access`

2. **Enhance `ai_chat_logs`**: Add columns `client_id`, `intent_detected`, `actions_taken` (jsonb), `structured_output` (jsonb)

### Phase 3: Frontend -- Context-Aware Chat UI

**Changes to `AskNovaAI.tsx`**:

1. **Client selector**: Add a student/client picker at the top of the chat panel. When a client is selected, pass `client_id` to the edge function. Show a "Case-Aware" badge when active.
2. **Action buttons**: Parse `<!--NOVA_ACTION:...-->` markers from AI responses. Render contextual action buttons below the message:
   - "Save as Session Note" / "Save as Narrative Note" / "Save as Caregiver Note"
   - "Log Structured Data"
   - "Save as Draft"
   - "Do Both (Note + Data)"
3. **Confirmation flow**: When user clicks an action button, show a confirmation dialog with the parsed data before writing to DB
4. **Updated quick prompts**: Add new quick prompt cards for "Write SOAP Note", "Log Session Data", "Write Caregiver Note", "Parse Old Notes"
5. **Updated placeholder text**: "Ask a question, paste session notes, or describe what happened..."

### Phase 4: Data Write Actions

Implement the actual save handlers triggered by action buttons:

1. **Save SOAP/Session Note**: Insert into `enhanced_session_notes` with `note_type = 'soap'`, `note_content` = AI-generated JSON, `status = 'draft'`, `source = 'nova_ai'`
2. **Save Narrative Note**: Call `addNarrativeNote` via dataStore or insert directly into student profile
3. **Save Caregiver Note**: Insert into new `caregiver_notes` table
4. **Log Structured Data**: Upsert into `behavior_session_data` -- requires a valid `session_id` and `behavior_id`. If no active session, create one or ask user to specify
5. **Audit trail**: Store raw input, parsed output, confidence, and AI-inferred fields in `ai_chat_logs`

### Phase 5: Clarification UX

When the AI returns a `request_clarification` tool call:
- Render the questions as interactive chips/buttons in the chat
- User can click to answer or type free-form
- Answers are appended to conversation and re-sent to continue the workflow

---

## Key Design Decisions

- **Tool calling over hardcoded routing**: The AI model decides intent via its tool-calling capability rather than a separate classification step. This keeps general Q&A as the natural default.
- **Draft-first for all writes**: All AI-generated notes save as drafts requiring user confirmation. No auto-posting.
- **No auto-creation of behavior targets**: AI can suggest new targets but never creates them silently.
- **Preserve streaming**: The response still streams token-by-token. Tool call results are embedded as parseable markers in the streamed text.
- **Client context is optional**: Without a selected client, Nova AI behaves exactly as it does today (general ABA assistant).

## Files to Create/Modify

| File | Action |
|---|---|
| `supabase/functions/nova-ai-chat/index.ts` | Major rewrite: context loading, upgraded prompt, tool definitions |
| `src/pages/AskNovaAI.tsx` | Add client selector, action buttons, clarification UX |
| `src/components/nova-ai/NovaAIActionButtons.tsx` | New: renders save/post action buttons from parsed AI output |
| `src/components/nova-ai/NovaAIClientSelector.tsx` | New: student picker for case-aware mode |
| `src/components/nova-ai/NovaAIConfirmDialog.tsx` | New: confirmation dialog before data writes |
| `src/hooks/useNovaAIActions.ts` | New: save handlers for notes, structured data, caregiver notes |
| `supabase/migrations/...caregiver_notes.sql` | New table + RLS |
| `supabase/migrations/...ai_chat_logs_enhance.sql` | Add columns to ai_chat_logs |

## What This Preserves

- All existing Q&A, evidence mode, quick prompts, behavior analysis capabilities
- Current streaming architecture
- Existing `NovaAILauncher` context-passing pattern (clientId, prompt, mode via URL params)
- Optimization quick actions system
- All current Nova AI components remain untouched

## Recommended Build Order

1. Phase 2 (DB migrations) -- foundation
2. Phase 1 (backend prompt + context loading) -- core intelligence
3. Phase 3 (frontend UI) -- user-facing changes
4. Phase 4 (write actions) -- data persistence
5. Phase 5 (clarification UX) -- polish

