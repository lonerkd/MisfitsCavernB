'use client';

// The transcript of a recording in the library: paste one in (subtitles, a
// transcription service's text, plain paragraphs), type lines against the
// player, or dictate them. Click a time to jump there; the line playing now
// is highlighted. Star a line to put it in the project's paper edit
// (Studio › Post › Paper edit).

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ClipboardPaste, Copy, Mic, MicOff, Plus, Star, Trash2 } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/Confirm';
import {
  studio, useTranscriptLines, parseTranscript, parseStamp, formatStamp, paperEdit,
  type Media, type TranscriptLine,
} from '@/lib/studio';
import { useStudio } from '../StudioContext';
import { cx } from '../ui';
import s from '../studio.module.css';
import t from './transcript.module.css';

// The browser's own speech recognition, where there is one (Chrome, Edge, Safari).
type Recognition = {
  continuous: boolean; interimResults: boolean; lang: string;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void; stop: () => void;
};
function speechRecognition(): (new () => Recognition) | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const i = text.toLowerCase().indexOf(query.toLowerCase());
  if (i < 0) return <>{text}</>;
  return <>{text.slice(0, i)}<mark className={t.mark}>{text.slice(i, i + query.length)}</mark>{text.slice(i + query.length)}</>;
}

export function TranscriptPanel({ item, player }: { item: Media; player: HTMLMediaElement | null }) {
  const { project, userId, isOwner } = useStudio();
  const { toast } = useToast();
  const confirm = useConfirm();
  const all = useTranscriptLines(project.id);
  const lines = useMemo(() => all.rows.filter((l) => l.media_id === item.id), [all.rows, item.id]);
  const lastPos = lines.length ? lines[lines.length - 1].position : -1;
  // Where the next line goes: past every line here, including ones still on
  // their way (dictation adds a line per sentence, faster than the echo).
  const posRef = useRef(-1);
  useLayoutEffect(() => { posRef.current = Math.max(posRef.current, lastPos); });

  const [query, setQuery] = useState('');
  const [importing, setImporting] = useState(false);
  const [pasted, setPasted] = useState('');
  const parsed = useMemo(() => (pasted.trim() ? parseTranscript(pasted) : []), [pasted]);
  const [stamp, setStamp] = useState('');
  const [speaker, setSpeaker] = useState('');
  const speakerRef = useRef('');
  useLayoutEffect(() => { speakerRef.current = speaker; });
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState<number | null>(null);
  const [dictating, setDictating] = useState(false);
  const recognition = useRef<Recognition | null>(null);
  const phraseStart = useRef<number | null>(null);
  const canDictate = typeof window !== 'undefined' && !!speechRecognition();

  // The line playing now.
  useEffect(() => {
    if (!player) return;
    const tick = () => setNow(Math.round(player.currentTime * 1000));
    player.addEventListener('timeupdate', tick);
    player.addEventListener('seeked', tick);
    return () => { player.removeEventListener('timeupdate', tick); player.removeEventListener('seeked', tick); };
  }, [player]);
  const playing = useMemo(() => {
    if (now === null) return null;
    let hit: string | null = null;
    for (const l of lines) {
      if (l.start_ms === null || l.start_ms > now) continue;
      if (l.end_ms === null || now < l.end_ms) hit = l.id;
    }
    return hit;
  }, [lines, now]);

  // Stop listening when the panel closes.
  useEffect(() => () => recognition.current?.stop(), []);

  const playerMs = () => (player ? Math.round(player.currentTime * 1000) : null);

  const add = async (drafts: Parameters<typeof studio.addTranscriptLines>[2]) => {
    if (!drafts.length) return;
    const after = posRef.current;
    posRef.current += drafts.length;
    setBusy(true);
    try {
      for (const row of await studio.addTranscriptLines(item, userId, drafts, after)) all.upsertLocal(row);
      return true;
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not add to the transcript', 'error');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const addTyped = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    const typed = stamp.trim() ? parseStamp(stamp) : null;
    if (stamp.trim() && typed === null) { toast('Write the time as 1:23 or 1:02:03', 'error'); return; }
    const ok = await add([{ start_ms: typed ?? playerMs(), end_ms: null, speaker: speaker.trim() || null, text: text.trim() }]);
    if (ok) { setText(''); setStamp(''); }
  };

  const addPasted = async () => {
    if (await add(parsed)) {
      toast(`${parsed.length} line${parsed.length === 1 ? '' : 's'} added`, 'success');
      setPasted(''); setImporting(false);
    }
  };

  const dictate = () => {
    if (dictating) { recognition.current?.stop(); return; }
    const Ctor = speechRecognition();
    if (!Ctor) return;
    const r = new Ctor();
    r.continuous = true; r.interimResults = true; r.lang = navigator.language || 'en-US';
    r.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (phraseStart.current === null) phraseStart.current = playerMs();
        if (res.isFinal) {
          const said = res[0].transcript.trim();
          const at = phraseStart.current;
          phraseStart.current = null;
          if (said) void add([{ start_ms: at, end_ms: null, speaker: speakerRef.current.trim() || null, text: said.charAt(0).toUpperCase() + said.slice(1) }]);
        }
      }
    };
    r.onerror = (e) => { if (e.error !== 'no-speech' && e.error !== 'aborted') toast(e.error === 'not-allowed' ? 'Allow the microphone to dictate' : 'Dictation stopped', 'error'); };
    r.onend = () => { setDictating(false); recognition.current = null; };
    recognition.current = r;
    phraseStart.current = null;
    r.start();
    setDictating(true);
  };

  // Starring puts a line at the end of the paper edit; unstarring takes it out.
  const toggleSelect = async (line: TranscriptLine) => {
    const order = paperEdit(all.rows).map((l) => l.id);
    const next = line.paper_order === null ? [...order, line.id] : order.filter((id) => id !== line.id);
    try {
      await studio.setPaperEdit(project.id, next);
      for (const l of all.rows) {
        const at = next.indexOf(l.id);
        const want = at < 0 ? null : at;
        if (l.paper_order !== want) all.upsertLocal({ ...l, paper_order: want });
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not update the paper edit', 'error');
    }
  };

  const remove = async (ids: string[]) => {
    try {
      await studio.deleteTranscriptLines(ids);
      ids.forEach((id) => all.removeLocal(id));
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not remove', 'error');
    }
  };

  const mine = lines.filter((l) => isOwner || l.created_by === userId);
  const clearAll = async () => {
    const ok = await confirm({
      title: 'Clear the transcript?',
      message: mine.length === lines.length
        ? `All ${lines.length} lines go, and any of them in the paper edit leave it.`
        : `The ${mine.length} lines you added go; teammates’ lines stay.`,
      confirmLabel: 'Clear',
      danger: true,
    });
    if (ok) await remove(mine.map((l) => l.id));
  };

  const copy = async () => {
    const out = lines.map((l) => `${l.start_ms !== null ? `[${formatStamp(l.start_ms)}] ` : ''}${l.speaker ? `${l.speaker}: ` : ''}${l.text}`).join('\n');
    try { await navigator.clipboard.writeText(out); toast('Transcript copied', 'success'); } catch { toast('Could not copy', 'error'); }
  };

  const q = query.trim();
  const shown = q ? lines.filter((l) => `${l.speaker ?? ''} ${l.text}`.toLowerCase().includes(q.toLowerCase())) : lines;
  const timed = parsed.filter((l) => l.start_ms !== null).length;

  return (
    <section className={t.panel} aria-labelledby={`transcript-${item.id}`}>
      <div className={t.head}>
        <span id={`transcript-${item.id}`} className={s.label} style={{ margin: 0 }}>
          Transcript{lines.length ? ` · ${lines.length} line${lines.length === 1 ? '' : 's'}` : ''}
        </span>
        <div className={t.tools}>
          <button type="button" className={cx(s.btn, s.small)} aria-expanded={importing} onClick={() => setImporting((v) => !v)}><ClipboardPaste size={11} aria-hidden /> Paste a transcript</button>
          {canDictate && (
            <button type="button" className={cx(s.btn, s.small)} aria-pressed={dictating} onClick={dictate}>
              {dictating ? <><MicOff size={11} aria-hidden /> Stop dictating</> : <><Mic size={11} aria-hidden /> Dictate</>}
            </button>
          )}
          {lines.length > 0 && <button type="button" className={cx(s.btn, s.small)} onClick={copy}><Copy size={11} aria-hidden /> Copy</button>}
        </div>
      </div>

      {dictating && <span className={t.live} role="status"><span className={t.dot} aria-hidden /> Listening — each sentence becomes a line{player ? ', stamped at the player’s time' : ''}.</span>}

      {importing && (
        <div className={t.importBox}>
          <label className={s.field}>
            <span className={s.label}>Paste subtitles (SRT, WebVTT) or text</span>
            <textarea className={s.textarea} rows={6} value={pasted} onChange={(e) => setPasted(e.target.value)}
              placeholder={'00:00:05 Interviewer: When did you start?\n00:00:09 Ana: In 1998, on the docks.'} />
          </label>
          <div className={s.row} style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <span className={s.hint} aria-live="polite">
              {pasted.trim() ? (parsed.length ? `${parsed.length} line${parsed.length === 1 ? '' : 's'} found · ${timed} with a time` : 'No lines found yet.') : 'Times like 1:23, [00:01:23] or subtitle cues are kept; other paragraphs come in untimed.'}
            </span>
            <button type="button" className={cx(s.btnPrimary, s.small)} disabled={!parsed.length || busy} onClick={addPasted}>
              Add {parsed.length || ''} line{parsed.length === 1 ? '' : 's'}
            </button>
          </div>
        </div>
      )}

      <form className={t.add} onSubmit={addTyped}>
        <input className={s.input} value={stamp} onChange={(e) => setStamp(e.target.value)} placeholder={player ? 'now' : '0:00'} aria-label="Time (blank uses the player’s time)" />
        <input className={s.input} value={speaker} maxLength={60} onChange={(e) => setSpeaker(e.target.value)} placeholder="Speaker" aria-label="Speaker" />
        <input className={s.input} value={text} maxLength={2000} onChange={(e) => setText(e.target.value)} placeholder="What’s said…" aria-label="Line" />
        <button type="submit" className={cx(s.btn, s.small)} disabled={!text.trim() || busy}><Plus size={11} aria-hidden /> Add</button>
      </form>

      {lines.length > 6 && (
        <input type="search" className={cx(s.input, s.search)} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find in the transcript" aria-label="Find in the transcript" />
      )}

      {lines.length === 0 ? (
        <p className={s.hint}>No transcript yet. Paste one in, type lines as you watch, or dictate — then star the moments that tell the story.</p>
      ) : (
        <ol className={t.lines} aria-label="Transcript lines">
          {shown.map((l) => {
            const selected = l.paper_order !== null;
            return (
              <li key={l.id} className={cx(t.line, playing === l.id && t.now, selected && t.picked)} aria-current={playing === l.id ? 'time' : undefined}>
                {player && l.start_ms !== null ? (
                  <button type="button" className={t.time} onClick={() => { player.currentTime = l.start_ms! / 1000; void player.play().catch(() => {}); }} aria-label={`Play from ${formatStamp(l.start_ms)}`}>
                    {formatStamp(l.start_ms)}
                  </button>
                ) : <span className={t.time}>{formatStamp(l.start_ms)}</span>}
                <p className={t.words}>
                  {l.speaker && <span className={t.speaker}><Highlight text={l.speaker} query={q} /></span>}
                  <Highlight text={l.text} query={q} />
                </p>
                <span className={t.acts}>
                  <button type="button" className={cx(s.iconBtn, t.star)} aria-pressed={selected} onClick={() => void toggleSelect(l)}
                    aria-label={selected ? `Take out of the paper edit: ${l.text.slice(0, 40)}` : `Add to the paper edit: ${l.text.slice(0, 40)}`}>
                    <Star size={13} fill={selected ? 'currentColor' : 'none'} aria-hidden />
                  </button>
                  {(isOwner || l.created_by === userId) && (
                    <button type="button" className={s.iconBtn} onClick={() => void remove([l.id])} aria-label={`Remove line: ${l.text.slice(0, 40)}`}><Trash2 size={12} aria-hidden /></button>
                  )}
                </span>
              </li>
            );
          })}
          {q && shown.length === 0 && <li className={s.hint}>Nothing matches “{q}”.</li>}
        </ol>
      )}

      {mine.length > 0 && (
        <div className={s.row} style={{ justifyContent: 'flex-end' }}>
          <button type="button" className={cx(s.btnGhost, s.small)} onClick={clearAll}>Clear {mine.length === lines.length ? 'transcript' : 'my lines'}</button>
        </div>
      )}
    </section>
  );
}
