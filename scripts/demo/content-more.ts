// More demo projects for the main account: other formats, every stage and state, other roles. Built with `--set more`.
// Written against the types in ./content (types only: nothing here imports a value from it, so there is no import cycle).
import type { DemoProject, Persona } from './content';

const pic = (id: number) => `https://picsum.photos/id/${id}/1200/800`;

/** New sample people (crafts the base cast lacks). Accounts on demo.misfitscavern.invalid with no password: they cannot sign in. */
export const MORE_PERSONAS: Persona[] = [
  { key: 'idris', username: 'idris_vance', craft: 'Colourist', location: 'Vancouver, BC', bio: 'Colourist for shorts and docs. Grades in a dark room with a view of the harbour. Sample crew for the demo.' },
  { key: 'priya', username: 'priya_nair', craft: 'Composer', location: 'Victoria, BC', bio: 'Composer for picture: small string sections, a lot of silence. Sample crew for the demo.' },
  { key: 'bea', username: 'bea_lowell', craft: 'Production accountant', location: 'Calgary, AB', bio: 'Production accountant. Keeps the budget honest and the receipts in order. Sample crew for the demo.' },
  { key: 'tomas', username: 'tomas_reyes', craft: 'Script supervisor', location: 'Edmonton, AB', bio: 'Script supervisor and continuity. Remembers which hand held the cup. Sample crew for the demo.' },
  { key: 'gwen', username: 'gwen_mackay', craft: 'Casting director', location: 'Calgary, AB', bio: 'Casting director for film, TV and commercials. Sample crew for the demo.' },
  { key: 'sol', username: 'sol_adeyemi', craft: 'VFX artist', location: 'Toronto, ON', bio: 'VFX artist: compositing, practical-to-digital fixes, a lot of smoke. Sample crew for the demo.' },
];

/** Every project here has `set: 'more'`. */
export const MORE_PROJECTS: DemoProject[] = [
  // 1 · A documentary in post: interviews wrapped, releases, cuts with notes, the pipeline and the festival run.
  {
    set: 'more', key: 'ferry', owner: 'me', title: 'The Last Ferry', format: 'Documentary', status: 'post-production', visibility: 'team', accent: '#2f6f73',
    startOffset: -70, endOffset: 25, budget: 40000,
    logline: 'Three generations of one family run the last cable ferry on a river that lost its bridge in 1988. The crossing is about to end.',
    brief: { genre: ['drama'], tone: 'grounded', audience: 'adults', goal: ['festivals', 'distribution'], target_runtime: 72, capture: 'cinema', locations: 'practical' },
    script: {
      title: 'The Last Ferry — outline, cut 3', text: `DOCUMENTARY OUTLINE: THE LAST FERRY (cut 3)

EXT. RIVER CROSSING - DAWN

The cable ferry, the Cask, backs off the landing with the first light. Two hundred metres of brown water. No bridge for forty miles.

INTERVIEW: RUTH TATE (71), third generation on the cable, in the wheelhouse. She keeps one hand on the wheel the whole time she talks.

INT. TATE KITCHEN - DAY

INTERVIEW: RUTH TATE, at the table. Her father's ledger, open to 1961. Every crossing, every fare, in pencil.

EXT. LANDING, NORTH BANK - DAY

INTERVIEW: DEREK TATE (44), her son, a mechanic. The bridge was a promise the province made and did not keep. He says it without heat.

INT. COUNCIL CHAMBER - DAY

ARCHIVE: the 1988 hearing, licensed footage. A councillor reads the decision. Nobody in the room looks at the river.

EXT. RIVER CROSSING - NIGHT

The last scheduled crossing. Ferry lights on the black water. No narration. Ruth stays in the wheelhouse after the engine stops.`,
    },
    refs: [
      { kind: 'image', title: 'The Cask at dusk', url: pic(29), board: 'Mood' },
      { kind: 'image', title: 'Cable and drum', url: pic(60), board: 'Production design' },
      { kind: 'image', title: 'Flat water, grey sky', url: pic(116), board: 'Grade', notes: 'Ruth’s interview grade: cool, not blue.' },
      { kind: 'link', title: 'Cable ferries of the prairies (background reading)', url: 'https://en.wikipedia.org/wiki/Cable_ferry', board: 'Research' },
    ],
    crew: [
      { who: 'sasha', craft: 'Editor', role: 'lead' },
      { who: 'mara', craft: 'Director of photography', role: 'contributor' },
      { who: 'june', craft: 'Production sound mixer', role: 'contributor' },
      { who: 'idris', craft: 'Colourist', role: 'contributor' },
      { who: 'priya', craft: 'Composer', role: 'contributor' },
      { who: 'lena', craft: 'Actor', role: 'viewer' },
    ],
    beats: [
      { title: 'The last crossing', content: 'Open on the water, then the cable. No one explains it yet.', color: '#2f6f73' },
      { title: 'The ledger', content: 'Ruth’s father wrote every fare down. The book is the spine of the film.', color: '#8e6c3e' },
      { title: 'The bridge that never came', content: 'Derek and the 1988 hearing: the promise, in two voices.', color: '#c0392b' },
    ],
    sceneNotes: [{ scene: 1, note: 'Establishing. Hold the Cask until the engine note drops.', color: '#2f6f73' }],
    schedule: [
      {
        day: 1, offset: -60, scenes: [2], general: '09:00', shooting: '10:00', wrap: '13:00',
        address: 'Tate house, Ostrander Landing', weather: 'Overcast, 4°C', issue: {}, acks: ['mara', 'june'],
        calls: [{ who: 'mara', role: 'Director of photography', time: '08:00' }, { who: 'june', role: 'Production sound mixer', time: '08:30' }],
      },
      {
        day: 2, offset: -58, scenes: [3], general: '07:00', shooting: '07:45', wrap: '12:30',
        address: 'Landing, north bank', weather: 'Wind 25 km/h, 2°C', issue: {}, acks: ['mara'],
        calls: [{ who: 'mara', role: 'Director of photography', time: '06:30' }, { who: 'june', role: 'Production sound mixer', time: '06:45', remarks: 'Wind muff on both booms' }],
      },
      {
        day: 3, offset: -50, scenes: [1, 5], general: '05:30', shooting: '06:00', wrap: '21:00',
        address: 'Ostrander crossing, both banks', weather: 'Clear, light wind',
        calls: [{ who: 'mara', role: 'Director of photography', time: '05:00' }, { who: 'june', role: 'Production sound mixer', time: '05:15' }],
      },
    ],
    wrapped: [1, 2, 3, 5],
    documents: [
      { kind: 'release', title: 'Appearance release: Ruth Tate', status: 'done', party: 'Ruth Tate' },
      { kind: 'release', title: 'Appearance release: Derek Tate', status: 'pending', party: 'Derek Tate' },
      { kind: 'release', title: 'Release: harbour master (archive contributor)', status: 'needed', party: 'Ostrander Port Authority (fictional)' },
      { kind: 'contract', title: 'Archive licence: 1988 hearing footage', status: 'pending', party: 'Regional Archive (fictional)', notes: 'Quoted per minute. Need the final runtime first.' },
      { kind: 'contract', title: 'Editor deal: sasha_ivanova', status: 'done', person: 'sasha' },
    ],
    locations: [
      { name: 'TATE KITCHEN', status: 'confirmed', permit: 'not_needed', address: 'Ostrander Landing, house 2', contact: 'Ruth Tate' },
      { name: 'RIVER CROSSING', status: 'confirmed', permit: 'granted', address: 'Ostrander crossing', notes: 'Shoot from the landing only; no boats in the channel.' },
    ],
    budgetLines: [
      { category: 'Camera', amount: 9000, description: 'Two cameras, one lens kit' },
      { category: 'Sound', amount: 4000 },
      { category: 'Archive', amount: 6000, description: 'Licensed footage and stills' },
      { category: 'Post', amount: 18000, description: 'Edit, grade, sound, score' },
      { category: 'Travel', amount: 3000 },
    ],
    vendors: [{ name: 'Ostrander Ferry Co. (fictional)', category: 'Locations', contact: 'Office, 10 am to 4 pm' }, { name: 'Regional Archive (fictional)', category: 'Archive' }],
    expenses: [
      { line: 'Camera', description: 'Camera package, shoot weeks', amount: 2600, status: 'paid', daysAgo: 40 },
      { line: 'Archive', vendor: 'Regional Archive (fictional)', description: 'Hearing footage licence (deposit)', amount: 1800, status: 'committed', po: 'PO-0611', daysAgo: 6 },
      { line: 'Post', description: 'Edit suite, weeks 1 to 6', amount: 3200, status: 'paid', daysAgo: 12 },
      { line: 'Sound', description: 'Score session deposit', amount: 900, status: 'committed', po: 'PO-0612', daysAgo: 3 },
      { line: 'Travel', vendor: 'Ostrander Ferry Co. (fictional)', description: 'Ferry fares for the crew', amount: 480, status: 'paid', daysAgo: 50 },
    ],
    cuts: [
      { title: 'Rough v1', url: 'https://example.com/review/the-last-ferry-rough-v1', daysAgo: 20, notes: [
        { at: 310, dept: 'edit', body: 'Too much river. Cut two minutes of crossings before the first interview.', by: 'me', resolved: true, scene: 1 },
        { at: 1260, dept: 'edit', body: 'The hearing needs its own act break.', by: 'me', resolved: true, scene: 4 },
      ] },
      { title: 'Cut v2', url: 'https://example.com/review/the-last-ferry-cut-v2', daysAgo: 5, notes: [
        { at: 88, dept: 'color', body: 'Ruth’s interview is still too warm against the water.', by: 'idris', scene: 2 },
        { at: 402, dept: 'sound', body: 'Engine note is loud under Derek. Duck it 3 dB.', by: 'june', resolved: true, scene: 3 },
        { at: 1555, dept: 'music', body: 'Score stops too early. Let the last crossing carry it to black.', by: 'priya', scene: 5 },
      ] },
    ],
    post: [
      { kind: 'stage', title: 'Picture edit', dept: 'edit', status: 'done', who: 'sasha' },
      { kind: 'stage', title: 'Archive clearance', dept: 'edit', status: 'in_progress', dueOffset: 8, who: 'sasha' },
      { kind: 'stage', title: 'Sound design & mix', dept: 'sound', status: 'review', dueOffset: 14, who: 'june' },
      { kind: 'stage', title: 'Colour grade', dept: 'color', status: 'todo', dueOffset: 20, who: 'idris' },
      { kind: 'stage', title: 'Score', dept: 'music', status: 'in_progress', dueOffset: 22, who: 'priya' },
      { kind: 'stage', title: 'Titles & credits', dept: 'titles', status: 'todo', dueOffset: 26 },
      { kind: 'deliverable', title: 'Festival screener (H.264)', status: 'todo', dueOffset: 30 },
      { kind: 'deliverable', title: 'Closed captions (.srt)', status: 'todo', dueOffset: 30 },
      { kind: 'deliverable', title: 'Press kit and ferry log', status: 'done' },
    ],
    festivals: [
      { name: 'Ostrander Doc Week (fictional)', status: 'accepted', deadlineOffset: -20, notes: 'Accepted for the Saturday block.' },
      { name: 'Northern Lights Documentary (fictional)', status: 'submitted', deadlineOffset: -5, notes: 'Early-bird fee paid.' },
      { name: 'Harbour Docs Fest (fictional)', status: 'planned', deadlineOffset: 60 },
    ],
    campaigns: [
      { title: 'Festival trailer (90 s)', platform: 'YouTube', status: 'drafting', reach: '15,000', demographic: 'Documentary audiences, 30–60', budget: 250, start: 20, end: 45 },
      { title: 'Community screening tour', platform: 'Email', status: 'drafting', reach: '1,200', demographic: 'Ferry towns and river communities', start: 60, end: 120, notes: 'Ask the library network first.' },
    ],
    tasks: [
      { title: 'Fact-check the 1988 timeline against the archive', done: false, dueOffset: 3, who: 'sasha' },
      { title: 'Send the ferry log to Priya for the score', done: true, dueOffset: -4, who: 'me' },
      { title: 'Chase the port authority for the archive release', done: false, dueOffset: -2, who: 'me' },
    ],
    timeline: [
      { title: 'Principal photography', type: 'milestone', status: 'completed', start: -60, end: -50 },
      { title: 'Archive clearance', type: 'task', status: 'in-progress', start: -5, end: 10 },
      { title: 'Lock picture', type: 'milestone', status: 'pending', start: 15 },
      { title: 'Festival submissions close', type: 'deadline', status: 'pending', start: 40 },
    ],
    channels: [
      { name: 'post', audience: 'team', topic: 'Cuts, notes and the score.', messages: [
        { who: 'sasha', body: 'Cut v2 is up. Two minutes tighter, the crossing now lands before the hearing.', minutesAgo: 60 * 30 },
        { who: 'idris', body: 'First grade pass on the interviews is in. Ruth is warmer than the water now. Good.', minutesAgo: 60 * 6 },
      ] },
    ],
  },

  // 2 · A commercial in pre-production: a priced breakdown, two locations (one permit applied, one needed), the money,
  //     a shoot day nine days out, a job with three applicants, and paperwork with one expiry close and one past.
  {
    set: 'more', key: 'brightside', owner: 'me', title: 'Brightside Oat Drink — 30s', format: 'Commercial', status: 'pre-production', visibility: 'team', accent: '#e6b8a2',
    startOffset: 2, endOffset: 10, budget: 24400,
    logline: 'A thirty-second spot for an oat drink: one kitchen at six in the morning, one spilled glass, and a family that stops arguing about breakfast.',
    brief: { genre: ['comedy'], tone: 'light', audience: 'everyone', goal: ['online'], platforms: ['youtube'], capture: 'cinema', locations: 'practical' },
    script: {
      title: 'Brightside — 30s spot, treatment', text: `EXT. FAMILY HOUSE - DAWN

A quiet street. Frost on the hedges. A kitchen window glows.

INT. KITCHEN - MORNING

MARISOL (40s) pours three glasses of oat drink, one at a time, carefully. The kids are already arguing over the cereal box.

KID ONE
Mine's the one with the moon.

KID TWO
You don't get a moon. You never get a moon.

Marisol sets the carton down. It tips. A glass goes over. Oat drink runs across the counter and off the edge.

They all stop. They look at the spill. They look at each other.

INT. KITCHEN - CONTINUOUS

Kid Two mops the spill with a towel. Kid One hands him a glass without a word. Marisol laughs into her sleeve.

SUPER: BRIGHTSIDE. ENOUGH FOR EVERYONE.

END CARD: Brightside Oat Drink. Shake it. Pour it. Share it.`,
      characters: [
        { name: 'MARISOL', age: '40s', description: 'Mum, up before everyone, pretending she has it together.', motivation: 'One calm breakfast.', arc: 'Laughs instead of managing.', color: '#e6b8a2' },
        { name: 'KID ONE', age: '8', description: 'Wants the moon. Gets it, eventually.', color: '#f2c94c' },
        { name: 'KID TWO', age: '10', description: 'Knows the rules. Breaks the first one.', color: '#56ccf2' },
      ],
    },
    refs: [
      { kind: 'image', title: 'Morning light, kitchen window', url: pic(42), board: 'Lighting', scenes: [2, 3] },
      { kind: 'image', title: 'Oat-coloured palette', url: pic(88), board: 'Grade', notes: 'Warm cream, no blue.' },
      { kind: 'image', title: 'Frost on a hedge', url: pic(15), board: 'Locations', scenes: [1] },
      { kind: 'link', title: 'Breakfast table: set dressing reference', url: 'https://en.wikipedia.org/wiki/Breakfast', board: 'Research' },
    ],
    crew: [
      { who: 'mara', craft: 'Director of photography', role: 'lead' },
      { who: 'theo', craft: 'Gaffer', role: 'contributor' },
      { who: 'rafael', craft: 'Production designer', role: 'contributor' },
      { who: 'gwen', craft: 'Casting director', role: 'contributor' },
      { who: 'bea', craft: 'Production accountant', role: 'viewer' },
    ],
    shots: [
      { scene: 1, shots: [{ size: 'EWS', movement: 'Static', lens: '24mm', desc: 'The house, frost, the kitchen window lit.', status: 'planned' }] },
      { scene: 2, shots: [{ size: 'MS', movement: 'Slow push', lens: '40mm', desc: 'Marisol pouring, three glasses in a line.', status: 'planned' }, { size: 'CU', movement: 'Static', lens: '85mm', desc: 'The carton tips.', status: 'planned' }] },
    ],
    sceneNotes: [{ scene: 1, note: 'Dawn only: about 25 minutes of usable light.', color: '#e6b8a2' }],
    breakdown: [
      { category: 'cast', name: 'Marisol (lead, 40s)', status: 'sourcing', cost: 450, scenes: [2, 3] },
      { category: 'cast', name: 'Two kids, 8 and 10', status: 'needed', scenes: [2, 3], notes: 'Guardian release needed before casting is final.' },
      { category: 'props', name: 'Oat drink cartons (hero, x12)', status: 'ready', cost: 180, scenes: [2, 3] },
      { category: 'props', name: 'Glass tumblers (x6)', status: 'sourcing', cost: 60, scenes: [2] },
      { category: 'set-dressing', name: 'Frost on the hedges (spray)', status: 'needed', cost: 120, scenes: [1] },
      { category: 'wardrobe', name: 'Pyjamas and cardigan', status: 'ready', scenes: [2, 3] },
      { category: 'equipment', name: 'Slider and 120 mm lens', status: 'sourcing', cost: 500, scenes: [1] },
      { category: 'sfx', name: 'Tip-over spill rig', status: 'needed', cost: 90, scenes: [2], notes: 'Two takes at most; test it on the counter first.' },
    ],
    locations: [
      { name: 'FAMILY HOUSE', status: 'option', permit: 'applied', address: '44 Alder Crescent (fictional)', contact: 'Homeowner, via the location scout', cost: 800, notes: 'Exterior at dawn; neighbours to be told the day before.' },
      { name: 'KITCHEN', status: 'scouting', permit: 'needed', notes: 'A studio kitchen on a stage, or the test kitchen. Two quotes in.', cost: 1400 },
    ],
    budgetLines: [
      { category: 'Crew', amount: 6000 }, { category: 'Cast', amount: 4500 }, { category: 'Art', amount: 1800, description: 'Props, dressing, spill rig' },
      { category: 'Camera & Lighting', amount: 5000, description: 'Camera, grip, lights, one day' }, { category: 'Locations', amount: 2200 },
      { category: 'Post', amount: 4000, description: 'Edit, grade, sound' }, { category: 'Catering', amount: 900 },
    ],
    vendors: [
      { name: 'Prairie Lens House (fictional)', category: 'Rentals', contact: 'Bookings, 403-555-0160' },
      { name: 'Harvest Table Catering (fictional)', category: 'Catering', contact: '403-555-0173' },
      { name: 'Oakhaus Props (fictional)', category: 'Art', contact: 'Hiring desk' },
    ],
    expenses: [
      { line: 'Camera & Lighting', vendor: 'Prairie Lens House (fictional)', description: 'Camera and grip hold, one day', amount: 2100, status: 'committed', po: 'PO-0301', daysAgo: 2 },
      { line: 'Locations', description: 'Family house fee, first half', amount: 400, status: 'paid', daysAgo: 4 },
      { line: 'Catering', vendor: 'Harvest Table Catering (fictional)', description: 'Shoot-day meals (deposit)', amount: 300, status: 'paid', daysAgo: 1 },
    ],
    schedule: [
      {
        day: 1, offset: 9, scenes: [1, 2, 3], general: '05:00', shooting: '06:30', wrap: '14:00',
        address: '44 Alder Crescent (fictional), then the kitchen stage', weather: 'Frost, sunrise 07:40, dry',
        notes: 'We shoot the house at first light. Rig the kitchen window before the sun is up.',
        calls: [
          { who: 'mara', role: 'Director of photography', time: '04:30' },
          { who: 'theo', role: 'Gaffer', time: '04:00', remarks: 'Rig the kitchen window first' },
          { who: 'rafael', role: 'Production designer', time: '03:30', remarks: 'Dress the counter before anyone is on set' },
          { character: 'MARISOL', time: '05:30' },
          { character: 'KID ONE', time: '06:00' },
          { character: 'KID TWO', time: '06:00' },
        ],
      },
    ],
    documents: [
      { kind: 'insurance', title: 'Commercial general liability (1 shoot day)', status: 'done', party: 'Front Row Insurance', expiresOffset: 6, notes: 'Renew before the shoot day.' },
      { kind: 'insurance', title: 'Equipment floater: Prairie Lens House', status: 'done', vendor: 'Prairie Lens House (fictional)', party: 'Front Row Insurance', expiresOffset: -10, notes: 'Lapsed. Renewal needed before the booking.' },
      { kind: 'permit', title: 'Street closure: Alder Crescent', status: 'pending', location: 'FAMILY HOUSE', party: 'City film office (fictional)' },
      { kind: 'release', title: 'Appearance release: homeowner', status: 'done', party: 'Homeowner, Alder Crescent' },
      { kind: 'release', title: 'Minor release: KID ONE', status: 'needed', party: 'Guardian (to sign)' },
    ],
    jobs: [
      {
        key: 'marisol', title: 'Casting: MARISOL, Brightside 30s', role: 'Actor', character: 'MARISOL', status: 'open', rate: 450, rateType: 'fixed',
        description: 'MARISOL (40s): a calm mum in a kitchen at six in the morning. One day, one location, Calgary. Buyout and usage included in the fee.',
        applicants: [
          { who: 'ines', note: 'I play tired mums well. Reel and a self-tape are on my profile.', status: 'accepted', daysAgo: 4 },
          { who: 'lena', note: 'Happy to self-tape this week. Free on the 15th.', status: 'pending', daysAgo: 1 },
          { who: 'kofi', note: 'Not quite the age on the breakdown, but I would love to sit in that kitchen with you all.', status: 'rejected', daysAgo: 3 },
        ],
      },
      { key: 'food', title: 'Food stylist, one shoot day', role: 'Food stylist', status: 'open', rate: 350, rateType: 'fixed', description: 'Pour, spill and reset for three glasses and a carton. Own kit preferred.' },
    ],
    channels: [
      { name: 'announcements', audience: 'team', topic: 'Call sheets and changes.', messages: [
        { who: 'me', body: 'Shoot day is in nine days. Call sheet is a draft until the kids are cast. Thanks all.', minutesAgo: 60 * 12 },
        { who: 'gwen', body: 'Three strong self-tapes already. Marisol is the hard one. Reel links are on the job.', minutesAgo: 60 * 3 },
      ] },
    ],
  },

  // 3 · An advertising launch in production: a live campaign with reach and spend, a wrapped one and a drafting one; spend
  //     over the planned total; an overdue deadline, an in-progress milestone, one overdue task and one done.
  {
    set: 'more', key: 'cider', owner: 'me', title: 'Northern Lights Cider — launch', format: 'Advertising', status: 'production', visibility: 'team', accent: '#8b5e3c',
    startOffset: -20, endOffset: 14, budget: 6000,
    logline: 'A launch campaign for a dry apple cider: one thirty-second spot, six cutdowns, and a bartender takeover that runs through the first winter.',
    brief: { genre: ['drama'], tone: 'grounded', audience: 'adults', goal: ['online'], platforms: ['instagram', 'tiktok'], capture: 'cinema', locations: 'practical' },
    script: {
      title: 'Northern Lights Cider — 30 second spot, “First Pour”', text: `INT. CIDERY TASTING ROOM - NIGHT

Frost on the windows. DANA (30s), a bartender, pours a pale gold cider into one tall glass.

DANA (V.O.)
Dry. Cold. Made an hour from where you are standing.

EXT. ORCHARD - NIGHT

Bare trees under the aurora. The glass lifts into frame, lit from below by the sky.

SUPER: NORTHERN LIGHTS CIDER. POUR IT COLD.`,
      characters: [{ name: 'DANA', age: '30s', description: 'Bartender. Doesn’t do speeches; does do pours.', color: '#8b5e3c' }],
    },
    refs: [
      { kind: 'image', title: 'Aurora over an orchard', url: pic(106), board: 'Mood', scenes: [2] },
      { kind: 'image', title: 'Tasting room, frost on glass', url: pic(133), board: 'Locations', scenes: [1] },
      { kind: 'link', title: 'Cider glass shape reference', url: 'https://en.wikipedia.org/wiki/Cider', board: 'Research' },
    ],
    crew: [
      { who: 'noor', craft: 'Producer', role: 'lead' },
      { who: 'mara', craft: 'Director of photography', role: 'contributor' },
      { who: 'sasha', craft: 'Editor', role: 'contributor' },
      { who: 'gwen', craft: 'Casting director', role: 'viewer' },
    ],
    campaigns: [
      { title: 'Launch: Instagram reels', platform: 'Instagram', status: 'live', reach: '120,000', demographic: '25–40, Calgary and Edmonton, out two or more nights a week', budget: 1500, spend: 900, start: -6, end: 20, notes: 'Three reels, then one cutdown a week.' },
      { title: 'Autumn billboards', platform: 'Outdoor', status: 'wrapped', reach: '210,000 impressions', demographic: 'Commuters, 25–55', budget: 1200, spend: 1180, start: -60, end: -30, notes: 'Two weeks on the ring road.' },
      { title: 'Bartender takeover', platform: 'TikTok', status: 'drafting', reach: '80,000', demographic: '21–35, bar and restaurant staff', budget: 900, start: 25, end: 50 },
    ],
    budgetLines: [
      { category: 'Camera', amount: 2000, description: 'Spot shoot: camera and lights' },
      { category: 'Locations', amount: 1200, description: 'Cidery hire, one night' },
      { category: 'Talent', amount: 1500 },
      { category: 'Post', amount: 1300, description: 'Edit, cutdowns, grade' },
    ],
    vendors: [{ name: 'Hollow Cellar Hire (fictional)', category: 'Locations', contact: 'Events desk' }, { name: 'Ridgeline Lighting (fictional)', category: 'Rentals' }],
    expenses: [
      { line: 'Camera', vendor: 'Ridgeline Lighting (fictional)', description: 'Lighting package hold', amount: 1200, status: 'committed', po: 'PO-0412', daysAgo: 3 },
      { line: 'Camera', vendor: 'Ridgeline Lighting (fictional)', description: 'Camera and lighting, shoot day', amount: 1450, status: 'paid', daysAgo: 14 },
      { line: 'Locations', vendor: 'Hollow Cellar Hire (fictional)', description: 'Cidery hire, one night', amount: 1350, status: 'paid', daysAgo: 10 },
      { line: 'Talent', description: 'Bartender, day rate', amount: 1100, status: 'committed', po: 'PO-0413', daysAgo: 3 },
      { line: 'Post', description: 'Edit and six cutdowns (first half)', amount: 1000, status: 'committed', po: 'PO-0414', daysAgo: 2 },
      { line: 'Post', description: 'Grade, first pass', amount: 300, status: 'paid', daysAgo: 1 },
    ],
    schedule: [
      {
        day: 1, offset: -12, scenes: [1, 2], general: '15:00', shooting: '16:30', wrap: '01:00',
        address: 'Hollow Cellar, tasting room', weather: 'Clear, -9°C', issue: {}, acks: ['mara'],
        calls: [{ who: 'mara', role: 'Director of photography', time: '14:00' }, { character: 'DANA', time: '15:30' }],
      },
    ],
    tasks: [
      { title: 'Sign off the copy deck with the client', done: false, dueOffset: -3, who: 'me' },
      { title: 'Book the cidery for the shoot', done: true, dueOffset: -14, who: 'noor' },
      { title: 'Approve the six cutdowns', done: false, dueOffset: 4, who: 'sasha' },
    ],
    timeline: [
      { title: 'Spot shoot wrapped', type: 'event', status: 'completed', start: -12 },
      { title: 'Client sign-off on the cut', type: 'deadline', status: 'pending', start: -4, description: 'Missed the Friday. Chase on Monday.' },
      { title: 'Launch week', type: 'milestone', status: 'in-progress', start: -2, end: 5 },
      { title: 'Bartender takeover live', type: 'milestone', status: 'pending', start: 25 },
    ],
    channels: [
      { name: 'announcements', audience: 'team', topic: 'Launch week, sign-offs.', messages: [
        { who: 'noor', body: 'Reels are live. Client wants the sign-off on the cut by Monday.', minutesAgo: 60 * 20 },
        { who: 'sasha', body: 'Six cutdowns are in the review folder. Reel one is the one they will argue about.', minutesAgo: 60 * 2 },
      ] },
    ],
  },

  // 4 · A weekly YouTube series, unlockAll: shots, post stages per episode, live campaigns, tasks, timeline events,
  //     submitted timesheets.
  {
    set: 'more', key: 'garage', owner: 'me', title: 'Garage Bench', format: 'YouTube', status: 'production', visibility: 'team', accent: '#556b2f', unlockAll: true,
    startOffset: -90, endOffset: 180, budget: 9000,
    logline: 'A weekly series in a one-car garage: a retired machinist rebuilds a bench lathe, one episode a week, shot in a single afternoon.',
    brief: { genre: ['family'], tone: 'light', audience: 'everyone', goal: ['online'], platforms: ['youtube'], target_runtime: 12, capture: 'cinema' },
    script: {
      title: 'Garage Bench — episode 1 script', text: `EPISODE 1: THE BENCH LATHE (video script)

COLD OPEN

EXT. GARAGE DOOR - DAY

The door rolls up. Frost still on the drive. KOFI (60s) wipes his hands on a rag.

KOFI (TO CAMERA)
This lathe has been in the same corner since 1979. Today it turns again. Or it doesn't, and we learn something.

INT. GARAGE - DAY

The lathe under a tarp. Kofi pulls it off. Rust like fur along the bed.

B-ROLL: a wire brush on the ways. Oil on a cloth. Solvent in a jam jar.

INT. GARAGE - DAY (LATER)

The headstock turns by hand, once, then again. Kofi stops, and he is smiling.

KOFI (TO CAMERA)
That's the sound. Next week, we make it cut.

END SCREEN: Subscribe for next Saturday. The parts list is in the description.`,
      characters: [{ name: 'KOFI', age: '60s', description: 'Retired machinist. Talks to the lathe, not the camera.', motivation: 'Get the lathe turning before the winter.', arc: 'Shares the bench with a new audience.', color: '#556b2f' }],
    },
    shots: [
      { scene: 1, shots: [{ size: 'WS', movement: 'Static', lens: '24mm', desc: 'The door rolls up, the drive in frost.', status: 'shot' }] },
      { scene: 2, shots: [{ size: 'MS', movement: 'Handheld', lens: '35mm', desc: 'Pulling the tarp off the lathe.', status: 'shot' }, { size: 'INS', movement: 'Static', lens: '100mm macro', desc: 'Rust on the ways.', status: 'planned' }] },
      { scene: 3, shots: [{ size: 'CU', movement: 'Static', lens: '50mm', desc: 'The headstock turns, Kofi smiling.', status: 'planned' }] },
    ],
    crew: [
      { who: 'kofi', craft: 'Host', role: 'lead' },
      { who: 'sasha', craft: 'Editor', role: 'contributor' },
      { who: 'theo', craft: 'Gaffer', role: 'contributor' },
      { who: 'june', craft: 'Production sound mixer', role: 'contributor' },
    ],
    castings: [{ character: 'KOFI', who: 'kofi' }],
    schedule: [
      {
        day: 1, offset: -10, scenes: [1, 2, 3], general: '08:00', shooting: '09:00', wrap: '17:00',
        address: 'Ivy Street garage (fictional)', weather: 'Clear, 2°C', issue: {}, acks: ['theo'],
        calls: [{ who: 'theo', role: 'Gaffer', time: '07:30' }, { who: 'june', role: 'Production sound mixer', time: '08:00' }, { character: 'KOFI', time: '08:30' }],
      },
    ],
    post: [
      { kind: 'stage', title: 'Ep 1 · Picture edit', dept: 'edit', status: 'done', who: 'sasha' },
      { kind: 'stage', title: 'Ep 1 · Thumbnail', dept: 'titles', status: 'done', who: 'me' },
      { kind: 'deliverable', title: 'Ep 1 · Upload (1080p)', status: 'done' },
      { kind: 'stage', title: 'Ep 2 · Picture edit', dept: 'edit', status: 'in_progress', dueOffset: 2, who: 'sasha' },
      { kind: 'stage', title: 'Ep 2 · Sound', dept: 'sound', status: 'review', dueOffset: 3, who: 'june' },
      { kind: 'deliverable', title: 'Ep 2 · Captions (.srt)', status: 'todo', dueOffset: 4 },
      { kind: 'stage', title: 'Ep 3 · Shoot planning', dept: 'production', status: 'todo', dueOffset: 9, who: 'me' },
      { kind: 'deliverable', title: 'Ep 3 · Thumbnail', status: 'todo', dueOffset: 12 },
    ],
    campaigns: [
      { title: 'Weekly upload: YouTube', platform: 'YouTube', status: 'live', reach: '8,000 per episode', demographic: 'Makers and restorers, 35–65', budget: 600, spend: 240, start: -90, end: 180 },
      { title: 'Shorts clips', platform: 'YouTube Shorts', status: 'live', reach: '40,000', budget: 200, spend: 90, start: -30, end: 180 },
      { title: 'Club newsletter', platform: 'Email', status: 'drafting', start: 10, end: 60 },
    ],
    timesheets: [
      { who: 'theo', daysAgo: 1, hours: 6, status: 'submitted', note: 'Lighting the bench, two hours of setup' },
      { who: 'sasha', daysAgo: 1, hours: 5, status: 'submitted', note: 'Ep 2 rough assembly' },
      { who: 'june', daysAgo: 1, hours: 4, status: 'submitted' },
    ],
    tasks: [
      { title: 'Book the garage for episode 3', done: false, dueOffset: 5, who: 'me' },
      { title: 'Source the lathe belts', done: true, dueOffset: -6, who: 'theo' },
      { title: 'Caption pass for episode 2', done: false, dueOffset: 4, who: 'sasha' },
    ],
    timeline: [
      { title: 'Episode 1 live', type: 'event', status: 'completed', start: -3 },
      { title: 'Episode 2 uploads', type: 'milestone', status: 'in-progress', start: 1 },
      { title: 'Sponsor deadline', type: 'deadline', status: 'pending', start: 30 },
      { title: 'Season one wraps', type: 'milestone', status: 'pending', start: 90 },
    ],
  },

  // 5 · A series in concept: eight characters with arcs, a season outline, a mood board, brief answers, tasks. No shoot yet.
  {
    set: 'more', key: 'saltiron', owner: 'me', title: 'Salt & Iron', format: 'Series', status: 'concept', visibility: 'team', accent: '#5d6d7e',
    logline: 'A harbour town where the salt works and the iron foundry share one debt. An eight-episode season about who pays it back.',
    brief: { genre: ['drama'], tone: 'grounded', era: 'contemporary', audience: 'adults', goal: ['distribution', 'festivals'], structure: 'three_act', target_runtime: 50, platforms: ['youtube'] },
    script: {
      title: 'Salt & Iron — pilot, cold open', text: `FADE IN:

EXT. SALT WORKS - DAWN

Grey pans of brine under a grey sky. MARGARET VOSS (58) rakes salt into a pile that will not dry. Her hands are wrapped in cloth.

INT. FOUNDRY OFFICE - DAY

A ledger with two columns, both red. JONAH VOSS (34), her son, reads the figures aloud. He does not look up.

JONAH
The furnace is owed more than the works.

MARGARET
Then the works owes the furnace. Sit down.

EXT. IRON YARD - DAY

Smoke from the foundry stack. DELPHINE ROOK (45), the company's counsel, steps out of a black car with a folder she does not open.

DELPHINE
I'm here about the water rights, not the debt.

TESS MARR (24), a welder with burns on one forearm, watches from the gate and does not move.

INT. WORKERS' CANTEEN - NIGHT

Long tables. OREN DACEY (63), the union steward, slides a cup across to AUGUST PELL (52), who has just come back from eight years inside.

OREN
Nobody here has forgotten. Nobody's forgiven you either.

INT. SCHOOLHOUSE - DAY

PETRA LIND (26) counts lunch tickets against a list of names. RUS KAMINSKI (40s), the night pit boss, leans in the doorway.

FADE OUT.`,
      characters: [
        { name: 'MARGARET', full_name: 'Margaret Voss', age: '58', description: 'Runs the salt works her husband built. Stubborn to the bone.', motivation: 'Keep the pans running and the family out of the company’s hands.', arc: 'From refusing to sell to choosing what to let go.', color: '#5d6d7e' },
        { name: 'JONAH', full_name: 'Jonah Voss', age: '34', description: 'Her son, the bookkeeper who knows exactly how bad it is.', motivation: 'Get the works out of debt without losing his mother.', arc: 'Learns the numbers lie about who paid.', color: '#2e86c1' },
        { name: 'DELPHINE', full_name: 'Delphine Rook', age: '45', description: 'Company counsel. Calm, precise, and not the villain she is written as.', motivation: 'Close the water deal before the strike.', arc: 'Finds a line she will not cross.', color: '#8e44ad' },
        { name: 'TESS', full_name: 'Tess Marr', age: '24', description: 'Welder. Was promised an apprenticeship and is still waiting for it.', motivation: 'Win the apprenticeship, or make someone give her a reason not to.', arc: 'From waiting at the gate to leading the walkout.', color: '#d35400' },
        { name: 'OREN', full_name: 'Oren Dacey', age: '63', description: 'Union steward. Has buried two strikes and a friend.', motivation: 'Keep the men together.', arc: 'Forgives August, once, out loud.', color: '#7f8c8d' },
        { name: 'AUGUST', full_name: 'August Pell', age: '52', description: 'Back from eight years inside for a fire at the furnace.', motivation: 'Prove the fire was not his.', arc: 'A confession, then a choice.', color: '#16a085' },
        { name: 'PETRA', full_name: 'Petra Lind', age: '26', description: 'Teaches at the company school. Knows which kids are hungry.', motivation: 'Keep the school open.', arc: 'Learns to ask for help from the people she has been protecting.', color: '#f1c40f' },
        { name: 'RUS', full_name: 'Rus Kaminski', age: '40s', description: 'Night pit boss, Jonah’s oldest friend. Takes orders from the company.', motivation: 'Protect his crew from the cuts.', arc: 'Picks a side on the night shift.', color: '#27ae60' },
      ],
    },
    beats: [
      { title: 'Ep 1: The ledger', content: 'Jonah finds the second set of books. Two columns, one of them in his mother’s hand.', color: '#5d6d7e' },
      { title: 'Ep 2: The water', content: 'Delphine’s deal turns on the aquifer under the pans.', color: '#2e86c1' },
      { title: 'Ep 3: The gate', content: 'Tess walks out. Oren has to choose between the men and the deal.', color: '#d35400' },
      { title: 'Ep 4: August’s return', content: 'The fire, from the inside. August tells the story he has not told anyone.', color: '#16a085' },
      { title: 'Ep 5: The school', content: 'Petra refuses to close the school for the company’s sake.', color: '#f1c40f' },
      { title: 'Ep 6: The count', content: 'Margaret counts the pans, one by one, in the rain.', color: '#7f8c8d' },
      { title: 'Ep 7: The strike', content: 'The night shift stops. Rus has to decide whose orders he is following.', color: '#27ae60' },
      { title: 'Ep 8: Low tide', content: 'The works are sold, or they are not. The last image is the salt.', color: '#8e44ad' },
    ],
    refs: [
      { kind: 'image', title: 'Salt pans from the air', url: pic(164), board: 'Mood' },
      { kind: 'image', title: 'Foundry at night', url: pic(169), board: 'Mood', notes: 'The orange is the only warm thing in the season.' },
      { kind: 'image', title: 'Canteen, long tables', url: pic(180), board: 'Locations' },
      { kind: 'image', title: 'Hands in cloth', url: pic(91), board: 'Characters' },
      { kind: 'link', title: 'Brine works and salt production (background)', url: 'https://en.wikipedia.org/wiki/Salt_evaporation_pond', board: 'Research' },
    ],
    crew: [
      { who: 'noor', craft: 'Producer', role: 'contributor' },
      { who: 'tomas', craft: 'Script supervisor', role: 'viewer' },
      { who: 'priya', craft: 'Composer', role: 'viewer' },
    ],
    tasks: [
      { title: 'Write the episode 3 outline', done: false, dueOffset: 14, who: 'me' },
      { title: 'Research the 1970s brine works', done: true, dueOffset: -6, who: 'me' },
      { title: 'Find a writers’ room reader', done: false, dueOffset: 30, who: 'noor' },
    ],
    timeline: [
      { title: 'Writers’ room', type: 'milestone', status: 'pending', start: 20, end: 40 },
      { title: 'Pitch to the commissioner', type: 'deadline', status: 'pending', start: 60 },
    ],
  },

  // 6 · A video game in concept: a game script, beats, references, tasks, and two jobs open (narrative designer, composer).
  {
    set: 'more', key: 'cinder', owner: 'me', title: 'Cinder Court', format: 'Video Game', status: 'concept', visibility: 'team', accent: '#b03a2e',
    logline: 'A third-person heist in a city that burns every twelve years. The player is the last clerk who knows where the Court keeps its records.',
    brief: { genre: ['thriller', 'mystery'], tone: 'heightened', audience: 'adults', goal: ['online'], structure: 'three_act' },
    budget: 120000,
    script: {
      title: 'Cinder Court — narrative script, prototype', text: `CINDER COURT: NARRATIVE SCRIPT (prototype, act one)

INT. RECORDS OFFICE - NIGHT

Ash drifts past the high windows. IVO (30s), the player's clerk, files the last page of the Court's ledger.

IVO
Twelve years since the last burn. They say the records survive it. They say a lot of things.

[PLAYER CHOICE: Read the ledger aloud / Burn the duplicate / Pocket the archive key]

EXT. CINDER COURT - NIGHT

Stone steps. Lanterns on the rail. A bell rings once, far off.

GUARD (V.O.)
Clerk. The Court is closed.

[GAMEPLAY: stealth section. Three routes to the archive door: the gallery, the sewers, the chapel roof.]

INT. ARCHIVE - CONTINUOUS

The vault door is warm to the touch. Behind it, the second half of the ledger.

[BRANCH: with the key, the door opens. Without it, Ivo needs the chapel roof route and a distraction.]`,
      characters: [
        { name: 'IVO', age: '30s', description: 'The player’s clerk. Knows the filing system better than the guards do.', motivation: 'Find out what the Court is hiding in the records.', arc: 'Chooses what to burn.', color: '#b03a2e' },
        { name: 'GUARD', description: 'Court guard. Follows the rota, not the rumours.', color: '#7f8c8d' },
      ],
    },
    beats: [
      { title: 'Act one: the clerk', content: 'The ledger, the bell, the first choice.', color: '#b03a2e' },
      { title: 'Act two: the burn', content: 'The city goes up. Three routes, one archive.', color: '#d35400' },
      { title: 'Act three: the ledger', content: 'The second half of the book names the people who lit the fire.', color: '#8e44ad' },
    ],
    refs: [
      { kind: 'image', title: 'Ember-lit stone', url: pic(201), board: 'Mood' },
      { kind: 'image', title: 'Gallery corridor', url: pic(212), board: 'Levels', notes: 'Route one.' },
      { kind: 'image', title: 'Ledger page, close', url: pic(119), board: 'UI' },
    ],
    tasks: [
      { title: 'Lock the three-route stealth brief', done: false, dueOffset: 10, who: 'me' },
      { title: 'Name the four factions', done: true, dueOffset: -5, who: 'me' },
      { title: 'Shortlist publishers for the pitch', done: false, dueOffset: 20, who: 'me' },
    ],
    jobs: [
      {
        key: 'narrative', title: 'Narrative designer: Cinder Court', role: 'Narrative designer', status: 'open', rate: 60, rateType: 'hourly',
        description: 'Branching dialogue and the ledger’s record system. Twelve weeks part-time, remote with one studio visit.',
      },
      {
        key: 'composer', title: 'Composer: Cinder Court soundtrack', role: 'Composer', status: 'open', rate: 2800, rateType: 'fixed',
        description: 'Eight tracks for the Court, the burn and the archive. Adaptive stems for the three stealth routes.',
        applicants: [{ who: 'priya', note: 'Adaptive stems are my favourite problem. Score samples on my profile.', status: 'pending', daysAgo: 2 }],
      },
    ],
    timeline: [
      { title: 'Publisher pitch', type: 'deadline', status: 'pending', start: 40 },
      { title: 'Vertical slice', type: 'milestone', status: 'pending', start: 90 },
    ],
  },

  // 7 · A feature in production: a live call sheet for today (issued), continuity, timesheets in every state, wrapped days,
  //     crew of nine, and expenses paid and committed.
  {
    set: 'more', key: 'meridian', owner: 'me', title: 'Hollow Meridian', format: 'Feature', status: 'production', visibility: 'team', accent: '#1f3a5f',
    startOffset: -4, endOffset: 16, budget: 180000,
    logline: 'A surveyor sent to re-mark a closed border town finds its maps were drawn to keep someone out, and that someone is still there.',
    brief: { genre: ['mystery', 'thriller'], tone: 'dark', era: 'contemporary', audience: 'adults', goal: ['festivals', 'distribution'], structure: 'three_act', target_runtime: 102, budget_tier: 'micro', capture: 'cinema', locations: 'mixed', style: ['long_takes'] },
    script: {
      title: 'Hollow Meridian — shooting draft', locked: 'Shooting draft (blue)', text: `FADE IN:

EXT. MERIDIAN CHECKPOINT - DAWN

A striped barrier across an empty road. A sign: MERIDIAN. CLOSED SINCE 1994. Frost on the wire. A survey truck idles beside it.

INT. SURVEYOR'S TRUCK - CONTINUOUS

ELSA VANE (40s), surveyor, sets a theodolite on the dash and sights the town through the windscreen.

ELSA
Nobody has surveyed it in thirty years. Somebody didn't want them to.

The bearing is wrong by two degrees. She taps the glass. Nothing moves.

EXT. MERIDIAN STREET - DAY

Shuttered shops. A church bell with no rope. Chalk on the pavement: a line that runs the wrong way.

Elsa walks it, counting paces. At forty she stops at a window. Her reflection is a beat late.

INT. MERIDIAN TOWN HALL - DAY

Dust sheets over a long table. Maps under glass. Every map has the town drawn one street short.

ODILE (60s), the last registrar, sits at the head of the table with a cup of tea she has been pouring for thirty years.

ODILE
You're late for the boundary. You've been late since the bridge.

INT. MERIDIAN CHURCH - NIGHT

Candles. The bell hangs from a beam with no rope. A photograph on the altar: JONAS VANE, 1994. Elsa climbs the ladder and lays her palm on the bronze. It is warm.

ELSA
(to herself)
Who keeps it warm?

EXT. MERIDIAN BOUNDARY - DAY

A stone post at the edge of the road. Elsa sights the mark. The post is a metre closer to the town than it was last night.`,
      characters: [
        { name: 'ELSA', full_name: 'Elsa Vane', age: '40s', description: 'Surveyor. Careful with numbers, careless with people.', motivation: 'Finish the survey and go home.', arc: 'Learns the map is a person.', color: '#1f3a5f' },
        { name: 'ODILE', full_name: 'Odile Marsh', age: '60s', description: 'The last registrar. Pours the tea every morning.', motivation: 'Keep the boundary where it is.', arc: 'Tells Elsa the truth about the bridge.', color: '#7f8c8d' },
        { name: 'JONAS', full_name: 'Jonas Vane', age: '1994', description: 'Elsa’s brother. Went into Meridian and did not come out.', color: '#c0392b' },
      ],
    },
    refs: [
      { kind: 'image', title: 'Frost on the wire', url: pic(154), board: 'Mood', scenes: [1] },
      { kind: 'image', title: 'Empty high street', url: pic(129), board: 'Locations', scenes: [3] },
      { kind: 'image', title: 'Church bell, no rope', url: pic(143), board: 'Production design', scenes: [5] },
    ],
    crew: [
      { who: 'noor', craft: 'Producer', role: 'lead' },
      { who: 'mara', craft: 'Director of photography', role: 'contributor' },
      { who: 'theo', craft: 'Gaffer', role: 'contributor' },
      { who: 'june', craft: 'Production sound mixer', role: 'contributor' },
      { who: 'rafael', craft: 'Production designer', role: 'contributor' },
      { who: 'tomas', craft: 'Script supervisor', role: 'contributor' },
      { who: 'bea', craft: 'Production accountant', role: 'contributor' },
      { who: 'sol', craft: 'VFX artist', role: 'viewer' },
      { who: 'gwen', craft: 'Casting director', role: 'viewer' },
    ],
    castings: [{ character: 'ELSA', who: 'ines' }, { character: 'ODILE', who: 'kofi' }, { character: 'JONAS', who: 'lena' }],
    shots: [
      { scene: 1, shots: [{ size: 'EWS', movement: 'Static', lens: '24mm', desc: 'The barrier and the empty road, one minute of frost light.', status: 'shot' }] },
      { scene: 6, shots: [{ size: 'MS', movement: 'Dolly', lens: '35mm', desc: 'Elsa sights the post. Hold until the post moves.', status: 'planned' }, { size: 'INS', movement: 'Static', lens: '100mm macro', desc: 'The mark on the stone.', status: 'planned' }] },
    ],
    wrapped: [1, 2, 3, 4, 5],
    schedule: [
      {
        day: 1, offset: -4, scenes: [1, 2], general: '06:00', shooting: '07:00', wrap: '18:00', address: 'Route 9, Meridian checkpoint (fictional)',
        weather: 'Frost, 2°C', issue: {}, acks: ['mara'],
        calls: [{ who: 'mara', role: 'Director of photography', time: '05:00' }, { who: 'theo', role: 'Gaffer', time: '05:00' }, { who: 'june', role: 'Production sound mixer', time: '06:00' }, { character: 'ELSA', time: '06:30' }],
      },
      {
        day: 2, offset: -3, scenes: [3], general: '07:00', shooting: '08:00', wrap: '19:00', address: 'Meridian street', weather: 'Overcast, 0°C', issue: {}, acks: ['mara', 'rafael'],
        calls: [{ who: 'mara', role: 'Director of photography', time: '06:30' }, { who: 'rafael', role: 'Production designer', time: '05:30', remarks: 'Chalk line on the pavement' }, { character: 'ELSA', time: '07:00' }],
      },
      {
        day: 3, offset: -2, scenes: [4], general: '16:00', shooting: '17:00', wrap: '02:00', address: 'Meridian town hall (set)', weather: 'Indoors', issue: {}, acks: ['mara'],
        notes: 'Night turn: the tea must stay hot. The kettle is on the mains.',
        calls: [{ who: 'mara', role: 'Director of photography', time: '15:00' }, { character: 'ODILE', time: '16:30' }, { character: 'ELSA', time: '16:30' }],
      },
      {
        day: 4, offset: -1, scenes: [5], general: '17:00', shooting: '18:00', wrap: '04:00', address: 'Meridian church (St. Ada, fictional)', weather: 'Clear, -6°C', issue: {}, acks: ['mara', 'theo'],
        calls: [{ who: 'mara', role: 'Director of photography', time: '16:30' }, { who: 'theo', role: 'Gaffer', time: '16:00' }, { character: 'ELSA', time: '17:30' }, { character: 'JONAS', time: '18:00', remarks: 'Photo only, no lines' }],
      },
      {
        day: 5, offset: 0, live: true, scenes: [6], general: '07:00', shooting: '08:00', wrap: '19:00', address: 'Meridian boundary, gate 2', weather: 'Clear, wind 20 km/h',
        notes: 'Stone post is the only prop that moves. Keep the rope on the left.',
        issue: { note: 'Post shot: we get the light once, before noon. Hi-vis on the road.' }, acks: ['mara', 'theo', 'june'],
        calls: [{ who: 'mara', role: 'Director of photography', time: '06:30' }, { who: 'theo', role: 'Gaffer', time: '06:00' }, { who: 'june', role: 'Production sound mixer', time: '06:30' }, { character: 'ELSA', time: '06:30' }],
        log: [{ kind: 'call', at: 0 }, { kind: 'rolling', at: 40, scene: 6 }, { kind: 'note', at: 95, scene: 6, body: 'The post moved a metre overnight. Check the mark before the next take.' }],
      },
    ],
    continuity: [
      { scene: 1, body: 'Elsa’s grey wool coat: buttons undone in the wide, done up in the close.', by: 'tomas', daysAgo: 3 },
      { scene: 2, body: 'Theodolite on the dash: reversed in the insert (mirror image of the wide).', by: 'tomas', daysAgo: 3 },
      { scene: 4, body: 'Odile’s teacup: full in the wide, empty in the close.', by: 'tomas', daysAgo: 1 },
    ],
    timesheets: [
      { who: 'mara', daysAgo: 4, hours: 11, status: 'approved', rate: 55 },
      { who: 'theo', daysAgo: 3, hours: 10, status: 'approved', rate: 40 },
      { who: 'june', daysAgo: 2, hours: 12, status: 'rejected', note: 'Included a 40-minute lunch break; wrap was 19:00.' },
      { who: 'rafael', daysAgo: 1, hours: 9, status: 'submitted', note: 'Dressing the town hall overnight' },
      { who: 'bea', daysAgo: 1, hours: 7.5, status: 'submitted' },
      { who: 'tomas', daysAgo: 0, hours: 6, status: 'submitted', note: 'Continuity sheets for day 5' },
    ],
    budgetLines: [
      { category: 'Camera', amount: 45000, description: 'Package, lenses, drive' },
      { category: 'Locations', amount: 14000 },
      { category: 'Cast', amount: 30000 },
      { category: 'Crew', amount: 38000 },
      { category: 'Art', amount: 16000, description: 'Town dressing, signage, sheets' },
      { category: 'Post', amount: 25000 },
      { category: 'Insurance', amount: 12000 },
    ],
    vendors: [
      { name: 'Northside Camera Rental', category: 'Rentals', contact: 'rentals@northside.example' },
      { name: 'Ridgeline Hire (fictional)', category: 'Locations', contact: 'Bookings' },
      { name: 'Oakhaus Props (fictional)', category: 'Art', contact: 'Hiring desk' },
    ],
    expenses: [
      { line: 'Camera', vendor: 'Northside Camera Rental', description: 'Camera package, weeks 1 and 2', amount: 14800, status: 'paid', daysAgo: 9 },
      { line: 'Camera', vendor: 'Northside Camera Rental', description: 'Lens hold, weeks 3 and 4', amount: 6200, status: 'committed', po: 'PO-0520', daysAgo: 1 },
      { line: 'Locations', vendor: 'Ridgeline Hire (fictional)', description: 'Checkpoint hire, week 1', amount: 3200, status: 'paid', daysAgo: 6 },
      { line: 'Art', vendor: 'Oakhaus Props (fictional)', description: 'Town dressing: signage and sheets', amount: 4100, status: 'paid', daysAgo: 5 },
      { line: 'Cast', description: 'Cast deals, weeks 1 and 2', amount: 9000, status: 'committed', po: 'PO-0519', daysAgo: 2 },
      { line: 'Insurance', description: 'Production package', amount: 7200, status: 'paid', daysAgo: 14 },
    ],
    documents: [
      { kind: 'permit', title: 'Road closure: Route 9 (two days)', status: 'done', location: 'MERIDIAN CHECKPOINT', party: 'County roads office (fictional)' },
      { kind: 'permit', title: 'Boundary survey access', status: 'done', location: 'MERIDIAN BOUNDARY', party: 'Land office (fictional)' },
      { kind: 'permit', title: 'Church use: St. Ada', status: 'pending', location: 'MERIDIAN CHURCH', party: 'Parish office (fictional)', notes: 'Waiting on the parish council. Shoot is day 4.' },
      { kind: 'insurance', title: 'Production package', status: 'done', party: 'Front Row Insurance', expiresOffset: 180 },
      { kind: 'release', title: 'Appearance release: Elsa (ines)', status: 'done', person: 'ines' },
      { kind: 'contract', title: 'Crew deal memo: tomas', status: 'done', person: 'tomas' },
    ],
    locations: [
      { name: 'MERIDIAN CHECKPOINT', status: 'confirmed', permit: 'granted', address: 'Route 9, km 41', cost: 0 },
      { name: 'MERIDIAN TOWN HALL', status: 'confirmed', permit: 'not_needed', address: 'Built on stage 2', cost: 0 },
      { name: 'MERIDIAN CHURCH', status: 'option', permit: 'applied', address: 'St. Ada, Meridian (fictional)', contact: 'Parish office', cost: 1200 },
      { name: 'MERIDIAN BOUNDARY', status: 'confirmed', permit: 'granted', address: 'Gate 2, Route 9' },
    ],
    tasks: [
      { title: 'Rope and the bell fixing (prop)', done: false, dueOffset: 1, who: 'rafael' },
      { title: 'Confirm the church permit with the parish', done: false, dueOffset: 2, who: 'noor' },
      { title: 'Lock the week-three schedule', done: true, dueOffset: -2 },
      { title: 'Return the theodolite to the hire house', done: false, dueOffset: 16, who: 'me' },
    ],
    timeline: [
      { title: 'Principal photography', type: 'milestone', status: 'in-progress', start: -4, end: 16 },
      { title: 'Pickups', type: 'milestone', status: 'pending', start: 20 },
      { title: 'Locked picture', type: 'milestone', status: 'pending', start: 60 },
      { title: 'Week one wrapped', type: 'event', status: 'completed', start: -1 },
    ],
    channels: [
      { name: 'set', audience: 'team', topic: 'Today on set.', messages: [
        { who: 'mara', body: 'At the gate. Light is coming up faster than forecast. Rolling by 08:10 if the post is where we left it.', minutesAgo: 110 },
        { who: 'tomas', body: 'Stone post is a metre off from yesterday. Photo is in the continuity folder. Do not reset it.', minutesAgo: 60 },
      ] },
    ],
  },

  // 8 · A finished feature, archived: festivals (accepted, rejected, submitted), campaigns wrapped, post and paperwork all done.
  {
    set: 'more', key: 'winter', owner: 'me', title: 'Winter Quarters', format: 'Feature', status: 'completed', visibility: 'link', archived: true, accent: '#7d8fa9',
    startOffset: -420, endOffset: -300, budget: 150000,
    logline: 'Four months in a boarding house for railway widows, one winter the company stopped paying the rent.',
    brief: { genre: ['drama'], tone: 'grounded', audience: 'adults', goal: ['festivals', 'distribution'], target_runtime: 96, structure: 'three_act', capture: 'cinema' },
    script: {
      title: 'Winter Quarters — final', text: `EXT. BOARDING HOUSE - DUSK

Snow on the platform. The boarding house sits above the rail yard, every window lit but one.

INT. BOARDING HOUSE, KITCHEN - NIGHT

Six widows at one table with one lamp. HELEN (60s) reads the letter from the company out loud, twice, for the people who could not hear the first time.

HELEN
They are sorry. They are sorry for the third time this year.

INT. BOARDING HOUSE, STAIRS - NIGHT

Ruth carries a coal scuttle up the back stairs in her stockings. Her feet are blue. She keeps climbing.

EXT. RAIL YARD - DAWN

A freight car rolls out of the yard, empty. The women watch it go, and then they go back inside to light the stove.`,
      characters: [
        { name: 'HELEN', full_name: 'Helen Dyer', age: '60s', description: 'Keeps the house. Keeps the books.', color: '#7d8fa9' },
        { name: 'RUTH', age: '40s', description: 'Carries the coal. Says the least.', color: '#16a085' },
      ],
    },
    refs: [
      { kind: 'image', title: 'Snow on the platform', url: pic(190), board: 'Stills', shared: true },
      { kind: 'image', title: 'The kitchen lamp', url: pic(96), board: 'Stills', shared: true },
      { kind: 'image', title: 'Rail yard, grey', url: pic(104), board: 'Mood' },
    ],
    crew: [
      { who: 'sasha', craft: 'Editor', role: 'lead' },
      { who: 'mara', craft: 'Director of photography', role: 'contributor' },
      { who: 'june', craft: 'Production sound mixer', role: 'contributor' },
      { who: 'ines', craft: 'Actor', role: 'viewer' },
    ],
    castings: [{ character: 'HELEN', who: 'ines' }],
    wrapped: [1, 2, 3, 4],
    schedule: [
      {
        day: 1, offset: -410, scenes: [1, 2, 3, 4], general: '15:00', shooting: '16:00', wrap: '06:00', address: 'Boarding house, Prairie rail town (fictional)',
        weather: 'Snow, -18°C', issue: {}, acks: ['mara'],
        calls: [{ who: 'mara', role: 'Director of photography', time: '14:00' }, { character: 'HELEN', time: '15:00' }, { character: 'RUTH', time: '15:30' }],
      },
    ],
    festivals: [
      { name: 'Prairie Winter Film Festival (fictional)', status: 'accepted', deadlineOffset: -200, notes: 'Opening night, competition.' },
      { name: 'Alpine Cinema Week (fictional)', status: 'rejected', deadlineOffset: -150, notes: 'Thanks, but not this year.' },
      { name: 'Coastal Drama Showcase (fictional)', status: 'submitted', deadlineOffset: -40 },
    ],
    campaigns: [
      { title: 'Festival premiere', platform: 'Instagram', status: 'wrapped', reach: '18,000', demographic: 'Film festival audiences', budget: 400, spend: 380, start: -200, end: -180 },
      { title: 'Release announcement', platform: 'Email', status: 'wrapped', reach: '3,200', budget: 50, spend: 40, start: -170, end: -160 },
    ],
    post: [
      { kind: 'stage', title: 'Picture edit', dept: 'edit', status: 'done', who: 'sasha' },
      { kind: 'stage', title: 'Sound mix', dept: 'sound', status: 'done', who: 'june' },
      { kind: 'stage', title: 'Colour grade', dept: 'color', status: 'done' },
      { kind: 'deliverable', title: 'DCP (2K)', status: 'done' },
      { kind: 'deliverable', title: 'Captions (EN)', status: 'done' },
      { kind: 'deliverable', title: 'Poster and stills', status: 'done' },
    ],
    budgetLines: [{ category: 'Camera', amount: 60000 }, { category: 'Post', amount: 40000 }, { category: 'Locations', amount: 20000 }, { category: 'Crew', amount: 30000 }],
    expenses: [
      { line: 'Camera', description: 'Camera package, full shoot', amount: 58200, status: 'paid', daysAgo: 300 },
      { line: 'Post', description: 'Edit, mix and grade', amount: 39000, status: 'paid', daysAgo: 250 },
      { line: 'Locations', description: 'Boarding house, eight weeks', amount: 19500, status: 'paid', daysAgo: 380 },
    ],
    documents: [
      { kind: 'contract', title: 'Distribution deal memo', status: 'done', party: 'Harbour Pictures (fictional)' },
      { kind: 'release', title: 'Appearance release: Helen (ines)', status: 'done', person: 'ines' },
      { kind: 'permit', title: 'Location permit: boarding house', status: 'done', location: 'BOARDING HOUSE', party: 'Town of Prairie Spur (fictional)' },
    ],
    locations: [{ name: 'BOARDING HOUSE', status: 'confirmed', permit: 'granted', address: '3 Depot Street (fictional)', cost: 19500 }],
    tasks: [
      { title: 'Deliver the DCP to the festival', done: true, dueOffset: -190 },
      { title: 'Archive the stills and the sound stems', done: true, dueOffset: -120 },
    ],
    timeline: [
      { title: 'Principal photography', type: 'milestone', status: 'completed', start: -420, end: -360 },
      { title: 'Festival premiere', type: 'event', status: 'completed', start: -200 },
    ],
    portfolio: {
      title: 'Winter Quarters', description: 'A winter in a railway boarding house, six women and one unpaid rent.', category: 'Feature', year: 2026, role: 'Writer / Director',
      blocks: [
        { type: 'cover', title: 'Winter Quarters', image: pic(190) },
        { type: 'concept', title: 'The idea', body: 'The company stopped paying. The women kept the stove lit.' },
        { type: 'text', title: 'Festivals', body: 'Official selection: Prairie Winter Film Festival.' },
      ],
    },
  },

  // 9 · A short just started: a visibility of private, and nothing but a one-line logline.
  {
    set: 'more', key: 'untitled', owner: 'me', title: 'Untitled (just started)', format: 'Short Film', status: 'concept', visibility: 'private',
    logline: 'Someone keeps leaving the porch light on for a house that was sold last spring.',
  },

  // 10 · A collaboration, owned by a sample person: the account is the director of photography on her set.
  {
    set: 'more', key: 'greenhouse', owner: 'noor', title: 'Greenhouse', format: 'Short Film', status: 'production', visibility: 'team', accent: '#2e9e6a',
    startOffset: -3, endOffset: 5, budget: 9000,
    logline: 'A greenhouse keeper spends one night saving the last seedlings of a variety her late husband bred, while a storm takes out the town’s power.',
    brief: { genre: ['drama'], tone: 'grounded', audience: 'adults', goal: ['festivals'], target_runtime: 12, capture: 'cinema', locations: 'practical' },
    script: {
      title: 'Greenhouse — shooting draft', text: `FADE IN:

INT. GREENHOUSE - NIGHT

Power out. One hurricane lamp. Tomatoes swell on the vines behind the glass. ROSALIND (60s) moves along the benches with a torch between her teeth.

EXT. GREENHOUSE ROOF - NIGHT

Rain on the glass like gravel. Rosalind climbs the ladder with a tarp under one arm and fights the wind to pin it down.

INT. GREENHOUSE - DAWN

Grey light. The seedlings stand in their trays, bent and alive. Rosalind sits down among them and does not get up for a long time.

FADE OUT.`,
      characters: [{ name: 'ROSALIND', full_name: 'Rosalind Hart', age: '60s', description: 'Keeps the greenhouse her husband built. Does not say what she has lost.', motivation: 'Save the seedlings.', arc: 'Lets someone help her.', color: '#2e9e6a' }],
    },
    crew: [
      { who: 'me', craft: 'Director of photography', role: 'contributor' },
      { who: 'theo', craft: 'Gaffer', role: 'contributor' },
      { who: 'rafael', craft: 'Production designer', role: 'contributor' },
    ],
    castings: [{ character: 'ROSALIND', who: 'ines' }],
    shots: [{ scene: 1, shots: [{ size: 'MS', movement: 'Handheld', lens: '35mm', desc: 'Rosalind with the torch between her teeth.', status: 'shot' }] }],
    schedule: [
      {
        day: 1, offset: -3, scenes: [1, 2], general: '18:00', shooting: '19:00', wrap: '04:00', address: 'Greenhouse, Hart Road (fictional)', weather: 'Storm forecast, wind 60 km/h',
        issue: { note: 'Night one. Hot drinks at midnight. Rain covers are in the van.' }, acks: ['theo'],
        calls: [{ who: 'me', role: 'Director of photography', time: '17:00' }, { who: 'theo', role: 'Gaffer', time: '17:00' }, { character: 'ROSALIND', time: '18:30' }],
      },
      {
        day: 2, offset: 2, scenes: [3], general: '05:30', shooting: '06:15', wrap: '10:00', address: 'Greenhouse, Hart Road (fictional)', weather: 'Clear after the storm, 3°C',
        calls: [{ who: 'me', role: 'Director of photography', time: '05:00' }, { who: 'rafael', role: 'Production designer', time: '04:30', remarks: 'Trays back on the benches' }, { character: 'ROSALIND', time: '06:00' }],
      },
    ],
    timesheets: [{ who: 'me', daysAgo: 2, hours: 10, status: 'submitted' }],
    tasks: [
      { title: 'Lock the greenhouse location', done: true, dueOffset: -10, who: 'noor' },
      { title: 'Crew lunch on the second day', done: false, dueOffset: 2, who: 'theo' },
    ],
  },

  // 11 · A collaboration, owned by a sample person: the account watches the cut from the side.
  {
    set: 'more', key: 'anniversary', owner: 'sasha', title: 'The Anniversary', format: 'Short Film', status: 'post-production', visibility: 'team', accent: '#b5838d',
    startOffset: -60, endOffset: -10, budget: 4000,
    logline: 'Two sisters meet at their parents’ empty lake house to scatter the ashes a year late, and find they still disagree about everything.',
    brief: { genre: ['drama'], tone: 'grounded', audience: 'adults', goal: ['festivals'], target_runtime: 14 },
    script: {
      title: 'The Anniversary — locked', locked: 'Shooting script (white)', text: `FADE IN:

EXT. LAKE HOUSE DOCK - DAY

Still water. Two sisters' footprints in the frost on the boards. NELL (30s) holds a tin. Her sister, CASS (30s), stands at the end of the dock with her back to the house.

NELL
You could at least pretend it's a ceremony.

CASS
It's a tin, Nell. It's the same tin.

INT. LAKE HOUSE KITCHEN - DAY

Two mugs, one clean and one not. Cass finds their mother’s handwriting on a calendar: ANNIVERSARY, circled, a year back.

CASS
She was planning a party.

NELL
She was planning to be alone with him. It's the same thing with her.

EXT. LAKE HOUSE DOCK - DUSK

The tin opened. The wind takes the ash out over the water, and neither sister is quick enough to stop it.`,
      characters: [
        { name: 'NELL', age: '30s', description: 'The one who stayed.', color: '#b5838d' },
        { name: 'CASS', age: '30s', description: 'The one who left, and came back for the tin.', color: '#6d597a' },
      ],
    },
    crew: [
      { who: 'mara', craft: 'Director of photography', role: 'lead' },
      { who: 'june', craft: 'Sound designer', role: 'contributor' },
      { who: 'me', craft: 'Writer', role: 'viewer' },
    ],
    post: [
      { kind: 'stage', title: 'Picture edit', dept: 'edit', status: 'done', who: 'sasha' },
      { kind: 'stage', title: 'Sound design', dept: 'sound', status: 'in_progress', dueOffset: 6, who: 'june' },
      { kind: 'stage', title: 'Colour grade', dept: 'color', status: 'todo', dueOffset: 15 },
      { kind: 'deliverable', title: 'Festival screener (H.264)', status: 'todo', dueOffset: 20 },
      { kind: 'deliverable', title: 'Captions (.srt)', status: 'todo', dueOffset: 22 },
    ],
    cuts: [
      { title: 'Assembly', url: 'https://example.com/review/the-anniversary-assembly', daysAgo: 12, notes: [
        { at: 60, dept: 'edit', body: 'The first pan lingers on the boots. Cut it in half.', by: 'me' },
        { at: 210, dept: 'sound', body: 'Lake ambience is too quiet under the dock scene.', by: 'june', resolved: true },
      ] },
    ],
    budgetLines: [{ category: 'Post', amount: 2500 }, { category: 'Festivals', amount: 300 }],
    festivals: [{ name: 'Short Lake Fest (fictional)', status: 'planned', deadlineOffset: 40 }],
    channels: [
      { name: 'post', audience: 'team', topic: 'Cuts and notes.', messages: [
        { who: 'sasha', body: 'Assembly is up. Two notes from June on the dock scene.', minutesAgo: 60 * 24 * 3 },
        { who: 'june', body: 'Ambience pass is in. The dock finally sounds like a lake.', minutesAgo: 60 * 5 },
      ] },
    ],
  },
];
