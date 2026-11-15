// A director's change, followed to the departments it touches. Pure: given the scenes a change is about, the breakdown (elements
// tagged to those scenes, by category), the department records linked to those scenes, the planned shots, the shoot day, and the
// confirmed crew with their crafts, it says which departments are affected, why, and who in them to tell. Nothing is guessed: a
// department appears only when something real links it to the scene.

export interface ImpactScene { id: string; scene_number: number; shoot_day?: number | null }
export interface ImpactCategory { id: string; key: string; label: string }
export interface ImpactElement { id: string; name: string; category_id: string; assigned_to?: string | null }
export interface ImpactRecord { kind: string; scene_ids: string[] }
export interface ImpactCrew { user_id: string; username?: string | null; craft: string | null; status: string }
export interface ImpactCraft { name: string; department: string }

export interface ImpactInput {
  sceneIds: string[];
  scenes: ImpactScene[];
  tags: Array<{ scene_id: string; element_id: string }>;
  elements: ImpactElement[];
  categories: ImpactCategory[];
  records: ImpactRecord[];
  shots: Array<{ scene_id: string }>;
  crew: ImpactCrew[];
  crafts: ImpactCraft[];
  /** Who is making the change: never told about their own change. */
  senderId?: string | null;
  /** The project's owner: not in the crew list, but can be assigned breakdown elements and must be told of those. */
  ownerId?: string | null;
}

/** The department a breakdown category belongs to (the departments of public.crafts). */
export const CATEGORY_DEPARTMENT: Record<string, string> = {
  cast: 'Production', extras: 'Production', stunts: 'Performance', props: 'Art', 'set-dressing': 'Art',
  wardrobe: 'Wardrobe, hair & makeup', makeup: 'Wardrobe, hair & makeup', vehicles: 'Production', sfx: 'Production',
  vfx: 'Editorial & post', sound: 'Sound', equipment: 'Camera',
};
/** The department that works in a role tool (the records linked to a scene). */
export const RECORD_DEPARTMENT: Record<string, { department: string; label: string }> = {
  costumes: { department: 'Wardrobe, hair & makeup', label: 'Costumes' }, makeup: { department: 'Wardrobe, hair & makeup', label: 'Makeup and hair' },
  vfxShots: { department: 'Editorial & post', label: 'VFX shots' }, editorial: { department: 'Editorial & post', label: 'Editorial handoff' },
  cameraReports: { department: 'Camera', label: 'Camera reports' }, stills: { department: 'Camera', label: 'Stills' },
  soundReports: { department: 'Sound', label: 'Sound reports' }, extras: { department: 'Production', label: 'Extras' },
  scriptNotes: { department: 'Direction', label: 'Script supervisor notes' },
};

export interface ImpactDepartment { department: string; why: string[]; people: Array<{ user_id: string; name: string; craft: string }> }
export interface ImpactRecipient { user_id: string; name: string; craft: string | null; why: string[] }
export interface Impact { departments: ImpactDepartment[]; recipients: ImpactRecipient[] }

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function changeImpact(i: ImpactInput): Impact {
  const scenes = new Set(i.sceneIds);
  const why = new Map<string, string[]>();
  const add = (department: string, reason: string) => { const l = why.get(department) ?? []; if (!l.includes(reason)) l.push(reason); why.set(department, l); };

  // The breakdown: elements tagged to these scenes, by category.
  const taggedIds = new Set(i.tags.filter((t) => scenes.has(t.scene_id)).map((t) => t.element_id));
  const catById = new Map(i.categories.map((c) => [c.id, c]));
  const byCategory = new Map<string, ImpactElement[]>();
  for (const e of i.elements) if (taggedIds.has(e.id)) byCategory.set(e.category_id, [...(byCategory.get(e.category_id) ?? []), e]);
  const direct = new Map<string, string[]>();
  for (const [catId, els] of byCategory) {
    const cat = catById.get(catId);
    const department = cat ? CATEGORY_DEPARTMENT[cat.key] : undefined;
    if (cat && department) add(department, `${plural(els.length, 'breakdown element')} (${cat.label.toLowerCase()}): ${els.slice(0, 3).map((e) => e.name).join(', ')}${els.length > 3 ? '…' : ''}`);
    for (const e of els) if (e.assigned_to) direct.set(e.assigned_to, [...(direct.get(e.assigned_to) ?? []), `${e.name} is assigned to you`]);
  }
  // The role tools' records linked to these scenes.
  const perKind = new Map<string, number>();
  for (const r of i.records) if (RECORD_DEPARTMENT[r.kind] && r.scene_ids.some((id) => scenes.has(id))) perKind.set(r.kind, (perKind.get(r.kind) ?? 0) + 1);
  for (const [kind, n] of perKind) add(RECORD_DEPARTMENT[kind].department, `${plural(n, 'record')} in ${RECORD_DEPARTMENT[kind].label}`);
  // Planned shots.
  const shotCount = i.shots.filter((s) => scenes.has(s.scene_id)).length;
  if (shotCount) add('Camera', `${plural(shotCount, 'planned shot')}`);
  // Scheduled: the people who run the day.
  const days = [...new Set(i.scenes.filter((s) => scenes.has(s.id) && s.shoot_day).map((s) => s.shoot_day as number))].sort((a, b) => a - b);
  if (days.length) { const label = `scheduled on day ${days.join(', ')}`; add('Production', label); add('Direction', label); }

  const deptOf = new Map(i.crafts.map((c) => [c.name, c.department]));
  const people = i.crew.filter((c) => c.status === 'confirmed' && c.craft && c.user_id !== i.senderId);
  const departments: ImpactDepartment[] = [...why.entries()].map(([department, reasons]) => ({
    department, why: reasons,
    people: people.filter((p) => deptOf.get(p.craft as string) === department).map((p) => ({ user_id: p.user_id, name: p.username || 'Crew', craft: p.craft as string })),
  })).sort((a, b) => a.department.localeCompare(b.department));

  const recipients = new Map<string, ImpactRecipient>();
  const ensure = (user_id: string, name: string, craft: string | null) => { const r = recipients.get(user_id) ?? { user_id, name, craft, why: [] as string[] }; recipients.set(user_id, r); return r; };
  for (const d of departments) for (const p of d.people) { const r = ensure(p.user_id, p.name, p.craft); r.why.push(...d.why.map((w) => `${d.department}: ${w}`)); }
  const nameOf = new Map(i.crew.map((c) => [c.user_id, c.username || 'Crew']));
  const craftOf = new Map(i.crew.map((c) => [c.user_id, c.craft]));
  // Only someone who can open the project is told: a confirmed crew member, or the owner (a pending or removed person is not).
  const confirmed = new Set(i.crew.filter((c) => c.status === 'confirmed').map((c) => c.user_id));
  for (const [uid, reasons] of direct) {
    if (uid === i.senderId || !(confirmed.has(uid) || uid === i.ownerId)) continue;
    const r = ensure(uid, nameOf.get(uid) ?? (uid === i.ownerId ? 'The owner' : 'Crew'), craftOf.get(uid) ?? null);
    r.why.push(...reasons);
  }
  return { departments, recipients: [...recipients.values()].sort((a, b) => a.name.localeCompare(b.name)) };
}

/** The notification a person gets: the change, the scenes, and what it touches for them. */
export function changeMessage(a: { title: string; notes: string; sceneNumbers: string; why: string[]; by?: string | null }): { title: string; body: string } {
  const scenes = a.sceneNumbers ? ` (scene ${a.sceneNumbers})` : '';
  const head = `${a.by ? `${a.by}: ` : ''}Change${scenes}: ${a.title}`.slice(0, 140);
  const note = a.notes.trim() ? `${a.notes.trim().slice(0, 300)}\n` : '';
  return { title: head, body: `${note}For you: ${a.why.slice(0, 4).join('; ')}`.slice(0, 600) };
}
