import { describe, expect, it } from 'vitest';
import { parseScript } from './parser';
import { importToContent } from './import';

// B2 of the deep-brain plan: Fountain handled completely (the exact layer, L0),
// and a .fountain file imported as written.

const types = (src: string) => parseScript(src).lines.filter((l) => l.type !== 'empty').map((l) => l.type);

describe('the Fountain title page', () => {
  const PAGE = 'Title:\n    _**BRICK & STEEL**_\nCredit: Written by\nAuthor: Stu Maschwitz\nDraft date: 1/20/2012\nContact:\n    Next Level Productions\n    1588 Mission Dr.\n\nINT. ROOM - DAY\n\nText.\n';

  it('reads the leading key lines, and the indented lines under them, as the title page', () => {
    expect(types(PAGE)).toEqual(['title', 'title', 'title', 'title', 'title', 'title', 'title', 'title', 'slug', 'action']);
  });

  it('ends at the first blank line', () => {
    const lines = parseScript(PAGE).lines;
    expect(lines.filter((l) => l.type === 'title')).toHaveLength(8);
    expect(lines.find((l) => l.text === 'INT. ROOM - DAY')?.type).toBe('slug');
  });

  it('is only at the very top: a Notes: line later in the script is not a title page', () => {
    expect(types('INT. ROOM - DAY\n\nNotes: bring the lamp\n')).toEqual(['slug', 'action']);
  });

  it('does not mistake a first line that ends in a colon (FADE IN:) for a title page', () => {
    expect(types('FADE IN:\n\nINT. ROOM - DAY\n\nText.\n')[0]).toBe('transition');
  });

  it('needs a known key: an ordinary first line is not a title page', () => {
    expect(types('A quiet man waits.\n\nINT. ROOM - DAY\n')).toEqual(['action', 'slug']);
  });

  it('survives leading blank lines', () => {
    expect(types('\n\nTitle: Harbor\n\nINT. ROOM - DAY\n')).toEqual(['title', 'slug']);
  });
});

describe('dual dialogue, as Fountain writes it (a caret after the second name)', () => {
  const SRC = 'INT. ROOM - DAY\n\nBRICK\nScrew retirement.\n\nSTEEL ^\nSkin the walls.\n\nMAYA\nSeparate.\n';

  it('marks both speeches', () => {
    const lines = parseScript(SRC).lines;
    const dual = (text: string) => lines.find((l) => l.text === text)?.meta?.isDualDialogue;
    expect(dual('BRICK')).toBe(true);
    expect(dual('Screw retirement.')).toBe(true);
    expect(dual('STEEL ^')).toBe(true);
    expect(dual('Skin the walls.')).toBe(true);
  });

  it('leaves the next speech alone', () => {
    const lines = parseScript(SRC).lines;
    expect(lines.find((l) => l.text === 'MAYA')?.meta?.isDualDialogue).toBeFalsy();
    expect(lines.find((l) => l.text === 'Separate.')?.meta?.isDualDialogue).toBeFalsy();
  });

  it('reads the name without the caret, in the cast and in the scene', () => {
    const r = parseScript(SRC);
    expect(r.scenes[0].characters).toEqual(['BRICK', 'STEEL', 'MAYA']);
    expect(r.characters.map((c) => c.name)).toContain('STEEL');
  });

  it('with a parenthetical in the dual speech, marks that too', () => {
    const r = parseScript('INT. ROOM - DAY\n\nBRICK\nHi.\n\nSTEEL ^\n(softly)\nHello.\n');
    expect(r.lines.find((l) => l.text === '(softly)')?.meta?.isDualDialogue).toBe(true);
    expect(r.lines.find((l) => l.text === 'Hi.')?.meta?.isDualDialogue).toBe(true);
  });

  it('a caret after a name that follows no speech marks nothing before it', () => {
    const r = parseScript('INT. ROOM - DAY\n\nSome action.\n\nSTEEL ^\nSkin the walls.\n');
    expect(r.lines.find((l) => l.text === 'Some action.')?.meta?.isDualDialogue).toBeFalsy();
  });

  it('the older forms still work (a lone ^ line, a leading ^)', () => {
    expect(parseScript('INT. ROOM - DAY\n\nBRICK\nHi.\n^\nSTEEL\nHello.\n').lines.some((l) => l.meta?.isDualDialogue)).toBe(true);
    expect(parseScript('INT. ROOM - DAY\n\nBRICK\nHi.\n\n^STEEL\nHello.\n').lines.some((l) => l.meta?.isDualDialogue)).toBe(true);
  });
});

describe('importing a .fountain file', () => {
  const SRC = 'Title: Harbor\nAuthor: Ana\n\n.SNIPER SCOPE\n\n= Maya arrives\n\n# ACT ONE\n\n@McBRIDE\n“Don’t move.”\n\n12\n\n(MORE)\n\n> CUT TO:\n\n[[remember to cut]]\n\n/* old draft */\n\n===\n\nINT. ROOM - DAY\n\nText — with a dash.\n';

  it('keeps every character of the text, changing only line endings', () => {
    expect(importToContent(SRC, 'x.fountain').content).toBe(SRC);
    expect(importToContent(SRC.replace(/\n/g, '\r\n'), 'x.fountain').content).toBe(SRC);
    expect(importToContent(SRC.replace(/\n/g, '\r'), 'x.fountain').content).toBe(SRC);
  });

  it('is read in full: every line kept, in order, with its Fountain type', () => {
    const { content } = importToContent(SRC, 'x.fountain');
    const r = parseScript(content);
    expect(r.lines.map((l) => l.text).join('\n')).toBe(SRC.replace(/\n$/, '') + '\n'.repeat(SRC.endsWith('\n') ? 1 : 0));
    const t = (text: string) => r.lines.find((l) => l.text === text)?.type;
    expect(t('Title: Harbor')).toBe('title');
    expect(t('.SNIPER SCOPE')).toBe('slug');
    expect(t('= Maya arrives')).toBe('synopsis');
    expect(t('# ACT ONE')).toBe('section');
    expect(t('@McBRIDE')).toBe('character');
    expect(t('> CUT TO:')).toBe('transition');
    expect(t('[[remember to cut]]')).toBe('note');
    expect(t('/* old draft */')).toBe('boneyard');
    expect(t('===')).toBe('pagebreak');
  });

  it('keeps the writer’s own punctuation and the lines a plain-text clean-up would drop', () => {
    const { content } = importToContent(SRC, 'x.fountain');
    expect(content).toContain('“Don’t move.”');
    expect(content).toContain('Text — with a dash.');
    expect(content).toContain('\n12\n');
    expect(content).toContain('(MORE)');
  });

  it('plain text is still tidied (quotes, dashes, page numbers), and Final Draft is still converted', () => {
    expect(importToContent('INT. ROOM - DAY\n\nHe says “hi” — twice.\n\n12.\n', 'x.txt').content).not.toContain('“');
    expect(importToContent('<FinalDraft><Paragraph Type="Scene Heading"><Text>INT. ROOM - DAY</Text></Paragraph></FinalDraft>', 'x.fdx').content).toContain('INT. ROOM - DAY');
  });
});
