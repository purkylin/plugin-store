PRAGMA foreign_keys = ON;

CREATE TABLE user_tvbox_settings (
    user_id TEXT PRIMARY KEY,
    public_key TEXT NOT NULL UNIQUE,
    template_json TEXT NOT NULL,
    linked_plugin_id TEXT,
    config_r2_key TEXT NOT NULL,
    config_sha256 TEXT CHECK (config_sha256 IS NULL OR length(config_sha256) = 64),
    generated_at TEXT,
    plugin_sync_status TEXT CHECK (
      plugin_sync_status IS NULL OR plugin_sync_status IN ('pending', 'synced', 'failed')
    ),
    plugin_sync_error TEXT,
    plugin_synced_at TEXT,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (linked_plugin_id) REFERENCES plugins(id) ON DELETE SET NULL
);

CREATE TABLE user_tvbox_resources (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    resource_type TEXT NOT NULL CHECK (resource_type IN ('py', 'cms')),
    source_type TEXT NOT NULL CHECK (source_type IN ('upload', 'url')),
    name TEXT NOT NULL,
    source_url TEXT,
    r2_key TEXT UNIQUE,
    file_size INTEGER,
    sha256 TEXT CHECK (sha256 IS NULL OR length(sha256) = 64),
    is_adult INTEGER NOT NULL DEFAULT 0 CHECK (is_adult IN (0, 1)),
    enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CHECK (
      (resource_type = 'py' AND (
        (source_type = 'upload' AND source_url IS NULL AND r2_key IS NOT NULL AND file_size IS NOT NULL AND sha256 IS NOT NULL)
        OR
        (source_type = 'url' AND source_url IS NOT NULL AND r2_key IS NULL AND file_size IS NULL AND sha256 IS NULL)
      ))
      OR
      (resource_type = 'cms' AND source_type = 'url' AND source_url IS NOT NULL AND r2_key IS NULL AND file_size IS NULL AND sha256 IS NULL)
    )
);

CREATE INDEX idx_user_tvbox_resources_user
    ON user_tvbox_resources(user_id, sort_order, updated_at DESC);
CREATE INDEX idx_user_tvbox_resources_enabled
    ON user_tvbox_resources(user_id, enabled, sort_order);
