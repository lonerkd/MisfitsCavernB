'use client';

// Review (flag `guest_review`): save a script as a numbered version, send it to
// a client by a link they open without an account, and see what they say. Anyone
// on the project can save a version; people who shape the project send, make
// links and confirm. A sent version never changes.

import React, { useMemo, useState } from 'react';
import { Check, Copy, Link2, Send, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/Confirm';
import { useFlag } from '@/components/Flag';
import { useLoad } from '@/lib/hooks/useLoad';
import { useCanShape } from '@/lib/brief';
import {
  addTeamComment, confirmVersion, createLink, deleteDraft, linkLive, listComments, listLinks, listVersions, reviewUrl,
  revokeLink, saveVersion, sendVersion, STATE_LABEL, versionState, type VersionRow,
} from '@/lib/review/versions';
import { useStudio } from '../StudioContext';
import s from '../studio.module.css';

export function ReviewPanel() {
  const on = useFlag('guest_review');
  const { project, isOwner, scripts } = useStudio();
  const { toast } = useToast();
  const confirm = useConfirm();
  const canShape = useCanShape(project.id, isOwner);
  const key = on ? `review:${project.id}` : null;
  const versions = useLoad(key, () => listVersions(project.id));
  const links = useLoad(key && canShape ? `${key}:links` : null, () => listLinks(project.id));
  const comments = useLoad(key && versions.data ? `${key}:comments:${versions.data.map((v) => v.id).join(',')}` : null, () => listComments((versions.data ?? []).map((v) => v.id)));
  const [label, setLabel] = useState('');
  const [scriptId, setScriptId] = useState('');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [linkLabel, setLinkLabel] = useState('');
  const [reply, setReply] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const titleOf = useMemo(() => new Map(scripts.map((x) => [x.id, x.title])), [scripts]);
  const chosen = scriptId || scripts[0]?.id || '';
  if (!on) return null;

  const reloadAll = () => { versions.reload(); links.reload(); comments.reload(); };
  const run = async (work: () => Promise<string | null>, ok: string, fail: string) => {
    setBusy(true);
    const error = await work();
    setBusy(false);
    if (error) { toast(`${fail}: ${error}`, 'error'); return false; }
    toast(ok, 'success');
    reloadAll();
    return true;
  };

  const save = async () => {
    if (!chosen) return;
    if (await run(() => saveVersion(project.id, chosen, label), 'Version saved', 'Could not save the version')) setLabel('');
  };
  const send = async (v: VersionRow) => {
    const ok = await confirm({ title: `Send version ${v.number}?`, message: 'It can’t be changed after it’s sent. You choose who sees it by making a link.', confirmLabel: 'Send' });
    if (ok) await run(() => sendVersion(v.id), 'Version sent', 'Could not send it');
  };
  const remove = async (v: VersionRow) => {
    const ok = await confirm({ title: `Delete the draft of version ${v.number}?`, message: 'Only drafts can be deleted.', confirmLabel: 'Delete' });
    if (ok) await run(() => deleteDraft(v.id), 'Draft deleted', 'Could not delete it');
  };
  const makeLink = async () => {
    const ids = Array.from(picked);
    if (!ids.length) { toast('Pick at least one sent version for the link', 'error'); return; }
    setBusy(true);
    const res = await createLink(project.id, ids, linkLabel);
    setBusy(false);
    if ('error' in res) { toast(`Could not make the link: ${res.error}`, 'error'); return; }
    setPicked(new Set()); setLinkLabel('');
    try { await navigator.clipboard.writeText(reviewUrl(window.location.origin, res.link.token)); toast('Link made and copied', 'success'); }
    catch { toast('Link made — copy it from the list', 'success'); }
    reloadAll();
  };
  const copy = async (token: string) => {
    try { await navigator.clipboard.writeText(reviewUrl(window.location.origin, token)); setCopied(token); setTimeout(() => setCopied(null), 1500); }
    catch { toast('Could not copy — select the link and copy it', 'error'); }
  };
  const revoke = async (id: string) => {
    const ok = await confirm({ title: 'Revoke this link?', message: 'The client can’t open it any more. Their comments and decision stay.', confirmLabel: 'Revoke' });
    if (ok) await run(() => revokeLink(id), 'Link revoked', 'Could not revoke it');
  };
  const say = async (v: VersionRow) => {
    const text = reply[v.id] ?? '';
    if (await run(() => addTeamComment(v.id, text), 'Comment added', 'Could not add the comment')) setReply((r) => ({ ...r, [v.id]: '' }));
  };

  const list = versions.data ?? [];
  const sentList = list.filter((v) => v.status === 'sent');
  const commentsOf = (id: string) => (comments.data ?? []).filter((c) => c.version_id === id);

  return (
    <div className={s.panel}>
      <div className={s.panelTitle}>Review with a client</div>
      <p className={s.hint}>Save a script as a numbered version, send it, and give a client a link to read it, comment, and approve or ask for changes — no account needed. A sent version never changes.</p>

      <div className={s.linkBox} style={{ margin: '12px 0' }}>
        <label className={s.srOnly} htmlFor="rv-script">Script</label>
        <select id="rv-script" className={s.input} value={chosen} onChange={(e) => setScriptId(e.target.value)} disabled={scripts.length === 0}>
          {scripts.length === 0 && <option value="">No scripts in this project</option>}
          {scripts.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}
        </select>
        <label className={s.srOnly} htmlFor="rv-label">Label</label>
        <input id="rv-label" className={s.input} placeholder="Label, e.g. Round 1" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={120} />
        <button type="button" className={s.btnPrimary} onClick={() => void save()} disabled={busy || !chosen}>Save version</button>
      </div>

      {versions.data === undefined && !versions.error && <p className={s.hint}>Loading…</p>}
      {versions.error != null && <p className={s.hint} style={{ color: 'var(--danger)' }}>Could not load the versions. <button type="button" className={s.btn} onClick={versions.reload}>Try again</button></p>}
      {versions.data && list.length === 0 && <p className={s.hint}>No versions yet.</p>}

      <div className={s.stack} style={{ gap: 10 }}>
        {list.map((v) => {
          const state = versionState(v);
          return (
            <div key={v.id} className={s.publishRow} style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ minWidth: 0, flex: '1 1 260px' }}>
                <div className={s.cardTitle}>{titleOf.get(v.script_id) ?? 'Script'} · version {v.number}{v.label ? ` · ${v.label}` : ''}</div>
                <div className={s.hint}>{STATE_LABEL[state]}{v.guest_name && v.guest_decision ? ` — ${v.guest_name}` : ''}</div>
                {commentsOf(v.id).map((c) => (
                  <div key={c.id} className={s.hint} style={{ marginTop: 6 }}><strong>{c.guest_name ?? 'Team'}:</strong> {c.body}</div>
                ))}
                {v.status === 'sent' && (
                  <div className={s.linkBox} style={{ marginTop: 8 }}>
                    <label className={s.srOnly} htmlFor={`rv-reply-${v.id}`}>Comment on version {v.number}</label>
                    <input id={`rv-reply-${v.id}`} className={s.input} placeholder="Comment for the client" value={reply[v.id] ?? ''} onChange={(e) => setReply((r) => ({ ...r, [v.id]: e.target.value }))} maxLength={2000} />
                    <button type="button" className={s.btn} onClick={() => void say(v)} disabled={busy || !(reply[v.id] ?? '').trim()}>Comment</button>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {v.status === 'draft' && canShape && <button type="button" className={s.btnPrimary} onClick={() => void send(v)} disabled={busy}><Send size={12} aria-hidden /> Send</button>}
                {v.status === 'draft' && canShape && <button type="button" className={s.btn} aria-label={`Delete draft of version ${v.number}`} onClick={() => void remove(v)} disabled={busy}><Trash2 size={12} aria-hidden /></button>}
                {v.status === 'sent' && canShape && (
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                    <input type="checkbox" checked={picked.has(v.id)} onChange={(e) => setPicked((p) => { const n = new Set(p); if (e.target.checked) n.add(v.id); else n.delete(v.id); return n; })} /> For the link
                  </label>
                )}
                {state === 'approved' || state === 'changes-requested'
                  ? (canShape && <button type="button" className={s.btn} onClick={() => void run(() => confirmVersion(v.id), 'Confirmed', 'Could not confirm it')} disabled={busy}><Check size={12} aria-hidden /> Confirm</button>)
                  : null}
              </div>
            </div>
          );
        })}
      </div>

      {canShape && sentList.length > 0 && (
        <div className={s.linkBox} style={{ marginTop: 14 }}>
          <label className={s.srOnly} htmlFor="rv-link-label">Link label</label>
          <input id="rv-link-label" className={s.input} placeholder="Link title the client sees, e.g. Spring campaign" value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)} maxLength={120} />
          <button type="button" className={s.btnPrimary} onClick={() => void makeLink()} disabled={busy || picked.size === 0}><Link2 size={12} aria-hidden /> Make a link for {picked.size || 'the picked'} version{picked.size === 1 ? '' : 's'}</button>
        </div>
      )}

      {canShape && (links.data ?? []).length > 0 && (
        <div className={s.stack} style={{ gap: 6, marginTop: 14 }}>
          <div className={s.panelTitle}>Links</div>
          {(links.data ?? []).map((l) => (
            <div key={l.id} className={s.publishRow}>
              <div style={{ minWidth: 0 }}>
                <div className={s.cardTitle}>{l.label || 'Review link'} · {l.version_ids.length} version{l.version_ids.length === 1 ? '' : 's'}</div>
                <div className={s.hint}>{linkLive(l) ? 'Open' : l.revoked_at ? 'Revoked' : 'Expired'}</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {linkLive(l) && <button type="button" className={s.btn} onClick={() => void copy(l.token)}>{copied === l.token ? <><Check size={12} aria-hidden /> Copied</> : <><Copy size={12} aria-hidden /> Copy</>}</button>}
                {linkLive(l) && <button type="button" className={s.btn} onClick={() => void revoke(l.id)} disabled={busy}>Revoke</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
