// The demo world: projects at every stage of the pipeline, filled to
// different depths, with a crew of sample people. Everything here is
// invented. Dates are offsets from the day the seed runs, so the demo always
// reads as "now" (a shoot today, a call sheet for tomorrow).
//
// People are referred to by key: 'me' is the account the demo is built for;
// every other key is a sample persona (see PERSONAS).

export type Who = 'me' | string;

export interface Persona {
  key: string;
  username: string;
  craft: string;
  location: string;
  bio: string;
}

export const PERSONAS: Persona[] = [
  { key: 'mara', username: 'mara_okafor', craft: 'Director of photography', location: 'Calgary, AB', bio: 'DP. Available light, long lenses, night exteriors. Sample crew for the demo.' },
  { key: 'theo', username: 'theo_lindqvist', craft: 'Gaffer', location: 'Edmonton, AB', bio: 'Gaffer with a van full of tubes. Sample crew for the demo.' },
  { key: 'june', username: 'june_park', craft: 'Production sound mixer', location: 'Calgary, AB', bio: 'Sound mixer and designer. Sample crew for the demo.' },
  { key: 'rafael', username: 'rafael_cruz', craft: 'Production designer', location: 'Banff, AB', bio: 'Production designer; builds worlds out of thrift stores. Sample crew for the demo.' },
  { key: 'sasha', username: 'sasha_ivanova', craft: 'Editor', location: 'Vancouver, BC', bio: 'Editor for shorts and docs. Sample crew for the demo.' },
  { key: 'ines', username: 'ines_duarte', craft: 'Actor', location: 'Calgary, AB', bio: 'Stage and screen actor. Sample cast for the demo.' },
  { key: 'kofi', username: 'kofi_mensah', craft: 'Actor', location: 'Red Deer, AB', bio: 'Character actor, forty years of it. Sample cast for the demo.' },
  { key: 'lena', username: 'lena_brooks', craft: 'Actor', location: 'Calgary, AB', bio: 'Actor, recent theatre school grad. Sample cast for the demo.' },
  { key: 'noor', username: 'noor_haddad', craft: 'Producer', location: 'Calgary, AB', bio: 'Producer-director. Sample crew for the demo.' },
];

export interface Ref { kind: 'image' | 'link' | 'video'; title: string; url: string; board?: string; notes?: string; shared?: boolean; scenes?: number[] }
export interface Character { name: string; full_name?: string; age?: string; description?: string; motivation?: string; arc?: string; color?: string }
export interface ShotPlan { size: string; angle?: string; movement?: string; lens?: string; desc: string; status?: 'planned' | 'shot' | 'omitted' }
export interface CallRow { who?: Who; character?: string; role?: string; time: string; remarks?: string }
export interface ShootDay {
  /** Happening now: its times are anchored to when the seed runs (call 2½ hours ago). */
  live?: boolean;
  day: number; offset: number; scenes: number[]; general: string; shooting: string; wrap: string;
  address?: string; weather?: string; notes?: string;
  issue?: { note?: string }; acks?: Who[]; calls: CallRow[];
  /** On-set log, minutes after general call. */
  log?: { kind: 'call' | 'rolling' | 'lunch' | 'back' | 'wrap' | 'note'; at: number; scene?: number; body?: string }[];
}
export interface DemoProject {
  key: string;
  owner: Who;
  title: string;
  format: string;
  status: 'concept' | 'pre-production' | 'production' | 'post-production' | 'completed';
  visibility: 'private' | 'team' | 'link' | 'public';
  archived?: boolean;
  unlockAll?: boolean;
  logline?: string;
  accent?: string;
  startOffset?: number;
  endOffset?: number;
  budget?: number;
  brief?: Record<string, string | string[] | number>;
  script?: { title: string; text: string; characters?: Character[]; locked?: string };
  beats?: { title: string; content: string; color: string }[];
  refs?: Ref[];
  audio?: { type: 'youtube' | 'spotify'; uri: string; title: string; description?: string }[];
  crew?: { who: Who; craft: string; role: 'lead' | 'contributor' | 'viewer' }[];
  castings?: { character: string; who: Who }[];
  sceneNotes?: { scene: number; note?: string; color?: string }[];
  shots?: { scene: number; shots: ShotPlan[] }[];
  breakdown?: { category: string; name: string; status: 'needed' | 'sourcing' | 'ready'; cost?: number; scenes: number[]; notes?: string }[];
  locations?: { name: string; status: 'scouting' | 'option' | 'confirmed'; permit: 'unknown' | 'not_needed' | 'needed' | 'applied' | 'granted'; address?: string; contact?: string; cost?: number; notes?: string }[];
  budgetLines?: { category: string; amount: number; description?: string }[];
  vendors?: { name: string; category: string; contact?: string }[];
  expenses?: { line: string; vendor?: string; description: string; amount: number; status: 'committed' | 'paid'; po?: string; daysAgo: number }[];
  schedule?: ShootDay[];
  wrapped?: number[];
  continuity?: { scene: number; body: string; by: Who; daysAgo: number }[];
  timesheets?: { who: Who; daysAgo: number; hours: number; status: 'submitted' | 'approved' | 'rejected'; rate?: number; note?: string }[];
  tasks?: { title: string; done: boolean; dueOffset?: number; who?: Who }[];
  timeline?: { title: string; type: 'milestone' | 'task' | 'event' | 'deadline'; status: 'pending' | 'in-progress' | 'completed'; start: number; end?: number; description?: string }[];
  jobs?: { key: string; title: string; role: string; description: string; rate?: number; rateType?: 'hourly' | 'fixed'; character?: string; status: 'open' | 'in-progress' | 'closed'; applicants?: { who: Who; note: string; status: 'pending' | 'accepted' | 'rejected'; daysAgo: number }[] }[];
  documents?: { kind: 'permit' | 'insurance' | 'release' | 'contract' | 'other'; title: string; status: 'needed' | 'pending' | 'done'; person?: Who; location?: string; vendor?: string; party?: string; expiresOffset?: number; notes?: string }[];
  cuts?: { title: string; url: string; daysAgo: number; notes: { at: number; dept: string; body: string; by: Who; resolved?: boolean; scene?: number }[] }[];
  post?: { kind: 'stage' | 'deliverable'; title: string; dept?: string; status: 'todo' | 'in_progress' | 'review' | 'done'; dueOffset?: number; who?: Who; notes?: string }[];
  campaigns?: { title: string; platform: string; status: 'drafting' | 'live' | 'wrapped'; reach?: string; demographic?: string; budget?: number; spend?: number; start?: number; end?: number; notes?: string }[];
  festivals?: { name: string; status: 'planned' | 'submitted' | 'accepted' | 'rejected'; deadlineOffset: number; notes?: string }[];
  portfolio?: { title: string; description: string; category: string; year: number; role: string; blocks: { type: 'cover' | 'concept' | 'text' | 'media' | 'crew'; title?: string; body?: string; image?: string }[] };
  channels?: { name: string; audience: 'team' | 'owners' | 'above' | 'below'; topic: string; messages: { who: Who; body: string; minutesAgo: number }[] }[];
}

const pic = (id: number) => `https://picsum.photos/id/${id}/1200/800`;

// ── Scripts ─────────────────────────────────────────────────────────────────

const QUIET_HOURS = `FADE IN:

INT. CKQH-FM BOOTH - NIGHT

A cramped radio booth lit by a single red ON AIR bulb. NELL ASHBY (38), hoodie, two phones, three coffees, leans into the mic.

NELL
It's 3:14 in the morning and you're listening to The Quiet Hours. If you're awake, you're family.

Through the glass, DEV (29) holds up a card: LINE 2 - SAYS IT'S ABOUT TOM.

Nell freezes. Her thumb hovers over the fader.

NELL
(on air, steady)
Line two, you're on.

MARGOT (V.O.)
(over the phone, filtered)
I saw your brother. Tuesday. At the Esso on Highway 1.

INT. CKQH-FM HALLWAY - CONTINUOUS

Dev bursts out of the control room as Nell storms past him.

DEV
You can't take that on air.

NELL
I just did.

EXT. ESSO STATION - HIGHWAY 1 - DAWN

Frost on the pumps. Nell's hatchback idles by the ice machine. She shows her phone to a CLERK (60s) — a photo of TOM (34), grinning, holding a fish.

CLERK
Lot of people come through at night. They all look like somebody.

Nell photographs the security camera over the door. It's pointed at the wall.

INT. NELL'S APARTMENT - DAY

Blackout curtains. Sticky notes on the wall form a map: ESSO. BRIDGE. MOTEL. Each one a caller, a time, a place. None of them agree.

Nell's phone buzzes. OFFICER HALE.

OFFICER HALE (V.O.)
Ms. Ashby, you need to stop broadcasting an active file.

NELL
Then find him.

INT. CKQH-FM BOOTH - NIGHT

Night two. The phone board is lit up — every line blinking.

DEV
(through the talkback)
Forty calls. They all saw him.

NELL
Then they can all tell me where.

EXT. BOW RIVER BRIDGE - NIGHT

Nell stands where a caller said Tom stood. Wind. Headlights. A figure on the far side of the bridge raises a hand — then a truck passes, and the figure is gone.

INT. PRAIRIE MOTEL - ROOM 9 - NIGHT

A motel room, untouched for weeks. Tom's jacket on the chair. On the nightstand: a portable radio, tuned to Nell's station, still on, playing static.

Nell sits on the bed. Turns it up. Her own voice, from the night before, fills the room.

NELL (V.O.)
(from the radio)
If you're awake, you're family.

INT. CKQH-FM BOOTH - NIGHT

Nell at the mic. No cards from Dev. She opens every line at once.

NELL
Tom. I know you're listening.

Silence on every line. Then — one of them breathes.

FADE OUT.`;

const LANTERN = `FADE IN:

EXT. LANTERN DINER - NIGHT

Rain on a neon sign: THE LANTERN — OPEN 24 HRS. One of the letters has already gone dark. A hand-written sign in the window: CLOSING SUNDAY. THANK YOU FOR 41 YEARS.

INT. LANTERN DINER - NIGHT

Empty booths. A jukebox nobody feeds. JUNIE (22), waitress, stacks chairs she'll have to unstack in an hour. At the counter, ELI (74), in the same stool he's sat on since 1983, stirs a coffee he won't drink.

JUNIE
You know we close at six, Eli. For good.

ELI
Then I've got till six.

INT. DINER KITCHEN - NIGHT

ROSA (56), line cook, scrapes the flat-top with the care of someone polishing silver. MR. PAIK (70s), the owner, counts the till behind her, the drawer open like a mouth.

MR. PAIK
Leave it, Rosa. The new people will rip it out.

ROSA
Then it'll be clean when they do.

INT. LANTERN DINER - NIGHT

Rosa brings Eli a plate he didn't order: two eggs, a pancake shaped like a crooked moon.

ELI
You remembered.

ROSA
You ordered it every Thursday for twenty years. It's Sunday.

ELI
It's the last Thursday.

EXT. HARBOR - NIGHT

Rosa on her break, smoking by the water. The ferry lights crawl across the black. Eli joins her with two coffees, stepping carefully over the rails.

ELI
I proposed to my wife right there. On the ferry. She said no.

ROSA
And?

ELI
I asked again on the way back. Longer ride.

INT. LANTERN DINER - NIGHT

Four a.m. Junie asleep in a booth. Rosa and Eli trade stories across the counter — the fire in '92, the night the power went and they cooked on the grill by candlelight.

ROSA
Why'd you really keep coming?

Eli looks at the dark letter in the neon sign, reflected backwards in the window.

ELI
Somebody always had the light on.

EXT. BUS STOP - DAWN

Grey light. Eli waits for the first bus, a take-out box in his hands. Across the street, the neon sign flickers once and goes out.

Rosa steps out of the diner in her coat, apron folded under her arm, and crosses to wait beside him.

FADE OUT.`;

const PAPER_MOONS = `INT. WAREHOUSE STUDIO - NIGHT

HALCYON (26), the singer, stands in a field of paper moons hung on fishing line, each one lit from inside. She sings the first verse to a lens that drifts toward her.

EXT. ROOFTOP - NIGHT

The city behind her. Halcyon releases a paper moon into the wind. It catches, lifts, and floats out over the street lights.

INT. LAUNDROMAT - NIGHT

Every dryer spinning. In each round window, a different paper moon tumbles. Halcyon walks the row, touching the glass as the chorus lands.

EXT. RAIL YARD - DAWN

A long take. Halcyon walks between parked freight cars, the paper moons now painted on every car, sun coming up behind her.

INT. WAREHOUSE STUDIO - DAY

The moons cut down, lying in piles. Halcyon lies among them, singing the last line straight up at the camera.`;

const ASHFALL = `FADE IN:

EXT. FIRE LOOKOUT TOWER - DAY

A wooden tower above a sea of pines. Smoke on the horizon, far off. WREN (31), fire lookout, logs it in a ledger with a pencil worn to a nub.

INT. FIRE LOOKOUT TOWER - DAY

A one-room cabin on stilts. A radio, a map table, an Osborne fire finder. Wren sights the smoke through it and reads the bearing.

WREN
(into the radio)
Ridge lookout to dispatch. New smoke, bearing two-seven-four. Small. For now.

DISPATCH (V.O.)
Copy, Ridge. Nobody's near it.

EXT. FIRE LOOKOUT TOWER - NIGHT

The horizon glows orange. Ash falls like snow on the railing. Wren watches, the ledger forgotten.

INT. FIRE LOOKOUT TOWER - NIGHT

The radio crackles: a hiker's voice, panicked, breaking up. Wren grabs the map and draws a line from her tower toward the glow.

HIKER (V.O.)
...creek... can't see the trail...

EXT. FOREST TRAIL - NIGHT

Wren runs down the switchbacks with a headlamp and a bandana over her face. Embers drift through the beam.

EXT. CREEK BED - DAWN

Grey light through smoke. Wren finds the HIKER (19), soaked, sitting in the creek. She sits down in the water beside him.

WREN
Good call. The water.

They watch the ash settle on the surface around them.

FADE OUT.`;

const HARBOR_LIGHTS = `FADE IN:

EXT. HARBOR - NIGHT

A string of lights along a working pier. ADA (12) casts a hand line off the end, her grandfather's old tackle box beside her.

INT. BAIT SHOP - NIGHT

Her grandfather, SILAS (70s), counts the lures on the wall. One peg is empty.

EXT. PIER - NIGHT

Ada hauls up the line. At the end, snagged on the hook: a rusted lantern.

INT. BAIT SHOP - NIGHT

Silas turns the lantern over in his hands. His initials are scratched into the base.

SILAS
Lost that the year your mother was born.

EXT. HARBOR - DAWN

Ada and Silas at the end of the pier, the cleaned lantern lit between them as the fishing boats go out.

FADE OUT.`;

const UNDERTOW = `FADE IN:

EXT. GLENMORE RESERVOIR - DAY

Wind whips the water. CAL (40s) drags a canoe up the shore, alone.

INT. BOATHOUSE - DAY

Cal hangs the paddle beside a second one — dry, dusty. He doesn't look at it.

EXT. GLENMORE RESERVOIR - DUSK

Cal paddles out. Halfway across, he stops, lets the canoe drift, and speaks to the empty seat in front of him.

CAL
You'd have hated this wind.

INT. CAL'S KITCHEN - NIGHT

Two plates set. Cal eats from one. The other he covers with a dish towel, carefully, like every night.

FADE OUT.`;

// ── The projects ────────────────────────────────────────────────────────────

export const PROJECTS: DemoProject[] = [
  // 1 · An idea, hours old: a logline, two answers, two references.
  {
    key: 'salt', owner: 'me', title: 'Salt Lines', format: 'Short Film', status: 'concept', visibility: 'private', accent: '#4f8fbf',
    logline: 'A lighthouse keeper’s daughter has one winter to decide whether to sell the light her family kept for four generations.',
    brief: { genre: ['drama'], tone: 'grounded' },
    refs: [
      { kind: 'image', title: 'The light', url: pic(58), board: 'Mood' },
      { kind: 'image', title: 'Winter shore', url: pic(13), board: 'Mood' },
    ],
  },

  // 2 · Deep in development: a draft, characters, beats, a full mood board.
  {
    key: 'quiet', owner: 'me', title: 'The Quiet Hours', format: 'Feature', status: 'concept', visibility: 'team', accent: '#c0392b',
    logline: 'After her brother vanishes on a night drive, an insomniac radio host starts taking calls from listeners who swear they saw him — each one placing him somewhere different.',
    brief: { genre: ['mystery', 'drama'], tone: 'dark', era: 'contemporary', audience: 'adults', goal: ['festivals', 'distribution'], structure: 'three_act', target_runtime: 98 },
    script: {
      title: 'The Quiet Hours — draft 3', text: QUIET_HOURS,
      characters: [
        { name: 'NELL', full_name: 'Nell Ashby', age: '38', description: 'Overnight radio host. Hasn’t slept a full night since the divorce.', motivation: 'Find Tom before the station — or the police — shut her down.', arc: 'From talking to strangers to finally listening.', color: '#c0392b' },
        { name: 'DEV', full_name: 'Devendra Rao', age: '29', description: 'Her producer. Loyal, anxious, runs the board and the rules.', motivation: 'Keep the show on air and Nell out of trouble.', color: '#2980b9' },
        { name: 'TOM', full_name: 'Tom Ashby', age: '34', description: 'Nell’s younger brother. Charming, restless, hard to hold on to.', motivation: 'Unknown — that’s the film.', color: '#27ae60' },
        { name: 'OFFICER HALE', full_name: 'Constable Irene Hale', age: '50s', description: 'Missing persons. Patient until she isn’t.', color: '#8e44ad' },
      ],
    },
    beats: [
      { title: 'The call', content: 'Live on air, a caller claims she saw Tom at a gas station. Nell takes it anyway.', color: '#c0392b' },
      { title: 'Forty sightings', content: 'The show becomes a search. Every caller saw him — somewhere else.', color: '#e67e22' },
      { title: 'Midpoint: the bridge', content: 'A figure on the bridge raises a hand. Nell starts to doubt what she saw.', color: '#f1c40f' },
      { title: 'Hale shuts it down', content: 'The police pull the show off air. Dev quits. Nell is alone with the map.', color: '#8e44ad' },
      { title: 'Room 9', content: 'Tom’s motel room: the radio still tuned to her station. He was listening.', color: '#2980b9' },
      { title: 'Every line open', content: 'The last show. She stops talking and listens.', color: '#27ae60' },
    ],
    refs: [
      { kind: 'image', title: 'Fog on the lake — opening', url: pic(11), board: 'Mood', notes: 'The colour of 4 a.m.' },
      { kind: 'image', title: 'Highway trees', url: pic(70), board: 'Mood' },
      { kind: 'image', title: 'Lone tree in fog', url: pic(95), board: 'Mood', notes: 'The bridge sequence should feel like this.' },
      { kind: 'image', title: 'Rain on glass', url: pic(171), board: 'Lighting', notes: 'Booth window at night — practicals only.' },
      { kind: 'image', title: 'Empty street, cold light', url: pic(57), board: 'Locations' },
      { kind: 'image', title: 'Snowbound road', url: pic(186), board: 'Locations' },
      { kind: 'image', title: 'The bench', url: pic(32), board: 'Mood' },
      { kind: 'link', title: 'Overnight radio — how call-in shows work', url: 'https://en.wikipedia.org/wiki/Talk_radio', board: 'Research' },
    ],
    audio: [
      { type: 'youtube', uri: 'https://www.youtube.com/watch?v=jfKfPfyJRdk', title: 'Writing music — lofi radio', description: 'What I write the booth scenes to.' },
    ],
  },

  // 3 · Pre-production, the busiest: crew, casting, shots, breakdown,
  //     locations, money, call sheets, paperwork, jobs.
  {
    key: 'lantern', owner: 'me', title: 'Night Shift at the Lantern', format: 'Short Film', status: 'pre-production', visibility: 'team', accent: '#e0a526',
    startOffset: 10, endOffset: 11, budget: 8000,
    logline: 'On the last night before a harbour diner closes for good, a line cook and her oldest regular finally trade the stories they never told.',
    brief: {
      genre: ['drama'], tone: 'grounded', era: 'contemporary', audience: 'everyone', goal: ['festivals', 'portfolio'], structure: 'three_act', target_runtime: 14,
      budget_tier: 'micro', capture: 'cinema', locations: 'practical', needs: ['night', 'water'], shoot_days: 2, style: ['handheld', 'long_takes'],
    },
    script: {
      title: 'Night Shift at the Lantern — shooting draft', text: LANTERN, locked: 'Shooting draft (white)',
      characters: [
        { name: 'ROSA', full_name: 'Rosa Medeiros', age: '56', description: 'Line cook for 30 years. Says little, remembers everything.', motivation: 'Leave the place clean.', color: '#e0a526' },
        { name: 'ELI', full_name: 'Elijah Moss', age: '74', description: 'Widower. Same stool since 1983.', motivation: 'One more night with the light on.', color: '#16a085' },
        { name: 'JUNIE', age: '22', description: 'Waitress, saving for college. The only one not sad yet.', color: '#d35400' },
        { name: 'MR. PAIK', full_name: 'Daniel Paik', age: '70s', description: 'The owner. Selling up, pretending he doesn’t mind.', color: '#7f8c8d' },
      ],
    },
    beats: [
      { title: 'Closing night', content: 'The sign in the window. Eli in his stool.', color: '#e0a526' },
      { title: 'The crooked moon', content: 'Rosa makes Eli his Thursday order on a Sunday.', color: '#d35400' },
      { title: 'The ferry story', content: 'On the harbour, Eli tells Rosa about the two proposals.', color: '#2980b9' },
      { title: 'Lights out', content: 'Dawn. The sign goes dark; Rosa crosses to the bus stop.', color: '#16a085' },
    ],
    refs: [
      { kind: 'image', title: 'Pier lamp', url: pic(68), board: 'Mood', scenes: [5] },
      { kind: 'image', title: 'String lights, wet alley', url: pic(195), board: 'Lighting', notes: 'Warm practicals against blue ambience.', scenes: [1] },
      { kind: 'image', title: 'Rain on the window', url: pic(171), board: 'Lighting', scenes: [1, 6] },
      { kind: 'image', title: 'The harbour at night', url: pic(144), board: 'Locations', scenes: [5] },
      { kind: 'image', title: 'Pier into the fog', url: pic(47), board: 'Locations' },
      { kind: 'image', title: 'Counter, morning light', url: pic(42), board: 'Production design', notes: 'Rafael: this counter, but 1983.', scenes: [2, 4] },
      { kind: 'image', title: 'Bench by the water', url: pic(87), board: 'Mood', scenes: [7] },
      { kind: 'link', title: 'Paik’s Diner — local history piece', url: 'https://en.wikipedia.org/wiki/Diner', board: 'Research' },
    ],
    crew: [
      { who: 'mara', craft: 'Director of photography', role: 'lead' },
      { who: 'theo', craft: 'Gaffer', role: 'contributor' },
      { who: 'june', craft: 'Production sound mixer', role: 'contributor' },
      { who: 'rafael', craft: 'Production designer', role: 'contributor' },
      { who: 'ines', craft: 'Actor', role: 'viewer' },
      { who: 'kofi', craft: 'Actor', role: 'viewer' },
    ],
    castings: [{ character: 'ROSA', who: 'ines' }, { character: 'ELI', who: 'kofi' }],
    sceneNotes: [
      { scene: 1, note: 'Establishing — needs the dead letter in the sign lit correctly.', color: '#e0a526' },
      { scene: 5, note: 'Harbour permit pending. Backup: the marina parking lot.', color: '#2980b9' },
    ],
    shots: [
      { scene: 1, shots: [
        { size: 'EWS', angle: 'Eye level', movement: 'Static', lens: '24mm', desc: 'The diner alone on the harbour road, rain, the neon sign.' },
        { size: 'INS', movement: 'Static', lens: '85mm', desc: 'CLOSING SUNDAY sign in the window, rain running down.' },
      ] },
      { scene: 2, shots: [
        { size: 'WS', movement: 'Slow push', lens: '32mm', desc: 'Junie stacking chairs; Eli at the counter, deep background.' },
        { size: '2S', movement: 'Static', lens: '40mm', desc: 'Junie and Eli across the counter.' },
        { size: 'CU', movement: 'Handheld', lens: '65mm', desc: 'Eli stirring the coffee he won’t drink.' },
      ] },
      { scene: 4, shots: [
        { size: 'MS', movement: 'Handheld', lens: '40mm', desc: 'Rosa sets down the plate.' },
        { size: 'INS', movement: 'Static', lens: '100mm macro', desc: 'The crooked-moon pancake.' },
        { size: 'OTS', movement: 'Static', lens: '50mm', desc: 'Over Rosa onto Eli: “It’s the last Thursday.”' },
        { size: 'OTS', movement: 'Static', lens: '50mm', desc: 'Reverse, over Eli onto Rosa.' },
      ] },
      { scene: 5, shots: [
        { size: 'WS', angle: 'Low', movement: 'Static', lens: '24mm', desc: 'Rosa by the rails, the ferry lights crossing behind.' },
        { size: '2S', movement: 'Slow dolly', lens: '40mm', desc: 'The proposal story — one take.' },
      ] },
    ],
    breakdown: [
      { category: 'props', name: 'Neon OPEN sign (one letter dead)', status: 'sourcing', cost: 350, scenes: [1, 7], notes: 'Sign shop on 17th can do a practical.' },
      { category: 'props', name: 'CLOSING SUNDAY window sign', status: 'ready', scenes: [1] },
      { category: 'props', name: 'Crooked-moon pancake (x6)', status: 'needed', cost: 20, scenes: [4] },
      { category: 'props', name: 'Till drawer and cash', status: 'ready', scenes: [3] },
      { category: 'wardrobe', name: 'Rosa’s apron', status: 'ready', scenes: [3, 4, 5, 7] },
      { category: 'wardrobe', name: 'Eli’s wool coat', status: 'sourcing', cost: 60, scenes: [2, 4, 5, 6, 7] },
      { category: 'vehicles', name: 'City bus (dawn)', status: 'needed', scenes: [7], notes: 'Ask transit about a parked bus.' },
      { category: 'sfx', name: 'Rain towers', status: 'sourcing', cost: 300, scenes: [1] },
    ],
    locations: [
      { name: 'LANTERN DINER', status: 'confirmed', permit: 'not_needed', address: '212 Harbour Rd', contact: 'Daniel (owner) · 403-555-0142', cost: 600, notes: 'Two nights, after 10pm. Power in the back room.' },
      { name: 'DINER KITCHEN', status: 'confirmed', permit: 'not_needed', address: '212 Harbour Rd (back)', contact: 'Daniel (owner)', notes: 'Flat-top works — keep it off during takes for sound.' },
      { name: 'HARBOR', status: 'option', permit: 'needed', address: 'Harbour Pier 3', contact: 'Port authority film office', cost: 250, notes: 'Night permit applied; answer due in a week.' },
      { name: 'BUS STOP', status: 'scouting', permit: 'unknown', notes: 'Want one with the diner across the street.' },
    ],
    budgetLines: [
      { category: 'Camera', amount: 2400, description: 'Camera package, 2 days' },
      { category: 'Lighting', amount: 1500, description: 'Tubes, generator, rain towers' },
      { category: 'Locations', amount: 850, description: 'Diner + pier' },
      { category: 'Art', amount: 600, description: 'Sign, dressing, props' },
      { category: 'Catering', amount: 900, description: 'Two night shoots, ~14 people' },
      { category: 'Cast', amount: 1200, description: 'Two leads + day player' },
    ],
    vendors: [
      { name: 'Northside Camera Rental', category: 'Rentals', contact: 'rentals@northside.example' },
      { name: 'Gull’s Catering', category: 'Catering', contact: '403-555-0199' },
      { name: 'Harbour Sign Co.', category: 'Art', contact: 'Mo · 403-555-0110' },
    ],
    expenses: [
      { line: 'Camera', vendor: 'Northside Camera Rental', description: 'Camera package hold (deposit)', amount: 1850, status: 'committed', po: 'PO-0142', daysAgo: 3 },
      { line: 'Locations', description: 'Diner deposit', amount: 300, status: 'paid', daysAgo: 6 },
      { line: 'Art', vendor: 'Harbour Sign Co.', description: 'Neon practical build (50%)', amount: 175, status: 'paid', daysAgo: 2 },
      { line: 'Catering', vendor: 'Gull’s Catering', description: 'Two nights hot meal', amount: 820, status: 'committed', po: 'PO-0143', daysAgo: 1 },
    ],
    schedule: [
      {
        day: 1, offset: 10, scenes: [1, 2, 3, 4], general: '18:00', shooting: '19:30', wrap: '06:00',
        address: '212 Harbour Rd', weather: 'Rain likely, 6°C', notes: 'Night shoot. Park on the harbour side. Hot meal at midnight.',
        issue: { note: 'Night one — rain towers from 19:00.' }, acks: ['mara', 'theo'],
        calls: [
          { who: 'mara', role: 'Director of photography', time: '17:30' },
          { who: 'theo', role: 'Gaffer', time: '17:00', remarks: 'Rig the sign first' },
          { who: 'june', role: 'Production sound mixer', time: '18:00' },
          { who: 'rafael', role: 'Production designer', time: '16:00', remarks: 'Dress the counter' },
          { character: 'ROSA', time: '18:30', remarks: 'Hair & make-up at 18:30' },
          { character: 'ELI', time: '18:30' },
        ],
      },
      {
        day: 2, offset: 11, scenes: [5, 6, 7], general: '19:00', shooting: '20:00', wrap: '07:00',
        address: 'Harbour Pier 3 → 212 Harbour Rd', weather: 'Clear, 4°C, sunrise 07:21',
        calls: [
          { who: 'mara', role: 'Director of photography', time: '18:30' },
          { who: 'theo', role: 'Gaffer', time: '18:00' },
          { character: 'ROSA', time: '19:00' },
          { character: 'ELI', time: '19:30' },
        ],
      },
    ],
    tasks: [
      { title: 'Table read with Ines and Kofi', done: true, dueOffset: -5 },
      { title: 'Lock the diner for both nights', done: true, dueOffset: -3 },
      { title: 'Get the harbour permit', done: false, dueOffset: 4 },
      { title: 'Cast Junie', done: false, dueOffset: 5 },
      { title: 'Find a 1st AC', done: false, dueOffset: 6 },
      { title: 'Insurance certificate to the diner', done: false, dueOffset: 7, who: 'me' },
    ],
    timeline: [
      { title: 'Table read', type: 'event', status: 'completed', start: -5 },
      { title: 'Locations locked', type: 'milestone', status: 'in-progress', start: 4 },
      { title: 'Shoot — two nights', type: 'milestone', status: 'pending', start: 10, end: 11 },
      { title: 'Festival deadline — early bird', type: 'deadline', status: 'pending', start: 60 },
    ],
    jobs: [
      {
        key: 'junie', title: 'Casting call: JUNIE — Night Shift at the Lantern', role: 'Actor', character: 'JUNIE', status: 'open', rate: 250, rateType: 'fixed',
        description: 'JUNIE (20s): waitress on the diner’s last night, the only one not sad yet. Two night shoots, scenes 2 and 6. Honorarium + meals + credit.',
        applicants: [
          { who: 'lena', note: 'I waited tables for four years — I know that last-hour tired. Reel on my profile.', status: 'pending', daysAgo: 1 },
        ],
      },
      {
        key: 'ac', title: 'First assistant camera — 2 night shoots', role: 'First assistant camera', status: 'open', rate: 300, rateType: 'fixed',
        description: 'Two nights, Alexa Mini LF on primes. Pulling focus on long handheld takes. Meals and credit.',
      },
    ],
    documents: [
      { kind: 'insurance', title: 'General liability — 2 shoot days', status: 'pending', party: 'Front Row Insurance', notes: 'Quote received; the diner wants the certificate.' },
      { kind: 'permit', title: 'Filming permit — HARBOR', status: 'pending', location: 'HARBOR', party: 'Port authority film office', notes: 'Night filming, crew of 12.' },
      { kind: 'release', title: 'Appearance release — ines_duarte', status: 'done', person: 'ines' },
      { kind: 'release', title: 'Appearance release — kofi_mensah', status: 'pending', person: 'kofi' },
      { kind: 'contract', title: 'Crew deal memo — mara_okafor', status: 'done', person: 'mara' },
      { kind: 'contract', title: 'Location agreement — Lantern Diner', status: 'done', location: 'LANTERN DINER', party: 'Daniel Paik' },
      { kind: 'contract', title: 'Rental agreement — camera package', status: 'pending', vendor: 'Northside Camera Rental', expiresOffset: 12 },
    ],
    channels: [
      { name: 'announcements', audience: 'team', topic: 'Call times, changes, the big stuff.', messages: [
        { who: 'me', body: 'Diner is locked for both nights 🎉 Call sheet for night one is out — please hit “Got it”.', minutesAgo: 60 * 20 },
        { who: 'mara', body: 'Confirmed. Theo and I will pre-light the sign the night before if Daniel is OK with it.', minutesAgo: 60 * 19 },
        { who: 'theo', body: 'Rain towers booked. Need a water source within 50ft of the front window.', minutesAgo: 60 * 5 },
      ] },
      { name: 'production', audience: 'below', topic: 'Crew logistics.', messages: [
        { who: 'rafael', body: 'Found the 1983 counter stools at a thrift store in Inglewood. Picking up Thursday.', minutesAgo: 60 * 30 },
        { who: 'june', body: 'The walk-in compressor is LOUD. Can we kill it during takes? Food goes in the cooler.', minutesAgo: 60 * 8 },
      ] },
    ],
  },

  // 4 · Shooting now: yesterday wrapped, today rolling.
  {
    key: 'moons', owner: 'me', title: 'Paper Moons', format: 'Music Video', status: 'production', visibility: 'team', accent: '#9b59b6',
    startOffset: -1, endOffset: 0, budget: 4500,
    logline: 'A music video for Halcyon Tide’s “Paper Moons”: one singer, three hundred paper moons, and a city that won’t stay dark.',
    brief: { genre: ['experimental'], tone: 'dreamlike', audience: 'everyone', goal: ['online', 'portfolio'], target_runtime: 4, capture: 'cinema', locations: 'mixed', style: ['gimbal', 'long_takes'], dailies: 'daily' },
    script: { title: 'Paper Moons — treatment', text: PAPER_MOONS, characters: [{ name: 'HALCYON', full_name: 'Halcyon Tide', age: '26', description: 'The artist.', color: '#9b59b6' }] },
    refs: [
      { kind: 'image', title: 'Bokeh field', url: pic(56), board: 'Mood', scenes: [1] },
      { kind: 'image', title: 'Stage light', url: pic(158), board: 'Lighting' },
      { kind: 'image', title: 'The tunnel glow', url: pic(137), board: 'Lighting', scenes: [5] },
      { kind: 'image', title: 'Golden hour hair', url: pic(65), board: 'Mood', scenes: [4] },
      { kind: 'image', title: 'Rail yard at dawn', url: pic(197), board: 'Locations', scenes: [4] },
      { kind: 'video', title: 'Temp track — lofi radio (tempo reference)', url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk', board: 'Music' },
    ],
    crew: [
      { who: 'mara', craft: 'Director of photography', role: 'lead' },
      { who: 'theo', craft: 'Gaffer', role: 'contributor' },
      { who: 'rafael', craft: 'Production designer', role: 'contributor' },
      { who: 'sasha', craft: 'Editor', role: 'contributor' },
    ],
    shots: [
      { scene: 1, shots: [
        { size: 'WS', movement: 'Gimbal drift', lens: '24mm', desc: 'Through the moons toward Halcyon.', status: 'shot' },
        { size: 'MCU', movement: 'Gimbal orbit', lens: '50mm', desc: 'Verse one, 360° around her.', status: 'shot' },
      ] },
      { scene: 2, shots: [
        { size: 'EWS', movement: 'Static', lens: '18mm', desc: 'The moon lifts off over the street lights.', status: 'shot' },
      ] },
      { scene: 3, shots: [
        { size: 'MS', movement: 'Dolly', lens: '35mm', desc: 'Walking the dryer row.', status: 'shot' },
        { size: 'INS', movement: 'Static', lens: '100mm macro', desc: 'A moon tumbling in a dryer window.', status: 'shot' },
      ] },
      { scene: 4, shots: [
        { size: 'WS', movement: 'Steadicam', lens: '24mm', desc: 'The long take between the freight cars — sunrise.', status: 'planned' },
      ] },
      { scene: 5, shots: [
        { size: 'CU', angle: 'Top-down', movement: 'Crane down', lens: '35mm', desc: 'Last line, straight up at the lens.', status: 'planned' },
      ] },
    ],
    wrapped: [1, 2, 3],
    locations: [
      { name: 'WAREHOUSE STUDIO', status: 'confirmed', permit: 'not_needed', address: '55 Ramsay St', cost: 700 },
      { name: 'ROOFTOP', status: 'confirmed', permit: 'granted', address: '55 Ramsay St (roof)' },
      { name: 'LAUNDROMAT', status: 'confirmed', permit: 'not_needed', address: 'Suds City, 9th Ave', cost: 300 },
      { name: 'RAIL YARD', status: 'confirmed', permit: 'granted', address: 'Alyth Yard, gate 4', contact: 'CP media office' },
    ],
    budgetLines: [
      { category: 'Camera', amount: 1500 }, { category: 'Art', amount: 1200, description: '300 paper moons + rigging' },
      { category: 'Locations', amount: 1000 }, { category: 'Crew', amount: 800 },
    ],
    expenses: [
      { line: 'Art', description: 'Rice paper, LED fairy lights, fishing line', amount: 640, status: 'paid', daysAgo: 8 },
      { line: 'Locations', description: 'Warehouse, two days', amount: 700, status: 'paid', daysAgo: 4 },
      { line: 'Locations', description: 'Laundromat, after hours', amount: 300, status: 'paid', daysAgo: 2 },
    ],
    schedule: [
      {
        day: 1, offset: -1, scenes: [1, 2, 3], general: '16:00', shooting: '17:00', wrap: '02:00',
        address: '55 Ramsay St', weather: 'Clear, 8°C', issue: {}, acks: ['mara', 'theo', 'rafael'],
        calls: [
          { who: 'mara', role: 'Director of photography', time: '15:30' },
          { who: 'theo', role: 'Gaffer', time: '14:00', remarks: 'Pre-rig the moons' },
          { who: 'rafael', role: 'Production designer', time: '12:00' },
        ],
        log: [
          { kind: 'call', at: 0 }, { kind: 'rolling', at: 70, scene: 1 },
          { kind: 'note', at: 150, scene: 1, body: 'Moons 40–60 flicker on the dimmer — swapped the battery packs.' },
          { kind: 'lunch', at: 300 }, { kind: 'back', at: 345, scene: 2 },
          { kind: 'note', at: 420, scene: 3, body: 'Laundromat owner let us stay an extra hour. Got the insert.' },
          { kind: 'wrap', at: 590 },
        ],
      },
      {
        day: 2, offset: 0, live: true, scenes: [4, 5], general: '05:30', shooting: '06:15', wrap: '14:00',
        address: 'Alyth Yard, gate 4 → 55 Ramsay St', weather: 'Clear, light wind', notes: 'Hi-vis on at all times in the yard. The yard escort meets us at the gate.',
        issue: { note: 'The long take is the day — we get the light once.' }, acks: ['mara'],
        calls: [
          { who: 'mara', role: 'Director of photography', time: '05:00' },
          { who: 'theo', role: 'Gaffer', time: '05:00' },
          { who: 'rafael', role: 'Production designer', time: '05:30' },
        ],
        log: [{ kind: 'call', at: 0 }, { kind: 'rolling', at: 50, scene: 4 }],
      },
    ],
    continuity: [
      { scene: 1, body: 'Halcyon: silver ring on the LEFT hand, hair down, sleeves pushed up.', by: 'rafael', daysAgo: 1 },
      { scene: 3, body: 'Dryer 4 door open in the wide, closed in the insert — match on the reverse.', by: 'mara', daysAgo: 1 },
    ],
    timesheets: [
      { who: 'mara', daysAgo: 1, hours: 10.5, status: 'approved', rate: 55 },
      { who: 'theo', daysAgo: 1, hours: 12, status: 'approved', rate: 40, note: 'Pre-rig from 14:00' },
      { who: 'rafael', daysAgo: 1, hours: 14, status: 'submitted', note: 'Dressing from noon' },
    ],
    tasks: [
      { title: 'Buy 300 paper lanterns', done: true }, { title: 'Rail yard permit', done: true },
      { title: 'Shoot the rail yard long take', done: false, dueOffset: 0 },
      { title: 'Send selects to Sasha', done: false, dueOffset: 1, who: 'me' },
    ],
    channels: [
      { name: 'set', audience: 'team', topic: 'Today on set.', messages: [
        { who: 'mara', body: 'At the gate. Light is coming up faster than forecast — rolling at 06:05 if we can.', minutesAgo: 90 },
        { who: 'me', body: 'Go. I’m 5 out with the coffees.', minutesAgo: 85 },
      ] },
    ],
  },

  // 5 · In post: every scene wrapped; cuts, notes, the pipeline half done.
  {
    key: 'ashfall', owner: 'me', title: 'Ashfall', format: 'Short Film', status: 'post-production', visibility: 'team', accent: '#d35400',
    startOffset: -40, endOffset: 30, budget: 12000,
    logline: 'A fire lookout who has spent three summers watching the forest from above has to walk down into it.',
    brief: { genre: ['drama', 'thriller'], tone: 'grounded', goal: ['festivals'], target_runtime: 16, aspect: 'scope', finishing: ['grade', 'sound_design', 'titles', 'captions'], music: 'score', sound_mix: 'stereo' },
    script: {
      title: 'Ashfall — shooting script', text: ASHFALL, locked: 'Shooting script (white)',
      characters: [
        { name: 'WREN', age: '31', description: 'Third summer in the tower. Talks to the radio more than people.', color: '#d35400' },
        { name: 'HIKER', age: '19', description: 'Lost, and smart enough to sit in the water.', color: '#7f8c8d' },
      ],
    },
    refs: [
      { kind: 'image', title: 'Dunes of ash (colour ref)', url: pic(184), board: 'Grade', notes: 'Push the night exteriors toward this orange.' },
      { kind: 'image', title: 'Hills in smoke', url: pic(141), board: 'Grade' },
      { kind: 'image', title: 'The hike down', url: pic(177), board: 'Mood' },
    ],
    crew: [
      { who: 'sasha', craft: 'Editor', role: 'lead' },
      { who: 'june', craft: 'Sound designer', role: 'contributor' },
      { who: 'mara', craft: 'Director of photography', role: 'contributor' },
      { who: 'ines', craft: 'Actor', role: 'viewer' },
    ],
    castings: [{ character: 'WREN', who: 'ines' }],
    beats: [
      { title: 'Above it all', content: 'Wren logs a smoke she can’t reach.', color: '#d35400' },
      { title: 'The call', content: 'A lost hiker on the radio.', color: '#c0392b' },
      { title: 'Down into it', content: 'She leaves the tower.', color: '#7f8c8d' },
    ],
    shots: [
      { scene: 1, shots: [{ size: 'EWS', movement: 'Drone', lens: '24mm', desc: 'The tower over the pines.', status: 'shot' }] },
      { scene: 5, shots: [{ size: 'MS', movement: 'Handheld', lens: '35mm', desc: 'Running the switchbacks, embers in the headlamp.', status: 'shot' }] },
      { scene: 6, shots: [{ size: '2S', movement: 'Static', lens: '50mm', desc: 'Sitting in the creek together.', status: 'shot' }] },
    ],
    schedule: [
      { day: 1, offset: -40, scenes: [1, 2], general: '06:00', shooting: '07:00', wrap: '18:00', address: 'Ridge lookout, forestry road 12', issue: {}, calls: [{ who: 'mara', role: 'Director of photography', time: '05:30' }, { character: 'WREN', time: '06:30' }] },
      { day: 2, offset: -39, scenes: [3, 4, 5, 6], general: '16:00', shooting: '17:00', wrap: '06:00', address: 'Ridge lookout → Elbow creek', issue: {}, calls: [{ who: 'mara', role: 'Director of photography', time: '15:30' }, { character: 'WREN', time: '16:00' }] },
    ],
    tasks: [{ title: 'Return the drone', done: true }, { title: 'Thank-you cards to the fire service', done: true }],
    wrapped: [1, 2, 3, 4, 5, 6],
    cuts: [
      { title: 'Assembly', url: 'https://www.youtube.com/watch?v=eRsGyueVLvQ', daysAgo: 18, notes: [
        { at: 42, dept: 'edit', body: 'Open on the ledger, not the tower — start inside her head.', by: 'me', resolved: true, scene: 1 },
        { at: 131, dept: 'sound', body: 'Room tone drops out here.', by: 'june', resolved: true },
      ] },
      { title: 'Rough cut v2', url: 'https://www.youtube.com/watch?v=R6MlUcmOul8', daysAgo: 4, notes: [
        { at: 38, dept: 'edit', body: 'Hold on the smoke two beats longer before the radio call.', by: 'me', resolved: true, scene: 2 },
        { at: 95, dept: 'color', body: 'Night exterior is too blue — should feel lit by the fire.', by: 'mara', scene: 3 },
        { at: 188, dept: 'sound', body: 'Hiker’s radio: more crackle, fewer words.', by: 'june', scene: 4 },
        { at: 264, dept: 'music', body: 'Temp score fights the dialogue — duck or drop it.', by: 'sasha' },
        { at: 702, dept: 'titles', body: 'End card: add the fire service thank-you.', by: 'me' },
      ] },
    ],
    post: [
      { kind: 'stage', title: 'Picture edit', dept: 'edit', status: 'done', who: 'sasha' },
      { kind: 'stage', title: 'Sound design & mix', dept: 'sound', status: 'in_progress', dueOffset: 12, who: 'june' },
      { kind: 'stage', title: 'Colour grade', dept: 'color', status: 'review', dueOffset: 9 },
      { kind: 'stage', title: 'Score', dept: 'music', status: 'todo', dueOffset: 16 },
      { kind: 'stage', title: 'Titles & credits', dept: 'titles', status: 'todo', dueOffset: 18 },
      { kind: 'deliverable', title: 'ProRes master (2.39)', status: 'todo', dueOffset: 25 },
      { kind: 'deliverable', title: 'Closed captions (.srt)', status: 'todo', dueOffset: 25 },
      { kind: 'deliverable', title: 'Festival screener (H.264)', status: 'in_progress', dueOffset: 20 },
      { kind: 'deliverable', title: 'Production stills (10)', status: 'done' },
    ],
    budgetLines: [{ category: 'Post', amount: 3000, description: 'Grade, mix, score' }, { category: 'Festivals', amount: 600 }],
    festivals: [{ name: 'Mountain Shorts (fictional)', status: 'planned', deadlineOffset: 45, notes: 'Early bird.' }],
    channels: [
      { name: 'post', audience: 'team', topic: 'Cuts and notes.', messages: [
        { who: 'sasha', body: 'Rough cut v2 is up in Studio › Post. 14:20 — two minutes tighter.', minutesAgo: 60 * 24 * 4 },
        { who: 'june', body: 'Fire ambience pass is in. The creek scene finally breathes.', minutesAgo: 60 * 26 },
      ] },
    ],
  },

  // 6 · Finished and out in the world: shared, festivals, campaigns, portfolio.
  {
    key: 'harbor', owner: 'me', title: 'Harbor Lights', format: 'Short Film', status: 'completed', visibility: 'link', accent: '#2c7fb8',
    startOffset: -200, endOffset: -60, budget: 5000,
    logline: 'A girl fishing off the end of the pier hooks a lantern her grandfather lost forty years ago.',
    brief: { genre: ['family', 'drama'], tone: 'light', goal: ['festivals', 'online', 'portfolio'], target_runtime: 9, platforms: ['youtube', 'vimeo'], festivals: ['shorts', 'regional'], access: ['captions'] },
    script: { title: 'Harbor Lights — final', text: HARBOR_LIGHTS, characters: [{ name: 'ADA', age: '12', color: '#2c7fb8' }, { name: 'SILAS', age: '70s', color: '#7f8c8d' }] },
    refs: [
      { kind: 'image', title: 'The pier at dawn', url: pic(77), board: 'Stills', shared: true },
      { kind: 'image', title: 'Harbour city', url: pic(74), board: 'Stills', shared: true },
      { kind: 'image', title: 'Boats going out', url: pic(50), board: 'Stills', shared: true },
      { kind: 'image', title: 'Grey sea', url: pic(135), board: 'Mood' },
      { kind: 'image', title: 'Pier in the storm', url: pic(144), board: 'Mood' },
    ],
    crew: [
      { who: 'mara', craft: 'Director of photography', role: 'contributor' }, { who: 'sasha', craft: 'Editor', role: 'contributor' },
      { who: 'lena', craft: 'Actor', role: 'viewer' }, { who: 'kofi', craft: 'Actor', role: 'viewer' },
    ],
    castings: [{ character: 'ADA', who: 'lena' }, { character: 'SILAS', who: 'kofi' }],
    beats: [
      { title: 'The line', content: 'Ada fishing where her grandfather used to.', color: '#2c7fb8' },
      { title: 'The catch', content: 'A rusted lantern on the hook.', color: '#e0a526' },
      { title: 'Lit again', content: 'Dawn on the pier, the lantern between them.', color: '#27ae60' },
    ],
    shots: [
      { scene: 3, shots: [{ size: 'INS', movement: 'Static', lens: '100mm macro', desc: 'The lantern breaks the surface.', status: 'shot' }] },
      { scene: 5, shots: [{ size: 'EWS', movement: 'Static', lens: '24mm', desc: 'The two of them and the boats going out.', status: 'shot' }] },
    ],
    budgetLines: [{ category: 'Camera', amount: 1200 }, { category: 'Post', amount: 1800 }, { category: 'Festivals', amount: 400 }],
    schedule: [
      { day: 1, offset: -160, scenes: [1, 2, 3, 4, 5], general: '17:00', shooting: '18:00', wrap: '07:00', address: 'Harbour Pier 3', issue: {}, calls: [{ who: 'mara', role: 'Director of photography', time: '16:30' }, { character: 'ADA', time: '17:30' }, { character: 'SILAS', time: '17:30' }] },
    ],
    tasks: [{ title: 'Upload the festival screener', done: true }, { title: 'Send the crew the link', done: true }],
    wrapped: [1, 2, 3, 4, 5],
    cuts: [{ title: 'Picture lock', url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ', daysAgo: 90, notes: [
      { at: 540, dept: 'color', body: 'Warm the lantern up in the last shot.', by: 'me', resolved: true },
    ] }],
    post: [
      { kind: 'stage', title: 'Picture edit', dept: 'edit', status: 'done' }, { kind: 'stage', title: 'Sound mix', dept: 'sound', status: 'done' },
      { kind: 'stage', title: 'Colour grade', dept: 'color', status: 'done' },
      { kind: 'deliverable', title: 'ProRes master', status: 'done' }, { kind: 'deliverable', title: 'Captions (EN, FR)', status: 'done' },
      { kind: 'deliverable', title: 'Poster and stills', status: 'done' },
    ],
    festivals: [
      { name: 'Northern Lights Shorts (fictional)', status: 'accepted', deadlineOffset: -120, notes: 'Screening in block 3.' },
      { name: 'Coastal Film Week (fictional)', status: 'submitted', deadlineOffset: -30 },
      { name: 'Prairie Screen (fictional)', status: 'rejected', deadlineOffset: -80 },
      { name: 'Small Worlds Online Fest (fictional)', status: 'planned', deadlineOffset: 21 },
    ],
    campaigns: [
      { title: 'Festival premiere push', platform: 'Instagram', status: 'live', reach: '5,000', demographic: 'Local film audiences, 18–45', budget: 150, spend: 90, start: -10, end: 10, notes: 'Stills carousel + 15s teaser.' },
      { title: 'Online release', platform: 'YouTube', status: 'drafting', reach: '20,000', budget: 300, start: 30, end: 60 },
      { title: 'Crowdfunding thank-you', platform: 'Email', status: 'wrapped', start: -150, end: -140 },
    ],
    portfolio: {
      title: 'Harbor Lights', description: 'A nine-minute short about a girl, her grandfather and a lantern lost for forty years.', category: 'Short Film', year: 2026, role: 'Writer / Director',
      blocks: [
        { type: 'cover', title: 'Harbor Lights', image: pic(77) },
        { type: 'concept', title: 'The idea', body: 'Things come back to you if you keep fishing in the same place.' },
        { type: 'media', title: 'Stills', image: pic(50) },
        { type: 'text', title: 'Festivals', body: 'Official selection — Northern Lights Shorts.' },
      ],
    },
  },

  // 7 · A podcast in development: a different format, a different path.
  {
    key: 'checkout', owner: 'me', title: 'Late Checkout', format: 'Podcast', status: 'concept', visibility: 'private', accent: '#16a085',
    logline: 'An audio drama in six episodes: a night auditor at a highway motel records the guests who never check out.',
    brief: { genre: ['mystery'], tone: 'heightened', goal: ['online'], target_runtime: 25, platforms: ['podcast'] },
    beats: [
      { title: 'Ep 1 — Room 12', content: 'The first guest who won’t leave.', color: '#16a085' },
      { title: 'Ep 2 — The ice machine', content: 'Something hums at 3 a.m.', color: '#2980b9' },
    ],
  },

  // 8 · Shelved: archived, off the board until restored.
  {
    key: 'wolf', owner: 'me', title: 'Wolf Moon (old draft)', format: 'Feature', status: 'concept', visibility: 'private', archived: true,
    logline: 'Two brothers inherit a failing ranch the same winter the wolves come back.',
  },

  // 9 · Someone else's film, where the demo account is cast.
  {
    key: 'undertow', owner: 'noor', title: 'Undertow', format: 'Feature', status: 'production', visibility: 'team', accent: '#34495e',
    startOffset: -2, endOffset: 12,
    logline: 'A widower keeps paddling out to the middle of the reservoir, where the water is exactly as deep as it was that day.',
    script: { title: 'Undertow', text: UNDERTOW, characters: [{ name: 'CAL', age: '40s', description: 'Widower.', color: '#34495e' }] },
    crew: [
      { who: 'me', craft: 'Actor', role: 'viewer' },
      { who: 'mara', craft: 'Director of photography', role: 'lead' },
      { who: 'june', craft: 'Production sound mixer', role: 'contributor' },
    ],
    castings: [{ character: 'CAL', who: 'me' }],
    wrapped: [1],
    schedule: [
      {
        day: 1, offset: -2, scenes: [1], general: '07:00', shooting: '08:00', wrap: '17:00', address: 'Glenmore Reservoir, south boat launch', issue: {}, acks: ['me', 'mara'],
        calls: [{ who: 'mara', role: 'Director of photography', time: '06:30' }, { character: 'CAL', time: '07:30' }],
      },
      {
        day: 2, offset: 1, scenes: [2, 3], general: '06:00', shooting: '07:00', wrap: '19:30', address: 'Glenmore Reservoir, boathouse', weather: 'Wind 30 km/h, 9°C',
        notes: 'Bring layers — we’re on the water from 16:00. Wetsuits on set.', issue: { note: 'Dusk on the water — safety boat standing by.' }, acks: ['mara'],
        calls: [{ who: 'mara', role: 'Director of photography', time: '05:30' }, { who: 'june', role: 'Production sound mixer', time: '06:00' }, { character: 'CAL', time: '06:30', remarks: 'Wardrobe fitting first' }],
      },
    ],
    timesheets: [{ who: 'me', daysAgo: 2, hours: 9.5, status: 'approved', rate: 30 }],
    documents: [
      { kind: 'release', title: 'Appearance release — CAL', status: 'pending', person: 'me', notes: 'Sign before day 2, please.' },
      { kind: 'insurance', title: 'Water safety & general liability', status: 'done', party: 'Front Row Insurance', expiresOffset: 13 },
    ],
    jobs: [
      { key: 'boom', title: 'Boom operator — Undertow', role: 'Boom operator', status: 'open', rate: 28, rateType: 'hourly', description: 'Ten days on and around the water. Wind protection essential.' },
      { key: 'script-edit', title: 'Script editor for a short (remote)', role: 'Story editor', status: 'open', rate: 400, rateType: 'fixed', description: 'Looking for a sharp second pass on a 12-page short before we shoot next spring.',
        applicants: [{ who: 'me', note: 'I’ve got three shorts behind me and love a quiet script. Happy to do a pass this week.', status: 'pending', daysAgo: 2 }] },
    ],
    channels: [
      { name: 'announcements', audience: 'team', topic: 'Undertow — the essentials.', messages: [
        { who: 'noor', body: 'Day 2 call sheet is out. Cal (that’s you 👋) — wardrobe first, then the canoe.', minutesAgo: 60 * 3 },
      ] },
    ],
  },
];

/** The demo account's own writing streak (words per day, oldest first, ending yesterday). */
export const WRITING_DAYS = [420, 610, 0, 505, 530, 880, 350, 0, 700, 512, 640, 1210, 505, 560];
