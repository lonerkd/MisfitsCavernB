-- Project visibility model: private (owner only) / team (crew) / link (anyone
-- with the share URL) / public (anyone). The portfolio stays a manual pitch
-- board; this controls who can see a project row, and powers "anyone with the
-- link" sharing.
--
-- Persona expectations:
--   Sam   (owner): sees and edits every project he owns, at every level.
--   Jordan(crew):  sees team/link/public projects he's crew on; NOT private ones.
--   Riley(anon):   gets NO project rows from the table. A share link resolves
--                  only through get_shared_project(token), which returns the
--                  overview fields of that one link/public project — so the
--                  token is a real capability and projects can't be enumerated.
ALTER TABLE projects ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'team'
  CHECK (visibility IN ('private', 'team', 'link', 'public'));
ALTER TABLE projects ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE
  DEFAULT encode(extensions.gen_random_bytes(16), 'hex');
UPDATE projects SET share_token = encode(extensions.gen_random_bytes(16), 'hex')
  WHERE share_token IS NULL OR share_token = '';
ALTER TABLE projects ALTER COLUMN share_token SET NOT NULL;

-- RLS: owners always; crew unless the project is private. No anon policy.
DROP POLICY IF EXISTS "Project members can view" ON projects;
CREATE POLICY "Project members can view" ON projects FOR SELECT TO authenticated USING (
  creator_id = (SELECT auth.uid())
  OR (visibility <> 'private' AND internal.is_project_member(id))
);

-- Token lookup for /shared/[token]. SECURITY DEFINER so it can read past RLS,
-- but it returns only overview fields, only for link/public projects, and only
-- for an exact token match.
CREATE OR REPLACE FUNCTION public.get_shared_project(p_token TEXT)
RETURNS TABLE (
  title TEXT,
  description TEXT,
  status TEXT,
  accent_color TEXT,
  visibility TEXT,
  creator_username TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p.title, p.description, p.status, p.accent_color, p.visibility, pr.username
  FROM public.projects p
  LEFT JOIN public.profiles pr ON pr.id = p.creator_id
  WHERE p.share_token = p_token
    AND p.visibility IN ('link', 'public');
$$;
REVOKE ALL ON FUNCTION public.get_shared_project(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shared_project(TEXT) TO anon, authenticated;
