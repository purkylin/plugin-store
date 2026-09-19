PRAGMA foreign_keys = ON;

CREATE TABLE user_tvbox_python_files (
    sha256 TEXT PRIMARY KEY CHECK (length(sha256) = 64),
    r2_key TEXT NOT NULL UNIQUE,
    file_size INTEGER NOT NULL,
    reference_count INTEGER NOT NULL DEFAULT 0 CHECK (reference_count >= 0),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

INSERT INTO user_tvbox_python_files (
    sha256, r2_key, file_size, reference_count, created_at, updated_at
)
SELECT sha256, MIN(r2_key), MAX(file_size), COUNT(*), MIN(created_at), MAX(updated_at)
FROM user_tvbox_resources
WHERE resource_type = 'py' AND source_type = 'upload'
GROUP BY sha256;

DROP INDEX idx_user_tvbox_resources_user;
DROP INDEX idx_user_tvbox_resources_enabled;

ALTER TABLE user_tvbox_resources RENAME TO user_tvbox_resources_legacy;

CREATE TABLE user_tvbox_resources (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    resource_type TEXT NOT NULL CHECK (resource_type IN ('py', 'cms')),
    source_type TEXT NOT NULL CHECK (source_type IN ('upload', 'url')),
    name TEXT NOT NULL,
    source_url TEXT,
    r2_key TEXT,
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

INSERT INTO user_tvbox_resources (
    id, user_id, resource_type, source_type, name, source_url, r2_key,
    file_size, sha256, is_adult, enabled, sort_order, created_at, updated_at
)
SELECT legacy.id, legacy.user_id, legacy.resource_type, legacy.source_type,
       legacy.name, legacy.source_url,
       CASE
         WHEN legacy.resource_type = 'py' AND legacy.source_type = 'upload'
           THEN files.r2_key
         ELSE legacy.r2_key
       END,
       legacy.file_size, legacy.sha256, legacy.is_adult, legacy.enabled,
       legacy.sort_order, legacy.created_at, legacy.updated_at
FROM user_tvbox_resources_legacy legacy
LEFT JOIN user_tvbox_python_files files ON files.sha256 = legacy.sha256;

DROP TABLE user_tvbox_resources_legacy;

CREATE INDEX idx_user_tvbox_resources_user
    ON user_tvbox_resources(user_id, sort_order, updated_at DESC);
CREATE INDEX idx_user_tvbox_resources_enabled
    ON user_tvbox_resources(user_id, enabled, sort_order);
