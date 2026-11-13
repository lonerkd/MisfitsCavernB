// The printed crew list: who is on the project, in what role, and whether they have confirmed. Built on the print kit. Pure.
// Only what the Crew tab already shows: names, roles and status. No contact details leave the app through a printout.
import type { PrintDoc } from '@/lib/print/kit';

export interface CrewPrintRow { name: string; role: string; status: string | null; away: string | null }

export interface CrewPrintInput {
  project: string;
  accent?: string | null;
  crew: CrewPrintRow[];
  generated: string;
}

const STATUS: Record<string, string> = { confirmed: 'Confirmed', pending: 'Invited', declined: 'Declined' };

export function crewDoc(i: CrewPrintInput): PrintDoc {
  const confirmed = i.crew.filter((c) => (c.status ?? 'confirmed') === 'confirmed').length;
  const showAway = i.crew.some((c) => c.away);
  return {
    title: 'Cast and crew',
    kind: i.project,
    accent: i.accent,
    meta: [['People', i.crew.length], ['Confirmed', i.crew.length ? `${confirmed} of ${i.crew.length}` : null]],
    blocks: [{
      type: 'table',
      columns: [{ key: 'name', label: 'Name' }, { key: 'role', label: 'Role' }, { key: 'status', label: 'Status', width: '16%' }, ...(showAway ? [{ key: 'away', label: 'Away' }] : [])],
      rows: i.crew.map((c) => ({ name: c.name, role: c.role, status: STATUS[c.status ?? 'confirmed'] ?? c.status, away: c.away })),
      empty: 'No one is on the project yet.',
    }],
    footer: i.project,
    generated: i.generated,
  };
}
