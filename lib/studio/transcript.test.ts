import { describe, it, expect } from 'vitest';
import { formatStamp, moveSelect, paperEdit, paperEditText, paperRuntime, parseStamp, parseTranscript } from './transcript';

describe('timecodes', () => {
  it('reads the ways people write a time', () => {
    expect(parseStamp('01:23')).toBe(83_000);
    expect(parseStamp('1:02:03')).toBe(3_723_000);
    expect(parseStamp('00:00:01,500')).toBe(1_500);
    expect(parseStamp('00:00:01.5')).toBe(1_500);
    expect(parseStamp('83.5')).toBe(83_500);
    expect(parseStamp('1:75')).toBeNull();
    expect(parseStamp('soon')).toBeNull();
  });

  it('writes them short', () => {
    expect(formatStamp(83_000)).toBe('1:23');
    expect(formatStamp(3_723_900)).toBe('1:02:03');
    expect(formatStamp(null)).toBe('—');
  });
});

describe('parseTranscript', () => {
  it('reads SRT subtitles, with their numbers and times', () => {
    const srt = '1\n00:00:01,000 --> 00:00:04,200\nMARA: We go at midnight.\n\n2\n00:00:04,500 --> 00:00:07,000\n<i>Not before.</i>\n';
    expect(parseTranscript(srt)).toEqual([
      { start_ms: 1000, end_ms: 4200, speaker: 'MARA', text: 'We go at midnight.' },
      { start_ms: 4500, end_ms: 7000, speaker: null, text: 'Not before.' },
    ]);
  });

  it('reads WebVTT, voice spans included', () => {
    const vtt = 'WEBVTT\n\n00:01.000 --> 00:03.000\n<v Jonah>Where is it?\n\nnote-2\n00:03.500 --> 00:05.000\nIn the van.';
    expect(parseTranscript(vtt)).toEqual([
      { start_ms: 1000, end_ms: 3000, speaker: 'Jonah', text: 'Where is it?' },
      { start_ms: 3500, end_ms: 5000, speaker: null, text: 'In the van.' },
    ]);
  });

  it('reads a transcription service’s stamped lines; each runs to the next', () => {
    const txt = '[00:00:05] Interviewer: When did you start?\n[00:00:09] Ana Ruiz – In 1998, on the docks.\n00:00:20 That was the year it flooded.';
    expect(parseTranscript(txt)).toEqual([
      { start_ms: 5000, end_ms: 9000, speaker: 'Interviewer', text: 'When did you start?' },
      { start_ms: 9000, end_ms: 20000, speaker: 'Ana Ruiz', text: 'In 1998, on the docks.' },
      { start_ms: 20000, end_ms: null, speaker: null, text: 'That was the year it flooded.' },
    ]);
  });

  it('takes a time on its own line for the paragraph under it', () => {
    const txt = '00:12\nSPEAKER 1: It started with a letter.\nNobody believed it.\n\n00:30\nSPEAKER 2: I did.';
    expect(parseTranscript(txt)).toEqual([
      { start_ms: 12000, end_ms: 30000, speaker: 'SPEAKER 1', text: 'It started with a letter. Nobody believed it.' },
      { start_ms: 30000, end_ms: null, speaker: 'SPEAKER 2', text: 'I did.' },
    ]);
  });

  it('keeps untimed paragraphs, and a colon mid-sentence is not a speaker', () => {
    const txt = 'The plan was simple: wait for the tide.\n\nThen go.';
    expect(parseTranscript(txt)).toEqual([
      { start_ms: null, end_ms: null, speaker: null, text: 'The plan was simple: wait for the tide.' },
      { start_ms: null, end_ms: null, speaker: null, text: 'Then go.' },
    ]);
  });

  it('ignores blank input', () => {
    expect(parseTranscript('  \n\n ')).toEqual([]);
  });
});

describe('the paper edit', () => {
  const l = (id: string, order: number | null, start: number | null, end: number | null) =>
    ({ id, media_id: id.startsWith('a') ? 'ma' : 'mb', start_ms: start, end_ms: end, speaker: id === 'a1' ? 'ANA' : null, text: `line ${id}`, paper_order: order });

  it('plays the selects in order, and adds up their time', () => {
    const lines = [l('a1', 2, 0, 5000), l('a2', null, 5000, 9000), l('b1', 1, 60_000, 70_000), l('b2', 3, null, null)];
    expect(paperEdit(lines).map((x) => x.id)).toEqual(['b1', 'a1', 'b2']);
    expect(paperRuntime(paperEdit(lines))).toEqual({ ms: 15_000, untimed: 1 });
  });

  it('moves a select within bounds', () => {
    expect(moveSelect(['x', 'y', 'z'], 'y', -1)).toEqual(['y', 'x', 'z']);
    expect(moveSelect(['x', 'y', 'z'], 'z', 1)).toEqual(['x', 'y', 'z']);
  });

  it('writes out as text for the edit', () => {
    const text = paperEditText([l('b1', 1, 60_000, 70_000), l('a1', 2, 0, 5000)], (m) => (m === 'ma' ? 'Ana interview' : 'Docks b-roll'));
    expect(text).toBe('Paper edit — 2 selects, about 0:15\n\n1. Docks b-roll · 1:00–1:10\n   line b1\n2. Ana interview · 0:00–0:05\n   ANA: line a1');
  });
});
