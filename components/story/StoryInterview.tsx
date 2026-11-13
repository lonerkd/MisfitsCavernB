'use client';
import React, { useEffect, useState } from 'react';
import { INTERVIEW_QUESTIONS, isComplete, buildSkeleton, type InterviewAnswers } from '@/lib/story/interview';
import { getStructure } from '@/lib/story/structures';
import { StructurePicker } from '@/components/story/StructurePicker';
import { getInterview, saveInterview } from '@/lib/supabase/story';

export function StoryInterview({ projectId, onApply }: { projectId: string; onApply: (scenes: { title: string }[]) => void }) {
  const [answers, setAnswers] = useState<Partial<InterviewAnswers>>({ turningPoints: [] });
  const [structureId, setStructureId] = useState('three-act');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getInterview(projectId).then((r) => {
      if (r) { setAnswers(r.answers); if (r.structureId) setStructureId(r.structureId); }
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, [projectId]);

  useEffect(() => {
    if (loaded) void saveInterview(projectId, structureId, answers).catch(() => {});
  }, [projectId, structureId, answers, loaded]);

  const complete = isComplete(answers);
  const skeleton = complete ? buildSkeleton(answers as InterviewAnswers, getStructure(structureId)!.beats) : [];
  return (
    <div style={{ display: 'grid', gap: 8, maxWidth: 600 }}>
      <StructurePicker value={structureId} onChange={setStructureId} />
      {INTERVIEW_QUESTIONS.map((q) => (
        <label key={q.id} style={{ display: 'grid', gap: 4 }}>
          <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{q.question}</span>
          {q.id === 'turningPoints' ? (
            <textarea
              value={(answers.turningPoints ?? []).join('\n')}
              onChange={(e) => setAnswers((a) => ({ ...a, turningPoints: e.target.value.split('\n').filter(Boolean) }))}
              rows={4}
              style={{ background: 'var(--bg-2)', color: 'var(--fg)', border: '1px solid var(--border)', borderRadius: 8, padding: 8 }}
            />
          ) : (
            <input
              value={((answers[q.id] as string | undefined) ?? '')}
              onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
              style={{ background: 'var(--bg-2)', color: 'var(--fg)', border: '1px solid var(--border)', borderRadius: 8, padding: 8 }}
            />
          )}
        </label>
      ))}
      {complete && (
        <>
          <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>Preview: {skeleton.length} scenes</div>
          <button type="button" onClick={() => onApply(skeleton)} style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: 'var(--on-accent)', cursor: 'pointer' }}>
            Apply skeleton
          </button>
        </>
      )}
    </div>
  );
}
