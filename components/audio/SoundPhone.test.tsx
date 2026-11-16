// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const phoneState = vi.hoisted(() => ({ value: { phone: true, landscape: false, keyboard: 0, typing: false, height: 852, offset: 0 } }));
vi.mock('@/lib/os/usePhone', () => ({ usePhoneLayout: () => phoneState.value }));

const spotify = {
  currentTrack: { name: 'Night Drive', artists: [{ name: 'Kavinsky' }], album: { images: [] } } as unknown,
  isPlaying: true, progressMs: 61_000, durationMs: 180_000, volume: 0.5, elsewhere: null, playUri: vi.fn(),
  isPremium: true, useIframeFallback: false, setUseIframeFallback: vi.fn(), logout: vi.fn(),
  togglePlay: vi.fn(), nextTrack: vi.fn(), prevTrack: vi.fn(), seek: vi.fn(), setVolumeLevel: vi.fn(), playHere: vi.fn(async () => true),
};
vi.mock('@/lib/os/SpotifyContext', () => ({ useSpotify: () => spotify }));
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/lib/cavern/CavernContext', () => ({ useCavern: () => ({ mode: 'closed', open: vi.fn(), minimise: vi.fn(), close: vi.fn() }) }));
vi.mock('./ListenWithoutPremium', () => ({ ListenWithoutPremium: () => <div>embedded players here</div> }));
vi.mock('@/lib/supabase/client', () => ({ supabase: {} }));
const audio = vi.hoisted(() => ({
  listAudioRefs: vi.fn(), listProjectScripts: vi.fn(), loadScriptForTimeline: vi.fn(), moveAudioRefScene: vi.fn(), tagAudioRef: vi.fn(), deleteAudioRef: vi.fn(),
}));
vi.mock('@/lib/supabase/audio', async (orig) => ({ ...(await orig<typeof import('@/lib/supabase/audio')>()), ...audio }));
import { SoundDeck } from './SoundDeck';
import { SceneTimeline } from './SceneTimeline';
import { TagToScene } from './TagToScene';

const script = 'INT. KITCHEN - DAY\n\nHe runs. Guns fire. A chase.\n\nEXT. GARDEN - NIGHT\n\nShe waits in silence.\n';
const scenes = [
  { id: 's1', scene_number: 1, heading: 'INT. KITCHEN - DAY', time_of_day: 'DAY', est_duration: '16/8', read_seconds: null },
  { id: 's2', scene_number: 2, heading: 'EXT. GARDEN - NIGHT', time_of_day: 'NIGHT', est_duration: '8/8', read_seconds: null },
];
const refs = [{ id: 'r1', project_id: 'p', reference_type: 'spotify', uri: 'spotify:track:1', title: 'Chase Theme', for_scene: 's1', role: 'theme', tags: ['tense'], description: null }];

beforeEach(() => {
  phoneState.value = { phone: true, landscape: false, keyboard: 0, typing: false, height: 852, offset: 0 };
  audio.listProjectScripts.mockResolvedValue([{ id: 'sc', title: 'Pilot', updated_at: null }]);
  audio.loadScriptForTimeline.mockResolvedValue({ content: script, scenes });
  audio.listAudioRefs.mockResolvedValue(refs);
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('the Sound page on a phone', () => {
  it('the deck is compact: no volume slider, no Cavern page link, controls still reachable', () => {
    const { container } = render(<SoundDeck />);
    expect(container.querySelector('[data-compact="portrait"]')).toBeTruthy();
    expect(screen.queryByLabelText('Volume')).toBeNull();
    expect(screen.queryByText('Cavern page')).toBeNull();
    for (const n of ['Previous track', 'Pause', 'Next track', 'Full screen cavern']) expect(screen.getByRole('button', { name: n })).toBeTruthy();
  });

  it('the deck says landscape when held sideways, and keeps the desk layout off a phone', () => {
    phoneState.value = { ...phoneState.value, landscape: true };
    const { container, unmount } = render(<SoundDeck />);
    expect(container.querySelector('[data-compact="landscape"]')).toBeTruthy();
    unmount();
    phoneState.value = { ...phoneState.value, phone: false, landscape: false };
    render(<SoundDeck />);
    expect(screen.getByLabelText('Volume')).toBeTruthy();
    expect(screen.getByText('Cavern page')).toBeTruthy();
  });

  it('a scene tapped on the timeline opens its detail in a bottom sheet, not inline', async () => {
    render(<SceneTimeline projectId="p" projectTitle="Undertow" canTag onFind={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: /^Scene 1,/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Scene 1' });
    expect(dialog.textContent).toContain('Chase Theme');
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('on the desk the same tap shows the detail inline with no dialog', async () => {
    phoneState.value = { ...phoneState.value, phone: false };
    render(<SceneTimeline projectId="p" projectTitle="Undertow" canTag onFind={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: /^Scene 1,/ }));
    expect(screen.getByRole('region', { name: 'Scene 1' })).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('the timeline scrolls sideways inside its own box and its bars are 44 pt tall', async () => {
    render(<SceneTimeline projectId="p" projectTitle="Undertow" canTag onFind={vi.fn()} />);
    const box = await screen.findByRole('group', { name: 'Scenes timeline' });
    expect(box.className).toContain('overflow-x-auto');
    expect(screen.getByRole('button', { name: /^Chase Theme, in scene 1/ }).style.height).toBe('44px');
  });

  it('the tag-to-scene controls are thumb targets', () => {
    render(<TagToScene projectId="p" userId="u" initialSceneId={null} scenes={[{ id: 's1', label: '1 · Kitchen' }]} track={{ uri: 'spotify:track:1', name: 'Song', artist: 'A' }} />);
    expect(screen.getByLabelText('Scene for Song').className).toContain('min-h-[44px]');
    expect(screen.getByRole('button', { name: /Tag/ }).className).toContain('min-h-[44px]');
  });
});
