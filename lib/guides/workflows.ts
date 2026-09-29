// Guides for each kind of project: an ordered list of steps from the library
// (lib/guides/steps), with the words and effort tuned to the format. A step
// the project's format skips (a podcast has no casting) drops out, and so do
// steps meant for a different team size or department.

import type { StepDef, StepText } from './steps';
import type { Experience } from './profile';

export interface StepOverride {
  title?: string;
  hours?: number;
  text?: Partial<StepText>;
}

export interface Workflow {
  id: string;
  label: string;
  blurb: string;
  /** For people on someone else's project, not the owner. */
  crew?: boolean;
  steps: string[];
  overrides?: Record<string, StepOverride>;
}

const POST = ['learn-post', 'cut', 'test-screening', 'notes', 'notes-resolved', 'music', 'pipeline'];

export const WORKFLOWS: Workflow[] = [
  {
    id: 'short-first', label: 'Your first short', blurb: 'Small on purpose, every step explained, finished at the end.',
    steps: ['learn-phases', 'scope', 'logline', 'brief', 'references', 'beats', 'learn-format', 'script', 'characters', 'draft', 'table-read', 'rewrite',
      'crew', 'casting', 'learn-breakdown', 'breakdown', 'locations', 'learn-coverage', 'shots', 'budget', 'schedule', 'paperwork', 'gear', 'rehearse',
      'learn-set', 'wrap-first', 'wrap-all', 'backup', ...POST, 'deliverables', 'share', 'learn-festivals', 'festival', 'portfolio'],
    overrides: {
      draft: { hours: 8, text: { tip: 'Five to ten pages. If it’s longer, it’s not your first short yet.' } },
      'wrap-all': { hours: 12 },
      budget: { text: { tip: 'Most first shorts cost food, transport and one rented light. Keep 10% aside anyway.' } },
    },
  },
  {
    id: 'short', label: 'Short film', blurb: 'Script to festivals, at a working pace.',
    steps: ['logline', 'brief', 'references', 'beats', 'script', 'characters', 'draft', 'table-read', 'rewrite',
      'crew', 'jobs', 'casting', 'breakdown', 'revisions', 'locations', 'shots', 'budget', 'schedule', 'paperwork', 'gear', 'rehearse',
      'wrap-first', 'wrap-all', 'backup', 'tasks', ...POST, 'deliverables', 'share', 'learn-festivals', 'festival', 'release-plan', 'portfolio'],
    overrides: { draft: { hours: 12 } },
  },
  {
    id: 'feature', label: 'Feature film', blurb: 'Development-heavy: drafts, money and a long shoot.',
    steps: ['logline', 'brief', 'references', 'beats', 'characters', 'learn-format', 'script', 'draft', 'table-read', 'rewrite', 'pitch', 'financing',
      'crew', 'jobs', 'casting', 'learn-breakdown', 'breakdown', 'revisions', 'locations', 'shots', 'budget', 'schedule', 'paperwork', 'gear', 'rehearse',
      'learn-set', 'wrap-first', 'wrap-all', 'backup', 'tasks', ...POST, 'deliverables', 'share', 'learn-festivals', 'festival', 'release-plan', 'portfolio'],
    overrides: {
      beats: { hours: 12 }, characters: { hours: 8 }, draft: { hours: 120, text: { tip: 'Three to five pages a day gets a draft in a month or two.' } },
      rewrite: { hours: 60, text: { do: 'Rewrite until the table read works — usually two or three drafts.' } },
      crew: { hours: 12 }, casting: { hours: 20 }, breakdown: { hours: 12 }, locations: { hours: 24 }, shots: { hours: 30 },
      budget: { hours: 10 }, schedule: { hours: 10 }, paperwork: { hours: 10 }, rehearse: { hours: 16 },
      'wrap-all': { hours: 160, text: { tip: 'Plan about 3–4 pages a day on an independent feature.' } },
      cut: { hours: 80 }, 'notes-resolved': { hours: 40 }, pipeline: { hours: 80 }, deliverables: { hours: 16 }, festival: { hours: 10 },
    },
  },
  {
    id: 'series', label: 'Series', blurb: 'A pilot, a bible and a season planned together.',
    steps: ['logline', 'brief', 'references', 'bible', 'season', 'characters', 'learn-format', 'script', 'draft', 'table-read', 'rewrite', 'pitch',
      'crew', 'jobs', 'casting', 'breakdown', 'revisions', 'locations', 'shots', 'budget', 'schedule', 'paperwork', 'gear',
      'learn-set', 'wrap-first', 'wrap-all', 'backup', 'tasks', ...POST, 'deliverables', 'share', 'release-plan', 'festival', 'portfolio'],
    overrides: {
      script: { title: 'Start the pilot' },
      draft: { title: 'Finish the pilot', hours: 30 },
      'wrap-all': { hours: 60, text: { tip: 'Shoot episodes that share a location together.' } },
      'release-plan': { text: { tip: 'Release on a rhythm — weekly keeps people coming back.' } },
      cut: { hours: 30 }, pipeline: { hours: 40 },
    },
  },
  {
    id: 'music-video', label: 'Music video', blurb: 'The song is the script: treatment, a day or two of shooting, the edit.',
    steps: ['learn-phases', 'track', 'references', 'treatment', 'approval', 'crew', 'locations', 'shots', 'budget', 'schedule', 'paperwork', 'gear',
      'learn-set', 'wrap-first', 'wrap-all', 'backup', 'cut', 'notes', 'notes-resolved', 'pipeline', 'deliverables', 'share', 'release-plan', 'portfolio'],
    overrides: {
      approval: { title: 'Get the artist’s yes', text: { do: 'Present the treatment to the artist and label; get a yes in writing.' } },
      shots: { text: { tip: 'Plan performance passes of the whole song, then the story shots.' } },
      'wrap-first': { text: { tip: 'Play the track on set, loud — the performance depends on it.' } },
      'wrap-all': { hours: 10 },
      cut: { title: 'Cut to the track', hours: 12, text: { tip: 'Lay the song first; cut every shot to it.' } },
      pipeline: { title: 'Colour and finish', hours: 8 },
      deliverables: { text: { do: 'Export the masters and the vertical and square cuts.' } },
    },
  },
  {
    id: 'documentary', label: 'Documentary', blurb: 'Subjects, access and consent first; the story is found in the edit.',
    steps: ['logline', 'brief', 'subjects', 'access', 'references', 'beats', 'script', 'crew', 'gear', 'locations', 'shots', 'budget', 'schedule', 'paperwork',
      'learn-set', 'interviews', 'wrap-first', 'backup', 'learn-post', 'transcribe', 'cut', 'test-screening', 'notes', 'notes-resolved', 'music', 'pipeline',
      'deliverables', 'share', 'learn-festivals', 'festival', 'portfolio'],
    overrides: {
      logline: { title: 'Write the question', text: { do: 'Say what the film wants to find out, in a sentence.', tip: 'A good documentary asks a question it doesn’t know the answer to.' } },
      script: { title: 'Write an outline', text: { do: 'Outline the story you expect to find — then be ready to lose it.' } },
      shots: { title: 'Plan your shoots', text: { tip: 'Plan the things that only happen once; improvise the rest.' } },
      'wrap-first': { title: 'Finish your first shoot' },
      cut: { title: 'Build the first assembly', hours: 30 },
      paperwork: { text: { tip: 'A release for every person you might show — before, not after.' } },
    },
  },
  {
    id: 'podcast', label: 'Podcast', blurb: 'A format, a test, a batch of episodes and a release rhythm.',
    steps: ['show-format', 'logline', 'brief', 'guests', 'script', 'test-record', 'paperwork', 'record-episodes',
      'cut', 'notes', 'notes-resolved', 'pipeline', 'artwork', 'share', 'release-plan', 'portfolio'],
    overrides: {
      logline: { title: 'Say what the show is', text: { do: 'One sentence: who it’s for and why they’d listen.' } },
      script: { title: 'Write the first run of show', text: { do: 'Plan the first episode segment by segment.' } },
      paperwork: { text: { do: 'A release from every guest before you publish.' } },
      cut: { title: 'Add the first edit', text: { do: 'Edit the first episode and add it for review.' } },
      pipeline: { title: 'Mix and master' },
      share: { title: 'Publish', text: { do: 'Open the show’s page and publish the first episodes.' } },
    },
  },
  {
    id: 'commercial', label: 'Commercial', blurb: 'A client’s brief, a signed-off concept, a shoot and a hard delivery date.',
    steps: ['client-brief', 'references', 'treatment', 'approval', 'crew', 'casting', 'locations', 'shots', 'budget', 'schedule', 'paperwork',
      'learn-set', 'wrap-first', 'wrap-all', 'backup', 'cut', 'notes', 'notes-resolved', 'music', 'pipeline', 'deliverables', 'share', 'portfolio'],
    overrides: {
      cut: { text: { tip: 'Cut the longest version first; the short ones come from it.' } },
      deliverables: { text: { do: 'Every length and ratio the brief asks for, checked against it.' } },
      share: { title: 'Share with the client' },
    },
  },
  {
    id: 'on-the-crew', label: 'On the crew', blurb: 'What your part of someone else’s production needs from you.', crew: true,
    steps: ['crew-hello', 'crew-read', 'crew-references', 'crew-scenes', 'crew-lines', 'crew-breakdown', 'crew-shots', 'crew-paperwork',
      'learn-set', 'crew-call', 'crew-hours', 'crew-cut', 'crew-portfolio'],
  },
];

export const WORKFLOW_BY_ID: Record<string, Workflow> = Object.fromEntries(WORKFLOWS.map((w) => [w.id, w]));

/** The guide that fits a project, before anyone picks one. */
export function pickWorkflow(format: string | null | undefined, experience: Experience, isOwner: boolean): Workflow {
  if (!isOwner) return WORKFLOW_BY_ID['on-the-crew'];
  const f = (format ?? '').toLowerCase();
  const id =
    f === 'feature' ? 'feature'
      : f.includes('series') ? 'series'
      : f === 'music video' ? 'music-video'
      : f === 'documentary' ? 'documentary'
      : f === 'podcast' ? 'podcast'
      : f === 'commercial' ? 'commercial'
      : experience === 'first' ? 'short-first' : 'short';
  return WORKFLOW_BY_ID[id];
}

/** A step as a workflow tells it. */
export function applyOverride(step: StepDef, o: StepOverride | undefined): StepDef {
  if (!o) return step;
  return { ...step, title: o.title ?? step.title, hours: o.hours ?? step.hours, text: { ...step.text, ...(o.text ?? {}) } };
}
