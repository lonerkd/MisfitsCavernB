// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

const phone = { value: { phone: true, landscape: true, keyboard: 0, typing: false, height: 393, offset: 0 } };
vi.mock('@/lib/os/usePhone', () => ({ usePhoneLayout: () => phone.value }));

import { Modal } from './ui';

afterEach(cleanup);

describe('Studio Modal with the phone keyboard', () => {
  it('keeps its usual size while no keyboard is up', () => {
    phone.value = { phone: true, landscape: true, keyboard: 0, typing: false, height: 393, offset: 0 };
    render(<Modal title="Find references" onClose={() => {}}><input aria-label="q" /></Modal>);
    expect(screen.getByRole('dialog').getAttribute('style')).toBeNull();
  });
  it('fits the part of the screen the keyboard leaves, from the top', () => {
    phone.value = { phone: true, landscape: true, keyboard: 190, typing: true, height: 203, offset: 0 };
    render(<Modal title="Find references" onClose={() => {}}><input aria-label="q" /></Modal>);
    const dialog = screen.getByRole('dialog');
    expect(dialog.style.maxHeight).toBe('187px');
    const backdrop = dialog.parentElement as HTMLElement;
    expect(backdrop.style.height).toBe('203px');
    expect(backdrop.style.alignItems).toBe('flex-start');
  });
});
