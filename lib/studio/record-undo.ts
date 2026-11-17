// Taking back a save in a record tool: what to put back, what to remove, and how to say it. Pure, so the rule is tested
// without a database. A save writes only what changed, so its inverse does too.

export interface UndoPlan<T extends { id: string }> {
  /** Records as they were, to write back (edited ones and removed ones). */
  restore: T[];
  /** Records the save added, to remove again. */
  drop: string[];
  /** What the toast and Undo say: "Removed 2 entries", "Added an entry", "Changed an entry". */
  label: string;
}

const noun = (n: number) => (n === 1 ? 'an entry' : `${n} entries`);

export function undoPlan<T extends { id: string }>(before: readonly T[], next: readonly T[]): UndoPlan<T> | null {
  const was = new Map(before.map((i) => [i.id, i]));
  const nextIds = new Set(next.map((i) => i.id));
  const added = next.filter((i) => !was.has(i.id));
  const changed = next.filter((i) => was.has(i.id) && JSON.stringify(was.get(i.id)) !== JSON.stringify(i));
  const removed = before.filter((i) => !nextIds.has(i.id));
  if (added.length + changed.length + removed.length === 0) return null;
  const parts: string[] = [];
  if (removed.length) parts.push(`Removed ${noun(removed.length)}`);
  if (added.length) parts.push(`Added ${noun(added.length)}`);
  if (changed.length) parts.push(`Changed ${noun(changed.length)}`);
  return { restore: [...changed.map((i) => was.get(i.id)!), ...removed], drop: added.map((i) => i.id), label: parts.join(', ') };
}
