// The suite's undo for actions that are not typing: a short stack of "how to take that back". An action that can be truly
// reversed pushes its own inverse here; Ctrl/⌘ Z outside a text box runs the newest one for the tool the person is in.
// Nothing is pushed for what cannot be taken back (an issued call sheet, a sent message), so Undo never claims more than it
// can do. React-free, so the shell, the island and tests all read it. See `plans/2026-11-02-island-at-every-size.md`.
//
// Safety rules, each with a test: an entry belongs to the tool and (where the tool has one) the project it was made in,
// captured *before* the action's first await (`undoOrigin`), so a slow write cannot land it in the wrong place; the cap is
// per tool; undos run one at a time, newest first; the stack is cleared when the session ends (`resetOS`); and an inverse
// must refuse, not overwrite, when the thing has been changed since (the Studio's use a conditional update).

export interface UndoOrigin {
  /** The tool it belongs to (the first path segment: "studio"), so Undo in one tool never reverses another's action. */
  scope: string;
  /** Within a tool, what it was done in (the Studio's active project), so switching project hides the old project's undo. */
  context?: string;
}

export interface UndoEntry extends UndoOrigin {
  /** What was done, in the words the toast uses: "Moved scene 4 to day 2". */
  label: string;
  /** Takes the action back. Throws (or rejects) when it cannot, and the person is told. */
  undo: () => void | Promise<void>;
}

const MAX_PER_SCOPE = 50;
let stack: UndoEntry[] = [];
const contexts = new Map<string, string>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** The tool a path belongs to: "/studio?tab=scenes" → "studio". */
export function scopeOf(pathname: string): string {
  return pathname.split(/[?#]/)[0].split('/').filter(Boolean)[0] ?? '';
}

function currentScope(): string {
  return typeof window === 'undefined' ? '' : scopeOf(window.location.pathname);
}

/** A tool says what it is working in now (the Studio: the active project's id). Entries made in another context are hidden. */
export function setUndoContext(scope: string, context: string | undefined): void {
  if (context === undefined) contexts.delete(scope); else contexts.set(scope, context);
  emit();
}

/** Where an action is being done. Call it before the action's first await, and hand it to `pushUndo` afterwards. */
export function undoOrigin(scope: string = currentScope()): UndoOrigin {
  const context = contexts.get(scope);
  return context === undefined ? { scope } : { scope, context };
}

const eligible = (e: UndoEntry, scope: string): boolean => e.scope === scope && (e.context === undefined || e.context === contexts.get(scope));

/** Record how to take back what was just done. */
export function pushUndo(label: string, undo: UndoEntry['undo'], origin: UndoOrigin = undoOrigin()): void {
  stack.push({ label, undo, ...origin });
  // The cap is per tool: fifty actions in one tool never push another tool's out.
  const mine = stack.filter((e) => e.scope === origin.scope);
  if (mine.length > MAX_PER_SCOPE) {
    const drop = new Set(mine.slice(0, mine.length - MAX_PER_SCOPE));
    stack = stack.filter((e) => !drop.has(e));
  }
  emit();
}

/** The newest thing that can be undone in this tool (and its current context), without undoing it. */
export function peekUndo(scope: string = currentScope()): UndoEntry | undefined {
  for (let i = stack.length - 1; i >= 0; i--) if (eligible(stack[i], scope)) return stack[i];
  return undefined;
}

export type UndoResult = { status: 'empty' } | { status: 'undone'; label: string } | { status: 'failed'; label: string; message: string };

let running: Promise<unknown> = Promise.resolve();

async function runOne(scope: string): Promise<UndoResult> {
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

/**
 * Take back the newest action in this tool. Undos run one at a time, so two quick presses take back two actions in order
 * rather than racing their writes. A failed undo is dropped (the state is no longer known) and reported.
 */
export function undoLast(scope: string = currentScope()): Promise<UndoResult> {
  const next = running.then(() => runOne(scope));
  running = next.catch(() => undefined);
  return next;
}

export function undoDepth(scope: string = currentScope()): number {
  return stack.filter((e) => eligible(e, scope)).length;
}

/** Forget everything: the session ended or changed hands. */
export function clearUndo(): void {
  stack = [];
  contexts.clear();
  emit();
}

export function subscribeUndo(l: () => void): () => void {
  listeners.add(l);
  return () => { listeners.delete(l); };
}
