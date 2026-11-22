// More demo projects for the main account: other formats, every stage and state, other roles. Built with `--set more`.
// Written against the types in ./content (types only: nothing here imports a value from it, so there is no import cycle).
import type { DemoProject, Persona } from './content';

/** New sample people (crafts the base cast lacks). Accounts on demo.misfitscavern.invalid with no password: they cannot sign in. */
export const MORE_PERSONAS: Persona[] = [];

/** Every project here has `set: 'more'`. */
export const MORE_PROJECTS: DemoProject[] = [];
