import { describe as group, expect, it } from 'vitest';
import { baseType, describe, dictationLine, isOffline, pickAudioType, recClock, sendOrder, voiceMemoName, type Capture } from './capture';

group('recording', () => {
  it('picks the first format the browser records', () => {
    expect(pickAudioType((t) => t.startsWith('audio/webm'))).toBe('audio/webm;codecs=opus');
    expect(pickAudioType((t) => t === 'audio/mp4')).toBe('audio/mp4');
    expect(pickAudioType(() => false)).toBeNull();
    expect(pickAudioType(() => { throw new Error('nope'); })).toBeNull();
  });
  it('stores the bare type and names the memo', () => {
    expect(baseType('audio/webm;codecs=opus')).toBe('audio/webm');
    expect(voiceMemoName(new Date(2026, 8, 29, 14, 5), 'audio/mp4')).toBe('Voice memo 29 Sep 14.05.m4a');
    expect(voiceMemoName(new Date(2026, 8, 29, 9, 30), 'audio/webm;codecs=opus')).toBe('Voice memo 29 Sep 09.30.webm');
  });
  it('shows the clock', () => {
    expect(recClock(7_400)).toBe('0:07');
    expect(recClock(760_000)).toBe('12:40');
    expect(recClock(-5)).toBe('0:00');
  });
  it('turns dictation into stamped lines', () => {
    expect(dictationLine('  the boat leaves at   six ', 12_345.6)).toEqual({ start_ms: 12346, end_ms: null, speaker: null, text: 'The boat leaves at six' });
    expect(dictationLine('   ', 0)).toBeNull();
  });
});

group('sending', () => {
  it('knows a dropped connection from a refusal', () => {
    expect(isOffline(new Error('anything'), false)).toBe(true);
    expect(isOffline(new TypeError('Failed to fetch'), true)).toBe(true);
    expect(isOffline(new Error('Upload failed: Load failed'), true)).toBe(true);
    expect(isOffline(new Error('You don’t have permission to do that.'), true)).toBe(false);
  });
  it('sends oldest first, failed ones last', () => {
    const at = (s: string, error?: string): Capture => ({ id: s, projectId: 'p', createdAt: s, kind: 'note', text: s, error });
    expect(sendOrder([at('3'), at('1', 'no'), at('2')]).map((c) => c.id)).toEqual(['2', '3', '1']);
  });
  it('describes what is waiting', () => {
    expect(describe({ id: '1', projectId: 'p', createdAt: '', kind: 'note', text: 'Boat at six\nbring coats' })).toBe('Boat at six');
    expect(describe({ id: '1', projectId: 'p', createdAt: '', kind: 'link', url: 'https://www.example.com/a' })).toBe('example.com/a');
  });
});
