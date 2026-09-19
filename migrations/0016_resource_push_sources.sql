PRAGMA foreign_keys = ON;

DROP INDEX idx_resource_pushes_pending_py;
DROP INDEX idx_resource_pushes_pending_cms;
DROP INDEX idx_resource_pushes_user;
DROP INDEX idx_resource_pushes_queue;

ALTER TABLE resource_pushes RENAME TO resource_pushes_legacy;

CREATE TABLE resource_pushes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    resource_type TEXT NOT NULL CHECK (resource_type IN ('py', 'cms')),
    user_resource_id TEXT,
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
      (resource_type = 'py' AND (
        user_resource_id IS NOT NULL
        OR (file_name IS NOT NULL AND script_key IS NOT NULL
            AND staging_r2_key IS NOT NULL AND file_size IS NOT NULL AND sha256 IS NOT NULL)
      ))
      OR
      (resource_type = 'cms' AND (
        user_resource_id IS NOT NULL
        OR (cms_name IS NOT NULL AND cms_url IS NOT NULL AND normalized_cms_url IS NOT NULL)
      ))
    )
);

INSERT INTO resource_pushes (
    id, user_id, resource_type, user_resource_id, file_name, script_key,
    staging_r2_key, file_size, sha256, cms_name, cms_url, normalized_cms_url,
    user_note, is_adult, status, rejection_reason, review_note, pushed_at,
    reviewed_at, reviewed_by
)
SELECT id, user_id, resource_type, NULL, file_name, script_key,
       staging_r2_key, file_size, sha256, cms_name, cms_url, normalized_cms_url,
       user_note, is_adult, status, rejection_reason, review_note, pushed_at,
       reviewed_at, reviewed_by
FROM resource_pushes_legacy;

DROP TABLE resource_pushes_legacy;

CREATE UNIQUE INDEX idx_resource_pushes_pending_py
    ON resource_pushes(script_key)
    WHERE resource_type = 'py' AND status = 'pending' AND script_key IS NOT NULL;
CREATE UNIQUE INDEX idx_resource_pushes_pending_cms
    ON resource_pushes(normalized_cms_url)
    WHERE resource_type = 'cms' AND status = 'pending' AND normalized_cms_url IS NOT NULL;
CREATE INDEX idx_resource_pushes_user
    ON resource_pushes(user_id, pushed_at DESC);
CREATE INDEX idx_resource_pushes_queue
    ON resource_pushes(status, pushed_at ASC);
CREATE UNIQUE INDEX idx_resource_pushes_user_resource
    ON resource_pushes(user_resource_id)
    WHERE user_resource_id IS NOT NULL;
