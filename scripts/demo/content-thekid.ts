// The second account's demo world: a different working life (a podcaster and music-video maker who is also crew on other people's
// projects). Built with `--set thekid`. Types only from ./content, so there is no import cycle.
import type { DemoProject, Persona } from './content';

const pic = (id: number) => `https://picsum.photos/id/${id}/1200/800`;

/** Sample people for this account's world. Accounts on demo.misfitscavern.invalid with no password: they cannot sign in. */
export const THEKID_PERSONAS: Persona[] = [
  { key: 'priyam', username: 'priya_menon', craft: 'Press', location: 'Calgary, AB', bio: 'Publicist for independent films and a regular on the festival circuit. Sample crew for the demo.' },
  { key: 'owen', username: 'owen_gallagher', craft: 'Motion designer', location: 'Calgary, AB', bio: 'Titles, lower thirds and far too many kinetic type tests. Sample crew for the demo.' },
  { key: 'beak', username: 'bea_kowalczyk', craft: 'Line producer', location: 'Edmonton, AB', bio: 'Keeps the budget and the day honest. Sample crew for the demo.' },
  { key: 'tobi', username: 'tobi_adeyemi', craft: 'Sound designer', location: 'Calgary, AB', bio: 'Sound designer and podcast mixer, mostly for voices that need more room. Sample crew for the demo.' },
];

/** Every project here has `set: 'thekid'`; `owner: 'me'` is the account the run is for. */
export const THEKID_PROJECTS: DemoProject[] = [
  // 1 · A podcast in season two: three recording days (two wrapped, one today), post by episode, campaigns, jobs, guests.
  {
    set: 'thekid', key: 'backrow', owner: 'me', title: 'Back Row', format: 'Podcast', status: 'production', visibility: 'team', accent: '#8e44ad',
    startOffset: -21, endOffset: 60, budget: 9000,
    logline: 'A weekly film-talk podcast for people who read the credits: two hosts, one guest a week, and a rule that nobody says “it’s not that deep.”',
    brief: { genre: ['comedy'], tone: 'light', audience: 'adults', goal: ['online', 'portfolio'], target_runtime: 55, platforms: ['podcast', 'youtube'] },
    script: {
      title: 'Back Row — episodes 12 to 14', characters: [
        { name: 'HOST', description: 'Runs the show. Reads every credit, including the ones in the rolling text.', color: '#8e44ad' },
        { name: 'GUEST', description: 'Guest of the week. Runs press for independent films.', color: '#16a085' },
      ],
      text: `INT. BACK ROW STUDIO - DAY

Two chairs, one window, a shelf of VHS tapes nobody has rewound. A red light over the door.

HOST
Welcome to Back Row, the film podcast for people who read the credits.

HOST
This week: the sound of a film, and the one person who never gets thanked for it.

INT. BACK ROW STUDIO - DAY

The GUEST leans into the mic, a press pack on her knee.

GUEST
Press is mostly waiting for an email back.

HOST
Then what gets a film seen?

GUEST
A friend who has a bad week and still shares it.

INT. BACK ROW STUDIO - DAY

A laminated card on the table: HEIST ENDING, NO SPOILERS. The host turns it over.

HOST
Last week we argued about a heist film nobody here has seen twice.

INT. BACK ROW STUDIO - DAY

Coffee rings on the table. The red light flickers.

HOST
Listener mail. Someone wants us to rank the credit fonts. We will not.

INT. BACK ROW STUDIO - NIGHT

HOST
Episode twelve. The one where we talked about a mixing desk for an hour.

INT. BACK ROW STUDIO - NIGHT

HOST
Thanks for listening. Stay for the credits.`,
      },
    locations: [
      { name: 'BACK ROW STUDIO', status: 'confirmed', permit: 'not_needed', address: '212 Mason St, second floor', contact: 'Second Floor Studio', cost: 1200, notes: 'Booked by the day. Out by 17:15 on recording days.' },
    ],
    refs: [
      { kind: 'image', title: 'Booth at night', url: pic(171), board: 'Studio', notes: 'The look we want for the video clips: practicals only.' },
      { kind: 'image', title: 'Cinema seats, empty', url: pic(96), board: 'Mood' },
      { kind: 'link', title: 'Ep 13 heist ending — the argument, in one page', url: 'https://example.com/back-row/heist-ending', board: 'Research' },
    ],
    crew: [
      { who: 'tobi', craft: 'Sound designer', role: 'contributor' },
      { who: 'beak', craft: 'Line producer', role: 'contributor' },
      { who: 'priyam', craft: 'Press', role: 'contributor' },
      { who: 'owen', craft: 'Motion designer', role: 'contributor' },
    ],
    schedule: [
      {
        day: 1, offset: -14, scenes: [5, 6], general: '13:00', shooting: '13:30', wrap: '16:00',
        address: '212 Mason St, second floor', weather: 'Indoors, the radiator is on', issue: { note: 'Episode 12: a two-hander, no guest.' }, acks: ['tobi', 'beak'],
        calls: [
          { who: 'me', role: 'Host', time: '12:45' },
          { who: 'tobi', role: 'Sound designer', time: '12:30', remarks: 'Room tone first' },
          { who: 'beak', role: 'Line producer', time: '12:00' },
        ],
      },
      {
        day: 2, offset: -7, scenes: [3, 4], general: '13:00', shooting: '13:30', wrap: '16:30',
        address: '212 Mason St, second floor', issue: { note: 'Episode 13: the heist one, solo.' }, acks: ['tobi'],
        calls: [
          { who: 'me', role: 'Host', time: '12:45' },
          { who: 'tobi', role: 'Sound designer', time: '12:30' },
          { who: 'owen', role: 'Motion graphics artist', time: '15:00', remarks: 'Shoot the card for the spoiler joke' },
        ],
      },
      {
        day: 3, offset: 0, live: true, scenes: [1, 2], general: '14:00', shooting: '14:30', wrap: '17:00',
        address: '212 Mason St, second floor', weather: 'Indoors', notes: 'Priya has the press pack. Keep the chair by the window for her.',
        issue: { note: 'Episode 14: the studio day. Priya is our guest.' }, acks: ['tobi', 'beak'],
        calls: [
          { who: 'me', role: 'Host', time: '13:30' },
          { who: 'tobi', role: 'Sound designer', time: '13:30', remarks: 'Two mics on the guest chairs' },
          { who: 'beak', role: 'Line producer', time: '13:45' },
          { who: 'priyam', role: 'Publicist', time: '14:00', remarks: 'Guest. Bring the press pack.' },
          { who: 'owen', role: 'Motion graphics artist', time: '14:15', remarks: 'Lower thirds and the episode card' },
        ],
        log: [
          { kind: 'call', at: 0 },
          { kind: 'rolling', at: 35, scene: 1 },
          { kind: 'note', at: 95, scene: 2, body: 'Guest mic clipped on the first laugh. Re-ran the line.' },
        ],
      },
    ],
    wrapped: [3, 4, 5, 6],
    timesheets: [
      { who: 'tobi', daysAgo: 6, hours: 6, status: 'approved', rate: 35, note: 'Episode 12 cut and first mix' },
      { who: 'beak', daysAgo: 2, hours: 4, status: 'submitted', note: 'Studio booking and the guest run-sheet' },
      { who: 'me', daysAgo: 7, hours: 3, status: 'approved', note: 'Show notes for episode 12' },
    ],
    tasks: [
      { title: 'Confirm the cinema sponsor for episode 15', done: false, dueOffset: 3, who: 'me' },
      { title: 'Book the guest for episode 15', done: true },
      { title: 'Upload episode 13 show notes', done: false, dueOffset: 3, who: 'beak' },
    ],
    timeline: [
      { title: 'Season two recording block', type: 'milestone', status: 'in-progress', start: -14, end: 14 },
      { title: 'Episode 14 goes out', type: 'deadline', status: 'pending', start: 4 },
      { title: 'Sponsor pitch to local cinemas', type: 'task', status: 'completed', start: -60 },
    ],
    budgetLines: [
      { category: 'Studio', amount: 3600, description: 'Booth hire, season two' },
      { category: 'Guests', amount: 1200, description: 'Travel and meals' },
      { category: 'Equipment', amount: 800, description: 'Mics and cables' },
      { category: 'Editing', amount: 1800, description: 'Show editor hours' },
    ],
    vendors: [
      { name: 'Second Floor Studio', category: 'Studio', contact: 'bookings@secondfloor.example' },
      { name: 'Prairie Mic Rental', category: 'Rentals', contact: '403-555-0177' },
    ],
    expenses: [
      { line: 'Studio', vendor: 'Second Floor Studio', description: 'Booth hire, four recording days', amount: 1200, status: 'paid', daysAgo: 14 },
      { line: 'Guests', description: 'Guest travel, episode 13 (train and a hotel night)', amount: 480, status: 'paid', daysAgo: 8 },
      { line: 'Equipment', vendor: 'Prairie Mic Rental', description: 'Two lav mics for the guest chairs', amount: 260, status: 'committed', po: 'PO-0201', daysAgo: 2 },
    ],
    jobs: [
      {
        key: 'show-editor', title: 'Show editor — Back Row (weekly)', role: 'Editor', status: 'in-progress', rate: 35, rateType: 'hourly',
        description: 'Cut each episode from the raw files: tighten, clean up, leave the laughs. About six hours a week. Remote is fine.',
        applicants: [
          { who: 'tobi', note: 'I mix every episode already. Happy to take the cut on the same files.', status: 'accepted', daysAgo: 12 },
          { who: 'owen', note: 'Titles are my home turf, but I cut for two years on a radio show.', status: 'pending', daysAgo: 2 },
        ],
      },
      {
        key: 'sponsor-reads', title: 'Sponsor-read writer (per episode)', role: 'Writer', status: 'open', rate: 250, rateType: 'fixed',
        description: 'Two 60-second reads a month that sound like the show and still sell the thing. Brief and notes from the host.',
        applicants: [
          { who: 'priyam', note: 'I can write it short, and I know what a host sounds like after a hard week.', status: 'rejected', daysAgo: 4 },
        ],
      },
    ],
    documents: [
      { kind: 'release', title: 'Guest release — priya_menon', status: 'done', person: 'priyam' },
      { kind: 'contract', title: 'Editor agreement — show editor', status: 'pending', person: 'tobi', notes: 'Send after episode 14 is out.' },
    ],
    post: [
      { kind: 'stage', title: 'Edit — episode 12', dept: 'edit', status: 'done', who: 'tobi' },
      { kind: 'stage', title: 'Edit — episode 13', dept: 'edit', status: 'in_progress', dueOffset: 2, who: 'tobi' },
      { kind: 'stage', title: 'Edit — episode 14', dept: 'edit', status: 'todo', dueOffset: 6, who: 'tobi' },
      { kind: 'stage', title: 'Mix and master — episode 13', dept: 'sound', status: 'review', dueOffset: 1, who: 'tobi' },
      { kind: 'stage', title: 'Titles and lower thirds (season)', dept: 'titles', status: 'in_progress', dueOffset: 9, who: 'owen' },
      { kind: 'deliverable', title: 'Episode 12 — audio master (WAV)', status: 'done' },
      { kind: 'deliverable', title: 'Episode 13 — audio master (MP3)', status: 'review', dueOffset: 1 },
      { kind: 'deliverable', title: 'Episode 13 — show notes and timestamps', status: 'todo', dueOffset: 3 },
      { kind: 'deliverable', title: 'Episode 14 — video cut for the channel', status: 'todo', dueOffset: 7 },
      { kind: 'deliverable', title: 'Episode 14 — three 60-second clips', status: 'todo', dueOffset: 8 },
    ],
    campaigns: [
      { title: 'Season two launch', platform: 'YouTube', status: 'live', reach: '3,200 subscribers', demographic: 'Film people, 25–44', budget: 400, spend: 180, start: -10, end: 20, notes: 'A clip every Thursday.' },
      { title: 'Newsletter: the credits roll', platform: 'Email', status: 'drafting', reach: '900 readers', budget: 0, spend: 0, start: 5, end: 12 },
      { title: 'Sponsor pitch — local cinemas', platform: 'Podcast app', status: 'wrapped', reach: 'two cinemas in talks', budget: 150, spend: 150, start: -60, end: -30, notes: 'One said yes; one is still deciding.' },
    ],
    channels: [
      { name: 'episodes', audience: 'team', topic: 'Recording, cuts and what goes out.', messages: [
        { who: 'me', body: 'Episode 14 records today at 14:00. Priya is in the chair by the window.', minutesAgo: 60 * 6 },
        { who: 'beak', body: 'The studio is booked until 17:30. Please be out by 17:15, the next band has a load-in.', minutesAgo: 60 * 5 },
        { who: 'tobi', body: 'Episode 13 mix is in review. The breath between the two jokes is right now.', minutesAgo: 60 * 20 },
      ] },
    ],
  },

  // 2 · A music video in pre-production: treatment, shots, locations in four permit states, money, a policy that expires soon, castings.
  {
    set: 'thekid', key: 'statics', owner: 'me', title: 'Static Bloom', format: 'Music Video', status: 'pre-production', visibility: 'team', accent: '#2980b9',
    startOffset: 3, endOffset: 16, budget: 6000,
    logline: 'A music video for Vesper Lane’s “Static Bloom”: one singer, a row of dead televisions, and a drum fill that switches every screen on at once.',
    brief: { genre: ['experimental'], tone: 'dark', audience: 'everyone', goal: ['online', 'portfolio'], target_runtime: 4, capture: 'cinema', locations: 'mixed', style: ['handheld'] },
    script: {
      title: 'Static Bloom — treatment', text: `INT. REHEARSAL ROOM - NIGHT

One bulb. VESPER (24) stands in front of a dead CRT television. Static crawls across the screen like frost.

VESPER
(to the lens, quiet)
Turn it on. Turn it on.

INT. TV REPAIR SHOP - DAY

Rows of old televisions, every screen full of snow. VESPER walks the aisle, the drum fill building under her steps.

EXT. RAIL OVERPASS - DUSK

Trucks pass under the camera. VESPER stops mid-span, one hand on the cold steel. Below, a freight car lights up with a field of static.

EXT. ALLEY BEHIND THE SHOP - NIGHT

Wet brick. A hundred dead sets stacked by the bins. VESPER pulls one free and carries it into the light, and the picture blooms.

INT. REHEARSAL ROOM - NIGHT

The bulb goes out. Every screen in the room comes on at once. VESPER, finally silent, lets the static sing.`,
        characters: [{ name: 'VESPER', full_name: 'Vesper Lane', age: '24', description: 'The singer. Talks to the screens like they owe her an answer.', color: '#2980b9' }],
      },
    refs: [
      { kind: 'image', title: 'Snow on a dead screen', url: pic(20), board: 'Mood', scenes: [1] },
      { kind: 'image', title: 'Rows of stacked televisions', url: pic(37), board: 'Production design', scenes: [2] },
      { kind: 'image', title: 'Overpass from below', url: pic(122), board: 'Locations', scenes: [3] },
      { kind: 'image', title: 'Wet brick, sodium light', url: pic(60), board: 'Lighting', scenes: [4] },
      { kind: 'link', title: 'Band’s one-page treatment notes', url: 'https://example.com/static-bloom/notes', board: 'Research' },
    ],
    crew: [
      { who: 'mara', craft: 'Director of photography', role: 'contributor' },
      { who: 'theo', craft: 'Gaffer', role: 'contributor' },
      { who: 'tobi', craft: 'Sound designer', role: 'contributor' },
      { who: 'owen', craft: 'Motion designer', role: 'viewer' },
    ],
    castings: [{ character: 'VESPER', who: 'lena' }],
    shots: [
      { scene: 1, shots: [
        { size: 'WS', movement: 'Static', lens: '24mm', desc: 'Vesper in front of the dead set, one bulb.' },
        { size: 'CU', movement: 'Slow push', lens: '85mm', desc: 'Her mouth on the first line, the static on her face.' },
      ] },
      { scene: 2, shots: [
        { size: 'MS', movement: 'Dolly', lens: '35mm', desc: 'Walking the aisle of televisions.' },
        { size: 'INS', movement: 'Static', lens: '100mm macro', desc: 'One screen, one channel of snow.' },
      ] },
      { scene: 3, shots: [{ size: 'EWS', angle: 'Low', movement: 'Crane up', lens: '24mm', desc: 'The overpass and the freight car lighting up below.' }] },
      { scene: 4, shots: [{ size: 'WS', movement: 'Handheld', lens: '40mm', desc: 'Carrying the set into the light; the picture blooms.' }] },
      { scene: 5, shots: [{ size: 'CU', angle: 'Top-down', movement: 'Crane down', lens: '35mm', desc: 'Every screen on at once, and the last line sung to the lens.' }] },
    ],
    locations: [
      { name: 'REHEARSAL ROOM', status: 'confirmed', permit: 'not_needed', address: '40 Ketch Ave, unit 3', cost: 300, notes: 'Friend’s rehearsal space. Two evenings.' },
      { name: 'TV REPAIR SHOP', status: 'option', permit: 'granted', address: '1180 Fictional Ave', contact: 'Ruth (owner)', notes: 'Sidewalk filming permit granted for the Friday. Shop lights off after 18:00.' },
      { name: 'RAIL OVERPASS', status: 'scouting', permit: 'applied', address: 'Overpass at 9th Ave', notes: 'Road closure applied for. Ten business days.' },
      { name: 'ALLEY BEHIND THE SHOP', status: 'scouting', permit: 'needed', address: 'Lane behind 1180 Fictional Ave', notes: 'Want the sodium light. Permit needed if we block the lane.' },
    ],
    budgetLines: [
      { category: 'Camera', amount: 1400, description: 'Camera and two primes' },
      { category: 'Lighting', amount: 900, description: 'Practicals and a generator' },
      { category: 'Art', amount: 700, description: 'Televisions, printed snow, dressing' },
      { category: 'Locations', amount: 600 },
      { category: 'Cast', amount: 500, description: 'Vesper, one day' },
      { category: 'Catering', amount: 400 },
    ],
    vendors: [
      { name: 'Prairie Lights Rental', category: 'Rentals', contact: 'hire@prairielights.example' },
      { name: 'Corner Print Co.', category: 'Art', contact: '403-555-0148' },
      { name: 'Night Owl Catering', category: 'Catering', contact: '403-555-0191' },
    ],
    expenses: [
      { line: 'Lighting', vendor: 'Prairie Lights Rental', description: 'Generator and tubes, deposit', amount: 300, status: 'committed', po: 'PO-0310', daysAgo: 1 },
      { line: 'Art', vendor: 'Corner Print Co.', description: 'Printed snow backdrop, 4 metres', amount: 180, status: 'paid', daysAgo: 3 },
      { line: 'Locations', description: 'Option fee, TV repair shop', amount: 100, status: 'paid', daysAgo: 5 },
    ],
    documents: [
      { kind: 'insurance', title: 'Liability insurance — two shoot days', status: 'done', party: 'Front Row Insurance', expiresOffset: 6, notes: 'Renews in six days. Send the new certificate to the shop.' },
      { kind: 'permit', title: 'Sidewalk filming permit — TV repair shop', status: 'done', location: 'TV REPAIR SHOP', party: 'City film office' },
      { kind: 'release', title: 'Appearance release — lena_brooks', status: 'pending', person: 'lena' },
    ],
    timeline: [
      { title: 'Treatment approved', type: 'milestone', status: 'completed', start: -9 },
      { title: 'Overpass closure answer', type: 'deadline', status: 'in-progress', start: 6 },
      { title: 'Shoot — one day', type: 'milestone', status: 'pending', start: 16 },
    ],
    tasks: [
      { title: 'Lock the treatment with Vesper', done: true, dueOffset: -4 },
      { title: 'Sidewalk permit for the TV shop', done: true },
      { title: 'Ask the overpass office about a closure', done: false, dueOffset: 3, who: 'me' },
      { title: 'Pick the drum-fill count with the band', done: false, dueOffset: 5, who: 'tobi' },
    ],
    channels: [
      { name: 'announcements', audience: 'team', topic: 'Static Bloom — the essentials.', messages: [
        { who: 'me', body: 'Treatment is locked and the shot list is in the Studio. Read scene 3 twice; it is the one that needs the overpass.', minutesAgo: 60 * 30 },
        { who: 'mara', body: 'Confirmed for the shop. I will bring two lights for the screen glow, not three.', minutesAgo: 60 * 5 },
      ] },
    ],
  },

  // 3 · A short film at the concept stage: beats, references, the brief's answers, two tasks. Private.
  {
    set: 'thekid', key: 'seconddraft', owner: 'me', title: 'Second Draft', format: 'Short Film', status: 'concept', visibility: 'private', accent: '#7f8c8d',
    logline: 'A ghostwriter who has written every line of a famous director’s breakup film tries to write her own ending.',
    brief: { genre: ['drama', 'comedy'], tone: 'satirical', audience: 'adults', goal: ['festivals'], structure: 'three_act', target_runtime: 12 },
    beats: [
      { title: 'The call', content: 'The director rings at midnight: the ending needs one more rewrite. Ruth says yes.', color: '#7f8c8d' },
      { title: 'Notes', content: 'Ruth reads twelve drafts of someone else’s heartbreak and finds her own in the margins.', color: '#e67e22' },
      { title: 'Second draft', content: 'She writes the ending she would have liked, at her kitchen table, with the wrong pen.', color: '#2980b9' },
      { title: 'Credit', content: 'The film opens. Her name is not on it. She is fine. Mostly.', color: '#27ae60' },
    ],
    refs: [
      { kind: 'image', title: 'Kitchen table, late', url: pic(49), board: 'Mood', notes: 'The second draft happens here.' },
      { kind: 'image', title: 'Pages under a lamp', url: pic(24), board: 'Mood' },
      { kind: 'image', title: 'Empty cinema row', url: pic(96), board: 'Locations' },
      { kind: 'link', title: 'Ghostwriters on screen — a reading list', url: 'https://example.com/second-draft/reading', board: 'Research' },
    ],
    tasks: [
      { title: 'Write the pitch in one line', done: true },
      { title: 'Find a location for the office scene', done: false, dueOffset: 14, who: 'me' },
    ],
  },

  // 4 · A documentary in post, shared by link: cuts with notes, post stages, festivals planned and submitted.
  {
    set: 'thekid', key: 'openmic', owner: 'me', title: 'Open Mic', format: 'Documentary', status: 'post-production', visibility: 'link', accent: '#6d4c41',
    startOffset: -180, endOffset: 60, budget: 22000,
    logline: 'Thirty years of Tuesday nights at a laundromat-turned-comedy room, told by the regulars who kept showing up.',
    brief: { genre: ['drama'], tone: 'light', audience: 'adults', goal: ['festivals', 'online'], target_runtime: 88, platforms: ['vimeo'] },
    crew: [
      { who: 'sasha', craft: 'Editor', role: 'contributor' },
      { who: 'tobi', craft: 'Sound designer', role: 'contributor' },
      { who: 'owen', craft: 'Motion designer', role: 'contributor' },
      { who: 'priyam', craft: 'Press', role: 'contributor' },
    ],
    cuts: [
      { title: 'Assembly, 104 min', url: 'https://example.com/open-mic/assembly', daysAgo: 30, notes: [
        { at: 1830, dept: 'edit', body: 'Cut the second host intro. The room already knows her.', by: 'me', resolved: true },
        { at: 2410, dept: 'sound', body: 'The room mic is too hot on the sign-up sheet. Pull it down three decibels.', by: 'tobi' },
      ] },
      { title: 'Cut 3, festival version', url: 'https://example.com/open-mic/cut-3', daysAgo: 3, notes: [
        { at: 620, dept: 'color', body: 'Interviews in the back booth look green. Match them to the window light.', by: 'me' },
        { at: 1310, dept: 'titles', body: 'Lower thirds: names and years only, no job titles.', by: 'owen' },
        { at: 2050, dept: 'edit', body: 'The closing montage runs ten seconds long.', by: 'me', resolved: true },
      ] },
    ],
    post: [
      { kind: 'stage', title: 'Picture edit', dept: 'edit', status: 'done', who: 'sasha' },
      { kind: 'stage', title: 'Sound edit and mix', dept: 'sound', status: 'in_progress', dueOffset: 10, who: 'tobi' },
      { kind: 'stage', title: 'Colour grade', dept: 'color', status: 'todo', dueOffset: 14 },
      { kind: 'stage', title: 'Titles and lower thirds', dept: 'titles', status: 'in_progress', dueOffset: 8, who: 'owen' },
      { kind: 'deliverable', title: 'Festival DCP (5.1)', status: 'todo', dueOffset: 40 },
      { kind: 'deliverable', title: 'Captions (EN)', status: 'todo', dueOffset: 30 },
      { kind: 'deliverable', title: 'Press kit (one page and stills)', status: 'in_progress', dueOffset: 20 },
    ],
    festivals: [
      { name: 'Harbourlight Doc Festival (fictional)', status: 'submitted', deadlineOffset: -6, notes: 'Submitted. Waiting on the list date.' },
      { name: 'Old Mill Festival (fictional)', status: 'submitted', deadlineOffset: -20 },
      { name: 'Prairie Docs Week (fictional)', status: 'planned', deadlineOffset: 18, notes: 'Early deadline passes next week.' },
      { name: 'Northwest Stories (fictional)', status: 'planned', deadlineOffset: 44 },
    ],
    budgetLines: [
      { category: 'Licences', amount: 3000, description: 'Archive and music' },
      { category: 'Post', amount: 6000, description: 'Colour, mix, titles' },
      { category: 'Festivals', amount: 800, description: 'Submission fees' },
    ],
    expenses: [
      { line: 'Post', description: 'Colour session, one day', amount: 1400, status: 'paid', daysAgo: 9 },
      { line: 'Festivals', description: 'Submission fees, two festivals', amount: 120, status: 'paid', daysAgo: 6 },
      { line: 'Licences', description: 'Licence deposit, closing song', amount: 450, status: 'committed', po: 'PO-0312', daysAgo: 1 },
    ],
    documents: [
      { kind: 'contract', title: 'Music licence — closing song', status: 'pending', party: 'Harbour Music Publishing (fictional)', expiresOffset: 25, notes: 'Quote in. Waiting on the territory list.' },
      { kind: 'release', title: 'Release — regular, interview three', status: 'needed', notes: 'She has agreed in person. Needs the form signed.' },
    ],
    tasks: [
      { title: 'Lock cut 3 for the festival list', done: true, dueOffset: -2 },
      { title: 'Get the closing-song licence in writing', done: false, dueOffset: 5, who: 'me' },
    ],
    timeline: [
      { title: 'Festival deadline — Prairie Docs Week', type: 'deadline', status: 'pending', start: 18 },
      { title: 'Picture lock', type: 'milestone', status: 'completed', start: -12 },
    ],
    channels: [
      { name: 'post', audience: 'team', topic: 'Cuts and notes.', messages: [
        { who: 'sasha', body: 'Cut 3 is up on the link. The first act finally moves.', minutesAgo: 60 * 30 },
        { who: 'tobi', body: 'Room tone is clean now. One hot spot on the sign-up sheet, fixing it today.', minutesAgo: 60 * 4 },
      ] },
    ],
  },

  // 5 · A finished commercial: campaigns wrapped, documents done, every expense paid, a portfolio piece.
  {
    set: 'thekid', key: 'corner', owner: 'me', title: 'Corner Store Coffee', format: 'Commercial', status: 'completed', visibility: 'team', accent: '#a0522d',
    startOffset: -60, endOffset: -10, budget: 4500,
    logline: 'A thirty-second spot for a neighbourhood coffee counter that wanted the first cup of the morning to look like a place you already know.',
    brief: { genre: ['comedy'], tone: 'light', audience: 'everyone', goal: ['online'], target_runtime: 1, platforms: ['youtube'] },
    script: {
      title: 'Corner Store Coffee — 30 s spot', text: `INT. COFFEE COUNTER - DAWN

A dark store. An espresso machine warms with a hiss. The BARISTA (30s) wipes the counter and does not look at the clock.

BARISTA
(to the empty room)
Morning. Doors open in ten.

EXT. CORNER STORE - DAWN

Steam on the glass. A CUSTOMER (50s) stops at the door, reads the chalkboard, and smiles before the door opens.

SUPER: Corner Store Coffee. Open at eight.

INT. COFFEE COUNTER - DAY

The first cup slides across the counter. The CUSTOMER takes it in both hands.

CUSTOMER
Same as yesterday.

BARISTA
I know.

SUPER: Corner Store Coffee. Same as yesterday.`,
      characters: [
        { name: 'BARISTA', description: 'Opens the store every morning. Knows the order before the door shuts.', color: '#a0522d' },
        { name: 'CUSTOMER', description: 'Regular, fifteen years. Says very little.', color: '#7f8c8d' },
      ],
      locked: 'Final cut (white)',
    },
    refs: [
      { kind: 'image', title: 'Counter, first light', url: pic(42), board: 'Mood', scenes: [1] },
      { kind: 'image', title: 'Chalkboard menu', url: pic(102), board: 'Production design', scenes: [2] },
    ],
    crew: [
      { who: 'mara', craft: 'Director of photography', role: 'contributor' },
      { who: 'theo', craft: 'Gaffer', role: 'contributor' },
      { who: 'owen', craft: 'Motion designer', role: 'contributor' },
    ],
    castings: [{ character: 'BARISTA', who: 'ines' }, { character: 'CUSTOMER', who: 'kofi' }],
    wrapped: [1, 2, 3],
    shots: [
      { scene: 1, shots: [{ size: 'MS', movement: 'Static', lens: '35mm', desc: 'The barista at the counter, the machine warming.', status: 'shot' }] },
      { scene: 3, shots: [{ size: 'CU', movement: 'Static', lens: '85mm', desc: 'The cup on the counter, both hands.', status: 'shot' }] },
    ],
    locations: [
      { name: 'COFFEE COUNTER', status: 'confirmed', permit: 'not_needed', address: '1190 Fictional Ave', contact: 'Store owner', cost: 500, notes: 'Shot before opening. Out by 07:55.' },
      { name: 'CORNER STORE', status: 'confirmed', permit: 'granted', address: 'Sidewalk outside 1190 Fictional Ave', notes: 'Sidewalk permit covered the one morning.' },
    ],
    budgetLines: [
      { category: 'Camera', amount: 1100, description: 'Camera package, one day' },
      { category: 'Lighting', amount: 420 },
      { category: 'Catering', amount: 260, description: 'Crew breakfast' },
      { category: 'Talent', amount: 800, description: 'Two performers' },
      { category: 'Post', amount: 1500, description: 'Grade, mix, cut-downs' },
    ],
    vendors: [
      { name: 'Eastgate Camera Hire', category: 'Rentals', contact: 'hire@eastgate.example' },
      { name: 'Night Owl Catering', category: 'Catering', contact: '403-555-0191' },
    ],
    expenses: [
      { line: 'Camera', vendor: 'Eastgate Camera Hire', description: 'Camera package, one day', amount: 1100, status: 'paid', po: 'PO-0118', daysAgo: 31 },
      { line: 'Lighting', description: 'Practical lamps and a dimmer', amount: 420, status: 'paid', daysAgo: 31 },
      { line: 'Catering', vendor: 'Night Owl Catering', description: 'Crew breakfast, one shoot day', amount: 260, status: 'paid', daysAgo: 31 },
    ],
    documents: [
      { kind: 'release', title: 'Appearance release — ines_duarte', status: 'done', person: 'ines' },
      { kind: 'release', title: 'Appearance release — kofi_mensah', status: 'done', person: 'kofi' },
      { kind: 'contract', title: 'Location agreement — the counter', status: 'done', location: 'COFFEE COUNTER', party: 'Store owner' },
      { kind: 'insurance', title: 'General liability — one shoot day', status: 'done', party: 'Front Row Insurance' },
    ],
    schedule: [
      {
        day: 1, offset: -31, scenes: [1, 2, 3], general: '06:00', shooting: '07:00', wrap: '07:55',
        address: '1190 Fictional Ave', weather: 'Clear, -4°C', notes: 'Store opens at eight. We are out by 07:55.',
        issue: { note: 'One morning, three set-ups. Keep it quiet until the first cup is poured.' }, acks: ['mara', 'theo', 'owen'],
        calls: [
          { who: 'mara', role: 'Director of photography', time: '05:30' },
          { who: 'theo', role: 'Gaffer', time: '05:30' },
          { who: 'owen', role: 'Motion graphics artist', time: '06:30', remarks: 'End card, shot after the last take' },
          { character: 'BARISTA', time: '06:00' },
          { character: 'CUSTOMER', time: '06:15' },
        ],
      },
    ],
    timesheets: [
      { who: 'mara', daysAgo: 31, hours: 11, status: 'approved', rate: 55 },
      { who: 'theo', daysAgo: 31, hours: 12, status: 'approved', rate: 40 },
    ],
    post: [
      { kind: 'stage', title: 'Picture edit', dept: 'edit', status: 'done' },
      { kind: 'stage', title: 'Colour grade', dept: 'color', status: 'done' },
      { kind: 'stage', title: 'Sound mix', dept: 'sound', status: 'done' },
      { kind: 'stage', title: 'Titles and end card', dept: 'titles', status: 'done', who: 'owen' },
      { kind: 'deliverable', title: '30 s master (ProRes)', status: 'done' },
      { kind: 'deliverable', title: '15 s and 6 s cut-downs', status: 'done' },
      { kind: 'deliverable', title: 'In-store screen loop', status: 'done' },
    ],
    campaigns: [
      { title: 'Launch — 30 s spot', platform: 'YouTube', status: 'wrapped', reach: '48,000', demographic: 'Local coffee drinkers, 25–55', budget: 900, spend: 880, start: -45, end: -20 },
      { title: 'Cut-downs for social', platform: 'Social', status: 'wrapped', reach: '22,000', budget: 300, spend: 300, start: -40, end: -25 },
      { title: 'In-store screen loop', platform: 'In-store', status: 'wrapped', reach: 'about 140 visits a day', budget: 200, spend: 190, start: -44, end: -10 },
    ],
    timeline: [
      { title: 'Pitch approved', type: 'milestone', status: 'completed', start: -60 },
      { title: 'Shoot — one morning', type: 'event', status: 'completed', start: -31 },
      { title: 'Launch', type: 'milestone', status: 'completed', start: -45 },
    ],
    tasks: [
      { title: 'Send the final cut to the store owner', done: true },
      { title: 'Close the PO for the camera hire', done: true },
    ],
    portfolio: {
      title: 'Corner Store Coffee', description: 'A thirty-second spot shot in one dawn for a neighbourhood counter.', category: 'Commercial', year: 2026, role: 'Director',
      blocks: [
        { type: 'cover', title: 'Corner Store Coffee', image: pic(42) },
        { type: 'text', title: 'The brief', body: 'Make the first cup feel like a place you already know.' },
      ],
    },
    channels: [
      { name: 'announcements', audience: 'team', topic: 'The spot, end to end.', messages: [
        { who: 'me', body: 'Final cut is with the store. Thank you all for the 05:30 starts. The counter looks better than the storyboard.', minutesAgo: 60 * 24 * 20 },
      ] },
    ],
  },

  // 6 · A feature in production where 'me' is crew: sound designer. Shots, call times, tasks, expenses and post as the role sees them.
  {
    set: 'thekid', key: 'understudy', owner: 'noor', title: 'The Understudy', format: 'Feature', status: 'production', visibility: 'team', accent: '#34495e',
    startOffset: -20, endOffset: 25, budget: 90000,
    logline: 'A stage actor who has never had a line in the spotlight gets one night to play the lead, and the theatre in the rain is the only audience she has.',
    brief: { genre: ['drama'], tone: 'grounded', era: 'contemporary', audience: 'adults', goal: ['festivals'], structure: 'three_act', target_runtime: 96 },
    script: {
      title: 'The Understudy — shooting script', text: `FADE IN:

INT. EMPTY THEATRE - NIGHT

A stage under one work light. DANA (34), in a borrowed coat, runs her lines to the empty seats.

DANA
(to the seats)
I was never supposed to be here.

EXT. STAGE DOOR - NIGHT

Rain. MARCUS (58), the lead, leans on the brick with a cigarette he will not light.

MARCUS
Tonight you are the lead. Don’t make me regret the rehearsal.

INT. DRESSING ROOM - NIGHT

Dana in the mirror. The costume is too big at the shoulders. She takes a breath.

DANA
Places, then.`,
      characters: [
        { name: 'DANA', full_name: 'Dana Whitcombe', age: '34', description: 'Understudy for eleven months. Knows every line and no spotlight.', color: '#34495e' },
        { name: 'MARCUS', full_name: 'Marcus Hale', age: '58', description: 'The lead. Has done this part for twenty years.', color: '#7f8c8d' },
      ],
      locked: 'Shooting script (white)',
    },
    refs: [
      { kind: 'image', title: 'Work light on a bare stage', url: pic(15), board: 'Lighting', scenes: [1] },
      { kind: 'image', title: 'Stage door in rain', url: pic(146), board: 'Locations', scenes: [2] },
    ],
    crew: [
      { who: 'me', craft: 'Sound designer', role: 'contributor' },
      { who: 'mara', craft: 'Director of photography', role: 'lead' },
      { who: 'june', craft: 'Production sound mixer', role: 'contributor' },
    ],
    castings: [{ character: 'DANA', who: 'ines' }, { character: 'MARCUS', who: 'kofi' }],
    wrapped: [1, 2],
    shots: [
      { scene: 1, shots: [
        { size: 'WS', movement: 'Static', lens: '24mm', desc: 'The empty house, one work light, Dana at the lip of the stage.', status: 'shot' },
        { size: 'MCU', movement: 'Slow push', lens: '65mm', desc: 'Dana’s first line to the seats.', status: 'shot' },
      ] },
      { scene: 3, shots: [{ size: 'MS', movement: 'Static', lens: '40mm', desc: 'Dana in the mirror, costume too big.', status: 'planned' }] },
    ],
    schedule: [
      {
        day: 1, offset: -6, scenes: [1, 2], general: '07:00', shooting: '08:00', wrap: '19:00',
        address: 'Harlow Theatre, Fictional St', weather: 'Rain, 8°C', issue: {}, acks: ['mara', 'june'],
        calls: [
          { who: 'mara', role: 'Director of photography', time: '06:30' },
          { who: 'me', role: 'Sound designer', time: '07:00', remarks: 'Radio mic check at the stage door first' },
          { who: 'june', role: 'Production sound mixer', time: '06:45' },
          { character: 'DANA', time: '07:30' },
          { character: 'MARCUS', time: '17:00' },
        ],
      },
      {
        day: 2, offset: 1, scenes: [3], general: '13:00', shooting: '14:00', wrap: '18:00',
        address: 'Harlow Theatre, dressing room', weather: 'Indoors', notes: 'Bring the empty-house tone recorder. Tone for 5 minutes, all four walls.',
        issue: { note: 'Dressing room, one scene. Quiet set.' }, acks: ['june'],
        calls: [
          { who: 'me', role: 'Sound designer', time: '13:00' },
          { who: 'june', role: 'Production sound mixer', time: '13:00' },
          { character: 'DANA', time: '13:30', remarks: 'Wardrobe first' },
        ],
      },
    ],
    timesheets: [
      { who: 'me', daysAgo: 6, hours: 10, status: 'approved', rate: 45, note: 'Empty-house tone and the radio pass' },
      { who: 'me', daysAgo: 1, hours: 6, status: 'submitted', note: 'Foley prep' },
    ],
    tasks: [
      { title: 'Record the empty-house tone at the theatre', done: false, dueOffset: 3, who: 'me' },
      { title: 'Send the sound report to Noor', done: true, who: 'me' },
      { title: 'Book the Foley stage for one day', done: false, dueOffset: 9, who: 'me' },
    ],
    budgetLines: [
      { category: 'Camera', amount: 30000 },
      { category: 'Sound', amount: 900, description: 'Recorders, Foley and sound design' },
      { category: 'Cast', amount: 20000 },
    ],
    vendors: [{ name: 'Harmon Sound Hire', category: 'Sound', contact: 'bookings@harmonsound.example' }],
    expenses: [
      { line: 'Sound', vendor: 'Harmon Sound Hire', description: 'Field recorder rental, two weeks', amount: 210, status: 'paid', daysAgo: 9 },
      { line: 'Sound', description: 'Foley session, one day (studio hire)', amount: 380, status: 'committed', po: 'PO-0340', daysAgo: 2 },
    ],
    documents: [
      { kind: 'contract', title: 'Sound crew deal memo — me', status: 'done', person: 'me' },
      { kind: 'release', title: 'Appearance release — ines_duarte', status: 'done', person: 'ines' },
    ],
    post: [
      { kind: 'stage', title: 'Sound design', dept: 'sound', status: 'in_progress', dueOffset: 14, who: 'me' },
      { kind: 'stage', title: 'Picture edit', dept: 'edit', status: 'in_progress', dueOffset: 20, who: 'sasha' },
      { kind: 'deliverable', title: 'Stereo print mix', status: 'todo', dueOffset: 30 },
    ],
    channels: [
      { name: 'sound', audience: 'team', topic: 'Tone, Foley and the radio pass.', messages: [
        { who: 'june', body: 'Tone from day one is clean. The stage door has a buzz at 22:00; bringing a notch filter.', minutesAgo: 60 * 26 },
        { who: 'me', body: 'Foley booked for one day, the studio on Ash Lane. I’ll send the cue list tonight.', minutesAgo: 60 * 3 },
      ] },
    ],
  },

  // 7 · A short film in pre-production owned by a sample person, where 'me' is the line producer. Calls, permits, money, tasks.
  {
    set: 'thekid', key: 'lowtide', owner: 'lena', title: 'Low Tide', format: 'Short Film', status: 'pre-production', visibility: 'team', accent: '#16a085',
    startOffset: 2, endOffset: 22, budget: 6000,
    logline: 'A woman walks out across the tidal flats each morning to the place her father used to fish, and on the last low tide she brings a second cup.',
    brief: { genre: ['drama'], tone: 'grounded', era: 'contemporary', audience: 'adults', goal: ['festivals'], structure: 'three_act', target_runtime: 12 },
    script: {
      title: 'Low Tide — shooting draft', text: `FADE IN:

EXT. TIDAL FLATS - DAWN

Grey mud, grey sky. MAE (28) walks out across the flats with an empty bucket, a long way from the shore.

INT. FISH SHED - DAY

Nets hang from the rafters. JOSS (60s) mends one by hand and does not look up.

JOSS
The tide turns at nine. You know the rule.

EXT. OLD PIER - DUSK

Mae sits on the end of the pier. The water comes back over the flats, slow, and fills her footprints.

INT. KITCHEN - NIGHT

A single lamp. Mae sets two cups on the table. Only one is used.

MAE
Low water is at seven. I’ll be there.`,
      characters: [
        { name: 'MAE', full_name: 'Mae Doran', age: '28', description: 'Walks the flats every morning. Still counts the tide.', color: '#16a085' },
        { name: 'JOSS', full_name: 'Joss Doran', age: '60s', description: 'Mae’s father. Mends nets and says the one thing.', color: '#7f8c8d' },
      ],
    },
    refs: [
      { kind: 'image', title: 'Flats at first light', url: pic(47), board: 'Locations', scenes: [1] },
      { kind: 'image', title: 'Net shed, afternoon', url: pic(68), board: 'Production design', scenes: [2] },
    ],
    crew: [
      { who: 'me', craft: 'Line producer', role: 'lead' },
      { who: 'mara', craft: 'Director of photography', role: 'contributor' },
      { who: 'rafael', craft: 'Production designer', role: 'contributor' },
      { who: 'june', craft: 'Production sound mixer', role: 'viewer' },
    ],
    castings: [{ character: 'MAE', who: 'lena' }, { character: 'JOSS', who: 'kofi' }],
    schedule: [
      {
        day: 1, offset: 18, scenes: [1], general: '05:30', shooting: '06:30', wrap: '12:00',
        address: 'Tidal flats, south access road', weather: 'Forecast: fog, 6°C',
        notes: 'Low water 07:12. Everything has to be on the flats before the tide turns at 09:00.',
        calls: [
          { who: 'me', role: 'Line producer', time: '04:45' },
          { who: 'mara', role: 'Director of photography', time: '05:00' },
          { character: 'MAE', time: '05:30' },
        ],
      },
    ],
    locations: [
      { name: 'TIDAL FLATS', status: 'scouting', permit: 'applied', address: 'South access road, Fictional Bay', contact: 'Foreshore office', notes: 'Only works at low water. Two windows: 07:12 and the next morning.' },
      { name: 'FISH SHED', status: 'option', permit: 'not_needed', address: 'Pier road, shed 4', contact: 'Owner, Joss Doran (fictional)', cost: 150, notes: 'Owner is happy to let us use it for the day.' },
      { name: 'OLD PIER', status: 'confirmed', permit: 'granted', address: 'Old pier, Fictional Bay', notes: 'Harbour authority granted two days.' },
      { name: 'KITCHEN', status: 'scouting', permit: 'unknown', notes: 'Private house. Need a yes from the family first.' },
    ],
    budgetLines: [
      { category: 'Locations', amount: 1200, description: 'Shed, permits, the flats' },
      { category: 'Camera', amount: 2200 },
      { category: 'Art', amount: 600, description: 'Driftwood, rope, buckets' },
      { category: 'Crew', amount: 800 },
      { category: 'Cast', amount: 500 },
    ],
    vendors: [
      { name: 'Foreshore office', category: 'Permits', contact: 'foreshore@fictionalbay.example' },
      { name: 'Salt and Rope Props', category: 'Art', contact: '403-555-0133' },
    ],
    expenses: [
      { line: 'Locations', vendor: 'Foreshore office', description: 'Foreshore permit application fee', amount: 145, status: 'paid', daysAgo: 4 },
      { line: 'Art', vendor: 'Salt and Rope Props', description: 'Driftwood and rope, props', amount: 90, status: 'committed', daysAgo: 1 },
    ],
    documents: [
      { kind: 'permit', title: 'Foreshore filming permit', status: 'pending', location: 'TIDAL FLATS', party: 'Foreshore office', notes: 'Application in. Decision due in nine days.' },
      { kind: 'insurance', title: 'Public liability — one shoot day', status: 'pending', party: 'Front Row Insurance', notes: 'Needs the permit number first.' },
      { kind: 'release', title: 'Appearance release — lena_brooks', status: 'done', person: 'lena' },
    ],
    jobs: [
      {
        key: 'pa-tide', title: 'Production assistant — one day at low water', role: 'Production assistant', status: 'open', rate: 150, rateType: 'fixed',
        description: 'Early start on the flats. Carry, count, keep the crew off the mud. Meals and credit.',
        applicants: [{ who: 'beak', note: 'I can do an early start and I have my own boots and a 4x4.', status: 'pending', daysAgo: 1 }],
      },
    ],
    tasks: [
      { title: 'Get the foreshore permit', done: false, dueOffset: 9, who: 'me' },
      { title: 'Book a 4x4 for the flats', done: false, dueOffset: 12, who: 'me' },
      { title: 'Cast JOSS (the father)', done: false, dueOffset: 7 },
    ],
    timeline: [
      { title: 'Tide-table scout, both low waters', type: 'task', status: 'completed', start: -3 },
      { title: 'Foreshore permit decision', type: 'deadline', status: 'in-progress', start: 9 },
      { title: 'Shoot — one day at low water', type: 'milestone', status: 'pending', start: 18 },
    ],
    channels: [
      { name: 'production', audience: 'team', topic: 'Tide, permits and the day.', messages: [
        { who: 'me', body: 'Low water is 07:12 on the shoot day. I have sent the tide table to everyone. Be on the road by 04:30.', minutesAgo: 60 * 8 },
        { who: 'mara', body: 'Fog forecast is the good kind. We will get the light for the first hour.', minutesAgo: 60 * 2 },
      ] },
    ],
  },

  // 8 · A web series in post owned by a sample person, where 'me' is a viewer: cuts with notes, post stages, one campaign.
  {
    set: 'thekid', key: 'fourwalls', owner: 'sasha', title: 'Four Walls', format: 'Web Series', status: 'post-production', visibility: 'team', accent: '#c0392b',
    startOffset: -90, endOffset: 30, budget: 15000,
    logline: 'Two neighbours in a shared building talk through the wall for six episodes, and then meet at the back gate.',
    brief: { genre: ['comedy', 'drama'], tone: 'light', audience: 'adults', goal: ['online'], target_runtime: 8, platforms: ['youtube', 'social'] },
    script: {
      title: 'Four Walls — episode 3', text: `EPISODE 3 — THE KNOCK

INT. FLAT 4B - NIGHT

Three knocks on the wall. RUTH (30s) freezes, a mug halfway to her mouth. The knock comes again, from the other side.

RUTH
(through the wall)
Arlo? Is that you?

INT. FLAT 4A - NIGHT

ARLO (30s) sits against his own wall with headphones on, tapping back.

ARLO
(to nobody)
Four walls. One conversation. Good.

EXT. ALLEY - NIGHT

Rain on the bins. Ruth and Arlo meet at the back gate for the first time, two umbrellas, one bag of rubbish each.

RUTH
You knock like a man who owns a drum kit.`,
      characters: [
        { name: 'RUTH', age: '30s', description: 'Freelance translator. Talks to the wall because it listens.', color: '#c0392b' },
        { name: 'ARLO', age: '30s', description: 'Drummer on nights. Never has the right kind of quiet.', color: '#2980b9' },
      ],
    },
    refs: [
      { kind: 'image', title: 'Wall with a crack of light', url: pic(180), board: 'Mood' },
      { kind: 'image', title: 'Back gate, rain', url: pic(160), board: 'Locations', scenes: [3] },
    ],
    crew: [
      { who: 'mara', craft: 'Director of photography', role: 'contributor' },
      { who: 'june', craft: 'Production sound mixer', role: 'contributor' },
      { who: 'owen', craft: 'Motion designer', role: 'contributor' },
      { who: 'me', craft: 'Multi-hyphenate', role: 'viewer' },
    ],
    castings: [{ character: 'RUTH', who: 'lena' }, { character: 'ARLO', who: 'kofi' }],
    wrapped: [1, 2, 3],
    shots: [
      { scene: 1, shots: [{ size: 'MCU', movement: 'Static', lens: '50mm', desc: 'Ruth, the mug, the knock.', status: 'shot' }] },
      { scene: 3, shots: [{ size: 'WS', movement: 'Handheld', lens: '35mm', desc: 'The two umbrellas at the back gate.', status: 'shot' }] },
    ],
    cuts: [
      { title: 'Episode 3 — assembly', url: 'https://example.com/four-walls/ep3-assembly', daysAgo: 6, notes: [
        { at: 95, dept: 'edit', body: 'The cold open is slow. Start on the knock.', by: 'me' },
        { at: 412, dept: 'sound', body: 'Rain on the bins is too loud under Arlo’s line.', by: 'june', resolved: true },
      ] },
    ],
    post: [
      { kind: 'stage', title: 'Picture edit, episodes 3 to 6', dept: 'edit', status: 'in_progress', dueOffset: 12, who: 'sasha' },
      { kind: 'stage', title: 'Sound design and mix', dept: 'sound', status: 'todo', dueOffset: 18 },
      { kind: 'stage', title: 'Colour grade', dept: 'color', status: 'todo', dueOffset: 22 },
      { kind: 'deliverable', title: 'Vertical cut-downs (9:16)', status: 'in_progress', dueOffset: 25 },
      { kind: 'deliverable', title: 'Episode 1 master (online)', status: 'done' },
    ],
    campaigns: [
      { title: 'Episode 1 premiere', platform: 'YouTube', status: 'drafting', reach: '8,000', demographic: 'Renters, 25–34', budget: 200, start: 12, end: 19 },
    ],
    budgetLines: [{ category: 'Post', amount: 2000, description: 'Edit, sound, grade' }, { category: 'Festivals', amount: 400 }],
    tasks: [
      { title: 'Lock episode 3 for the release list', done: false, dueOffset: 5 },
      { title: 'Turn episode 1 into nine vertical clips', done: true },
    ],
    channels: [
      { name: 'post', audience: 'team', topic: 'Cuts and notes.', messages: [
        { who: 'sasha', body: 'Episode 3 assembly is up on the link. The knock works. The cold open still needs a trim.', minutesAgo: 60 * 24 * 5 },
        { who: 'june', body: 'Rain on the bins is fixed in the next pass.', minutesAgo: 60 * 24 * 2 },
      ] },
    ],
  },
];
