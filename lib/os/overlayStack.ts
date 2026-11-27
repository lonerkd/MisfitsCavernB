'use client';

import { useEffect, useEffectEvent } from 'react';

/**
 * The layers open over the page right now — the Lounge's search and pinned
 * panels, a thread, Capture — as a stack. The bars' back chevron asks the
 * stack first: if a layer is open, back closes the topmost one and goes
 * nowhere. Back means "return to where I just was", and a layer sits over
 * where he just was; routing him to another page instead (the Lounge search
 * sending him to Projects) was the owner's repeat complaint, Nov 26, 2026.
 */
interface Layer {
  id: number;
  close: () => void;
}

const stack: Layer[] = [];
let nextId = 1;

/** Put a layer on the stack; the returned function takes it off again. */
export function pushOverlay(close: () => void): () => void {
  const id = nextId++;
  stack.push({ id, close });
  return () => {
    const i = stack.findIndex((l) => l.id === id);
    if (i >= 0) stack.splice(i, 1);
  };
}

/** Close the topmost open layer, if there is one. True when one was closed.
 *  The layer is taken off the stack first, so a second back press in the same
 *  moment can never close the same layer twice; the layer's own unregister
 *  (when it unmounts) then simply finds nothing. */
export function closeTopOverlay(): boolean {
  const top = stack.pop();
  if (!top) return false;
  top.close();
  return true;
}

/** How many layers are open (tests and debugging). */
export function overlayDepth(): number {
  return stack.length;
}

/** Register a layer while it is open; it unregisters when it closes or unmounts. */
export function useOverlayLayer(active: boolean, close: () => void): void {
  const closeEvent = useEffectEvent(close);
  useEffect(() => {
    if (!active) return;
    return pushOverlay(() => closeEvent());
  }, [active]);
}
