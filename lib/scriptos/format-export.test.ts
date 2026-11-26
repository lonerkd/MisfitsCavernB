import { describe, it, expect } from 'vitest';
import { videoScriptDoc, videoPublishPackage, proseArticleDoc, proseMarkdown, proseHtml } from './format-export';
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
