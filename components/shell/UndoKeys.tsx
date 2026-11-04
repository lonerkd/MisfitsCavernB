'use client';

import { useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import { matchChord } from '@/lib/os/chords';
import { peekUndo, undoLast } from '@/lib/os/undo';

const typing = (t: EventTarget | null): boolean => {
  const el = t as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable || !!el.closest?.('[role="textbox"], [role="searchbox"], [role="combobox"]'));
};

/** Ctrl/⌘ Z outside a text box, or O in the Caps Lock deck (`mc-undo`), takes back the last thing done in this tool (`lib/os/undo.ts`). In a text box, the box keeps its own undo. */
export default function UndoKeys() {
  const { toast } = useToast();
  useEffect(() => {
    const run = async () => {
      const result = await undoLast();
      if (result.status === 'empty') return;
      if (result.status === 'undone') toast(`Undone: ${result.label}`, 'success');
      else toast(`Could not undo “${result.label}”: ${result.message}`, 'error');
    };
    const onKey = (e: KeyboardEvent) => {
      if (matchChord(e)?.id !== 'undo' || typing(e.target)) return;
      if (!peekUndo()) return; // nothing to take back here: leave the key to the browser
      e.preventDefault();
      void run();
    };
    const onDeck = () => {
      if (peekUndo()) void run();
      else toast('Nothing to undo here', 'info');
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mc-undo', onDeck);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('mc-undo', onDeck); };
  }, [toast]);
  return null;
}
