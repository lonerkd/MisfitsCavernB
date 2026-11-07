// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SceneMusic } from './SceneMusic';

afterEach(cleanup);
const refs = [
  { id: 'a', title: 'Night Drive', for_scene: 's1', role: 'temp', tags: ['tense'] },
  { id: 'b', title: 'Other scene', for_scene: 's2', role: 'theme', tags: [] },
];

describe('SceneMusic', () => {
  it('lists only this scene’s tracks with their role and tags, and plays one', () => {
    const play = vi.fn();
    render(<SceneMusic sceneId="s1" refs={refs} play={play} openSound={() => {}} />);
    expect(screen.getByText('Night Drive')).toBeTruthy();
    expect(screen.getByText('Temp score · tense')).toBeTruthy();
    expect(screen.queryByText('Other scene')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Play Night Drive' }));
    expect(play).toHaveBeenCalledWith(refs[0]);
  });
  it('says so when a scene has none, and opens Sound', () => {
    const openSound = vi.fn();
    render(<SceneMusic sceneId="s3" refs={refs} play={() => {}} openSound={openSound} />);
    expect(screen.getByText('No music tagged to this scene.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Find music in Sound' }));
    expect(openSound).toHaveBeenCalledOnce();
  });
});
