-- ScriptOS reads the brief's special needs out of the screenplay.
--
-- An option may carry `detect` — how to find it in the script:
--   words         — whole words in action lines (a trailing s/es/ed/ing/d
--                   also matches: "punch" finds "punches", "punched")
--   night_exteriors — scene headings that are exterior and at night
--   ages_under    — a character introduced with an age, "TOMMY (8)"
-- lib/brief/script.ts scans the script with these; what it finds counts as
-- chosen until someone answers the question, and is suggested after.

UPDATE public.brief_questions SET options = '[
  {"id":"stunts","label":"Stunts or fights","implies":{"crafts":["Stunt performer"],"breakdown":["stunts"]},
   "detect":{"words":["fight","punch","kick","tackle","brawl","wrestle","stab","crash","collide","ambush"]}},
  {"id":"weapons","label":"Weapons","implies":{"crafts":["Prop master"],"breakdown":["props"]},
   "detect":{"words":["gun","pistol","rifle","shotgun","revolver","handgun","knife","blade","sword","machete","axe","gunshot","gunfire","shoot","fire at"]}},
  {"id":"vehicles","label":"Vehicles","implies":{"breakdown":["vehicles"]},
   "detect":{"words":["car","truck","van","motorcycle","bike","bus","taxi","cab","drive","driving","sedan","pickup","boat","helicopter"]}},
  {"id":"animals","label":"Animals","implies":{"breakdown":["vehicles"]},
   "detect":{"words":["dog","cat","horse","bird","puppy","kitten","cow","sheep","goat","chicken","snake","wolf","deer","rat"]}},
  {"id":"children","label":"Children","detect":{"words":["child","kid","baby","toddler","infant","schoolgirl","schoolboy"],"ages_under":13}},
  {"id":"water","label":"Water, rain or weather","implies":{"breakdown":["sfx"]},
   "detect":{"words":["rain","storm","downpour","snow","underwater","swim","drown","flood","lake","river","ocean","sea","pool"]}},
  {"id":"crowds","label":"Crowds","implies":{"breakdown":["extras"]},
   "detect":{"words":["crowd","audience","dozens","hundreds","protesters","partygoers","spectators","mob","throng","crowded"]}},
  {"id":"night","label":"Night exteriors","implies":{"crafts":["Gaffer","Electrician"],"breakdown":["equipment"]},
   "detect":{"night_exteriors":true}},
  {"id":"prosthetics","label":"Prosthetics / SFX makeup","implies":{"crafts":["SFX makeup artist"],"breakdown":["makeup"]},
   "detect":{"words":["blood","bloody","bleeding","wound","gash","scar","bruise","corpse","severed","mangled","zombie","burned","decayed"]}},
  {"id":"vfx","label":"Visual effects","implies":{"crafts":["VFX artist"],"breakdown":["vfx"]},
   "detect":{"words":["explode","explosion","hologram","portal","teleport","levitate","transform","vanish","dissolve","spaceship"]}}
]'::jsonb
WHERE key = 'needs';
