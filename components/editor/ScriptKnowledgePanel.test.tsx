// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ScriptKnowledgePanel, hasKnowledge } from './ScriptKnowledgePanel';
import { scriptKnowledge } from '@/lib/scriptos/knowledge';
import { parseScript } from '@/lib/scriptos/parser';

afterEach(cleanup);

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
