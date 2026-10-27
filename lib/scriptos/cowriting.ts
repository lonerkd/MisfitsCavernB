import { diffChars } from 'diff';
import * as Y from 'yjs';

export const SCRIPT_TEXT_FIELD = 'script';
export const LOCAL_EDIT_ORIGIN = Symbol('local-script-edit');
export const REMOTE_EDIT_ORIGIN = Symbol('remote-script-edit');

const BASELINE_CLIENT_ID = 0x4d43;
const LOCAL_STATE_PREFIX = 'mc_script_yjs_';

export const scriptTextStateKey = (scriptId: string) => `${LOCAL_STATE_PREFIX}${scriptId}`;

export interface PersistedScriptText {
  state: number[];
  baseContent: string;
}

export function seedScriptText(doc: Y.Doc, content: string): void {
  if (!content) return;
  const baseline = new Y.Doc();
  baseline.clientID = BASELINE_CLIENT_ID;
  baseline.getText(SCRIPT_TEXT_FIELD).insert(0, content);
  Y.applyUpdate(doc, Y.encodeStateAsUpdate(baseline), REMOTE_EDIT_ORIGIN);
  baseline.destroy();
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
