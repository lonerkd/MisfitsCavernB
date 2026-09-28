// The guide steps: one library every workflow draws from. A step ticks itself
// when the project's data shows the work is done (a milestone from
// lib/os/progress, or its own check); the rest are ticked by hand. Each step
// carries text for every depth — `do` is the checklist line, `tip` the one
// thing worth knowing, and `why` / `how` / `watch` the full walkthrough.
// `learn` steps are the basics, shown only to those who asked to be walked
// through. Hours are the effort for a short with a few friends and some
// experience; workflows override them and the engine scales them.

import type { Phase } from '@/lib/os/phases';
import type { Place, ProjectSignals } from '@/lib/os/progress';
import type { Team } from './profile';

export interface StepText {
  do: string;
  tip: string;
  why: string;
  how: string[];
  watch?: string;
}

/** A crew member's department, as far as the guide cares. */
export type Dept = 'direction' | 'production' | 'writing' | 'camera' | 'sound' | 'art' | 'performer' | 'post' | 'other';

export interface StepDef {
  id: string;
  phase: Phase;
  title: string;
  place: Place;
  hours: number;
  /** Ticks itself when this milestone (lib/os/progress) is done. */
  milestone?: string;
  /** Ticks itself when this is true of the project. */
  auto?: (s: ProjectSignals) => boolean;
  /** The basics — shown only at walkthrough depth. */
  learn?: boolean;
  /** Only for these team sizes. */
  teams?: Team[];
  /** Only for crew in these departments (on-the-crew steps). */
  depts?: Dept[];
  text: StepText;
}

const editor: Place = { kind: 'path', path: '/editor' };
const studio = (tab: 'library' | 'scenes' | 'post' | 'promos' | 'pitch' | 'share'): Place => ({ kind: 'studio', tab });
const view = (v: 'story' | 'breakdown' | 'readiness' | 'locations' | 'money' | 'paperwork' | 'schedule' | 'onset' | 'crew'): Place =>
  ({ kind: 'studio', tab: 'production', view: v });
const hub = (anchor?: 'logline' | 'production' | 'brief' | 'guide'): Place => ({ kind: 'hub', anchor });

const S: StepDef[] = [
  // ── Development ────────────────────────────────────────────────
  { id: 'learn-phases', phase: 'development', title: 'See how a project moves', place: hub(), hours: 0.5, learn: true, text: {
    do: 'Read the five phases on this page, top to bottom.',
    tip: 'You never have to finish a phase to peek at the next one.',
    why: 'Every film goes development → pre-production → production → post → delivery. Knowing what’s coming stops you doing work too early (budgets before a script) or too late (releases after the shoot).',
    how: ['Look at the phase bar at the top of the project.', 'Each phase lists milestones; they tick themselves from your work.', 'Tools open as you reach their phase — or earlier once you start using them.'],
  } },
  { id: 'scope', phase: 'development', title: 'Keep it small enough to finish', place: hub('brief'), hours: 1, text: {
    do: 'Pick an idea you can shoot in one or two locations with three people or fewer.',
    tip: 'A finished five-minute film beats an unfinished twenty-minute one, every time.',
    why: 'Most first films die in production, not in writing: too many locations, too many actors, too many nights. Scope is the one decision that makes everything after it easier.',
    how: ['Aim for 3–10 minutes on screen (3–10 script pages).', 'Count locations: one or two, ideally places you already have.', 'Count speaking parts: two or three.', 'Prefer day to night and inside to outside.'],
    watch: 'Crowds, cars, weather, animals, children and period settings each multiply the work.',
  } },
  { id: 'logline', phase: 'development', title: 'Write the logline', place: hub('logline'), hours: 1, milestone: 'logline', text: {
    do: 'Say the story in a sentence or two.',
    tip: 'Who wants what, what stands in the way, and what’s at stake.',
    why: 'The logline is the test of the idea. If it won’t fit in a sentence it isn’t clear yet — and it leads your pitch deck and share page.',
    how: ['Name the character by what makes them interesting, not their name.', 'Give them a goal and an obstacle.', 'Add the stakes or the twist.', 'Read it aloud to someone; ask them what the film is about.'],
  } },
  { id: 'brief', phase: 'development', title: 'Answer the brief', place: hub('brief'), hours: 0.5, text: {
    do: 'Pick genre, tone, runtime and goal in the brief below.',
    tip: 'These are choices, not essays — they tune the roles, breakdown and pace the suite suggests.',
    why: 'The brief tells every tool what kind of project this is, so its suggestions fit — crew to hire, what to watch for in the breakdown, how many pages a day to plan.',
    how: ['Open the brief on this page.', 'Answer this phase’s questions; the rest come later.', 'Change them any time.'],
  } },
  { id: 'references', phase: 'development', title: 'Gather five references', place: studio('library'), hours: 2, milestone: 'references', text: {
    do: 'Collect images, clips and links for the look and feel.',
    tip: 'Five strong references say more than fifty loose ones.',
    why: 'References are how you’ll explain the film to everyone who helps make it — the look, the light, the mood — faster than words.',
    how: ['Upload stills or paste links in the Library.', 'Group them on a mood board.', 'Link the best ones to scenes once you have a script.'],
  } },
  { id: 'beats', phase: 'development', title: 'Outline the story', place: view('story'), hours: 3, milestone: 'beats', text: {
    do: 'Lay out the big moments on the beat board.',
    tip: 'Outline before you write: fixing a beat takes minutes, fixing a draft takes days.',
    why: 'The outline is the spine. With it, writing is filling in; without it, drafts wander.',
    how: ['Beginning: who, where, and what’s wrong.', 'Middle: the attempt, the complications, the low point.', 'End: the choice and what it costs.'],
  } },
  { id: 'learn-format', phase: 'development', title: 'Learn the page', place: editor, hours: 1, learn: true, text: {
    do: 'Try scene headings, action and dialogue in the editor.',
    tip: 'One page is about a minute on screen.',
    why: 'Format isn’t decoration: everyone downstream — schedule, budget, breakdown — reads the script’s structure. The editor does the formatting; you learn what each part is for.',
    how: ['A scene heading: INT. or EXT., the place, then DAY or NIGHT.', 'Action: what we see, in the present tense.', 'A character name in caps, then their dialogue.', 'Each new heading becomes a scene in Studio.'],
  } },
  { id: 'script', phase: 'development', title: 'Start the script', place: editor, hours: 3, milestone: 'script', text: {
    do: 'Open the editor and write the first scene.',
    tip: 'Write the scene you can see most clearly first — order comes later.',
    why: 'Everything else in the suite — scenes, breakdown, schedule, budget — grows from the script.',
    how: ['Create the script from the editor.', 'Start with a scene heading.', 'Write badly and quickly; rewriting is where it gets good.'],
  } },
  { id: 'characters', phase: 'development', title: 'Build your characters', place: editor, hours: 2, milestone: 'characters', text: {
    do: 'Add each main character: who they are and what they want.',
    tip: 'What they want and what they need should pull in different directions.',
    why: 'Characters drive casting, wardrobe and performance notes later. Knowing their want and need keeps their scenes honest.',
    how: ['Open the Characters panel in the editor.', 'Give each a want (outer goal) and a need (inner change).', 'Note how they speak — it helps the actor later.'],
  } },
  { id: 'draft', phase: 'development', title: 'Finish a full draft', place: editor, hours: 10, text: {
    do: 'Write to FADE OUT.',
    tip: 'Don’t rewrite while drafting. Finish, then fix.',
    why: 'A finished draft is the first real milestone of any film. Until then, nothing downstream can be planned.',
    how: ['Set a daily page count and keep it.', 'Leave notes like [FIX] instead of stopping.', 'Check the runtime estimate as you go.'],
    watch: 'If the runtime estimate runs far past your target, cut scenes now, not in the edit.',
  } },
  { id: 'table-read', phase: 'development', title: 'Hold a table read', place: editor, hours: 2, teams: ['small', 'crew'], text: {
    do: 'Have people read the script aloud; listen.',
    tip: 'Don’t read a part yourself — listen and take notes.',
    why: 'Hearing it is the fastest way to find flat dialogue, confusing moments and scenes that run long.',
    how: ['Invite readers to the project’s channel with the script.', 'Have someone read the action lines.', 'Note where people laugh, lose track or check their phones.'],
  } },
  { id: 'rewrite', phase: 'development', title: 'Rewrite', place: editor, hours: 6, text: {
    do: 'Make a second pass with what you learned.',
    tip: 'Cut first. The scene you love most is often the one to lose.',
    why: 'Films are rewritten, not written. A rewrite before pre-production is the cheapest fix you’ll ever make.',
    how: ['Start with structure: order and what’s missing.', 'Then scenes: enter late, leave early.', 'Then dialogue: fewer words.'],
  } },
  { id: 'pitch', phase: 'development', title: 'Make a pitch deck', place: studio('pitch'), hours: 3, text: {
    do: 'Put the logline, look and team into a deck.',
    tip: 'Ten slides, mostly images.',
    why: 'A deck is how you bring in collaborators, money and cast — it shows you know the film you’re making.',
    how: ['Open Studio › Pitch.', 'Lead with the logline and one striking image.', 'Add tone references, characters, and why you.'],
  } },
  { id: 'financing', phase: 'development', title: 'Find the money', place: hub('production'), hours: 20, text: {
    do: 'Decide how the film is paid for and start raising it.',
    tip: 'Raise against a budget, not a feeling: budget from the script first.',
    why: 'A feature needs money committed before pre-production, or the shoot stalls halfway.',
    how: ['Estimate a budget from the script.', 'List sources: savings, grants, investors, crowdfunding, in-kind favours.', 'Use the pitch deck and share page to ask.'],
    watch: 'Put every agreement in writing — Paperwork holds contracts.',
  } },
  { id: 'bible', phase: 'development', title: 'Write the series bible', place: editor, hours: 8, text: {
    do: 'Describe the world, the characters and where the show goes.',
    tip: 'Answer “what happens in episode 8?” and you have a series.',
    why: 'The bible is what buyers and co-writers read to know the show can run beyond its pilot.',
    how: ['The world and its rules.', 'Each main character and their arc across the season.', 'A line for every episode.'],
  } },
  { id: 'season', phase: 'development', title: 'Plan the season', place: view('story'), hours: 6, milestone: 'beats', text: {
    do: 'Outline every episode on the beat board.',
    tip: 'Each episode needs its own question, answered by its end.',
    why: 'Episodes share locations and cast — planning them together is how you shoot them together.',
    how: ['A beat per episode, then the beats inside the pilot.', 'Mark the season’s turning points.', 'Note which episodes share locations.'],
  } },
  { id: 'track', phase: 'development', title: 'Map the track', place: view('story'), hours: 2, milestone: 'beats', text: {
    do: 'Break the song into sections and give each an image.',
    tip: 'Cut to the music: the chorus is where the big images go.',
    why: 'In a music video the song is the script. Mapping it tells you how many setups you need and where the energy is.',
    how: ['Listen with timestamps: intro, verses, choruses, bridge, outro.', 'Put each section on the beat board.', 'Give each an idea, a place and a look.'],
  } },
  { id: 'treatment', phase: 'development', title: 'Write the treatment', place: editor, hours: 4, milestone: 'script', text: {
    do: 'Describe the video in prose, section by section.',
    tip: 'Lead with the one image that sells it.',
    why: 'The treatment is what the artist (or client) approves and what the crew plans from.',
    how: ['A paragraph on the concept and the look.', 'Section by section: what we see.', 'References from the Library alongside.'],
  } },
  { id: 'client-brief', phase: 'development', title: 'Pin down the brief', place: hub('brief'), hours: 2, text: {
    do: 'Write down what the client needs: message, audience, lengths, deadline.',
    tip: 'Ask for the “must-haves” in writing — logo, product shots, legal lines.',
    why: 'Commercials are judged against the brief. Getting it exact now avoids reshoots later.',
    how: ['Message and audience.', 'Deliverables: lengths (30s, 15s, 6s), ratios, platforms.', 'Budget and the delivery date.'],
  } },
  { id: 'approval', phase: 'development', title: 'Get the concept signed off', place: studio('pitch'), hours: 1, text: {
    do: 'Present the treatment and get a yes in writing.',
    tip: 'Agree how many rounds of changes are included.',
    why: 'Everything after this costs money; a signed-off concept protects both sides.',
    how: ['Share the pitch deck or share page.', 'Record the approval in Paperwork as a contract.'],
  } },
  { id: 'subjects', phase: 'development', title: 'Find your subjects', place: hub('production'), hours: 6, text: {
    do: 'Meet the people the film follows.',
    tip: 'Film is a relationship: meet without a camera first.',
    why: 'A documentary is only as good as the access and trust its subjects give it.',
    how: ['List who the film needs: the main subject, witnesses, experts.', 'Meet them; explain what you’re making.', 'Note what they’ll let you film, and when.'],
  } },
  { id: 'access', phase: 'development', title: 'Secure access and consent', place: view('paperwork'), hours: 3, text: {
    do: 'Get releases and location agreements before you film.',
    tip: 'Consent before the camera rolls — always.',
    why: 'Without signed releases you can’t show the film to anyone. With them, festivals and platforms can take it.',
    how: ['Add a release for each person in Paperwork.', 'Note any conditions they set.', 'Get agreements for private places.'],
  } },
  { id: 'show-format', phase: 'development', title: 'Shape the show', place: hub('brief'), hours: 2, text: {
    do: 'Decide the episode length, segments and how often it comes out.',
    tip: 'A regular schedule matters more than a long episode.',
    why: 'A podcast is a habit for its listeners. The format is the promise you make them.',
    how: ['Length and release rhythm (weekly, fortnightly).', 'Segments: intro, main, recurring bits, outro.', 'Solo, co-hosted or interviews.'],
  } },
  { id: 'guests', phase: 'development', title: 'Book your guests', place: { kind: 'path', path: '/lounge' }, hours: 3, text: {
    do: 'Invite the first few guests and set dates.',
    tip: 'Book three episodes ahead so one cancellation doesn’t stop the show.',
    why: 'Guests set the pace of an interview show; confirmed dates keep it moving.',
    how: ['List guests per episode.', 'Send a short invite: the show, the topic, the time it takes.', 'Confirm a date and how you’ll record.'],
  } },

  // ── Pre-production ─────────────────────────────────────────────
  { id: 'crew', phase: 'pre-production', title: 'Bring in your crew', place: hub('production'), hours: 4, milestone: 'crew', teams: ['small', 'crew'], text: {
    do: 'Invite collaborators to the project.',
    tip: 'Hire for the heads of department first: director of photography, sound, production design.',
    why: 'Your crew brings the craft you don’t have — and the right sound person saves more films than the right camera.',
    how: ['Invite people you know from the project page.', 'Give each their craft on the crew list.', 'Post roles you can’t fill to the Jobs board.'],
  } },
  { id: 'jobs', phase: 'pre-production', title: 'Post open roles', place: { kind: 'path', path: '/jobs' }, hours: 1, teams: ['small', 'crew'], text: {
    do: 'Post the roles you still need to the Jobs board.',
    tip: 'Say the dates, the pay (or that it’s unpaid) and what the film is.',
    why: 'People who aren’t in your circle yet are how films get made past the first one.',
    how: ['Open Jobs and post a role.', 'Link the project’s share page so people can see the work.', 'Accepted applicants join the crew.'],
  } },
  { id: 'casting', phase: 'pre-production', title: 'Cast your roles', place: view('crew'), hours: 6, milestone: 'casting', text: {
    do: 'Match every speaking character to a performer.',
    tip: 'Cast for chemistry: read pairs together.',
    why: 'Performance is the thing audiences forgive least. Casting is where you decide it.',
    how: ['Post casting calls from Cast & crew.', 'Audition with a scene from the script.', 'Cast the role; the performer joins the crew.'],
  } },
  { id: 'learn-breakdown', phase: 'pre-production', title: 'Learn what a breakdown is', place: view('breakdown'), hours: 0.5, learn: true, text: {
    do: 'Read how a breakdown turns the script into lists.',
    tip: 'If it’s in the script and it costs something, it goes in the breakdown.',
    why: 'The breakdown is how a script becomes a schedule and a budget: every prop, costume, vehicle and effect, scene by scene.',
    how: ['Each scene gets its elements tagged: cast, props, wardrobe, vehicles, effects.', 'The schedule groups scenes by location and cast.', 'The budget prices the elements.'],
  } },
  { id: 'breakdown', phase: 'pre-production', title: 'Break down the script', place: view('breakdown'), hours: 4, auto: (s) => s.breakdown_elements > 0, text: {
    do: 'Tag what each scene needs.',
    tip: 'Do it in one sitting — you’ll spot the same prop in five scenes.',
    why: 'Readiness, the schedule and the budget all read from the breakdown.',
    how: ['Switch the editor to breakdown mode, or use Studio › Breakdown.', 'Tag cast, props, wardrobe, locations and effects.', 'Check Readiness to see what each scene still needs.'],
  } },
  { id: 'revisions', phase: 'pre-production', title: 'Lock the shooting script', place: editor, hours: 1, auto: (s) => s.revisions > 0, teams: ['crew'], text: {
    do: 'Lock a draft so changes after it show as coloured pages.',
    tip: 'Lock once the heads of department start planning from it.',
    why: 'With a crew, everyone plans from the same pages. Locking stops scene numbers shifting under them.',
    how: ['Lock the draft from the editor.', 'Changes after it are marked revisions.', 'Send revised pages, not the whole script.'],
  } },
  { id: 'locations', phase: 'pre-production', title: 'Lock your locations', place: view('locations'), hours: 6, text: {
    do: 'Find, visit and confirm every location the script names.',
    tip: 'Visit at the time of day you’ll shoot — light and noise change everything.',
    why: 'Locations decide the schedule. An unconfirmed location is the most common reason a shoot day falls apart.',
    how: ['Studio › Locations lists every place the script names.', 'Scout: power, parking, noise, toilets, light.', 'Mark each confirmed and note if it needs a permit.'],
    watch: 'Public places usually need a permit; private ones need a signed agreement.',
  } },
  { id: 'learn-coverage', phase: 'pre-production', title: 'Learn coverage', place: studio('scenes'), hours: 0.5, learn: true, text: {
    do: 'Read how a scene is covered with a few shots.',
    tip: 'Wide, mediums, close-ups — and one shot that’s only yours.',
    why: 'The editor can only cut what you shot. Coverage is giving them choices without shooting everything.',
    how: ['A wide (master) to show where everyone is.', 'Mediums and close-ups for each speaker.', 'Inserts for details that matter.'],
  } },
  { id: 'shots', phase: 'pre-production', title: 'Plan your shots', place: studio('scenes'), hours: 6, milestone: 'shots', text: {
    do: 'Make a shot list for each scene.',
    tip: 'Number the shots you can’t lose; the rest are bonus.',
    why: 'The shot list is how you know a day is shootable — and what to drop when you run late.',
    how: ['Open each scene in Studio › Scenes.', 'Add shots: size, angle, movement.', 'Link references to show the look.'],
  } },
  { id: 'budget', phase: 'pre-production', title: 'Set a budget', place: hub('production'), hours: 3, milestone: 'budget', text: {
    do: 'Estimate the budget from the script, then adjust it.',
    tip: 'Keep 10% aside for what goes wrong.',
    why: 'A budget turns “can we afford this?” into lines you can say yes or no to.',
    how: ['Estimate from the script on the project page.', 'Adjust lines to real quotes.', 'Track spend in Studio › Money as you go.'],
    watch: 'Feed people well. Food is the cheapest way to keep a crew.',
  } },
  { id: 'schedule', phase: 'pre-production', title: 'Schedule the shoot', place: view('schedule'), hours: 3, milestone: 'schedule', text: {
    do: 'Group scenes into shoot days and date the first one.',
    tip: 'Shoot by location, not in script order.',
    why: 'A schedule is how many people know where to be and when. The call sheet comes from it.',
    how: ['Drag scenes onto shoot days on the stripboard.', 'Group by location, then by cast.', 'Date the day and issue its call sheet.'],
    watch: 'Plan fewer pages a day than you think. First days always run slow.',
  } },
  { id: 'paperwork', phase: 'pre-production', title: 'Sort the paperwork', place: view('paperwork'), hours: 3, text: {
    do: 'Releases for everyone on camera, permits, insurance, deal memos.',
    tip: 'Paperwork lists what’s still needed — work down that list.',
    why: 'Festivals, platforms and buyers ask for these. Missing a release can keep a finished film off every screen.',
    how: ['Open Studio › Paperwork; it lists what’s still needed.', 'One click adds each gap.', 'Upload the signed copies.'],
  } },
  { id: 'gear', phase: 'pre-production', title: 'Test your gear', place: view('onset'), hours: 2, text: {
    do: 'Shoot a test with the exact camera, lenses and sound kit.',
    tip: 'Test sound harder than picture.',
    why: 'Finding out a battery doesn’t charge on the shoot day costs you the day.',
    how: ['Record a minute of dialogue in a real room.', 'Check the files on a computer, not the camera screen.', 'Label batteries and cards.'],
  } },
  { id: 'rehearse', phase: 'pre-production', title: 'Rehearse', place: view('crew'), hours: 4, text: {
    do: 'Run the key scenes with your cast before the shoot.',
    tip: 'Rehearse the relationship, not the lines.',
    why: 'Rehearsal is cheap; takes are expensive. Actors arrive on set knowing what the scene is for.',
    how: ['Pick the hardest two or three scenes.', 'Talk about what each character wants in them.', 'Block roughly where people move.'],
  } },
  { id: 'test-record', phase: 'pre-production', title: 'Record a test', place: studio('library'), hours: 1, text: {
    do: 'Record ten minutes in your real space with your real kit.',
    tip: 'Soft rooms sound better: rugs, curtains, a sofa.',
    why: 'Listeners forgive a lot, but not bad audio.',
    how: ['Record every mic, even the guest’s.', 'Listen back on headphones and a phone speaker.', 'Fix echo and levels before episode one.'],
  } },

  // ── Production ─────────────────────────────────────────────────
  { id: 'learn-set', phase: 'production', title: 'Learn how a shoot day runs', place: view('onset'), hours: 0.5, learn: true, text: {
    do: 'Read the shape of a shoot day.',
    tip: 'Safety first, then sound, then the shot.',
    why: 'Sets run on a rhythm everyone knows. Knowing it lets you lead the day instead of chasing it.',
    how: ['Call time: everyone arrives; a short safety talk.', 'Block, light, rehearse, shoot — for every setup.', 'Wrap on time; back up the footage before anyone goes home.'],
  } },
  { id: 'wrap-first', phase: 'production', title: 'Wrap your first scene', place: view('onset'), hours: 8, milestone: 'wrap-first', text: {
    do: 'Shoot and mark your first scene wrapped.',
    tip: 'Get the shots you can’t lose first.',
    why: 'The first wrapped scene proves the plan works — and shows what to change for day two.',
    how: ['Open On set on the day.', 'Tick shots as you get them.', 'Wrap the scene when it’s done.'],
  } },
  { id: 'wrap-all', phase: 'production', title: 'Wrap every scene', place: view('schedule'), hours: 16, milestone: 'wrap-all', text: {
    do: 'Work through the schedule until every scene is wrapped.',
    tip: 'Running late? Drop shots, never safety or sound.',
    why: 'The shoot is done when every scene is — the schedule shows what’s left.',
    how: ['Follow each day’s call sheet.', 'Move unfinished scenes to a later day.', 'Keep the set log for the editor.'],
  } },
  { id: 'backup', phase: 'production', title: 'Back up every card, twice', place: view('onset'), hours: 1, text: {
    do: 'Copy the footage to two drives before wiping any card.',
    tip: 'Two copies, two places. Check them before you format.',
    why: 'Lost footage can’t be reshot for free. A copy on the same desk isn’t a backup.',
    how: ['Copy every card at lunch and wrap.', 'Check file counts and play a clip.', 'Keep one drive somewhere else.'],
  } },
  { id: 'tasks', phase: 'production', title: 'Clear the task list', place: hub('production'), hours: 2, milestone: 'tasks', text: {
    do: 'Close out everything on the project’s task list.',
    tip: 'Returns, thank-yous and receipts count too.',
    why: 'Loose ends from the shoot — gear returns, payments — cost money and goodwill if they drift.',
    how: ['Open the task list on the project page.', 'Assign what’s left.', 'Tick it off.'],
  } },
  { id: 'record-episodes', phase: 'production', title: 'Record the episodes', place: studio('library'), hours: 6, auto: (s) => s.media > 0, text: {
    do: 'Record, and add each episode’s raw audio to the Library.',
    tip: 'Record a minute of silence in the room — the editor will thank you.',
    why: 'Recording in batches keeps the release schedule safe.',
    how: ['Follow the run of show.', 'Record each voice on its own track.', 'Upload or link the raw files.'],
  } },
  { id: 'interviews', phase: 'production', title: 'Film your interviews', place: view('onset'), hours: 12, text: {
    do: 'Film the interviews and the life around them.',
    tip: 'Ask, then wait. The best answer comes after the silence.',
    why: 'Interviews are the spine of most documentaries; the moments around them are the heart.',
    how: ['Frame and light once, then leave it alone.', 'Record clean sound on a lavalier and a boom.', 'Film cutaways: hands, places, the world they live in.'],
  } },

  // ── Post-production ────────────────────────────────────────────
  { id: 'learn-post', phase: 'post-production', title: 'Learn the order of post', place: studio('post'), hours: 0.5, learn: true, text: {
    do: 'Read what happens between the shoot and the finished film.',
    tip: 'Lock the picture before the sound and colour.',
    why: 'Post has an order; doing it out of order means doing it twice.',
    how: ['Edit: assembly → rough cut → fine cut → picture lock.', 'Then sound, music and colour, in parallel.', 'Then titles, the master and the deliverables.'],
  } },
  { id: 'transcribe', phase: 'post-production', title: 'Log your footage', place: studio('library'), hours: 10, text: {
    do: 'Log and transcribe what you shot.',
    tip: 'A paper edit from transcripts is faster than scrubbing footage.',
    why: 'Documentaries are written in the edit; you can’t write with material you can’t find.',
    how: ['Transcribe interviews.', 'Mark the best moments.', 'Build a paper edit in the order of the story.'],
  } },
  { id: 'cut', phase: 'post-production', title: 'Add your first cut', place: studio('post'), hours: 10, milestone: 'cut', text: {
    do: 'Assemble the footage and add the cut for review.',
    tip: 'The assembly will be long and bad. That’s its job.',
    why: 'Reviewing a real cut is how the film is found — and how the team gives notes in one place.',
    how: ['Assemble scenes in script order.', 'Export or link the cut.', 'Add it in Studio › Post.'],
  } },
  { id: 'test-screening', phase: 'post-production', title: 'Show it to fresh eyes', place: studio('post'), hours: 2, text: {
    do: 'Screen the cut for people who haven’t read the script.',
    tip: 'Watch them, not the screen.',
    why: 'You know the story too well to see what’s missing. Fresh viewers do.',
    how: ['Pick three to five people.', 'Don’t explain anything before.', 'Ask what they remember and what confused them.'],
  } },
  { id: 'notes', phase: 'post-production', title: 'Review it with notes', place: studio('post'), hours: 2, milestone: 'notes', text: {
    do: 'Leave timecoded notes on the cut.',
    tip: 'Note the problem, not the fix — let the editor solve it.',
    why: 'Notes in one place, on the frame they’re about, stop the “which version?” mess.',
    how: ['Play the cut in Studio › Post.', 'Pause and add a note at the moment.', 'Tag the department it’s for.'],
  } },
  { id: 'notes-resolved', phase: 'post-production', title: 'Resolve every note', place: studio('post'), hours: 8, milestone: 'notes-resolved', text: {
    do: 'Work through the notes until none are open.',
    tip: 'It’s fine to answer a note with “no, because…”.',
    why: 'An open note is a decision not yet made. Picture lock means none are left.',
    how: ['Filter to open notes.', 'Fix or answer each one.', 'Upload the new cut and review again.'],
  } },
  { id: 'music', phase: 'post-production', title: 'Clear your music', place: view('paperwork'), hours: 3, text: {
    do: 'Get a licence for every piece of music in the film.',
    tip: 'A composer or a library track is far easier than a famous song.',
    why: 'Uncleared music keeps films out of festivals and off platforms.',
    how: ['List every track and where it’s used.', 'Get licences or commission a score.', 'File the agreements in Paperwork.'],
  } },
  { id: 'pipeline', phase: 'post-production', title: 'Finish the post pipeline', place: studio('post'), hours: 10, milestone: 'pipeline', text: {
    do: 'Edit, sound, colour, music, titles — each marked done.',
    tip: 'Sound mix last, and on good speakers.',
    why: 'The pipeline shows exactly what stands between you and a finished film.',
    how: ['Set up the stages in Studio › Post.', 'Assign each to someone.', 'Mark them done as they finish.'],
  } },
  { id: 'artwork', phase: 'post-production', title: 'Make the artwork', place: studio('promos'), hours: 2, text: {
    do: 'Make cover art that reads at thumbnail size.',
    tip: 'Test it at 100 pixels wide.',
    why: 'Artwork is the first thing a listener sees in their app.',
    how: ['Square, 3000 × 3000.', 'Big title, one image.', 'Keep it consistent across episodes.'],
  } },

  // ── Delivery ───────────────────────────────────────────────────
  { id: 'deliverables', phase: 'delivery', title: 'Deliver everything', place: studio('post'), hours: 6, milestone: 'deliverables', text: {
    do: 'Make the masters, captions, stills and press kit.',
    tip: 'Check what each festival or platform asks for before exporting.',
    why: 'A finished film is a set of files. Delivering them right is what gets it shown.',
    how: ['List deliverables in Studio › Post.', 'Export and check each one.', 'Mark them done.'],
  } },
  { id: 'share', phase: 'delivery', title: 'Share it', place: studio('share'), hours: 0.5, milestone: 'share', text: {
    do: 'Open the project’s share page by link or to everyone.',
    tip: 'Pick the stills that show the film best — they lead the link preview.',
    why: 'The share page is the film’s home: logline, look, credits — one link to send.',
    how: ['Open Studio › Share.', 'Choose who can see it.', 'Choose what goes in the lookbook.'],
  } },
  { id: 'learn-festivals', phase: 'delivery', title: 'Learn how festivals work', place: hub('production'), hours: 0.5, learn: true, text: {
    do: 'Read how to pick festivals.',
    tip: 'Premiere status matters: plan where it shows first.',
    why: 'Festivals are how short films find audiences and how filmmakers get their next project.',
    how: ['Big festivals want premieres — submit there first.', 'Genre and regional festivals are kinder to first films.', 'Budget for fees; many waive them early.'],
  } },
  { id: 'festival', phase: 'delivery', title: 'Submit to festivals', place: hub('production'), hours: 4, milestone: 'festival', text: {
    do: 'Pick festivals and track your submissions.',
    tip: 'Submit early — fees go up and slots fill.',
    why: 'Festivals are the first audience and the first press for most independent films.',
    how: ['Make a list: dream, likely, sure.', 'Submit and track each on the project page.', 'Add laurels to the share page as you’re selected.'],
  } },
  { id: 'release-plan', phase: 'delivery', title: 'Plan the release', place: studio('promos'), hours: 3, text: {
    do: 'Plan where and when it comes out, and how people hear about it.',
    tip: 'Start the campaign before the release, not on the day.',
    why: 'Release is a campaign, not a date.',
    how: ['Pick the platforms.', 'Plan posts: teaser, trailer, release, thank-you.', 'Schedule them in Studio › Promos.'],
  } },
  { id: 'portfolio', phase: 'delivery', title: 'Add it to your portfolio', place: { kind: 'path', path: '/portfolio' }, hours: 0.5, milestone: 'portfolio', text: {
    do: 'Put the finished work on your profile.',
    tip: 'Credit everyone — it’s how they find you next time.',
    why: 'Your portfolio is how productions find you for the next one.',
    how: ['Add it from the portfolio page.', 'Link the share page.', 'List your role and the crew.'],
  } },

  // ── On the crew (someone else's project) ───────────────────────
  { id: 'crew-hello', phase: 'development', title: 'Say hello to the team', place: { kind: 'path', path: '/lounge' }, hours: 0.5, text: {
    do: 'Introduce yourself in the project’s channel.',
    tip: 'Say what you do and when you’re free.',
    why: 'The channel is where plans change. Being in it means you hear first.',
    how: ['Open the Lounge and pick the project’s channel.', 'Say hello and your role.', 'Turn on notifications for it.'],
  } },
  { id: 'crew-read', phase: 'development', title: 'Read the script', place: editor, hours: 1, text: {
    do: 'Read the whole script once, start to finish.',
    tip: 'Read it for the story first; for your department second.',
    why: 'Everything you do serves the story. Knowing it lets you suggest, not just follow.',
    how: ['Open the script in the editor.', 'Read once without notes.', 'Read again marking what your department touches.'],
  } },
  { id: 'crew-references', phase: 'development', title: 'Study the references', place: studio('library'), hours: 1, depts: ['direction', 'camera', 'art', 'post', 'sound'], text: {
    do: 'Look through the Library and mood boards.',
    tip: 'Bring one reference of your own to the first meeting.',
    why: 'The references are the director’s shorthand for the look. Knowing them saves meetings.',
    how: ['Open Studio › Library.', 'Note what the look has in common.', 'Add your own references for your department.'],
  } },
  { id: 'crew-scenes', phase: 'pre-production', title: 'Know your scenes', place: studio('scenes'), hours: 2, depts: ['performer'], text: {
    do: 'Find every scene you’re in and what your character wants in each.',
    tip: 'Know the scene before and after yours.',
    why: 'Films shoot out of order. Knowing where each scene sits keeps the performance continuous.',
    how: ['Open Studio › Scenes.', 'Note your scenes and their order in the story.', 'Ask the director about anything unclear.'],
  } },
  { id: 'crew-lines', phase: 'pre-production', title: 'Learn your lines', place: editor, hours: 4, depts: ['performer'], text: {
    do: 'Be off-book before the first shoot day.',
    tip: 'Learn the thoughts, not just the words.',
    why: 'Knowing your lines frees you to act — and keeps the day on schedule.',
    how: ['Run lines with a scene partner.', 'Record the other parts and play them back.', 'Check for the latest revised pages.'],
  } },
  { id: 'crew-breakdown', phase: 'pre-production', title: 'List what your department needs', place: view('breakdown'), hours: 2, depts: ['production', 'camera', 'art', 'sound'], text: {
    do: 'Tag what your department needs, scene by scene.',
    tip: 'Flag anything you can’t get early — it changes the schedule.',
    why: 'The breakdown feeds the schedule and budget. What isn’t in it isn’t planned for.',
    how: ['Open Studio › Breakdown.', 'Tag your department’s elements.', 'Check Readiness for scenes blocked on you.'],
  } },
  { id: 'crew-shots', phase: 'pre-production', title: 'Walk the shot list', place: studio('scenes'), hours: 2, depts: ['direction', 'camera'], text: {
    do: 'Go through the shot list with the director.',
    tip: 'Flag setups that need special kit or time.',
    why: 'Camera and direction agreeing on the shots is what makes the day shootable.',
    how: ['Open each scene’s shots in Studio › Scenes.', 'Note kit and lighting per setup.', 'Suggest what to drop if time runs short.'],
  } },
  { id: 'crew-paperwork', phase: 'pre-production', title: 'Sign your paperwork', place: view('paperwork'), hours: 0.5, text: {
    do: 'Check and sign your deal memo or release.',
    tip: 'Read what you’re signing: dates, pay, credit.',
    why: 'Paperwork protects you as much as the production.',
    how: ['Open Studio › Paperwork — “Your paperwork” lists yours.', 'Ask about anything unclear.', 'Sign and return it.'],
  } },
  { id: 'crew-call', phase: 'production', title: 'Check your call sheet', place: view('schedule'), hours: 0.5, text: {
    do: 'Read the call sheet for each of your days.',
    tip: 'Note your call time, the location and parking the night before.',
    why: 'The call sheet is the day’s plan. It changes; the latest one is the one that counts.',
    how: ['Open the schedule to see your days.', 'Acknowledge the call sheet.', 'Watch for changes — you’ll be notified.'],
  } },
  { id: 'crew-hours', phase: 'production', title: 'Log your hours', place: view('money'), hours: 0.5, depts: ['direction', 'production', 'camera', 'sound', 'art', 'post', 'other'], text: {
    do: 'Log your hours for each day you work.',
    tip: 'Log them the same day, while you remember.',
    why: 'Approved timesheets are how you get paid on time.',
    how: ['Open Studio › Money › Timesheets.', 'Add the day’s hours.', 'Watch for approval.'],
  } },
  { id: 'crew-cut', phase: 'post-production', title: 'Watch the cut and leave notes', place: studio('post'), hours: 2, depts: ['direction', 'post', 'sound', 'production', 'writing'], text: {
    do: 'Watch the latest cut and leave your notes on it.',
    tip: 'Note what you feel, at the frame you feel it.',
    why: 'Notes on the frame they’re about are the ones that get acted on.',
    how: ['Open Studio › Post.', 'Play the latest cut.', 'Add timecoded notes for your department.'],
  } },
  { id: 'crew-portfolio', phase: 'delivery', title: 'Add it to your portfolio', place: { kind: 'path', path: '/portfolio' }, hours: 0.5, text: {
    do: 'Put the finished work on your profile with your credit.',
    tip: 'A still of your best moment says more than a poster.',
    why: 'The next production finds you through the last one.',
    how: ['Add it from the portfolio page.', 'List your role.', 'Link the project’s share page.'],
  } },
];

export const STEPS: Record<string, StepDef> = Object.fromEntries(S.map((s) => [s.id, s]));

/** The department a craft belongs to, as far as the guide cares. */
export function departmentOf(craft: string | null | undefined): Dept {
  const c = (craft ?? '').toLowerCase();
  if (!c) return 'other';
  if (/\b(actor|actress|performer|stunt|voice|dancer|host|presenter)\b/.test(c)) return 'performer';
  if (/\b(editor|colou?rist|vfx|visual effects|animator|motion|post)\b/.test(c) && !/story editor/.test(c)) return 'post';
  if (/\b(sound|boom|mixer|composer|music)\b/.test(c)) return 'sound';
  if (/\b(camera|photograph|cinematograph|dit|drone|steadicam|gaffer|grip|electric)/.test(c)) return 'camera';
  if (/\b(design|decorat|prop|art director|costume|wardrobe|makeup|hair)/.test(c)) return 'art';
  if (/\b(writer|story editor|screenwriter)\b/.test(c)) return 'writing';
  if (/\b(director|script supervisor)\b/.test(c)) return 'direction';
  if (/\b(producer|manager|assistant|casting|location|coordinator)\b/.test(c)) return 'production';
  return 'other';
}

/** Story structures the brief offers, as beats for the outline step. */
export const STRUCTURES: Record<string, { name: string; beats: string[] }> = {
  three_act: { name: 'three acts', beats: ['Act one — the world, the character, and what breaks it.', 'Act two — the attempt, rising complications, the midpoint turn, the low point.', 'Act three — the final choice, the climax, the new normal.'] },
  save_the_cat: { name: 'Save the Cat beats', beats: ['Opening image and theme stated.', 'Set-up, then the catalyst.', 'Debate, then break into two.', 'B story; fun and games.', 'Midpoint: a false victory or false defeat.', 'Bad guys close in; all is lost.', 'Dark night of the soul; break into three.', 'Finale and final image.'] },
  heros_journey: { name: 'hero’s journey', beats: ['The ordinary world and the call to adventure.', 'Refusal, then a mentor.', 'Crossing the threshold.', 'Tests, allies and enemies.', 'The ordeal.', 'The reward and the road back.', 'Resurrection and return with the elixir.'] },
  story_circle: { name: 'story circle', beats: ['You — a character in a zone of comfort.', 'Need — but they want something.', 'Go — they enter an unfamiliar situation.', 'Search — adapt to it.', 'Find — get what they wanted.', 'Take — pay a heavy price for it.', 'Return — to the familiar.', 'Change — having changed.'] },
  tv_acts: { name: 'TV acts', beats: ['Teaser — the hook before the titles.', 'Act one — the episode’s question.', 'Act two — complications.', 'Act three — the turn.', 'Act four — the answer (and a new question).', 'Tag — the button, or the cliffhanger.'] },
  doc_arc: { name: 'documentary arc', beats: ['The question the film asks.', 'Who we follow, and what they want.', 'What stands in the way.', 'What changes — in them, or in us.', 'What we understand at the end.'] },
};
