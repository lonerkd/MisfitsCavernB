// What it takes to advance, said accurately (BACKLOG 3.46, owner 2026-11-21: "each bullet point for what phase; what each role and the
// project needs to advance, with real assets"). Everything here is derived from the engine's own data: a milestone is done when the
// project's real records say so (`ProjectSignals`), a step's place is where the work is done, and the roles are crafts from the role
// model (a test keeps every name real). Pure.

import { PRODUCTION_VIEW_TOOL, type MilestoneState, type ProjectProgress, type ToolId, type ToolState } from './progress';
import { TOOLKITS } from '@/lib/roles/toolkit';
import type { ProductionView } from './progress';

/** Who usually does each milestone: crafts from the role model (lib/roles/toolkit.ts). The project's owner can always do any of them. */
export const MILESTONE_ROLES: Record<string, string[]> = {
  logline: ['Writer', 'Director', 'Producer'],
  script: ['Writer', 'Showrunner', 'Story editor'],
  characters: ['Writer', 'Story editor'],
  beats: ['Writer', 'Story editor', 'Director'],
  references: ['Director', 'Production designer', 'Director of photography'],
  crew: ['Producer', 'Line producer', 'Production manager'],
  casting: ['Casting director', 'Director', 'Producer'],
  shots: ['Director', 'Director of photography', 'First assistant director'],
  breakdown: ['First assistant director', 'Production manager', 'Producer'],
  'lock-script': ['Writer', 'Director', 'Script supervisor'],
  locations: ['Location manager', 'Producer', 'Production manager'],
  permits: ['Location manager', 'Production coordinator', 'Production manager'],
  'call-sheet': ['First assistant director', 'Second assistant director', 'Production coordinator'],
  budget: ['Producer', 'Line producer', 'Production accountant'],
  'budget-approved': ['Producer', 'Line producer', 'Production accountant'],
  schedule: ['First assistant director', 'Production manager', 'Production coordinator'],
  'wrap-first': ['First assistant director', 'Script supervisor'],
  'wrap-all': ['First assistant director', 'Script supervisor'],
  tasks: ['Producer', 'Production manager', 'Production coordinator'],
  cut: ['Editor', 'Assistant editor', 'Post supervisor'],
  'cut-locked': ['Director', 'Editor', 'Post supervisor'],
  notes: ['Director', 'Editor', 'Post supervisor'],
  'notes-resolved': ['Editor', 'Post supervisor'],
  pipeline: ['Post supervisor', 'Editor', 'Colorist', 'Sound designer', 'Composer'],
  deliverables: ['Post supervisor', 'Producer'],
  share: ['Producer'],
  festival: ['Producer', 'Director'],
  portfolio: ['Director', 'Editor', 'Writer'],
};

/** What opens a tool before its phase: the work it holds has started. One plain sentence per tool that has such a rule. */
export const EARLY_OPENS: Partial<Record<ToolId, string>> = {
  scenes: 'Write a scene heading in the script and the scenes open on their own.',
  breakdown: 'Tag one element in a scene’s breakdown and it opens.',
  revisions: 'Lock a draft of the script and it opens.',
  schedule: 'Date a shoot day (a call sheet with a date) and it opens.',
  crew: 'Invite someone or cast a role and it opens.',
  budget: 'Add a budget line and it opens.',
  onset: 'Date a shoot day and the day’s tool opens.',
  post: 'Add a cut, a post stage or a deliverable and it opens for good.',
  promos: 'Plan a campaign and it opens.',
  festivals: 'Submit to a festival and it opens.',
  portfolio: 'Add the film to your portfolio and it opens.',
};

const STUDIO_TAB_ROLES: Partial<Record<ToolId, string[]>> = {
  scenes: ['Director', 'Director of photography', 'First assistant director', 'Script supervisor'],
  post: ['Editor', 'Assistant editor', 'Post supervisor', 'Colorist', 'Sound designer', 'Composer'],
  promos: ['Producer', 'Director'],
};

/** The crafts whose suite holds this tool: a Production view's tool from the toolkits, a Studio tab's from the list above. */
export function rolesUsing(tool: ToolId): string[] {
  const fixed = STUDIO_TAB_ROLES[tool];
  if (fixed) return fixed;
  const views = (Object.entries(PRODUCTION_VIEW_TOOL) as Array<[ProductionView, ToolId]>).filter(([, id]) => id === tool).map(([v]) => v);
  if (!views.length) return [];
  return Object.entries(TOOLKITS).filter(([, kit]) => kit.views.some((v) => views.includes(v))).map(([craft]) => craft).filter((c) => !['Client', 'Investor', 'Distributor or festival guest', 'Press', 'Multi-hyphenate', 'Other'].includes(c)).slice(0, 8);
}

export interface NeedStep extends MilestoneState {
  phaseLabel: string;
  roles: string[];
  /** Whether this step is in the project's current phase (the rest are left behind or ahead). */
  current: boolean;
}

export interface LockNeeds {
  /** The phase the tool opens in. */
  phaseLabel: string;
  /** What is left to finish before the project reaches that phase, in order: the current phase first, then each phase up to (not including) it. */
  steps: NeedStep[];
  /** Every milestone before that phase is done: the owner can move the project there. */
  ready: boolean;
  earlyOpens: string | null;
  roles: string[];
}

export function lockNeeds(progress: ProjectProgress, tool: ToolState): LockNeeds {
  const steps: NeedStep[] = [];
  for (let i = progress.currentIndex; i < tool.phaseIndex && i < progress.phases.length; i++) {
    const phase = progress.phases[i];
    for (const m of phase.milestones) steps.push({ ...m, phaseLabel: phase.label, roles: MILESTONE_ROLES[m.id] ?? [], current: i === progress.currentIndex });
  }
  return {
    phaseLabel: tool.phaseLabel,
    steps,
    ready: steps.length > 0 && steps.every((s) => s.done),
    earlyOpens: EARLY_OPENS[tool.id] ?? null,
    roles: rolesUsing(tool.id),
  };
}
