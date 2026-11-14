import type { World } from '@/lib/world/world';

/** Printable world bible (PDF via the browser's print). */
export function exportWorldBible(world: World) {
  const w = window.open('', '_blank');
  if (!w) return;
  const section = (title: string, rows: string[]) => `
    <section style="page-break-inside: avoid; margin-bottom: 18px;">
      <h2>${title}</h2>
      ${rows.length ? rows.join('') : '<p><em>Nothing yet.</em></p>'}
    </section>`;
  const locations = world.locations.map((l) => `<p><strong>${l.name}</strong>${l.lat != null && l.lng != null ? ` (${l.lat}, ${l.lng})` : ''}${l.description ? ` — ${l.description}` : ''}${l.mood ? ` <em>${l.mood}</em>` : ''}</p>`).join('');
  const lore = world.lore.map((l) => `<p><strong>${l.title}</strong>${l.body ? ` — ${l.body}` : ''}</p>`).join('');
  const rules = world.rules.map((r) => `<li>${r.rule}</li>`).join('');
  const timeline = world.timeline.map((t) => `<li><strong>${t.when}</strong> — ${t.what}</li>`).join('');
  w.document.write(`<!doctype html><html><head><title>World Bible</title></head><body style="font-family: Georgia, serif; max-width: 700px; margin: 24px auto; line-height: 1.5;"><h1>World Bible</h1>${section('Locations', [locations])}${section('Lore', [lore])}${section('Rules', [`<ul>${rules}</ul>`])}${section('Timeline', [`<ul>${timeline}</ul>`])}<script>window.print()</script></body></html>`);
  w.document.close();
}
