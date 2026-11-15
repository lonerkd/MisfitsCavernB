-- Script formats for creators who are not writing a screenplay: a YouTube / video script, an article (blog, newsletter, essay) and a
-- game / interactive script. Each has its own reading rules in the parser (lib/scriptos/parser.ts), so its sections are the "scenes",
-- and a project type that opens new scripts in it. (Advertising and copywriting already have the `copy` format.)

ALTER TABLE public.scripts DROP CONSTRAINT scripts_format_check;
ALTER TABLE public.scripts ADD CONSTRAINT scripts_format_check
  CHECK (format = ANY (ARRAY['screenplay', 'teleplay', 'stage-play', 'treatment', 'podcast', 'doc-outline', 'copy', 'video-script', 'prose', 'game-script']));

ALTER TABLE public.project_formats DROP CONSTRAINT project_formats_script_format_check;
ALTER TABLE public.project_formats ADD CONSTRAINT project_formats_script_format_check
  CHECK (script_format IN ('screenplay', 'teleplay', 'stage-play', 'treatment', 'podcast', 'doc-outline', 'copy', 'video-script', 'prose', 'game-script'));

UPDATE public.project_formats SET position = 15 WHERE name = 'Other';
INSERT INTO public.project_formats (name, blurb, icon, script_format, phase_labels, skip_phases, skip_milestones, approval_gates, position) VALUES
  ('YouTube', 'A channel video: the idea, the script, the shoot, the edit, the upload.', 'video', 'video-script',
    '{"development": {"label": "Idea", "abbr": "IDEA"}, "pre-production": {"label": "Script & plan", "abbr": "PLAN"}, "production": {"label": "Filming", "abbr": "SHOOT"}, "post-production": {"label": "Edit", "abbr": "EDIT"}, "delivery": {"label": "Published", "abbr": "OUT"}}',
    '{}', '{characters,casting,festival}', '{}', 12),
  ('Blog / Newsletter', 'Articles and essays: the pitch, the outline, the draft, the edit, publishing.', 'globe', 'prose',
    '{"development": {"label": "Pitch", "abbr": "PITCH"}, "pre-production": {"label": "Outline", "abbr": "PLAN"}, "production": {"label": "Drafting", "abbr": "DRAFT"}, "post-production": {"label": "Editing", "abbr": "EDIT"}, "delivery": {"label": "Published", "abbr": "OUT"}}',
    '{}', '{characters,casting,shots,schedule,wrap-first,wrap-all,festival}', '{}', 13),
  ('Video Game', 'Story and dialogue for a game: concept, design, build, polish, release.', 'sparkles', 'game-script',
    '{"development": {"label": "Concept", "abbr": "IDEA"}, "pre-production": {"label": "Design", "abbr": "DSGN"}, "production": {"label": "Build", "abbr": "BUILD"}, "post-production": {"label": "Polish", "abbr": "POLISH"}, "delivery": {"label": "Released", "abbr": "OUT"}}',
    '{}', '{festival}', '{}', 14);
