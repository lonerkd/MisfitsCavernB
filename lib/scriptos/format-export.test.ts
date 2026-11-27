import { describe, it, expect } from 'vitest';
import { videoScriptDoc, videoPublishPackage, proseArticleDoc, proseMarkdown, proseHtml, gameParts, gameScriptDoc, gameBuildSheet } from './format-export';
import { printHtml } from '@/lib/print/kit';
import type { StoredScript } from './storage';

const script = (title: string, format: string, content: string): StoredScript => ({
  id: 's1', title, format, content, createdAt: '2026-11-26', updatedAt: '2026-11-26',
});

const VIDEO = script('Fixing a Dead Camera', 'video-script', [
  'HOOK',
  '[Close-up of the broken camera]',
  'What if your camera died mid-shoot?',
  'HOST: It happened to me last spring.',
  '(beat)',
  'CHAPTER 1: THE FIX',
  '[B-roll: workbench and screwdriver]',
  'First, open the back panel.',
  '0:45 - SPONSOR',
  '[Logo animation]',
  'This video is brought to you by nobody.',
].join('\n'));

const PROSE = script('The Quiet Craft', 'prose', [
  '# The Quiet Craft of Editing',
  'The best cuts are the ones nobody notices on the first watch.',
  '## Rhythm before polish',
  'Editors talk about rhythm the way drummers do, in counts and rests.',
  '"The cut is where the film is written."',
  'So the work is listening first, and cutting second.',
].join('\n'));

describe('videoScriptDoc', () => {
  const html = printHtml(videoScriptDoc(VIDEO, '26 Nov 2026'));

  it('prints a two-column shooting layout: on-screen cues beside the spoken words', () => {
    expect(html).toContain('On screen');
    expect(html).toContain('Spoken');
    expect(html).toContain('Close-up of the broken camera');
    expect(html).toContain('What if your camera died mid-shoot?');
    expect(html).toContain('B-roll: workbench and screwdriver');
  });

  it('keeps the speaker tag and the delivery note with the spoken line', () => {
    expect(html).toContain('HOST: It happened to me last spring.');
    expect(html).toContain('(beat)');
  });

  it('heads each section with its name, and its written timestamp when it has one', () => {
    expect(html).toContain('HOOK');
    expect(html).toContain('CHAPTER 1: THE FIX');
    expect(html).toContain('0:45');
    expect(html).toContain('SPONSOR');
  });

  it('reports the spoken word count and an estimated running time in the facts', () => {
    const doc = videoScriptDoc(VIDEO, '26 Nov 2026');
    const meta = Object.fromEntries((doc.meta ?? []).map(([k, v]) => [k, String(v)]));
    expect(Number(meta['Spoken words'])).toBeGreaterThan(20);
    expect(meta['Estimated running time']).toMatch(/^\d+:\d{2}$/);
  });
});

describe('videoPublishPackage', () => {
  const pkg = videoPublishPackage(VIDEO, '26 Nov 2026');

  it('offers the document title and a title taken from the hook, labelled as such', () => {
    expect(pkg).toContain('Fixing a Dead Camera');
    expect(pkg).toContain('What if your camera died mid-shoot?');
    expect(pkg.toLowerCase()).toContain('hook');
  });

  it('builds the description from the script’s own opening words', () => {
    expect(pkg).toContain('It happened to me last spring.');
  });

  it('lists chapters with the timestamps written in the script, exactly as written', () => {
    expect(pkg).toContain('0:45 SPONSOR');
  });

  it('estimates the other chapter times from spoken words, and says they are estimates', () => {
    expect(pkg).toMatch(/0:00 HOOK/);
    expect(pkg.toLowerCase()).toContain('estimat');
  });

  it('derives tags from the title and section names, with no invented topics', () => {
    const lines = pkg.split('\n');
    const tagsLine = lines[lines.indexOf('## Tags') + 2] ?? '';
    expect(tagsLine.toLowerCase()).toContain('the fix');
    expect(tagsLine.toLowerCase()).not.toContain('photography tips');
  });
});

describe('proseArticleDoc', () => {
  const html = printHtml(proseArticleDoc(PROSE, '26 Nov 2026'));

  it('reads as an article: the opening paragraph leads, headings head sections', () => {
    expect(html).toContain('The best cuts are the ones nobody notices on the first watch.');
    expect(html).toContain('Rhythm before polish');
    expect(html).toContain('Editors talk about rhythm the way drummers do, in counts and rests.');
  });

  it('sets a pull quote apart from the body text', () => {
    const doc = proseArticleDoc(PROSE, '26 Nov 2026');
    const flat = JSON.stringify(doc.blocks);
    expect(flat).toContain('The cut is where the film is written.');
    expect(flat).toContain('"type":"note"');
  });

  it('reports a reading time from the word count', () => {
    const doc = proseArticleDoc(PROSE, '26 Nov 2026');
    const meta = Object.fromEntries((doc.meta ?? []).map(([k, v]) => [k, String(v)]));
    expect(meta['Reading time']).toBe('1 min');
  });
});

describe('proseMarkdown', () => {
  const md = proseMarkdown(PROSE);

  it('is a clean file a blog platform ingests: one title, section headings, paragraphs, the quote as a quote', () => {
    expect(md).toMatch(/^# The Quiet Craft/);
    expect(md).toContain('## Rhythm before polish');
    expect(md).toContain('> "The cut is where the film is written."');
    expect(md).toContain('So the work is listening first, and cutting second.');
  });

  it('does not leak the markdown markers of the source headings twice', () => {
    expect(md).not.toContain('## ##');
    expect(md).not.toContain('# #');
  });
});

describe('proseHtml', () => {
  it('is a complete standalone HTML document carrying the article', () => {
    const html = proseHtml(PROSE, '26 Nov 2026');
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('Rhythm before polish');
  });
});

const GAME = script('The Harbour Bell', 'game-script', [
  'ACT 1: THE HARBOUR',
  '[SET met_ines = false]',
  'Fog sits on the water. A bell rings somewhere.',
  'INES: You are late.',
  '* Apologise',
  '* Ask who she is',
  '[IF met_ines]',
  'INES: We have met.',
  '-> act1_dock',
  '',
  'LEVEL 2: THE LIGHTHOUSE',
  '[SFX: a door groans]',
  'The stairs climb into dark.',
  'CHOICE 1: Knock twice',
  'CHOICE 2: Slip inside',
].join('\n'));

describe('gameParts', () => {
  const parts = gameParts(GAME);

  it('reads the parts of the game in the order written', () => {
    expect(parts.map((p) => p.title)).toEqual(['ACT 1: THE HARBOUR', 'LEVEL 2: THE LIGHTHOUSE']);
  });

  it('classifies every beat of the first part: logic, narration, lines, choices, a jump', () => {
    expect(parts[0].beats.map((b) => b.kind)).toEqual(['logic', 'narration', 'line', 'choice', 'choice', 'logic', 'line', 'jump']);
  });

  it('splits a spoken line into its speaker and its words', () => {
    const line = parts[0].beats.find((b) => b.kind === 'line');
    expect(line).toMatchObject({ speaker: 'INES', text: 'You are late.' });
  });

  it('strips the choice marker, keeping the choice itself', () => {
    const choices = parts.flatMap((p) => p.beats.filter((b) => b.kind === 'choice').map((b) => b.text));
    expect(choices).toEqual(['Apologise', 'Ask who she is', 'Knock twice', 'Slip inside']);
  });

  it('keeps a jump’s target as written', () => {
    const jump = parts[0].beats.find((b) => b.kind === 'jump');
    expect(jump?.text).toBe('act1_dock');
  });
});

describe('gameScriptDoc', () => {
  const html = printHtml(gameScriptDoc(GAME, '26 Nov 2026'));

  it('prints one table per part, headed by the part’s name', () => {
    expect(html).toContain('ACT 1: THE HARBOUR');
    expect(html).toContain('LEVEL 2: THE LIGHTHOUSE');
  });

  it('reads as a game document: narration, speakers and their lines, choices marked as choices', () => {
    expect(html).toContain('Fog sits on the water. A bell rings somewhere.');
    expect(html).toContain('INES');
    expect(html).toContain('You are late.');
    expect(html).toContain('Choice');
    expect(html).toContain('Apologise');
    expect(html).toContain('Knock twice');
  });

  it('keeps the logic as written, and strips the brackets off a cue (the brackets are the notation)', () => {
    expect(html).toContain('[IF met_ines]');
    expect(html).toContain('[SET met_ines = false]');
    expect(html).toContain('SFX: a door groans');
    expect(html).not.toContain('[SFX');
  });

  it('shows where each jump goes, in the part and in the branch map', () => {
    expect(html).toContain('-&gt; act1_dock');
    const doc = gameScriptDoc(GAME, '26 Nov 2026');
    const flat = JSON.stringify(doc.blocks);
    expect(flat).toContain('Where the jumps go');
    expect(flat).toContain('act1_dock');
  });

  it('reports the shape of the game in the facts', () => {
    const doc = gameScriptDoc(GAME, '26 Nov 2026');
    const meta = Object.fromEntries((doc.meta ?? []).map(([k, v]) => [k, String(v)]));
    expect(meta['Parts']).toBe('2');
    expect(meta['Dialogue lines']).toBe('2');
    expect(meta['Player choices']).toBe('4');
    expect(meta['Jumps']).toBe('1');
  });
});

describe('gameBuildSheet', () => {
  const sheet = gameBuildSheet(GAME, '26 Nov 2026');

  it('is a Markdown handoff headed as a build sheet for the script', () => {
    expect(sheet).toMatch(/^# Build sheet — The Harbour Bell/);
  });

  it('outlines the structure: each part with its lines, choices and jumps counted', () => {
    expect(sheet).toContain('## Structure');
    expect(sheet).toContain('ACT 1: THE HARBOUR — 2 lines, 2 choices, 1 jump');
    expect(sheet).toContain('LEVEL 2: THE LIGHTHOUSE — 0 lines, 2 choices, 0 jumps');
  });

  it('names the cast with their line counts, the player counted by choices', () => {
    expect(sheet).toContain('## Cast');
    expect(sheet).toContain('INES — 2 lines');
    expect(sheet).toContain('PLAYER — 4 choices');
  });

  it('reproduces the script part by part: lines with their speakers, choices grouped, logic and cues verbatim', () => {
    expect(sheet).toContain('### ACT 1: THE HARBOUR');
    expect(sheet).toContain('INES: You are late.');
    expect(sheet).toContain('Player chooses:');
    expect(sheet).toContain('- Apologise');
    expect(sheet).toContain('- Ask who she is');
    expect(sheet).toContain('[IF met_ines]');
    expect(sheet).toContain('[SET met_ines = false]');
    expect(sheet).toContain('### LEVEL 2: THE LIGHTHOUSE');
    expect(sheet).toContain('[SFX: a door groans]');
    expect(sheet).toContain('- Knock twice');
  });

  it('lists every jump with the part it leaves from and the target as written', () => {
    expect(sheet).toContain('## Jumps');
    expect(sheet).toContain('ACT 1: THE HARBOUR -> act1_dock');
  });

  it('says plainly when nothing is written yet', () => {
    const empty = gameBuildSheet(script('Empty Game', 'game-script', ''), '26 Nov 2026');
    expect(empty).toContain('Nothing written yet.');
    const emptyDoc = gameScriptDoc(script('Empty Game', 'game-script', ''), '26 Nov 2026');
    expect(JSON.stringify(emptyDoc.blocks)).toContain('Nothing written yet.');
  });
});
