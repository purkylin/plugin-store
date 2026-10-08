PRAGMA foreign_keys = OFF;

ALTER TABLE user_tvbox_settings RENAME TO user_tvbox_settings_old;

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
    FOREIGN KEY (linked_plugin_id) REFERENCES plugin_owners(plugin_id) ON DELETE SET NULL
);

INSERT INTO user_tvbox_settings (
    user_id, public_key, template_json, linked_plugin_id, config_r2_key,
    config_sha256, generated_at, plugin_sync_status, plugin_sync_error,
    plugin_synced_at, updated_at
)
SELECT
    user_id, public_key, template_json, linked_plugin_id, config_r2_key,
    config_sha256, generated_at, plugin_sync_status, plugin_sync_error,
    plugin_synced_at, updated_at
FROM user_tvbox_settings_old;

DROP TABLE user_tvbox_settings_old;

PRAGMA foreign_keys = ON;
