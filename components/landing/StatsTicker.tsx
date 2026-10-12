'use client';

/* ─── Live ticker: real public activity (lib/home/ticker) ─────────────────── */
export function StatsTicker({ items }: { items: string[] }) {
  if (!items.length) return null;
  const repeated = [...items, ...items];
  return (
    <div className="marquee-wrap" aria-label="Happening now" role="marquee" style={{
      borderTop: '1px solid var(--border)',
      borderBottom: '1px solid var(--border)',
      padding: '14px 0',
    }}>
      <div className="marquee-track">
        {repeated.map((item, i) => (
          <span key={i} style={{
            fontFamily: 'var(--mono)',
            fontSize: 'max(9px, var(--mc-min-font, 0px))',
            letterSpacing: 'var(--caps-track)',
            textTransform: 'var(--caps)',
            color: 'var(--fg-dim)',
            padding: '0 36px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 36,
          }}>
            {item}
            <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--accent)', opacity: 0.6, display: 'inline-block' }} />
          </span>
        ))}
      </div>
    </div>
  );
}
