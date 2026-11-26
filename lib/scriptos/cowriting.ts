import { diffChars } from 'diff';
import * as Y from 'yjs';

export const SCRIPT_TEXT_FIELD = 'script';
export const LOCAL_EDIT_ORIGIN = Symbol('local-script-edit');
export const REMOTE_EDIT_ORIGIN = Symbol('remote-script-edit');

/** The script channel's Yjs messages (`script_<id>`): sent by the live provider and by the offline queue. */
export const YJS_UPDATE_EVENT = 'yjs_update';
export const YJS_SYNC_REQUEST_EVENT = 'yjs_sync_request';
export const YJS_SYNC_EVENT = 'yjs_sync';

const LOCAL_STATE_PREFIX = 'mc_script_yjs_';

export const scriptTextStateKey = (scriptId: string) => `${LOCAL_STATE_PREFIX}${scriptId}`;

export interface PersistedScriptText {
  state: number[];
  baseContent: string;
}

/**
 * The client id a seed of these words is written under, derived from the words themselves (two
 * FNV-1a passes, combined under 2^53). Every window seeding the same words seeds them under the
 * same id with the same item ids, so the seeds merge as one baseline — that was the one property
 * the old single fixed id (0x4d43) got right. Windows seeding different words (a content-only write
 * landed between their first loads) seed under different ids, so their baselines can no longer
 * collide: under one shared id, two different texts claimed the same item ids, both replicas'
 * state vectors agreed they were synced, and the texts silently differed — one window's read of
 * the script came out garbled (BACKLOG 3.33 leftover (i)). Distinct ids make a divergence visible
 * and recoverable instead; `rebaseSeededDoc` is the recovery.
 */
export function baselineClientIdFor(content: string): number {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < content.length; i++) {
    const code = content.charCodeAt(i);
    h1 = Math.imul(h1 ^ code, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ (code + i), 0x85ebca6b) >>> 0;
  }
  return h1 * 0x200000 + (h2 & 0x1fffff);
}

export function seedScriptText(doc: Y.Doc, content: string): void {
  if (!content) return;
  const baseline = new Y.Doc();
  baseline.clientID = baselineClientIdFor(content);
  baseline.getText(SCRIPT_TEXT_FIELD).insert(0, content);
  Y.applyUpdate(doc, Y.encodeStateAsUpdate(baseline), REMOTE_EDIT_ORIGIN);
  baseline.destroy();
}

/**
 * A document this session seeded from the plain-text column, meeting the server's stored shared
 * state: if the words that were seeded are not the words the server's state was built on (a
 * content-only write landed between this window's load and the state's), the two baselines must
 * not merge — the seeded words are replaced wholesale by the server's state, so this window
 * continues from the shared document everyone else holds.
 *
 * Only safe while the document still holds exactly the seeded words: a window that has typed
 * since seeding has edits of its own woven into its baseline, and replacing it would lose them,
 * so this refuses (false) and the ordinary merge stands. Also false when there is nothing to
 * rebase onto — the server state holds the seeded words, or cannot be read. True when the
 * document was rebased; the caller must not then also apply the same update the ordinary way.
 */
export function rebaseSeededDoc(doc: Y.Doc, seededContent: string, serverUpdate: Uint8Array): boolean {
  const text = doc.getText(SCRIPT_TEXT_FIELD);
  if (text.toString() !== seededContent) return false;
  const scratch = new Y.Doc();
  try {
    Y.applyUpdate(scratch, serverUpdate);
    const serverContent = scratch.getText(SCRIPT_TEXT_FIELD).toString();
    if (serverContent === seededContent) return false;
    doc.transact(() => {
      if (text.length) text.delete(0, text.length);
      Y.applyUpdate(doc, serverUpdate, REMOTE_EDIT_ORIGIN);
    }, REMOTE_EDIT_ORIGIN);
    return true;
  } catch {
    return false;
  } finally {
    scratch.destroy();
  }
}

export function applyScriptText(
  text: Y.Text,
  nextContent: string,
  origin: unknown = LOCAL_EDIT_ORIGIN,
): void {
  const currentContent = text.toString();
  if (currentContent === nextContent) return;

  const edits: Array<{ index: number; remove: number; insert: string }> = [];
  let index = 0;
  let edit: { index: number; remove: number; insert: string } | null = null;
  const flush = () => {
    if (edit) edits.push(edit);
    edit = null;
  };

  for (const part of diffChars(currentContent, nextContent)) {
    if (part.added || part.removed) {
      edit ??= { index, remove: 0, insert: '' };
      if (part.added) edit.insert += part.value;
      else {
        edit.remove += part.value.length;
        index += part.value.length;
      }
    } else {
      flush();
      index += part.value.length;
    }
  }
  flush();

  docTransaction(text, origin, () => {
    for (const change of edits.reverse()) {
      if (change.remove) text.delete(change.index, change.remove);
      if (change.insert) text.insert(change.index, change.insert);
    }
  });
}

function docTransaction(text: Y.Text, origin: unknown, update: () => void): void {
  text.doc!.transact(update, origin);
}

export function encodeScriptTextState(doc: Y.Doc, baseContent: string): PersistedScriptText {
  return { state: Array.from(Y.encodeStateAsUpdate(doc)), baseContent };
}

export function encodeScriptTextUpdate(doc: Y.Doc): string {
  return encodeScriptUpdate(Y.encodeStateAsUpdate(doc));
}

export function encodeScriptUpdate(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

export function decodeScriptTextUpdate(encoded: string | null): Uint8Array | null {
  if (!encoded) return null;
  try {
    const binary = atob(encoded);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
}

export function restoreScriptTextState(doc: Y.Doc, state: PersistedScriptText): void {
  Y.applyUpdate(doc, new Uint8Array(state.state), REMOTE_EDIT_ORIGIN);
}

export function applyScriptUpdate(doc: Y.Doc, update: Uint8Array, origin: unknown = REMOTE_EDIT_ORIGIN): void {
  Y.applyUpdate(doc, update, origin);
}

/**
 * Where an index in the old text lands after a change, so a caret survives
 * someone else typing. An insertion exactly at the index leaves it before the
 * new text (the other writer's words go in front of where you are about to type).
 */
export function mapThroughDelta(
  delta: ReadonlyArray<{ insert?: unknown; delete?: number; retain?: number }>,
  index: number,
): number {
  let old = 0;
  let shift = 0;
  for (const op of delta) {
    if (old > index) break;
    if (op.retain) old += op.retain;
    else if (op.insert !== undefined) {
      if (old < index) shift += typeof op.insert === 'string' ? op.insert.length : 1;
    } else if (op.delete) {
      shift -= Math.min(op.delete, Math.max(0, index - old));
      old += op.delete;
    }
  }
  return index + shift;
}

export interface MergedScript {
  /** The merged text. */
  content: string;
  /** The merged shared-document state, as the server stores it (`scripts.yjs_state`). */
  yjsState: string;
  /** The same state, as this device keeps it. */
  persisted: PersistedScriptText;
}

/**
 * A writer's edits that waited on the device (offline, tab closed) meeting what the server holds now.
 * The two shared documents are merged, so both sides' edits survive; neither overwrites the other.
 *
 * Null when it cannot be merged safely, and the caller must not guess: this device has no saved shared
 * document for the script, the server has none (a script only ever written as plain text), or either is
 * unreadable.
 */
export function mergeServerIntoLocal(local: PersistedScriptText | undefined, serverYjsState: string | null): MergedScript | null {
  if (!local?.state?.length) return null;
  const remote = decodeScriptTextUpdate(serverYjsState);
  if (!remote) return null;
  const doc = new Y.Doc();
  try {
    restoreScriptTextState(doc, local);
    Y.applyUpdate(doc, remote, REMOTE_EDIT_ORIGIN);
    return {
      content: doc.getText(SCRIPT_TEXT_FIELD).toString(),
      yjsState: encodeScriptTextUpdate(doc),
      persisted: encodeScriptTextState(doc, local.baseContent),
    };
  } catch {
    return null;
  } finally {
    doc.destroy();
  }
}

interface TextHunk {
  /** Where the changed words start in the base text. */
  start: number;
  /** Where they end in the base text (the same as the start for words only added). */
  end: number;
  /** What stands there instead. */
  replacement: string;
}

/** One side's changes to a text, as the stretches of the base it rewrote. */
function textHunks(base: string, changed: string): TextHunk[] {
  const hunks: TextHunk[] = [];
  let baseIndex = 0;
  let open: TextHunk | null = null;
  const flush = () => {
    if (open) hunks.push(open);
    open = null;
  };
  for (const part of diffChars(base, changed)) {
    if (part.added) {
      open ??= { start: baseIndex, end: baseIndex, replacement: '' };
      open.replacement += part.value;
    } else if (part.removed) {
      open ??= { start: baseIndex, end: baseIndex, replacement: '' };
      open.end += part.value.length;
      baseIndex += part.value.length;
    } else {
      flush();
      baseIndex += part.value.length;
    }
  }
  flush();
  return hunks;
}

/**
 * Three texts that share an ancestor: the words a script held when this device last saved it (the base,
 * `PersistedScriptText.baseContent`), the shared document's words now (ours), and the server's plain-text
 * column now (theirs). Returns ours with the column's new words folded in.
 *
 * The column can hold words the shared document never saw: `append_to_script` writes the column alone
 * (a beat pushed from the board while no editor was open), and the document's next save would write its
 * own words back over them — the appended words silently deleted. Where both sides rewrote the same
 * stretch of the base, the document's version stands: it is the living record, and its next save writes
 * the column anyway. A stretch counts as the same when the two overlap, or when one side's added words
 * land inside the other's stretch or on its first letter — a character diff aligns the letters the two
 * versions still share, so a rewritten word can present as an addition at its edge. Words added at the
 * far edge of a stretch, or past its end, stand beside it, and words both sides only added survive
 * from both.
 */
export function mergeScriptTexts(base: string, ours: string, theirs: string): string {
  if (theirs === base || ours === theirs) return ours;
  if (ours === base) return theirs;

  const ourHunks = textHunks(base, ours);
  const clashes = (a: TextHunk, b: TextHunk) => (a.start < b.end && b.start < a.end)
    || (a.start === a.end && b.start <= a.start && a.start < b.end)
    || (b.start === b.end && a.start <= b.start && b.start < a.end);
  const chosen: Array<TextHunk & { ours: boolean }> = [
    ...ourHunks.map((hunk) => ({ ...hunk, ours: true })),
    ...textHunks(base, theirs)
      .filter((hunk) => !ourHunks.some((our) => clashes(hunk, our)))
      .map((hunk) => ({ ...hunk, ours: false })),
  ];
  // In base order; at one spot, words only added come before a stretch being rewritten, and this
  // device's added words before the column's, so the result reads the way the edits happened.
  chosen.sort((a, b) => a.start - b.start
    || Number(a.start !== a.end) - Number(b.start !== b.end)
    || Number(b.ours) - Number(a.ours));

  let merged = '';
  let cursor = 0;
  for (const hunk of chosen) {
    merged += base.slice(cursor, hunk.start) + hunk.replacement;
    cursor = Math.max(cursor, hunk.end);
  }
  return merged + base.slice(cursor);
}

/**
 * Fold the server column's words into a restored shared document (see `mergeScriptTexts` for why the
 * column can be ahead of the document). Called when the editor opens, before anything is published or
 * saved, so the words the column gained while no editor was open join the document instead of being
 * overwritten by its next save. True when the document changed.
 */
export function reconcileScriptText(doc: Y.Doc, baseContent: string, serverContent: string): boolean {
  const text = doc.getText(SCRIPT_TEXT_FIELD);
  const ours = text.toString();
  const merged = mergeScriptTexts(baseContent, ours, serverContent);
  if (merged === ours) return false;
  applyScriptText(text, merged, REMOTE_EDIT_ORIGIN);
  return true;
}

const liveScripts = new Map<string, number>();

/**
 * While an editor holds a script's shared document open it is the one writer to the server (it merges and
 * saves, see `useScriptSync`). The autosave and the offline queue must not write the same row beside it.
 * Returns the function that lets go.
 */
export function holdScriptLive(scriptId: string): () => void {
  liveScripts.set(scriptId, (liveScripts.get(scriptId) ?? 0) + 1);
  return () => {
    const left = (liveScripts.get(scriptId) ?? 1) - 1;
    if (left <= 0) liveScripts.delete(scriptId);
    else liveScripts.set(scriptId, left);
  };
}

export const isScriptLive = (scriptId: string): boolean => liveScripts.has(scriptId);
