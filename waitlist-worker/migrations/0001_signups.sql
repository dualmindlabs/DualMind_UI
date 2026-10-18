-- Waitlist signups, written by POST /api/signup (server/signup.js).
-- The table was first created by hand with this exact schema, so every statement is
-- IF NOT EXISTS: applying this migration to that database only records it as applied.
CREATE TABLE IF NOT EXISTS signups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  ref TEXT,
  country TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_signups_created ON signups (created_at);
CREATE INDEX IF NOT EXISTS idx_signups_ref ON signups (ref);
