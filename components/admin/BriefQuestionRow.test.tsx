// @vitest-environment jsdom
// A brief question's row: move buttons, the edit panel with validated inputs, and what is sent on save.
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const toast = vi.fn();
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast }) }));

import { BriefQuestionRow } from './BriefQuestionRow';
import type { BriefQuestion } from '@/lib/brief/core';

const goal: BriefQuestion = {
  key: 'goal', phase: 'development', label: 'What is the goal?', hint: 'Pick one', kind: 'one',
  options: [{ id: 'festivals', label: 'Festivals' }, { id: 'web', label: 'Web', implies: { crafts: ['Editor'] }, detect: { words: ['fight'] } }],
  unit: null, min_value: null, max_value: null, ask_when: {}, position: 10,
};
const extra: BriefQuestion = { ...goal, key: 'laurels', label: 'Laurels?', options: [{ id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' }], position: 20 };

type Over = Partial<React.ComponentProps<typeof BriefQuestionRow>>;
function setup(over: Over = {}) {
  const onMove = vi.fn();
  const onRemove = vi.fn();
  const onRemoveOption = vi.fn().mockResolvedValue(undefined);
  const onSave = vi.fn().mockResolvedValue(null);
  render(<ul><BriefQuestionRow q={goal} all={[goal, extra]} vocab={{ crafts: ['Editor'], channels: [], formats: [] }} first={false} last={false} moving={false} onMove={onMove} onRemove={onRemove} onRemoveOption={onRemoveOption} onSave={over.onSave ?? onSave} {...over} /></ul>);
  return { onMove, onRemove, onRemoveOption, onSave: (over.onSave ?? onSave) as ReturnType<typeof vi.fn> };
}

beforeEach(() => toast.mockClear());
afterEach(cleanup);

describe('BriefQuestionRow', () => {
  it('moves up and down with real buttons, disabled at the ends', () => {
    const p = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Move What is the goal? up' }));
    fireEvent.click(screen.getByRole('button', { name: 'Move What is the goal? down' }));
    expect(p.onMove.mock.calls).toEqual([[-1], [1]]);
    cleanup();
    setup({ first: true, last: true });
    expect((screen.getByRole('button', { name: /up$/ }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: /down$/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('removes through the page', () => {
    const p = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Remove What is the goal?' }));
    expect(p.onRemove).toHaveBeenCalled();
  });

  it('saves the new words, rules and ask_when', async () => {
    const p = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Edit What is the goal?' }));
    fireEvent.change(screen.getByLabelText('Question'), { target: { value: 'What is the aim?' } });
    fireEvent.change(screen.getByLabelText('Hint (optional)'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Never for formats'), { target: { value: '' } });
    fireEvent.change(screen.getAllByLabelText('Pages per day')[0], { target: { value: '3' } });
    fireEvent.change(screen.getAllByLabelText('Roles it calls for')[0], { target: { value: 'editor' } });
    fireEvent.click(screen.getAllByLabelText('Night exteriors')[1]);
    fireEvent.click(screen.getByRole('button', { name: 'Save question' }));
    await waitFor(() => expect(p.onSave).toHaveBeenCalled());
    const patch = p.onSave.mock.calls[0][0];
    expect(patch.label).toBe('What is the aim?');
    expect(patch.hint).toBe('');
    expect(patch.ask_when).toEqual({});
    expect(patch.phase).toBe('development');
    expect(patch.options[0]).toEqual({ id: 'festivals', label: 'Festivals', implies: { crafts: ['Editor'], pages_per_day: 3 } });
    expect(patch.options[1]).toEqual({ id: 'web', label: 'Web', implies: { crafts: ['Editor'] }, detect: { words: ['fight'], night_exteriors: true } });
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Question saved', 'success'));
  });

  it('refuses a bad value with a toast and saves nothing', async () => {
    const p = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Edit What is the goal?' }));
    fireEvent.change(screen.getAllByLabelText('Pages per day')[0], { target: { value: '-4' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save question' }));
    expect(p.onSave).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(expect.stringContaining('pages per day'), 'error');
  });

  it('refuses an ask_when that points at a missing option', async () => {
    const p = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Edit What is the goal?' }));
    fireEvent.change(screen.getByLabelText(/After an earlier answer/), { target: { value: 'laurels: maybe' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save question' }));
    expect(p.onSave).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(expect.stringContaining('maybe'), 'error');
  });

  it('says so when the database refuses the save, and stays open', async () => {
    const p = setup({ onSave: vi.fn().mockResolvedValue('permission denied') });
    fireEvent.click(screen.getByRole('button', { name: 'Edit What is the goal?' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save question' }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Could not save it: permission denied', 'error'));
    expect(p.onSave).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('form', { name: 'Edit What is the goal?' })).toBeTruthy();
  });
  it('saves a renamed option under the same id, a new option under a new id, and a changed phase', async () => {
    const p = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Edit What is the goal?' }));
    fireEvent.change(screen.getAllByLabelText('Option label')[0], { target: { value: 'Festival circuit' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add option' }));
    fireEvent.change(screen.getAllByLabelText('New option')[0], { target: { value: 'Web' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add option' }));
    fireEvent.change(screen.getAllByLabelText('New option')[1], { target: { value: 'Broadcast TV' } });
    fireEvent.change(screen.getByLabelText('Phase'), { target: { value: 'delivery' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save question' }));
    expect(p.onSave).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(expect.stringContaining('Two options are called'), 'error');
    fireEvent.change(screen.getAllByLabelText('New option')[0], { target: { value: 'Streaming' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save question' }));
    await waitFor(() => expect(p.onSave).toHaveBeenCalled());
    const patch = p.onSave.mock.calls[0][0];
    expect(patch.phase).toBe('delivery');
    expect(patch.options.map((o: { id: string; label: string }) => [o.id, o.label])).toEqual([
      ['festivals', 'Festival circuit'], ['web', 'Web'], ['streaming', 'Streaming'], ['broadcast_tv', 'Broadcast TV'],
    ]);
  });

  it('refuses an empty option label and discards an unsaved new option', async () => {
    const p = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Edit What is the goal?' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add option' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save question' }));
    expect(p.onSave).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(expect.stringContaining('some words'), 'error');
    fireEvent.click(screen.getByRole('button', { name: 'Discard new option' }));
    expect(screen.queryByLabelText('New option')).toBeNull();
  });

  it('removes a saved option through the page, and keeps two', async () => {
    const p = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Edit What is the goal?' }));
    // Two options left: the remove buttons are off.
    expect((screen.getByRole('button', { name: 'Remove option Web' }) as HTMLButtonElement).disabled).toBe(true);
    cleanup();
    const three: BriefQuestion = { ...goal, options: [...goal.options, { id: 'tv', label: 'TV' }] };
    const p3 = setup({ q: three });
    fireEvent.click(screen.getByRole('button', { name: 'Edit What is the goal?' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove option TV' }));
    await waitFor(() => expect(p3.onRemoveOption).toHaveBeenCalledWith('tv', 'TV'));
    expect(p.onRemoveOption).not.toHaveBeenCalled();
  });

  it('a number question has no options to edit, and keeps its options on save', async () => {
    const n: BriefQuestion = { ...goal, key: 'days', label: 'Shoot days?', kind: 'number', options: [], min_value: 1, max_value: 90, unit: 'days' };
    const p = setup({ q: n, all: [n] });
    fireEvent.click(screen.getByRole('button', { name: 'Edit Shoot days?' }));
    expect(screen.queryByRole('button', { name: 'Add option' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Save question' }));
    await waitFor(() => expect(p.onSave).toHaveBeenCalled());
    expect(p.onSave.mock.calls[0][0].options).toEqual([]);
  });
});
