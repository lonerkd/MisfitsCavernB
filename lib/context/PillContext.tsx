'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────────────
// The Pill is the ecosystem's morphing command surface — a single Dynamic
// Island-style capsule that adapts to where you are and what you're doing.
// Pages don't render into it directly; they publish a *descriptor* of their
// live state (read-outs, toggles, actions) and the Pill decides how to reveal
// it as the cursor engages. Everything here is real wiring: a toggle's
// onToggle flips genuine page state, a field's value is live data — never
// decoration. This keeps the aggregate honest while letting the chrome morph.
// ─────────────────────────────────────────────────────────────────────────

export interface PillField {
  /** Short uppercase label, e.g. "Scene", "Words", "Save". */
  label: string;
  /** Live value pulled straight from page state. */
  value: string;
  /** Optional accent for the value dot/text. */
  color?: string;
}

export interface PillToggle {
  id: string;
  label: string;
  active: boolean;
  /** Flips real page state. */
  onToggle: () => void;
}

export interface PillAction {
  id: string;
  label: string;
  onClick: () => void;
}

export interface PillDescriptor {
  /** Module key, e.g. 'editor' — also selects the contextual accent. */
  module: string;
  /** Short context title, e.g. the active script name. */
  title?: string;
  fields?: PillField[];
  toggles?: PillToggle[];
  actions?: PillAction[];
}

export interface PillTransient {
  id: number;
  label: string;
  tone: 'default' | 'success' | 'accent';
}

interface PillContextValue {
  descriptor: PillDescriptor | null;
  setDescriptor: (d: PillDescriptor | null) => void;
  transient: PillTransient | null;
  /** Flash a Dynamic-Island-style live activity that morphs in then collapses. */
  emit: (label: string, tone?: PillTransient['tone']) => void;
}

const Ctx = createContext<PillContextValue | null>(null);

export function PillProvider({ children }: { children: React.ReactNode }) {
  const [descriptor, setDescriptor] = useState<PillDescriptor | null>(null);
  const [transient, setTransient] = useState<PillTransient | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const emit = useCallback((label: string, tone: PillTransient['tone'] = 'default') => {
    setTransient({ id: Date.now(), label, tone });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setTransient(null), 2600);
  }, []);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return (
    <Ctx.Provider value={{ descriptor, setDescriptor, transient, emit }}>
      {children}
    </Ctx.Provider>
  );
}

export function usePill(): PillContextValue {
  const c = useContext(Ctx);
  if (!c) throw new Error('usePill must be used within a PillProvider');
  return c;
}

/**
 * Publisher hook for pages. Registers a live context descriptor with the Pill
 * for as long as the component is mounted, refreshing whenever `deps` change.
 * Pass the reactive values the descriptor closes over as deps so callbacks and
 * read-outs never go stale.
 */
export function usePillStage(descriptor: PillDescriptor | null, deps: React.DependencyList) {
  const { setDescriptor } = usePill();
  useEffect(() => {
    setDescriptor(descriptor);
    return () => setDescriptor(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/** Convenience accessor for firing transient activities from anywhere. */
export function usePillEmit() {
  return usePill().emit;
}
