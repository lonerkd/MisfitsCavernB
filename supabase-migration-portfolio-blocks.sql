-- Migration: pitch-board blocks for portfolio projects.
--
-- The "Publish to Portfolio" flow used to create an empty portfolio_projects
-- shell with source_project_id set but pulled zero real assets in. This table
-- lets a project be assembled into an ordered, drag-and-drop board of blocks
-- (concept art, scenes, budget, crew, script excerpts, custom text/media) that
-- doubles as a public showcase and a pitch deck.
--
-- IMPORTANT — blocks store SNAPSHOTS, not references. The public share page
-- (/p/[token]) is viewed by anonymous visitors who, by RLS, cannot read the
-- source project tables (concept_assets / scenes / budget_items / project_crew
-- are creator/crew-only). So each block copies the data it needs (image URL,
-- scene text, budget totals, crew name+role) into this publicly-readable table
-- at add-time. That mirrors exactly how portfolio_media already makes the
-- share page work today.

CREATE TABLE IF NOT EXISTS portfolio_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_project_id UUID NOT NULL REFERENCES portfolio_projects(id) ON DELETE CASCADE,
  position INT NOT NULL DEFAULT 0,
  block_type TEXT NOT NULL CHECK (block_type IN
    ('cover','concept','scene','budget','crew','script','text','media')),
  title TEXT,
  body TEXT,                 -- description / script excerpt / freeform text
  image_url TEXT,            -- concept image / media thumbnail (snapshotted)
  meta JSONB,                -- budget line array+totals, crew role, media_type/url, scene meta
  source_ref_id UUID,        -- originating concept_asset/scene/crew id (optional, for "jump to source")
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS portfolio_blocks_project_idx
  ON portfolio_blocks(portfolio_project_id, position);

ALTER TABLE portfolio_blocks ENABLE ROW LEVEL SECURITY;

-- Read/write policies mirror portfolio_media's exactly (same public-read via a
-- public-or-owner parent, same owner-only write), so blocks behave identically
-- to media rows on the anonymous share page.
CREATE POLICY "Portfolio blocks readable if public or owner" ON portfolio_blocks FOR SELECT USING (
  portfolio_project_id IN (
    SELECT id FROM portfolio_projects WHERE is_public = true OR user_id = auth.uid()
  )
);
CREATE POLICY "Portfolio blocks owner write" ON portfolio_blocks FOR ALL USING (
  portfolio_project_id IN (SELECT id FROM portfolio_projects WHERE user_id = auth.uid())
);
