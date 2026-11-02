import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { areaOfRegistration, areasOf, buildCoverage, registrationsIn } from './coverage';

const ROOT = process.cwd();
const FILE = join(ROOT, '.cavern-intelligence', 'island-coverage.md');
// `npm run island:coverage` sets this to write the file. It is ignored in CI, so a stale file is always caught there.
const writing = process.env.UPDATE_ISLAND_COVERAGE === '1' && !process.env.CI;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { if (name !== 'node_modules' && name !== '.next') walk(p, out); }
    else if (/\.(tsx|ts)$/.test(name) && !/\.test\.|\.d\.ts$/.test(name)) out.push(p);
  }
  return out;
}

describe('registrationsIn', () => {
  it('reads a page stage: module, title, fields, toggles and actions', () => {
    const src = `
      usePillStage(
        {
          module: 'portfolio',
          title: tab === 'mine' ? 'My Jobs' : 'Jobs Board',
          fields: [
            { label: 'Open', value: \`\${jobs.length}\` },
            { label: 'Mine', value: '1' },
          ],
          toggles: [{ id: 'focus', label: 'Focus mode', active: on, onToggle: () => {} }],
          actions: user ? [
            { id: 'post-job', label: '+ Post Position', onClick: () => setShowPost(true) },
          ] : [],
        }
      );`;
    const [r] = registrationsIn('app/(suite)/jobs/page.tsx', src);
    expect(r).toMatchObject({ kind: 'stage', module: 'portfolio', fields: ['Open', 'Mine'], toggles: ['Focus mode'], actions: [{ id: 'post-job', label: '+ Post Position' }] });
  });

  it('reads a zone, and ignores the hook definitions and imports', () => {
    const src = `import { usePillZone } from '@/lib/os/PillContext';
      export function usePillZone(descriptor: PillDescriptor | null, depth = 1) { return {}; }
      const z = usePillZone(m.userId ? { module: 'studio', title: m.name, actions: [{ id: 'x', label: 'Go' }] } : null, 2);`;
    const regs = registrationsIn('components/studio/CrewBoards.tsx', src);
    expect(regs).toHaveLength(1);
    expect(regs[0]).toMatchObject({ kind: 'zone', module: 'studio', title: '(computed)', actions: [{ id: 'x', label: 'Go' }] });
  });

  it('keeps a brace inside a string from ending the object early', () => {
    const [r] = registrationsIn('a.tsx', "usePillStage({ module: 'm', title: 'A } B', actions: [{ id: 'a', label: 'One' }] });");
    expect(r.title).toBe('A } B');
    expect(r.actions).toEqual([{ id: 'a', label: 'One' }]);
  });
});

describe('spread and conditional entries', () => {
  it('keeps the controls a descriptor offers only sometimes, marked as conditional', () => {
    const src = `usePillStage({ module: 'm', title: 'T', fields: [{ label: 'Open', value: '1' }, ...(user ? [{ label: 'Mine', value: '2' }] : [])], actions: [...(ok ? [{ id: 'a', label: 'Go' }] : [])] });`;
    const [r] = registrationsIn('a.tsx', src);
    expect(r.fields).toEqual(['Open', 'Mine (conditional)']);
    expect(r.actions).toEqual([{ id: 'a', label: 'Go (conditional)' }]);
  });
});

describe('areaOfRegistration', () => {
  it('uses the folder, or the area whose files import the registering component', () => {
    expect(areaOfRegistration('app/(suite)/jobs/page.tsx', {})).toBe('jobs');
    expect(areaOfRegistration('components/lounge/useLounge.ts', { 'app/(suite)/lounge/page.tsx': "import { useLounge } from '@/components/lounge/useLounge';" })).toBe('lounge');
    expect(areaOfRegistration('components/lounge/useLounge.ts', {})).toBeUndefined();
  });
});

describe('areasOf', () => {
  it('lists the route areas that have a page', () => {
    expect(areasOf(['app/(suite)/jobs/page.tsx', 'app/(suite)/admin/users/page.tsx', 'app/(suite)/page.tsx', 'app/(suite)/layout.tsx'])).toEqual(['admin', 'jobs']);
  });
});

describe('the island coverage reference', () => {
  const sources = (): { files: Record<string, string>; pageFiles: string[]; appSources: Record<string, string> } => {
    const all = [...walk(join(ROOT, 'app')), ...walk(join(ROOT, 'components'))].map((f) => relative(ROOT, f).split('\\').join('/'));
    const files: Record<string, string> = {};
    for (const f of all) {
      const src = readFileSync(join(ROOT, f), 'utf8');
      if (/usePill(Stage|Zone)\(/.test(src)) files[f] = src;
    }
    const appSources: Record<string, string> = {};
    for (const f of all) if (f.startsWith('app/(suite)/')) appSources[f] = readFileSync(join(ROOT, f), 'utf8');
    return { files, pageFiles: all.filter((f) => /\/page\.tsx$/.test(f)), appSources };
  };

  it.skipIf(writing)('is the committed file (run `npm run island:coverage` after a page changes what it tells the island)', () => {
    expect(existsSync(FILE), 'run `npm run island:coverage` to create it').toBe(true);
    expect(readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n')).toBe(buildCoverage(sources()));
  });

  it.skipIf(!writing)('writes the committed file', () => {
    writeFileSync(FILE, buildCoverage(sources()));
  });
});
