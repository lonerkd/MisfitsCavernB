'use client';

/* ─── Viewfinder corner brackets ─────────────────────────────────────────── */
export function Viewfinder({ size = 20, color = 'rgba(var(--fg-rgb), 0.3)' }: { size?: number; color?: string }) {
  const s = `${size}px`;
  const corner = { width: s, height: s, position: 'absolute' as const, borderColor: color };
  return (
    <>
      <div style={{ ...corner, top: 0, left: 0, borderTop: `1.5px solid`, borderLeft: `1.5px solid` }} />
      <div style={{ ...corner, top: 0, right: 0, borderTop: `1.5px solid`, borderRight: `1.5px solid` }} />
      <div style={{ ...corner, bottom: 0, left: 0, borderBottom: `1.5px solid`, borderLeft: `1.5px solid` }} />
      <div style={{ ...corner, bottom: 0, right: 0, borderBottom: `1.5px solid`, borderRight: `1.5px solid` }} />
    </>
  );
}
