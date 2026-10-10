// Project formats, pure: rows of public.project_formats and what they mean
// for a project. No Supabase import, so it's safe anywhere (and in tests).

import { type FormatRules, type PhaseDef, phasesFor, toFormatRules } from '@/lib/os/phases';
import type { ScriptFormat } from '@/lib/scriptos/parser';

export interface ProjectFormat {
  name: string;
  blurb: string;
  icon: string;
  script_format: ScriptFormat;
  rules: FormatRules;
  position: number;
}

const SCRIPT_FORMATS: ScriptFormat[] = ['screenplay', 'teleplay', 'stage-play', 'treatment', 'podcast', 'doc-outline'];

/** A database row → a format, with anything malformed read as the default. */
export function toProjectFormat(row: {
  name: string; blurb: string; icon: string; script_format: string;
  phase_labels: unknown; skip_phases: string[]; skip_milestones: string[]; position: number;
}): ProjectFormat {
  return {
    name: row.name,
    blurb: row.blurb,
    icon: row.icon,
    script_format: (SCRIPT_FORMATS as string[]).includes(row.script_format) ? (row.script_format as ScriptFormat) : 'screenplay',
    rules: toFormatRules(row) ?? { phase_labels: {}, skip_phases: [], skip_milestones: [] },
    position: row.position,
  };
}

export function findFormat(formats: ProjectFormat[], name: string | null | undefined): ProjectFormat | null {
  if (!name) return null;
  return formats.find((f) => f.name === name) ?? formats.find((f) => f.name.toLowerCase() === name.toLowerCase()) ?? null;
}

/** The phases a project in this format goes through, in order. */
export function formatPhases(format: ProjectFormat | null): PhaseDef[] {
  return phasesFor(format?.rules);
}

/** The script format a new script in this project starts in. */
export function defaultScriptFormat(format: ProjectFormat | null, override?: string | null): ScriptFormat {
  if (override && (SCRIPT_FORMATS as string[]).includes(override)) return override as ScriptFormat;
  return format?.script_format ?? 'screenplay';
}
