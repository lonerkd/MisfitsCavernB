import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import {
  applyScriptText,
  applyScriptUpdate,
  decodeScriptTextUpdate,
  encodeScriptTextUpdate,
  encodeScriptTextState,
  LOCAL_EDIT_ORIGIN,
  mapThroughDelta,
  restoreScriptTextState,
  SCRIPT_TEXT_FIELD,
  seedScriptText,
} from './cowriting';

const BASE = 'MAYA\nStill up.\n';

function createDoc(content: string) {
  const doc = new Y.Doc();
  seedScriptText(doc, content);
  return { doc, text: doc.getText(SCRIPT_TEXT_FIELD) };
}

describe('ScriptOS CRDT co-writing', () => {
  it('merges simultaneous word-level edits to the same paragraph', () => {
    const a = createDoc(BASE);
    const b = createDoc(BASE);
    const aUpdates: Uint8Array[] = [];
    const bUpdates: Uint8Array[] = [];
    a.doc.on('update', (update) => aUpdates.push(update));
    b.doc.on('update', (update) => bUpdates.push(update));

    applyScriptText(a.text, 'MAYA\nStill really up.\n');
    applyScriptText(b.text, 'MAYA\nStill up late.\n');
    for (const update of aUpdates) applyScriptUpdate(b.doc, update);
    for (const update of bUpdates) applyScriptUpdate(a.doc, update);

    expect(a.text.toString()).toBe(b.text.toString());
    expect(a.text.toString()).toContain('really');
    expect(a.text.toString()).toContain('late');
    a.doc.destroy();
    b.doc.destroy();
  });

  it('keeps remote edits when the local author undoes their own edit', () => {
    const a = createDoc(BASE);
    const b = createDoc(BASE);
    const undo = new Y.UndoManager(a.text, { trackedOrigins: new Set([LOCAL_EDIT_ORIGIN]) });
    const aUpdates: Uint8Array[] = [];
    const bUpdates: Uint8Array[] = [];
    a.doc.on('update', (update) => aUpdates.push(update));
    b.doc.on('update', (update) => bUpdates.push(update));

    applyScriptText(a.text, 'MAYA\nStill really up.\n');
    applyScriptText(b.text, 'MAYA\nStill up late.\n');
    for (const update of bUpdates) applyScriptUpdate(a.doc, update);
    undo.undo();

    expect(a.text.toString()).toContain('late');
    expect(a.text.toString()).not.toContain('really');
    expect(aUpdates.length).toBeGreaterThan(0);
    undo.destroy();
    a.doc.destroy();
    b.doc.destroy();
  });

  it('restores offline state and merges edits received on reconnect', () => {
    const offline = createDoc(BASE);
    applyScriptText(offline.text, 'MAYA\nStill really up.\n');
    const saved = encodeScriptTextState(offline.doc, BASE);
    offline.doc.destroy();

    const peer = createDoc(BASE);
    const peerUpdates: Uint8Array[] = [];
    peer.doc.on('update', (update) => peerUpdates.push(update));
    applyScriptText(peer.text, 'MAYA\nStill up late.\n');

    const reconnected = createDoc('');
    restoreScriptTextState(reconnected.doc, saved);
    applyScriptUpdate(peer.doc, Y.encodeStateAsUpdate(reconnected.doc));
    for (const update of peerUpdates) applyScriptUpdate(reconnected.doc, update);

    expect(reconnected.text.toString()).toBe(peer.text.toString());
    expect(reconnected.text.toString()).toContain('really');
    expect(reconnected.text.toString()).toContain('late');
    reconnected.doc.destroy();
    peer.doc.destroy();
  });

  it('round-trips the state stored with the script row', () => {
    const source = createDoc(BASE);
    const encoded = encodeScriptTextUpdate(source.doc);
    const restored = createDoc('');
    const update = decodeScriptTextUpdate(encoded);
    expect(update).not.toBeNull();
    applyScriptUpdate(restored.doc, update!);
    expect(restored.text.toString()).toBe(BASE);
    source.doc.destroy();
    restored.doc.destroy();
  });
});

describe('mapThroughDelta', () => {
  const caretAfter = (base: string, edit: (t: Y.Text) => void, index: number) => {
    const doc = new Y.Doc();
    const t = doc.getText('t');
    t.insert(0, base);
    let mapped = index;
    t.observe((e) => { mapped = mapThroughDelta(e.delta, index); });
    edit(t);
    return { mapped, text: t.toString() };
  };
  it('moves a caret right of an insertion and leaves one left of it', () => {
    expect(caretAfter('hello world', (t) => t.insert(0, 'XX'), 5).mapped).toBe(7);
    expect(caretAfter('hello world', (t) => t.insert(8, 'XX'), 5).mapped).toBe(5);
  });
  it('keeps a caret before text inserted exactly at it', () => {
    expect(caretAfter('hello', (t) => t.insert(5, ' there'), 5).mapped).toBe(5);
  });
  it('pulls a caret back across a deletion, and to its start when inside it', () => {
    expect(caretAfter('hello world', (t) => t.delete(0, 3), 8).mapped).toBe(5);
    expect(caretAfter('hello world', (t) => t.delete(2, 6), 5).mapped).toBe(2);
  });
});
