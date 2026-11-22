// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { scriptToFdx } from './fdx-export';
import { importToContent } from './import';
import { parseScript } from './parser';

const script = (content: string) => ({ id: 's', title: 'Test & "Co"', content, format: 'screenplay' as const, createdAt: '', updatedAt: '' });

function headings(xml: string) {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  expect(doc.getElementsByTagName('parsererror').length).toBe(0);
  return [...doc.getElementsByTagName('Paragraph')]
    .filter((p) => p.getAttribute('Type') === 'Scene Heading')
    .map((p) => ({
      number: p.getAttribute('Number'),
      text: p.getElementsByTagName('Text')[0]?.textContent,
      length: p.getElementsByTagName('SceneProperties')[0]?.getAttribute('Length') ?? null,
    }));
}

const NUMBERED = `INT. HOUSE - DAY #1#

A room. Dust.

BRICK
Are they cold?

EXT. POOL - NIGHT #2A#

Water.
`;

describe('FDX for Movie Magic Scheduling: scene numbers and scene properties', () => {
  it('writes the typed scene numbers as Number and takes them out of the heading', () => {
    const h = headings(scriptToFdx(script(NUMBERED)));
    expect(h.map((x) => x.number)).toEqual(['1', '2A']);
    expect(h.map((x) => x.text)).toEqual(['INT. HOUSE - DAY', 'EXT. POOL - NIGHT']);
  });

  it('writes each scene\'s length in eighths as SceneProperties', () => {
    for (const x of headings(scriptToFdx(script(NUMBERED)))) expect(x.length).toMatch(/^(\d+ )?\d+\/8$|^\d+$/);
  });

  it('numbers a script with no typed numbers 1, 2, 3 and marks them as generated', () => {
    const xml = scriptToFdx(script('INT. A - DAY\n\nHi.\n\nEXT. B - NIGHT\n\nBye.\n'));
    expect(headings(xml).map((x) => x.number)).toEqual(['1', '2']);
    expect(xml).toContain('<!--cavern:autonumbered-->');
    // Re-importing must not turn generated numbers into typed ones.
    expect(importToContent(xml, 'a.fdx').content).not.toMatch(/#\d+#/);
  });

  it('round-trips typed numbers and keeps the text well-formed', () => {
    const xml = scriptToFdx(script(NUMBERED));
    const back = parseScript(importToContent(xml, 'a.fdx').content).scenes.map((s) => s.sceneNumber);
    expect(back).toEqual(['1', '2A']);
  });

  it('reads a Number attribute from a Final Draft file into a typed scene number', () => {
    const xml = '<FinalDraft><Content><Paragraph Type="Scene Heading" Number="12B"><Text>INT. LAB - DAY</Text></Paragraph><Paragraph Type="Action"><Text>Beakers.</Text></Paragraph></Content></FinalDraft>';
    expect(importToContent(xml, 'x.fdx').content).toContain('INT. LAB - DAY #12B#');
  });

  it('escapes markup in a heading', () => {
    const xml = scriptToFdx(script('INT. A&B <LAB> - DAY #3#\n\nHi.\n'));
    expect(headings(xml)[0]).toMatchObject({ number: '3', text: 'INT. A&B <LAB> - DAY' });
  });
});
