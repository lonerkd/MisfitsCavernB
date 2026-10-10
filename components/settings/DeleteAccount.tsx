'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Trash2, ArrowRightLeft } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/Confirm';
import { getDeletionPlan, transferProject, deleteMyAccount, type DeletionPlan, type SharedProject } from '@/lib/account/deletion';

const mono: React.CSSProperties = { fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 1 };
const dangerBtn: React.CSSProperties = {
  ...mono, padding: '8px 14px', background: 'transparent', color: 'var(--danger)', borderRadius: 8, cursor: 'pointer',
  border: '1px solid color-mix(in srgb, var(--danger) 35%, transparent)', display: 'inline-flex', alignItems: 'center', gap: 6,
};
const ghostBtn: React.CSSProperties = {
  ...mono, padding: '7px 12px', background: 'transparent', color: 'var(--fg-muted)', borderRadius: 8, cursor: 'pointer',
  border: '1px solid rgba(var(--ink-rgb), 0.12)', display: 'inline-flex', alignItems: 'center', gap: 6,
};
const field: React.CSSProperties = {
  padding: '8px 10px', background: 'rgba(var(--ink-rgb), 0.05)', border: '1px solid rgba(var(--ink-rgb), 0.1)',
  color: 'var(--fg)', fontFamily: 'var(--mono)', fontSize: 11, borderRadius: 8, outline: 'none',
  boxSizing: 'border-box', minWidth: 0, maxWidth: '100%',
};
const hint: React.CSSProperties = { fontSize: 11, color: 'var(--fg-dim)', lineHeight: 1.5, margin: 0 };

function Handover({ project, onDone }: { project: SharedProject; onDone: () => void }) {
  const { toast } = useToast();
  const confirm = useConfirm();
  const [to, setTo] = useState(project.crew[0]?.id ?? '');
  const [busy, setBusy] = useState(false);
  const person = project.crew.find((c) => c.id === to);

  const handOver = async () => {
    if (!person) return;
    const yes = await confirm({
      title: `Hand over ${project.title}?`,
      message: `${person.username} becomes its owner, with everything in it. You stay on its crew as a lead.`,
      confirmLabel: 'Hand over',
    });
    if (!yes) return;
    setBusy(true);
    try {
      await transferProject(project.id, person.id);
      toast(`${project.title} is now ${person.username}'s`, 'success');
      onDone();
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <li style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '8px 0', borderTop: '1px solid rgba(var(--ink-rgb), 0.05)' }}>
      <Link href={`/projects/${project.id}`} style={{ flex: '1 1 140px', minWidth: 0, color: 'var(--fg)', fontSize: 13, textDecoration: 'none' }}>{project.title}</Link>
      <label style={{ display: 'contents' }}>
        <span className="sr-only">New owner of {project.title}</span>
        <select value={to} onChange={(e) => setTo(e.target.value)} style={{ ...field, flex: '1 1 160px' }}>
          {project.crew.map((c) => <option key={c.id} value={c.id}>{c.username} · {c.role}</option>)}
        </select>
      </label>
      <button type="button" style={ghostBtn} onClick={handOver} disabled={busy || !person}>
        <ArrowRightLeft size={12} /> {busy ? '…' : 'HAND OVER'}
      </button>
    </li>
  );
}

/** Settings › Delete account: hand shared projects over, then delete for good. */
export default function DeleteAccount({ userId }: { userId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [plan, setPlan] = useState<DeletionPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [typed, setTyped] = useState('');
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setPlan(await getDeletionPlan()); } catch (e) { toast((e as Error).message, 'error'); } finally { setLoading(false); }
  };

  const remove = async () => {
    if (!plan) return;
    const yes = await confirm({
      title: 'Delete your account?',
      message: plan.solo.length
        ? `Your account and ${plan.solo.length === 1 ? 'your project' : `your ${plan.solo.length} projects`} (${plan.solo.map((p) => p.title).join(', ')}) are deleted for good. This can't be undone.`
        : 'Your account is deleted for good. This can\'t be undone.',
      confirmLabel: 'Delete for good',
      danger: true,
    });
    if (!yes) return;
    setDeleting(true);
    try {
      await deleteMyAccount(userId, typed);
      toast('Your account has been deleted', 'success');
      router.replace('/');
    } catch (e) {
      toast((e as Error).message, 'error');
      setDeleting(false);
      load();
    }
  };

  if (!plan) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '14px 16px', flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0, flex: '1 1 220px' }}>
          <div style={{ fontSize: 13, color: 'var(--fg)' }}>Delete account</div>
          <p style={{ ...hint, marginTop: 3 }}>Remove your account and the projects only you work on. Projects other people work on are handed over first.</p>
        </div>
        <button type="button" style={dangerBtn} onClick={load} disabled={loading}>
          <Trash2 size={12} /> {loading ? '…' : 'DELETE ACCOUNT…'}
        </button>
      </div>
    );
  }

  const blocked = plan.shared.length > 0;
  const matches = typed.trim() === plan.username;

  return (
    <div style={{ padding: '14px 16px', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 14 }}>
      {blocked && (
        <div>
          <div style={{ fontSize: 13, color: 'var(--fg)', marginBottom: 4 }}>First, hand these over</div>
          <p style={hint}>Other people work on {plan.shared.length === 1 ? 'this project' : 'these projects'}, so {plan.shared.length === 1 ? 'it doesn\'t' : 'they don\'t'} go with your account. Give each to someone on its crew — or open it and delete it yourself.</p>
          <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0' }}>
            {plan.shared.map((p) => <Handover key={p.id} project={p} onDone={load} />)}
          </ul>
        </div>
      )}

      <div>
        <div style={{ fontSize: 13, color: 'var(--fg)', marginBottom: 4 }}>What happens</div>
        <p style={hint}>
          {plan.solo.length
            ? <>Deleted with your account: <strong style={{ color: 'var(--fg-muted)' }}>{plan.solo.map((p) => p.title).join(', ')}</strong>, with every script, file and note in {plan.solo.length === 1 ? 'it' : 'them'}. </>
            : <>You have no projects of your own to delete. </>}
          Your profile, portfolio, job posts, applications and direct messages go too. What you wrote in other people&rsquo;s projects — script edits, shots, notes, channel messages, timesheets — stays there, shown as &ldquo;Deleted account&rdquo;.
        </p>
      </div>

      <label style={{ display: 'grid', gap: 6 }}>
        <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>Type your username <strong style={{ color: 'var(--fg)' }}>{plan.username}</strong> to confirm</span>
        <input value={typed} onChange={(e) => setTyped(e.target.value)} disabled={blocked || deleting} autoComplete="off" spellCheck={false} style={{ ...field, width: '100%' }} />
      </label>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" style={{ ...dangerBtn, opacity: blocked || !matches ? 0.5 : 1 }} onClick={remove} disabled={blocked || !matches || deleting}>
          <Trash2 size={12} /> {deleting ? 'DELETING…' : 'DELETE MY ACCOUNT'}
        </button>
        <button type="button" style={ghostBtn} onClick={() => { setPlan(null); setTyped(''); }} disabled={deleting}>CANCEL</button>
      </div>
    </div>
  );
}
