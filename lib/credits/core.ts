// Credits are derived from the work (get_person_credits / get_press_kit):
// grouped per project for a person's profile, and per department for a
// film's press kit.

export interface PersonCredit {
  project_id: string; title: string; project_type: string | null; year: number | null; accent_color: string | null;
  kind: 'creator' | 'crew' | 'cast' | string; credit: string; character_name: string | null;
  department: string | null; portfolio_project_id: string | null;
}

/** "Gaffer", "Plays MAYA". */
export function creditLabel(c: { kind: string; credit: string; character_name: string | null }): string {
  if (c.kind === 'cast') return c.character_name ? `Plays ${c.character_name}` : 'Cast';
  return c.credit;
}

export interface ProjectCredits {
  project_id: string; title: string; project_type: string | null; year: number | null; accent_color: string | null;
  labels: string[]; primary: string; portfolio_project_id: string | null;
}

/** One entry per project, its credits in order (created it, crew, cast), duplicates dropped. */
export function groupByProject(rows: PersonCredit[]): ProjectCredits[] {
  const out = new Map<string, ProjectCredits>();
  for (const r of rows) {
    const e = out.get(r.project_id) ?? {
      project_id: r.project_id, title: r.title, project_type: r.project_type, year: r.year, accent_color: r.accent_color,
      labels: [], primary: '', portfolio_project_id: r.portfolio_project_id,
    };
    const label = creditLabel(r);
    if (!e.labels.includes(label)) e.labels.push(label);
    e.primary = e.labels[0];
    out.set(r.project_id, e);
  }
  return [...out.values()];
}

export interface KitCredit { user_id: string; username: string; kind: string; credit: string; character_name: string | null; department: string | null }

/** The press kit's credit block: the filmmaker(s), crew by department, then cast. */
export function pressKitSections(credits: KitCredit[]): Array<{ heading: string; people: Array<{ user_id: string; username: string; role: string }> }> {
  const sections: Array<{ heading: string; people: Array<{ user_id: string; username: string; role: string }> }> = [];
  const push = (heading: string, user_id: string, username: string, role: string) => {
    let s = sections.find((x) => x.heading === heading);
    if (!s) { s = { heading, people: [] }; sections.push(s); }
    if (!s.people.some((p) => p.user_id === user_id && p.role === role)) s.people.push({ user_id, username, role });
  };
  for (const c of credits) {
    if (c.kind === 'creator') push('Filmmaker', c.user_id, c.username, c.credit);
    else if (c.kind === 'crew') push(c.department ?? 'Crew', c.user_id, c.username, c.credit);
  }
  for (const c of credits) if (c.kind === 'cast') push('Cast', c.user_id, c.username, c.character_name ?? 'Cast');
  return sections;
}
