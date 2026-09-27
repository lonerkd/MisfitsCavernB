-- Promo campaigns: a platform is whatever the team calls it (no preset list;
-- the picker suggests the ones they've already used), a campaign moves through
-- three stages, and its money and names are bounded.
UPDATE public.campaigns SET status = lower(status) WHERE status <> lower(status);
UPDATE public.campaigns SET status = 'drafting' WHERE status NOT IN ('drafting', 'live', 'wrapped');
ALTER TABLE public.campaigns ALTER COLUMN status SET DEFAULT 'drafting';
ALTER TABLE public.campaigns ADD CONSTRAINT campaigns_status_check CHECK (status IN ('drafting', 'live', 'wrapped'));
ALTER TABLE public.campaigns ALTER COLUMN platform DROP DEFAULT;
ALTER TABLE public.campaigns ADD CONSTRAINT campaigns_platform_len CHECK (char_length(btrim(platform)) BETWEEN 1 AND 60);
ALTER TABLE public.campaigns ADD CONSTRAINT campaigns_title_len CHECK (char_length(btrim(title)) BETWEEN 1 AND 200);
ALTER TABLE public.campaigns ADD CONSTRAINT campaigns_money_check CHECK (coalesce(budget, 0) >= 0 AND coalesce(spend, 0) >= 0);
