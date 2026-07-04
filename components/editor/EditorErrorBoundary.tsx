'use client';

import React from 'react';

interface Props {
  children: React.ReactNode;
  /** Called once, synchronously, the instant a render error is caught —
   *  before React unmounts anything — so the caller can flush whatever's
   *  still in memory to localStorage. A crash inside one modal (e.g. an
   *  update-depth loop from a runaway effect) must never cost a writer
   *  their unsaved draft. */
  onCrash?: () => void;
}

interface State {
  hasError: boolean;
}

// Scoped tightly around individual editor modals/panels rather than the
// whole page: if one of them throws (e.g. "Maximum update depth exceeded"),
// only that piece unmounts and shows a recoverable fallback — the writing
// surface, content state, and the rest of the editor chrome stay intact.
export class EditorErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    this.props.onCrash?.();
    console.error('EditorErrorBoundary caught:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1001, display: 'flex', alignItems: 'center',
          justifyContent: 'center', background: 'rgba(0,0,0,0.85)',
        }}>
          <div style={{
            background: 'rgba(10,15,24,0.97)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 16, padding: 28, maxWidth: 380, textAlign: 'center',
          }}>
            <p style={{ color: '#fff', fontSize: 14, marginBottom: 8 }}>This panel hit an error and had to close.</p>
            <p style={{ color: 'var(--fg-muted)', fontSize: 12, marginBottom: 16 }}>Your script content was not affected. You can keep writing.</p>
            <button
              onClick={() => this.setState({ hasError: false })}
              style={{ background: 'var(--accent)', color: '#040710', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
            >
              Dismiss
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
