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
  /** Optional accent override (else the active module's color is used). */
  accent?: string;
}

interface PillZone {
  id: string;
  /** Nesting depth — deeper zones win over shallower ones when both are hovered. */
  depth: number;
  descriptor: PillDescriptor;
}

export interface PillTransient {
  id: number;
  label: string;
  tone: 'default' | 'success' | 'accent';
}

interface PillContextValue {
  /** The page-level descriptor — the fallback when no finer zone is hovered. */
  descriptor: PillDescriptor | null;
  setDescriptor: (d: PillDescriptor | null) => void;
  /** The descriptor the Pill should actually show right now: the deepest
   *  hovered zone, falling back to the page descriptor. */
  activeDescriptor: PillDescriptor | null;
  /** True while any in-page zone is being hovered — the Pill morphs open. */
  zoneActive: boolean;
  pushZone: (z: PillZone) => void;
  updateZone: (id: string, descriptor: PillDescriptor) => void;
  popZone: (id: string) => void;
  transient: PillTransient | null;
  /** Flash a Dynamic-Island-style live activity that morphs in then collapses. */
  emit: (label: string, tone?: PillTransient['tone']) => void;
}

const Ctx = createContext<PillContextValue | null>(null);

export function PillProvider({ children }: { children: React.ReactNode }) {
  const [descriptor, setDescriptor] = useState<PillDescriptor | null>(null);
  const [zones, setZones] = useState<PillZone[]>([]);
  const [transient, setTransient] = useState<PillTransient | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const emit = useCallback((label: string, tone: PillTransient['tone'] = 'default') => {
    setTransient({ id: Date.now(), label, tone });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setTransient(null), 2600);
  }, []);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  // Zone stack — multiple zones can be hovered at once when they're nested
  // (script surface → scene → cue). We keep them all and surface the deepest.
  const pushZone = useCallback((z: PillZone) => {
    setZones(prev => [...prev.filter(p => p.id !== z.id), z]);
  }, []);
  const updateZone = useCallback((id: string, d: PillDescriptor) => {
    setZones(prev => prev.map(p => (p.id === id ? { ...p, descriptor: d } : p)));
  }, []);
  const popZone = useCallback((id: string) => {
    setZones(prev => prev.filter(p => p.id !== id));
  }, []);

  // Deepest wins; ties break toward the most recently pushed (end of array).
  const topZone = zones.length
    ? zones.reduce((best, z) => (z.depth >= best.depth ? z : best), zones[0])
    : null;
  const activeDescriptor = topZone?.descriptor ?? descriptor;

  return (
    <Ctx.Provider value={{
      descriptor, setDescriptor,
      activeDescriptor, zoneActive: zones.length > 0,
      pushZone, updateZone, popZone,
      transient, emit,
    }}>
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

let zoneSeq = 0;

/**
 * Registers an in-page *zone* with the Pill. Spread the returned handlers onto
 * any element — a region, a row, a single cue — and while the cursor is over it
 * the Pill morphs to show that element's tools. Zones nest: pass a higher
 * `depth` for finer targets so the innermost thing under the cursor wins
 * (script surface depth 1 → scene row depth 2 → character cue depth 3).
 *
 * The descriptor is kept live while hovered, so action callbacks and read-outs
 * never go stale even as the underlying element's data changes.
 */
export function usePillZone(descriptor: PillDescriptor | null, depth = 1) {
  const { pushZone, updateZone, popZone } = usePill();
  const idRef = useRef<string>(`zone-${++zoneSeq}`);
  const hovered = useRef(false);
  const latest = useRef(descriptor);
  latest.current = descriptor;

  // If the data changes while we're hovered, refresh the live descriptor.
  useEffect(() => {
    if (hovered.current && descriptor) updateZone(idRef.current, descriptor);
  }, [descriptor, updateZone]);

  // Leaving the element (or unmounting mid-hover) must always retract the zone.
  useEffect(() => {
    const id = idRef.current;
    return () => { popZone(id); };
  }, [popZone]);

  const onMouseEnter = useCallback(() => {
    if (!latest.current) return;
    hovered.current = true;
    pushZone({ id: idRef.current, depth, descriptor: latest.current });
  }, [pushZone, depth]);

  const onMouseLeave = useCallback(() => {
    hovered.current = false;
    popZone(idRef.current);
  }, [popZone]);

  return { onMouseEnter, onMouseLeave };
}

/** Convenience accessor for firing transient activities from anywhere. */
export function usePillEmit() {
  return usePill().emit;
}
