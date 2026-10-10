'use client';

// After sign-up: what you do, how you work (experience, time, team — it sets
// how deep the project guides go), what you came for, and — if it's to make
// something — the project itself, where it's at, and the first few brief
// questions for its format. Every path ends in a real place: the tool for the project's first
// step, the Jobs board, the Lounge or the portfolio. Everything is optional
// and can be changed later where it lives.

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Briefcase, Clapperboard, Film, MessagesSquare } from 'lucide-react';
import { setMyCraft } from '@/lib/supabase/profiles';
import { useOSGate, useProject, awaitOSUser, useCurrentUser } from '@/lib/os';
import { useToast } from '@/components/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { CraftPicker } from '@/components/crafts/CraftPicker';
import { FormatPicker } from '@/components/formats/FormatPicker';
import { Question } from '@/components/brief/BriefPanel';
import { loadQuestions, visibleQuestions, type Answers, type BriefQuestion, type BriefValue } from '@/lib/brief';
import { startProject } from '@/lib/onboarding';
import { PHASE_STATUS, type Phase } from '@/lib/os/phases';
import { useUiPrefs } from '@/lib/os/uiPrefs';
import { GuideSetup } from '@/components/guides/GuideSetup';
import type { GuideProfile } from '@/lib/guides/profile';
import w from './welcome.module.css';
import { useOnChange } from '@/lib/hooks/useOnChange';

type Step = 'craft' | 'guide' | 'why' | 'project';

/** Where a new project is at, in plain words, and the phase it starts in. */
const STAGES: Array<{ id: string; label: string; phase: Phase }> = [
  { id: 'idea', label: 'Just an idea', phase: 'development' },
  { id: 'writing', label: 'Writing it', phase: 'development' },
  { id: 'planning', label: 'Planning the shoot', phase: 'pre-production' },
  { id: 'shooting', label: 'Shooting', phase: 'production' },
  { id: 'editing', label: 'In the edit', phase: 'post-production' },
  { id: 'releasing', label: 'Getting it out there', phase: 'delivery' },
];

const PATHS = [
  { id: 'make', icon: Clapperboard, title: 'Make something', body: 'Start a project — a script, a short, a feature, a series. The suite grows with it, phase by phase.' },
  { id: 'work', icon: Briefcase, title: 'Find work on a crew', body: 'Roles productions are hiring for, matched to your craft.', href: '/jobs' },
  { id: 'meet', icon: MessagesSquare, title: 'Meet filmmakers', body: 'The Lounge: start here, the FAQ, craft talk and crew calls.', href: '/lounge' },
  { id: 'show', icon: Film, title: 'Show my work', body: 'Put finished work on your portfolio so productions can find you.', href: '/portfolio/manage' },
] as const;

/** How many of the format's first brief questions to ask up front. */
const FIRST_QUESTIONS = 3;

export default function WelcomePage() {
  useOSGate();
  const router = useRouter();
  const { toast } = useToast();
  const { setActiveProject } = useProject();
  const me = useCurrentUser().user;

  const [step, setStep] = useState<Step>('craft');
  const [craft, setCraft] = useState<string | null>(null);
  const [savingCraft, setSavingCraft] = useState(false);

  const [title, setTitle] = useState('');
  const [format, setFormat] = useState('Feature');
  const [logline, setLogline] = useState('');
  const [answers, setAnswers] = useState<Answers>({});
  const [catalogue, setCatalogue] = useState<BriefQuestion[]>([]);
  const [creating, setCreating] = useState(false);
  const [stage, setStage] = useState('idea');
  const { prefs, save: savePrefs } = useUiPrefs();

  useOnChange(me?.role, (role) => { if (role) setCraft((c) => c ?? role); });
  useEffect(() => { loadQuestions().then(setCatalogue).catch(() => setCatalogue([])); }, []);

  // The format's first development questions, in the catalogue's order.
  const questions = useMemo(
    () => visibleQuestions(catalogue, answers, format).filter((q) => q.phase === 'development').slice(0, FIRST_QUESTIONS),
    [catalogue, answers, format],
  );

  const saveCraft = async () => {
    const user = await awaitOSUser();
    if (!user) { toast('Sign in first', 'error'); return; }
    if (craft !== (me?.role ?? null)) {
      setSavingCraft(true);
      const error = await setMyCraft(user.id, craft).then(() => null, (e: unknown) => e);
      setSavingCraft(false);
      if (error) { toast('Could not save your craft — you can set it on your profile later', 'error'); }
    }
    setStep('guide');
  };

  const saveGuide = async (p: GuideProfile) => {
    try {
      await savePrefs({ guide: p });
      setStep('why');
    } catch {
      toast('Could not save that — you can set it from any project’s guide', 'error');
    }
  };

  const answer = (q: BriefQuestion, v: BriefValue | null) =>
    setAnswers((a) => { const next = { ...a }; if (v == null) delete next[q.key]; else next[q.key] = v; return next; });

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || creating) return;
    const user = await awaitOSUser();
    if (!user) { toast('Sign in first', 'error'); return; }
    setCreating(true);
    try {
      // Only answers to questions still asked for the chosen format.
      const asked = new Set(questions.map((q) => q.key));
      const kept = Object.fromEntries(Object.entries(answers).filter(([k]) => asked.has(k)));
      const phase = STAGES.find((x) => x.id === stage)?.phase ?? 'development';
      const { project, unsaved, href } = await startProject(user.id, { title: title.trim(), format, logline: logline.trim(), answers: kept, status: PHASE_STATUS[phase] });
      setActiveProject(project as never);
      toast(unsaved ? 'Project created — some answers didn’t save; add them on the project page' : `“${project.title}” is ready`, unsaved ? 'info' : 'success');
      router.push(href);
    } catch {
      toast('Could not create the project', 'error');
      setCreating(false);
    }
  };

  const stepNo = ['craft', 'guide', 'why', 'project'].indexOf(step) + 1;

  return (
    <main className={w.page}>
      <div className={w.frame}>
        <p className={w.eyebrow}>Welcome to the cavern · step {stepNo} of 4</p>

        {step === 'craft' && (
          <section aria-labelledby="welcome-craft">
            <h1 id="welcome-craft" className={w.title}>What do you do?</h1>
            <p className={w.lead}>Your craft goes on your profile. Jobs are matched to it, and productions can find you by it.</p>
            <div className={w.field}>
              <CraftPicker id="welcome-craft-picker" label="Your craft" value={craft} onChange={setCraft} placeholder="Choose your craft" noneLabel="Not sure yet" />
            </div>
            <div className={w.actions}>
              <Button onClick={saveCraft} isLoading={savingCraft} disabled={savingCraft}>Continue <ArrowRight size={13} aria-hidden /></Button>
              <button type="button" className={w.skip} onClick={() => setStep('guide')}>Skip</button>
            </div>
          </section>
        )}

        {step === 'guide' && (
          <section aria-labelledby="welcome-guide">
            <h1 id="welcome-guide" className={w.title}>How do you work?</h1>
            <p className={w.lead}>Every project gets a guide. These answers set how much it explains and how it paces the work — every step walked through for a first film, a checklist for a seasoned crew. Change them any time.</p>
            <GuideSetup initial={prefs.guide} onSave={saveGuide} idPrefix="welcome-guide"
              saveLabel={<>Continue <ArrowRight size={13} aria-hidden /></>} onCancel={() => setStep('why')} cancelLabel="Skip" />
            <div className={w.actions}>
              <button type="button" className={w.skip} onClick={() => setStep('craft')}><ArrowLeft size={12} aria-hidden /> Back</button>
            </div>
          </section>
        )}

        {step === 'why' && (
          <section aria-labelledby="welcome-why">
            <h1 id="welcome-why" className={w.title}>What brings you here?</h1>
            <p className={w.lead}>Pick one to start. Everything else stays a click away.</p>
            <ul className={w.paths}>
              {PATHS.map((p) => {
                const Icon = p.icon;
                const inner = (
                  <>
                    <span className={w.pathIcon} aria-hidden><Icon size={18} /></span>
                    <span className={w.pathText}>
                      <span className={w.pathTitle}>{p.title}</span>
                      <span className={w.pathBody}>{p.body}</span>
                    </span>
                    <ArrowRight size={14} className={w.pathArrow} aria-hidden />
                  </>
                );
                return (
                  <li key={p.id}>
                    {'href' in p
                      ? <Link href={p.href} className={w.path}>{inner}</Link>
                      : <button type="button" className={w.path} onClick={() => setStep('project')}>{inner}</button>}
                  </li>
                );
              })}
            </ul>
            <div className={w.actions}>
              <button type="button" className={w.skip} onClick={() => setStep('guide')}><ArrowLeft size={12} aria-hidden /> Back</button>
            </div>
          </section>
        )}

        {step === 'project' && (
          <section aria-labelledby="welcome-project">
            <h1 id="welcome-project" className={w.title}>Start your first project</h1>
            <p className={w.lead}>A title and a format are enough. The rest is a head start: it shapes the roles, breakdown and delivery the suite suggests later.</p>
            <form onSubmit={create} className={w.form}>
              <Input autoFocus label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Femme Fatale" required />
              <FormatPicker value={format} onChange={setFormat} />
              <fieldset className={w.stage}>
                <legend className={w.stageLabel}>Where is it now?</legend>
                <div className={w.stageChips} role="radiogroup" aria-label="Where is it now?">
                  {STAGES.map((x) => (
                    <button key={x.id} type="button" role="radio" aria-checked={stage === x.id} className={w.stageChip} disabled={creating} onClick={() => setStage(x.id)}>{x.label}</button>
                  ))}
                </div>
              </fieldset>
              <Textarea label="Logline (optional)" value={logline} onChange={(e) => setLogline(e.target.value)} placeholder="One sentence that sells the story." rows={2} />
              {questions.length > 0 && (
                <div className={w.brief}>
                  <h2 className={w.briefTitle}>A few quick choices <span className={w.optional}>(optional)</span></h2>
                  <div className={w.questions}>
                    {questions.map((q) => (
                      <Question key={q.key} q={q} value={answers[q.key]} disabled={creating} onAnswer={(v) => answer(q, v)} />
                    ))}
                  </div>
                </div>
              )}
              <div className={w.actions}>
                <Button type="submit" isLoading={creating} disabled={creating || !title.trim()}>
                  {logline.trim().length >= 10 ? 'Create & start writing' : 'Create project'} <ArrowRight size={13} aria-hidden />
                </Button>
                <button type="button" className={w.skip} onClick={() => setStep('why')}><ArrowLeft size={12} aria-hidden /> Back</button>
              </div>
            </form>
          </section>
        )}

        <p className={w.later}>
          <Link href="/projects">Skip for now</Link> — you can start a project or change your craft any time.
        </p>
      </div>
    </main>
  );
}
