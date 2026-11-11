// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

const spotify = {
  currentTrack: { name: 'Night Drive', artists: [{ name: 'Kavinsky' }], album: { images: [] } }, isPlaying: true, progressMs: 61_000, durationMs: 180_000,
  togglePlay: vi.fn(), nextTrack: vi.fn(), prevTrack: vi.fn(), seek: vi.fn(),
};
vi.mock('@/lib/os/SpotifyContext', () => ({ useSpotify: () => spotify }));
const cap = vi.hoisted(() => ({ supported: true, start: vi.fn(), toast: vi.fn() }));
vi.mock('@/lib/cavern/capture', async (orig) => ({ ...(await orig<typeof import('@/lib/cavern/capture')>()), captureSupported: () => cap.supported, startCapture: cap.start }));
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast: cap.toast }) }));
import { CavernVisualizer } from './CavernVisualizer';

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('CavernVisualizer', () => {
  it('shows the song and drives the player', () => {
    render(<CavernVisualizer onClose={() => {}} />);
    expect(screen.getByText('Night Drive')).toBeTruthy();
    expect(screen.getByText('Kavinsky')).toBeTruthy();
    expect(screen.getByText('1:01')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next track' }));
    fireEvent.click(screen.getByRole('button', { name: 'Previous track' }));
    expect(spotify.togglePlay).toHaveBeenCalledOnce(); expect(spotify.nextTrack).toHaveBeenCalledOnce(); expect(spotify.prevTrack).toHaveBeenCalledOnce();
    fireEvent.change(screen.getByRole('slider', { name: 'Seek' }), { target: { value: '90000' } });
    expect(spotify.seek).toHaveBeenCalledWith(90000);
  });
  it('closes with its button and with Escape, and Space plays or pauses', () => {
    const onClose = vi.fn();
    render(<CavernVisualizer onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Close the visualizer' }));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
    fireEvent.keyDown(window, { key: ' ' });
    expect(spotify.togglePlay).toHaveBeenCalledOnce();
  });
  it('re-rendering with new callbacks does not close it (the player re-renders as playback changes)', () => {
    const first = vi.fn();
    const { rerender } = render(<CavernVisualizer onClose={first} />);
    rerender(<CavernVisualizer onClose={vi.fn()} />);
    rerender(<CavernVisualizer onClose={vi.fn()} />);
    expect(first).not.toHaveBeenCalled();
    const second = vi.fn();
    rerender(<CavernVisualizer onClose={second} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(second).toHaveBeenCalledOnce(); // the latest callback is the one that runs
  });
  it('Space on a focused control is that control’s own key: no second action', () => {
    render(<CavernVisualizer onClose={() => {}} />);
    screen.getByRole('button', { name: 'Next track' }).focus();
    fireEvent.keyDown(screen.getByRole('button', { name: 'Next track' }), { key: ' ' });
    expect(spotify.togglePlay).not.toHaveBeenCalled();
  });
  it('steers with the arrow keys and WASD without closing, and says what it is doing', () => {
    const onClose = vi.fn();
    render(<CavernVisualizer onClose={onClose} />);
    for (const key of ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'd', 'a', 'w', 's']) {
      fireEvent.keyDown(window, { key });
      fireEvent.keyUp(window, { key });
    }
    expect(onClose).not.toHaveBeenCalled();
    expect(spotify.togglePlay).not.toHaveBeenCalled(); // arrows steer; only Space plays and pauses
    expect(screen.getByText(/Following the player/)).toBeTruthy();
    expect(screen.getByText(/in$/)).toBeTruthy();
  });
  it('leaves the seek slider its own arrow keys', () => {
    render(<CavernVisualizer onClose={() => {}} />);
    const slider = screen.getByRole('slider', { name: 'Seek' });
    const ev = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
    slider.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(false);
  });
  describe('the pointer', () => {
    const canvasOf = () => document.querySelector('canvas') as HTMLCanvasElement;
    const rect = { left: 0, top: 0, width: 800, height: 400, right: 800, bottom: 400, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
    it('a mouse steers by hovering: no capture, no click, and it lets go on leaving', () => {
      render(<CavernVisualizer onClose={() => {}} />);
      const c = canvasOf();
      c.getBoundingClientRect = () => rect;
      c.setPointerCapture = vi.fn();
      fireEvent.pointerMove(c, { pointerType: 'mouse', clientX: 700, clientY: 100, pointerId: 1 });
      fireEvent.pointerLeave(c, { pointerType: 'mouse', pointerId: 1 });
      expect(c.setPointerCapture).not.toHaveBeenCalled(); // an ordinary pointer, still usable to leave
    });
    it('a finger guides while held, and the pointer is captured then', () => {
      render(<CavernVisualizer onClose={() => {}} />);
      const c = canvasOf();
      c.getBoundingClientRect = () => rect;
      c.setPointerCapture = vi.fn();
      fireEvent.pointerDown(c, { pointerType: 'touch', clientX: 600, clientY: 100, pointerId: 2 });
      expect(c.setPointerCapture).toHaveBeenCalledWith(2);
      fireEvent.pointerUp(c, { pointerType: 'touch', pointerId: 2 });
    });
  });
  describe('fullscreen', () => {
    const stub = (enabled: boolean) => {
      const request = vi.fn(async () => { Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: document.querySelector('[role="dialog"]') }); document.dispatchEvent(new Event('fullscreenchange')); });
      const exit = vi.fn(async () => { Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: null }); document.dispatchEvent(new Event('fullscreenchange')); });
      Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: enabled });
      Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: null });
      Object.defineProperty(document, 'exitFullscreen', { configurable: true, value: exit });
      HTMLElement.prototype.requestFullscreen = request as unknown as HTMLElement['requestFullscreen'];
      return { request, exit };
    };
    afterEach(() => { Reflect.deleteProperty(document, 'fullscreenEnabled'); Reflect.deleteProperty(document, 'fullscreenElement'); });
    it('is a button, never automatic, and offered only where the browser has it', () => {
      stub(false);
      render(<CavernVisualizer onClose={() => {}} />);
      expect(screen.queryByRole('button', { name: 'Fullscreen' })).toBeNull();
      cleanup();
      const f = stub(true);
      render(<CavernVisualizer onClose={() => {}} />);
      expect(f.request).not.toHaveBeenCalled(); // opening it never goes fullscreen on its own
      expect(screen.getByRole('button', { name: 'Fullscreen' })).toBeTruthy();
    });
    it('turns on and off, and leaving it never closes the cave', async () => {
      const f = stub(true);
      const onClose = vi.fn();
      render(<CavernVisualizer onClose={onClose} />);
      fireEvent.click(screen.getByRole('button', { name: 'Fullscreen' }));
      const leave = await screen.findByRole('button', { name: 'Leave fullscreen' });
      expect(leave.getAttribute('aria-pressed')).toBe('true');
      fireEvent.click(leave);
      await screen.findByRole('button', { name: 'Fullscreen' });
      expect(f.exit).toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    });
    it('F toggles it', () => {
      const f = stub(true);
      render(<CavernVisualizer onClose={() => {}} />);
      fireEvent.keyDown(window, { key: 'f' });
      expect(f.request).toHaveBeenCalledOnce();
    });
  });
  it('Escape minimises to the corner when it can; Close still closes', () => {
    const onClose = vi.fn(), onMinimise = vi.fn();
    render(<CavernVisualizer onClose={onClose} onMinimise={onMinimise} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onMinimise).toHaveBeenCalledOnce();
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Minimise to the corner' }));
    expect(onMinimise).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole('button', { name: 'Close the visualizer' }));
    expect(onClose).toHaveBeenCalledOnce();
  });
  describe('in the corner', () => {
    it('is a small window with play, expand and close, and takes none of your keys', () => {
      const onClose = vi.fn(), onMinimise = vi.fn(), onExpand = vi.fn();
      render(<CavernVisualizer variant="mini" onClose={onClose} onMinimise={onMinimise} onExpand={onExpand} />);
      expect(screen.getByRole('region', { name: 'Cavern, in the corner' })).toBeTruthy();
      expect(screen.queryByRole('dialog')).toBeNull();
      for (const key of ['Escape', ' ', 'f', 'ArrowLeft', 'd']) fireEvent.keyDown(window, { key });
      expect(onClose).not.toHaveBeenCalled();
      expect(onMinimise).not.toHaveBeenCalled();
      expect(spotify.togglePlay).not.toHaveBeenCalled(); // Space belongs to whatever you are working on
      fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
      expect(spotify.togglePlay).toHaveBeenCalledOnce();
      fireEvent.click(screen.getByRole('button', { name: 'Open the cavern full screen' }));
      expect(onExpand).toHaveBeenCalledOnce();
      fireEvent.click(screen.getByRole('button', { name: 'Close the cavern' }));
      expect(onClose).toHaveBeenCalledOnce();
    });
    it('is the same canvas when it grows back to full screen (one cave, not two)', () => {
      const { rerender } = render(<CavernVisualizer variant="mini" onClose={() => {}} />);
      const before = document.querySelector('canvas');
      rerender(<CavernVisualizer variant="full" onClose={() => {}} />);
      expect(document.querySelector('canvas')).toBe(before);
    });
  });
  describe('run or dive', () => {
    afterEach(() => { try { localStorage.removeItem('mc_cavern_style'); } catch { /* none */ } });
    it('offers both, runs by default, and remembers the choice on this device', () => {
      const { unmount } = render(<CavernVisualizer onClose={() => {}} />);
      expect(screen.getByRole('button', { name: 'Run' }).getAttribute('aria-pressed')).toBe('true');
      fireEvent.click(screen.getByRole('button', { name: 'Dive' }));
      expect(screen.getByRole('button', { name: 'Dive' }).getAttribute('aria-pressed')).toBe('true');
      expect(localStorage.getItem('mc_cavern_style')).toBe('dive');
      unmount();
      render(<CavernVisualizer onClose={() => {}} />);
      expect(screen.getByRole('button', { name: 'Dive' }).getAttribute('aria-pressed')).toBe('true');
    });
    it('the arrow keys steer in the dive without closing it', () => {
      const onClose = vi.fn();
      render(<CavernVisualizer onClose={onClose} />);
      fireEvent.click(screen.getByRole('button', { name: 'Dive' }));
      for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']) { fireEvent.keyDown(window, { key }); fireEvent.keyUp(window, { key }); }
      expect(onClose).not.toHaveBeenCalled();
    });
  });
  describe('listening to the music (opt-in)', () => {
    const fake = () => ({ read: () => ({ bass: 0.5, mid: 0.3, treble: 0.2, level: 0.4 }), hearing: () => true, stop: vi.fn(), onEnded: vi.fn() });
    it('offers it only where the browser can share audio', () => {
      cap.supported = false;
      render(<CavernVisualizer onClose={() => {}} />);
      expect(screen.queryByRole('button', { name: /Listen to the music/ })).toBeNull();
      cleanup(); cap.supported = true;
      render(<CavernVisualizer onClose={() => {}} />);
      expect(screen.getByRole('button', { name: /Listen to the music/ })).toBeTruthy();
    });
    it('starts only when asked, turns into Stop listening, and lets go of the share', async () => {
      const c = fake(); cap.start.mockResolvedValueOnce(c);
      render(<CavernVisualizer onClose={() => {}} />);
      expect(cap.start).not.toHaveBeenCalled(); // never on its own
      fireEvent.click(screen.getByRole('button', { name: /Listen to the music/ }));
      const stop = await screen.findByRole('button', { name: /Stop listening/ });
      expect(stop.getAttribute('aria-pressed')).toBe('true');
      fireEvent.click(stop);
      expect(c.stop).toHaveBeenCalled();
      expect(await screen.findByRole('button', { name: /Listen to the music/ })).toBeTruthy();
    });
    it('lets go of the share when the cave closes', async () => {
      const c = fake(); cap.start.mockResolvedValueOnce(c);
      const { unmount } = render(<CavernVisualizer onClose={() => {}} />);
      fireEvent.click(screen.getByRole('button', { name: /Listen to the music/ }));
      await screen.findByRole('button', { name: /Stop listening/ });
      unmount();
      expect(c.stop).toHaveBeenCalled();
    });
    it('says why when it could not start, and a cancelled share is not an error', async () => {
      const { CaptureError } = await import('@/lib/cavern/capture');
      cap.start.mockRejectedValueOnce(new CaptureError('no-audio', 'No audio was shared.'));
      render(<CavernVisualizer onClose={() => {}} />);
      fireEvent.click(screen.getByRole('button', { name: /Listen to the music/ }));
      await vi.waitFor(() => expect(cap.toast).toHaveBeenCalledWith('No audio was shared.', 'error'));
      cap.start.mockRejectedValueOnce(new CaptureError('denied', 'Sharing was cancelled.'));
      fireEvent.click(await screen.findByRole('button', { name: /Listen to the music/ }));
      await vi.waitFor(() => expect(cap.toast).toHaveBeenCalledWith('Sharing was cancelled.', 'info'));
    });
  });
});
