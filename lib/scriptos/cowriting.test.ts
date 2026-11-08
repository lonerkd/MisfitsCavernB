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
  mergeServerIntoLocal,
  REMOTE_EDIT_ORIGIN,
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

describe('mergeServerIntoLocal', () => {
  const BASE = 'INT. KITCHEN - NIGHT\n\nMAYA\nStill up.\n\nEXT. PIER - DAY\n\nBoats come in.\n';

  /** A device's saved state for a script it has edited. */
  const device = (edit: (text: Y.Text) => void) => {
    const doc = new Y.Doc();
    seedScriptText(doc, BASE);
    edit(doc.getText(SCRIPT_TEXT_FIELD));
    return { doc, persisted: encodeScriptTextState(doc, BASE) };
  };
  const insertAfter = (text: Y.Text, anchor: string, add: string) => text.insert(text.toString().indexOf(anchor) + anchor.length, add);

  it('keeps both sides\' edits: the offline writer\'s and the one the server already holds', () => {
    const offline = device((t) => insertAfter(t, 'Still up.', ' Alpha was offline.'));
    const online = device((t) => insertAfter(t, 'Boats come in.', ' Bravo stayed online.'));
    const merged = mergeServerIntoLocal(offline.persisted, encodeScriptTextUpdate(online.doc))!;
    expect(merged.content).toContain('Still up. Alpha was offline.');
    expect(merged.content).toContain('Boats come in. Bravo stayed online.');
    expect(merged.content.match(/Still up\./g)).toHaveLength(1); // no duplicated baseline
  });

  it('returns a state that spells exactly the merged text, on the server\'s side and the device\'s', () => {
    const offline = device((t) => insertAfter(t, 'Still up.', ' Alpha.'));
    const online = device((t) => insertAfter(t, 'Boats come in.', ' Bravo.'));
    const merged = mergeServerIntoLocal(offline.persisted, encodeScriptTextUpdate(online.doc))!;
    const server = new Y.Doc();
    Y.applyUpdate(server, decodeScriptTextUpdate(merged.yjsState)!);
    expect(server.getText(SCRIPT_TEXT_FIELD).toString()).toBe(merged.content);
    const again = new Y.Doc();
    restoreScriptTextState(again, merged.persisted);
    expect(again.getText(SCRIPT_TEXT_FIELD).toString()).toBe(merged.content);
    expect(merged.persisted.baseContent).toBe(BASE);
  });

  it('is the same either way round, and merging the result again changes nothing', () => {
    const a = device((t) => insertAfter(t, 'Still up.', ' Alpha.'));
    const b = device((t) => insertAfter(t, 'Boats come in.', ' Bravo.'));
    const ab = mergeServerIntoLocal(a.persisted, encodeScriptTextUpdate(b.doc))!;
    const ba = mergeServerIntoLocal(b.persisted, encodeScriptTextUpdate(a.doc))!;
    expect(ab.content).toBe(ba.content);
    expect(mergeServerIntoLocal(ab.persisted, ab.yjsState)!.content).toBe(ab.content);
  });

  it('keeps an edit to the same paragraph from both sides', () => {
    const a = device((t) => insertAfter(t, 'Still up.', ' Alpha.'));
    const b = device((t) => insertAfter(t, 'Still up.', ' Bravo.'));
    const merged = mergeServerIntoLocal(a.persisted, encodeScriptTextUpdate(b.doc))!;
    expect(merged.content).toContain('Alpha.');
    expect(merged.content).toContain('Bravo.');
  });

  it('does not merge what it cannot merge safely: no saved state here, none on the server, or unreadable ones', () => {
    const offline = device((t) => insertAfter(t, 'Still up.', ' Alpha.'));
    const server = encodeScriptTextUpdate(device(() => {}).doc);
    expect(mergeServerIntoLocal(undefined, server)).toBeNull();
    expect(mergeServerIntoLocal({ state: [], baseContent: BASE }, server)).toBeNull();
    expect(mergeServerIntoLocal(offline.persisted, null)).toBeNull();
    expect(mergeServerIntoLocal(offline.persisted, '')).toBeNull();
    expect(mergeServerIntoLocal(offline.persisted, '%%% not base64 %%%')).toBeNull();
    expect(mergeServerIntoLocal({ state: [1, 2, 3], baseContent: BASE }, server)).toBeNull();
  });
});
