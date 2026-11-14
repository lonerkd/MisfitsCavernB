-- Role model, step 1 (rest): the roles the plan lists that the crafts catalogue did not have yet, so a person can be
-- set to them on a project. Four are outside the crew (a client, an investor, a distributor or festival guest, the
-- press); five are production roles named in the plan. ON CONFLICT: an admin may already have added one by hand.
INSERT INTO public.crafts (name, department, color, position) VALUES
  ('Showrunner',                    'Writing',          '#3b82f6', 22),
  ('Story producer',                'Writing',          '#3b82f6', 23),
  ('Production coordinator',        'Production',       '#8b5cf6', 16),
  ('Production accountant',         'Production',       '#8b5cf6', 17),
  ('Post supervisor',               'Editorial & post', '#6366f1', 85),
  ('Client',                        'Outside',          '#94a3b8', 120),
  ('Investor',                      'Outside',          '#94a3b8', 121),
  ('Distributor or festival guest', 'Outside',          '#94a3b8', 122),
  ('Press',                         'Outside',          '#94a3b8', 123)
ON CONFLICT (name) DO NOTHING;
