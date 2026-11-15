import { describe, it, expect } from 'vitest';
import { editorPackage } from './editor-package';
import { editorPackageDoc } from './editor-package-print';
import { printHtml } from '@/lib/print/kit';
import { docToCsv } from '@/lib/print/csv';

const pkg = editorPackage({
  scenes: [{ id: 's1', scene_number: 1, heading: 'INT. KITCHEN - DAY' }],
  shots: [{ id: 'a', scene_id: 's1', shot_number: '1A' }, { id: 'b', scene_id: 's1', shot_number: '1B' }],
  takes: [
    { id: '1', take: 'T2', circle: true, scene_ids: ['s1'], shot_id: 'a', slate: 'A-2', lens: '35mm', from_line: 3, to_line: 5 },
    { id: '2', take: 'T1', circle: false, scene_ids: ['s1'], shot_id: 'b', notes: '<b>evil</b>' },
  ],
  camera: [], sound: [{ scene_ids: ['s1'], roomTone: 'yes' }], offloads: [{ card: 'A001', status: 'pending' }],
});

describe('the editor package sheet', () => {
  const html = printHtml(editorPackageDoc(pkg, { project: 'P', generated: 'd' }));
  it('names the selected take, its slate, lens and lines, and the shot with none selected', () => {
    expect(html).toContain('Scene 1');
    expect(html).toContain('T2');
    expect(html).toContain('A-2');
    expect(html).toContain('35mm');
    expect(html).toContain('3–5');
    expect(html).toContain('none selected');
  });
  it('says what is not ready, and lists the card that is not verified', () => {
    expect(html).toContain('Not ready yet');
    expect(html).toContain('A001');
  });
  it('is a table too, so it saves as a CSV', () => {
    expect(docToCsv(editorPackageDoc(pkg, { project: 'P', generated: 'd' }))).toContain('T2');
  });
});
