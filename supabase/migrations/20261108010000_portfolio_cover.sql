-- A portfolio piece can carry a cover image (owner, 2026-11-08: the portfolio had no pictures, only gradients and play buttons).
-- An https link to an image; who may set it is already decided by the table's own policies (a person's own pieces only).
ALTER TABLE public.portfolio_projects
  ADD COLUMN cover_url text,
  ADD CONSTRAINT portfolio_projects_cover_url_check CHECK (cover_url IS NULL OR (char_length(cover_url) <= 2000 AND cover_url ~* '^https://[^\s]+$'));
