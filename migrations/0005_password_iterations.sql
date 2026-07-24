PRAGMA foreign_keys = ON;

ALTER TABLE users
    ADD COLUMN password_iterations INTEGER NOT NULL DEFAULT 210000;
