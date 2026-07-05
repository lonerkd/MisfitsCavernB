-- Migration: persist Spotify OAuth tokens per-account instead of localStorage
-- only. Every other piece of state in this suite is tied to the Supabase
-- account and survives across devices/browsers; Spotify auth was the one
-- exception, requiring a full reconnect on every new device. This table lets
-- lib/spotify/auth.ts read/write a real, RLS-protected per-user record.

CREATE TABLE IF NOT EXISTS spotify_connections (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at BIGINT NOT NULL, -- ms epoch, matches Date.now()-based math already used client-side
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE spotify_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own spotify connection" ON spotify_connections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own spotify connection" ON spotify_connections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own spotify connection" ON spotify_connections
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own spotify connection" ON spotify_connections
  FOR DELETE USING (auth.uid() = user_id);
