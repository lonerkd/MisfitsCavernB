// What the editor's Go to box (Ctrl/⌘ + G) can jump to: a scene number, a page
// ("p12"), or a character's name — their next scene, and the next one after
// that, wrapping at the end. Pure, so the target and the wording the box shows
// are testable without a browser.

import { sceneNumberFromInput } from './sceneviews';

export type GoToTarget =
  | { kind: 'scene'; scene: number }
  | { kind: 'page'; page: number }
  | { kind: 'character'; name: string; scene: number; index: number; total: number };

/** What Enter would do, with the line under the box; or why it won't. */
export type GoToResolution =
  | { target: GoToTarget; label: string }
  | { problem: string };

export interface GoToContext {
  /** Scenes in the script. */
  sceneCount: number;
  /** Headings, in order (index 0 is scene 1). */
  headings: string[];
  /** The pages that exist, each with the 1-based scene it opens on (0 before the first heading). */
  pages: { page: number; scene: number }[];
  /** Who speaks in each scene, in order. */
  perScene: string[][];
  /** The scene the caret is in, 0-based; -1 before the first heading. */
  currentScene: number;
}

/** Everyone who speaks, in the order they first speak, with their scene indices (0-based). */
export function speakingCast(perScene: string[][]): { name: string; scenes: number[] }[] {
  const byName = new Map<string, number[]>();
  perScene.forEach((names, i) => {
    for (const raw of names) {
      const name = raw.trim();
      if (!name) continue;
      const list = byName.get(name);
      if (!list) byName.set(name, [i]);
      else if (list[list.length - 1] !== i) list.push(i);
    }
  });
  return [...byName].map(([name, scenes]) => ({ name, scenes }));
}

/** The offset of a script line in the text: the parser splits on newlines, so line n is the n-th line. */
export function lineOffset(content: string, lineIndex: number): number {
  let at = 0;
  for (let n = 0; n < lineIndex; n++) {
    const next = content.indexOf('\n', at);
    if (next < 0) return content.length;
    at = next + 1;
  }
  // A CRLF script leaves the carriage return at the start of the line.
  return content[at] === '\r' ? at + 1 : at;
}

const PAGE = /^(?:p|pg|page)\.?\s*(\d+)$/i;

/** What Enter in Go to does for this input. */
export function resolveGoTo(input: string, ctx: GoToContext): GoToResolution {
  const text = input.trim();
  if (!text) return { problem: `${ctx.sceneCount} scenes · a number, p12, or a name` };

  if (/^\d+$/.test(text)) {
    const scene = sceneNumberFromInput(text, ctx.sceneCount);
    if (scene == null) return { problem: `No scene ${text} · 1 - ${ctx.sceneCount}` };
    return { target: { kind: 'scene', scene }, label: ctx.headings[scene - 1] || `Scene ${scene} of ${ctx.sceneCount}` };
  }

  const asPage = PAGE.exec(text);
  if (asPage) {
    const page = Number(asPage[1]);
    const row = ctx.pages.find((p) => p.page === page);
    if (!row) return { problem: `No page ${page} · 1 - ${Math.max(1, ctx.pages.length)}` };
    const where = row.scene > 0 ? `Scene ${row.scene}` : 'before the first scene';
    const heading = row.scene > 0 ? ctx.headings[row.scene - 1] : '';
    return { target: { kind: 'page', page }, label: heading ? `${where} · ${heading}` : where };
  }

  // Anything else is a character: exact name first, then a unique start of one.
  const cast = speakingCast(ctx.perScene);
  const wanted = text.toUpperCase();
  const exact = cast.filter((c) => c.name.toUpperCase() === wanted);
  const matches = exact.length ? exact : cast.filter((c) => c.name.toUpperCase().startsWith(wanted));
  if (!matches.length) return { problem: `No scene, page or character “${text}”` };
  if (matches.length > 1) return { problem: `${matches.map((c) => c.name).join(', ')} — keep typing` };

  const found = matches[0];
  const after = found.scenes.findIndex((s) => s > ctx.currentScene);
  const at = after === -1 ? 0 : after;
  return {
    target: { kind: 'character', name: found.name, scene: found.scenes[at], index: at + 1, total: found.scenes.length },
    label: `Scene ${found.scenes[at] + 1} · ${found.name}`,
  };
}
