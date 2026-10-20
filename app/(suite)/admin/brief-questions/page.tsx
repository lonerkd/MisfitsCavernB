'use client';

// /admin/brief-questions — the questions every project's brief asks
// (public.brief_questions): a phase, the words, and the choices or the number
// range. Admins add and remove them without a deploy. Removing one deletes
// every project's answer to it, so the page says how many before it asks.
// What a choice implies for the suite (`implies`, `detect`, `ask_when`) is still
// set by migration.

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { ProtectedPage } from '@/lib/os';
import { useLoad } from '@/lib/hooks/useLoad';
import { loadQuestions, resetQuestions } from '@/lib/brief';
import { addQuestion, countAnswers, removeQuestion } from '@/lib/supabase/admin-brief';
import { BRIEF_KINDS, BRIEF_PHASES, checkQuestion, type QuestionInput } from '@/lib/brief/check';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/Confirm';

const field: React.CSSProperties = { background: 'rgba(var(--ink-rgb), 0.05)', border: '1px solid rgba(var(--ink-rgb), 0.12)', borderRadius: 8, padding: '8px 12px', color: 'var(--fg-strong)', fontSize: 14 };
const label: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--fg-muted)' };
const EMPTY: QuestionInput = { key: '', phase: 'development', label: '', hint: '', kind: 'one', optionsText: '', unit: '', min: '', max: '' };

export default function AdminBriefQuestionsPage() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const loaded = useLoad('brief-questions', async () => { resetQuestions(); return loadQuestions(); });
  const questions = useMemo(() => loaded.data ?? [], [loaded.data]);
  const [draft, setDraft] = useState<QuestionInput>({ ...EMPTY });
  const [busy, setBusy] = useState(false);

  const add = async () => {
    const checked = checkQuestion(draft, questions.map((q) => q.key));
    if (!checked.ok) { toast(checked.error, 'error'); return; }
    setBusy(true);
    const error = await addQuestion(checked.value, questions.length + 1);
    setBusy(false);
    if (error) { toast(`Could not add it: ${error}`, 'error'); return; }
    toast('Question added', 'success');
    setDraft({ ...EMPTY });
    loaded.reload();
  };

  const remove = async (key: string, text: string) => {
    const answers = await countAnswers(key);
    const warn = answers == null
      ? 'We could not count the answers. Removing it deletes every project’s answer to it.'
      : answers === 0 ? 'No project has answered it yet.'
      : `This deletes ${answers} project ${answers === 1 ? 'answer' : 'answers'} to it. It cannot be undone.`;
    if (!(await confirm({ title: `Remove “${text}”?`, message: warn, confirmLabel: 'Remove' }))) return;
    const error = await removeQuestion(key);
    if (error) { toast(`Could not remove it: ${error}`, 'error'); return; }
    toast('Question removed', 'success');
    loaded.reload();
  };

  const isNumber = draft.kind === 'number';

  return (
    <ProtectedPage require="admin">
      <main style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)', padding: '24px 24px 96px', maxWidth: 'var(--w-content)', margin: '0 auto' }}>
        <Link href="/admin" aria-label="Back to admin" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--fg-muted)', textDecoration: 'none', fontSize: 13 }}><ArrowLeft size={14} aria-hidden /> Admin</Link>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: '1.8rem', margin: '12px 0 4px' }}>Brief questions</h1>
        <p style={{ color: 'var(--fg-muted)', margin: '0 0 24px', maxWidth: '60ch' }}>What every project’s brief asks, phase by phase. New questions appear on every project; what an answer implies for the suite is set by migration.</p>

        <form onSubmit={(e) => { e.preventDefault(); void add(); }} aria-label="Add a question" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end', marginBottom: 32 }}>
          <label style={label}>Question
            <input value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} maxLength={120} style={{ ...field, minWidth: 280 }} />
          </label>
          <label style={label}>Hint (optional)
            <input value={draft.hint} onChange={(e) => setDraft({ ...draft, hint: e.target.value })} maxLength={300} style={{ ...field, minWidth: 220 }} />
          </label>
          <label style={label}>Phase
            <select value={draft.phase} onChange={(e) => setDraft({ ...draft, phase: e.target.value as QuestionInput['phase'] })} style={field}>{BRIEF_PHASES.map((p) => <option key={p} value={p}>{p}</option>)}</select>
          </label>
          <label style={label}>Answer is
            <select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as QuestionInput['kind'] })} style={field}>
              {BRIEF_KINDS.map((k) => <option key={k} value={k}>{k === 'one' ? 'one choice' : k === 'many' ? 'several choices' : 'a number'}</option>)}
            </select>
          </label>
          {isNumber ? (
            <>
              <label style={label}>Lowest<input type="number" value={draft.min} onChange={(e) => setDraft({ ...draft, min: e.target.value })} style={{ ...field, width: 90 }} /></label>
              <label style={label}>Highest<input type="number" value={draft.max} onChange={(e) => setDraft({ ...draft, max: e.target.value })} style={{ ...field, width: 90 }} /></label>
              <label style={label}>Unit (optional)<input value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} maxLength={20} style={{ ...field, width: 110 }} /></label>
            </>
          ) : (
            <label style={label}>Options, one per line
              <textarea value={draft.optionsText} onChange={(e) => setDraft({ ...draft, optionsText: e.target.value })} rows={4} style={{ ...field, minWidth: 220, resize: 'vertical' }} />
            </label>
          )}
          <Button type="submit" disabled={busy}><Plus size={14} aria-hidden /> {busy ? 'Adding…' : 'Add question'}</Button>
        </form>

        {loaded.error ? (
          <p role="alert" style={{ color: 'var(--danger)' }}>Could not load the questions. <button type="button" onClick={loaded.reload} style={{ color: 'inherit', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>Try again</button></p>
        ) : loaded.loading && !loaded.data ? (
          <p style={{ color: 'var(--fg-muted)' }}>Loading…</p>
        ) : (
          BRIEF_PHASES.map((phase) => {
            const inPhase = questions.filter((q) => q.phase === phase);
            if (!inPhase.length) return null;
            return (
              <section key={phase} aria-label={phase} style={{ marginBottom: 24 }}>
                <h2 style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 'var(--caps-track)', color: 'var(--fg-muted)', textTransform: 'uppercase', margin: '0 0 8px' }}>{phase}</h2>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {inPhase.map((q) => (
                    <li key={q.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', border: '1px solid rgba(var(--ink-rgb), 0.12)', borderRadius: 14 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14 }}>{q.label} <span style={{ color: 'var(--fg-muted)', fontSize: 12 }}>· {q.key} · {q.kind === 'number' ? `${q.min_value}–${q.max_value}${q.unit ? ` ${q.unit}` : ''}` : `${q.options.length} options`}</span></div>
                        {q.hint && <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>{q.hint}</div>}
                      </div>
                      <button type="button" aria-label={`Remove ${q.label}`} onClick={() => void remove(q.key, q.label)} style={{ display: 'inline-flex', background: 'none', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer', padding: 4 }}><Trash2 size={14} aria-hidden /></button>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })
        )}
      </main>
    </ProtectedPage>
  );
}
