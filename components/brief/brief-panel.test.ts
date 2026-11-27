import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// The brief panel's head used to BE the facts string ("Drama · Grounded · 14 min · Festivals") set as a
// display headline — and its phase tabs read as milestone counts. These pins keep the demotion: a real
// heading, the facts as a meta line, and tabs that say they count brief answers.
const src = readFileSync(join(process.cwd(), 'components', 'brief', 'BriefPanel.tsx'), 'utf8');

describe('the brief panel head', () => {
  it('the heading is the panel’s name, and the facts string is a meta line under it', () => {
    expect(src).toContain('<h2 id="brief-title" className={b.title}>Project brief</h2>');
    expect(src).toContain('<p className={b.summary}>{summary ||');
    expect(src).not.toContain('<h2 id="brief-title" className={b.title}>{summary');
  });

  it('the panel is still labelled by that heading', () => {
    expect(src).toContain('aria-labelledby="brief-title"');
  });

  it('phase tabs say they count brief answers', () => {
    expect(src).toContain('aria-label={`${p.label} brief: ${done} of ${qs.length} answered`}');
    expect(src).toContain('<span className={b.tabKind}>brief</span>');
  });
});
