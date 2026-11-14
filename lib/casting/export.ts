import type { Casting, CastingNote } from '@/lib/supabase/casting';

/** Printable casting sheet (PDF via the browser's print). */
export function exportCastingSheet(title: string, castings: { character: string; cast?: Casting | null; notes: CastingNote[] }[]) {
  const w = window.open('', '_blank');
  if (!w) return;
  const rows = castings.map((c) => `
    <section style="page-break-inside: avoid; margin-bottom: 16px;">
      <h2 style="margin: 0 0 4px;">${c.character}</h2>
      <p><strong>Cast:</strong> ${c.cast?.username ?? '—'}</p>
      ${c.notes.length ? `<p><strong>Notes:</strong></p><ul>${c.notes.map((n) => `<li>${n.note}</li>`).join('')}</ul>` : ''}
    </section>`).join('');
  w.document.write(`<!doctype html><html><head><title>Casting — ${title}</title></head><body style="font-family: Georgia, serif; max-width: 700px; margin: 24px auto; line-height: 1.5;"><h1>Casting — ${title}</h1>${rows}<script>window.print()</script></body></html>`);
  w.document.close();
}
