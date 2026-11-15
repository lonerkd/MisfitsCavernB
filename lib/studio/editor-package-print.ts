// The editor's package as a printed (or PDF) sheet: what to use, scene by scene, and what is still missing. Through the print kit.
import type { PrintDoc, PrintBlock } from '@/lib/print/kit';
import type { EditorPackage } from './editor-package';
import { takeSpan } from './lined-script';

const lines = (t: { from_line?: number | null; to_line?: number | null; off_camera?: boolean }) => {
  const span = t.from_line ? takeSpan(t, 99999) : null;
  if (!span) return null;
  return `${span.from === span.to ? span.from : `${span.from}–${span.to}`}${t.off_camera ? ' off camera' : ''}`;
};

export function editorPackageDoc(pkg: EditorPackage, a: { project: string; accent?: string | null; generated: string }): PrintDoc {
  const blocks: PrintBlock[] = [];
  blocks.push(pkg.ready
    ? { type: 'note', tone: 'info', text: 'Everything logged is ready for editorial: every shot with takes has a selected take, every shot scene has a sound report, and every card is verified.' }
    : pkg.attention.length > 0
      ? { type: 'note', tone: 'warn', text: `Not ready yet: ${pkg.attention.length} thing${pkg.attention.length === 1 ? '' : 's'} the editor cannot use.` }
      : { type: 'text', text: 'Nothing has been logged on set yet.' });
  if (pkg.attention.length > 0) blocks.push({ type: 'list', items: pkg.attention });

  for (const sc of pkg.scenes) {
    blocks.push({
      type: 'section', title: `Scene ${sc.scene_number}${sc.heading ? ` · ${sc.heading}` : ''}`,
      blocks: [
        { type: 'table', columns: [
          { key: 'shot', label: 'Shot', width: '10%' }, { key: 'take', label: 'Use take', width: '11%' }, { key: 'slate', label: 'Slate', width: '11%' },
          { key: 'lens', label: 'Lens', width: '10%' }, { key: 'lines', label: 'Lines', width: '12%' }, { key: 'notes', label: 'Notes' },
        ], rows: sc.shots.map((s) => ({ shot: s.shot, take: s.selected?.take ?? '— none selected —', slate: s.selected?.slate ?? null, lens: s.selected?.lens ?? null, lines: s.selected ? lines(s.selected) : null, notes: s.selected?.notes ?? null })) },
        { type: 'facts', items: [
          ['Takes logged', sc.takes], ['Camera reports', sc.cameraReports], ['Sound reports', sc.soundReports],
          ['Room tone', sc.soundReports ? (sc.roomTone ? 'Yes' : 'No') : '—'], ['Wild track', sc.soundReports ? (sc.wildTrack ? 'Yes' : 'No') : '—'],
        ] },
        ...(sc.soundNotes.length ? [{ type: 'list', items: sc.soundNotes } as PrintBlock] : []),
      ],
    });
  }

  blocks.push({
    type: 'section', title: 'Cards',
    blocks: [{ type: 'facts', items: [['Cards logged', pkg.offloads.total], ['Verified', pkg.offloads.verified], ['Archived', pkg.offloads.archived], ['Not verified', pkg.offloads.pending.length ? pkg.offloads.pending.join(', ') : 'None']] }],
  });

  return {
    title: 'Package for the editor', kind: 'Editorial', accent: a.accent,
    meta: [['Scenes', pkg.scenes.length], ['Ready', pkg.ready ? 'Yes' : 'No']],
    blocks, footer: a.project, generated: a.generated, orientation: 'portrait',
  };
}
