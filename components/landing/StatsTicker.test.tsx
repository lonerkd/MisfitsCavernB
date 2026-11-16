// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { StatsTicker } from './StatsTicker';

describe('StatsTicker', () => {
  it('hides the duplicated loop copy from assistive tech', () => {
    const { container } = render(<StatsTicker items={['a', 'b']} />);
    const spans = Array.from(container.querySelectorAll('.marquee-track > span'));
    expect(spans).toHaveLength(4);
    expect(spans.map((s) => s.getAttribute('aria-hidden'))).toEqual([null, null, 'true', 'true']);
  });
});
