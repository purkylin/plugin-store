PRAGMA foreign_keys = ON;

CREATE TABLE plugin_types (
    value TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

INSERT INTO plugin_types (value, name, created_at, updated_at)
VALUES ('hot', '热榜', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

CREATE INDEX idx_plugin_types_name
    ON plugin_types(name COLLATE NOCASE, value COLLATE NOCASE);
