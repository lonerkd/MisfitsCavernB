import { describe, expect, it } from 'vitest';
import { contextFromProject, contextKey } from './context';
import { latestRevision, readPreviousDraft, withPreviousDraft } from './reading-context';
import { parseScript } from './parser';

const EARLIER = 'INT. KITCHEN - DAY\n\nMAYA\nWe should go.\n\nShe waits by the door.\n\nLEO\nNot yet.\n\nHe pours more coffee.\n';
const LATER = 'INT. KITCHEN - DAY\nMAYA\nWe should go.\nShe waits by the door.\nLEO\nNot yet.\nHe pours more coffee.\nMAYA\nNow.\nShe checks the window.\nLEO\nFine.\nThe kettle clicks off.\nMAYA\nCome on.\nHe follows her out.\nINT. HALL - NIGHT\nLEO\nQuiet.\nTheir steps echo.';

describe('the previous draft, read once', () => {
  it('reads the earlier text with the project context and keeps what it was sure of', () => {
    const ctx = contextFromProject([{ character_name: 'Maya' }], [], undefined, undefined, [{ name: 'Kitchen' }]);
    const d = readPreviousDraft(EARLIER, 'screenplay', ctx);
    expect(d.lines.find((l) => l.text === 'She waits by the door.')?.type).toBe('action');
    expect(d.lines.find((l) => l.text === 'MAYA')?.type).toBe('character');
  });

  it('is cached: the same text, format and context give the very same object, a changed one a new reading', () => {
    const ctx = contextFromProject([], [], undefined);
    const a = readPreviousDraft(EARLIER, 'screenplay', ctx);
    expect(readPreviousDraft(EARLIER, 'screenplay', ctx)).toBe(a);
    expect(readPreviousDraft(EARLIER, 'screenplay', contextFromProject([{ character_name: 'LEO' }], []))).not.toBe(a);
    expect(readPreviousDraft(`${EARLIER}\nMore.`, 'screenplay', ctx)).not.toBe(a);
  });

  it('reads the earlier text WITHOUT its own previous draft (no chain of drafts reading drafts)', () => {
    const inner = readPreviousDraft(EARLIER, 'screenplay', contextFromProject([], []));
    const outer = withPreviousDraft(contextFromProject([], []), EARLIER, 'screenplay');
    expect(outer.previousDraft).toBe(inner);
    expect(readPreviousDraft(LATER, 'screenplay', outer)).toBe(readPreviousDraft(LATER, 'screenplay', contextFromProject([], [])));
  });

  it('a person\'s line override finds its line in the earlier text by what the line says', () => {
    const ctx = contextFromProject([], [], undefined, [{ line_index: 99, forced_type: 'dialogue', line_text: 'She waits by the door.' }]);
    expect(readPreviousDraft(EARLIER, 'screenplay', ctx).lines.find((l) => l.text === 'She waits by the door.')?.type).toBe('dialogue');
  });

  it('with no earlier text the context is the context, untouched', () => {
    const ctx = contextFromProject([{ character_name: 'MAYA' }], []);
    expect(withPreviousDraft(ctx, null, 'screenplay')).toBe(ctx);
    expect(withPreviousDraft(ctx, '   ', 'screenplay')).toBe(ctx);
  });

  it('a context key notices the previous draft and the places, and an empty context is stable', () => {
    const base = contextFromProject([], []);
    expect(contextKey(base)).toBe(contextKey(contextFromProject([], [])));
    expect(contextKey(withPreviousDraft(base, EARLIER, 'screenplay'))).not.toBe(contextKey(base));
    expect(contextKey(contextFromProject([], [], undefined, undefined, [{ name: 'Harbor' }]))).not.toBe(contextKey(base));
  });

  it('feeds the reader: the same script reads better with it', () => {
    const ctx = withPreviousDraft(contextFromProject([], []), EARLIER, 'screenplay');
    const without = parseScript(LATER, 'screenplay').lines.find((l) => l.text === 'She waits by the door.')!;
    const withDraft = parseScript(LATER, 'screenplay', undefined, { context: ctx }).lines.find((l) => l.text === 'She waits by the door.')!;
    expect(without.type).toBe('dialogue');
    expect(withDraft.type).toBe('action');
  });
});

describe('the latest revision', () => {
  it('is the newest by date, whatever order they arrive in, and null for none', () => {
    const r = [{ date: '2026-11-02T10:00:00Z', n: 2 }, { date: '2026-11-03T10:00:00Z', n: 3 }, { date: '2026-11-01T10:00:00Z', n: 1 }];
    expect(latestRevision(r)?.n).toBe(3);
    expect(latestRevision([])).toBeNull();
  });
});
