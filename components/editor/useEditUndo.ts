'use client';

// Undo and redo for the script's text. Edits are grouped: typing pushes one
// snapshot per pause (600 ms), so one undo reverts a burst, not a keystroke.
// Switching scripts starts a fresh history.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useOnChange } from '@/lib/hooks/useOnChange';
import { MAX_HISTORY } from './editorPageParts';

interface History { past: string[]; future: string[] }
const EMPTY: History = { past: [], future: [] };

export function useEditUndo(scriptId: string | undefined, content: string, setContent: (text: string) => void) {
  const [history, setHistory] = useState<History>(EMPTY);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<string | null>(null);

  // No history carries over to another script.
  useOnChange(scriptId, () => setHistory(EMPTY));
  useEffect(() => { pending.current = null; }, [scriptId]);

  /** Call with the text as it was just before an edit. */
  const noteEdit = useCallback((prevContent: string) => {
    if (pending.current == null) pending.current = prevContent;
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => {
      const snapshot = pending.current;
      pending.current = null;
      if (snapshot == null) return;
      setHistory((h) => ({ past: [...h.past, snapshot].slice(-MAX_HISTORY), future: [] }));
    }, 600);
  }, []);

  /** A change made in one step (a reformat), undone in one step. */
  const commit = useCallback((prevContent: string) => {
    setHistory((h) => ({ past: [...h.past, prevContent].slice(-MAX_HISTORY), future: [] }));
  }, []);

  const undo = useCallback(() => {
    if (pushTimer.current) { clearTimeout(pushTimer.current); pushTimer.current = null; }
    setHistory((h) => {
      const waiting = pending.current;
      pending.current = null;
      const past = waiting != null ? [...h.past, waiting] : h.past;
      if (!past.length) return h;
      const prev = past[past.length - 1];
      setContent(prev);
      return { past: past.slice(0, -1), future: [content, ...h.future].slice(0, MAX_HISTORY) };
    });
  }, [content, setContent]);

  const redo = useCallback(() => {
    setHistory((h) => {
      if (!h.future.length) return h;
      const next = h.future[0];
      setContent(next);
      return { past: [...h.past, content].slice(-MAX_HISTORY), future: h.future.slice(1) };
    });
  }, [content, setContent]);

  return { noteEdit, commit, undo, redo };
}
