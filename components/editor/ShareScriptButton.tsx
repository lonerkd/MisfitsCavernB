'use client';

import { useCallback, useState, type CSSProperties } from 'react';
import { Link2, Copy, RefreshCw } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/Confirm';
import { useCurrentUser } from '@/lib/os';
import { useCanShape } from '@/lib/brief';
import { useEscapeKey } from '@/lib/hooks/useEscapeKey';
import { getScriptShare, setScriptShared, rotateScriptShareToken, scriptShareUrl, type ScriptShare } from '@/lib/scriptos/share';
import type { StoredScript } from '@/lib/scriptos/storage';

// Share a read-only link to this script (/s/<token>). Shown to whoever may
// share it — the script's owner, or on a project script its shapers — the
// same rule the database enforces (scripts_share_guard). On/off, copy, and a
// new link that kills the old one.

const label: CSSProperties = { fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' };

export function ShareScriptButton({ script, projectCreatorId }: { script: StoredScript | null; projectCreatorId?: string | null }) {
  const { toast } = useToast();
  const confirm = useConfirm();
  const { user } = useCurrentUser();
  const me = user?.id ?? null;
  const projectId = script?.project_id ?? null;
  const canShape = useCanShape(projectId, !!me && projectCreatorId === me);
  const allowed = !!script && !!me && (projectId ? canShape : script.user_id === me);

  const [open, setOpen] = useState(false);
  const [share, setShare] = useState<{ id: string; value: ScriptShare } | null>(null);
  const [busy, setBusy] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  useEscapeKey(close, open);

  if (!allowed || !script) return null;
  const current = share?.id === script.id ? share.value : null;
  const url = current?.shared && current.token ? scriptShareUrl(current.token) : '';

  const toggleOpen = async () => {
    if (open) { setOpen(false); return; }
    if (script.syncPending) { toast('Save the script first — it isn’t on the server yet.', 'info'); return; }
    setOpen(true);
    try {
      setShare({ id: script.id, value: await getScriptShare(script.id) });
    } catch {
      toast('Couldn’t load this script’s link. Try again.', 'error');
      setOpen(false);
    }
  };

  const run = async (fn: () => Promise<ScriptShare>, done: (s: ScriptShare) => string) => {
    setBusy(true);
    try {
      const value = await fn();
      setShare({ id: script.id, value });
      toast(done(value), 'success');
    } catch {
      toast('That didn’t save — the link is unchanged. Try again.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const toggleShared = () => run(
    () => setScriptShared(script.id, !current?.shared, current?.token ?? null),
    (s) => (s.shared ? 'Link on — anyone with it can read the script.' : 'Link off — it no longer opens.'),
  );

  const newLink = async () => {
    if (!await confirm({ title: 'Make a new link?', message: 'The old link stops working at once. Anyone you sent it to will need the new one.', confirmLabel: 'NEW LINK', danger: true })) return;
    await run(() => rotateScriptShareToken(script.id), () => 'New link ready — the old one is closed.');
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast('Link copied.', 'success');
    } catch {
      toast('Couldn’t copy — select the link and copy it.', 'error');
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={toggleOpen}
        aria-expanded={open}
        aria-haspopup="dialog"
        title="Share a read-only link"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 14px',
          background: current?.shared ? 'rgba(232, 67, 26, 0.12)' : 'rgba(var(--ink-rgb), 0.05)',
          color: current?.shared ? 'var(--accent)' : 'var(--fg-muted)',
          border: '1px solid rgba(var(--ink-rgb), 0.08)', borderRadius: 9999, cursor: 'pointer', ...label,
        }}
      >
        <Link2 size={12} /> Share
      </button>

      {open && (
        <>
          <div aria-hidden onClick={close} style={{ position: 'fixed', inset: 0, zIndex: 199 }} />
          <div role="dialog" aria-label="Share this script" style={{
            position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 200,
            width: 'min(340px, calc(100vw - 32px))', padding: 16,
            background: 'var(--surface)', backdropFilter: 'blur(20px)',
            border: '1px solid rgba(var(--ink-rgb), 0.09)', borderRadius: 14,
            boxShadow: '0 16px 48px rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <span style={{ ...label, color: 'var(--fg)' }}>Read-only link</span>
              <button
                type="button" role="switch" aria-checked={!!current?.shared} disabled={busy || !current}
                onClick={toggleShared}
                style={{
                  ...label, padding: '6px 12px', borderRadius: 9999, cursor: busy ? 'wait' : 'pointer',
                  border: '1px solid rgba(var(--ink-rgb), 0.12)',
                  background: current?.shared ? 'var(--accent)' : 'transparent',
                  color: current?.shared ? 'var(--on-accent)' : 'var(--fg-muted)',
                }}
              >
                {current?.shared ? 'On' : 'Off'}
              </button>
            </div>
            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: 'var(--fg-dim)' }}>
              {current?.shared
                ? 'Anyone with this link can read the script. They can’t edit it or see anything else in your project.'
                : 'Off: the script is private to you and your project’s people.'}
            </p>
            {url && (
              <>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    readOnly value={url} aria-label="Share link"
                    onFocus={(e) => e.currentTarget.select()}
                    style={{ flex: 1, minWidth: 0, padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(var(--ink-rgb), 0.12)', background: 'rgba(var(--ink-rgb), 0.04)', color: 'var(--fg)', fontFamily: 'var(--mono)', fontSize: 12 }}
                  />
                  <button type="button" onClick={copy} aria-label="Copy link" title="Copy link" style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(var(--ink-rgb), 0.12)', background: 'transparent', color: 'var(--fg-muted)', cursor: 'pointer' }}>
                    <Copy size={14} />
                  </button>
                </div>
                <button type="button" onClick={newLink} disabled={busy} style={{ ...label, alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 6, padding: 0, background: 'none', border: 'none', color: 'var(--fg-dim)', cursor: 'pointer' }}>
                  <RefreshCw size={12} /> New link (closes the old one)
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
