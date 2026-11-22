// The second account's demo world: a different working life (a podcaster and music-video maker who is also crew on other people's
// projects). Built with `--set thekid`. Types only from ./content, so there is no import cycle.
import type { DemoProject, Persona } from './content';

export const THEKID_PERSONAS: Persona[] = [];

/** Every project here has `set: 'thekid'`; `owner: 'me'` is the account the run is for. */
export const THEKID_PROJECTS: DemoProject[] = [];
