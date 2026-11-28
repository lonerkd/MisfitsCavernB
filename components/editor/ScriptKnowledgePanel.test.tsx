// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { scriptKnowledge } from '@/lib/scriptos/knowledge';
import { parseScript } from '@/lib/scriptos/parser';
import { contextFromProject } from '@/lib/scriptos/context';
import { suitePriorsFromRows, suiteUse, withSuitePriors } from '@/lib/scriptos/suite-priors';

const toast = vi.fn();
const setReadingCorrection = vi.fn();
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/lib/studio', () => ({ studio: { setReadingCorrection: (...a: unknown[]) => setReadingCorrection(...a) } }));
import { ScriptKnowledgePanel, hasKnowledge } from './ScriptKnowledgePanel';

afterEach(() => { cleanup(); vi.clearAllMocks(); });

const SCRIPT = [
  'INT. KITCHEN - DAY - 1987', '', 'ABUELA (Spanish)', 'Ven aquí.', '', 'MAYA', 'Coming.', '',
  'EXT. STREET - NIGHT - 2019', '', 'MAYA', 'Hello.', '', 'INT. KITCHEN - DAY - 2019', '', 'Maya waits.', '',
].join('\n');

describe('ScriptKnowledgePanel', () => {
  it('shows languages with who speaks them, the years in the headings and the places', () => {
    const k = scriptKnowledge(parseScript(SCRIPT, 'screenplay'));
    expect(hasKnowledge(k)).toBe(true);
    render(<ScriptKnowledgePanel knowledge={k} />);
    const langs = screen.getByRole('region', { name: 'Languages' });
    expect(langs.textContent).toMatch(/Spanish/);
    expect(langs.textContent).toMatch(/ABUELA/);
    expect(screen.getByRole('region', { name: 'Eras' }).textContent).toMatch(/1987/);
    expect(screen.getByRole('region', { name: 'Eras' }).textContent).toMatch(/2019/);
    expect(screen.getByRole('region', { name: 'Places' }).textContent).toMatch(/KITCHEN/i);
  });
  it('renders nothing for a script with nothing to show', () => {
    const k = scriptKnowledge(parseScript('', 'screenplay'));
    const { container } = render(<ScriptKnowledgePanel knowledge={k} />);
    expect(container.textContent).toBe('');
  });
});

describe('ScriptKnowledgePanel: the previous draft', () => {
  it('says how many lines were read as the previous draft read them, and how many it read differently', () => {
    const k = scriptKnowledge(parseScript('', 'screenplay'));
    render(<ScriptKnowledgePanel knowledge={k} previousDraft={{ same: 142, differs: 3 }} />);
    const s = screen.getByRole('region', { name: 'Previous draft' });
    expect(s.textContent).toMatch(/read the same way as in the previous draft142/);
    expect(s.textContent).toMatch(/read as something else3/);
  });
  it('shows nothing about it when no line came from one', () => {
    const k = scriptKnowledge(parseScript('', 'screenplay'));
    const { container } = render(<ScriptKnowledgePanel knowledge={k} previousDraft={{ same: 0, differs: 0 }} />);
    expect(container.textContent).toBe('');
  });
});

describe('ScriptKnowledgePanel: what the project told the reader', () => {
  const lines = ['INT. LAB - NIGHT', '', 'THE BRIEFCASE', 'It sits open.', '', 'MAYA', 'Hello.', ''];
  for (let i = 0; i < 3; i++) lines.push('ROBOT', `Beep ${i}.`, '');
  const context = withSuitePriors(contextFromProject([{ character_name: 'MAYA' }], [{ kind: 'not_character', name: 'NARRATOR' }]), suitePriorsFromRows({
    elements: [
      { name: 'Briefcase', category_key: 'props', category_label: 'Props' },
      { name: 'Robot', category_key: 'props', category_label: 'Props' },
      { name: 'Narrator', category_key: 'cast', category_label: 'Cast' },
    ],
  }));
  const use = suiteUse(parseScript(lines.join('\n'), 'screenplay', undefined, { context }).lines, context.suite);
  const k = scriptKnowledge(parseScript('', 'screenplay'));

  it('shows the format, the names it believed and where from, the lines it held back, the disagreements and what a person overruled', () => {
    render(<ScriptKnowledgePanel knowledge={k} suite={use} projectId="p1" format="teleplay" />);
    const s = screen.getByRole('region', { name: 'From the project' });
    expect(s.textContent).toMatch(/Written as Teleplay · read with the screenplay rules/);
    expect(s.textContent).toMatch(/MAYA · in the cast1 cue/);
    expect(s.textContent).toMatch(/BRIEFCASE · Props in the breakdown, so not read as a speaker1 line/);
    expect(s.textContent).toMatch(/ROBOT · Props in the breakdown, but the script has it speak/);
    expect(s.textContent).toMatch(/NARRATOR: the project has it tagged as cast in the breakdown, but a person said it is not a character, and that stands/);
  });

  it('settles a held-back name for the whole project, and says so', async () => {
    setReadingCorrection.mockResolvedValue({ id: 'c1', name: 'BRIEFCASE', kind: 'character' });
    const corrected = vi.fn();
    render(<ScriptKnowledgePanel knowledge={k} suite={use} projectId="p1" onCorrected={corrected} />);
    fireEvent.click(screen.getByRole('button', { name: /It’s a character/ }));
    await waitFor(() => expect(setReadingCorrection).toHaveBeenCalledWith('p1', 'BRIEFCASE', 'character'));
    await waitFor(() => expect(corrected).toHaveBeenCalledWith({ id: 'c1', name: 'BRIEFCASE', kind: 'character' }));
    expect(toast).toHaveBeenCalledWith('BRIEFCASE is read as a character', 'success');
  });

  it('says so when the verdict cannot be saved', async () => {
    setReadingCorrection.mockRejectedValue(new Error('No access'));
    render(<ScriptKnowledgePanel knowledge={k} suite={use} projectId="p1" />);
    fireEvent.click(screen.getByRole('button', { name: /Not a character/ }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith('No access', 'error'));
  });

  it('offers no verdict without a project, and shows nothing when the suite added nothing and no script is open', () => {
    render(<ScriptKnowledgePanel knowledge={k} suite={use} projectId={null} />);
    expect(screen.queryByRole('button')).toBeNull();
    cleanup();
    const empty = suiteUse(parseScript('', 'screenplay').lines, undefined);
    const { container } = render(<ScriptKnowledgePanel knowledge={k} suite={empty} />);
    expect(container.textContent).toBe('');
  });
});
