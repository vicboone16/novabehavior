
-- Add unique constraint on bx_tags.tag_key to support idempotent inserts
CREATE UNIQUE INDEX IF NOT EXISTS bx_tags_tag_key_unique ON bx_tags (tag_key);
ALTER TABLE bx_tags ADD CONSTRAINT bx_tags_tag_key_key UNIQUE USING INDEX bx_tags_tag_key_unique;
