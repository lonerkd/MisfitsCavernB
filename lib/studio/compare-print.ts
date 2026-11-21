// The printed change report for two versions of a script: the numbers first, then every changed scene with what went in and
// what came out. Built on the print kit; pure — the Compare view hands over the comparison it shows.
import type { PrintBlock, PrintDoc } from '@/lib/print/kit';
import { effectiveKind, sceneVisible, type ChangeFilter, type Comparison, type SceneDiff } from '@/lib/scriptos/compare';

export interface CompareReportInput {
  project: string;
  script: string;
  accent?: string | null;
  logo?: string | null;
  /** The names of the two versions ("Blue Revision", "Current draft"). */
  fromLabel: string;
  toLabel: string;
  comparison: Comparison;
  /** The filter on screen; the report lists only what it shows. */
  filter?: ChangeFilter;
  generated: string;
}

const KIND: Record<string, string> = { added: 'Added', removed: 'Cut', changed: 'Changed' };
const FILTER_NAME: Record<ChangeFilter, string> = { all: 'All changes', heading: 'Scene headings only', dialogue: 'Dialogue only', action: 'Action only' };
const TYPE_NAME: Record<string, string> = { heading: 'Heading', dialogue: 'Dialogue', action: 'Action' };

function sceneBlock(scene: SceneDiff, filter: ChangeFilter): PrintBlock {
  const name = scene.heading || 'Before the first scene';
  const moved = `moved from scene ${scene.from} to ${scene.to}`;
  const status = scene.status === 'moved' ? moved : scene.status === 'added' ? 'added' : scene.status === 'removed' ? 'cut' : scene.moved ? `changed, ${moved}` : 'changed';
  const rows = scene.rows
    .filter((r) => effectiveKind(r, filter) !== 'same')
    .map((r) => ({ change: KIND[r.kind], line: TYPE_NAME[r.category], before: r.left, after: r.right }));
  const blocks: PrintBlock[] = [];
  if (scene.status === 'moved') blocks.push({ type: 'text', text: 'The scene is word for word the same; it sits in a different place in the order.' });
  else blocks.push({ type: 'table', columns: [
    { key: 'change', label: 'Change', width: '11%' }, { key: 'line', label: 'Line', width: '11%' },
    { key: 'before', label: 'Before' }, { key: 'after', label: 'After' },
  ], rows });
  return { type: 'section', title: `${name} — ${status}`, blocks };
}

export function compareDoc(i: CompareReportInput): PrintDoc {
  const { stats, renames } = i.comparison;
  const filter = i.filter ?? 'all';
  const shown = i.comparison.scenes.filter((s) => sceneVisible(s, filter));
  const blocks: PrintBlock[] = [{
    type: 'facts',
    items: [
      ['Scenes added', stats.scenes.added], ['Scenes cut', stats.scenes.removed], ['Scenes changed', stats.scenes.changed], ['Scenes moved', stats.scenes.moved],
      ['Dialogue lines changed', stats.lines.dialogue], ['Action lines changed', stats.lines.action], ['Scene headings changed', stats.lines.heading],
      ['Words added', stats.words.added], ['Words cut', stats.words.removed], ['Pages changed', `${stats.pages.changed} of ${stats.pages.after}`],
    ],
  }];
  if (renames.length) blocks.push({ type: 'section', title: 'Renamed characters', blocks: [{ type: 'list', items: renames.map((r) => `${r.from} became ${r.to} (${r.cues} cue${r.cues === 1 ? '' : 's'} in ${r.scenes} scene${r.scenes === 1 ? '' : 's'})`) }] });
  if (i.comparison.identical) blocks.push({ type: 'note', text: 'The two versions are the same.' });
  else if (!shown.length) blocks.push({ type: 'note', text: renames.length ? 'Nothing else differs.' : 'Nothing under this filter differs.' });
  for (const s of shown) blocks.push(sceneBlock(s, filter));
  return {
    title: 'Script change report',
    kind: i.project,
    subtitle: `${i.script}: ${i.fromLabel} to ${i.toLabel}`,
    accent: i.accent, logo: i.logo,
    meta: [['From', i.fromLabel], ['To', i.toLabel], ['Showing', FILTER_NAME[filter]]],
    blocks,
    footer: `${i.project} · ${i.script}`,
    generated: i.generated,
  };
}
