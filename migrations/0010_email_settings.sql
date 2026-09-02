PRAGMA foreign_keys = ON;

ALTER TABLE tvbox_settings ADD COLUMN email_enabled INTEGER NOT NULL DEFAULT 1 CHECK (email_enabled IN (0, 1));
