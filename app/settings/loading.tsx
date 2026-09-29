export default function SettingsLoading() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)', padding: '80px 24px 40px' }}>
      <div style={{ maxWidth: 'var(--w-reading)', margin: '0 auto' }}>
        <div style={{ width: 140, height: 26, borderRadius: 8, background: 'rgba(var(--ink-rgb), 0.06)', marginBottom: 28 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{ height: 52, borderRadius: 8, background: 'rgba(var(--ink-rgb), 0.02)', border: '1px solid rgba(var(--ink-rgb), 0.06)' }} />
          ))}
        </div>
      </div>
    </div>
  );
}