'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { awaitOSUser } from '@/lib/os';
import { parseScript, type ScriptFormat } from '@/lib/scriptos/parser';
import { timeScript } from '@/lib/scriptos/timing';
import type { Json } from '@/lib/supabase/database.types';
import {
  EMPTY_CONTEXT, implications, nextMoves, type Answers, type BriefQuestion, type BriefValue,
  type ChannelPreset, type Implications, type Move, type ProjectContext, type ScriptFacts,
} from './core';
import type { Phase } from '@/lib/os/phases';

export * from './core';

/** Announced after any answer changes, so every open view re-reads. */
export const BRIEF_EVENT = 'mc:brief-changed';

let catalogue: Promise<BriefQuestion[]> | null = null;
/** The question catalogue (public.brief_questions), read once per session. */
export function loadQuestions(): Promise<BriefQuestion[]> {
  catalogue ??= (async () => {
    const { data, error } = await supabase.from('brief_questions').select('*').order('position');
    if (error) { catalogue = null; throw new Error('Could not load the brief'); }
    return (data ?? []).map((r) => ({
      ...r,
      phase: r.phase as Phase,
      kind: r.kind as BriefQuestion['kind'],
      options: (Array.isArray(r.options) ? r.options : []) as unknown as BriefQuestion['options'],
      ask_when: (r.ask_when && typeof r.ask_when === 'object' ? r.ask_when : {}) as BriefQuestion['ask_when'],
      min_value: r.min_value == null ? null : Number(r.min_value),
      max_value: r.max_value == null ? null : Number(r.max_value),
    }));
  })();
  return catalogue;
}

let presets: Promise<ChannelPreset[]> | null = null;
export function loadChannelPresets(): Promise<ChannelPreset[]> {
  presets ??= (async () => {
    const { data, error } = await supabase.from('channel_presets').select('*').order('position');
    if (error) { presets = null; throw new Error('Could not load channel suggestions'); }
    return (data ?? []) as ChannelPreset[];
  })();
  return presets;
}

export async function loadAnswers(projectId: string): Promise<Answers> {
  const { data, error } = await supabase.from('project_brief').select('question, value').eq('project_id', projectId);
  if (error) throw new Error('Could not load the brief');
  return Object.fromEntries((data ?? []).map((r) => [r.question, r.value as BriefValue]));
}

/** Answer a question (null clears it). */
export async function saveAnswer(projectId: string, question: string, value: BriefValue | null) {
  const { error } = value == null || (Array.isArray(value) && value.length === 0)
    ? await supabase.from('project_brief').delete().eq('project_id', projectId).eq('question', question)
    : await supabase.from('project_brief').upsert({ project_id: projectId, question, value: value as NonNullable<Json> }, { onConflict: 'project_id,question' });
  if (error) throw new Error(error.code === '42501' ? 'Only the owner and contributors can change the brief' : error.message);
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(BRIEF_EVENT, { detail: { projectId } }));
}

export async function loadContext(projectId: string): Promise<ProjectContext> {
  const { data, error } = await supabase.rpc('project_context', { p_project: projectId });
  if (error) throw new Error('Could not read the project');
  return { ...EMPTY_CONTEXT, ...((data ?? {}) as unknown as Partial<ProjectContext>) };
}

/** The project's latest script, measured like the editor does. */
export async function loadScriptFacts(projectId: string, format: string | null): Promise<ScriptFacts | null> {
  const [{ data: script }, { data: fmt }] = await Promise.all([
    supabase.from('scripts').select('id, content').eq('project_id', projectId).order('updated_at', { ascending: false }).limit(1).maybeSingle(),
    format ? supabase.from('project_formats').select('script_format').eq('name', format).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  if (!script?.content?.trim()) return null;
  const { data: reads } = await supabase.from('scenes').select('read_seconds').eq('script_id', script.id).is('removed_at', null).order('ordinal');
  const parsed = parseScript(script.content, (fmt?.script_format as ScriptFormat) || 'screenplay');
  const timing = timeScript(parsed.lines, (reads ?? []).map((r) => (r.read_seconds == null ? null : Number(r.read_seconds))));
  return { pages: timing.pages, runtimeSeconds: timing.runtime };
}

export interface ProjectBrief {
  questions: BriefQuestion[];
  answers: Answers;
  context: ProjectContext;
  script: ScriptFacts | null;
  implied: Implications;
  moves: Move[];
  loading: boolean;
  error: string | null;
  answer: (question: string, value: BriefValue | null) => Promise<void>;
  reload: () => Promise<void>;
}

/**
 * A project's brief with what the suite knows about it, what it implies and
 * the moves that would push it forward. `format` and `phase` come from the
 * project's progress. Re-reads when any view changes the brief.
 */
export function useProjectBrief(projectId: string | null | undefined, format: string | null, phase: Phase | null, opts: { script?: boolean } = {}): ProjectBrief {
  const wantScript = opts.script !== false;
  const [questions, setQuestions] = useState<BriefQuestion[]>([]);
  const [answers, setAnswers] = useState<Answers>({});
  const [context, setContext] = useState<ProjectContext>(EMPTY_CONTEXT);
  const [script, setScript] = useState<ScriptFacts | null>(null);
  const [loading, setLoading] = useState(!!projectId);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!projectId) return;
    try {
      const [q, a, c, s] = await Promise.all([
        loadQuestions(), loadAnswers(projectId), loadContext(projectId),
        wantScript ? loadScriptFacts(projectId, format).catch(() => null) : Promise.resolve(null),
      ]);
      setQuestions(q); setAnswers(a); setContext(c); setScript(s); setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the brief');
    } finally {
      setLoading(false);
    }
  }, [projectId, format, wantScript]);

  useEffect(() => { setLoading(!!projectId); void reload(); }, [reload, projectId]);
  useEffect(() => {
    const on = (e: Event) => { if ((e as CustomEvent).detail?.projectId === projectId) void reload(); };
    const focus = () => void reload();
    window.addEventListener(BRIEF_EVENT, on);
    window.addEventListener('focus', focus);
    return () => { window.removeEventListener(BRIEF_EVENT, on); window.removeEventListener('focus', focus); };
  }, [projectId, reload]);

  const answer = useCallback(async (question: string, value: BriefValue | null) => {
    if (!projectId) return;
    const before = answers;
    setAnswers((prev) => {
      const next = { ...prev };
      if (value == null || (Array.isArray(value) && !value.length)) delete next[question]; else next[question] = value;
      return next;
    });
    try { await saveAnswer(projectId, question, value); } catch (e) { setAnswers(before); throw e; }
  }, [projectId, answers]);

  const implied = useMemo(() => implications(questions, answers, format), [questions, answers, format]);
  const moves = useMemo(
    () => (phase ? nextMoves({ questions, answers, format, phase, context, script }) : []),
    [questions, answers, format, phase, context, script],
  );

  return { questions, answers, context, script, implied, moves, loading, error, answer, reload };
}

/** Whether the signed-in user may change the brief: the owner, or a lead or contributor. */
export function useCanShape(projectId: string | null | undefined, isOwner: boolean): boolean {
  const [ok, setOk] = useState(isOwner);
  useEffect(() => {
    if (isOwner || !projectId) { setOk(isOwner); return; }
    let alive = true;
    (async () => {
      const me = await awaitOSUser();
      if (!me) return;
      const { data } = await supabase.from('project_crew').select('role').eq('project_id', projectId).eq('user_id', me.id).maybeSingle();
      if (alive) setOk(data?.role === 'lead' || data?.role === 'contributor');
    })();
    return () => { alive = false; };
  }, [projectId, isOwner]);
  return ok;
}

/** One answer of a project's brief, kept current (e.g. the target length in the editor). */
export function useBriefAnswer(projectId: string | null | undefined, question: string): BriefValue | null {
  const [value, setValue] = useState<BriefValue | null>(null);
  useEffect(() => {
    if (!projectId) { setValue(null); return; }
    let alive = true;
    const load = async () => {
      const { data } = await supabase.from('project_brief').select('value').eq('project_id', projectId).eq('question', question).maybeSingle();
      if (alive) setValue((data?.value as BriefValue | undefined) ?? null);
    };
    void load();
    const on = (e: Event) => { if ((e as CustomEvent).detail?.projectId === projectId) void load(); };
    window.addEventListener(BRIEF_EVENT, on);
    window.addEventListener('focus', load);
    return () => { alive = false; window.removeEventListener(BRIEF_EVENT, on); window.removeEventListener('focus', load); };
  }, [projectId, question]);
  return value;
}
