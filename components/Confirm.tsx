'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface PendingConfirm extends ConfirmOptions {
  id: string;
  resolve: (ok: boolean) => void;
}

interface ConfirmContextValue {
  confirm: (opts: ConfirmOptions | string) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue>({ confirm: async () => false });

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirm = useCallback((opts: ConfirmOptions | string) => {
    const normalized: ConfirmOptions = typeof opts === 'string' ? { message: opts } : opts;
    return new Promise<boolean>(resolve => {
      setPending({ id: Date.now().toString(), resolve, danger: true, ...normalized });
    });
  }, []);

  const close = (ok: boolean) => {
    setPending(prev => { prev?.resolve(ok); return null; });
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <AnimatePresence>
        {pending && (
          <motion.div
            key={pending.id}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onMouseDown={() => close(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 99998, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}
              onMouseDown={e => e.stopPropagation()}
              style={{ width: 400, maxWidth: '100%', background: '#111', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16, padding: 26 }}
            >
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 20 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: pending.danger ? 'rgba(248,113,113,0.12)' : 'rgba(255,255,255,0.06)', color: pending.danger ? '#f87171' : 'var(--fg-muted)' }}>
                  <AlertTriangle size={18} />
                </div>
                <div>
                  {pending.title && <div style={{ fontFamily: 'var(--display)', fontSize: '1.15rem', letterSpacing: 0.5, marginBottom: 6, color: '#fff' }}>{pending.title}</div>}
                  <div style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--fg-muted)' }}>{pending.message}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => close(false)} style={{ padding: '10px 16px', background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: 'var(--fg-muted)', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 1 }}>
                  {pending.cancelLabel || 'CANCEL'}
                </button>
                <button autoFocus onClick={() => close(true)} style={{ padding: '10px 18px', background: pending.danger ? '#f87171' : 'var(--accent)', border: 'none', borderRadius: 8, color: pending.danger ? '#160606' : 'var(--bg)', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 1, fontWeight: 700 }}>
                  {pending.confirmLabel || 'CONFIRM'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  return useContext(ConfirmContext).confirm;
}
