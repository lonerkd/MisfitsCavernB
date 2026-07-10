export default function EditorLoading() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
        color: 'var(--fg)',
        gap: 24,
        padding: 40,
      }}
    >
      {/* Pulse indicator */}
      <div
        style={{
          width: 12,
          height: 12,
          borderRadius: '50%',
          background: '#10b981',
          boxShadow: '0 0 12px #10b981',
          animation: 'pulse 1.5s ease-in-out infinite',
        }}
      />
      {/* Skeleton toolbar */}
      <div
        style={{
          width: '100%',
          maxWidth: 800,
          height: 48,
          borderRadius: 8,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.05)',
        }}
      />
      {/* Skeleton editor area */}
      <div
        style={{
          width: '100%',
          maxWidth: 800,
          height: 480,
          borderRadius: 8,
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          padding: 24,
        }}
      >
        <div style={{ height: 1, width: '60%', background: 'rgba(255,255,255,0.04)', borderRadius: 1 }} />
        <div style={{ height: 1, width: '40%', background: 'rgba(255,255,255,0.04)', borderRadius: 1 }} />
        <div style={{ height: 1, width: '80%', background: 'rgba(255,255,255,0.04)', borderRadius: 1 }} />
        <div style={{ height: 1, width: '30%', background: 'rgba(255,255,255,0.04)', borderRadius: 1 }} />
      </div>
      <span
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 11,
          opacity: 0.4,
          letterSpacing: 3,
          textTransform: 'uppercase',
        }}
      >
        LOADING EDITOR...
      </span>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
}