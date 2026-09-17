export default function JobsLoading() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)', padding: '80px 24px 40px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ width: 160, height: 26, borderRadius: 6, background: 'rgba(255,255,255,0.06)', marginBottom: 28 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[...Array(5)].map((_, i) => (
            <div key={i} style={{ height: 84, borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }} />
          ))}
        </div>
      </div>
    </div>
  );
}