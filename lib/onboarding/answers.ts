import type { Answers, BriefQuestion } from '@/lib/brief';

/**
 * Splits the wizard's answers into those to the questions still asked for the
 * chosen format (`kept`) and those that no longer apply (`dropped`, with the
 * question's label when the catalogue knows it) — so nothing is discarded
 * without the person being told.
 */
export function splitAnswers(
  answers: Answers,
  asked: BriefQuestion[],
  catalogue: BriefQuestion[],
): { kept: Answers; dropped: Array<{ key: string; label: string }> } {
  const askedKeys = new Set(asked.map((q) => q.key));
  const labels = new Map(catalogue.map((q) => [q.key, q.label]));
  const kept: Answers = {};
  const dropped: Array<{ key: string; label: string }> = [];
  for (const [key, value] of Object.entries(answers)) {
    if (askedKeys.has(key)) kept[key] = value;
    else dropped.push({ key, label: labels.get(key) ?? key });
  }
  return { kept, dropped };
}
