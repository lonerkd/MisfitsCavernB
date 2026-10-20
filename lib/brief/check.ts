// Checks a brief question (public.brief_questions, admin-written) before it is
// saved. The database enforces the same limits; this says them in words. Pure.

export const BRIEF_PHASES = ['development', 'pre-production', 'production', 'post-production', 'delivery'] as const;
export const BRIEF_KINDS = ['one', 'many', 'number'] as const;

export interface QuestionInput {
  key: string;
  phase: (typeof BRIEF_PHASES)[number];
  label: string;
  hint: string;
  kind: (typeof BRIEF_KINDS)[number];
  /** One option label per line; ids are made from them. Ignored for a number. */
  optionsText: string;
  unit: string;
  min: string;
  max: string;
}
export interface QuestionRow {
  key: string;
  phase: QuestionInput['phase'];
  label: string;
  hint: string;
  kind: QuestionInput['kind'];
  options: { id: string; label: string }[];
  unit: string | null;
  min_value: number | null;
  max_value: number | null;
}
export type QuestionCheck = { ok: true; value: QuestionRow } | { ok: false; error: string };

/** "Festival circuit" → "festival_circuit". */
export function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

export function checkQuestion(input: QuestionInput, existingKeys: string[] = []): QuestionCheck {
  const label = input.label.trim().replace(/\s+/g, ' ');
  const hint = input.hint.trim();
  const key = input.key.trim() || slug(label).slice(0, 41);
  if (!label) return { ok: false, error: 'Give the question some words.' };
  if (label.length > 120) return { ok: false, error: 'Keep the question under 120 characters.' };
  if (hint.length > 300) return { ok: false, error: 'Keep the hint under 300 characters.' };
  if (!/^[a-z][a-z0-9_]{1,40}$/.test(key)) return { ok: false, error: 'The key is lowercase letters, digits and underscores, starting with a letter.' };
  if (existingKeys.includes(key)) return { ok: false, error: `“${key}” is already a question.` };
  if (!BRIEF_PHASES.includes(input.phase) || !BRIEF_KINDS.includes(input.kind)) return { ok: false, error: 'Pick a phase and a kind.' };

  if (input.kind === 'number') {
    const min = Number(input.min);
    const max = Number(input.max);
    if (input.min.trim() === '' || input.max.trim() === '' || !Number.isFinite(min) || !Number.isFinite(max)) return { ok: false, error: 'A number question needs a lowest and a highest value.' };
    if (min > max) return { ok: false, error: 'The lowest value is above the highest.' };
    return { ok: true, value: { key, phase: input.phase, label, hint, kind: 'number', options: [], unit: input.unit.trim() || null, min_value: min, max_value: max } };
  }

  const labels = input.optionsText.split('\n').map((l) => l.trim().replace(/\s+/g, ' ')).filter(Boolean);
  if (labels.length < 2) return { ok: false, error: 'Give at least two options, one per line.' };
  const options = labels.map((l) => ({ id: slug(l).slice(0, 40), label: l }));
  if (options.some((o) => !o.id)) return { ok: false, error: 'Each option needs some letters or digits.' };
  if (new Set(options.map((o) => o.id)).size !== options.length) return { ok: false, error: 'Two options are the same — make each one different.' };
  return { ok: true, value: { key, phase: input.phase, label, hint, kind: input.kind, options, unit: null, min_value: null, max_value: null } };
}
