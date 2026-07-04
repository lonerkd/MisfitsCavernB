-- Migration: link Jobs postings back to the Budget line item they were posted
-- from, so Studio/Projects can show "posted as job" status on a budget row
-- and avoid accidental duplicate postings. Part of the Jobs <-> Crew <-> Budget
-- interconnection (accepting a job application also creates real project_crew
-- membership — see app/jobs/[id]/page.tsx).

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS budget_item_id UUID REFERENCES budget_items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_jobs_budget_item ON jobs(budget_item_id);
