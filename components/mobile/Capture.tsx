'use client';

// Capture: the thing you saw, heard or thought, into the project's library in
// two taps — a photo or clip from the camera, a voice memo (written down as you
// talk, where the browser can), a note, or a link. It lands in Studio › Library
// on every device at once; with no signal it waits on this phone (the outbox)
// and goes up by itself when the connection is back.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Camera, Video, Mic, StickyNote, Link2, Upload, X, Square, CloudOff, RotateCw, Trash2, Check } from 'lucide-react';
import { useProject, useSession } from '@/lib/os';
import { useToast } from '@/components/ui/Toast';
import { ACCEPTED_UPLOAD_TYPES, uploadProblem } from '@/lib/studio/media-kind';
import type { TranscriptLineDraft } from '@/lib/studio/transcript';
import { baseType, describe, dictationLine, pickAudioType, recClock, voiceMemoName, type Capture } from '@/lib/pocket/capture';
import { capture, discard, flush, listOutbox, OUTBOX_EVENT, type FlushResult } from '@/lib/pocket/outbox';
import m from './mobile.module.css';

type Mode = 'pick' | 'voice' | 'note' | 'link';

interface Recognition {
  continuous: boolean; interimResults: boolean; lang: string;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null; onerror: (() => void) | null;
  start(): void; stop(): void;
}
function speechRecognition(): (new () => Recognition) | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** What's waiting in the outbox, kept current. */
export function useOutbox() {
  const [waiting, setWaiting] = useState<Capture[]>([]);
  useEffect(() => {
    let live = true;
    listOutbox().then((w) => { if (live) setWaiting(w); });
    const on = (e: Event) => setWaiting((e as CustomEvent<Capture[]>).detail);
    window.addEventListener(OUTBOX_EVENT, on);
    return () => { live = false; window.removeEventListener(OUTBOX_EVENT, on); };
  }, []);
  return waiting;
}

/** Sends what's waiting when the app opens, comes to the front, or the connection is back. */
export function OutboxFlusher() {
  const { userId, status } = useSession();
  useEffect(() => {
    if (status !== 'authed' || !userId) return;
    const go = () => { if (navigator.onLine) void flush(userId); };
    const front = () => { if (document.visibilityState === 'visible') go(); };
    go();
    window.addEventListener('online', go);
    document.addEventListener('visibilitychange', front);
    return () => { window.removeEventListener('online', go); document.removeEventListener('visibilitychange', front); };
  }, [status, userId]);
  return null;
}

const newId = () => crypto.randomUUID();
const nowIso = () => new Date().toISOString();

function Recorder({ onDone, onCancel }: { onDone: (c: { blob: Blob; type: string; duration: number; lines: TranscriptLineDraft[]; startedAt: Date }) => void; onCancel: () => void }) {
  const [state, setState] = useState<'idle' | 'recording' | 'denied' | 'unsupported'>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [lines, setLines] = useState<TranscriptLineDraft[]>([]);
  const [interim, setInterim] = useState('');
  const Speech = speechRecognition();
  const [dictate, setDictate] = useState(!!Speech);
  const rec = useRef<MediaRecorder | null>(null);
  const recog = useRef<Recognition | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const t0 = useRef(0);
  const phraseAt = useRef<number | null>(null);
  const linesRef = useRef<TranscriptLineDraft[]>([]);

  const stopAll = useCallback(() => {
    if (recog.current) { recog.current.onend = null; try { recog.current.stop(); } catch { /* already stopped */ } recog.current = null; }
    stream.current?.getTracks().forEach((t) => t.stop());
  }, []);
  useEffect(() => () => { if (rec.current?.state === 'recording') { rec.current.ondataavailable = null; rec.current.onstop = null; rec.current.stop(); } stopAll(); }, [stopAll]);
  useEffect(() => {
    if (state !== 'recording') return;
    const t = setInterval(() => setElapsed(Date.now() - t0.current), 250);
    return () => clearInterval(t);
  }, [state]);

  const start = async () => {
    const type = typeof MediaRecorder !== 'undefined' ? pickAudioType((t) => MediaRecorder.isTypeSupported(t)) : null;
    if (!type || !navigator.mediaDevices?.getUserMedia) { setState('unsupported'); return; }
    try { stream.current = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch { setState('denied'); return; }
    const chunks: BlobPart[] = [];
    const r = new MediaRecorder(stream.current, { mimeType: type });
    r.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    const startedAt = new Date();
    r.onstop = () => {
      const duration = (Date.now() - t0.current) / 1000;
      stopAll();
      onDone({ blob: new Blob(chunks, { type: baseType(type) }), type: baseType(type), duration, lines: linesRef.current, startedAt });
    };
    rec.current = r;
    t0.current = Date.now();
    r.start(1000);
    setState('recording');
    if (dictate && Speech) {
      const listen = () => {
        const s = new Speech();
        s.continuous = true; s.interimResults = true; s.lang = navigator.language || 'en-GB';
        s.onresult = (e) => {
          let partial = '';
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const res = e.results[i];
            phraseAt.current ??= Date.now() - t0.current;
            if (res.isFinal) {
              const line = dictationLine(res[0].transcript, phraseAt.current);
              phraseAt.current = null;
              if (line) { linesRef.current = [...linesRef.current, line]; setLines(linesRef.current); }
            } else partial += res[0].transcript;
          }
          setInterim(partial);
        };
        // Browsers stop listening after a pause; keep listening while recording.
        s.onend = () => { if (rec.current?.state === 'recording') { try { listen(); } catch { /* give up quietly */ } } };
        s.onerror = () => {};
        recog.current = s;
        try { s.start(); } catch { /* the recording carries on without words */ }
      };
      listen();
    }
  };

  const stop = () => { if (rec.current?.state === 'recording') rec.current.stop(); };

  if (state === 'unsupported') return <p className={m.captureHint} role="alert">This browser can’t record audio. Record in your phone’s voice memo app and add it with “From files”.</p>;
  if (state === 'denied') return <p className={m.captureHint} role="alert">The microphone is blocked for this site. Allow it in the browser’s site settings, then try again.</p>;
  return (
    <div className={m.recorder}>
      <div className={m.recClock} aria-live="off">{recClock(elapsed)}</div>
      {state === 'recording' ? (
        <button type="button" className={`${m.recBtn} ${m.recOn}`} onClick={stop} aria-label="Stop and keep"><Square size={26} aria-hidden /></button>
      ) : (
        <button type="button" className={m.recBtn} onClick={start} aria-label="Start recording"><Mic size={28} aria-hidden /></button>
      )}
      {Speech && state === 'idle' && (
        <label className={m.captureCheck}><input type="checkbox" checked={dictate} onChange={(e) => setDictate(e.target.checked)} /> Write it down as I talk</label>
      )}
      {(lines.length > 0 || interim) && (
        <div className={m.dictation} aria-live="polite">
          {lines.slice(-4).map((l, i) => <p key={i}><span>{recClock(l.start_ms ?? 0)}</span> {l.text}</p>)}
          {interim && <p className={m.interim}>{interim}</p>}
        </div>
      )}
      {state === 'idle' && <button type="button" className={m.captureGhost} onClick={onCancel}>Back</button>}
    </div>
  );
}

export interface CaptureStart { mode?: Mode; text?: string; url?: string; title?: string }

/**
 * What another app shared (the phone's share menu → The Cavern, via the
 * manifest's share_target): a link becomes a link, anything else a note.
 * The home-screen shortcut (?capture=1) just opens Capture.
 */
export function fromShare(q: URLSearchParams): CaptureStart | null {
  const title = q.get('title')?.trim() ?? '', text = q.get('text')?.trim() ?? '', url = q.get('url')?.trim() ?? '';
  const link = url || text.match(/https?:\/\/\S+/)?.[0] || '';
  if (link) return { mode: 'link', url: link };
  if (text || title) return { mode: 'note', text: text || title, title: text ? title : '' };
  return q.get('capture') ? {} : null;
}

export function CaptureSheet({ onClose, start }: { onClose: () => void; start?: CaptureStart | null }) {
  const router = useRouter();
  const { toast } = useToast();
  const { userId } = useSession();
  const { projects, activeProject, setActiveProject } = useProject();
  const [projectId, setProjectId] = useState(activeProject?.id ?? projects[0]?.id ?? '');
  const [mode, setMode] = useState<Mode>(start?.mode ?? 'pick');
  const [text, setText] = useState(start?.text ?? '');
  const [title, setTitle] = useState(start?.title ?? '');
  const [url, setUrl] = useState(start?.url ?? '');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string[]>([]);
  const waiting = useOutbox();
  const closeRef = useRef<HTMLButtonElement>(null);
  const photo = useRef<HTMLInputElement>(null), clip = useRef<HTMLInputElement>(null), files = useRef<HTMLInputElement>(null);
  const project = projects.find((p) => p.id === projectId) ?? null;

  useEffect(() => {
    closeRef.current?.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', esc); document.body.style.overflow = prev; };
  }, [onClose]);

  const report = (what: string, r: FlushResult, id: string) => {
    if (r.sent.includes(id)) { toast(`${what} is in ${project?.title ?? 'the library'}.`, 'success'); setDone((d) => [what, ...d].slice(0, 5)); }
    else if (r.failed.some((f) => f.id === id)) toast(r.failed.find((f) => f.id === id)!.error, 'error');
    else toast(`${what} is saved on this phone — it goes up when you’re back online.`, 'info');
  };

  const keep = async (c: Capture, what: string) => {
    if (!userId) return;
    setBusy(true);
    try { report(what, await capture(c, userId), c.id); } catch { toast('This phone couldn’t keep that — check storage space and try again.', 'error'); }
    finally { setBusy(false); }
  };

  const onFiles = async (list: FileList | null) => {
    for (const f of Array.from(list ?? [])) {
      const problem = uploadProblem(f);
      if (problem) { toast(problem, 'error'); continue; }
      await keep({ id: newId(), projectId, createdAt: nowIso(), kind: 'file', blob: f, name: f.name || `Capture ${Date.now()}`, type: f.type }, f.type.startsWith('video/') ? 'The clip' : f.type.startsWith('image/') ? 'The photo' : 'The file');
    }
  };

  const noProject = !projects.length;

  return createPortal(
    <>
      <div className={m.scrim} onClick={onClose} aria-hidden />
      <div className={m.sheet} role="dialog" aria-modal="true" aria-labelledby="mc-capture-title">
        <div className={m.grip} aria-hidden />
        <div className={m.sheetHead}>
          <h2 id="mc-capture-title" className={m.sheetTitle}>Capture</h2>
          <button ref={closeRef} type="button" className={m.close} onClick={onClose} aria-label="Close"><X size={18} aria-hidden /></button>
        </div>

        {noProject ? (
          <p className={m.captureHint}>Captures go into a project’s library. Start a project first — then anything you see, hear or think of on the go lands there.</p>
        ) : (
          <>
            <label className={m.captureField}>
              <span className={m.section}>Into</span>
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={m.captureInput} aria-label="Project to capture into">
                {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </label>

            {mode === 'pick' && (
              <div className={m.captureGrid}>
                <button type="button" className={m.tile} disabled={busy} onClick={() => photo.current?.click()}><Camera size={22} className={m.tileIcon} aria-hidden />Photo</button>
                <button type="button" className={m.tile} disabled={busy} onClick={() => clip.current?.click()}><Video size={22} className={m.tileIcon} aria-hidden />Clip</button>
                <button type="button" className={m.tile} disabled={busy} onClick={() => setMode('voice')}><Mic size={22} className={m.tileIcon} aria-hidden />Voice memo</button>
                <button type="button" className={m.tile} disabled={busy} onClick={() => setMode('note')}><StickyNote size={22} className={m.tileIcon} aria-hidden />Note</button>
                <button type="button" className={m.tile} disabled={busy} onClick={() => setMode('link')}><Link2 size={22} className={m.tileIcon} aria-hidden />Link</button>
                <button type="button" className={m.tile} disabled={busy} onClick={() => files.current?.click()}><Upload size={22} className={m.tileIcon} aria-hidden />From files</button>
                <input ref={photo} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { void onFiles(e.target.files); e.target.value = ''; }} />
                <input ref={clip} type="file" accept="video/*" capture="environment" hidden onChange={(e) => { void onFiles(e.target.files); e.target.value = ''; }} />
                <input ref={files} type="file" accept={ACCEPTED_UPLOAD_TYPES} multiple hidden onChange={(e) => { void onFiles(e.target.files); e.target.value = ''; }} />
              </div>
            )}

            {mode === 'voice' && (
              <Recorder
                onCancel={() => setMode('pick')}
                onDone={({ blob, type, duration, lines, startedAt }) => {
                  setMode('pick');
                  void keep({ id: newId(), projectId, createdAt: nowIso(), kind: 'file', blob, type, name: voiceMemoName(startedAt, type), duration, lines }, 'The voice memo');
                }}
              />
            )}

            {mode === 'note' && (
              <form className={m.captureForm} onSubmit={(e) => { e.preventDefault(); if (!text.trim()) return; void keep({ id: newId(), projectId, createdAt: nowIso(), kind: 'note', title: title.trim() || null, text }, 'The note').then(() => { setText(''); setTitle(''); setMode('pick'); }); }}>
                <input className={m.captureInput} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (optional)" aria-label="Note title" maxLength={80} />
                <textarea className={m.captureInput} value={text} onChange={(e) => setText(e.target.value)} placeholder="A line, an idea, what the location manager said…" aria-label="Note" rows={5} maxLength={5000} autoFocus />
                <div className={m.captureRow}>
                  <button type="button" className={m.captureGhost} onClick={() => setMode('pick')}>Back</button>
                  <button type="submit" className={m.capturePrimary} disabled={busy || !text.trim()}>Save note</button>
                </div>
              </form>
            )}

            {mode === 'link' && (
              <form className={m.captureForm} onSubmit={(e) => { e.preventDefault(); const u = url.trim(); if (!u) return; void keep({ id: newId(), projectId, createdAt: nowIso(), kind: 'link', url: /^https?:\/\//i.test(u) ? u : `https://${u}` }, 'The link').then(() => { setUrl(''); setMode('pick'); }); }}>
                <input className={m.captureInput} type="url" inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Paste a link — a video, a board, a place" aria-label="Web address" autoFocus />
                <div className={m.captureRow}>
                  <button type="button" className={m.captureGhost} onClick={() => setMode('pick')}>Back</button>
                  <button type="submit" className={m.capturePrimary} disabled={busy || !url.trim()}>Add link</button>
                </div>
              </form>
            )}

            {busy && <p className={m.captureHint} role="status">Saving…</p>}

            {done.length > 0 && (
              <div className={m.captureDone} role="status">
                <Check size={16} aria-hidden /> {done.length === 1 ? done[0] : `${done.length} things`} in {project?.title}.
                <button type="button" className={m.captureLink} onClick={() => { if (project) setActiveProject(project); onClose(); router.push('/studio?tab=library'); }}>See the library</button>
              </div>
            )}
          </>
        )}

        {waiting.length > 0 && (
          <>
            <p className={m.section}><CloudOff size={12} aria-hidden /> Waiting on this phone · {waiting.length}</p>
            <div className={m.list}>
              {waiting.map((c) => (
                <div key={c.id} className={m.row}>
                  <span className={m.captureWaitName}>{describe(c)}</span>
                  <span className={m.rowMeta}>{c.error ? 'Not sent' : 'Waiting'}</span>
                  {c.error && <button type="button" className={m.continueX} aria-label={`Try again: ${describe(c)}`} onClick={() => { if (userId) void flush(userId, true); }}><RotateCw size={14} /></button>}
                  <button type="button" className={m.continueX} aria-label={`Discard: ${describe(c)}`} onClick={() => void discard(c.id)}><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>,
    document.body,
  );
}
