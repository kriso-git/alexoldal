-- Run this once in the Supabase SQL editor to enable presence tracking
CREATE TABLE IF NOT EXISTS user_presence (
  username TEXT PRIMARY KEY,
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
