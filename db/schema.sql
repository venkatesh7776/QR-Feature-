-- Wedding Memories records, in Cloudflare D1 (SQLite).
-- Photos and voice notes are files in the R2 bucket, keyed <folder_id>/<name>.

CREATE TABLE IF NOT EXISTS memory_folders (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
  event_date  TEXT,                                   -- yyyy-mm-dd
  event_type  TEXT CHECK (event_type IS NULL OR length(event_type) <= 40),
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS memories (
  id          TEXT PRIMARY KEY,
  folder_id   TEXT NOT NULL REFERENCES memory_folders (id) ON DELETE CASCADE,
  source      TEXT NOT NULL CHECK (source IN ('guest', 'couple')),
  photo_name  TEXT NOT NULL,
  message     TEXT CHECK (message IS NULL OR length(message) <= 1000),
  guest_name  TEXT CHECK (guest_name IS NULL OR length(guest_name) <= 60),
  reactions   TEXT NOT NULL DEFAULT '{}',             -- JSON: emoji -> count
  voice_name  TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS memories_folder_created_idx ON memories (folder_id, created_at DESC);
