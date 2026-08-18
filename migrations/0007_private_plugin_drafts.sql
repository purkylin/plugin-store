PRAGMA foreign_keys = ON;

ALTER TABLE plugin_drafts
ADD COLUMN is_private INTEGER NOT NULL DEFAULT 0 CHECK (is_private IN (0, 1));

CREATE INDEX idx_plugin_drafts_user_visibility
    ON plugin_drafts(user_id, is_private, saved_at DESC);
