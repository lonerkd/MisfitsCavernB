import type { CharacterProfile } from '@/lib/scriptos/bible';

/** Printable character bible (PDF via the browser's print). */
export function exportCharacterBible(title: string, profiles: CharacterProfile[]) {
  const w = window.open('', '_blank');
  if (!w) return;
  const rows = profiles.map((p) => `
    <section style="page-break-inside: avoid; margin-bottom: 18px;">
      <h2 style="margin: 0 0 6px;">${p.name}</h2>
      ${p.fullName ? `<p><strong>Full name:</strong> ${p.fullName}</p>` : ''}
      ${p.age ? `<p><strong>Age:</strong> ${p.age}</p>` : ''}
      ${p.description ? `<p><strong>Description:</strong> ${p.description}</p>` : ''}
      ${p.backstory ? `<p><strong>Backstory:</strong> ${p.backstory}</p>` : ''}
      ${p.motivation ? `<p><strong>Motivation:</strong> ${p.motivation}</p>` : ''}
      ${p.arc ? `<p><strong>Arc:</strong> ${p.arc}</p>` : ''}
      ${p.relationships ? `<p><strong>Relationships:</strong> ${p.relationships}</p>` : ''}
      ${p.notes ? `<p><strong>Notes:</strong> ${p.notes}</p>` : ''}
    </section>`).join('');
  w.document.write(`<!doctype html><html><head><title>${title} — Character Bible</title></head><body style="font-family: Georgia, serif; max-width: 700px; margin: 24px auto; line-height: 1.5;"><h1>Character Bible — ${title}</h1>${rows}<script>window.print()</script></body></html>`);
  w.document.close();
}
