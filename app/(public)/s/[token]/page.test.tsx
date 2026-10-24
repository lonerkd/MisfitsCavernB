// @vitest-environment jsdom
// /s/[token]: the real page and the real Supabase client, with only the
// network edge faked — `fetch` stands in for PostgREST, so the RPC call, its
// body and its error handling all run for real. Nothing here touches a live
// Supabase project. Style is read from the rendered DOM (element.style), not
// matched against strings.
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PublicScriptPage, { generateMetadata } from './page';

type Row = {
  title: string;
  content: string;
  format: string | null;
  updated_at: string | null;
  author_username: string | null;
  author_avatar_url: string | null;
  author_role: string | null;
};

const row = (over: Partial<Row> = {}): Row => ({
  title: 'Night Shift',
  content: 'INT. DINER - NIGHT\n\nA waitress wipes the counter.\n\nMARA\n(tired)\nWe close at two.\n\nCUT TO:\n',
  format: 'screenplay',
  updated_at: '2026-10-01T00:00:00Z',
  author_username: 'sam',
  author_avatar_url: null,
  author_role: 'Writer',
  ...over,
});

interface Call { url: string; body: unknown }
let calls: Call[];

// One fake endpoint: answers get_shared_script with whatever `reply` says.
function serve(reply: () => Response) {
  calls = [];
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    calls.push({ url, body: init?.body ? JSON.parse(String(init.body)) : null });
    return reply();
  });
}
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
const serveRows = (rows: Row[]) => serve(() => json(rows));

async function render(token = 'tok-1') {
  const html = renderToStaticMarkup(await PublicScriptPage({ params: Promise.resolve({ token }) }));
  const root = document.createElement('div');
  root.innerHTML = html;
  return root;
}
// The sheet of paper: the cream box holding the script lines.
const paper = (root: HTMLElement) =>
  Array.from(root.querySelectorAll<HTMLElement>('div')).find(d => d.style.background === 'rgb(253, 252, 248)')!;
const lineEls = (root: HTMLElement) => Array.from(paper(root).children) as HTMLElement[];
const lineWith = (root: HTMLElement, text: string) =>
  lineEls(root).find(e => e.textContent?.includes(text)) as HTMLElement;

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://supabase.test');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('/s/[token] — a shared script', () => {
  it('asks get_shared_script for exactly the token in the URL', async () => {
    serveRows([row()]);
    await render('abc-123');
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toContain('/rest/v1/rpc/get_shared_script');
    expect(calls[0].body).toEqual({ p_token: 'abc-123' });
  });

  it('shows the title, the author and a way to sign up', async () => {
    serveRows([row()]);
    const root = await render();
    expect(root.textContent).toContain('Night Shift');
    expect(root.textContent).toContain('by sam · Writer');
    expect(root.querySelector('a[href="/auth"]')?.textContent).toContain('CREATE YOUR OWN');
  });

  it('leaves out the byline when there is no author, and the role when there is none', async () => {
    serveRows([row({ author_username: null })]);
    expect((await render()).textContent).not.toContain('by ');
    serveRows([row({ author_role: null })]);
    const root = await render();
    expect(root.textContent).toContain('by sam');
    expect(root.textContent).not.toContain('·');
  });

  describe('line types', () => {
    it('slug: bold, uppercase, with space above after the first line', async () => {
      serveRows([row({ content: 'INT. DINER - NIGHT\n\nShe waits.\n\nEXT. STREET - DAY\n' })]);
      const root = await render();
      const first = lineWith(root, 'INT. DINER');
      const second = lineWith(root, 'EXT. STREET');
      for (const el of [first, second]) {
        expect(el.style.fontWeight).toBe('700');
        expect(el.style.textTransform).toBe('uppercase');
        expect(el.style.marginBottom).toBe('8px');
      }
      expect(first.style.marginTop).toBe('0px');
      expect(second.style.marginTop).toBe('24px');
    });

    it('character: bold, uppercase, indented', async () => {
      serveRows([row()]);
      const el = lineWith(await render(), 'MARA');
      expect(el.style.fontWeight).toBe('700');
      expect(el.style.textTransform).toBe('uppercase');
      expect(el.style.marginLeft).toBe('22ch');
    });

    it('dialogue: plain, indented on both sides', async () => {
      serveRows([row()]);
      const el = lineWith(await render(), 'We close at two.');
      expect(el.style.fontWeight).toBe('400');
      expect(el.style.marginLeft).toBe('10ch');
      expect(el.style.marginRight).toBe('15ch');
    });

    it('parenthetical: italic, grey, indented', async () => {
      serveRows([row()]);
      const el = lineWith(await render(), '(tired)');
      expect(el.style.fontStyle).toBe('italic');
      expect(el.style.color).toBe('rgb(68, 68, 68)');
      expect(el.style.marginLeft).toBe('16ch');
    });

    it('transition: uppercase, right-aligned', async () => {
      serveRows([row()]);
      const el = lineWith(await render(), 'CUT TO:');
      expect(el.style.textAlign).toBe('right');
      expect(el.style.textTransform).toBe('uppercase');
    });

    it('action: plain, not indented, keeps its case', async () => {
      serveRows([row()]);
      const el = lineWith(await render(), 'A waitress wipes the counter.');
      expect(el.style.textTransform).toBe('none');
      expect(el.style.fontWeight).toBe('400');
      expect(el.style.marginLeft).toBe('');
    });

    it('blank lines render as spacers with no text', async () => {
      serveRows([row()]);
      const spacers = lineEls(await render()).filter(e => e.textContent === '');
      expect(spacers.length).toBeGreaterThan(0);
      expect(spacers.every(e => e.style.height === '14px')).toBe(true);
    });

    it('every line is read-only text — no inputs, no editable regions', async () => {
      serveRows([row()]);
      const root = await render();
      expect(root.querySelector('input, textarea, [contenteditable]')).toBeNull();
    });

    it('script text is escaped, never injected as markup', async () => {
      serveRows([row({ content: 'INT. LAB - DAY\n\n<script>alert(1)</script> <img src=x onerror=alert(1)>\n' })]);
      const root = await render();
      expect(root.querySelector('script, img')).toBeNull();
      expect(root.textContent).toContain('<script>alert(1)</script>');
    });
  });

  describe('empty script', () => {
    it.each([['empty string', ''], ['only whitespace', '\n\n  \n']])('%s: says the script is empty, still shows the title', async (_n, content) => {
      serveRows([row({ content })]);
      const root = await render();
      expect(root.textContent).toContain('This script is empty.');
      expect(root.textContent).toContain('Night Shift');
      expect(root.textContent).not.toContain('SCRIPT NOT FOUND');
    });
  });

  describe('not found', () => {
    const expectNotFound = (root: HTMLElement) => {
      expect(root.textContent).toContain('404');
      expect(root.textContent).toContain('SCRIPT NOT FOUND');
      expect(root.textContent).toContain('turned off public sharing');
      expect(root.querySelector('a[href="/"]')?.textContent).toBe('BACK TO HOME');
      // nothing of a script leaks into it
      expect(root.textContent).not.toContain('CREATE YOUR OWN');
    };

    it('an unknown or revoked token (the RPC returns no rows)', async () => {
      serveRows([]);
      expectNotFound(await render('revoked'));
    });

    it('the RPC returns null data', async () => {
      serve(() => json(null));
      expectNotFound(await render());
    });

    it('an RPC error (HTTP 500 from PostgREST)', async () => {
      serve(() => json({ message: 'boom', code: 'XX000' }, 500));
      expectNotFound(await render());
    });

    it('a permission error (HTTP 401)', async () => {
      serve(() => json({ message: 'permission denied', code: '42501' }, 401));
      expectNotFound(await render());
    });

    it('an empty token never reaches the database', async () => {
      serveRows([row()]);
      expectNotFound(await render(''));
      expect(calls).toHaveLength(0);
    });

    it('Supabase not configured: not found, and no request is made', async () => {
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');
      serveRows([row()]);
      expectNotFound(await render());
      expect(calls).toHaveLength(0);
    });
  });
});

describe('/s/[token] — link preview metadata', () => {
  const meta = (token = 'tok-1') => generateMetadata({ params: Promise.resolve({ token }) });

  it('uses the title and the writer, and is never indexed', async () => {
    serveRows([row()]);
    const m = await meta();
    expect(m.title).toBe('Night Shift — The Cavern');
    expect(m.description).toBe('A script by sam.');
    expect(m.robots).toEqual({ index: false, follow: false });
    expect(m.openGraph).toMatchObject({ title: 'Night Shift', type: 'article' });
    expect(m.twitter).toMatchObject({ card: 'summary', title: 'Night Shift' });
  });

  it('names a generic writer when the author has no username', async () => {
    serveRows([row({ author_username: null })]);
    expect((await meta()).description).toBe('A script by a writer on The Cavern.');
  });

  it.each([
    ['no rows', () => json([])],
    ['an RPC error', () => json({ message: 'boom' }, 500)],
  ])('%s: a bland, unindexed title that reveals nothing', async (_n, reply) => {
    serve(reply);
    expect(await meta()).toEqual({ title: 'The Cavern', robots: { index: false } });
  });
});
