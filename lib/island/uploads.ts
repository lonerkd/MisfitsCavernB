// The uploads in flight, kept in one place so the island can hold them (BACKLOG 4.1). The code that uploads calls
// `beginUpload`, reports progress, and ends it (always, in a finally); this publishes the total to the island's
// activity store. Several at once are one activity, "Uploading 3 files", with the combined progress.
import { activityStore } from './activityStore';
import { uploadActivity, type UploadSnapshot } from './uploadActivity';

interface Running { name: string; loaded: number; total: number }
const running = new Map<number, Running>();
let nextId = 1;

export function uploadSnapshot(): UploadSnapshot {
  const all = [...running.values()];
  return {
    count: all.length,
    name: all.length === 1 ? all[0].name : null,
    loaded: all.reduce((n, u) => n + u.loaded, 0),
    total: all.reduce((n, u) => n + u.total, 0),
  };
}

function publish() {
  const activity = uploadActivity(uploadSnapshot());
  if (activity) activityStore.set(activity); else activityStore.clear('upload');
}

export interface UploadTracker {
  progress: (loaded: number, total?: number) => void;
  end: () => void;
}

export function beginUpload(name: string, total: number): UploadTracker {
  const id = nextId++;
  running.set(id, { name, loaded: 0, total });
  publish();
  return {
    progress(loaded, t) {
      const u = running.get(id);
      if (!u) return;
      u.loaded = Math.min(loaded, t ?? u.total);
      if (t !== undefined) u.total = t;
      publish();
    },
    end() {
      if (running.delete(id)) publish();
    },
  };
}
