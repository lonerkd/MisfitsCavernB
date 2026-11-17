'use client';
import React, { useEffect, useRef, useState } from 'react';
import { INTERVIEW_QUESTIONS, answeredCount, firstUnanswered, isComplete, buildSkeleton, type InterviewAnswers, type SkeletonScene } from '@/lib/story/interview';
import { getStructure } from '@/lib/story/structures';
import { StructurePicker } from '@/components/story/StructurePicker';
import { getInterview, saveInterview } from '@/lib/supabase/story';
import { useToast } from '@/components/ui/Toast';

const field: React.CSSProperties = { background: 'var(--bg-2)', color: 'var(--fg)', border: '1px solid var(--border)', borderRadius: 8, padding: 10, width: '100%', font: 'inherit' };
const primary: React.CSSProperties = { padding: '8px 14px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: 'var(--on-accent)', cursor: 'pointer', fontWeight: 600 };
const quiet: React.CSSProperties = { padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--fg)', cursor: 'pointer' };

type Saved = 'idle' | 'saving' | 'saved';

/**
 * A guided path from idea to skeleton, one question at a time, each with the reason it is asked.
 * Answers save to the project (resumable); the skeleton is applied to the script by the caller.
 */
export function StoryInterview({ projectId, onApply }: { projectId: string; onApply: (scenes: SkeletonScene[]) => void }) {
  const { toast } = useToast();
  const [answers, setAnswers] = useState<Partial<InterviewAnswers>>({ turningPoints: [] });
  const [structureId, setStructureId] = useState('three-act');
  const [step, setStep] = useState(0); // 0..n-1 a question, n the review
  const [loaded, setLoaded] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const [saved, setSaved] = useState<Saved>('idle');
  const dirty = useRef(false);
  const last = INTERVIEW_QUESTIONS.length;

  useEffect(() => {
    if (!projectId) return;
    let alive = true;
    getInterview(projectId).then((r) => {
      if (!alive) return;
      if (r) { setAnswers({ turningPoints: [], ...r.answers }); if (r.structureId && r.structureId !== 'none') setStructureId(r.structureId); setStep(Math.min(firstUnanswered(r.answers), last)); }
      setLoaded(true);
    }, (e) => { if (alive) { toast(e instanceof Error ? e.message : 'Could not load the interview', 'error'); setLoaded(true); } });
    return () => { alive = false; };
  }, [projectId, toast, last]);

  // Save a moment after the last change. Only a change by this person is saved, never the load itself.
  useEffect(() => {
    if (!loaded || !dirty.current || readOnly || !projectId) return;
    setSaved('saving');
    const t = setTimeout(() => {
      saveInterview(projectId, structureId, answers).then(
        () => { dirty.current = false; setSaved('saved'); },
        (e) => {
          setSaved('idle');
          setReadOnly(true);
          toast(`Not saved: ${e instanceof Error ? e.message : 'unknown error'}. Only the project owner can change the interview.`, 'error');
        },
      );
    }, 600);
    return () => clearTimeout(t);
  }, [projectId, structureId, answers, loaded, readOnly, toast]);

  const change = (next: Partial<InterviewAnswers>) => { dirty.current = true; setAnswers((a) => ({ ...a, ...next })); };

  if (!projectId) return <p style={{ color: 'var(--fg-muted)' }}>The interview belongs to a project. Open a script that is part of a project to use it.</p>;
  if (!loaded) return <p style={{ color: 'var(--fg-muted)' }}>Loading the interview…</p>;

  const complete = isComplete(answers);
  const structure = getStructure(structureId)!;
  const skeleton = complete ? buildSkeleton(answers, structure.beats) : [];
  const q = INTERVIEW_QUESTIONS[step];
  const done = answeredCount(answers);

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Story interview</h2>
        <span aria-live="polite" style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
          {readOnly ? 'Read only' : saved === 'saving' ? 'Saving…' : saved === 'saved' ? 'Saved' : ''}
        </span>
      </div>
      <div role="progressbar" aria-label="Interview progress" aria-valuemin={0} aria-valuemax={last} aria-valuenow={done} style={{ height: 4, borderRadius: 4, background: 'var(--bg-3)' }}>
        <div style={{ width: `${(done / last) * 100}%`, height: '100%', borderRadius: 4, background: 'var(--accent)' }} />
      </div>
      <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
        {step < last ? `Question ${step + 1} of ${last}` : 'Review'} · {done} of {last} answered{readOnly ? ' · you can read this, only the owner can change it' : ''}
      </div>

      {step < last ? (
        <>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontWeight: 600 }}>{q.question}</span>
            {q.id === 'turningPoints' ? (
              <textarea
                value={(answers.turningPoints ?? []).join('\n')}
                onChange={(e) => change({ turningPoints: e.target.value.split('\n') })}
                rows={6} placeholder={q.placeholder} readOnly={readOnly} style={field}
              />
            ) : (
              <textarea
                value={(answers[q.id] as string | undefined) ?? ''}
                onChange={(e) => change({ [q.id]: e.target.value } as Partial<InterviewAnswers>)}
                rows={3} placeholder={q.placeholder} readOnly={readOnly} style={field}
              />
            )}
          </label>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--fg-muted)' }}><strong>Why we ask:</strong> {q.why}</p>
        </>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          <label style={{ display: 'grid', gap: 4 }}>
            <span style={{ fontWeight: 600 }}>Structure to lay the story over</span>
            <StructurePicker value={structureId} onChange={(id) => { dirty.current = true; setStructureId(id); }} />
            <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{structure.description}</span>
          </label>
          {complete ? (
            <>
              <ol style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 4, fontSize: 13 }}>
                {skeleton.map((s) => <li key={s.beat}><strong>{s.beat}</strong>: {s.title}</li>)}
              </ol>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--fg-muted)' }}>
                Each becomes a scene heading in your script with its beat in a note; you replace &ldquo;TBD&rdquo; with the real place. Nothing you have written is changed, and a beat already in the script is skipped.
              </p>
              <div><button type="button" style={primary} onClick={() => onApply(skeleton)}>Add {skeleton.length} scenes to the script</button></div>
            </>
          ) : (
            <p style={{ margin: 0, color: 'var(--fg-muted)' }}>Answer every question to build the skeleton ({last - done} left).</p>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
        <button type="button" style={quiet} disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>Back</button>
        {step < last && <button type="button" style={primary} onClick={() => setStep((s) => s + 1)}>{step === last - 1 ? 'Review' : 'Next'}</button>}
      </div>
    </div>
  );
}
