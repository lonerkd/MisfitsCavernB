// The whole demo world: the base cast and projects plus the extra sets (`--set`). The content files import only types from each other.
import { PERSONAS as BASE_PERSONAS, PROJECTS as BASE_PROJECTS } from './content';
import { MORE_PERSONAS, MORE_PROJECTS } from './content-more';
import { THEKID_PERSONAS, THEKID_PROJECTS } from './content-thekid';

export const PERSONAS = [...BASE_PERSONAS, ...MORE_PERSONAS, ...THEKID_PERSONAS];
export const PROJECTS = [...BASE_PROJECTS, ...MORE_PROJECTS, ...THEKID_PROJECTS];
