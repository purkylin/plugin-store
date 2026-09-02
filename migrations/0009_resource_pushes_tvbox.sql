PRAGMA foreign_keys = ON;

CREATE TABLE resource_pushes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    resource_type TEXT NOT NULL CHECK (resource_type IN ('py', 'cms')),
    file_name TEXT,
    script_key TEXT,
    staging_r2_key TEXT,
    file_size INTEGER,
    sha256 TEXT CHECK (sha256 IS NULL OR length(sha256) = 64),
    cms_name TEXT,
    cms_url TEXT,
    normalized_cms_url TEXT,
    user_note TEXT,
    is_adult INTEGER NOT NULL DEFAULT 0 CHECK (is_adult IN (0, 1)),
    status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')),
    rejection_reason TEXT,
    review_note TEXT,
    pushed_at TEXT NOT NULL,
    reviewed_at TEXT,
    reviewed_by TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CHECK (
      (resource_type = 'py' AND file_name IS NOT NULL AND script_key IS NOT NULL
       AND staging_r2_key IS NOT NULL AND file_size IS NOT NULL AND sha256 IS NOT NULL)
      OR
      (resource_type = 'cms' AND cms_name IS NOT NULL AND cms_url IS NOT NULL
       AND normalized_cms_url IS NOT NULL)
    )
);

CREATE UNIQUE INDEX idx_resource_pushes_pending_py
    ON resource_pushes(script_key)
    WHERE resource_type = 'py' AND status = 'pending';
CREATE UNIQUE INDEX idx_resource_pushes_pending_cms
    ON resource_pushes(normalized_cms_url)
    WHERE resource_type = 'cms' AND status = 'pending';
CREATE INDEX idx_resource_pushes_user
    ON resource_pushes(user_id, pushed_at DESC);
CREATE INDEX idx_resource_pushes_queue
    ON resource_pushes(status, pushed_at ASC);

CREATE TABLE py_scripts (
    id TEXT PRIMARY KEY,
    script_key TEXT NOT NULL UNIQUE,
    file_name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    r2_key TEXT NOT NULL UNIQUE,
    sha256 TEXT NOT NULL CHECK (length(sha256) = 64),
    cache_version INTEGER NOT NULL,
    is_adult INTEGER NOT NULL DEFAULT 0 CHECK (is_adult IN (0, 1)),
    enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1)),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE cms_sources (
    id TEXT PRIMARY KEY,
    site_key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    normalized_url TEXT NOT NULL UNIQUE,
    is_adult INTEGER NOT NULL DEFAULT 0 CHECK (is_adult IN (0, 1)),
    enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1)),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX idx_py_scripts_list
    ON py_scripts(enabled, sort_order, updated_at DESC);
CREATE INDEX idx_cms_sources_list
    ON cms_sources(enabled, sort_order, updated_at DESC);

CREATE TABLE tvbox_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    template_json TEXT NOT NULL,
    linked_plugin_id TEXT,
    config_r2_key TEXT NOT NULL DEFAULT 'tvbox/config/tvbox.json',
    config_sha256 TEXT CHECK (config_sha256 IS NULL OR length(config_sha256) = 64),
    generated_at TEXT,
    plugin_sync_status TEXT CHECK (
      plugin_sync_status IS NULL OR plugin_sync_status IN ('pending', 'synced', 'failed')
    ),
    plugin_sync_error TEXT,
    plugin_synced_at TEXT,
    updated_at TEXT NOT NULL,
    updated_by TEXT,
    FOREIGN KEY (linked_plugin_id) REFERENCES plugins(id) ON DELETE SET NULL
);

INSERT INTO tvbox_settings (
    id, template_json, linked_plugin_id, config_r2_key, config_sha256,
    generated_at, plugin_sync_status, plugin_sync_error, plugin_synced_at,
    updated_at, updated_by
) VALUES (
    1, '{"sites":[]}', NULL, 'tvbox/config/tvbox.json', NULL,
    NULL, NULL, NULL, NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL
);

CREATE TABLE tvbox_config_resources (
    resource_type TEXT NOT NULL CHECK (resource_type IN ('py', 'cms')),
    resource_id TEXT NOT NULL,
    resource_version TEXT NOT NULL,
    generated_at TEXT NOT NULL,
    PRIMARY KEY (resource_type, resource_id)
);

