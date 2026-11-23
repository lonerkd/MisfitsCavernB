// Sending the editor's package to the editor: who the editorial crew are (confirmed, in the Editorial department, not the sender)
// and the notification they get, in numbers taken from the package itself. Pure; the panel sends it through `notify`.

import type { EditorPackage } from './editor-package';

export interface HandoffCrew { user_id: string; username?: string | null; craft: string | null; status: string }
export interface HandoffCraft { name: string; department: string }
export interface HandoffRecipient { user_id: string; name: string; craft: string }

/** The confirmed crew whose craft sits in the Editorial department (an editor, an assistant editor, a colourist...), minus the sender. */
export function editorialRecipients(crew: HandoffCrew[], crafts: HandoffCraft[], senderId?: string | null): HandoffRecipient[] {
  const editorial = new Set(crafts.filter((c) => c.department === 'Editorial').map((c) => c.name));
  const seen = new Set<string>();
  const out: HandoffRecipient[] = [];
  for (const c of crew) {
    if (c.status !== 'confirmed' || !c.craft || !editorial.has(c.craft) || c.user_id === senderId || seen.has(c.user_id)) continue;
    seen.add(c.user_id);
    out.push({ user_id: c.user_id, name: c.username || 'Crew', craft: c.craft });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** The notification: what is ready, and (in the producer's words) what is not. */
export function handoffMessage(pkg: EditorPackage, project: string, by?: string | null): { title: string; body: string } {
  const shots = pkg.scenes.flatMap((s) => s.shots);
  const selected = shots.filter((s) => s.selected).length;
  const head = `${by ? `${by}: ` : ''}Footage package for ${project}`.slice(0, 140);
  const counts = `${plural(pkg.scenes.length, 'scene')} shot, ${selected} of ${plural(shots.length, 'shot')} with a selected take, ${plural(pkg.offloads.verified + pkg.offloads.archived, 'card')} verified.`;
  const todo = pkg.ready ? 'Everything logged is ready for editorial.' : `Not usable yet: ${pkg.attention.slice(0, 4).join('; ')}${pkg.attention.length > 4 ? `; and ${pkg.attention.length - 4} more` : ''}.`;
  return { title: head, body: `${counts} ${todo}`.slice(0, 600) };
}
