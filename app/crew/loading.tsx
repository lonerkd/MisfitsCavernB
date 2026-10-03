export default function CrewLoading() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)', padding: '80px 24px 40px' }}>
      <div style={{ maxWidth: 'var(--w-content)', margin: '0 auto' }}>
        <div style={{ width: 160, height: 26, borderRadius: 8, background: 'rgba(var(--ink-rgb), 0.06)', marginBottom: 28 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
          {[...Array(8)].map((_, i) => (
            <div key={i} style={{ height: 140, borderRadius: 8, background: 'rgba(var(--ink-rgb), 0.02)', border: '1px solid rgba(var(--ink-rgb), 0.06)' }} />
          ))}
        </div>
      </div>
    </div>
  );
}