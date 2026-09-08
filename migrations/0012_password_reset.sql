CREATE TABLE password_resets (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    used_at INTEGER,
    claim_id TEXT UNIQUE
);
CREATE INDEX idx_password_resets_user ON password_resets(user_id);
CREATE INDEX idx_password_resets_expiry ON password_resets(expires_at);
CREATE TABLE auth_rate_limits (
    key TEXT PRIMARY KEY,
    window_start INTEGER NOT NULL,
    count INTEGER NOT NULL,
    last_at INTEGER NOT NULL
);
