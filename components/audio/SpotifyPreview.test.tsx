// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SpotifyPreview } from './SpotifyPreview';

afterEach(cleanup);

describe('SpotifyPreview', () => {
  it('opens Spotify’s embedded player for the track under the row, and closes it again', () => {
    render(<SpotifyPreview id="4uLU6hMCjMI75M1A2tKUQC" label="Never Gonna">{(button, frame) => <div>{button}{frame}</div>}</SpotifyPreview>);
    expect(screen.queryByTitle(/Spotify preview/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Preview Never Gonna' }));
    expect(screen.getByTitle('Spotify preview: Never Gonna').getAttribute('src')).toContain('open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC');
    fireEvent.click(screen.getByRole('button', { name: 'Preview Never Gonna' }));
    expect(screen.queryByTitle(/Spotify preview/)).toBeNull();
  });
});
