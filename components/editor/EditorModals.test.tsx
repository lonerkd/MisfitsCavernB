// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { GoToSceneModal } from './EditorModals';

afterEach(cleanup);

const HEADINGS = ['INT. KITCHEN - DAY', 'EXT. STREET - NIGHT', 'INT. HALL - DAY'];

function open(value: string, onJump = vi.fn(), onChange = vi.fn()) {
  render(
    <GoToSceneModal
      sceneCount={HEADINGS.length}
      headings={HEADINGS}
      value={value}
      onChange={onChange}
      onJump={onJump}
      onClose={() => {}}
    />,
  );
  return { onJump, onChange, input: screen.getByRole('textbox', { name: 'Scene number' }) };
}

describe('Go to scene', () => {
  it('previews the heading the typed number would land on', () => {
    open('2');
    expect(screen.getByText('EXT. STREET - NIGHT')).toBeTruthy();
    expect(screen.getByText('Scene 2 of 3')).toBeTruthy();
  });

  it('jumps on Enter for a scene that exists', () => {
    const { onJump, input } = open('3');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onJump).toHaveBeenCalledWith(3);
  });

  it('refuses a number the script does not have, and says so', () => {
    const { onJump, input } = open('9');
    expect(screen.getByText('No scene 9 · 1 - 3')).toBeTruthy();
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onJump).not.toHaveBeenCalled();
  });

  it('never reads "3a" or "0" as a scene', () => {
    for (const bad of ['3a', '0', '2.5', '-1']) {
      const { onJump, input } = open(bad);
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(onJump).not.toHaveBeenCalled();
      expect(screen.getByText(`No scene ${bad} · 1 - 3`)).toBeTruthy();
      cleanup();
    }
  });

  it('shows the hint while empty and closes on Escape', () => {
    const onClose = vi.fn();
    render(<GoToSceneModal sceneCount={3} headings={HEADINGS} value="" onChange={() => {}} onJump={() => {}} onClose={onClose} />);
    expect(screen.getByText('3 scenes · Press Enter to jump')).toBeTruthy();
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Scene number' }), { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
