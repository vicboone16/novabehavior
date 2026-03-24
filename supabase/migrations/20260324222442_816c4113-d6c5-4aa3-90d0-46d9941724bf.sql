
-- Drop the trigger that's causing conflicts during bulk operations
DROP TRIGGER IF EXISTS trg_sync_behavior_session_data_from_session_data ON session_data;
DROP FUNCTION IF EXISTS sync_behavior_session_data_from_session_data() CASCADE;
DROP FUNCTION IF EXISTS rebuild_behavior_session_data_for_session(uuid) CASCADE;
DROP FUNCTION IF EXISTS resolve_canonical_behavior_id(uuid, uuid, text) CASCADE;
