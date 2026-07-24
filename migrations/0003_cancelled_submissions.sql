PRAGMA foreign_keys = OFF;

ALTER TABLE plugin_submissions RENAME TO plugin_submissions_old;

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
    status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
    rejection_reason TEXT,
    submitted_at TEXT NOT NULL,
    reviewed_at TEXT,
    cancelled_at TEXT,
    FOREIGN KEY (plugin_id) REFERENCES plugin_owners(plugin_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT INTO plugin_submissions (
    id, plugin_id, user_id, version, manifest_json,
    supports_ios, supports_tvos, minimum_ios_version, minimum_tvos_version,
    status, rejection_reason, submitted_at, reviewed_at, cancelled_at
)
SELECT
    id, plugin_id, user_id, version, manifest_json,
    supports_ios, supports_tvos, minimum_ios_version, minimum_tvos_version,
    status, rejection_reason, submitted_at, reviewed_at, NULL
FROM plugin_submissions_old;

DROP TABLE plugin_submissions_old;

CREATE UNIQUE INDEX idx_submissions_one_pending
    ON plugin_submissions(plugin_id)
    WHERE status = 'pending';
CREATE INDEX idx_submissions_review_queue
    ON plugin_submissions(status, submitted_at ASC);
CREATE INDEX idx_submissions_user
    ON plugin_submissions(user_id, submitted_at DESC);

PRAGMA foreign_keys = ON;
