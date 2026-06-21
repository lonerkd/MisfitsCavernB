'use client';

/* =========================================================================
   SCREENPLAY EDITOR — live, industry-format writing surface.

   The document is a list of typed Blocks rendered with real screenplay
   margins (scene headings, action, character, parenthetical, dialogue,
   transition). You see the formatting AS YOU TYPE — not a flat textarea.

   Design notes:
   • `content` (Fountain-ish plain text) stays the source of truth. We
     deserialize it to blocks on external change, and serialize blocks back
     to content on edit (debounced).
   • Each block is its own contentEditable div with NO React children — text
     is written to the DOM via ref. We never setState on a keystroke, so the
     caret is never clobbered and large scripts stay responsive. Structural
     edits (Enter / Tab / Backspace-merge / paste) read the live DOM text
     first, then re-render.
   ========================================================================= */

import React, {
  useRef, useEffect, useLayoutEffect, useState, forwardRef, useImperativeHandle,
} from 'react';
import {
  type Block, type BlockType, newBlockId, contentToBlocks, serializeBlocks,
} from '@/lib/scriptos/blocks';
import { normalizeScreenplay, looksLikeScreenplay } from '@/lib/scriptos/normalize';
import type { ScriptFormat } from '@/lib/scriptos/parser';

export interface ScreenplayEditorHandle {
  insertElement: (type: BlockType) => void;
  insertText: (text: string) => void;
  getSelectionText: () => string;
  scrollToScene: (sceneNumber: number) => void;
  focus: () => void;
}

interface Props {
  content: string;
  onChange: (content: string) => void;
  format?: ScriptFormat;
  typewriter?: boolean;
  focusMode?: boolean;
  revisionColor?: string;
  onCaretType?: (type: BlockType | null) => void;
}

const TYPE_LABEL: Record<BlockType, string> = {
  scene: 'Scene Heading', action: 'Action', character: 'Character',
  parenthetical: 'Parenthetical', dialogue: 'Dialogue', transition: 'Transition', note: 'Note',
};

// Tab cycles through the elements a writer reaches for, in workflow order.
const CYCLE: BlockType[] = ['action', 'character', 'dialogue', 'parenthetical', 'scene', 'transition'];

// Auto-promote a line to a scene heading / transition the instant its text
// makes that unambiguous — the way professional editors retype as you go.
function autoType(cur: BlockType, text: string): BlockType | null {
  const t = text.trim();
  if (!t) return null;
  if (/^(INT|EXT|EST|I\/E|E\/I)\b[.\s/-]/i.test(t) || /^(INT|EXT)\.?\/(INT|EXT)\b/i.test(t)) {
    return cur === 'scene' ? null : 'scene';
  }
  if (cur === 'action' && t.length < 30 &&
      /^(CUT TO|FADE IN|FADE OUT|FADE TO|DISSOLVE TO|SMASH CUT TO|MATCH CUT TO|JUMP CUT TO)\b/i.test(t)) {
    return 'transition';
  }
  return null;
}

function nextTypeOnEnter(type: BlockType): BlockType {
  switch (type) {
    case 'scene': return 'action';
    case 'character': return 'dialogue';
    case 'parenthetical': return 'dialogue';
    case 'dialogue': return 'action';
    case 'transition': return 'scene';
    default: return 'action';
  }
}

function blockStyle(type: BlockType, focusMode: boolean, color: string): React.CSSProperties {
  const base: React.CSSProperties = {
    fontFamily: '"Courier Prime", Courier, monospace',
    fontSize: 16.5,
    lineHeight: 1.55,
    outline: 'none',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    color,
    caretColor: '#d7340b',
    minHeight: '1.55em',
    transition: 'background 0.15s',
  };
  switch (type) {
    case 'scene':
      return { ...base, textTransform: 'uppercase', fontWeight: 700, color: '#ffffff', marginTop: 30, marginBottom: 4, letterSpacing: 0.3 };
    case 'action':
      return { ...base, marginTop: 10, marginBottom: 10 };
    case 'character':
      return { ...base, textTransform: 'uppercase', fontWeight: 600, color: '#ffd9a0', marginLeft: '21ch', marginTop: 12, marginBottom: 0 };
    case 'parenthetical':
      return { ...base, fontStyle: 'italic', color: 'rgba(240,236,228,0.6)', marginLeft: '14ch', marginRight: '20ch', marginBottom: 0 };
    case 'dialogue':
      return { ...base, marginLeft: '10ch', marginRight: '16ch', marginBottom: 2 };
    case 'transition':
      return { ...base, textTransform: 'uppercase', fontWeight: 600, color: '#9a9a9a', textAlign: 'right', marginTop: 12, marginBottom: 12 };
    case 'note':
      return { ...base, color: '#eab308', background: 'rgba(234,179,8,0.08)', borderLeft: '2px solid #eab308', padding: '4px 10px', borderRadius: 4, marginTop: 8, marginBottom: 8 };
  }
}

// --- caret helpers ---------------------------------------------------------

function caretOffset(el: HTMLElement): number {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return 0;
  const range = sel.getRangeAt(0).cloneRange();
  range.selectNodeContents(el);
  range.setEnd(sel.getRangeAt(0).endContainer, sel.getRangeAt(0).endOffset);
  return range.toString().length;
}

function placeCaret(el: HTMLElement, pos: 'start' | 'end' | number) {
  el.focus();
  const sel = window.getSelection();
  if (!sel) return;
  const range = document.createRange();
  const textNode = el.firstChild;
  if (!textNode) {
    range.selectNodeContents(el);
    range.collapse(pos !== 'end');
  } else {
    const len = textNode.textContent?.length || 0;
    const offset = pos === 'start' ? 0 : pos === 'end' ? len : Math.min(pos, len);
    range.setStart(textNode, offset);
    range.collapse(true);
  }
  sel.removeAllRanges();
  sel.addRange(range);
}

// ===========================================================================

const ScreenplayEditor = forwardRef<ScreenplayEditorHandle, Props>(function ScreenplayEditor(
  { content, onChange, format = 'screenplay', typewriter = false, focusMode = false, revisionColor, onCaretType },
  ref,
) {
  const [blocks, setBlocks] = useState<Block[]>(() => contentToBlocks(content || '', format));
  const blocksRef = useRef<Block[]>(blocks);
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const lastEmitted = useRef<string>('');
  const emitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingFocus = useRef<{ id: string; caret: 'start' | 'end' | number } | null>(null);
  const focusedId = useRef<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const baseColor = revisionColor || '#e6e2da';

  // Deserialize content -> blocks when it changes from the OUTSIDE (load,
  // collaborator sync, import, find/replace). Skip our own serialized echo.
  useEffect(() => {
    if (content === lastEmitted.current) return;
    const next = contentToBlocks(content || '', format);
    blocksRef.current = next;
    setBlocks(next);
  }, [content, format]);

  // Write block text into the (childless) DOM nodes after structural renders,
  // and resolve any pending focus request.
  useLayoutEffect(() => {
    for (const b of blocks) {
      const el = nodeRefs.current[b.id];
      if (el && el.textContent !== b.text) el.textContent = b.text;
    }
    if (pendingFocus.current) {
      const { id, caret } = pendingFocus.current;
      pendingFocus.current = null;
      const el = nodeRefs.current[id];
      // Synchronous (not rAF): the caret must land before the next keystroke,
      // otherwise the first character types into the previous block.
      if (el) placeCaret(el, caret);
    }
  }, [blocks]);

  function syncFromDom() {
    for (const b of blocksRef.current) {
      const el = nodeRefs.current[b.id];
      if (el) b.text = el.textContent || '';
    }
  }

  function emit() {
    if (emitTimer.current) clearTimeout(emitTimer.current);
    emitTimer.current = setTimeout(() => {
      const text = serializeBlocks(blocksRef.current);
      lastEmitted.current = text;
      onChange(text);
    }, 180);
  }

  function commit(next: Block[], focus?: { id: string; caret: 'start' | 'end' | number }) {
    blocksRef.current = next;
    if (focus) pendingFocus.current = focus;
    setBlocks(next);
    const text = serializeBlocks(next);
    lastEmitted.current = text;
    onChange(text);
  }

  function indexOf(id: string): number {
    return blocksRef.current.findIndex((b) => b.id === id);
  }

  // --- typing: update model, never re-render ---
  function handleInput(id: string) {
    const el = nodeRefs.current[id];
    if (!el) return;
    const b = blocksRef.current.find((x) => x.id === id);
    if (!b) return;
    b.text = el.textContent || '';
    const auto = autoType(b.type, b.text);
    if (auto && auto !== b.type) {
      const caret = caretOffset(el);
      b.type = auto;
      pendingFocus.current = { id, caret };
      setBlocks([...blocksRef.current]);
      onCaretType?.(auto);
    }
    emit();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>, id: string) {
    const el = e.currentTarget;
    const i = indexOf(id);
    if (i < 0) return;
    const cur = blocksRef.current[i];

    // ENTER — split / new element
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      syncFromDom();
      const off = caretOffset(el);
      const full = cur.text;
      const before = full.slice(0, off);
      const after = full.slice(off);
      cur.text = before;
      // Splitting existing text keeps the type; pressing Enter at the end advances it.
      const newType: BlockType = after.trim() !== '' ? cur.type : nextTypeOnEnter(cur.type);
      const nb: Block = { id: newBlockId(), type: newType, text: after };
      const next = [...blocksRef.current];
      next.splice(i + 1, 0, nb);
      commit(next, { id: nb.id, caret: 'start' });
      return;
    }

    // TAB — cycle element type (Shift+Tab backwards)
    if (e.key === 'Tab') {
      e.preventDefault();
      syncFromDom();
      const ci = CYCLE.indexOf(cur.type);
      const start = ci < 0 ? 0 : ci;
      const delta = e.shiftKey ? -1 : 1;
      cur.type = CYCLE[(start + delta + CYCLE.length) % CYCLE.length];
      const next = [...blocksRef.current];
      commit(next, { id: cur.id, caret: caretOffset(el) });
      onCaretType?.(cur.type);
      return;
    }

    // BACKSPACE at start — merge into previous block
    if (e.key === 'Backspace') {
      const off = caretOffset(el);
      if (off === 0 && i > 0) {
        e.preventDefault();
        syncFromDom();
        const prev = blocksRef.current[i - 1];
        const mergePos = prev.text.length;
        prev.text = prev.text + cur.text;
        const next = blocksRef.current.filter((_, idx) => idx !== i);
        commit(next, { id: prev.id, caret: mergePos });
        return;
      }
    }

    // ARROWS across block boundaries
    if (e.key === 'ArrowUp' && i > 0) {
      const off = caretOffset(el);
      if (off === 0 || !el.textContent?.slice(0, off).includes('\n')) {
        // let native handle multi-line; only jump when on first visual line
        const rect = window.getSelection()?.getRangeAt(0).getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        if (rect && rect.top - elRect.top < 4) {
          e.preventDefault();
          const prev = blocksRef.current[i - 1];
          placeCaret(nodeRefs.current[prev.id]!, 'end');
        }
      }
    }
    if (e.key === 'ArrowDown' && i < blocksRef.current.length - 1) {
      const rect = window.getSelection()?.getRangeAt(0).getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      if (rect && elRect.bottom - rect.bottom < 4) {
        e.preventDefault();
        const nxt = blocksRef.current[i + 1];
        placeCaret(nodeRefs.current[nxt.id]!, 'start');
      }
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLDivElement>, id: string) {
    const text = e.clipboardData.getData('text/plain');
    if (!text) return;
    e.preventDefault();
    const multiline = /\n/.test(text.trim());

    if (multiline && looksLikeScreenplay(text)) {
      // Smart paste: normalize messy text into clean screenplay blocks.
      syncFromDom();
      const pastedBlocks = contentToBlocks(normalizeScreenplay(text), format);
      const i = indexOf(id);
      const cur = blocksRef.current[i];
      const docEmpty = blocksRef.current.length === 1 && (cur?.text.trim() ?? '') === '';
      let next: Block[];
      let focusBlock: Block;
      if (docEmpty) {
        next = pastedBlocks;
        focusBlock = pastedBlocks[pastedBlocks.length - 1];
      } else {
        next = [...blocksRef.current];
        next.splice(i + 1, 0, ...pastedBlocks);
        focusBlock = pastedBlocks[pastedBlocks.length - 1];
      }
      commit(next, { id: focusBlock.id, caret: 'end' });
      return;
    }

    // Plain snippet: insert at caret within the current block.
    const el = nodeRefs.current[id];
    if (el) {
      document.execCommand('insertText', false, text.replace(/\r/g, ''));
      handleInput(id);
    }
  }

  // --- imperative API for the toolbar / panels ---
  useImperativeHandle(ref, () => ({
    insertElement(type: BlockType) {
      syncFromDom();
      const fid = focusedId.current;
      const i = fid ? indexOf(fid) : blocksRef.current.length - 1;
      const cur = i >= 0 ? blocksRef.current[i] : null;
      // If the focused block is empty, retype it; else add a new one after it.
      if (cur && cur.text.trim() === '') {
        cur.type = type;
        commit([...blocksRef.current], { id: cur.id, caret: 'start' });
      } else {
        const nb: Block = { id: newBlockId(), type, text: '' };
        const next = [...blocksRef.current];
        next.splice((i < 0 ? blocksRef.current.length : i + 1), 0, nb);
        commit(next, { id: nb.id, caret: 'start' });
      }
    },
    insertText(text: string) {
      if (!text) return;
      syncFromDom();
      const fid = focusedId.current;
      const i = fid ? indexOf(fid) : blocksRef.current.length - 1;
      if (i < 0) return;
      if (looksLikeScreenplay(text) && /\n/.test(text.trim())) {
        const pasted = contentToBlocks(normalizeScreenplay(text), format);
        const next = [...blocksRef.current];
        next.splice(i + 1, 0, ...pasted);
        commit(next, { id: pasted[pasted.length - 1].id, caret: 'end' });
      } else {
        const cur = blocksRef.current[i];
        cur.text = cur.text + text;
        commit([...blocksRef.current], { id: cur.id, caret: 'end' });
      }
    },
    getSelectionText() {
      return window.getSelection()?.toString() || '';
    },
    scrollToScene(sceneNumber: number) {
      const scenes = blocksRef.current.filter((b) => b.type === 'scene');
      const target = scenes[sceneNumber - 1] || scenes[sceneNumber];
      if (target) {
        const el = nodeRefs.current[target.id];
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (el) placeCaret(el, 'end');
      }
    },
    focus() {
      const first = blocksRef.current[0];
      if (first) placeCaret(nodeRefs.current[first.id]!, 'start');
    },
  }), []);

  // Typewriter centering: keep the focused block near vertical center.
  function centerCaret(el: HTMLElement) {
    if (!typewriter) return;
    const scroller = containerRef.current?.parentElement;
    if (!scroller) return;
    const elRect = el.getBoundingClientRect();
    const scRect = scroller.getBoundingClientRect();
    const delta = (elRect.top + elRect.height / 2) - (scRect.top + scRect.height / 2);
    scroller.scrollBy({ top: delta, behavior: 'smooth' });
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%', maxWidth: 760, margin: '0 auto',
        padding: focusMode ? '12vh 8% 60vh' : '48px 64px 40vh',
      }}
    >
      {blocks.map((b) => (
        <div key={b.id} data-block-type={b.type} style={{ position: 'relative' }}>
          <div
            ref={(el) => { nodeRefs.current[b.id] = el; }}
            contentEditable
            suppressContentEditableWarning
            spellCheck
            data-placeholder={TYPE_LABEL[b.type]}
            onInput={() => handleInput(b.id)}
            onKeyDown={(e) => handleKeyDown(e, b.id)}
            onPaste={(e) => handlePaste(e, b.id)}
            onFocus={(e) => { focusedId.current = b.id; onCaretType?.(b.type); centerCaret(e.currentTarget); }}
            onClick={() => onCaretType?.(b.type)}
            className="sp-block"
            style={blockStyle(b.type, focusMode, baseColor)}
          />
        </div>
      ))}
      <style>{`
        .sp-block:empty:before {
          content: attr(data-placeholder);
          color: rgba(240,236,228,0.18);
          pointer-events: none;
        }
        .sp-block { transition: background .15s; border-radius: 3px; }
        .sp-block:focus { background: rgba(224,221,174,0.025); }
      `}</style>
    </div>
  );
});

export default ScreenplayEditor;
