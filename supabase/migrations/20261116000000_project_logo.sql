-- A project's logo: an https image link the owner sets beside the accent
-- colour. The print kit shows it small, top-left, on every printed document.
-- Writes are the existing "Creators update projects" policy (owner only); the
-- column adds no new policy, grant or function.
ALTER TABLE public.projects
  ADD COLUMN logo_url text,
  ADD CONSTRAINT projects_logo_url_https CHECK (logo_url IS NULL OR (logo_url ~ '^https://[^[:space:]]+$' AND char_length(logo_url) <= 500));
