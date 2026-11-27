import { PixelLoader } from '@/components/brand/PixelLoader';

export default function LoungeLoading() {
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
      <PixelLoader variant="twinkle" size={44} label="Entering the Lounge" />
      <div style={{ display: 'flex', gap: 16, width: '100%', maxWidth: 900 }}>
        <div
          style={{
            width: 200,
            height: 420,
            borderRadius: 8,
            background: 'rgba(var(--ink-rgb), 0.02)',
            border: '1px solid rgba(var(--ink-rgb), 0.04)',
            flexShrink: 0,
          }}
        />
        <div
          style={{
            flex: 1,
            height: 420,
            borderRadius: 8,
            background: 'rgba(var(--ink-rgb), 0.02)',
            border: '1px solid rgba(var(--ink-rgb), 0.04)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            padding: 16,
          }}
        >
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              style={{
                height: 40,
                width: `${40 + ((i * 37) % 50)}%`, // varied but the same on server and browser
                background: 'rgba(var(--ink-rgb), 0.03)',
                borderRadius: 8,
              }}
            />
          ))}
        </div>
      </div>
      <div
        style={{
          width: '100%',
          maxWidth: 900,
          height: 48,
          borderRadius: 8,
          background: 'rgba(var(--ink-rgb), 0.03)',
          border: '1px solid rgba(var(--ink-rgb), 0.05)',
        }}
      />
      <span
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 11,
          letterSpacing: 'var(--caps-track)',
          textTransform: 'var(--caps)', color: 'var(--fg-dim)' }}
      >
        ENTERING LOUNGE...
      </span>
    </div>
  );
}