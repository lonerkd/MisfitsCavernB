// The suite's undo for actions that are not typing: a short stack of "how to take that back". An action that can be truly
// reversed pushes its own inverse here; Ctrl/⌘ Z outside a text box runs the newest one for the tool the person is in.
// Nothing is pushed for what cannot be taken back (an issued call sheet, a sent message), so Undo never claims more than it
// can do. React-free, so the shell, the island and tests all read it. See `plans/2026-11-02-island-at-every-size.md`.

export interface UndoEntry {
  /** What was done, in the words the toast uses: "Moved scene 4 to day 2". */
  label: string;
  /** The tool it belongs to (the first path segment: "studio"), so Undo in one tool never reverses another's action. */
  scope: string;
  /** Takes the action back. Throws (or rejects) when it cannot, and the person is told. */
  undo: () => void | Promise<void>;
}

const MAX = 50;
let stack: UndoEntry[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** The tool a path belongs to: "/studio?tab=scenes" → "studio". */
export function scopeOf(pathname: string): string {
  return pathname.split(/[?#]/)[0].split('/').filter(Boolean)[0] ?? '';
}

function currentScope(): string {
  return typeof window === 'undefined' ? '' : scopeOf(window.location.pathname);
}

/** Record how to take back what was just done. The scope defaults to the tool the person is in. */
export function pushUndo(label: string, undo: UndoEntry['undo'], scope: string = currentScope()): void {
  stack.push({ label, undo, scope });
  if (stack.length > MAX) stack = stack.slice(stack.length - MAX);
  emit();
}

/** The newest thing that can be undone in this tool, without undoing it. */
export function peekUndo(scope: string = currentScope()): UndoEntry | undefined {
  for (let i = stack.length - 1; i >= 0; i--) if (stack[i].scope === scope) return stack[i];
  return undefined;
}

export type UndoResult = { status: 'empty' } | { status: 'undone'; label: string } | { status: 'failed'; label: string; message: string };

/** Take back the newest action in this tool. A failed undo is dropped (the state is no longer known) and reported. */
export async function undoLast(scope: string = currentScope()): Promise<UndoResult> {
  const entry = peekUndo(scope);
  if (!entry) return { status: 'empty' };
  stack = stack.filter((e) => e !== entry);
  emit();
  try {
    await entry.undo();
    return { status: 'undone', label: entry.label };
  } catch (e) {
    return { status: 'failed', label: entry.label, message: e instanceof Error ? e.message : 'Could not undo' };
  }
}

export function undoDepth(scope: string = currentScope()): number {
  return stack.filter((e) => e.scope === scope).length;
}

export function clearUndo(): void {
  stack = [];
  emit();
}

export function subscribeUndo(l: () => void): () => void {
  listeners.add(l);
  return () => { listeners.delete(l); };
}
