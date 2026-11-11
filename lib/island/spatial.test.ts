// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { spatialMove, isTextField, capsArrowNav } from './spatial';

function button(x: number, y: number, label = 'b'): HTMLButtonElement {
  const el = document.createElement('button');
  el.textContent = label;
  el.getBoundingClientRect = () => ({ left: x, top: y, right: x + 40, bottom: y + 20, width: 40, height: 20, x, y, toJSON: () => ({}) }) as DOMRect;
  el.getClientRects = () => [el.getBoundingClientRect()] as unknown as DOMRectList;
  return el;
}

function mount(...els: HTMLElement[]) {
  document.body.innerHTML = '';
  els.forEach((el) => document.body.appendChild(el));
  return els;
}

beforeEach(() => { document.body.innerHTML = ''; });

describe('spatialMove', () => {
  it('finds the neighbour to the right', () => {
    const [a, b] = mount(button(0, 0, 'a'), button(100, 0, 'b'));
    expect(spatialMove(a, 'ArrowRight')).toBe(b);
  });

  it('finds the neighbour below', () => {
    const [a, b] = mount(button(0, 0, 'a'), button(0, 60, 'b'));
    expect(spatialMove(a, 'ArrowDown')).toBe(b);
  });

  it('does not jump backwards', () => {
    const [, b] = mount(button(0, 0, 'a'), button(100, 0, 'b'));
    expect(spatialMove(b, 'ArrowRight')).toBeNull();
  });

  it('prefers the aligned neighbour over a nearer off-axis one', () => {
    const [a, near, far] = mount(
      button(0, 0, 'a'),
      button(200, 0, 'near'),   // same row, 160px gap
      button(60, 200, 'far'),   // nearer in x, but far below
    );
    expect(spatialMove(a, 'ArrowRight')).toBe(near);
    expect(spatialMove(a, 'ArrowDown')).toBe(far);
  });

  it('returns null when nothing is in that direction', () => {
    const [a] = mount(button(0, 0, 'a'));
    expect(spatialMove(a, 'ArrowLeft')).toBeNull();
  });
});

describe('isTextField', () => {
  it('knows a text field from a button', () => {
    const input = document.createElement('input');
    const textarea = document.createElement('textarea');
    const select = document.createElement('select');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    const btn = document.createElement('button');
    expect(isTextField(input)).toBe(true);
    expect(isTextField(textarea)).toBe(true);
    expect(isTextField(select)).toBe(false);
    expect(isTextField(checkbox)).toBe(false);
    expect(isTextField(btn)).toBe(false);
  });
});

describe('capsArrowNav', () => {
  it('moves the focus to the right neighbour and returns true', () => {
    const [a, b] = mount(button(0, 0, 'a'), button(100, 0, 'b'));
    a.focus();
    expect(capsArrowNav(a, 'ArrowRight')).toBe(true);
    expect(document.activeElement).toBe(b);
  });

  it('leaves a text field alone (the caret keeps its arrows)', () => {
    const input = document.createElement('input');
    mount(input);
    input.focus();
    expect(capsArrowNav(input, 'ArrowRight')).toBe(false);
    expect(document.activeElement).toBe(input);
  });

  it('does nothing when there is nowhere to go', () => {
    const [a] = mount(button(0, 0, 'a'));
    a.focus();
    expect(capsArrowNav(a, 'ArrowUp')).toBe(false);
  });
});
