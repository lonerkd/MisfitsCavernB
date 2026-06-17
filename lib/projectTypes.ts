// Per-project-type phase pipelines + script-format defaults.
// `project_type` on a project is free text — any of these are just curated
// suggestions. Unknown/custom types fall back to GENERIC_PHASES.

export interface PhaseDef {
  id: string;
  label: string;
  abbr: string;
}

export const GENERIC_PHASES: PhaseDef[] = [
  { id: 'concept', label: 'Concept', abbr: 'DEV' },
  { id: 'in-progress', label: 'In Progress', abbr: 'PROG' },
  { id: 'review', label: 'Review', abbr: 'REV' },
  { id: 'done', label: 'Done', abbr: 'DONE' },
];

export const PHASE_TEMPLATES: Record<string, PhaseDef[]> = {
  Feature: [
    { id: 'concept', label: 'Concept', abbr: 'DEV' },
    { id: 'pre-production', label: 'Pre-Production', abbr: 'PRE' },
    { id: 'in-production', label: 'Production', abbr: 'PROD' },
    { id: 'post-production', label: 'Post-Production', abbr: 'POST' },
    { id: 'completed', label: 'Completed', abbr: 'DONE' },
  ],
  'Short Film': [
    { id: 'concept', label: 'Concept', abbr: 'DEV' },
    { id: 'pre-production', label: 'Pre-Production', abbr: 'PRE' },
    { id: 'in-production', label: 'Production', abbr: 'PROD' },
    { id: 'post-production', label: 'Post-Production', abbr: 'POST' },
    { id: 'completed', label: 'Completed', abbr: 'DONE' },
  ],
  Series: [
    { id: 'concept', label: 'Concept', abbr: 'DEV' },
    { id: 'pre-production', label: 'Pre-Production', abbr: 'PRE' },
    { id: 'in-production', label: 'Production', abbr: 'PROD' },
    { id: 'post-production', label: 'Post-Production', abbr: 'POST' },
    { id: 'completed', label: 'Released', abbr: 'OUT' },
  ],
  'Music Video': [
    { id: 'concept', label: 'Concept', abbr: 'DEV' },
    { id: 'shoot', label: 'Shoot', abbr: 'SHOOT' },
    { id: 'edit', label: 'Edit', abbr: 'EDIT' },
    { id: 'completed', label: 'Released', abbr: 'OUT' },
  ],
  Documentary: [
    { id: 'concept', label: 'Concept', abbr: 'DEV' },
    { id: 'in-production', label: 'Production', abbr: 'PROD' },
    { id: 'post-production', label: 'Post-Production', abbr: 'POST' },
    { id: 'completed', label: 'Completed', abbr: 'DONE' },
  ],
  Commercial: [
    { id: 'concept', label: 'Concept', abbr: 'DEV' },
    { id: 'pre-production', label: 'Pre-Production', abbr: 'PRE' },
    { id: 'shoot', label: 'Shoot', abbr: 'SHOOT' },
    { id: 'post-production', label: 'Post-Production', abbr: 'POST' },
    { id: 'completed', label: 'Delivered', abbr: 'OUT' },
  ],
  Podcast: [
    { id: 'planning', label: 'Planning', abbr: 'PLAN' },
    { id: 'recording', label: 'Recording', abbr: 'REC' },
    { id: 'editing', label: 'Editing', abbr: 'EDIT' },
    { id: 'published', label: 'Published', abbr: 'OUT' },
  ],
};

export const CURATED_PROJECT_TYPES = Object.keys(PHASE_TEMPLATES);

export function getPhaseTemplate(projectType?: string | null): PhaseDef[] {
  if (!projectType) return PHASE_TEMPLATES.Feature;
  return PHASE_TEMPLATES[projectType] || GENERIC_PHASES;
}

export function phaseIndex(projectType: string | undefined | null, phaseId: string | undefined | null): number {
  const phases = getPhaseTemplate(projectType);
  const idx = phases.findIndex(p => p.id === phaseId);
  return Math.max(0, idx);
}

// Suggested default ScriptOS format per project type — still user-overridable.
export const DEFAULT_SCRIPT_FORMAT: Record<string, string> = {
  Feature: 'screenplay',
  'Short Film': 'screenplay',
  Series: 'teleplay',
  'Music Video': 'treatment',
  Documentary: 'doc-outline',
  Commercial: 'treatment',
  Podcast: 'podcast',
};

export function getDefaultScriptFormat(projectType?: string | null): string {
  if (!projectType) return 'screenplay';
  return DEFAULT_SCRIPT_FORMAT[projectType] || 'screenplay';
}
