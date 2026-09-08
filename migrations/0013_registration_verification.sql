-- Pending registrations do not reserve an account or create a login session.
-- Existing users continue to sign in normally.
CREATE TABLE pending_registrations (
    token_hash TEXT PRIMARY KEY,
    email TEXT NOT NULL COLLATE NOCASE,
    nick TEXT NOT NULL COLLATE NOCASE,
    password_salt TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    password_iterations INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
);
CREATE INDEX idx_pending_registration_email ON pending_registrations(email);
CREATE INDEX idx_pending_registration_expiry ON pending_registrations(expires_at);
