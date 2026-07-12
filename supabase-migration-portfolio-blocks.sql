--
--

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

CREATE POLICY "Portfolio blocks readable" ON portfolio_blocks FOR SELECT USING (true);
CREATE POLICY "Portfolio blocks owner write" ON portfolio_blocks FOR ALL USING (
  portfolio_project_id IN (SELECT id FROM portfolio_projects WHERE user_id = auth.uid())
);
