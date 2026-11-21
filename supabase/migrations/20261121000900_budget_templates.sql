-- Budget templates (4.6 slice 3) and above/below the line.
--
-- `budget_templates` is reference data, extendable by an admin like `crafts` and `project_formats`: a named starting budget
-- (micro, low, indie, studio) whose lines are a jsonb array of { category, name, amount, above_the_line }. Anyone signed in may
-- read it; only an admin writes it. Applying one needs no function: the client inserts the lines through the ordinary
-- `budget_items` write path, so `budget.write` (the budget's own policy) decides who can.
--
-- `budget_items.above_the_line` says which side of the line a budget line is on (story, producers, director and cast are above;
-- crew, equipment, locations and post are below). Existing lines default to below.

ALTER TABLE public.budget_items ADD COLUMN above_the_line boolean NOT NULL DEFAULT false;

CREATE TABLE public.budget_templates (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  name text NOT NULL CONSTRAINT budget_templates_name_len CHECK (char_length(btrim(name)) BETWEEN 1 AND 40),
  description text DEFAULT '' NOT NULL CONSTRAINT budget_templates_description_len CHECK (char_length(description) <= 200),
  sort_order integer DEFAULT 0 NOT NULL,
  lines jsonb DEFAULT '[]'::jsonb NOT NULL CONSTRAINT budget_templates_lines_check CHECK (jsonb_typeof(lines) = 'array' AND jsonb_array_length(lines) <= 60),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT budget_templates_name_key UNIQUE (name)
);

ALTER TABLE public.budget_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "budget templates view" ON public.budget_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "budget templates admin add" ON public.budget_templates FOR INSERT TO authenticated WITH CHECK (internal.caller_is_admin());
CREATE POLICY "budget templates admin change" ON public.budget_templates FOR UPDATE TO authenticated USING (internal.caller_is_admin()) WITH CHECK (internal.caller_is_admin());
CREATE POLICY "budget templates admin remove" ON public.budget_templates FOR DELETE TO authenticated USING (internal.caller_is_admin());

INSERT INTO public.budget_templates (name, description, sort_order, lines) VALUES
('Micro', 'Friends and favours: a weekend shoot on a few thousand dollars.', 0, $j$[
 {"category":"Story and rights","name":"Script clearances and registration","amount":150,"above_the_line":true},
 {"category":"Producers","name":"Producer (deferred, expenses only)","amount":0,"above_the_line":true},
 {"category":"Direction","name":"Director (deferred)","amount":0,"above_the_line":true},
 {"category":"Cast","name":"Lead and supporting cast stipends","amount":600,"above_the_line":true},
 {"category":"Crew","name":"Crew meals and day stipends","amount":500,"above_the_line":false},
 {"category":"Equipment","name":"Camera and lens rental","amount":600,"above_the_line":false},
 {"category":"Equipment","name":"Sound recorder and lights","amount":350,"above_the_line":false},
 {"category":"Locations","name":"Location fees and permits","amount":300,"above_the_line":false},
 {"category":"Art and wardrobe","name":"Props, wardrobe and makeup","amount":250,"above_the_line":false},
 {"category":"Transport","name":"Fuel, parking and transport","amount":200,"above_the_line":false},
 {"category":"Post-production","name":"Edit, colour and sound mix","amount":500,"above_the_line":false},
 {"category":"Music","name":"Licensed or commissioned music","amount":150,"above_the_line":false},
 {"category":"Insurance","name":"Short-term production insurance","amount":300,"above_the_line":false},
 {"category":"Delivery","name":"Festival submission fees","amount":250,"above_the_line":false},
 {"category":"Contingency","name":"Contingency","amount":350,"above_the_line":false}
]$j$::jsonb),
('Low', 'A paid core crew, a few shoot days and a proper finish: tens of thousands.', 1, $j$[
 {"category":"Story and rights","name":"Screenplay and rights","amount":2000,"above_the_line":true},
 {"category":"Producers","name":"Producer fee","amount":6000,"above_the_line":true},
 {"category":"Direction","name":"Director fee","amount":5000,"above_the_line":true},
 {"category":"Cast","name":"Principal cast","amount":9000,"above_the_line":true},
 {"category":"Cast","name":"Supporting cast and extras","amount":3000,"above_the_line":true},
 {"category":"Crew","name":"Camera and sound crew","amount":9000,"above_the_line":false},
 {"category":"Crew","name":"Grip, electric and production assistants","amount":4000,"above_the_line":false},
 {"category":"Equipment","name":"Camera, lenses and support package","amount":6000,"above_the_line":false},
 {"category":"Equipment","name":"Lighting, grip and sound package","amount":3500,"above_the_line":false},
 {"category":"Locations","name":"Location fees and permits","amount":3500,"above_the_line":false},
 {"category":"Art and wardrobe","name":"Art department, wardrobe and makeup","amount":3000,"above_the_line":false},
 {"category":"Catering","name":"Catering","amount":3000,"above_the_line":false},
 {"category":"Transport","name":"Transport and accommodation","amount":2500,"above_the_line":false},
 {"category":"Post-production","name":"Editor, colourist and sound mix","amount":8000,"above_the_line":false},
 {"category":"Music","name":"Score and music licences","amount":2000,"above_the_line":false},
 {"category":"Insurance","name":"Production insurance and legal","amount":2500,"above_the_line":false},
 {"category":"Delivery","name":"Deliverables and festival fees","amount":1500,"above_the_line":false},
 {"category":"Contingency","name":"Contingency (10%)","amount":7000,"above_the_line":false}
]$j$::jsonb),
('Indie', 'A feature on a real budget: union-light crew, a proper schedule, a full post.', 2, $j$[
 {"category":"Story and rights","name":"Screenplay and rights","amount":15000,"above_the_line":true},
 {"category":"Producers","name":"Producers and executive producers","amount":45000,"above_the_line":true},
 {"category":"Direction","name":"Director fee","amount":30000,"above_the_line":true},
 {"category":"Cast","name":"Lead cast","amount":60000,"above_the_line":true},
 {"category":"Cast","name":"Supporting cast","amount":25000,"above_the_line":true},
 {"category":"Crew","name":"Camera, grip and electric crew","amount":65000,"above_the_line":false},
 {"category":"Crew","name":"Sound, art and wardrobe crew","amount":35000,"above_the_line":false},
 {"category":"Crew","name":"Production office and assistants","amount":20000,"above_the_line":false},
 {"category":"Equipment","name":"Camera package","amount":30000,"above_the_line":false},
 {"category":"Equipment","name":"Lighting, grip and sound packages","amount":25000,"above_the_line":false},
 {"category":"Locations","name":"Location fees, permits and security","amount":25000,"above_the_line":false},
 {"category":"Art and wardrobe","name":"Sets, props, wardrobe and makeup","amount":22000,"above_the_line":false},
 {"category":"Catering","name":"Catering and craft services","amount":15000,"above_the_line":false},
 {"category":"Transport","name":"Transport, travel and accommodation","amount":18000,"above_the_line":false},
 {"category":"Post-production","name":"Editorial, colour, sound and finishing","amount":60000,"above_the_line":false},
 {"category":"Music","name":"Score and music licences","amount":12000,"above_the_line":false},
 {"category":"Insurance","name":"Production insurance, legal and accounting","amount":25000,"above_the_line":false},
 {"category":"Delivery","name":"Deliverables, E&O and festival costs","amount":14000,"above_the_line":false},
 {"category":"Contingency","name":"Contingency (10%)","amount":50000,"above_the_line":false}
]$j$::jsonb),
('Studio', 'A fully crewed, fully insured production with name talent and a long post.', 3, $j$[
 {"category":"Story and rights","name":"Screenplay, rights and development","amount":250000,"above_the_line":true},
 {"category":"Producers","name":"Producers and executive producers","amount":600000,"above_the_line":true},
 {"category":"Direction","name":"Director fee","amount":500000,"above_the_line":true},
 {"category":"Cast","name":"Lead cast","amount":1500000,"above_the_line":true},
 {"category":"Cast","name":"Supporting cast","amount":500000,"above_the_line":true},
 {"category":"Crew","name":"Camera, grip and electric department","amount":900000,"above_the_line":false},
 {"category":"Crew","name":"Art, wardrobe, hair and makeup departments","amount":700000,"above_the_line":false},
 {"category":"Crew","name":"Production office, assistants and unit","amount":450000,"above_the_line":false},
 {"category":"Equipment","name":"Camera, lighting and grip packages","amount":600000,"above_the_line":false},
 {"category":"Locations","name":"Locations, stages, permits and security","amount":650000,"above_the_line":false},
 {"category":"Art and wardrobe","name":"Sets, props and wardrobe purchases","amount":500000,"above_the_line":false},
 {"category":"Catering","name":"Catering and craft services","amount":200000,"above_the_line":false},
 {"category":"Transport","name":"Transport, travel and accommodation","amount":400000,"above_the_line":false},
 {"category":"Visual effects","name":"Visual effects","amount":800000,"above_the_line":false},
 {"category":"Post-production","name":"Editorial, colour, sound and finishing","amount":850000,"above_the_line":false},
 {"category":"Music","name":"Score, songs and music licences","amount":400000,"above_the_line":false},
 {"category":"Insurance","name":"Insurance, bond, legal and accounting","amount":450000,"above_the_line":false},
 {"category":"Delivery","name":"Deliverables, E&O and marketing materials","amount":250000,"above_the_line":false},
 {"category":"Contingency","name":"Contingency (10%)","amount":1000000,"above_the_line":false}
]$j$::jsonb);
