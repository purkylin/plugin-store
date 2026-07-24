PRAGMA foreign_keys = ON;

CREATE TABLE plugin_drafts (
    plugin_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    manifest_json TEXT NOT NULL,
    supports_ios INTEGER NOT NULL CHECK (supports_ios IN (0, 1)),
    supports_tvos INTEGER NOT NULL CHECK (supports_tvos IN (0, 1)),
    minimum_ios_version TEXT,
    minimum_tvos_version TEXT,
    saved_at TEXT NOT NULL,
    FOREIGN KEY (plugin_id) REFERENCES plugin_owners(plugin_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_plugin_drafts_user
    ON plugin_drafts(user_id, saved_at DESC);
