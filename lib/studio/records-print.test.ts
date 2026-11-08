import { describe, it, expect } from 'vitest';
import { RECORD_PRINT, recordKindOfView, recordsDoc } from './records-print';
import { printHtml } from '@/lib/print/kit';
import { PRODUCTION_VIEWS } from '@/lib/os/progress';

describe('printing the role tools', () => {
  it('every record tool has a spec on a real Production view, and each view maps back to its kind', () => {
    const kinds = Object.keys(RECORD_PRINT) as Array<keyof typeof RECORD_PRINT>;
    expect(kinds).toHaveLength(21);
    for (const k of kinds) {
      expect(PRODUCTION_VIEWS as readonly string[], k).toContain(RECORD_PRINT[k].view);
      expect(recordKindOfView(RECORD_PRINT[k].view), k).toBe(k);
      expect(RECORD_PRINT[k].columns.length, k).toBeGreaterThan(1);
    }
    expect(recordKindOfView('breakdown')).toBeNull();
  });

  it('prints a tool’s records in its columns, with the project as the kind and the entry count', () => {
    const doc = recordsDoc({ kind: 'costumes', project: 'The Pier', accent: '#0f766e', generated: 'd', rows: [
      { id: '1', character: 'MAYA', scene: '12', change: 'Wet coat', status: 'ready' }, { id: '2', character: 'LUIS', scene: '', change: null, status: 'fitting' },
    ] });
    expect(doc).toMatchObject({ title: 'Costumes', kind: 'The Pier', accent: '#0f766e', orientation: 'portrait' });
    const html = printHtml(doc);
    for (const s of ['MAYA', 'Wet coat', 'ready', 'fitting', '<dt>Entries</dt><dd>2</dd>']) expect(html).toContain(s);
  });

  it('resolves a linked scene and character over the typed text, and prints a circled flag as Yes', () => {
    const html = printHtml(recordsDoc({ kind: 'costumes', project: 'P', generated: 'd', rows: [{ id: '1', character: 'old', scene: 'old', status: 'ready' }], sceneOf: () => '12, 14', characterOf: () => 'MAYA' }));
    expect(html).toContain('<td class="left">MAYA</td><td class="left">12, 14</td>');
    const sup = printHtml(recordsDoc({ kind: 'scriptNotes', project: 'P', generated: 'd', rows: [{ id: '1', scene: '3', circle: true }, { id: '2', scene: '4', circle: false }] }));
    expect(sup).toContain('>Yes<');
  });

  it('says so when there is nothing logged, and wide tools print in landscape', () => {
    expect(printHtml(recordsDoc({ kind: 'gear', project: 'P', generated: 'd', rows: [] }))).toContain('Nothing has been logged yet.');
    expect(recordsDoc({ kind: 'cameraReports', project: 'P', generated: 'd', rows: [] }).orientation).toBe('landscape');
  });
});
