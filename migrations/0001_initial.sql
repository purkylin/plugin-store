PRAGMA foreign_keys = ON;

CREATE TABLE plugins (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    author TEXT NOT NULL,
    icon_url TEXT,
    published_release_id INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (published_release_id) REFERENCES plugin_releases(id)
);

CREATE TABLE plugin_releases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plugin_id TEXT NOT NULL,
    version TEXT NOT NULL,
    manifest_json TEXT NOT NULL,
    manifest_sha256 TEXT NOT NULL CHECK (length(manifest_sha256) = 64),
    supports_ios INTEGER NOT NULL DEFAULT 1 CHECK (supports_ios IN (0, 1)),
    supports_tvos INTEGER NOT NULL DEFAULT 1 CHECK (supports_tvos IN (0, 1)),
    minimum_ios_version TEXT,
    minimum_tvos_version TEXT,
    published_at TEXT NOT NULL,
    FOREIGN KEY (plugin_id) REFERENCES plugins(id) ON DELETE CASCADE,
    UNIQUE (plugin_id, version)
);

CREATE TABLE plugin_installations (
    plugin_id TEXT NOT NULL,
    installation_id TEXT NOT NULL,
    installed_at TEXT NOT NULL,
    PRIMARY KEY (plugin_id, installation_id),
    FOREIGN KEY (plugin_id) REFERENCES plugins(id) ON DELETE CASCADE
);

CREATE TABLE plugin_install_events (
    event_id TEXT PRIMARY KEY,
    plugin_id TEXT NOT NULL,
    installation_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('install', 'update', 'uninstall')),
    from_version TEXT,
    to_version TEXT,
    app_version TEXT NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('ios', 'tvos')),
    occurred_at TEXT NOT NULL,
    received_at TEXT NOT NULL,
    FOREIGN KEY (plugin_id) REFERENCES plugins(id) ON DELETE CASCADE
);

CREATE INDEX idx_plugins_catalog
    ON plugins(updated_at DESC, id ASC);
CREATE INDEX idx_releases_plugin
    ON plugin_releases(plugin_id, published_at DESC);
CREATE INDEX idx_install_events_plugin
    ON plugin_install_events(plugin_id, received_at DESC);
