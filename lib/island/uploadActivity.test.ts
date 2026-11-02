import { afterEach, describe, expect, it } from 'vitest';
import { activityStore } from './activities';
import { formatBytes, quantize, uploadActivity } from './uploadActivity';
import { beginUpload, uploadSnapshot } from './uploads';

afterEach(() => activityStore.clear('upload'));

describe('uploadActivity', () => {
  it('holds nothing when nothing is uploading', () => {
    expect(uploadActivity({ count: 0, name: null, loaded: 0, total: 0 })).toBeNull();
  });
  it('names a single file and says how far along it is', () => {
    const a = uploadActivity({ count: 1, name: 'reel.mp4', loaded: 5 * 1024 * 1024, total: 20 * 1024 * 1024 })!;
    expect(a.kind).toBe('upload');
    expect(a.title).toBe('Uploading reel.mp4');
    expect(a.detail).toBe('25% · 5.0 MB of 20 MB');
    expect(a.progress).toBe(0.25);
  });
  it('counts several files as one activity with the combined progress', () => {
    const a = uploadActivity({ count: 3, name: null, loaded: 50, total: 100 })!;
    expect(a.title).toBe('Uploading 3 files');
    expect(a.progress).toBe(0.5);
  });
  it('draws no bar when the size is unknown, and never more than full', () => {
    expect(uploadActivity({ count: 1, name: 'a', loaded: 0, total: 0 })!.progress).toBeUndefined();
    expect(uploadActivity({ count: 1, name: 'a', loaded: 200, total: 100 })!.progress).toBe(1);
  });
  it('moves in whole percent, and sizes read plainly', () => {
    expect(quantize(0.123456)).toBe(0.12);
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2 kB');
    expect(formatBytes(3 * 1024 * 1024 * 1024)).toBe('3.0 GB');
  });
});

describe('the upload tracker', () => {
  it('publishes to the island while an upload runs and clears it when it ends', () => {
    const t = beginUpload('a.png', 1000);
    expect(activityStore.getSnapshot().some((x) => x.id === 'upload')).toBe(true);
    t.progress(400);
    expect(activityStore.getSnapshot().find((x) => x.id === 'upload')?.progress).toBe(0.4);
    t.end();
    expect(activityStore.getSnapshot().some((x) => x.id === 'upload')).toBe(false);
    expect(uploadSnapshot().count).toBe(0);
  });
  it('combines two uploads, and holds until the last one ends', () => {
    const a = beginUpload('a', 100);
    const b = beginUpload('b', 300);
    a.progress(100);
    expect(uploadSnapshot()).toMatchObject({ count: 2, loaded: 100, total: 400 });
    a.end();
    expect(activityStore.getSnapshot().some((x) => x.id === 'upload')).toBe(true);
    b.end();
    expect(activityStore.getSnapshot().some((x) => x.id === 'upload')).toBe(false);
  });
  it('ending twice, or reporting after the end, does no harm', () => {
    const t = beginUpload('a', 10);
    t.end(); t.end(); t.progress(5);
    expect(uploadSnapshot().count).toBe(0);
  });
});
