PRAGMA foreign_keys = ON;

ALTER TABLE users
  ADD COLUMN contribution_points INTEGER NOT NULL DEFAULT 0
  CHECK (contribution_points >= 0);
