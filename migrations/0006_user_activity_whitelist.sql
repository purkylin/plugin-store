PRAGMA foreign_keys = ON;

ALTER TABLE users
    ADD COLUMN is_whitelisted INTEGER NOT NULL DEFAULT 0
    CHECK (is_whitelisted IN (0, 1));

CREATE INDEX idx_users_whitelist
    ON users(is_whitelisted, nick COLLATE NOCASE);
