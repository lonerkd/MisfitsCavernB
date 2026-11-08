// The portfolio one-sheet: one printed page about a person for a meeting, a pitch or a festival desk: who they are, their best work,
// their festivals (verified by the film's team, or reported by them, and the page says which) and the films they are credited on,
// with the address of their live page. Built on the print kit. Pure: the same person gives the same page.
import type { PortfolioPageData } from '@/lib/supabase/public';
import type { PrintBlock, PrintDoc } from '@/lib/print/kit';
import { headerOf } from './header';
import { groupPageCredits } from './page-credits';
import { laurelLine } from './laurels';

const MAX_PIECES = 6;
const MAX_FILMS = 12;
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

export function oneSheet(data: PortfolioPageData, pageUrl: string, generated: string): PrintDoc {
  const head = headerOf(data.profile);
  const blocks: PrintBlock[] = [];

  if (head.bio) blocks.push({ type: 'text', text: clip(head.bio, 600), lead: true });

  if (data.pieces.length > 0) {
    blocks.push({
      type: 'section', title: 'Selected work',
      blocks: [{
        type: 'table',
        columns: [{ key: 'title', label: 'Title', width: '34%' }, { key: 'made', label: 'Role · year', width: '22%' }, { key: 'about', label: 'About' }],
        rows: data.pieces.slice(0, MAX_PIECES).map((p) => ({
          title: p.title,
          made: [p.role, p.category, p.year].filter(Boolean).join(' · '),
          about: [clip(p.description ?? '', 160), ...p.laurels.slice(0, 3).map(laurelLine)].filter(Boolean).join('\n'),
        })),
      }, ...(data.pieces.length > MAX_PIECES ? [{ type: 'note', text: `${data.pieces.length - MAX_PIECES} more at the page below.` } as PrintBlock] : [])],
    });
  }

  if (data.verified_laurels.length > 0) {
    blocks.push({
      type: 'section', title: 'Festivals · recorded by the film’s own team',
      blocks: [{ type: 'list', items: data.verified_laurels.slice(0, 10).map((l) => `${l.name} — ${l.film}`) }],
    });
  }

  const films = groupPageCredits(data.credits).slice(0, MAX_FILMS);
  if (films.length > 0) {
    blocks.push({
      type: 'section', title: 'Credits',
      blocks: [{
        type: 'table',
        columns: [{ key: 'film', label: 'Film' }, { key: 'did', label: 'Credit' }, { key: 'year', label: 'Year', align: 'right', width: '10%' }],
        rows: films.map((f) => ({ film: f.title, did: f.labels.join(', '), year: f.year })),
      }],
    });
  }

  blocks.push({ type: 'section', title: 'Full portfolio', blocks: [{ type: 'columns', columns: [[{ type: 'text', text: pageUrl }], [{ type: 'qr', url: pageUrl, caption: 'Scan for the live page' }]] }] });

  return {
    title: head.name,
    kind: 'Portfolio',
    subtitle: head.line || undefined,
    meta: [['Status', head.openToWork ? 'Open to work' : null], ['Work', data.pieces.length ? `${data.pieces.length} piece${data.pieces.length === 1 ? '' : 's'}` : null]],
    blocks,
    footer: pageUrl,
    generated,
  };
}
