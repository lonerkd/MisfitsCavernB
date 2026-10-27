// Checks a project format (public.project_formats, admin-written) before it is
// saved. The database enforces the same limits; this says them in words. Pure.

export const FORMAT_ICONS = ['film', 'clapperboard', 'tv', 'globe', 'music', 'video', 'megaphone', 'mic', 'sparkles'] as const;
export const FORMAT_SCRIPTS = ['screenplay', 'teleplay', 'stage-play', 'treatment', 'podcast', 'doc-outline'] as const;
export const SKIPPABLE_PHASES = ['pre-production', 'production', 'post-production'] as const;
/** Phases whose exit can wait for the client's approval (not the last one). */
export const GATEABLE_PHASES = ['development', 'pre-production', 'production', 'post-production'] as const;

export interface FormatInput {
  name: string;
  blurb: string;
  icon: (typeof FORMAT_ICONS)[number];
  script_format: (typeof FORMAT_SCRIPTS)[number];
  skip_phases: (typeof SKIPPABLE_PHASES)[number][];
  approval_gates?: (typeof GATEABLE_PHASES)[number][];
}
export type FormatCheck = { ok: true; value: FormatInput } | { ok: false; error: string };

export function checkFormat(input: FormatInput, existing: string[] = []): FormatCheck {
  const name = input.name.trim().replace(/\s+/g, ' ');
  const blurb = input.blurb.trim();
  if (!name) return { ok: false, error: 'Give the format a name.' };
  if (name.length > 40) return { ok: false, error: 'Keep the name under 40 characters.' };
  if (existing.some((n) => n.toLowerCase() === name.toLowerCase())) return { ok: false, error: `“${name}” is already a format.` };
  if (blurb.length > 140) return { ok: false, error: 'Keep the one-line description under 140 characters.' };
  if (!FORMAT_ICONS.includes(input.icon) || !FORMAT_SCRIPTS.includes(input.script_format)) return { ok: false, error: 'Pick an icon and a script format.' };
  const skip = SKIPPABLE_PHASES.filter((p) => input.skip_phases.includes(p));
  // A gate on a phase the format skips would never be reached.
  const gates = GATEABLE_PHASES.filter((p) => (input.approval_gates ?? []).includes(p) && !skip.includes(p as never));
  return { ok: true, value: { name, blurb, icon: input.icon, script_format: input.script_format, skip_phases: skip, approval_gates: gates } };
}
