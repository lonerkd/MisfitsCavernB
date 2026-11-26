import { useCallback, useEffect, useRef, useState } from 'react';
import { saveScript, type StoredScript } from '@/lib/scriptos/storage';

type ToastFn = (message: string, type?: 'success' | 'error' | 'info') => void;

// Saving for the editor page (restructure phase 7 — moved out of the page
// unchanged): the debounced autosave, the "only on this device" state with
// its one-time warning, and Save now. The page reads `saving` and
// `syncPending` for its status line and the Pill, and calls `handleSave`
// from the save chord and the menus.
export function useScriptSaving({ currentScript, content, setCurrentScript, toast, toastRef }: {
  currentScript: StoredScript | null;
  content: string;
  setCurrentScript: (s: StoredScript) => void;
  toast: ToastFn;
  toastRef: { current: ToastFn };
}) {
  const [saving, setSaving] = useState(false);
  // True while the latest save is only on this device (server unreachable);
  // storage retries it automatically. Drives the status bar + a one-time toast.
  const [syncPending, setSyncPending] = useState(false);
  const warnedUnsyncedRef = useRef(false);

  useEffect(() => {
    if (!currentScript) return;
    const timer = setTimeout(async () => {
      setSaving(true);
      const saved = await saveScript({ id: currentScript.id, title: currentScript.title, content });
      setSaving(false);
      const pending = !saved || !!saved.syncPending;
      setSyncPending(pending);
      if (pending && !warnedUnsyncedRef.current) {
        warnedUnsyncedRef.current = true;
        toastRef.current("Can't reach the server — your writing is saved on this device and will sync automatically.", 'error');
      } else if (!pending) {
        warnedUnsyncedRef.current = false;
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [content, currentScript, toastRef]);

  const handleSave = useCallback(async () => {
    if (!currentScript) return;
    setSaving(true);
    const saved = await saveScript({ id: currentScript.id, title: currentScript.title, content });
    if (saved) {
      setCurrentScript(saved);
      setSyncPending(!!saved.syncPending);
      if (saved.syncPending) toast('Saved on this device — it will sync when the server is reachable.', 'error');
      else toast('Screenplay saved to cloud.', 'success');
    } else {
      toast('Could not save — you appear to be signed out.', 'error');
    }
    setSaving(false);
  }, [currentScript, content, toast]);

  return { saving, syncPending, handleSave };
}
