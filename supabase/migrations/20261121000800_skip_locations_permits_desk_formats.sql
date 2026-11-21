-- BACKLOG 3.52: Advertising and YouTube are made at a desk or in a studio, so "Confirm your locations" and "Clear the permits" can never be
-- finished there; a milestone a format skips is hidden, not deleted (Commercial keeps them: a commercial shoots on location).
UPDATE public.project_formats SET skip_milestones = (SELECT array_agg(DISTINCT m) FROM unnest(skip_milestones || ARRAY['locations','permits']) m)
 WHERE name IN ('Advertising', 'YouTube');
