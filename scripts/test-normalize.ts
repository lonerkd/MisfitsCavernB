import { readFileSync } from 'fs';
import * as normMod from '../lib/scriptos/normalize';
import * as parseMod from '../lib/scriptos/parser';

// tsx CJS interop: named exports surface under .default in this harness.
const { normalizeScreenplay } = (normMod as any).default ?? normMod;
const { parseScript } = (parseMod as any).default ?? parseMod;

const path = process.argv[2];
const showLines = parseInt(process.argv[3] || '70', 10);
const raw = readFileSync(path, 'utf8');

const normalized = normalizeScreenplay(raw);
const { lines, scenes, characters } = parseScript(normalized, 'screenplay');
const counts: Record<string, number> = {};
for (const l of lines) counts[l.type] = (counts[l.type] || 0) + 1;

console.log('===== NORMALIZED first', showLines, 'lines =====');
console.log(normalized.split('\n').slice(0, showLines).join('\n'));
console.log('\n===== STATS =====');
console.log('raw chars:', raw.length, '-> normalized chars:', normalized.length);
console.log('element counts:', JSON.stringify(counts));
console.log('scenes:', scenes.length, '| characters:', characters.length);
console.log('top characters:', characters.slice(0, 12).map((c: any) => `${c.name}(${c.lines})`).join(', '));
