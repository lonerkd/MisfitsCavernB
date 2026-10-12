// The owner's real scripts, scored without ever entering the repository.
//
// Put .fountain / .txt scripts in `.private-corpus/` (git-ignored). Real scripts
// have no labels, so what is checked is what needs none:
//   · lossless: the read has every source line, and the text round-trips;
//   · stable: an equivalent rewrite (CRLF, indentation, extra blanks…) changes no element;
//   · reviewed: every change in what a line is read as, since the last snapshot, is listed
//     for a person to judge — so a parser change shows exactly what it moved in YOUR scripts.
// Snapshots live in `.private-corpus/.snapshots/` (also ignored).
//   BRAIN_UPDATE=1 npx vitest run lib/scriptos/corpus/private   accepts the current read as the new snapshot.
// With no folder the whole file is skipped, so CI and other machines are unaffected.

import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { parseScript } from '../parser';
import { TRANSFORMS } from './metamorphic';

const DIR = path.resolve(process.cwd(), '.private-corpus');
const files = fs.existsSync(DIR) ? fs.readdirSync(DIR).filter((f) => /\.(fountain|txt)$/i.test(f)).sort() : [];
const SNAP = path.join(DIR, '.snapshots');

const typesOf = (text: string) => parseScript(text).lines.filter((l) => l.type !== 'empty').map((l) => l.type);

describe.skipIf(files.length === 0)('the private corpus (real scripts)', () => {
  for (const file of files) {
    describe(file, () => {
      const text = fs.readFileSync(path.join(DIR, file), 'utf8').replace(/\r\n?/g, '\n');
      const read = parseScript(text);

      it('is read losslessly: every source line is kept, in order', () => {
        expect(read.lines.map((l) => l.text).join('\n')).toBe(text);
      });

      for (const [name, fn] of Object.entries(TRANSFORMS)) {
        it(`reads the same after an equivalent rewrite (${name})`, () => {
          const a = typesOf(text);
          const b = typesOf(fn(text));
          expect(b.length).toBe(a.length);
          const moved = a.map((t, i) => (t === b[i] ? null : i)).filter((i): i is number => i !== null);
          expect(moved.length, `${moved.length} elements changed type`).toBe(0);
        });
      }

      it('has not changed how any line is read since the snapshot (or there is none yet)', () => {
        const now = read.lines.map((l, i) => ({ i, type: l.type }));
        const snapFile = path.join(SNAP, file + '.json');
        if (process.env.BRAIN_UPDATE || !fs.existsSync(snapFile)) {
          fs.mkdirSync(SNAP, { recursive: true });
          fs.writeFileSync(snapFile, JSON.stringify(now));
          return;
        }
        const before = JSON.parse(fs.readFileSync(snapFile, 'utf8')) as typeof now;
        const lines = text.split('\n');
        const changes = now
          .filter((n, k) => before[k] && before[k].type !== n.type)
          .map((n) => `line ${n.i + 1}: ${before[n.i].type} → ${n.type}   ${lines[n.i].trim().slice(0, 60)}`);
        expect(changes, `\n${changes.slice(0, 40).join('\n')}${changes.length > 40 ? `\n… and ${changes.length - 40} more` : ''}\n`).toEqual([]);
      });
    });
  }
});
