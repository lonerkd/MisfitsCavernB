'use client';

// Where the cavern is: closed, full screen over the page, or a small window in the corner that stays while you work. It lives in the
// suite layout (the host is rendered there), so the same cave carries on across pages instead of starting again; the Sound deck, the
// corner player and the /cavern page only ask for it.

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export type CavernMode = 'closed' | 'full' | 'mini';

interface Cavern {
  mode: CavernMode;
  /** Full screen. */
  open: () => void;
  /** Shrink to the corner and keep going. */
  minimise: () => void;
  close: () => void;
}

const Ctx = createContext<Cavern | null>(null);

export function CavernProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<CavernMode>('closed');
  const open = useCallback(() => setMode('full'), []);
  const minimise = useCallback(() => setMode('mini'), []);
  const close = useCallback(() => setMode('closed'), []);
  const value = useMemo(() => ({ mode, open, minimise, close }), [mode, open, minimise, close]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** The cavern's place. Outside the provider (a split-screen pane, a test) it is closed and asking does nothing. */
const NONE: Cavern = { mode: 'closed', open: () => {}, minimise: () => {}, close: () => {} };
export function useCavern(): Cavern {
  return useContext(Ctx) ?? NONE;
}
