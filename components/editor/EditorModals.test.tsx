// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { GoToSceneModal } from './EditorModals';

afterEach(cleanup);

const HEADINGS = ['INT. KITCHEN - DAY', 'EXT. STREET - NIGHT', 'INT. HALL - DAY'];
const PAGES = [
  { page: 1, scene: 0 },
  { page: 2, scene: 1 },
  { page: 3, scene: 3 },
];
const CAST = [['MAYA'], ['MAYA', 'LEO'], ['LEO']];

function open(value: string, over: { currentScene?: number } = {}) {
  const onJump = vi.fn();
  const onChange = vi.fn();
  render(
    <GoToSceneModal
      sceneCount={HEADINGS.length}
      headings={HEADINGS}
      pages={PAGES}
      perScene={CAST}
      currentScene={over.currentScene ?? 0}
      value={value}
      onChange={onChange}
      onJump={onJump}
      onClose={() => {}}
    />,
  );
  return { onJump, onChange, input: screen.getByRole('textbox', { name: 'Scene, page or character' }) };
}

describe('Go to — a scene number', () => {
  it('previews the heading the typed number would land on', () => {
    open('2');
    expect(screen.getByText('EXT. STREET - NIGHT')).toBeTruthy();
    expect(screen.getByText('Scene 2 of 3')).toBeTruthy();
  });

  it('jumps on Enter for a scene that exists', () => {
    const { onJump, input } = open('3');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onJump).toHaveBeenCalledWith({ kind: 'scene', scene: 3 });
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
      cleanup();
    }
  });
});

describe('Go to — a page', () => {
  it('takes p12-style input and says which scene the page opens', () => {
    const { onJump, input } = open('p2');
    expect(screen.getByText('Scene 1 · INT. KITCHEN - DAY')).toBeTruthy();
    expect(screen.getByText('Page 2 of 3')).toBeTruthy();
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onJump).toHaveBeenCalledWith({ kind: 'page', page: 2 });
  });

  it('refuses a page the script does not have', () => {
    const { input } = open('p9');
    expect(screen.getByText('No page 9 · 1 - 3')).toBeTruthy();
    fireEvent.keyDown(input, { key: 'Enter' });
  });
});

describe('Go to — a character', () => {
  it('takes a name, shows their next scene, and jumps there on Enter', () => {
    const { onJump, input } = open('maya', { currentScene: 0 });
    expect(screen.getByText('Scene 2 · MAYA')).toBeTruthy();
    expect(screen.getByText('MAYA · their scene 2 of 2 · Enter again for the next')).toBeTruthy();
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onJump).toHaveBeenCalledWith({ kind: 'character', name: 'MAYA', scene: 1, index: 2, total: 2 });
  });

  it('says when nothing matches', () => {
    open('front');
    expect(screen.getByText('No scene, page or character “front”')).toBeTruthy();
  });
});

describe('Go to — the empty box', () => {
  it('says what it takes, and closes on Escape', () => {
    const onClose = vi.fn();
    render(<GoToSceneModal sceneCount={3} headings={HEADINGS} pages={PAGES} perScene={CAST} value="" onChange={() => {}} onJump={() => {}} onClose={onClose} />);
    expect(screen.getByText('3 scenes · a number, p12, or a name')).toBeTruthy();
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Scene, page or character' }), { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});

