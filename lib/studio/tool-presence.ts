// Who else has the same tool open: from the project's presence room, each person says which tool they are in.
// Pure, so the wording is tested without a socket.

export interface HerePerson { userId: string; email?: string | null; color?: string; tool?: string | null }

/** A name to show for someone from their sign-in email: the part before the @, with a capital. "dev.k@x.com" becomes "Dev.k". */
export function firstName(email: string | null | undefined): string {
  const local = (email ?? '').split('@')[0].trim();
  return local ? local[0].toUpperCase() + local.slice(1) : 'Someone';
}

/** The others (not me) who have this tool open, once each, in a stable order. */
export function othersInTool<T extends HerePerson>(users: readonly T[], tool: string, meId?: string | null): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const u of users) {
    if (u.tool !== tool || u.userId === meId || seen.has(u.userId)) continue;
    seen.add(u.userId);
    out.push(u);
  }
  return out.sort((a, b) => firstName(a.email).localeCompare(firstName(b.email)) || a.userId.localeCompare(b.userId));
}

/** "Dev is here too", "Dev and Maya are here too", "Dev, Maya and 2 others are here too"; null when nobody is. */
export function hereLine(others: readonly HerePerson[]): string | null {
  const names = others.map((u) => firstName(u.email));
  if (names.length === 0) return null;
  if (names.length === 1) return `${names[0]} is here too`;
  if (names.length === 2) return `${names[0]} and ${names[1]} are here too`;
  const rest = names.length - 2;
  return `${names[0]}, ${names[1]} and ${rest} other${rest === 1 ? '' : 's'} are here too`;
}
