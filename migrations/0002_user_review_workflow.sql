PRAGMA foreign_keys = ON;

CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL COLLATE NOCASE UNIQUE,
    nick TEXT NOT NULL COLLATE NOCASE UNIQUE,
    password_salt TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE user_sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE plugin_owners (
    plugin_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE plugin_submissions (
    id TEXT PRIMARY KEY,
    plugin_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    version TEXT NOT NULL,
    manifest_json TEXT NOT NULL,
    supports_ios INTEGER NOT NULL CHECK (supports_ios IN (0, 1)),
    supports_tvos INTEGER NOT NULL CHECK (supports_tvos IN (0, 1)),
    minimum_ios_version TEXT,
    minimum_tvos_version TEXT,
    status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')),
    rejection_reason TEXT,
    submitted_at TEXT NOT NULL,
    reviewed_at TEXT,
    FOREIGN KEY (plugin_id) REFERENCES plugin_owners(plugin_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX idx_submissions_one_pending
    ON plugin_submissions(plugin_id)
    WHERE status = 'pending';
CREATE INDEX idx_submissions_review_queue
    ON plugin_submissions(status, submitted_at ASC);
CREATE INDEX idx_submissions_user
    ON plugin_submissions(user_id, submitted_at DESC);
CREATE INDEX idx_sessions_user
    ON user_sessions(user_id, expires_at DESC);
