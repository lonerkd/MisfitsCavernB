'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────

export interface PillField {

  label: string;

  value: string;

  color?: string;
}

export interface PillToggle {
  id: string;
  label: string;
  active: boolean;

  onToggle: () => void;
}

export interface PillAction {
  id: string;
  label: string;
  onClick: () => void;
}

export interface PillDescriptor {

  module: string;

  title?: string;
  fields?: PillField[];
  toggles?: PillToggle[];
  actions?: PillAction[];

  accent?: string;
}

interface PillZone {
  id: string;

  depth: number;
  descriptor: PillDescriptor;
}

export interface PillTransient {
  id: number;
  label: string;
  tone: 'default' | 'success' | 'accent';
}

interface PillContextValue {

  kbActive: boolean;

  descriptor: PillDescriptor | null;
  setDescriptor: (d: PillDescriptor | null) => void;

  activeDescriptor: PillDescriptor | null;

  zoneChain: { depth: number; title: string }[];

  zoneActive: boolean;
  pushZone: (z: PillZone) => void;
  updateZone: (id: string, descriptor: PillDescriptor) => void;
  popZone: (id: string) => void;

  pinZone: (z: PillZone) => void;
  clearPin: () => void;
  transient: PillTransient | null;

  emit: (label: string, tone?: PillTransient['tone']) => void;
}

const Ctx = createContext<PillContextValue | null>(null);

export function PillProvider({ children }: { children: React.ReactNode }) {
  const [descriptor, setDescriptor] = useState<PillDescriptor | null>(null);
  const [zones, setZones] = useState<PillZone[]>([]);
  const [pinnedZone, setPinnedZone] = useState<PillZone | null>(null);
  const [transient, setTransient] = useState<PillTransient | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const emit = useCallback((label: string, tone: PillTransient['tone'] = 'default') => {
    setTransient({ id: Date.now(), label, tone });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setTransient(null), 2600);
  }, []);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const [kbActive, setKbActive] = useState(false);
  useEffect(() => {
    const sync = (e: KeyboardEvent) => {
      if (typeof e.getModifierState !== 'function') return;
      setKbActive(e.getModifierState('CapsLock'));
    };
    window.addEventListener('keydown', sync);
    window.addEventListener('keyup', sync);
    return () => {
      window.removeEventListener('keydown', sync);
      window.removeEventListener('keyup', sync);
    };
  }, []);

  const pushZone = useCallback((z: PillZone) => {
    setZones(prev => [...prev.filter(p => p.id !== z.id), z]);
  }, []);
  const updateZone = useCallback((id: string, d: PillDescriptor) => {
    setZones(prev => prev.map(p => (p.id === id ? { ...p, descriptor: d } : p)));
  }, []);
  const popZone = useCallback((id: string) => {
    setZones(prev => prev.filter(p => p.id !== id));
  }, []);

  const pinZone = useCallback((z: PillZone) => { setPinnedZone(z); }, []);
  const clearPin = useCallback(() => { setPinnedZone(null); }, []);

  const topZone = zones.length
    ? zones.reduce((best, z) => (z.depth >= best.depth ? z : best), zones[0])
    : null;
  const activeDescriptor = topZone?.descriptor ?? pinnedZone?.descriptor ?? descriptor;

  const zoneChain: { depth: number; title: string }[] = [];
  if (descriptor?.title) zoneChain.push({ depth: 0, title: descriptor.title });
  const chainZones = zones.length ? zones : pinnedZone ? [pinnedZone] : [];
  [...chainZones]
    .sort((a, b) => a.depth - b.depth)
    .forEach(z => {
      const title = z.descriptor.title || z.descriptor.module;
      if (title) zoneChain.push({ depth: z.depth, title });
    });

  return (
    <Ctx.Provider value={{
      kbActive,
      descriptor, setDescriptor,
      activeDescriptor, zoneChain, zoneActive: zones.length > 0,
      pushZone, updateZone, popZone, pinZone, clearPin,
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

export function usePillStage(descriptor: PillDescriptor | null, deps: React.DependencyList) {
  const { setDescriptor } = usePill();
  useEffect(() => {
    setDescriptor(descriptor);
    return () => setDescriptor(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

let zoneSeq = 0;

export function usePillZone(descriptor: PillDescriptor | null, depth = 1) {
  const { pushZone, updateZone, popZone, pinZone } = usePill();
  const idRef = useRef<string>(`zone-${++zoneSeq}`);
  const hovered = useRef(false);
  const latest = useRef(descriptor);
  latest.current = descriptor;

  useEffect(() => {
    if (hovered.current && descriptor) updateZone(idRef.current, descriptor);
  }, [descriptor, updateZone]);

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

  const onClick = useCallback(() => {
    if (!latest.current) return;
    pinZone({ id: idRef.current, depth, descriptor: latest.current });
  }, [pinZone, depth]);

  return { onMouseEnter, onMouseLeave, onClick };
}

export function usePillEmit() {
  return usePill().emit;
}
