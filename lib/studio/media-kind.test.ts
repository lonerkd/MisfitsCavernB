import { describe, it, expect } from 'vitest';
import { classifyUrl, kindFromMime, safeFileName, titleFromFileName, uploadProblem, videoEmbed, MAX_UPLOAD_BYTES } from './media-kind';

describe('classifyUrl', () => {
  it('recognises YouTube and Vimeo as video', () => {
    for (const url of ['https://youtu.be/dQw4w9WgXcQ', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10', 'https://youtube.com/shorts/dQw4w9WgXcQ', 'https://vimeo.com/76979871']) {
      expect(classifyUrl(url)?.kind).toBe('video');
    }
  });

  it('classifies direct files by extension, everything else as a link', () => {
    expect(classifyUrl('https://cdn.example.com/a/dusk_frame-02.JPG')).toMatchObject({ kind: 'image', title: 'dusk frame 02' });
    expect(classifyUrl('https://example.com/theme.mp3')?.kind).toBe('audio');
    expect(classifyUrl('https://example.com/deck.pdf')?.kind).toBe('document');
    expect(classifyUrl('https://example.com/clip.mov')?.kind).toBe('video');
    expect(classifyUrl('https://www.pinterest.com/pin/123/')).toMatchObject({ kind: 'link' });
  });

  it('rejects anything that is not an http(s) URL', () => {
    for (const bad of ['javascript:alert(1)', 'data:image/png;base64,AAA', 'ftp://example.com/x.png', 'not a url', '']) {
      expect(classifyUrl(bad)).toBeNull();
    }
  });
});

describe('videoEmbed', () => {
  it('builds privacy-friendly player URLs', () => {
    expect(videoEmbed('https://youtu.be/dQw4w9WgXcQ')?.src).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
    expect(videoEmbed('https://vimeo.com/76979871')?.src).toBe('https://player.vimeo.com/video/76979871');
  });

  it('ignores lookalike hosts and malformed ids', () => {
    expect(videoEmbed('https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ')).toBeNull();
    expect(videoEmbed('https://youtube.com/watch?v=<script>')).toBeNull();
    expect(videoEmbed('https://example.com/video')).toBeNull();
  });
});

describe('uploads', () => {
  it('accepts only images, video, audio and PDFs', () => {
    expect(kindFromMime('image/webp')).toBe('image');
    expect(kindFromMime('video/quicktime')).toBe('video');
    expect(kindFromMime('audio/mpeg')).toBe('audio');
    expect(kindFromMime('application/pdf')).toBe('document');
    expect(kindFromMime('text/html')).toBeNull();
    expect(uploadProblem({ name: 'x.html', type: 'text/html', size: 10 })).toMatch(/only images/);
  });

  it('explains the size limit instead of failing silently', () => {
    expect(uploadProblem({ name: 'rushes.mov', type: 'video/quicktime', size: MAX_UPLOAD_BYTES + 1 })).toMatch(/limit is 50 MB/);
    expect(uploadProblem({ name: 'ok.png', type: 'image/png', size: 1000 })).toBeNull();
  });

  it('makes storage-safe names that still read like the original', () => {
    expect(safeFileName('Dusk Frame (final) #2.JPEG')).toBe('Dusk-Frame-final-2.jpeg');
    expect(safeFileName('../../etc/passwd')).toBe('passwd');
    expect(safeFileName('C:\\Users\\me\\shot.png')).toBe('shot.png');
    expect(safeFileName('Café crème.png')).toBe('Cafe-creme.png');
    expect(safeFileName('')).toBe('file');
    expect(safeFileName('x'.repeat(500) + '.png').length).toBeLessThanOrEqual(110);
    expect(safeFileName('a/b.png')).not.toContain('/');
  });

  it('derives readable titles', () => {
    expect(titleFromFileName('location_scout-03.png')).toBe('location scout 03');
    expect(titleFromFileName('.hidden')).toBe('.hidden');
  });
});
