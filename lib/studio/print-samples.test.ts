// Writes every tool's printed HTML, with realistically long content, to
// /tmp/print-samples/<name>.html so a person can look at it. Skipped unless
// PRINT_SAMPLES=1, so the normal suite is unaffected:
//   PRINT_SAMPLES=1 npx vitest run lib/studio/print-samples.test.ts
import { describe, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { printHtml } from '@/lib/print/kit';
import { budgetDoc } from './budget-print';
import { locationsDoc } from './locations-print';
import { crewDoc } from './crew-print';
import { shotListDoc } from './shotlist-print';
import { castDoc } from './cast-print';
import { breakdownDoc } from './breakdown-print';
import { pitchDoc } from './pitch-print';
import { revisionsDoc } from './revisions-print';
import { continuityDoc, wardrobeDoc } from './continuity-print';
import { paperworkDoc } from './paperwork-print';
import { doodDoc } from './dood-print';
import { scheduleDoc } from './schedule-print';
import { callSheetDoc } from './call-sheet-print';
import { productionReportDoc } from './production-report-print';
import { editorPackage } from './editor-package';
import { editorPackageDoc } from './editor-package-print';
import { recordsDoc } from './records-print';
import { boardPrintHtml } from './boards-print';

const OUT = '/tmp/print-samples';
const N = 40;
const range = (n: number) => Array.from({ length: n }, (_, i) => i);
const LONG = 'A long note that keeps going so the cell has to wrap onto several lines, mentioning the ferry, the tide, the wet coat and a missing key; call the production office before 06:00 if the gate is locked.';
const NAMES = ['Maria Fernanda de Albuquerque-Santos', 'Jordan Ellis', 'Riley Okonkwo-Bridgewater', 'Sam'];
const fmt = (n: number) => `USD ${n.toLocaleString('en-US')}`;
const base = { project: 'The Pier at the End of Everything', generated: '21 Nov 2026' };

const docs: Record<string, () => string> = {
  budget: () => printHtml(budgetDoc({ ...base, accent: '#0f766e', format: fmt, labourPaid: 1500, unassigned: { committed: 400, paid: 250 },
    lines: range(N).map((i) => ({ label: `Department ${i + 1} — extended equipment hire and consumables for the harbour unit`, planned: 1000 + i * 137, committed: i * 20, paid: i * 90, left: 1000 + i * 27 - (i % 5) * 400 })),
    totals: { planned: 90000, committed: 8000, paid: 40000, left: 42000 } })),
  locations: () => printHtml(locationsDoc({ ...base, format: fmt, rows: range(N).map((i) => ({ name: `CAIS DO SODRÉ — LOWER PLATFORM ${i + 1}`, address: 'Praça do Duque da Terceira, 1200-161 Lisboa', contact: 'Rui Almeida 912 000 000', status: i % 2 ? 'Confirmed' : 'Scouting', permit: 'Permit granted', cost: 500 + i, scenes: [4, 9, 12, 15, 18, 21, 24], days: [1, 2, 3, 4], notes: LONG })) })),
  crew: () => printHtml(crewDoc({ ...base, crew: range(N).map((i) => ({ name: NAMES[i % 4], role: i % 3 ? 'Director of Photography' : 'First Assistant Director', status: ['confirmed', 'pending', null][i % 3], away: i % 7 === 0 ? '12–14 Mar and 20–22 Mar' : null })) })),
  shotlist: () => printHtml(shotListDoc({ ...base, filter: 'Status: planned', shots: range(N).map((i) => ({ scene: i + 1, number: `${i + 1}A`, size: 'Medium close-up', angle: 'Low', movement: i % 2 ? 'dolly' : 'static', lens: '35mm', description: LONG, status: i % 3 ? 'planned' : 'shot' })) })),
  cast: () => printHtml(castDoc({ ...base, rows: range(N).map((i) => ({ character: `CHARACTER NUMBER ${i + 1} THE ELDER`, actor: i % 4 ? NAMES[i % 4] : null, scenes: i + 3, days: [1, 2, 4, 5, 7, 8, 9, 10, 11, 12], arc: LONG })) })),
  breakdown: () => printHtml(breakdownDoc({ ...base, scenes: range(5).map((i) => ({ number: i + 1, heading: `EXT. THE OLD FERRY TERMINAL AT THE END OF THE QUAY ${i + 1}`, kind: 'EXT · DAY', pages: '1.5', day: 2,
    boxes: [{ label: 'Cast', names: range(12).map((j) => `CHARACTER ${j}`) }, { label: 'Props', names: range(25).map((j) => `Umbrella number ${j}`) }, { label: 'Vehicles', names: ['Ferry'] }] })) })),
  // Image URLs are https and will not load offline: the frames show as broken images.
  pitch: () => printHtml(pitchDoc({ title: 'The Pier at the End of Everything', accent: null, logline: `${LONG} ${LONG}`, generated: base.generated,
    concepts: range(9).map((i) => ({ url: `https://example.invalid/concept-${i}.jpg`, title: `Concept ${i + 1}` })),
    characters: range(12).map((i) => `CHARACTER ${i + 1}`), beats: range(14).map((i) => `Beat ${i + 1}: ${LONG}`) })),
  revisions: () => printHtml(revisionsDoc({ ...base, script: 'Pilot', revisions: range(N).map((i) => ({ colour: ['White', 'Blue', 'Pink', 'Yellow'][i % 4], label: `Revision ${i + 1} — production draft with scheduling changes`, date: `${i % 28 + 1} Mar 2026` })) })),
  continuity: () => printHtml(continuityDoc({ ...base, warnings: range(6).map((i) => `MAYA changes coat between scenes ${i + 4} and ${i + 6}. ${LONG}`),
    days: range(4).map((d) => ({ label: `Story day ${d + 1}`, scenes: range(10).map((i) => ({ number: d * 10 + i + 1, heading: 'EXT. THE OLD FERRY TERMINAL - DAY', time: 'Early morning', looks: [{ character: 'MAYA', look: LONG }, { character: 'LUIS', look: '' }] })) })) })),
  wardrobe: () => printHtml(wardrobeDoc({ ...base, characters: range(3).map((c) => ({ name: `CHARACTER ${c + 1}`, rows: range(14).map((i) => ({ number: i + 1, heading: 'INT. KITCHEN - NIGHT', storyDay: i % 4 + 1, shootDay: i % 6 + 1, look: i % 5 ? LONG : '', elements: ['Red coat (hero)', 'Scarf', 'Boots', 'Pocket watch'] })) })) })),
  paperwork: () => printHtml(paperworkDoc({ ...base, needed: range(6).map((i) => `Permit for LOCATION ${i}: scenes shoot there`),
    groups: ['Permits', 'Releases', 'Insurance'].map((label) => ({ label, rows: range(14).map((i) => ({ title: `Port authority filming consent number ${i + 1}`, with: NAMES[i % 4], status: 'Granted · expires in 9d', expires: '2026-03-20', hasFile: i % 2 === 0 })) })) })),
  dood: () => printHtml(doodDoc({ ...base, days: range(24).map((i) => i + 1), rows: range(N).map((i) => ({ name: `${NAMES[i % 4]} (${i})`, cells: range(24).map((d) => ['S', 'W', 'H', 'F', 'SF', ''][(d + i) % 6]), worked: 12 })) })),
  schedule: () => printHtml(scheduleDoc({ ...base, totalScenes: 40, totalPages: '60.0', days: range(6).map((d) => ({ day: d + 1, date: 'Thu 12 Mar', pages: '10.0', locations: 2, scenes: range(7).map((i) => ({ number: d * 7 + i + 1, heading: 'EXT. THE OLD FERRY TERMINAL AT THE END OF THE QUAY - GOLDEN HOUR', kind: 'EXT · DAY', cast: ['MAYA', 'LUIS', 'THE HARBOUR MASTER', 'FERRY CAPTAIN'], pages: '1.5', status: 'planned' })) })) })),
  'call-sheet': () => printHtml(callSheetDoc({ ...base, accent: '#12ab9f', day: 3, date: 'Thu 12 Mar 2026', generalCall: '06:00', shootingCall: '06:30', wrap: '18:00', location: 'Cais do Sodré, Praça do Duque da Terceira', weather: 'Clear, 14°', light: 'Sunrise 06:12 · Sunset 18:20',
    planNotes: [LONG, LONG], notes: `${LONG} ${LONG}`, scenes: range(14).map((i) => ({ number: i + 1, heading: 'EXT. THE OLD FERRY TERMINAL - GOLDEN HOUR' })), pages: '12.5', locations: ['Cais do Sodré', 'The Ferry'],
    cast: range(18).map((i) => ({ name: `CHARACTER ${i + 1}`, call: '07:00', remarks: LONG })), crew: range(30).map((i) => ({ name: NAMES[i % 4], role: 'Assistant camera operator', call: '06:00', remarks: i % 3 ? LONG : null })) })),
  'production-report': () => printHtml(productionReportDoc({ ...base, accent: null, day: 2, date: 'Fri 13 Mar 2026', call: '06:05', wrap: '18:40', scenesDone: 9, eighths: 120, shotsGot: 20, notes: `${LONG} ${LONG}`,
    scenes: range(14).map((i) => ({ number: i + 1, heading: 'EXT. THE OLD FERRY TERMINAL AT THE END OF THE QUAY', status: i % 2 ? 'wrapped' : 'planned' })), shots: range(N).map((i) => ({ number: `${i + 1}A`, scene: i % 14 + 1, size: i % 3 ? 'Wide' : null, status: i % 2 ? 'shot' : 'planned' })) })),
  'editor-package': () => printHtml(editorPackageDoc(editorPackage({
    scenes: range(12).map((i) => ({ id: `s${i}`, scene_number: i + 1, heading: 'INT. KITCHEN AT THE END OF THE LONG QUAY - DAY' })),
    shots: range(12).flatMap((i) => ['A', 'B', 'C'].map((l) => ({ id: `sh${i}${l}`, scene_id: `s${i}`, shot_number: `${i + 1}${l}` }))),
    takes: range(12).flatMap((i) => ['A', 'B'].map((l, k) => ({ id: `t${i}${l}`, take: `T${k + 1}`, circle: k === 0, scene_ids: [`s${i}`], shot_id: `sh${i}${l}`, slate: `${i + 1}-${k + 1}`, lens: '35mm', from_line: 3, to_line: 5, notes: LONG }))),
    camera: [], sound: [], offloads: range(5).map((i) => ({ card: `A00${i}`, status: 'pending' })),
    scriptNotes: range(12).map((i) => ({ id: `n${i}`, take: 'T1', circle: true, scene_ids: [`s${i}`], shot_id: `sh${i}A`, slate: '1-1', lens: '35mm', from_line: 3, to_line: 5, ...({ duration_s: 37 } as object) })),
  } as never), { project: base.project, generated: base.generated })),
  'records-costumes': () => printHtml(recordsDoc({ kind: 'costumes', project: base.project, accent: '#0f766e', generated: base.generated, rows: range(N).map((i) => ({ id: `${i}`, character: `CHARACTER ${i + 1}`, scene: `${i + 1}`, change: LONG, status: 'ready' })) })),
  'records-gear': () => printHtml(recordsDoc({ kind: 'gear', project: base.project, generated: base.generated, rows: range(N).map((i) => ({ id: `${i}`, name: `Camera package number ${i + 1} with extended accessories`, notes: LONG, status: 'ready' })) as never })),
  'records-scriptnotes': () => printHtml(recordsDoc({ kind: 'scriptNotes', project: base.project, generated: base.generated, rows: range(N).map((i) => ({ id: `${i}`, scene: `${i + 1}`, take: `${i}A`, from_line: 3, to_line: 9, circle: i % 2 === 0, notes: LONG })) as never })),
  'records-camerareports': () => printHtml(recordsDoc({ kind: 'cameraReports', project: base.project, generated: base.generated, rows: range(N).map((i) => ({ id: `${i}`, scene: `${i + 1}`, notes: LONG })) as never })),
  boards: () => boardPrintHtml({ name: 'Look board — the harbour at dawn' }, range(16).map((i) => ({ id: `i${i}`, board_id: 'b', project_id: 'p', media_id: i % 2 ? 'm' : null, note: LONG, x: (i % 4) * 24, y: Math.floor(i / 4) * 24, w: 22, z: i, created_by: null, created_at: '', updated_at: '' })),
    { titleOf: () => 'A long title for a reference still', srcOf: () => null, palette: ['#0f766e', '#b45309', '#1e3a8a'] }),
};

describe.skipIf(!process.env.PRINT_SAMPLES)('print samples', () => {
  mkdirSync(OUT, { recursive: true });
  for (const [name, build] of Object.entries(docs)) {
    it(name, () => { writeFileSync(`${OUT}/${name}.html`, build()); });
  }
});
