import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// The "Every step" phases were native <details> with a React-controlled `open` prop and no state: a
// press toggled the DOM, the next render reset it — the rows snapped back and felt broken. These pins
// keep the button-headed, state-driven accordion that replaced them. (StepItem's own <details> for
// "Walk me through it" is a separate, uncontrolled disclosure and stays.)
const src = readFileSync(join(process.cwd(), 'components', 'guides', 'GuidePanel.tsx'), 'utf8');

describe('the guide phase accordion', () => {
  it('phase rows are buttons driving React state, not controlled <details>', () => {
    expect(src).not.toContain('<details key={p.id}');
    expect(src).toContain('const [openPhase, setOpenPhase] = useState<number | null>(null);');
    expect(src).toContain('aria-expanded={open}');
    expect(src).toContain('onClick={() => setOpenPhase(open ? -1 : p.index)}');
  });

  it('the default open phase follows the guide’s current phase', () => {
    expect(src).toContain('const openIndex = openPhase ?? view.currentIndex;');
  });

  it('a phase whose steps all sit in This week says so instead of opening empty', () => {
    expect(src).toContain('Everything for this phase is in This week, above.');
  });
});
