-- Migration: link portfolio_projects back to their originating production project.
-- Without this, the Showcase tab on a project has no real table to read/write to —
-- portfolio_projects exists only as a standalone per-user collection. Adding
-- source_project_id lets a project's finished work surface in both places.

ALTER TABLE portfolio_projects
  ADD COLUMN IF NOT EXISTS source_project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_portfolio_projects_source ON portfolio_projects(source_project_id);
