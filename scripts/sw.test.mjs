import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

// public/sw.js is the offline-first service worker. These tests load it in a
// vm with mocked self/caches/fetch and drive its fetch handler the way the
// browser would, because the failure it guards against — a stale cached page
// served as if it were current — only exists in the worker's behaviour.
const SRC = readFileSync(resolve('public/sw.js'), 'utf8');

class FakeResponse {
  constructor(body, init = {}) {
    this.body = body;
    this.status = init.status ?? 200;
    this.headers = init.headers ?? {};
    this.type = 'basic';
    this.redirected = false;
  }
  get ok() { return this.status >= 200 && this.status < 300; }
  clone() { const r = new FakeResponse(this.body, { status: this.status, headers: this.headers }); r.type = this.type; r.redirected = this.redirected; return r; }
}

function loadWorker(fetchImpl) {
  const handlers = {};
  const stores = new Map(); // cache name -> Map(url -> response)
  const caches = {
    open: async (name) => {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name);
      return { put: async (req, res) => { store.set(typeof req === 'string' ? req : req.url, res); }, addAll: async () => {} };
    },
    keys: async () => [...stores.keys()],
    delete: async (name) => stores.delete(name),
    match: async (req) => {
      const url = typeof req === 'string' ? req : req.url;
      for (const store of stores.values()) if (store.has(url)) return store.get(url);
      return undefined;
    },
  };
  const self = {
    addEventListener: (type, fn) => { handlers[type] = fn; },
    location: { origin: 'https://cavern.test' },
    skipWaiting: async () => {},
    clients: { claim: async () => {} },
    registration: {},
  };
  const context = vm.createContext({
    self, caches, fetch: fetchImpl, Response: FakeResponse, URL,
    console, Promise, Set, Map,
  });
  vm.runInContext(SRC, context);
  const navigate = async (path) => {
    let result;
    const event = {
      request: { method: 'GET', mode: 'navigate', url: `https://cavern.test${path}` },
      respondWith: (p) => { result = p; },
    };
    handlers.fetch(event);
    return result;
  };
  return { navigate, stores, handlers };
}

const okPage = async () => new FakeResponse('<html>fresh</html>');

describe('service worker: navigation caching', () => {
  beforeEach(() => { expect(SRC).toContain("const CACHE = 'mc-shell-v4'"); });

  it('caches an ordinary page after a successful visit', async () => {
    const { navigate, stores } = loadWorker(okPage);
    const res = await navigate('/lounge');
    expect(res.status).toBe(200);
    const all = [...stores.values()].flatMap((s) => [...s.keys()]);
    expect(all).toContain('https://cavern.test/lounge');
  });

  it('never caches the auth page', async () => {
    const { navigate, stores } = loadWorker(okPage);
    const res = await navigate('/auth');
    expect(res.status).toBe(200);
    const all = [...stores.values()].flatMap((s) => [...s.keys()]);
    expect(all).not.toContain('https://cavern.test/auth');
  });

  it('serves the offline notice for the auth page when the network fails, even with a stale copy cached', async () => {
    const { navigate, stores } = loadWorker(async () => { throw new Error('offline'); });
    // A stale /auth copy left by an older worker version.
    stores.set('mc-shell-v3', new Map([['https://cavern.test/auth', new FakeResponse('<html>stale sign-in</html>')]]));
    const res = await navigate('/auth');
    expect(res.status).toBe(503);
    expect(res.body).toContain("You're offline");
  });

  it('still serves a cached ordinary page when the network fails', async () => {
    const { navigate, stores } = loadWorker(async () => { throw new Error('offline'); });
    stores.set('mc-shell-v4', new Map([['https://cavern.test/lounge', new FakeResponse('<html>cached lounge</html>')]]));
    const res = await navigate('/lounge');
    expect(res.status).toBe(200);
    expect(res.body).toContain('cached lounge');
  });
});
